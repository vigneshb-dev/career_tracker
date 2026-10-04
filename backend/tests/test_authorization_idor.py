import pytest

def test_trainee_can_access_own_passport(client, trainee1_token):
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.get("/api/trainees/me/passport", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["trainee"]["id"] == "TRN-2024-001"

def test_trainee_idor_cannot_access_other_trainee_passport(client, trainee1_token):
    # Trainee 1 (Priya: TRN-2024-001) attempting to access Trainee 2 (Rajesh: TRN-2024-002)
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.get("/api/trainees/TRN-2024-002/passport", headers=headers)
    assert res.status_code == 403
    assert "strictly restricted to their own record" in res.json()["detail"]

def test_trainee_idor_cannot_access_other_trainee_training(client, trainee1_token):
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.get("/api/trainees/TRN-2024-002/training", headers=headers)
    assert res.status_code == 403

def test_trainee_idor_cannot_modify_other_trainee_profile(client, trainee1_token):
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.patch("/api/trainees/TRN-2024-002/profile", headers=headers, json={
        "location": "Hacked Location"
    })
    assert res.status_code == 403

def test_trainee_idor_cannot_view_other_trainee_skill_gaps(client, trainee1_token):
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.get("/api/skill-gaps/trainees/TRN-2024-002", headers=headers)
    assert res.status_code == 403

def test_trainee_idor_cannot_view_other_trainee_timeline(client, trainee1_token):
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.get("/api/career-path/trainees/TRN-2024-002/timeline", headers=headers)
    assert res.status_code == 403

def test_trainee_cannot_self_verify_training(client, trainee1_token):
    # Trainee cannot call verify endpoints (requires COACH or ADMIN role)
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.patch("/api/trainees/TRN-2024-001/training/TR-001/verify", headers=headers, json={
        "verification_status": "verified"
    })
    assert res.status_code == 403

def test_employer_cannot_modify_trainee_profile(client, employer_token):
    headers = {"Authorization": f"Bearer {employer_token}"}
    res = client.patch("/api/trainees/TRN-2024-001/profile", headers=headers, json={
        "full_name": "Employer Tampered Name"
    })
    assert res.status_code == 403

def test_unauthenticated_request_blocked(client):
    res = client.get("/api/trainees/TRN-2024-001/passport")
    assert res.status_code == 401

def test_coach_can_access_assigned_trainee(client, coach_token):
    headers = {"Authorization": f"Bearer {coach_token}"}
    res = client.get("/api/trainees/TRN-2024-001/passport", headers=headers)
    assert res.status_code == 200
    assert res.json()["trainee"]["id"] == "TRN-2024-001"

def test_admin_has_full_access(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res1 = client.get("/api/trainees/TRN-2024-001/passport", headers=headers)
    res2 = client.get("/api/trainees/TRN-2024-002/passport", headers=headers)
    assert res1.status_code == 200
    assert res2.status_code == 200
