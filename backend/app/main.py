import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import app.models  # noqa: F401 - registers models on Base metadata before create_all
from app.api import attendance, auth, dashboard, me, people, recognition
from app.core.config import get_settings
from app.db.database import Base, engine, run_light_migrations

settings = get_settings()

os.makedirs(settings.STORAGE_DIR, exist_ok=True)
Base.metadata.create_all(bind=engine)
run_light_migrations()

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static/faces", StaticFiles(directory=settings.STORAGE_DIR), name="faces")

app.include_router(auth.router)
app.include_router(people.router)
app.include_router(recognition.router)
app.include_router(attendance.router)
app.include_router(dashboard.router)
app.include_router(me.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}
