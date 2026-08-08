import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    LATE = "late"


class AttendanceMethod(str, enum.Enum):
    FACE = "face"
    MANUAL = "manual"


class Attendance(Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[AttendanceStatus] = mapped_column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT)
    method: Mapped[AttendanceMethod] = mapped_column(Enum(AttendanceMethod), default=AttendanceMethod.FACE)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    marked_by: Mapped[str | None] = mapped_column(String(255), nullable=True)

    person: Mapped["Person"] = relationship(back_populates="attendance_records")
