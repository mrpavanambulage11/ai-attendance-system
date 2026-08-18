from datetime import datetime

from pydantic import BaseModel

from app.models.attendance import AttendanceType


class EmployeeSummary(BaseModel):
    id: int
    name: str
    employee_code: str
    department: str

    model_config = {"from_attributes": True}


class AttendanceOut(BaseModel):
    id: int
    employee: EmployeeSummary
    timestamp: datetime
    type: AttendanceType
    confidence_score: float | None

    model_config = {"from_attributes": True}


class MarkAttendanceResult(BaseModel):
    matched: bool
    employee: EmployeeSummary | None = None
    type: AttendanceType | None = None
    confidence_score: float | None = None
    message: str
