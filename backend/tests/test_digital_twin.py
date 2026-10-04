import pytest
from datetime import datetime, timedelta, date
from app.models.entities import (
    Trainee,
    DigitalTwinState,
    OutcomeState,
    VerificationStatus,
    TimelineStage,
    UncertaintyState,
    RiskState,
    CareerTimelineEvent,
    LongitudinalFollowUp,
    EmployerFeedbackVerification,
    TraineeSkill
)
from app.services.digital_twin_service import DigitalTwinService


# ========================================================
# 1. State Generation & Model Tests
# ========================================================

def test_digital_twin_state_generation():
    """Digital Twin combines trainee, skills, outcome, and verification records."""
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        twin = DigitalTwinService.get_or_compute_twin(db, "TRN-2024-001", force_refresh=True)
        assert twin is not None
        assert twin.trainee_id == "TRN-2024-001"
        assert twin.current_outcome == OutcomeState.EMPLOYED.value
        assert twin.current_employer is not None
        assert twin.employment_status == "FULL_TIME"
        assert twin.confidence >= 0.75
        assert twin.data_quality >= 60.0
        assert twin.skill_readiness > 0.0
        assert twin.job_readiness > 0.0
    finally:
        db.close()


def test_timeline_consistency_and_preservation():
    """Visual timeline preserves all canonical career progression stages."""
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        twin = DigitalTwinService.get_or_compute_twin(db, "TRN-2024-001")
        events = db.query(CareerTimelineEvent).filter(
            CareerTimelineEvent.trainee_id == "TRN-2024-001"
        ).order_by(CareerTimelineEvent.sequence_order).all()

        stages = [e.stage for e in events]
        assert "TRAINING" in stages
        assert "COMPLETION" in stages
        assert "PLACEMENT" in stages
        assert "EMPLOYMENT" in stages
        assert "RETENTION" in stages

        # Check sequence order is monotonically ascending
        seq_orders = [e.sequence_order for e in events]
        assert seq_orders == sorted(seq_orders)
    finally:
        db.close()


def test_verification_state_mapping():
    """Uncertainty state correctly reflects evidence levels (VERIFIED, SELF_REPORTED, KNOWN)."""
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        # TRN-2024-001 has EMPLOYER_VERIFIED -> should be VERIFIED
        twin1 = DigitalTwinService.get_or_compute_twin(db, "TRN-2024-001", force_refresh=True)
        assert twin1.uncertainty_state == UncertaintyState.VERIFIED.value

        # TRN-2024-007 has SELF_REPORTED -> should be SELF_REPORTED
        twin7 = DigitalTwinService.get_or_compute_twin(db, "TRN-2024-007", force_refresh=True)
        assert twin7.uncertainty_state == UncertaintyState.SELF_REPORTED.value
    finally:
        db.close()


def test_stale_data_detection():
    """Records inactive for >180 days without recent verification trigger STALE uncertainty."""
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        # Create a stale trainee
        old_date = (datetime.now() - timedelta(days=220)).strftime("%Y-%m-%d")
        stale_t = Trainee(
            id="TRN-TEST-STALE-001",
            full_name="Stale Trainee Test",
            email="stale.test@example.com",
            program="Cloud Infrastructure",
            cohort="Cohort 2023-C",
            status="placed",
            primary_outcome_type="employment",
            outcome_state="EMPLOYED",
            outcome_verification_level="EMPLOYER_VERIFIED",
            outcome_last_verified_at=old_date,
            last_follow_up=old_date,
            enrollment_date="2023-01-01",
            graduation_date="2023-06-01",
            current_employer="Legacy Systems Ltd",
            placement_salary="₹6,00,000 / yr",
            placement_wage_numeric=600000.0,
            is_synthetic=True
        )
        db.add(stale_t)
        db.commit()

        twin_stale = DigitalTwinService.get_or_compute_twin(db, "TRN-TEST-STALE-001", force_refresh=True)
        assert twin_stale.uncertainty_state == UncertaintyState.STALE.value
        assert twin_stale.risk_state in [RiskState.HIGH.value, RiskState.MODERATE.value]
        assert any("Stale Record" in r for r in twin_stale.risk_factors)
    finally:
        # Cleanup
        db.query(DigitalTwinState).filter(DigitalTwinState.trainee_id == "TRN-TEST-STALE-001").delete()
        db.query(Trainee).filter(Trainee.id == "TRN-TEST-STALE-001").delete()
        db.commit()
        db.close()


def test_unknown_outcome_never_assumed_unemployed():
    """Unreported outcome maps to UNKNOWN outcome and UNKNOWN uncertainty (never UNEMPLOYED)."""
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        # TRN-2024-009 is UNKNOWN
        twin9 = DigitalTwinService.get_or_compute_twin(db, "TRN-2024-009", force_refresh=True)
        assert twin9.current_outcome == OutcomeState.UNKNOWN.value
        assert twin9.current_outcome != OutcomeState.UNEMPLOYED.value
        assert twin9.uncertainty_state == UncertaintyState.UNKNOWN.value
    finally:
        db.close()


