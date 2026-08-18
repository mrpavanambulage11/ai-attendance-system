import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class AttendanceType(str, enum.Enum):
    CHECK_IN = "check_in"
    CHECK_OUT = "check_out"


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    type: Mapped[AttendanceType] = mapped_column(Enum(AttendanceType), nullable=False)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    employee: Mapped["Employee"] = relationship(back_populates="attendance_records")
