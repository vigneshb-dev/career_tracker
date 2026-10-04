import pytest

def test_login_success(client):
    res = client.post("/api/auth/login", json={
        "email": "priya.sharma@example.com",
        "password": "Trainee@123456"
    })
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["email"] == "priya.sharma@example.com"
    assert data["user"]["role"] == "TRAINEE"

def test_login_invalid_password(client):
    res = client.post("/api/auth/login", json={
        "email": "priya.sharma@example.com",
        "password": "WrongPassword!99"
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]

def test_login_nonexistent_user(client):
    res = client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "Password@123"
    })
    assert res.status_code == 401

def test_signup_trainee(client):
    signup_data = {
        "email": "new.candidate@example.com",
        "password": "SecurePassword@123",
        "full_name": "New Candidate",
        "role": "TRAINEE",
        "phone": "+91 99887 76655",
        "program": "Full Stack Cloud & AI Engineering"
    }
    res = client.post("/api/auth/signup", json=signup_data)
    assert res.status_code == 201
    data = res.json()
    assert "token" in data
    assert data["user"]["role"] == "TRAINEE"
    assert data["requires_verification"] is True

def test_signup_prohibits_admin(client):
    res = client.post("/api/auth/signup", json={
        "email": "hacker.admin@example.com",
        "password": "HackerAdmin@123",
        "full_name": "Hacker Admin",
        "role": "ADMIN"
    })
    assert res.status_code == 403
    assert "strictly prohibited" in res.json()["detail"].lower()

def test_me_endpoint_requires_auth(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401

def test_me_endpoint_authenticated(client, trainee1_token):
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {trainee1_token}"})
    assert res.status_code == 200
    user = res.json()
    assert user["email"] == "priya.sharma@example.com"
    assert user["role"] == "TRAINEE"

def test_logout_blacklists_token(client):
    # Log in separate user to test logout & blacklisting without affecting shared fixtures
    res = client.post("/api/auth/login", json={"email": "coach.arun@skilltrace.org", "password": "Coach@123456"})
    assert res.status_code == 200
    temp_token = res.json()["token"]
    headers = {"Authorization": f"Bearer {temp_token}"}
    logout_res = client.post("/api/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # Re-accessing /me with blacklisted token must fail with 401
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 401
    assert "revoked" in me_res.json()["detail"].lower()
