from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.person import Person
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _decode(token: str | None) -> dict:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        return decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc


def get_current_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Staff-only (admin/teacher) principal. Rejects tokens issued to a person portal account."""
    payload = _decode(token)
    if payload.get("typ", "staff") != "staff":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated as staff")

    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return user


def get_current_person(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Person:
    """Self-service principal for a tracked person's portal account (their own attendance only)."""
    payload = _decode(token)
    if payload.get("typ") != "person":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated as a person")

    person = db.get(Person, int(payload["sub"]))
    if not person or not person.portal_enabled:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Portal access not found")
    return person
