from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord, AttendanceType


def _day_bounds(day: datetime) -> tuple[datetime, datetime]:
    start = datetime(day.year, day.month, day.day)
    return start, start + timedelta(days=1)


def next_attendance_type(db: Session, employee_id: int, now: datetime) -> AttendanceType:
    """Check-in vs check-out is inferred from whether there's already an open check-in today:
    no record yet today (or the latest record today is a check-out) means the next scan is a
    check-in; a most-recent record that's a check-in means the next scan is a check-out."""
    start, end = _day_bounds(now)
    last_today = (
        db.query(AttendanceRecord)
        .filter(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.timestamp >= start,
            AttendanceRecord.timestamp < end,
        )
        .order_by(AttendanceRecord.timestamp.desc())
        .first()
    )
    if last_today is None or last_today.type == AttendanceType.CHECK_OUT:
        return AttendanceType.CHECK_IN
    return AttendanceType.CHECK_OUT


def mark_attendance(
    db: Session, employee_id: int, attendance_type: AttendanceType, confidence_score: float | None
) -> AttendanceRecord:
    record = AttendanceRecord(
        employee_id=employee_id,
        timestamp=datetime.now(),
        type=attendance_type,
        confidence_score=confidence_score,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
