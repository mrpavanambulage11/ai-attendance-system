from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "AI Attendance System"
    DATABASE_URL: str = "sqlite:///./attendance.db"

    JWT_SECRET_KEY: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    FACE_MATCH_THRESHOLD: float = 0.62
    LATE_CUTOFF_TIME: str = "09:15"

    ADMIN_EMAIL: str = "admin@attendance.io"
    ADMIN_PASSWORD: str = "Admin@12345"
    ADMIN_NAME: str = "System Admin"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    STORAGE_DIR: str = "storage/faces"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
