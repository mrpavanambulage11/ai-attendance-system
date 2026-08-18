"""Bootstraps the admin account from ADMIN_USERNAME / ADMIN_PASSWORD.

Run once after the schema exists (`alembic upgrade head`):
    python -m app.seed
"""

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.database import SessionLocal
from app.models.admin_user import AdminUser

settings = get_settings()


def run() -> None:
    db = SessionLocal()
    try:
        existing = db.query(AdminUser).filter(AdminUser.username == settings.ADMIN_USERNAME).first()
        if existing:
            print(f"Admin user '{settings.ADMIN_USERNAME}' already exists - skipping.")
            return
        admin = AdminUser(username=settings.ADMIN_USERNAME, hashed_password=hash_password(settings.ADMIN_PASSWORD))
        db.add(admin)
        db.commit()
        print(f"Created admin user '{settings.ADMIN_USERNAME}'.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
