from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_people: int
    present_today: int
    late_today: int
    absent_today: int
    attendance_rate_today: float


class TrendPoint(BaseModel):
    date: str
    present: int
    late: int
    absent: int


class DepartmentBreakdown(BaseModel):
    department: str
    present: int
    total: int
    rate: float


class LeaderboardEntry(BaseModel):
    person_id: int
    full_name: str
    department: str
    days_present: int
    total_days: int
    attendance_rate: float


class SettingsOut(BaseModel):
    late_cutoff_time: str
    working_days: str


class SettingsUpdate(BaseModel):
    late_cutoff_time: str | None = None
    working_days: str | None = None
