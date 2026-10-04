import pytest
from fastapi.testclient import TestClient
from main import app

def login(client: TestClient, email: str, password: str):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    token = data.get("token") or data.get("access_token")
    return {"Authorization": f"Bearer {token}"}

def test_employer_verification_realtime_sync(client):
    # 1. Trainee reports an outcome
    trainee_id = "TRN-2024-001"
    trainee_headers = login(client, "priya.sharma@example.com", "Trainee@123456")
    
    new_outcome = {
        "outcome_type": "employment",
        "role_or_course": "Senior Cloud Infrastructure Engineer",
        "organization_or_venture": "Apex Cloud Technologies India Pvt. Ltd.",
        "compensation_or_funding": "₹12,00,000 / yr",
        "start_date": "2024-12-01",
        "is_current": True,
        "verification_status": "pending",
        "verification_notes": "Offer letter received and accepted"
    }
    
    add_resp = client.post(f"/api/trainees/{trainee_id}/outcomes", json=new_outcome, headers=trainee_headers)
    assert add_resp.status_code == 200, f"Failed to add outcome: {add_resp.text}"
    added_trainee = add_resp.json()
    assert added_trainee["outcome_history"][0]["verification_status"] == "pending"

    # 2. Employer logs in and accesses pending candidates
    employer_headers = login(client, "recruiter@apexcloud.io", "Employer@123456")
    
    # Check pending candidates endpoint
    cand_resp = client.get("/api/employers/all/pending-candidates", headers=employer_headers)
    assert cand_resp.status_code == 200, f"Failed to get pending candidates: {cand_resp.text}"
    candidates = cand_resp.json()
    assert len(candidates) > 0
    
    # Find our trainee
    trainee_in_list = next((c for c in candidates if c["trainee_id"] == trainee_id), None)
    assert trainee_in_list is not None, "Trainee should be visible to employer"
    assert trainee_in_list["has_pending"] is True, "Candidate must be marked has_pending=True in real time"
    assert trainee_in_list["current_role"] == "Senior Cloud Infrastructure Engineer"
    assert trainee_in_list["placement_salary"] == "₹12,00,000 / yr"
    assert trainee_in_list["reported_start_date"] == "2024-12-01"

    # 3. Employer submits verification with auth credentials
    verify_payload = {
        "employer_name": "Apex Cloud Technologies India Pvt. Ltd.",
        "reviewer_name": "Sunita Rao",
        "reviewer_role": "VP Engineering",
        "reviewer_email": "recruiter@apexcloud.io",
        "trainee_id": trainee_id,
        "trainee_name": "Priya Sharma",
        "verification_status": "confirmed",
        "confirmed_role": "Senior Cloud Infrastructure Engineer",
        "confirmed_department": "Core Cloud Platform",
        "employment_type": "Full-time",
        "confirmed_start_date": "2024-12-01",
        "salary_range": "₹12,00,000 / yr",
        "is_still_employed": True,
        "retention_months": 12,
        "skill_ratings": {"React.js": 4.8, "TypeScript": 4.9, "Cloud Security": 4.7, "Technical Communication": 4.5},
        "missing_technical_skills": ["Kubernetes Cluster Security"],
        "missing_soft_skills": ["Executive Presentations"],
        "training_relevance_rating": 4.9,
        "training_relevance_notes": "Exemplary technical execution and architectural depth.",
        "curriculum_recommendations": "Add advanced service mesh workshops.",
        "would_hire_from_provider_again": True,
        "verified_artifacts": ["offer_letter_signed.pdf", "w2_wage_record.pdf"]
    }
    
    verify_resp = client.post("/api/employers/verify", json=verify_payload, headers=employer_headers)
    assert verify_resp.status_code == 201, f"Failed to submit verification: {verify_resp.text}"
    ver_data = verify_resp.json()
    assert ver_data["verification_status"] == "confirmed"
    assert ver_data["evidence_level"] in ["evidence_backed", "multi_source_verified"]

    # 4. Check Trainee Dossier and Living Outcome Passport for real-time synchronization
    passport_resp = client.get(f"/api/trainees/{trainee_id}/passport", headers=trainee_headers)
    assert passport_resp.status_code == 200
    passport = passport_resp.json()
    
    # Outcome history must be verified
    matching_outcome = next((o for o in passport["trainee"].get("outcome_history", []) if o.get("role_or_course") == "Senior Cloud Infrastructure Engineer"), None)
    assert matching_outcome is not None, "Reported outcome must exist"
    assert matching_outcome["verification_status"] == "verified", "Outcome must be updated to verified"
    assert matching_outcome["verified_role"] == "EMPLOYER"
    assert matching_outcome["verified_by"] == "Sunita Rao"
    
    # Audit log event should be present
    audit_events = passport.get("audit_history", [])
    outcome_verified_events = [e for e in audit_events if e.get("event_type") == "OUTCOME_VERIFIED"]
    assert len(outcome_verified_events) >= 1, "Living Outcome Passport must contain OUTCOME_VERIFIED audit event"
    assert passport["counts"]["verified_outcomes"] >= 1, "Verified outcomes count must increase"

