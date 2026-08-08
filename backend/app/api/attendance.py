import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_admin
from app.db.database import get_db
from app.models.attendance import Attendance, AttendanceMethod
from app.models.person import Person
from app.models.user import User
from app.schemas.attendance import AttendanceCreate, AttendanceOut, AttendanceUpdate
from app.services.attendance_service import already_marked_today, mark_attendance

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


def _apply_filters(query, person_id, department, date_from, date_to):
    if person_id:
        query = query.filter(Attendance.person_id == person_id)
    if department:
        query = query.join(Person).filter(Person.department == department)
    if date_from:
        query = query.filter(Attendance.timestamp >= date_from)
    if date_to:
        query = query.filter(Attendance.timestamp <= date_to)
    return query


@router.get("", response_model=list[AttendanceOut])
def list_attendance(
    person_id: int | None = None,
    department: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Attendance).options(joinedload(Attendance.person))
    query = _apply_filters(query, person_id, department, date_from, date_to)
    return query.order_by(Attendance.timestamp.desc()).limit(1000).all()


@router.post("", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def create_attendance(payload: AttendanceCreate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    person = db.get(Person, payload.person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    if already_marked_today(db, person.id, datetime.now()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attendance already marked today")
    return mark_attendance(
        db, person.id, AttendanceMethod.MANUAL, status=payload.status, marked_by=user.full_name
    )


@router.patch("/{attendance_id}", response_model=AttendanceOut)
def update_attendance(
    attendance_id: int, payload: AttendanceUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)
):
    record = db.get(Attendance, attendance_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance(attendance_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    record = db.get(Attendance, attendance_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    db.delete(record)
    db.commit()
    return None


@router.get("/export")
def export_attendance(
    person_id: int | None = None,
    department: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Attendance).options(joinedload(Attendance.person))
    query = _apply_filters(query, person_id, department, date_from, date_to)
    records = query.order_by(Attendance.timestamp.desc()).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Name", "External ID", "Department", "Date", "Time", "Status", "Method", "Confidence"])
    for r in records:
        writer.writerow(
            [
                r.person.full_name,
                r.person.external_id,
                r.person.department,
                r.timestamp.strftime("%Y-%m-%d"),
                r.timestamp.strftime("%H:%M:%S"),
                r.status.value,
                r.method.value,
                r.confidence if r.confidence is not None else "",
            ]
        )
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance_export.csv"},
    )
