import pytest
from app.services.outcome_cause_intelligence_service import OutcomeCauseIntelligenceService
from app.models.entities import Trainee, TraineeOutcomeReason, PassportEvent, OutcomeState

def test_configurable_outcome_reasons(client, admin_token):
    """Verifies retrieval of configurable outcome reasons across categories."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/outcome-intelligence/reasons", headers=headers)
    assert res.status_code == 200
    reasons = res.json()
    assert len(reasons) >= 15

    categories = {r["category"] for r in reasons}
    assert "NON_PLACEMENT" in categories
    assert "ATTRITION" in categories
    assert "SELF_EMPLOYMENT" in categories


def test_non_placement_and_attrition_intelligence(client, admin_token):
    """
    Verifies non-placement distributions and attrition tenure intelligence.
    Ensures findings are presented as distributions rather than singular failure scores.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Non-placement
    res_np = client.get("/api/outcome-intelligence/non-placement", headers=headers)
    assert res_np.status_code == 200
    data_np = res_np.json()
    assert data_np["sample_size"] > 0
    assert len(data_np["reasons_distribution"]) > 0
    assert any(r["reason_code"] == "SKILL_MISMATCH" for r in data_np["reasons_distribution"])

    # 2. Attrition
    res_att = client.get("/api/outcome-intelligence/attrition", headers=headers)
    assert res_att.status_code == 200
    data_att = res_att.json()
    assert "left_within_6_months_count" in data_att
    assert "left_within_6_months_pct" in data_att
    assert "< 3 months" in data_att["tenure_distribution"]
    assert any(r["reason_code"] == "LOW_SALARY" for r in data_att["reasons_distribution"])


def test_dynamic_follow_up_question_engine(client, trainee1_token, admin_token, db_session):
    """
    Verifies dynamic question generation based on trainee employment status:
    - UNEMPLOYED -> asks about job search, interviews, rejections, location, training
    - EMPLOYED -> asks about retention, role/salary changes, skill usage
    """
    headers = {"Authorization": f"Bearer {trainee1_token}"}

    # 1. Generate for Trainee 1 (currently placed/employed)
    res_gen = client.post(
        "/api/followups/generate",
        json={"trainee_id": "TRN-2024-001"},
        headers=headers
    )
    assert res_gen.status_code == 200
    data_gen = res_gen.json()
    assert data_gen["trainee_id"] == "TRN-2024-001"
    assert len(data_gen["questions"]) >= 4

    question_keys = [q["question_key"] for q in data_gen["questions"]]
    assert "still_employed" in question_keys or "currently_looking" in question_keys


def test_record_follow_up_responses_and_audit(client, trainee1_token, db_session):
    """Verifies that follow-up responses are recorded as structured data with PassportEvent audit."""
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    payload = {
        "trainee_id": "TRN-2024-001",
        "employment_status": "EMPLOYED",
        "responses": [
            {
                "question_key": "still_employed",
                "question_text": "Are you still actively employed?",
                "answer_value": "Yes, actively employed",
                "notes": "Promoted to junior software engineer.",
            },
            {
                "question_key": "using_training_skills",
                "question_text": "Are you applying technical skills?",
                "answer_value": "Daily (direct application)",
                "notes": "Using React and Python daily.",
            },
        ],
    }

    res = client.post("/api/followups/respond", json=payload, headers=headers)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "success"
    assert res_data["responses_saved"] == 2

    # Verify audit event in PassportEvent
    evt = db_session.query(PassportEvent).filter(
        PassportEvent.trainee_id == "TRN-2024-001",
        PassportEvent.event_type == "FOLLOWUP_COMPLETED"
    ).first()
    assert evt is not None


def test_record_outcome_reason(client, admin_token, db_session):
    """Verifies recording structured outcome reasons via POST /api/outcomes/{id}/reason."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "outcome_type": "UNEMPLOYED",
        "reason_category": "NON_PLACEMENT",
        "reason_code": "SKILL_MISMATCH",
        "reason_text": "Needs Docker and Spring Boot certification.",
        "tenure_months": None,
    }

    res = client.post("/api/outcomes/TRN-2024-002/reason", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "record_id" in data

    # Verify persisted in database
    rec = db_session.query(TraineeOutcomeReason).filter(
        TraineeOutcomeReason.trainee_id == "TRN-2024-002",
        TraineeOutcomeReason.reason_code == "SKILL_MISMATCH"
    ).first()
    assert rec is not None


def test_end_to_end_skill_and_outcome_intelligence_flow(client, admin_token, db_session):
    """
    End-to-End Integration Test:
    TRAINING
    -> SKILLS ACQUIRED
    -> JOB REQUIREMENTS
    -> SKILL GAP DETECTION
    -> EMPLOYMENT OUTCOME
    -> NON-PLACEMENT / ATTRITION REASON
    -> AGGREGATED INTELLIGENCE
    -> ACTIONABLE TRAINING/CURRICULUM INSIGHT
    """
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Skill Gap Intelligence for candidate
    res_gap = client.get("/api/skill-intelligence/trainee/TRN-2024-001", headers=headers)
    assert res_gap.status_code == 200
    gap_data = res_gap.json()
    assert len(gap_data["skill_gaps"]) > 0

    # 2. Course-level curriculum intelligence
    res_course = client.get("/api/skill-intelligence/course/crs-sw-01", headers=headers)
    assert res_course.status_code == 200
    course_data = res_course.json()
    assert "training_coverage_rate" in course_data
    assert len(course_data["suggested_curriculum_additions"]) > 0

    # 3. Record outcome reason for a candidate
    reason_payload = {
        "outcome_type": "EMPLOYMENT_LOST",
        "reason_category": "ATTRITION",
        "reason_code": "ROLE_MISMATCH",
        "reason_text": "Production responsibilities did not match curriculum coverage.",
        "tenure_months": 4,
    }
    res_r = client.post("/api/outcomes/TRN-2024-001/reason", json=reason_payload, headers=headers)
    assert res_r.status_code == 200

    # 4. Aggregated Outcome Cause Intelligence Summary
    res_sum = client.get("/api/outcome-intelligence/summary", headers=headers)
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert len(sum_data["top_non_placement_reasons"]) > 0
    assert len(sum_data["top_attrition_reasons"]) > 0
    assert len(sum_data["associations"]) > 0
    assert "stale_employment_records_count" in sum_data["data_quality_signals"]
