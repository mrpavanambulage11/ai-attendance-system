def test_login_success(client, admin_user):
    user, password = admin_user
    resp = client.post("/auth/login", json={"username": user.username, "password": password})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client, admin_user):
    user, _ = admin_user
    resp = client.post("/auth/login", json={"username": user.username, "password": "wrong-password"})
    assert resp.status_code == 401


def test_login_unknown_username(client):
    resp = client.post("/auth/login", json={"username": "nobody", "password": "whatever"})
    assert resp.status_code == 401


def test_employees_require_auth(client):
    resp = client.get("/employees")
    assert resp.status_code == 401
