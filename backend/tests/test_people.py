def test_create_person_requires_auth(client):
    resp = client.post("/api/people", json={"full_name": "X", "external_id": "NOAUTH1"})
    assert resp.status_code == 401


def test_admin_creates_and_lists_person(client, admin_headers):
    resp = client.post(
        "/api/people",
        json={"full_name": "Jane Doe", "external_id": "JD001", "department": "QA"},
        headers=admin_headers,
    )
    assert resp.status_code == 201
    person = resp.json()
    assert person["is_enrolled"] is False

    listing = client.get("/api/people", headers=admin_headers)
    assert listing.status_code == 200
    assert any(p["external_id"] == "JD001" for p in listing.json())


def test_duplicate_external_id_rejected(client, admin_headers):
    client.post("/api/people", json={"full_name": "A", "external_id": "DUP1"}, headers=admin_headers)
    resp = client.post("/api/people", json={"full_name": "B", "external_id": "DUP1"}, headers=admin_headers)
    assert resp.status_code == 400


def test_update_and_delete_person(client, admin_headers):
    created = client.post(
        "/api/people", json={"full_name": "Temp Person", "external_id": "TMP1"}, headers=admin_headers
    ).json()

    updated = client.patch(
        f"/api/people/{created['id']}", json={"department": "Ops"}, headers=admin_headers
    )
    assert updated.status_code == 200
    assert updated.json()["department"] == "Ops"

    deleted = client.delete(f"/api/people/{created['id']}", headers=admin_headers)
    assert deleted.status_code == 204

    missing = client.get(f"/api/people/{created['id']}", headers=admin_headers)
    assert missing.status_code == 404
