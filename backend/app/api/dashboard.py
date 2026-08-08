from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.database import get_db
from app.models.attendance import Attendance, AttendanceStatus
from app.models.person import Person
from app.models.user import User
from app.schemas.dashboard import (
    DashboardSummary,
    DepartmentBreakdown,
    LeaderboardEntry,
    SettingsOut,
    SettingsUpdate,
    TrendPoint,
)
from app.services.attendance_service import get_or_create_settings

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _day_bounds(day: datetime) -> tuple[datetime, datetime]:
    start = datetime(day.year, day.month, day.day)
    return start, start + timedelta(days=1)


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total_people = db.query(Person).filter(Person.is_active.is_(True)).count()
    start, end = _day_bounds(datetime.now())
    today_records = db.query(Attendance).filter(Attendance.timestamp >= start, Attendance.timestamp < end).all()

    present_today = sum(1 for r in today_records if r.status == AttendanceStatus.PRESENT)
    late_today = sum(1 for r in today_records if r.status == AttendanceStatus.LATE)
    marked = len({r.person_id for r in today_records})
    absent_today = max(total_people - marked, 0)
    rate = round((marked / total_people) * 100, 1) if total_people else 0.0

    return DashboardSummary(
        total_people=total_people,
        present_today=present_today,
        late_today=late_today,
        absent_today=absent_today,
        attendance_rate_today=rate,
    )


@router.get("/trends", response_model=list[TrendPoint])
def trends(days: int = 14, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    total_people = db.query(Person).filter(Person.is_active.is_(True)).count()
    today = datetime.now()
    points: list[TrendPoint] = []

    for offset in range(days - 1, -1, -1):
        day = today - timedelta(days=offset)
        start, end = _day_bounds(day)
        records = db.query(Attendance).filter(Attendance.timestamp >= start, Attendance.timestamp < end).all()
        present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
        late = sum(1 for r in records if r.status == AttendanceStatus.LATE)
        marked = len({r.person_id for r in records})
        absent = max(total_people - marked, 0)
        points.append(TrendPoint(date=start.strftime("%Y-%m-%d"), present=present, late=late, absent=absent))

    return points


@router.get("/departments", response_model=list[DepartmentBreakdown])
def departments(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    start, end = _day_bounds(datetime.now())
    people = db.query(Person).filter(Person.is_active.is_(True)).all()

    by_dept: dict[str, list[Person]] = {}
    for p in people:
        by_dept.setdefault(p.department, []).append(p)

    today_person_ids = {
        r.person_id
        for r in db.query(Attendance).filter(Attendance.timestamp >= start, Attendance.timestamp < end).all()
    }

    result = []
    for dept, members in sorted(by_dept.items()):
        total = len(members)
        present = sum(1 for m in members if m.id in today_person_ids)
        rate = round((present / total) * 100, 1) if total else 0.0
        result.append(DepartmentBreakdown(department=dept, present=present, total=total, rate=rate))
    return result


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
def leaderboard(days: int = 30, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    since = datetime.now() - timedelta(days=days)
    people = db.query(Person).filter(Person.is_active.is_(True)).all()
    records = db.query(Attendance).filter(Attendance.timestamp >= since).all()

    total_days = len({r.timestamp.strftime("%Y-%m-%d") for r in records}) or 1
    presence: dict[int, int] = {}
    for r in records:
        presence[r.person_id] = presence.get(r.person_id, 0) + 1

    entries = []
    for p in people:
        days_present = presence.get(p.id, 0)
        rate = round((days_present / total_days) * 100, 1)
        entries.append(
            LeaderboardEntry(
                person_id=p.id,
                full_name=p.full_name,
                department=p.department,
                days_present=days_present,
                total_days=total_days,
                attendance_rate=rate,
            )
        )
    entries.sort(key=lambda e: e.attendance_rate, reverse=True)
    return entries


@router.get("/settings", response_model=SettingsOut)
def read_settings(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    row = get_or_create_settings(db)
    return SettingsOut(late_cutoff_time=row.late_cutoff_time, working_days=row.working_days)


@router.put("/settings", response_model=SettingsOut)
def write_settings(payload: SettingsUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    row = get_or_create_settings(db)
    if payload.late_cutoff_time is not None:
        row.late_cutoff_time = payload.late_cutoff_time
    if payload.working_days is not None:
        row.working_days = payload.working_days
    db.commit()
    db.refresh(row)
    return SettingsOut(late_cutoff_time=row.late_cutoff_time, working_days=row.working_days)
