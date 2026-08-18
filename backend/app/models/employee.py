from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    employee_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    department: Mapped[str] = mapped_column(String(120), nullable=False, default="General")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # HR onboarding details - nullable because admin-created employees (POST /employees) don't
    # collect these, only the self-service kiosk signup (POST /employees/register) does.
    department_id: Mapped[str | None] = mapped_column(String(50))
    position: Mapped[str | None] = mapped_column(String(120))
    joining_date: Mapped[date | None] = mapped_column(Date)
    hr_name: Mapped[str | None] = mapped_column(String(120))
    office_location: Mapped[str | None] = mapped_column(String(120))
    contact: Mapped[str | None] = mapped_column(String(50))
    address: Mapped[str | None] = mapped_column(String(255))
    shift_type: Mapped[str | None] = mapped_column(String(50))

    embedding: Mapped["FaceEmbedding | None"] = relationship(
        back_populates="employee", cascade="all, delete-orphan", uselist=False
    )
    attendance_records: Mapped[list["AttendanceRecord"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )
