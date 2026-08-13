from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import oauth2_scheme, require_admin
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.database import get_db
from app.models.person import Person
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserCreate, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Single login endpoint for both staff (admin/teacher) accounts and a tracked person's
    self-service portal account - the frontend doesn't need to know which kind of account
    it's signing in until it reads the role back from /me."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user and verify_password(payload.password, user.hashed_password):
        token = create_access_token(subject=str(user.id), role=user.role.value, token_type="staff")
        return TokenResponse(access_token=token)

    person = (
        db.query(Person)
        .filter(Person.email == payload.email, Person.portal_enabled.is_(True))
        .first()
    )
    if person and person.hashed_password and verify_password(payload.password, person.hashed_password):
        token = create_access_token(subject=str(person.id), role="person", token_type="person")
        return TokenResponse(access_token=token)

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")


@router.get("/me", response_model=UserOut)
def me(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    if payload.get("typ") == "person":
        person = db.get(Person, int(payload["sub"]))
        if not person or not person.portal_enabled:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Portal access not found")
        return UserOut(id=person.id, email=person.email or "", full_name=person.full_name, role="person")

    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return UserOut(id=user.id, email=user.email, full_name=user.full_name, role=user.role.value)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
