import uuid


def test_login_success(client, admin_user):
    user, password = admin_user
    resp = client.post("/api/auth/login", json={"email": user.email, "password": password})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client, admin_user):
    user, _ = admin_user
    resp = client.post("/api/auth/login", json={"email": user.email, "password": "wrong-password"})
    assert resp.status_code == 401


def test_me_requires_auth(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_returns_current_user(client, admin_headers, admin_user):
    user, _ = admin_user
    resp = client.get("/api/auth/me", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == user.email
    assert resp.json()["role"] == "admin"


def test_register_requires_authentication(client):
    resp = client.post(
        "/api/auth/register",
        json={"email": "new@example.com", "full_name": "New", "password": "Passw0rd!", "role": "teacher"},
    )
    assert resp.status_code == 401


def test_admin_can_register_teacher(client, admin_headers):
    email = f"teacher_{uuid.uuid4().hex[:8]}@example.com"
    resp = client.post(
        "/api/auth/register",
        json={"email": email, "full_name": "New Teacher", "password": "Passw0rd!", "role": "teacher"},
        headers=admin_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["role"] == "teacher"

    # duplicate email is rejected
    dup = client.post(
        "/api/auth/register",
        json={"email": email, "full_name": "New Teacher", "password": "Passw0rd!", "role": "teacher"},
        headers=admin_headers,
    )
    assert dup.status_code == 400
