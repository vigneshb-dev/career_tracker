import pytest

def test_unauthenticated_follow_up_completion_blocked(client):
    res = client.post("/api/follow-ups/longitudinal/LFU-TRN-2024-001-30D/complete", json={
        "retention_confirmed": True,
        "pathway": "employment",
        "notes": "Unauthenticated attempt"
    })
    assert res.status_code == 401

def test_trainee_cannot_complete_other_trainee_follow_up(client, trainee1_token):
    # Trainee 1 attempting to complete Trainee 2's longitudinal follow-up
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.post("/api/follow-ups/longitudinal/LFU-TRN-2024-002-30D/complete", headers=headers, json={
        "retention_confirmed": True,
        "pathway": "employment"
    })
    assert res.status_code == 403
    assert "only complete your own follow-up response" in res.json()["detail"]

def test_coach_can_complete_assigned_trainee_follow_up(client, coach_token):
    headers = {"Authorization": f"Bearer {coach_token}"}
    res = client.post("/api/follow-ups/longitudinal/LFU-TRN-2024-001-30D/complete", headers=headers, json={
        "retention_confirmed": True,
        "pathway": "employment",
        "metrics": {"salary_range": "₹8,50,000 / yr", "retention": "30-Day Confirmed"},
        "notes": "Verified by Coach Sarah during monthly review."
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["retention_confirmed"] is True

def test_career_event_creation_authorization(client, trainee1_token, coach_token):
    t_headers = {"Authorization": f"Bearer {trainee1_token}"}
    c_headers = {"Authorization": f"Bearer {coach_token}"}

    # 1. Trainee cannot record event on another trainee's timeline
    res_idor = client.post("/api/career-path/events", headers=t_headers, json={
        "trainee_id": "TRN-2024-002",
        "stage": "progression",
        "pathway": "employment",
        "title": "Unauthorized Milestone",
        "organization": "Test Corp",
        "event_date": "2024-09-01"
    })
    assert res_idor.status_code == 403

    # 2. Trainee recording own event has verification_status forced to SELF_REPORTED
    res_own = client.post("/api/career-path/events", headers=t_headers, json={
        "trainee_id": "TRN-2024-001",
        "stage": "career_event",
        "pathway": "employment",
        "title": "Passed AWS Solutions Architect Exam",
        "organization": "Amazon Web Services",
        "event_date": "2024-09-15",
        "verification_status": "verified" # Attempting to self-verify!
    })
    assert res_own.status_code == 201
    assert res_own.json()["verification_status"] == "SELF_REPORTED"

    # 3. Coach recording event can record DOCUMENT_VERIFIED
    res_coach = client.post("/api/career-path/events", headers=c_headers, json={
        "trainee_id": "TRN-2024-001",
        "stage": "progression",
        "pathway": "employment",
        "title": "Promotion to Frontend Engineer II",
        "organization": "Apex Cloud Technologies India Pvt. Ltd.",
        "event_date": "2024-10-01",
        "verification_status": "DOCUMENT_VERIFIED"
    })
    assert res_coach.status_code == 201
    assert res_coach.json()["verification_status"] == "DOCUMENT_VERIFIED"

def test_career_seed_endpoint_protected_by_admin_role(client, trainee1_token, coach_token, admin_token):
    # Trainee -> 403
    res_t = client.post("/api/career-path/seed", headers={"Authorization": f"Bearer {trainee1_token}"})
    assert res_t.status_code == 403

    # Coach -> 403
    res_c = client.post("/api/career-path/seed", headers={"Authorization": f"Bearer {coach_token}"})
    assert res_c.status_code == 403

    # Admin -> 200
    res_a = client.post("/api/career-path/seed", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_a.status_code == 200
