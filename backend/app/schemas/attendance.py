from datetime import datetime

from pydantic import BaseModel

from app.models.attendance import AttendanceMethod, AttendanceStatus


class AttendanceCreate(BaseModel):
    person_id: int
    status: AttendanceStatus = AttendanceStatus.PRESENT


class AttendanceUpdate(BaseModel):
    status: AttendanceStatus | None = None
    timestamp: datetime | None = None


class PersonSummary(BaseModel):
    id: int
    full_name: str
    external_id: str
    department: str

    model_config = {"from_attributes": True}


class AttendanceOut(BaseModel):
    id: int
    person: PersonSummary
    timestamp: datetime
    status: AttendanceStatus
    method: AttendanceMethod
    confidence: float | None
    marked_by: str | None

    model_config = {"from_attributes": True}


class RecognitionResult(BaseModel):
    matched: bool
    liveness_passed: bool
    person: PersonSummary | None = None
    confidence: float | None = None
    attendance_marked: bool = False
    message: str