def test_employer_reverification_no_duplicates(client):
    employer_headers = login(client, "recruiter@apexcloud.io", "Employer@123456")
    trainee_id = "TRN-2024-001"

    # Get initial verifications count for this trainee
    ver_resp1 = client.get(f"/api/employers/verifications?trainee_id={trainee_id}", headers=employer_headers)
    assert ver_resp1.status_code == 200
    initial_verifications_count = len(ver_resp1.json())

    # Get candidate info - should be marked is_verified: True, has_pending: False
    cand_resp = client.get("/api/employers/all/pending-candidates", headers=employer_headers)
    assert cand_resp.status_code == 200
    candidate = next((c for c in cand_resp.json() if c["trainee_id"] == trainee_id), None)
    assert candidate is not None
    assert candidate["is_verified"] is True
    assert candidate["has_pending"] is False

    # Submit a re-verification with updated notes and rating
    reverify_payload = {
        "employer_name": "Apex Cloud Technologies India Pvt. Ltd.",
        "reviewer_name": "Sunita Rao",
        "reviewer_role": "VP Engineering",
        "reviewer_email": "recruiter@apexcloud.io",
        "trainee_id": trainee_id,
        "trainee_name": "Priya Sharma",
        "verification_status": "confirmed",
        "confirmed_role": "Senior Cloud Infrastructure Engineer",
        "confirmed_department": "Core Cloud Platform",
        "employment_type": "Full-time",
        "confirmed_start_date": "2024-12-01",
        "salary_range": "₹14,00,000 / yr",
        "is_still_employed": True,
        "retention_months": 18,
        "skill_ratings": {"React.js": 5.0, "TypeScript": 5.0, "Cloud Security": 5.0},
        "missing_technical_skills": [],
        "missing_soft_skills": [],
        "training_relevance_rating": 5.0,
        "training_relevance_notes": "Updated re-verification: Outstanding performance and promotion.",
        "curriculum_recommendations": "Keep current curriculum standard.",
        "would_hire_from_provider_again": True,
        "verified_artifacts": ["offer_letter_signed.pdf"]
    }

    reverify_resp = client.post("/api/employers/verify", json=reverify_payload, headers=employer_headers)
    assert reverify_resp.status_code == 201

    # Check verifications count - MUST NOT INCREASE (Upsert)
    ver_resp2 = client.get(f"/api/employers/verifications?trainee_id={trainee_id}", headers=employer_headers)
    assert ver_resp2.status_code == 200
    after_verifications = ver_resp2.json()
    assert len(after_verifications) == initial_verifications_count, "Re-verification must NOT create duplicate verification records"

    # Check that updated data was saved
    updated_ver = next((v for v in after_verifications if v["trainee_id"] == trainee_id), None)
    assert updated_ver is not None
    assert updated_ver["training_relevance_notes"] == "Updated re-verification: Outstanding performance and promotion."
    assert updated_ver["salary_range"] == "₹14,00,000 / yr"

    # Check candidate queue again - must still be is_verified: True, has_pending: False
    cand_resp2 = client.get("/api/employers/all/pending-candidates", headers=employer_headers)
    assert cand_resp2.status_code == 200
    candidate2 = next((c for c in cand_resp2.json() if c["trainee_id"] == trainee_id), None)
    assert candidate2 is not None
    assert candidate2["is_verified"] is True
    assert candidate2["has_pending"] is False

