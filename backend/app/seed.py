"""Populates the database with a bootstrap admin user and ~30 days of realistic demo attendance
history, so the dashboard/charts/records screens look populated immediately. Run with:
    python -m app.seed
Demo people have no face embeddings (there are no real photos to seed with) - enroll your own
face via the UI to try the live recognition flow end-to-end.
"""

import random
from datetime import datetime, timedelta

import app.models  # noqa: F401 - registers models on Base metadata before create_all
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.database import Base, SessionLocal, engine
from app.models.attendance import Attendance, AttendanceMethod, AttendanceStatus
from app.models.person import Person
from app.models.settings import SystemSettings
from app.models.user import User, UserRole

settings = get_settings()

DEMO_PEOPLE = [
    ("Aarav Sharma", "EMP001", "Engineering"),
    ("Priya Nair", "EMP002", "Engineering"),
    ("Rohan Mehta", "EMP003", "Engineering"),
    ("Ishita Verma", "EMP004", "Design"),
    ("Kabir Singh", "EMP005", "Design"),
    ("Ananya Iyer", "EMP006", "Sales"),
    ("Vivaan Gupta", "EMP007", "Sales"),
    ("Diya Kapoor", "EMP008", "Marketing"),
    ("Arjun Rao", "EMP009", "Marketing"),
    ("Sneha Joshi", "EMP010", "HR"),
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == settings.ADMIN_EMAIL).first():
            db.add(
                User(
                    email=settings.ADMIN_EMAIL,
                    full_name=settings.ADMIN_NAME,
                    hashed_password=hash_password(settings.ADMIN_PASSWORD),
                    role=UserRole.ADMIN,
                )
            )
            print(f"Created admin user: {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")

        if not db.get(SystemSettings, 1):
            db.add(SystemSettings(id=1, late_cutoff_time=settings.LATE_CUTOFF_TIME))
        db.commit()

        existing_ids = {p.external_id for p in db.query(Person).all()}
        people = []
        for name, ext_id, dept in DEMO_PEOPLE:
            if ext_id in existing_ids:
                people.append(db.query(Person).filter(Person.external_id == ext_id).first())
                continue
            person = Person(full_name=name, external_id=ext_id, department=dept)
            db.add(person)
            people.append(person)
        db.commit()
        for p in people:
            db.refresh(p)

        if db.query(Attendance).count() == 0:
            random.seed(42)
            today = datetime.now()
            created = 0
            for offset in range(30, 0, -1):
                day = today - timedelta(days=offset)
                if day.weekday() >= 5:
                    continue
                for person in people:
                    roll = random.random()
                    if roll < 0.08:
                        continue
                    status = AttendanceStatus.LATE if roll > 0.85 else AttendanceStatus.PRESENT
                    hour = 9 + (1 if status == AttendanceStatus.LATE else 0)
                    minute = random.randint(0, 45)
                    timestamp = day.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    db.add(
                        Attendance(
                            person_id=person.id,
                            timestamp=timestamp,
                            status=status,
                            method=AttendanceMethod.MANUAL,
                            marked_by="seed-script",
                        )
                    )
                    created += 1
            db.commit()
            print(f"Seeded {len(people)} demo people with {created} attendance records (~30 days)")

        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
