from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "AI Based Face authorization Attendance system"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/attendance"

    @field_validator("DATABASE_URL")
    @classmethod
    def _normalize_postgres_scheme(cls, value: str) -> str:
        # Render (like Heroku) hands out connection strings starting with postgres://, which
        # SQLAlchemy 1.4+/2.0 no longer recognizes as a dialect - only postgresql:// works.
        if value.startswith("postgres://"):
            return "postgresql://" + value[len("postgres://") :]
        return value

    JWT_SECRET_KEY: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Cosine similarity cutoff for Facenet512 embeddings - a configurable constant rather than
    # a magic number buried in matching code. Tune based on the confidence scores logged by the
    # /attendance/mark pipeline.
    FACE_MATCH_THRESHOLD: float = 0.6

    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "Admin@12345"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
