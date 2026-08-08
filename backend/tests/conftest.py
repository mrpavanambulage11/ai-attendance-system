"""Test fixtures.

Sets DATABASE_URL / STORAGE_DIR to isolated temp locations *before* importing anything from
`app`, and swaps the real (heavy, model-loading) FaceService/LivenessService for deterministic
fakes via FastAPI dependency overrides - so the suite runs fast, offline, and without ever
downloading DeepFace/MediaPipe model weights.
"""

import os
import shutil
import tempfile
import uuid

_TEST_DB_FD, TEST_DB_PATH = tempfile.mkstemp(suffix=".db")
os.close(_TEST_DB_FD)
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"
os.environ["STORAGE_DIR"] = tempfile.mkdtemp(prefix="attendance-test-faces-")

import numpy as np
import pytest
from fastapi.testclient import TestClient

import app.models  # noqa: E402
from app.core.security import hash_password
from app.db.database import Base, SessionLocal, engine
from app.main import app as fastapi_app
from app.models.user import User, UserRole
from app.services.face_service import FaceService, get_face_service
from app.services.liveness_service import get_liveness_service


class FakeFaceService:
    """Derives a deterministic embedding from the raw image bytes so identical fixture
    images (same "person") map to the same vector and different images map far apart -
    without ever loading DeepFace."""

    def get_embedding(self, image_bgr):
        digest = abs(hash(image_bgr.tobytes())) % (2**32)
        rng = np.random.default_rng(digest)
        return rng.normal(size=128).astype("float32")

    @staticmethod
    def cosine_similarity(a, b):
        return FaceService.cosine_similarity(a, b)

    def find_best_match(self, embedding, candidates, threshold):
        return FaceService().find_best_match(embedding, candidates, threshold)


class FakeLivenessService:
    def __init__(self, passes: bool = True):
        self.passes = passes

    def check_blink(self, frames_rgb):
        return self.passes


@pytest.fixture(scope="session", autouse=True)
def _setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()
    for cleanup in (lambda: os.remove(TEST_DB_PATH), lambda: shutil.rmtree(os.environ["STORAGE_DIR"])):
        try:
            cleanup()
        except OSError:
            pass


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    fastapi_app.dependency_overrides[get_face_service] = lambda: FakeFaceService()
    fastapi_app.dependency_overrides[get_liveness_service] = lambda: FakeLivenessService(passes=True)
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db):
    email = f"admin_{uuid.uuid4().hex[:8]}@example.com"
    password = "Passw0rd!"
    user = User(email=email, full_name="Test Admin", hashed_password=hash_password(password), role=UserRole.ADMIN)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, password


@pytest.fixture
def admin_token(client, admin_user):
    user, password = admin_user
    resp = client.post("/api/auth/login", json={"email": user.email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}
