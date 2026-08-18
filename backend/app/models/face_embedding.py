from datetime import datetime

from sqlalchemy import ARRAY, DateTime, Float, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class FaceEmbedding(Base):
    """Stores a numeric face embedding (a Facenet512 float vector averaged across the 3-5
    enrollment frames), never the raw enrollment images. `employee_id` is unique - re-enrolling
    an employee OVERWRITES this row rather than averaging with the old embedding, so enrollment
    always reflects only the most recent capture. See app/api/employees.py for the enroll-face
    handler where this replace-not-average decision is applied."""

    __tablename__ = "face_embeddings"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), unique=True)
    embedding: Mapped[list[float]] = mapped_column(ARRAY(Float), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    employee: Mapped["Employee"] = relationship(back_populates="embedding")
