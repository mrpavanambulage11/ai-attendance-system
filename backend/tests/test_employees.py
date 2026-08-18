import cv2
import numpy as np


def _fake_image_bytes(fill: int) -> bytes:
    array = np.full((60, 60, 3), fill, dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", array)
    assert ok
    return buf.tobytes()


def test_create_employee_requires_auth(client):
    resp = client.post("/employees", json={"name": "X", "employee_code": "NOAUTH1"})
    assert resp.status_code == 401


def test_admin_creates_and_lists_employee(client, admin_headers):
    resp = client.post(
        "/employees",
        json={"name": "Jane Doe", "employee_code": "JD001", "department": "QA"},
        headers=admin_headers,
    )
    assert resp.status_code == 201
    employee = resp.json()
    assert employee["is_enrolled"] is False

    listing = client.get("/employees", headers=admin_headers)
    assert listing.status_code == 200
    assert any(e["employee_code"] == "JD001" for e in listing.json())


def test_duplicate_employee_code_rejected(client, admin_headers):
    client.post("/employees", json={"name": "A", "employee_code": "DUP1"}, headers=admin_headers)
    resp = client.post("/employees", json={"name": "B", "employee_code": "DUP1"}, headers=admin_headers)
    assert resp.status_code == 400


def _registration_form(**overrides) -> dict:
    form = {
        "name": "New Walk-up",
        "department": "Warehouse",
        "department_id": "DEP-9",
        "position": "Associate",
        "joining_date": "2026-08-18",
        "hr_name": "Pat HR",
        "office_location": "Building 2",
        "contact": "+1 555 010 1234",
        "address": "123 Main St",
        "shift_type": "Morning",
        "confirmed": "true",
    }
    form.update(overrides)
    return form


def test_self_register_requires_no_auth_and_creates_enrolled_employee(client):
    resp = client.post(
        "/employees/register",
        data=_registration_form(),
        files=[("files", ("face.jpg", _fake_image_bytes(120), "image/jpeg"))],
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["employee"]["name"] == "New Walk-up"
    assert body["employee"]["employee_code"].startswith("SELF-")
    assert body["frames_used"] == 1


def test_self_register_rejects_already_enrolled_face(client):
    image_bytes = _fake_image_bytes(180)
    first = client.post(
        "/employees/register",
        data=_registration_form(name="First Person"),
        files=[("files", ("face.jpg", image_bytes, "image/jpeg"))],
    )
    assert first.status_code == 201

    second = client.post(
        "/employees/register",
        data=_registration_form(name="Second Person"),
        files=[("files", ("face.jpg", image_bytes, "image/jpeg"))],
    )
    assert second.status_code == 409
    assert "First Person" in second.json()["detail"]


def test_self_register_requires_a_name(client):
    resp = client.post(
        "/employees/register",
        data=_registration_form(name="   "),
        files=[("files", ("face.jpg", _fake_image_bytes(90), "image/jpeg"))],
    )
    assert resp.status_code == 422


def test_self_register_requires_confirmation(client):
    resp = client.post(
        "/employees/register",
        data=_registration_form(confirmed="false"),
        files=[("files", ("face.jpg", _fake_image_bytes(200), "image/jpeg"))],
    )
    assert resp.status_code == 422
    assert "confirm" in resp.json()["detail"].lower()


def test_self_register_rejects_invalid_joining_date(client):
    resp = client.post(
        "/employees/register",
        data=_registration_form(joining_date="not-a-date"),
        files=[("files", ("face.jpg", _fake_image_bytes(210), "image/jpeg"))],
    )
    assert resp.status_code == 422
    assert "joining_date" in resp.json()["detail"]


def test_self_register_rejects_spoofed_face(client):
    from app.main import app as fastapi_app
    from conftest import FakeFaceService
    from app.services.face_service import SpoofDetectedError, get_face_service

    fastapi_app.dependency_overrides[get_face_service] = lambda: FakeFaceService(
        error=SpoofDetectedError("This looks like a photo or screen, not a live face - please use your real face")
    )
    try:
        resp = client.post(
            "/employees/register",
            data=_registration_form(),
            files=[("files", ("face.jpg", _fake_image_bytes(230), "image/jpeg"))],
        )
    finally:
        fastapi_app.dependency_overrides.pop(get_face_service, None)
    assert resp.status_code == 422
    assert "photo or screen" in resp.json()["detail"].lower()


def test_self_register_is_rate_limited(client):
    from app.main import app as fastapi_app

    fastapi_app.state.limiter.enabled = True
    try:
        responses = [
            client.post(
                "/employees/register",
                data=_registration_form(name=f"Rate Limit Test {i}"),
                files=[("files", ("face.jpg", _fake_image_bytes(i), "image/jpeg"))],
            )
            for i in range(10)
        ]
    finally:
        fastapi_app.state.limiter.enabled = False

    limited = [r for r in responses if r.status_code == 429]
    assert limited, "expected at least one 429 after 10 rapid requests against a 5/minute limit"
    assert "too many requests" in limited[0].json()["detail"].lower()
