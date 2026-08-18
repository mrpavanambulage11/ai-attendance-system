"""Test fixtures.

Runs against a real PostgreSQL database (DATABASE_URL, defaulting to `attendance_test` on the
same server used for development) rather than SQLite, because FaceEmbedding stores its vector
in a native Postgres ARRAY column with no SQLite equivalent. The database itself must already
exist (`createdb attendance_test`) - this fixture only creates/drops the tables inside it.
Swaps the real (heavy, model-loading) FaceService for a deterministic fake via a FastAPI
dependency override, so the suite runs fast, offline, and without downloading DeepFace weights.
"""

import os
import uuid

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/attendance_test")
os.environ["JWT_SECRET_KEY"] = "test-secret-key"

import numpy as np
import pytest
from fastapi.testclient import TestClient

import app.models  # noqa: E402
from app.core.security import hash_password
from app.db.database import Base, SessionLocal, engine
from app.main import app as fastapi_app
from app.models.admin_user import AdminUser
from app.services.face_service import FaceService, NoFaceDetectedError, get_face_service


class FakeFaceService:
    """Derives a deterministic embedding from the raw image bytes so identical fixture images
    map to the same vector and different images map far apart - without loading DeepFace. Pass
    `error` to simulate a NoFaceDetectedError/MultipleFacesDetectedError from a specific frame."""

    def __init__(self, error: Exception | None = None):
        self.error = error

    def warm_up(self):
        pass

    def detect_and_embed(self, image_bgr):
        if self.error is not None:
            raise self.error
        if image_bgr is None:
            raise NoFaceDetectedError("Could not read the uploaded image")
        digest = abs(hash(image_bgr.tobytes())) % (2**32)
        rng = np.random.default_rng(digest)
        return rng.normal(size=128).astype("float32")

    @staticmethod
    def cosine_similarity(a, b):
        return FaceService.cosine_similarity(a, b)

    def find_best_match(self, embedding, candidates, threshold):
        return FaceService().find_best_match(embedding, candidates, threshold)


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """TestClient requests all share the same fake client IP, so the rate limiter is disabled
    here by default - otherwise unrelated tests would start tripping each other's limits just
    from running in the same process. Tests that specifically exercise rate limiting flip
    `fastapi_app.state.limiter.enabled` back on for their own duration."""
    fastapi_app.dependency_overrides[get_face_service] = lambda: FakeFaceService()
    fastapi_app.state.limiter.enabled = False
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db):
    username = f"admin_{uuid.uuid4().hex[:8]}"
    password = "Passw0rd!"
    user = AdminUser(username=username, hashed_password=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, password


@pytest.fixture
def admin_token(client, admin_user):
    user, password = admin_user
    resp = client.post("/auth/login", json={"username": user.username, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
