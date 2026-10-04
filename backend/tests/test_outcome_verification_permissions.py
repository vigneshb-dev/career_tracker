import pytest
from fastapi.testclient import TestClient
from main import app

def login(client: TestClient, email: str, password: str):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        raise Exception(f"Login failed for {email}: {resp.status_code} {resp.text}")
    data = resp.json()
    token = data.get("token") or data.get("access_token")
    return {"Authorization": f"Bearer {token}"}

def test_outcome_verification_permissions_e2e(client):
    # 1. Log in as Trainee
    trainee_email = "priya.sharma@example.com"
    trainee_headers = login(client, trainee_email, "Trainee@123456")
    trainee_id = "TRN-2024-001"

    # 2. Trainee adds an outcome
    outcome_payload = {
        "outcome_type": "EMPLOYMENT",
        "role_or_course": "Lead Cloud Infrastructure Specialist",
        "organization_or_venture": "Apex Cloud Technologies India Pvt. Ltd.",
        "compensation_or_funding": "₹95,000 / mo (₹11,40,000 / yr)",
        "start_date": "2024-11-01",
        "is_current": True,
        "verification_status": "pending",
        "verification_notes": "Submitted self-report with offer letter"
    }

    add_res = client.post(f"/api/trainees/{trainee_id}/outcomes", json=outcome_payload, headers=trainee_headers)
    assert add_res.status_code == 200, f"Expected 200, got {add_res.status_code}: {add_res.text}"
    trainee_obj = add_res.json()
    outcome_history = trainee_obj.get("outcome_history", [])
    outcome_data = outcome_history[0]
    outcome_id = outcome_data.get("id")
    assert outcome_data.get("verification_status") == "pending", "Trainee-added outcome must be pending"

    # 3. Trainee attempts self-verification on outcome -> Expect 403 Forbidden
    verify_attempt = client.patch(
        f"/api/trainees/{trainee_id}/outcomes/{outcome_id}/verify",
        json={"verification_status": "verified", "verification_notes": "I verify myself"},
        headers=trainee_headers
    )
    assert verify_attempt.status_code == 403, f"Expected 403, got {verify_attempt.status_code}"

    # 4. Trainee adds a training record and attempts to self-verify -> Expect 403 Forbidden
    trn_create = client.post(
        f"/api/trainees/{trainee_id}/training",
        json={
            "course_name": "Enterprise React & Cloud Architecture",
            "provider_name": "National Skill Academy",
            "start_date": "2024-01-15",
            "completion_status": "completed"
        },
        headers=trainee_headers
    )
    assert trn_create.status_code in [200, 201]
    t_rec_id = trn_create.json().get("id") or trn_create.json().get("record", {}).get("id")

    trn_verify_res = client.patch(
        f"/api/trainees/{trainee_id}/training/{t_rec_id}/verify",
        json={"verification_status": "verified", "verification_notes": "Attempting self-verify"},
        headers=trainee_headers
    )
    assert trn_verify_res.status_code == 403, f"Expected 403, got {trn_verify_res.status_code}"

    # 5. Trainee adds a skill and attempts to self-verify -> Expect 403 Forbidden
    skill_create = client.post(
        f"/api/trainees/{trainee_id}/skills",
        json={
            "skill_name": "Cloud Security & Governance",
            "self_rating": 4.0,
            "evidence_notes": "Architected IAM policies"
        },
        headers=trainee_headers
    )
    assert skill_create.status_code in [200, 201]
    skill_id = skill_create.json().get("skill_id") or "Cloud Security & Governance"

    skill_verify_res = client.patch(
        f"/api/trainees/{trainee_id}/skills/{skill_id}/verify",
        json={"score": 4.5, "notes": "Attempting self-verify"},
        headers=trainee_headers
    )
    assert skill_verify_res.status_code == 403, f"Expected 403, got {skill_verify_res.status_code}"

    # 6. Trainee adds a certification and attempts to self-verify -> Expect 403 Forbidden
    cert_payload = {
        "title": "AWS Certified Solutions Architect - Associate",
        "issuing_organization": "Amazon Web Services",
        "issue_date": "2024-10-01",
        "credential_id": "AWS-SA-883190"
    }
    cert_add_res = client.post(f"/api/trainees/{trainee_id}/certifications", json=cert_payload, headers=trainee_headers)
    assert cert_add_res.status_code == 200, f"Expected 200, got {cert_add_res.status_code}: {cert_add_res.text}"
    cert_data = cert_add_res.json().get("certifications", [])[-1]
    cert_id = cert_data.get("id")
    assert cert_data.get("verification_status") == "pending"

    cert_verify_res = client.patch(
        f"/api/trainees/{trainee_id}/certifications/{cert_id}/verify",
        json={"verification_status": "verified", "verification_notes": "Self-certifying"},
        headers=trainee_headers
    )
    assert cert_verify_res.status_code == 403, f"Expected 403, got {cert_verify_res.status_code}"

    # 7. Log in as VERIFICATION_AUTHORITY
    va_email = "verifier@skilltrace.gov"
    va_headers = login(client, va_email, "Verifier@123456")

    # 8. Verification Authority verifies the outcome -> Status verified, evidence elevated
    va_outcome_res = client.patch(
        f"/api/trainees/{trainee_id}/outcomes/{outcome_id}/verify",
        json={"verification_status": "verified", "verification_notes": "Audited by National Verification Authority"},
        headers=va_headers
    )
    assert va_outcome_res.status_code == 200, f"Expected 200, got {va_outcome_res.status_code}: {va_outcome_res.text}"
    va_updated_trainee = va_outcome_res.json()
    va_outcome_data = next(o for o in va_updated_trainee.get("outcome_history", []) if o.get("id") == outcome_id)
    assert va_outcome_data.get("verification_status") == "verified"
    assert va_updated_trainee.get("evidence_level") == "evidence_backed"

    # 9. Verification Authority verifies training record
    va_trn_res = client.patch(
        f"/api/trainees/{trainee_id}/training/{t_rec_id}/verify",
        json={"verification_status": "verified", "verification_notes": "Accredited training verified"},
        headers=va_headers
    )
    assert va_trn_res.status_code == 200, f"Expected 200, got {va_trn_res.status_code}: {va_trn_res.text}"

    # 10. Verification Authority verifies skill
    va_skill_res = client.patch(
        f"/api/trainees/{trainee_id}/skills/{skill_id}/verify",
        json={"score": 4.5, "notes": "Audited and verified"},
        headers=va_headers
    )
    assert va_skill_res.status_code == 200, f"Expected 200, got {va_skill_res.status_code}: {va_skill_res.text}"

    # 11. Verification Authority verifies certification
    va_cert_res = client.patch(
        f"/api/trainees/{trainee_id}/certifications/{cert_id}/verify",
        json={"verification_status": "verified", "verification_notes": "Credential verified via accredited issuing registry"},
        headers=va_headers
    )
    assert va_cert_res.status_code == 200, f"Expected 200, got {va_cert_res.status_code}: {va_cert_res.text}"
    va_cert_data = next(c for c in va_cert_res.json().get("certifications", []) if c.get("id") == cert_id)
    assert va_cert_data.get("verification_status") == "verified"

    # 12. Log in as EMPLOYER
    emp_email = "recruiter@apexcloud.io"
    emp_headers = login(client, emp_email, "Employer@123456")

    # Employer verifies the outcome for their candidate/company -> Status verified, evidence elevated to employer_confirmed
    emp_verify_res = client.patch(
        f"/api/trainees/{trainee_id}/outcomes/{outcome_id}/verify",
        json={
            "verification_status": "verified",
            "verification_notes": "Direct employer verification by VP of Talent Sunita Rao",
            "confirmed_start_date": "2024-11-01",
            "is_still_employed": True
        },
        headers=emp_headers
    )
    assert emp_verify_res.status_code == 200, f"Expected 200, got {emp_verify_res.status_code}: {emp_verify_res.text}"
    emp_trainee_data = emp_verify_res.json()
    emp_outcome_data = next(o for o in emp_trainee_data.get("outcome_history", []) if o.get("id") == outcome_id)
    assert emp_outcome_data.get("verification_status") == "verified"
    assert emp_trainee_data.get("evidence_level") == "employer_confirmed"

    # 13. Log in as AUDITOR
    aud_email = "auditor@skilltrace.org"
    aud_headers = login(client, aud_email, "Auditor@123456")

    # Auditor accesses Trainee Passport
    aud_passport_res = client.get(f"/api/trainees/{trainee_id}/passport", headers=aud_headers)
    assert aud_passport_res.status_code == 200, f"Expected 200, got {aud_passport_res.status_code}: {aud_passport_res.text}"
    passport = aud_passport_res.json()

    # 14. Check Passport Metrics & Data Synchronization
    counts = passport.get("counts", {})
    passport_trainee = passport.get("trainee", {})

    assert counts.get("verified_outcomes", 0) >= 1, "Should have at least 1 verified outcome"
    assert counts.get("verified_training", 0) >= 1, "Should have at least 1 verified training record"
    assert counts.get("verified_skills", 0) >= 1, "Should have at least 1 verified skill"
    assert counts.get("verified_certifications", 0) >= 1, "Should have at least 1 verified certification"
    assert passport_trainee.get("current_role") == "Lead Cloud Infrastructure Specialist"
    assert passport_trainee.get("current_employer") == "Apex Cloud Technologies India Pvt. Ltd."
    assert passport_trainee.get("status") == "placed"
    assert passport_trainee.get("evidence_level") == "employer_confirmed"
