import logging
import uuid
from datetime import date

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.db.database import get_db
from app.models.admin_user import AdminUser
from app.models.employee import Employee
from app.models.face_embedding import FaceEmbedding
from app.schemas.attendance import EmployeeSummary
from app.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeRegisterResult, EnrollFaceResult
from app.services.face_service import (
    FaceService,
    MultipleFacesDetectedError,
    NoFaceDetectedError,
    SpoofDetectedError,
    get_face_service,
)

router = APIRouter(prefix="/employees", tags=["employees"])
logger = logging.getLogger("app.enrollment")

MAX_ENROLL_IMAGES = 5


def _to_out(employee: Employee) -> EmployeeOut:
    return EmployeeOut(
        id=employee.id,
        name=employee.name,
        employee_code=employee.employee_code,
        department=employee.department,
        created_at=employee.created_at,
        is_enrolled=employee.embedding is not None,
        department_id=employee.department_id,
        position=employee.position,
        joining_date=employee.joining_date,
        hr_name=employee.hr_name,
        office_location=employee.office_location,
        contact=employee.contact,
        address=employee.address,
        shift_type=employee.shift_type,
    )


def _decode(upload: UploadFile) -> np.ndarray | None:
    raw = upload.file.read()
    if not raw:
        return None
    array = np.frombuffer(raw, dtype=np.uint8)
    return cv2.imdecode(array, cv2.IMREAD_COLOR)


def _capture_embeddings(face_service: FaceService, images: list[UploadFile]) -> list[np.ndarray]:
    """Detect+embed each uploaded frame, or raise a 422 naming the offending frame's problem.
    Shared by admin enrollment and public self-registration - same rules either way."""
    embeddings: list[np.ndarray] = []
    for upload in images:
        image_bgr = _decode(upload)
        try:
            embeddings.append(face_service.detect_and_embed(image_bgr))
        except (NoFaceDetectedError, MultipleFacesDetectedError, SpoofDetectedError) as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return embeddings


def _generate_employee_code() -> str:
    """Self-registration has no admin around to assign an employee_code, so mint one - the
    `uuid4` space is large enough that a collision with the DB's unique constraint is not a
    scenario worth handling."""
    return f"SELF-{uuid.uuid4().hex[:8].upper()}"


@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate, db: Session = Depends(get_db), _: AdminUser = Depends(get_current_admin)
):
    if db.query(Employee).filter(Employee.employee_code == payload.employee_code).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="employee_code already exists")
    employee = Employee(**payload.model_dump())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return _to_out(employee)


@router.get("", response_model=list[EmployeeOut])
def list_employees(db: Session = Depends(get_db), _: AdminUser = Depends(get_current_admin)):
    employees = db.query(Employee).order_by(Employee.name).all()
    return [_to_out(e) for e in employees]


@router.post("/{employee_id}/enroll-face", response_model=EnrollFaceResult)
def enroll_face(
    employee_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    face_service: FaceService = Depends(get_face_service),
    _: AdminUser = Depends(get_current_admin),
):
    """Captures 3-5 frames, detects+embeds the face in each, and averages them into a single
    stored embedding. Re-enrolling an employee OVERWRITES the previous embedding rather than
    averaging with it - overwrite was chosen because it's simpler and predictable (no unbounded
    drift from repeated partial re-enrollments), and a re-enrollment is usually a deliberate
    "replace my reference photos" action.

    If ANY frame fails detection (no face / multiple faces), the whole enrollment is rejected
    with a specific error rather than silently averaging over the frames that did work, so a
    bad batch never produces a subtly-wrong stored embedding.
    """
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    images = files[:MAX_ENROLL_IMAGES]
    if not images:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No images were uploaded")

    embeddings = _capture_embeddings(face_service, images)
    averaged = np.mean(np.stack(embeddings), axis=0)

    existing = db.query(FaceEmbedding).filter(FaceEmbedding.employee_id == employee_id).first()
    if existing:
        db.delete(existing)
        db.flush()
    db.add(FaceEmbedding(employee_id=employee_id, embedding=averaged.tolist()))
    db.commit()

    logger.info("Enrolled employee_id=%s with %d frame(s)", employee_id, len(embeddings))
    return EnrollFaceResult(
        employee_id=employee_id, frames_used=len(embeddings), message=f"Enrolled with {len(embeddings)} frame(s)"
    )


