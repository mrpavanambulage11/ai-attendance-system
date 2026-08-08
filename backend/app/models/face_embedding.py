from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class FaceEmbedding(Base):
    """Stores a numeric face embedding (as a JSON-encoded float list), never the raw image."""

    __tablename__ = "face_embeddings"

    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"))
    vector_json: Mapped[str] = mapped_column(String, nullable=False)
    model_name: Mapped[str] = mapped_column(String(50), default="Facenet512")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    person: Mapped["Person"] = relationship(back_populates="embeddings")
