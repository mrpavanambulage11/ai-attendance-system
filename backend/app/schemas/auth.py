from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.TEACHER


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str  # "admin" | "teacher" | "person" - plain str since a person login has no UserRole membership

    model_config = {"from_attributes": True}
