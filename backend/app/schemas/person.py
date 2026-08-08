from datetime import datetime

from pydantic import BaseModel, EmailStr


class PersonCreate(BaseModel):
    full_name: str
    external_id: str
    department: str = "General"
    email: EmailStr | None = None


class PersonUpdate(BaseModel):
    full_name: str | None = None
    department: str | None = None
    email: EmailStr | None = None
    is_active: bool | None = None


class PersonOut(BaseModel):
    id: int
    full_name: str
    external_id: str
    department: str
    email: str | None
    photo_path: str | None
    is_active: bool
    is_enrolled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class EnrollResult(BaseModel):
    person_id: int
    images_used: int
    is_enrolled: bool
