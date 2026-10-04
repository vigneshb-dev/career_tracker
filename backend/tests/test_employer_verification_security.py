import pytest

def test_unauthenticated_employer_verification_blocked(client):
    res = client.post("/api/employers/verify", json={
        "employer_id": "EMP-01",
        "employer_name": "Apex Cloud Technologies India Pvt. Ltd.",
        "reviewer_name": "Anonymous Person",
        "trainee_id": "TRN-2024-001",
        "trainee_name": "Priya Sharma",
        "confirmed_role": "Junior Frontend Engineer",
        "confirmed_start_date": "2024-06-01"
    })
    assert res.status_code == 401

def test_trainee_cannot_submit_employer_verification(client, trainee1_token):
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res = client.post("/api/employers/verify", headers=headers, json={
        "employer_id": "EMP-01",
        "employer_name": "Apex Cloud Technologies India Pvt. Ltd.",
        "reviewer_name": "Priya Sharma",
        "trainee_id": "TRN-2024-001",
        "trainee_name": "Priya Sharma",
        "confirmed_role": "Junior Frontend Engineer",
        "confirmed_start_date": "2024-06-01"
    })
    assert res.status_code == 403
    assert "Only authenticated employers or administrators" in res.json()["detail"]

def test_employer_cannot_verify_on_behalf_of_other_employer(client, employer_token):
    # Recruiter belongs to EMP-01 (Apex Cloud), attempts to submit as EMP-02
    headers = {"Authorization": f"Bearer {employer_token}"}
    res = client.post("/api/employers/verify", headers=headers, json={
        "employer_id": "EMP-02",
        "employer_name": "Meridian MedTech India Pvt. Ltd.",
        "reviewer_name": "Sunita Rao",
        "trainee_id": "TRN-2024-001",
        "trainee_name": "Priya Sharma",
        "confirmed_role": "Junior Frontend Engineer",
        "confirmed_start_date": "2024-06-01"
    })
    assert res.status_code == 403
    assert "cannot submit verifications on behalf of another employer" in res.json()["detail"]

def test_employer_cannot_verify_unauthorized_candidate(client, employer_token):
    # Apex Cloud (EMP-01) authorized for TRN-2024-001 and TRN-2024-004.
    # Attempts to verify TRN-2024-003 (Sneha Patel - freelancer not associated with Apex)
    headers = {"Authorization": f"Bearer {employer_token}"}
    res = client.post("/api/employers/verify", headers=headers, json={
        "employer_id": "EMP-01",
        "employer_name": "Apex Cloud Technologies India Pvt. Ltd.",
        "reviewer_name": "Sunita Rao",
        "trainee_id": "TRN-2024-003",
        "trainee_name": "Sneha Patel",
        "confirmed_role": "Software Engineer",
        "confirmed_start_date": "2024-06-01"
    })
    assert res.status_code == 403
    assert "lacks authorized access" in res.json()["detail"]

def test_authorized_employer_verification_success(client, employer_token):
    headers = {"Authorization": f"Bearer {employer_token}"}
    res = client.post("/api/employers/verify", headers=headers, json={
        "employer_id": "EMP-01",
        "employer_name": "Apex Cloud Technologies India Pvt. Ltd.",
        "reviewer_name": "Sunita Rao",
        "reviewer_role": "VP Talent Acquisition",
        "reviewer_email": "recruiter@apexcloud.io",
        "trainee_id": "TRN-2024-001",
        "trainee_name": "Priya Sharma",
        "verification_status": "confirmed",
        "confirmed_role": "Frontend Software Engineer",
        "confirmed_department": "Enterprise Cloud UI",
        "employment_type": "Full-time",
        "confirmed_start_date": "2024-06-01",
        "salary_range": "₹8,50,000 / yr",
        "is_still_employed": True,
        "retention_months": 6,
        "skill_ratings": {
            "React.js": 4.8,
            "TypeScript": 4.5
        },
        "training_relevance_rating": 4.9,
        "would_hire_from_provider_again": True
    })
    assert res.status_code == 201
    data = res.json()
    assert data["verification_status"] == "confirmed"
    assert data["employer_name"] == "Apex Cloud Technologies India Pvt. Ltd."
    assert data["trainee_id"] == "TRN-2024-001"

def test_pending_candidates_requires_employer_organization_match(client, employer_token):
    headers = {"Authorization": f"Bearer {employer_token}"}
    # EMP-01 is user's organization -> Success
    res = client.get("/api/employers/EMP-01/pending-candidates", headers=headers)
    assert res.status_code == 200

    # EMP-02 is another organization -> 403 Forbidden
    res2 = client.get("/api/employers/EMP-02/pending-candidates", headers=headers)
    assert res2.status_code == 403
    assert "only manage your own employer organization" in res2.json()["detail"]
