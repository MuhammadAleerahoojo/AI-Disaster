def test_register_and_login(client):
    resp = client.post("/api/auth/register", json={
        "full_name": "Test User",
        "email": "testuser@example.com",
        "password": "TestPass123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "testuser@example.com"

    resp2 = client.post("/api/auth/login", json={
        "email": "testuser@example.com",
        "password": "TestPass123",
    })
    assert resp2.status_code == 200
    assert "access_token" in resp2.json()

    resp3 = client.post("/api/auth/login", json={
        "email": "testuser@example.com",
        "password": "WrongPassword",
    })
    assert resp3.status_code == 401