@router.post("/register", response_model=EmployeeRegisterResult, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register_employee(
    request: Request,
    name: str = Form(...),
    department: str = Form(...),
    department_id: str = Form(...),
    position: str = Form(...),
    joining_date: str = Form(...),
    hr_name: str = Form(...),
    office_location: str = Form(...),
    contact: str = Form(...),
    address: str = Form(...),
    shift_type: str = Form(...),
    confirmed: bool = Form(...),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    face_service: FaceService = Depends(get_face_service),
):
    """Public kiosk self-signup, deliberately NOT admin-protected - mirrors /attendance/mark's
    public kiosk model, for the person standing at the scanner whose face didn't match anyone.
    Creates the employee profile (with the full HR onboarding details collected on the signup
    form) and enrolls their face in one step; employee_code is generated (see
    _generate_employee_code) since a walk-up visitor has no code to provide.

    Rejects the signup if the captured face already matches an enrolled employee above the
    configured threshold, so someone who is already enrolled (but, say, wasn't recognized due to
    a bad-lighting scan) can't accidentally create a second, duplicate profile for themselves.

    Rate-limited per IP (5/minute) - self-registration is inherently rare per person, so this is
    tight enough to blunt automated mass-signup spam while still covering a handful of new hires
    onboarding back-to-back on the same kiosk.
    """
    fields = {
        "name": name,
        "department": department,
        "department_id": department_id,
        "position": position,
        "hr_name": hr_name,
        "office_location": office_location,
        "contact": contact,
        "address": address,
        "shift_type": shift_type,
    }
    fields = {key: value.strip() for key, value in fields.items()}
    missing = [key for key, value in fields.items() if not value]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required field(s): {', '.join(missing)}",
        )

    if not confirmed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="You must confirm the information above is correct",
        )

    try:
        parsed_joining_date = date.fromisoformat(joining_date)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="joining_date must be a valid date"
        ) from exc

    images = files[:MAX_ENROLL_IMAGES]
    if not images:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No images were uploaded")

    embeddings = _capture_embeddings(face_service, images)
    averaged = np.mean(np.stack(embeddings), axis=0)

    settings = get_settings()
    existing = [(row.employee_id, np.array(row.embedding, dtype=np.float32)) for row in db.query(FaceEmbedding).all()]
    matched_id, _score = face_service.find_best_match(averaged, existing, settings.FACE_MATCH_THRESHOLD)
    if matched_id is not None:
        matched = db.get(Employee, matched_id)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This face is already enrolled as {matched.name}. Use Mark Attendance instead.",
        )

    employee = Employee(
        name=fields["name"],
        employee_code=_generate_employee_code(),
        department=fields["department"],
        department_id=fields["department_id"],
        position=fields["position"],
        joining_date=parsed_joining_date,
        hr_name=fields["hr_name"],
        office_location=fields["office_location"],
        contact=fields["contact"],
        address=fields["address"],
        shift_type=fields["shift_type"],
    )
    db.add(employee)
    db.flush()
    db.add(FaceEmbedding(employee_id=employee.id, embedding=averaged.tolist()))
    db.commit()
    db.refresh(employee)

    logger.info("Self-registered employee_id=%s with %d frame(s)", employee.id, len(embeddings))
    return EmployeeRegisterResult(
        employee=EmployeeSummary.model_validate(employee),
        frames_used=len(embeddings),
        message=f"Welcome, {employee.name}! Your profile is ready - scan again to check in.",
    )
