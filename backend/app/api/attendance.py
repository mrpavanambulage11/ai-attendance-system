import csv
import io
import logging
from datetime import datetime

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_admin
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.admin_user import AdminUser
from app.models.attendance import AttendanceRecord
from app.models.employee import Employee
from app.models.face_embedding import FaceEmbedding
from app.schemas.attendance import AttendanceOut, EmployeeSummary, MarkAttendanceResult
from app.services.attendance_service import mark_attendance, next_attendance_type
from app.services.face_service import (
    FaceService,
    MultipleFacesDetectedError,
    NoFaceDetectedError,
    SpoofDetectedError,
    get_face_service,
)
from app.services.ws_manager import manager

router = APIRouter(prefix="/attendance", tags=["attendance"])
settings = get_settings()
logger = logging.getLogger("app.recognition")


def _decode(upload: UploadFile) -> np.ndarray | None:
    raw = upload.file.read()
    if not raw:
        return None
    array = np.frombuffer(raw, dtype=np.uint8)
    return cv2.imdecode(array, cv2.IMREAD_COLOR)


def _apply_filters(query, employee_id, date_from, date_to):
    if employee_id:
        query = query.filter(AttendanceRecord.employee_id == employee_id)
    if date_from:
        query = query.filter(AttendanceRecord.timestamp >= date_from)
    if date_to:
        query = query.filter(AttendanceRecord.timestamp <= date_to)
    return query


@router.post("/mark", response_model=MarkAttendanceResult)
@limiter.limit("20/minute")
async def mark(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    face_service: FaceService = Depends(get_face_service),
):
    """Kiosk/self-serve endpoint - deliberately NOT JWT-protected (unlike the other attendance
    and employee endpoints), since it's meant to run unattended in front of whoever is checking
    in or out. On a successful match, broadcasts a live event over /attendance/ws so admin
    dashboards update without polling.

    Rate-limited per IP (20/minute) since this endpoint has no auth to fall back on - generous
    enough for a genuinely busy kiosk line, but enough to blunt a scripted hammering attempt."""
    image_bgr = _decode(file)
    try:
        embedding = face_service.detect_and_embed(image_bgr)
    except (NoFaceDetectedError, MultipleFacesDetectedError, SpoofDetectedError) as exc:
        logger.info("attendance/mark rejected: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    rows = db.query(FaceEmbedding).all()
    candidates = [(row.employee_id, np.array(row.embedding, dtype=np.float32)) for row in rows]
    employee_id, score = face_service.find_best_match(embedding, candidates, settings.FACE_MATCH_THRESHOLD)

    if employee_id is None:
        logger.info("attendance/mark: no match (best_score=%.4f)", score)
        return MarkAttendanceResult(matched=False, confidence_score=round(score, 4), message="Face not recognized")

    employee = db.get(Employee, employee_id)
    attendance_type = next_attendance_type(db, employee_id, datetime.now())
    record = mark_attendance(db, employee_id, attendance_type, confidence_score=score)
    logger.info(
        "attendance/mark: matched employee_id=%s type=%s confidence=%.4f", employee_id, attendance_type.value, score
    )

    employee_summary = EmployeeSummary.model_validate(employee)
    await manager.broadcast(
        {
            "id": record.id,
            "employee": employee_summary.model_dump(),
            "type": attendance_type.value,
            "confidence_score": round(score, 4),
            "timestamp": record.timestamp.isoformat(),
        }
    )

    return MarkAttendanceResult(
        matched=True,
        employee=employee_summary,
        type=attendance_type,
        confidence_score=round(score, 4),
        message=f"{employee.name} - {attendance_type.value.replace('_', ' ')}",
    )


@router.websocket("/ws")
async def attendance_ws(websocket: WebSocket, token: str | None = None, db: Session = Depends(get_db)):
    """Live feed of successful check-ins/check-outs, for admin dashboards. Browsers can't send
    custom headers on a WebSocket handshake, so the JWT is passed as a query param instead of
    the usual Authorization header."""
    admin = None
    if token:
        try:
            payload = decode_access_token(token)
            admin = db.get(AdminUser, int(payload["sub"]))
        except (ValueError, KeyError):
            admin = None
    if not admin:
        await websocket.close(code=4401)
        return

    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.get("", response_model=list[AttendanceOut])
def list_attendance(
    employee_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    query = db.query(AttendanceRecord).options(joinedload(AttendanceRecord.employee))
    query = _apply_filters(query, employee_id, date_from, date_to)
    return query.order_by(AttendanceRecord.timestamp.desc()).limit(1000).all()


@router.get("/export")
def export_attendance(
    employee_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(get_current_admin),
):
    query = db.query(AttendanceRecord).options(joinedload(AttendanceRecord.employee))
    query = _apply_filters(query, employee_id, date_from, date_to)
    records = query.order_by(AttendanceRecord.timestamp.desc()).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Name", "Employee code", "Department", "Date", "Time", "Type", "Confidence"])
    for r in records:
        writer.writerow(
            [
                r.employee.name,
                r.employee.employee_code,
                r.employee.department,
                r.timestamp.strftime("%Y-%m-%d"),
                r.timestamp.strftime("%H:%M:%S"),
                r.type.value,
                r.confidence_score if r.confidence_score is not None else "",
            ]
        )
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance_export.csv"},
    )
