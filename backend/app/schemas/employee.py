from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.attendance import EmployeeSummary


class EmployeeCreate(BaseModel):
    name: str
    employee_code: str
    department: str = "General"


class EmployeeOut(BaseModel):
    id: int
    name: str
    employee_code: str
    department: str
    created_at: datetime
    is_enrolled: bool
    department_id: str | None = None
    position: str | None = None
    joining_date: date | None = None
    hr_name: str | None = None
    office_location: str | None = None
    contact: str | None = None
    address: str | None = None
    shift_type: str | None = None

    model_config = {"from_attributes": True}


class EnrollFaceResult(BaseModel):
    employee_id: int
    frames_used: int
    message: str


class EmployeeRegisterResult(BaseModel):
    employee: EmployeeSummary
    frames_used: int
    message: str
