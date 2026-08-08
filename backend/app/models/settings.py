from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class SystemSettings(Base):
    """Singleton row (id=1) holding runtime-configurable attendance settings."""

    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    late_cutoff_time: Mapped[str] = mapped_column(String(5), default="09:15")
    working_days: Mapped[str] = mapped_column(String(50), default="Mon,Tue,Wed,Thu,Fri")
