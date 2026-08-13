import uuid


def _create_person(client, admin_headers, email=True):
    ext_id = f"PORTAL{uuid.uuid4().hex[:6]}"
    payload = {"full_name": "Portal Person", "external_id": ext_id}
    if email:
        payload["email"] = f"{ext_id.lower()}@example.com"
    resp = client.post("/api/people", json=payload, headers=admin_headers)
    assert resp.status_code == 201
    return resp.json()


def test_enable_portal_requires_email(client, admin_headers):
    person = _create_person(client, admin_headers, email=False)
    resp = client.post(f"/api/people/{person['id']}/portal", json={}, headers=admin_headers)
    assert resp.status_code == 400


def test_enable_portal_requires_admin(client, admin_headers):
    person = _create_person(client, admin_headers)
    resp = client.post(f"/api/people/{person['id']}/portal", json={})
    assert resp.status_code == 401


def test_person_can_login_and_see_own_data_only(client, admin_headers):
    person = _create_person(client, admin_headers)
    enable = client.post(f"/api/people/{person['id']}/portal", json={}, headers=admin_headers)
    assert enable.status_code == 200
    creds = enable.json()
    assert creds["email"] == person["email"]

    login = client.post("/api/auth/login", json={"email": creds["email"], "password": creds["password"]})
    assert login.status_code == 200
    token = login.json()["access_token"]
    person_headers = {"Authorization": f"Bearer {token}"}

    me = client.get("/api/auth/me", headers=person_headers)
    assert me.status_code == 200
    assert me.json()["role"] == "person"
    assert me.json()["id"] == person["id"]

    summary = client.get("/api/me/summary", headers=person_headers)
    assert summary.status_code == 200
    assert summary.json()["full_name"] == "Portal Person"

    trend = client.get("/api/me/trend", headers=person_headers)
    assert trend.status_code == 200
    assert isinstance(trend.json(), list)

    records = client.get("/api/me/records", headers=person_headers)
    assert records.status_code == 200

    # A person account cannot reach staff-only endpoints, even for their own record.
    forbidden = client.get("/api/people", headers=person_headers)
    assert forbidden.status_code == 401


def test_staff_token_cannot_use_me_endpoints(client, admin_headers):
    resp = client.get("/api/me/summary", headers=admin_headers)
    assert resp.status_code == 401


def test_revoke_disables_login(client, admin_headers):
    person = _create_person(client, admin_headers)
    enable = client.post(f"/api/people/{person['id']}/portal", json={}, headers=admin_headers)
    creds = enable.json()

    revoke = client.post(f"/api/people/{person['id']}/portal/revoke", headers=admin_headers)
    assert revoke.status_code == 200
    assert revoke.json()["portal_enabled"] is False

    login = client.post("/api/auth/login", json={"email": creds["email"], "password": creds["password"]})
    assert login.status_code == 401


def test_wrong_password_rejected(client, admin_headers):
    person = _create_person(client, admin_headers)
    enable = client.post(f"/api/people/{person['id']}/portal", json={}, headers=admin_headers)
    creds = enable.json()

    login = client.post("/api/auth/login", json={"email": creds["email"], "password": "not-the-password"})
    assert login.status_code == 401