def test_consent_withdrawal_override():
    """Consent withdrawal overrides outcome to WITHDRAWN_CONSENT with CRITICAL risk."""
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        # TRN-2024-011 has WITHDRAWN consent
        twin11 = DigitalTwinService.get_or_compute_twin(db, "TRN-2024-011", force_refresh=True)
        assert twin11.current_outcome == OutcomeState.WITHDRAWN_CONSENT.value
        assert twin11.risk_state == RiskState.CRITICAL.value
        assert twin11.uncertainty_state == UncertaintyState.UNKNOWN.value
        assert any("Consent Withdrawn" in f for f in twin11.risk_factors)
    finally:
        db.close()


def test_evidence_traceability_structure():
    """Every important attribute exposes: 'Why does the system believe this?'."""
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        twin = DigitalTwinService.get_or_compute_twin(db, "TRN-2024-001")
        evidence_items = twin.evidence_traceability
        assert len(evidence_items) >= 4

        attributes = [item["attribute"] for item in evidence_items]
        assert "Current Employment State" in attributes
        assert "Current Organization / Employer" in attributes
        assert "Current Annual Compensation" in attributes

        for item in evidence_items:
            assert "source" in item
            assert "confidence" in item
            assert "explanation" in item
            assert len(item["explanation"]) > 10
    finally:
        db.close()


def test_skill_evolution_four_canonical_stages():
    """Skill evolution exposes 4 distinct progression stages."""
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        twin = DigitalTwinService.get_or_compute_twin(db, "TRN-2024-001")
        stages = twin.skill_evolution
        assert len(stages) == 4

        stage_ids = [s["stage_id"] for s in stages]
        assert "TRAINING_COMPLETION" in stage_ids
        assert "INTERVENTION" in stage_ids
        assert "REASSESSMENT" in stage_ids
        assert "TARGET_JOB" in stage_ids
    finally:
        db.close()


def test_outcome_evolution_month_by_month_journey():
    """Outcome evolution creates chronological milestones from Month 0 to Month 12+."""
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        twin = DigitalTwinService.get_or_compute_twin(db, "TRN-2024-001")
        journey = twin.outcome_evolution
        assert len(journey) >= 3

        months = [j["month"] for j in journey]
        assert 0 in months  # Month 0: Training Completion
        assert 4 in months or 2 in months  # Employment or search
    finally:
        db.close()


# ========================================================
# 2. API Endpoints & Authorization Tests
# ========================================================

def test_api_get_digital_twin(client, admin_token):
    """GET /api/digital-twin/{trainee_id} returns complete digital twin state."""
    res = client.get(
        "/api/digital-twin/TRN-2024-001",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["trainee_id"] == "TRN-2024-001"
    assert data["current_outcome"] == "EMPLOYED"
    assert "skill_dna" in data
    assert "evidence_traceability" in data
    assert "risk_state" in data


def test_api_get_digital_twin_timeline(client, admin_token):
    """GET /api/digital-twin/{trainee_id}/timeline returns visual timeline events."""
    res = client.get(
        "/api/digital-twin/TRN-2024-001/timeline",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["trainee_id"] == "TRN-2024-001"
    assert data["total_events"] > 0
    assert len(data["timeline_events"]) > 0


def test_api_get_digital_twin_skill_evolution(client, admin_token):
    """GET /api/digital-twin/{trainee_id}/skill-evolution returns 4 stages."""
    res = client.get(
        "/api/digital-twin/TRN-2024-001/skill-evolution",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data["stages"]) == 4


def test_api_get_digital_twin_evidence(client, admin_token):
    """GET /api/digital-twin/{trainee_id}/evidence returns explainable evidence."""
    res = client.get(
        "/api/digital-twin/TRN-2024-001/evidence",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 4
    assert all("explanation" in it for it in items)


def test_api_get_digital_twin_data_quality(client, admin_token):
    """GET /api/digital-twin/{trainee_id}/data-quality returns 0-100 score."""
    res = client.get(
        "/api/digital-twin/TRN-2024-001/data-quality",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    dq = res.json()
    assert dq["quality_score"] >= 60.0
    assert "completeness" in dq
    assert "freshness" in dq
    assert "verification" in dq
    assert "consistency" in dq


def test_api_refresh_digital_twin(client, admin_token):
    """POST /api/digital-twin/{trainee_id}/refresh forces recomputation."""
    res = client.post(
        "/api/digital-twin/TRN-2024-001/refresh",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["trainee_id"] == "TRN-2024-001"


def test_trainee_cannot_view_other_trainee_digital_twin_idor(client, trainee1_token):
    """IDOR Protection: Trainee 1 cannot access Trainee 2's digital twin."""
    res = client.get(
        "/api/digital-twin/TRN-2024-002",
        headers={"Authorization": f"Bearer {trainee1_token}"}
    )
    assert res.status_code == 403
    assert "Access denied" in res.text or "access denied" in res.text.lower() or "Forbidden" in res.text or "authorized" in res.text.lower()
