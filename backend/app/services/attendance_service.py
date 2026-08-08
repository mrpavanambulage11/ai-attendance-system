from datetime import datetime, time, timedelta

from sqlalchemy.orm import Session

from app.models.attendance import Attendance, AttendanceMethod, AttendanceStatus
from app.models.settings import SystemSettings


def get_or_create_settings(db: Session) -> SystemSettings:
    row = db.get(SystemSettings, 1)
    if not row:
        row = SystemSettings(id=1)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def compute_status(now: datetime, late_cutoff: str) -> AttendanceStatus:
    hour, minute = (int(part) for part in late_cutoff.split(":"))
    cutoff = time(hour=hour, minute=minute)
    return AttendanceStatus.LATE if now.time() > cutoff else AttendanceStatus.PRESENT


def _day_bounds(day: datetime) -> tuple[datetime, datetime]:
    start = datetime(day.year, day.month, day.day)
    return start, start + timedelta(days=1)


def already_marked_today(db: Session, person_id: int, today: datetime) -> bool:
    start, end = _day_bounds(today)
    return (
        db.query(Attendance)
        .filter(Attendance.person_id == person_id, Attendance.timestamp >= start, Attendance.timestamp < end)
        .first()
        is not None
    )


def mark_attendance(
    db: Session,
    person_id: int,
    method: AttendanceMethod,
    confidence: float | None = None,
    marked_by: str | None = None,
    status: AttendanceStatus | None = None,
) -> Attendance:
    settings_row = get_or_create_settings(db)
    now = datetime.now()
    if status is None:
        status = compute_status(now, settings_row.late_cutoff_time)
    record = Attendance(
        person_id=person_id,
        timestamp=now,
        status=status,
        method=method,
        confidence=confidence,
        marked_by=marked_by,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
