import cv2
import numpy as np


def _fake_image_bytes(fill: int) -> bytes:
    array = np.full((60, 60, 3), fill, dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", array)
    assert ok
    return buf.tobytes()


def _create_person(client, admin_headers, external_id: str) -> dict:
    resp = client.post(
        "/api/people",
        json={"full_name": "Rec Person", "external_id": external_id, "department": "QA"},
        headers=admin_headers,
    )
    assert resp.status_code == 201
    return resp.json()


def _enroll(client, admin_headers, person_id: int, image_bytes: bytes):
    return client.post(
        f"/api/people/{person_id}/enroll",
        files=[("files", ("face.jpg", image_bytes, "image/jpeg"))],
        headers=admin_headers,
    )


def _identify(client, admin_headers, image_bytes: bytes):
    files = [("frames", (f"f{i}.jpg", image_bytes, "image/jpeg")) for i in range(3)]
    return client.post("/api/recognition/identify", files=files, headers=admin_headers)


def test_enroll_and_recognize_marks_attendance(client, admin_headers):
    person = _create_person(client, admin_headers, "EMP-REC-1")
    image_bytes = _fake_image_bytes(77)

    enroll_resp = _enroll(client, admin_headers, person["id"], image_bytes)
    assert enroll_resp.status_code == 200
    assert enroll_resp.json()["is_enrolled"] is True

    identify_resp = _identify(client, admin_headers, image_bytes)
    body = identify_resp.json()
    assert identify_resp.status_code == 200
    assert body["matched"] is True
    assert body["liveness_passed"] is True
    assert body["attendance_marked"] is True
    assert body["person"]["id"] == person["id"]


def test_duplicate_recognition_same_day_does_not_double_mark(client, admin_headers):
    person = _create_person(client, admin_headers, "EMP-REC-2")
    image_bytes = _fake_image_bytes(150)
    _enroll(client, admin_headers, person["id"], image_bytes)

    first = _identify(client, admin_headers, image_bytes)
    assert first.json()["attendance_marked"] is True

    second = _identify(client, admin_headers, image_bytes)
    assert second.json()["matched"] is True
    assert second.json()["attendance_marked"] is False


def test_unknown_face_not_matched(client, admin_headers):
    person = _create_person(client, admin_headers, "EMP-REC-3")
    _enroll(client, admin_headers, person["id"], _fake_image_bytes(30))

    resp = _identify(client, admin_headers, _fake_image_bytes(240))
    assert resp.json()["matched"] is False


def test_manual_attendance_and_dashboard_summary(client, admin_headers):
    person = _create_person(client, admin_headers, "EMP-REC-4")

    resp = client.post(
        "/api/attendance", json={"person_id": person["id"], "status": "present"}, headers=admin_headers
    )
    assert resp.status_code == 201

    dup = client.post(
        "/api/attendance", json={"person_id": person["id"], "status": "present"}, headers=admin_headers
    )
    assert dup.status_code == 400

    summary = client.get("/api/dashboard/summary", headers=admin_headers)
    assert summary.status_code == 200
    assert summary.json()["present_today"] >= 1


def test_attendance_export_returns_csv(client, admin_headers):
    person = _create_person(client, admin_headers, "EMP-REC-5")
    client.post("/api/attendance", json={"person_id": person["id"], "status": "present"}, headers=admin_headers)

    resp = client.get("/api/attendance/export", headers=admin_headers)
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "EMP-REC-5" in resp.text
