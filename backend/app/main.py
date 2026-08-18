from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

import app.models  # noqa: F401 - registers models on Base metadata
from app.api import attendance, auth, employees
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.services.face_service import get_face_service

settings = get_settings()


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    # Overrides slowapi's default {"error": ...} body with {"detail": ...} to match the rest of
    # this API (and what the frontend's apiErrorMessage() already knows how to read).
    return JSONResponse(
        status_code=429,
        content={"detail": f"Too many requests - please wait a moment and try again ({exc.detail})."},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Looked up through dependency_overrides (rather than called directly) so the test suite's
    # fake face service is warmed up instead of the real DeepFace models.
    face_service_factory = app.dependency_overrides.get(get_face_service, get_face_service)
    face_service_factory().warm_up()
    yield


app = FastAPI(title=settings.APP_NAME, version="1.0.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(attendance.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}
