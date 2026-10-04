import pytest

def test_trainee_can_update_own_consent_to_withdrawn(client, trainee1_token):
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.put("/api/trainees/TRN-2024-001/consent", headers=headers, json={
        "consent_status": "WITHDRAWN",
        "share_with_employers": False,
        "share_with_funding_bodies": False,
        "share_anonymized_research": False,
        "notes": "Withdrawing data tracking consent for privacy audit test."
    })
    assert res.status_code == 200
    trainee = res.json()
    assert trainee["consent_status"]["status"] == "WITHDRAWN"

def test_longitudinal_scheduling_blocked_when_consent_withdrawn(client, coach_token):
    # Coach tries to schedule milestones for TRN-2024-001 whose consent was withdrawn
    headers = {"Authorization": f"Bearer {coach_token}"}
    res = client.post("/api/follow-ups/schedule-milestones/TRN-2024-001", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "blocked_by_consent"
    assert "WITHDRAWN" in data["message"]

def test_longitudinal_completion_blocked_when_consent_withdrawn(client, coach_token):
    # Try to complete longitudinal follow-up for trainee with withdrawn consent
    headers = {"Authorization": f"Bearer {coach_token}"}
    res = client.post("/api/follow-ups/longitudinal/LFU-TRN-2024-001-30D/complete", headers=headers, json={
        "retention_confirmed": True,
        "pathway": "employment",
        "notes": "Attempting follow-up on withdrawn consent"
    })
    assert res.status_code == 400
    assert "consent is currently 'WITHDRAWN'" in res.json()["detail"]

def test_trainee_reenables_consent_to_active(client, trainee1_token):
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.put("/api/trainees/TRN-2024-001/consent", headers=headers, json={
        "consent_status": "ACTIVE",
        "share_with_employers": True,
        "share_with_funding_bodies": True,
        "share_anonymized_research": True
    })
    assert res.status_code == 200
    trainee = res.json()
    assert trainee["consent_status"]["status"] == "ACTIVE"

def test_reject_invalid_consent_status(client, trainee1_token):
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.put("/api/trainees/TRN-2024-001/consent", headers=headers, json={
        "consent_status": "INVALID_RANDOM_STATUS"
    })
    assert res.status_code == 400
    assert "Invalid consent status" in res.json()["detail"]

def test_trainee_idor_cannot_update_other_trainee_consent(client, trainee1_token):
    # Trainee 1 attempting to update Trainee 2's consent
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.put("/api/trainees/TRN-2024-002/consent", headers=headers, json={
        "consent_status": "WITHDRAWN"
    })
    assert res.status_code == 403
