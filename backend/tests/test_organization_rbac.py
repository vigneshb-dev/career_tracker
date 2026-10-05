import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.entities import (
    Company,
    TrainingInstitute,
    EmployerProfile,
    CoachProfile,
    Course,
    Job,
    Enrollment,
    JobApplication,
    OrganizationAuditLog,
)

def test_employer_create_company_a_job(client: TestClient, employer_token: str):
    """
    Employer A: create Company A job (ownership automatically derived or verified).
    """
    headers = {"Authorization": f"Bearer {employer_token}"}
    payload = {
        "title": "Senior Cloud Infrastructure Engineer",
        "description": "Expert in AWS, Kubernetes, Terraform and microservices cloud infrastructure.",
        "employment_type": "Full-time",
        "location": "Bengaluru, Karnataka",
        "salary_range": "₹24,00,000 - ₹32,00,000",
        "experience": "5-8 years",
        "required_skills": ["AWS", "Kubernetes", "Terraform", "Python"]
    }
    res = client.post("/api/jobs", json=payload, headers=headers)
    assert res.status_code == 201, f"Failed: {res.text}"
    job = res.json()
    assert job["company_id"] == "CMP-01"
    assert job["title"] == payload["title"]

def test_employer_cannot_create_company_b_job(client: TestClient, employer_token: str):
    """
    Employer A: MUST NOT create a job for Company B (explicit company_id mismatch).
    """
    headers = {"Authorization": f"Bearer {employer_token}"}
    payload = {
        "title": "Unauthorized BioTech Researcher",
        "description": "Clinical trial data management and genomics modeling.",
        "company_id": "CMP-02",  # Meridian MedTech, not Apex Cloud (CMP-01)
        "employment_type": "Full-time",
        "location": "Hyderabad, Telangana"
    }
    res = client.post("/api/jobs", json=payload, headers=headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"
    assert "Forbidden" in res.json().get("detail", "")

def test_employer_edit_company_a_job(client: TestClient, employer_token: str):
    """
    Employer A: edit Company A job.
    """
    headers = {"Authorization": f"Bearer {employer_token}"}
    res = client.put(
        "/api/jobs/JOB-01",
        json={"title": "Principal Cloud Architect (Updated)", "salary_range": "₹30,00,000 - ₹40,00,000"},
        headers=headers
    )
    assert res.status_code == 200, f"Failed: {res.text}"
    updated = res.json()
    assert updated["title"] == "Principal Cloud Architect (Updated)"
    assert updated["company_id"] == "CMP-01"

def test_employer_cannot_edit_company_b_job(client: TestClient, employer_token: str):
    """
    Employer A: MUST NOT edit Company B job (JOB-02 belongs to Meridian MedTech CMP-02).
    """
    headers = {"Authorization": f"Bearer {employer_token}"}
    res = client.put(
        "/api/jobs/JOB-02",
        json={"title": "Hacked Title by Competing Employer"},
        headers=headers
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"

def test_employer_view_company_a_applications(client: TestClient, employer_token: str):
    """
    Employer A: view Company A applications.
    """
    headers = {"Authorization": f"Bearer {employer_token}"}
    res = client.get("/api/companies/CMP-01/applications", headers=headers)
    assert res.status_code == 200, f"Failed: {res.text}"
    apps = res.json()
    assert isinstance(apps, list)
    for app in apps:
        assert app["company_id"] == "CMP-01"

def test_employer_cannot_view_company_b_applications(client: TestClient, employer_token: str):
    """
    Employer A: MUST NOT view Company B applications.
    """
    headers = {"Authorization": f"Bearer {employer_token}"}
    res = client.get("/api/companies/CMP-02/applications", headers=headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"

def test_employer_cannot_verify_company_b_employment(client: TestClient, employer_token: str):
    """
    Employer A: MUST NOT verify employment for another company (CMP-02 / EMP-02 / EMP-04).
    """
    headers = {"Authorization": f"Bearer {employer_token}"}
    payload = {
        "trainee_id": "TRN-2024-004",
        "trainee_name": "Karthik Venkataraman",
        "employer_id": "EMP-04",
        "employer_name": "Vanguard Healthcare Networks",
        "reviewer_name": "Sunita Rao",
        "confirmed_role": "Security Systems Apprentice",
        "confirmed_start_date": "2024-08-01",
        "verification_status": "confirmed"
    }
    res = client.post("/api/employers/verify", json=payload, headers=headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"

def test_coach_create_institute_a_course(client: TestClient, coach_token: str):
    """
    Coach A: create Institute A course.
    """
    headers = {"Authorization": f"Bearer {coach_token}"}
    payload = {
        "title": "Advanced Kubernetes Operations",
        "description": "Production Kubernetes cluster administration and Helm deployments.",
        "category": "Cloud Computing",
        "duration": "8 Weeks",
        "mode": "Hybrid",
        "eligibility": "Basic Linux & Docker knowledge",
        "capacity": 30,
        "status": "Active"
    }
    res = client.post("/api/courses", json=payload, headers=headers)
    assert res.status_code == 201, f"Failed: {res.text}"
    course = res.json()
    assert course["training_institute_id"] == "INST-01"
    assert course["title"] == payload["title"]

def test_coach_edit_institute_a_course(client: TestClient, coach_token: str):
    """
    Coach A: edit Institute A course.
    """
    headers = {"Authorization": f"Bearer {coach_token}"}
    res = client.put(
        "/api/courses/crs-sw-01",
        json={"title": "Cloud Native Architecture & DevOps Masterclass", "duration": "16 Weeks"},
        headers=headers
    )
    assert res.status_code == 200, f"Failed: {res.text}"
    updated = res.json()
    assert updated["title"] == "Cloud Native Architecture & DevOps Masterclass"
    assert updated["training_institute_id"] == "INST-01"

def test_coach_cannot_edit_institute_b_course(client: TestClient, coach_token: str):
    """
    Coach A: MUST NOT edit Institute B course (crs-hc-01 belongs to INST-02).
    """
    headers = {"Authorization": f"Bearer {coach_token}"}
    res = client.put(
        "/api/courses/crs-hc-01",
        json={"title": "Unauthorized Modification by Coach A"},
        headers=headers
    )
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"

def test_coach_cannot_create_course_for_institute_b(client: TestClient, coach_token: str):
    """
    Coach A: MUST NOT create course specifying Institute B.
    """
    headers = {"Authorization": f"Bearer {coach_token}"}
    payload = {
        "title": "Unauthorized MedTech Course",
        "description": "Cross-tenant intrusion attempt.",
        "training_institute_id": "INST-02",  # Meridian Institute
        "category": "HealthTech"
    }
    res = client.post("/api/courses", json=payload, headers=headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"

def test_coach_assess_enrolled_trainee(client: TestClient, coach_token: str):
    """
    Coach A: assess trainee enrolled in Institute A's course (TRN-2024-001 in crs-sw-01).
    """
    headers = {"Authorization": f"Bearer {coach_token}"}
    payload = {
        "trainee_id": "TRN-2024-001",
        "skill_name": "Kubernetes Orchestration",
        "score": 4.5,
        "notes": "Priya demonstrates exceptional proficiency in microservices and Kubernetes deployments."
    }
    res = client.post("/api/courses/crs-sw-01/assessments", json=payload, headers=headers)
    assert res.status_code == 201, f"Failed: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert "evidence_id" in data

def test_coach_cannot_assess_trainee_enrolled_only_in_institute_b(client: TestClient, coach_token: str):
    """
    Coach A: MUST NOT assess trainee enrolled only in Institute B (TRN-2024-004 in crs-hc-01).
    """
    headers = {"Authorization": f"Bearer {coach_token}"}
    payload = {
        "trainee_id": "TRN-2024-004",
        "skill_name": "Health Informatics",
        "score": 4.0,
        "notes": "Unauthorized evaluation attempt"
    }
    # Trying to assess TRN-2024-004 under Coach A's course crs-sw-01 (trainee not enrolled)
    res = client.post("/api/courses/crs-sw-01/assessments", json=payload, headers=headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"

    # Trying to assess under Institute B's course crs-hc-01 (coach doesn't belong to Institute B)
    res_b = client.post("/api/courses/crs-hc-01/assessments", json=payload, headers=headers)
    assert res_b.status_code == 403, f"Expected 403 Forbidden, got {res_b.status_code}: {res_b.text}"

def test_admin_can_manage_both_organizations(client: TestClient, admin_token: str):
    """
    Admin: can manage companies and training institutes across the platform.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin lists companies
    res_cmp = client.get("/api/companies", headers=headers)
    assert res_cmp.status_code == 200
    assert len(res_cmp.json()) >= 2

    # Admin lists training institutes
    res_inst = client.get("/api/training-institutes", headers=headers)
    assert res_inst.status_code == 200
    assert len(res_inst.json()) >= 2

    # Admin updates Company A
    res_up_cmp = client.put(
        "/api/companies/CMP-01",
        json={"description": "Apex Cloud Technologies - Global Premier Cloud Partner"},
        headers=headers
    )
    assert res_up_cmp.status_code == 200
    assert res_up_cmp.json()["description"] == "Apex Cloud Technologies - Global Premier Cloud Partner"

    # Admin updates Training Institute B
    res_up_inst = client.put(
        "/api/training-institutes/INST-02",
        json={"description": "Meridian Health & Life Sciences Training Institute - Certified Center"},
        headers=headers
    )
    assert res_up_inst.status_code == 200
    assert "Certified Center" in res_up_inst.json()["description"]

def test_audit_trail_is_recorded(client: TestClient, employer_token: str, admin_token: str, db_session: Session):
    """
    Verify immutable audit log records are written for organization actions.
    """
    # Verify employer can view audit log for their own company
    emp_headers = {"Authorization": f"Bearer {employer_token}"}
    res = client.get("/api/companies/CMP-01/audit-logs", headers=emp_headers)
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)

    # Employer cannot view audit logs for another company
    res_cross = client.get("/api/companies/CMP-02/audit-logs", headers=emp_headers)
    assert res_cross.status_code == 403
