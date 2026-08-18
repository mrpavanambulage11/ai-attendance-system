import cv2
import numpy as np
import pytest

from app.services.face_service import MultipleFacesDetectedError

from conftest import FakeFaceService


def _fake_image_bytes(fill: int) -> bytes:
    array = np.full((60, 60, 3), fill, dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", array)
    assert ok
    return buf.tobytes()


def _create_employee(client, admin_headers, employee_code: str) -> dict:
    resp = client.post(
        "/employees",
        json={"name": "Rec Employee", "employee_code": employee_code, "department": "QA"},
        headers=admin_headers,
    )
    assert resp.status_code == 201
    return resp.json()


def _enroll(client, admin_headers, employee_id: int, image_bytes: bytes):
    return client.post(
        f"/employees/{employee_id}/enroll-face",
        files=[("files", ("face.jpg", image_bytes, "image/jpeg"))],
        headers=admin_headers,
    )


def _mark(client, image_bytes: bytes):
    return client.post("/attendance/mark", files={"file": ("frame.jpg", image_bytes, "image/jpeg")})


def test_enroll_and_mark_checks_in(client, admin_headers):
    employee = _create_employee(client, admin_headers, "EMP-REC-1")
    image_bytes = _fake_image_bytes(77)

    enroll_resp = _enroll(client, admin_headers, employee["id"], image_bytes)
    assert enroll_resp.status_code == 200
    assert enroll_resp.json()["frames_used"] == 1

    listing = client.get("/employees", headers=admin_headers).json()
    assert next(e for e in listing if e["id"] == employee["id"])["is_enrolled"] is True

    mark_resp = _mark(client, image_bytes)
    body = mark_resp.json()
    assert mark_resp.status_code == 200
    assert body["matched"] is True
    assert body["type"] == "check_in"
    assert body["employee"]["id"] == employee["id"]


def test_second_scan_same_day_checks_out(client, admin_headers):
    employee = _create_employee(client, admin_headers, "EMP-REC-2")
    image_bytes = _fake_image_bytes(150)
    _enroll(client, admin_headers, employee["id"], image_bytes)

    first = _mark(client, image_bytes)
    assert first.json()["type"] == "check_in"

    second = _mark(client, image_bytes)
    assert second.json()["matched"] is True
    assert second.json()["type"] == "check_out"


def test_unknown_face_not_matched(client, admin_headers):
    employee = _create_employee(client, admin_headers, "EMP-REC-3")
    _enroll(client, admin_headers, employee["id"], _fake_image_bytes(30))

    resp = _mark(client, _fake_image_bytes(240))
    assert resp.json()["matched"] is False
    assert resp.json()["message"] == "Face not recognized"


def test_mark_rejects_unreadable_upload(client):
    resp = client.post("/attendance/mark", files={"file": ("empty.jpg", b"", "image/jpeg")})
    assert resp.status_code == 422
    assert "could not read" in resp.json()["detail"].lower()


def test_mark_rejects_no_face_frame(client):
    from app.main import app as fastapi_app
    from app.services.face_service import NoFaceDetectedError, get_face_service

    fastapi_app.dependency_overrides[get_face_service] = lambda: FakeFaceService(
        error=NoFaceDetectedError("No face detected in the image")
    )
    try:
        resp = _mark(client, _fake_image_bytes(60))
    finally:
        fastapi_app.dependency_overrides.pop(get_face_service, None)
    assert resp.status_code == 422
    assert "no face" in resp.json()["detail"].lower()


def test_mark_rejects_multiple_faces(client):
    from app.main import app as fastapi_app
    from app.services.face_service import get_face_service

    fastapi_app.dependency_overrides[get_face_service] = lambda: FakeFaceService(
        error=MultipleFacesDetectedError("Multiple faces detected, ensure only one person is in frame")
    )
    try:
        resp = _mark(client, _fake_image_bytes(50))
    finally:
        fastapi_app.dependency_overrides.pop(get_face_service, None)
    assert resp.status_code == 422
    assert "multiple faces" in resp.json()["detail"].lower()


def test_mark_rejects_spoofed_face(client):
    from app.main import app as fastapi_app
    from app.services.face_service import SpoofDetectedError, get_face_service

    fastapi_app.dependency_overrides[get_face_service] = lambda: FakeFaceService(
        error=SpoofDetectedError("This looks like a photo or screen, not a live face - please use your real face")
    )
    try:
        resp = _mark(client, _fake_image_bytes(70))
    finally:
        fastapi_app.dependency_overrides.pop(get_face_service, None)
    assert resp.status_code == 422
    assert "photo or screen" in resp.json()["detail"].lower()


def test_mark_is_rate_limited(client):
    from app.main import app as fastapi_app

    fastapi_app.state.limiter.enabled = True
    try:
        responses = [_mark(client, _fake_image_bytes(i)) for i in range(25)]
    finally:
        fastapi_app.state.limiter.enabled = False

    limited = [r for r in responses if r.status_code == 429]
    assert limited, "expected at least one 429 after 25 rapid requests against a 20/minute limit"
    assert "too many requests" in limited[0].json()["detail"].lower()


def test_attendance_export_returns_csv(client, admin_headers):
    employee = _create_employee(client, admin_headers, "EMP-REC-5")
    image_bytes = _fake_image_bytes(200)
    _enroll(client, admin_headers, employee["id"], image_bytes)
    _mark(client, image_bytes)

    resp = client.get("/attendance/export", headers=admin_headers)
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "EMP-REC-5" in resp.text


def test_ws_rejects_missing_or_invalid_token(client):
    """The handler closes before accept() when auth fails, which Starlette surfaces as a
    rejected handshake (not a clean disconnect after connecting)."""
    with pytest.raises(Exception):
        with client.websocket_connect("/attendance/ws"):
            pass

    with pytest.raises(Exception):
        with client.websocket_connect("/attendance/ws?token=not-a-real-token"):
            pass


def test_ws_broadcasts_on_successful_match(client, admin_headers, admin_token):
    employee = _create_employee(client, admin_headers, "EMP-REC-6")
    image_bytes = _fake_image_bytes(90)
    _enroll(client, admin_headers, employee["id"], image_bytes)

    with client.websocket_connect(f"/attendance/ws?token={admin_token}") as ws:
        mark_resp = _mark(client, image_bytes)
        assert mark_resp.status_code == 200
        event = ws.receive_json()
        assert event["employee"]["id"] == employee["id"]
        assert event["type"] == "check_in"
