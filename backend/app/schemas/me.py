from datetime import datetime

from pydantic import BaseModel

from app.models.attendance import AttendanceMethod, AttendanceStatus


class MySummary(BaseModel):
    full_name: str
    external_id: str
    department: str
    photo_path: str | None
    today_status: str  # "present" | "late" | "absent"
    this_month_rate: float
    last_30_days_rate: float
    days_present_30d: int
    days_late_30d: int
    days_absent_30d: int
    current_streak: int


class MyRecord(BaseModel):
    id: int
    timestamp: datetime
    status: AttendanceStatus
    method: AttendanceMethod
    confidence: float | None

    model_config = {"from_attributes": True}
