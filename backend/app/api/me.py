from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_person
from app.db.database import get_db
from app.models.attendance import Attendance, AttendanceStatus
from app.models.person import Person
from app.schemas.dashboard import TrendPoint
from app.schemas.me import MyRecord, MySummary

router = APIRouter(prefix="/api/me", tags=["me"])


def _working_days_elapsed(start: datetime, end: datetime) -> int:
    """Counts Mon-Fri calendar days in [start, end], inclusive."""
    count = 0
    day = start.date()
    last = end.date()
    while day <= last:
        if day.weekday() < 5:
            count += 1
        day += timedelta(days=1)
    return count


def _rate(marked_dates: set, start: datetime, end: datetime) -> float:
    total = _working_days_elapsed(start, end)
    if total == 0:
        return 0.0
    marked = sum(1 for d in marked_dates if start.date() <= d <= end.date())
    return round(marked / total * 100, 1)


def _current_streak(marked_dates: set, today) -> int:
    """Consecutive working days (ending today) with attendance marked. Today is allowed to
    still be unmarked without breaking the streak, since the day may not be over yet."""
    streak = 0
    day = today
    skipped_today = False
    while True:
        if day.weekday() >= 5:
            day -= timedelta(days=1)
            continue
        if day in marked_dates:
            streak += 1
            day -= timedelta(days=1)
        elif day == today and not skipped_today:
            skipped_today = True
            day -= timedelta(days=1)
        else:
            break
    return streak


@router.get("/summary", response_model=MySummary)
def summary(db: Session = Depends(get_db), person: Person = Depends(get_current_person)):
    now = datetime.now()
    since = now - timedelta(days=60)
    records = (
        db.query(Attendance).filter(Attendance.person_id == person.id, Attendance.timestamp >= since).all()
    )
    by_date = {r.timestamp.date(): r.status for r in records}
    marked_dates = set(by_date.keys())

    today = now.date()
    today_status = by_date[today].value if today in by_date else "absent"

    month_start = datetime(now.year, now.month, 1)
    this_month_rate = _rate(marked_dates, month_start, now)

    last_30_start = now - timedelta(days=29)
    last_30_days_rate = _rate(marked_dates, last_30_start, now)

    days_present_30d = sum(
        1 for d, s in by_date.items() if d >= last_30_start.date() and s == AttendanceStatus.PRESENT
    )
    days_late_30d = sum(1 for d, s in by_date.items() if d >= last_30_start.date() and s == AttendanceStatus.LATE)
    working_days_30 = _working_days_elapsed(last_30_start, now)
    days_absent_30d = max(working_days_30 - days_present_30d - days_late_30d, 0)

    return MySummary(
        full_name=person.full_name,
        external_id=person.external_id,
        department=person.department,
        photo_path=person.photo_path,
        today_status=today_status,
        this_month_rate=this_month_rate,
        last_30_days_rate=last_30_days_rate,
        days_present_30d=days_present_30d,
        days_late_30d=days_late_30d,
        days_absent_30d=days_absent_30d,
        current_streak=_current_streak(marked_dates, today),
    )


@router.get("/trend", response_model=list[TrendPoint])
def trend(days: int = 30, db: Session = Depends(get_db), person: Person = Depends(get_current_person)):
    now = datetime.now()
    records = (
        db.query(Attendance)
        .filter(Attendance.person_id == person.id, Attendance.timestamp >= now - timedelta(days=days))
        .all()
    )
    by_date = {r.timestamp.date(): r.status for r in records}

    points = []
    for offset in range(days - 1, -1, -1):
        day = (now - timedelta(days=offset)).date()
        day_status = by_date.get(day)
        points.append(
            TrendPoint(
                date=day.strftime("%Y-%m-%d"),
                present=1 if day_status == AttendanceStatus.PRESENT else 0,
                late=1 if day_status == AttendanceStatus.LATE else 0,
                absent=1 if day_status is None else 0,
            )
        )
    return points


@router.get("/records", response_model=list[MyRecord])
def records(limit: int = 100, db: Session = Depends(get_db), person: Person = Depends(get_current_person)):
    return (
        db.query(Attendance)
        .filter(Attendance.person_id == person.id)
        .order_by(Attendance.timestamp.desc())
        .limit(limit)
        .all()
    )
