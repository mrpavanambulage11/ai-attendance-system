from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_light_migrations() -> None:
    """Adds newly-introduced nullable columns to an existing SQLite/Postgres file in place,
    so upgrading the app doesn't require wiping the local database. This is a stopgap for a
    project with no Alembic setup - only append-only, nullable column additions are handled.
    """
    inspector = inspect(engine)
    if "people" not in inspector.get_table_names():
        return
    existing = {col["name"] for col in inspector.get_columns("people")}
    statements = []
    if "hashed_password" not in existing:
        statements.append("ALTER TABLE people ADD COLUMN hashed_password VARCHAR(255)")
    if "portal_enabled" not in existing:
        statements.append("ALTER TABLE people ADD COLUMN portal_enabled BOOLEAN DEFAULT FALSE")
    if not statements:
        return
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))
