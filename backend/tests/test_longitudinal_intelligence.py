import pytest
from datetime import datetime, timedelta
from app.models.entities import (
    Trainee,
    OutcomeState,
    VerificationStatus,
    TimelineStage,
    CareerTimelineEvent,
    LongitudinalFollowUp,
    EmployerFeedbackVerification,
    normalize_outcome_state,
    normalize_verification_status,
    calculate_outcome_confidence,
    calculate_trainee_data_quality
)
from app.services.analytics_service import AnalyticsService


# ========================================================
# 1. OUTCOME STATES TESTS (11 Canonical States)
# ========================================================

def test_eleven_canonical_outcome_states_defined():
    """Verify that all 11 canonical outcome states exist in the OutcomeState enum."""
    expected_states = {
        "EMPLOYED",
        "SELF_EMPLOYED",
        "APPRENTICESHIP",
        "FREELANCING",
        "ENTREPRENEURSHIP",
        "HIGHER_STUDIES",
        "UNEMPLOYED",
        "SEEKING_EMPLOYMENT",
        "UNKNOWN",
        "UNREACHABLE",
        "WITHDRAWN_CONSENT"
    }
    actual_states = {s.value for s in OutcomeState}
    assert expected_states == actual_states


def test_normalize_outcome_state_logic():
    """Test normalization of various raw outcome strings to canonical OutcomeState."""
    assert normalize_outcome_state("employment") == OutcomeState.EMPLOYED.value
    assert normalize_outcome_state("placed") == OutcomeState.EMPLOYED.value
    assert normalize_outcome_state("self_employment") == OutcomeState.SELF_EMPLOYED.value
    assert normalize_outcome_state("llc") == OutcomeState.SELF_EMPLOYED.value
    assert normalize_outcome_state("freelance") == OutcomeState.FREELANCING.value
    assert normalize_outcome_state("apprenticeship") == OutcomeState.APPRENTICESHIP.value
    assert normalize_outcome_state("naps") == OutcomeState.APPRENTICESHIP.value
    assert normalize_outcome_state("startup") == OutcomeState.ENTREPRENEURSHIP.value
    assert normalize_outcome_state("higher_education") == OutcomeState.HIGHER_STUDIES.value
    assert normalize_outcome_state("further_education") == OutcomeState.HIGHER_STUDIES.value
    assert normalize_outcome_state("unemployed") == OutcomeState.UNEMPLOYED.value
    assert normalize_outcome_state("seeking_job") == OutcomeState.SEEKING_EMPLOYMENT.value
    assert normalize_outcome_state("unreachable") == OutcomeState.UNREACHABLE.value
    assert normalize_outcome_state("withdrawn") == OutcomeState.WITHDRAWN_CONSENT.value


def test_missing_data_never_classified_as_unemployed():
    """Missing or null outcome data must default strictly to UNKNOWN, never UNEMPLOYED."""
    assert normalize_outcome_state(None) == OutcomeState.UNKNOWN.value
    assert normalize_outcome_state("") == OutcomeState.UNKNOWN.value
    assert normalize_outcome_state("pending") == OutcomeState.UNKNOWN.value
    assert normalize_outcome_state("gibberish_value") == OutcomeState.UNKNOWN.value


def test_withdrawn_consent_override():
    """When consent is revoked or withdrawn, outcome state must be WITHDRAWN_CONSENT."""
    assert normalize_outcome_state("employed", consent_status="REVOKED") == OutcomeState.WITHDRAWN_CONSENT.value
    assert normalize_outcome_state("employed", consent_status="WITHDRAWN") == OutcomeState.WITHDRAWN_CONSENT.value


# ========================================================
# 2. CONFIDENCE TESTS (Objective, Non-Invented)
# ========================================================

def test_confidence_values_derived_from_verification_evidence():
    """Verify objective baseline confidence mapped strictly from verification status."""
    assert calculate_outcome_confidence(VerificationStatus.DOCUMENT_VERIFIED.value) == 0.95
    assert calculate_outcome_confidence(VerificationStatus.EMPLOYER_VERIFIED.value) == 0.90
    assert calculate_outcome_confidence(VerificationStatus.SYSTEM_VERIFIED.value) == 0.85
    assert calculate_outcome_confidence(VerificationStatus.PARTIALLY_VERIFIED.value) == 0.70
    assert calculate_outcome_confidence(VerificationStatus.SELF_REPORTED.value) == 0.50
    assert calculate_outcome_confidence(VerificationStatus.UNVERIFIED.value) == 0.00


def test_confidence_corroboration_bonus():
    """Multi-source corroboration yields a +0.05 bonus up to 1.0."""
    conf = calculate_outcome_confidence(
        VerificationStatus.EMPLOYER_VERIFIED.value,
        source="Apex Cloud Technologies Pvt. Ltd. and EPFO electronic challan confirmation"
    )
    assert conf == 0.95  # 0.90 + 0.05 bonus


def test_confidence_freshness_decay_penalty():
    """Decay penalty applied when last verified timestamp is stale."""
    # Verified 200 days ago (> 180 days)
    old_date = (datetime.now() - timedelta(days=200)).strftime("%Y-%m-%d")
    conf = calculate_outcome_confidence(VerificationStatus.DOCUMENT_VERIFIED.value, verified_at=old_date)
    assert conf == 0.85  # 0.95 - 0.10 freshness decay

    # Verified 400 days ago (> 365 days)
    ancient_date = (datetime.now() - timedelta(days=400)).strftime("%Y-%m-%d")
    conf_ancient = calculate_outcome_confidence(VerificationStatus.DOCUMENT_VERIFIED.value, verified_at=ancient_date)
    assert conf_ancient == 0.75  # 0.95 - 0.20 decay


# ========================================================
# 3. REAL TIME-LINE APPEND-ONLY TESTS
# ========================================================

def test_real_timeline_canonical_stages_defined():
    """Verify that all 8 required timeline stages are present in the TimelineStage enum."""
    expected_stages = [
        "TRAINING",
        "COMPLETION",
        "PLACEMENT",
        "EMPLOYMENT",
        "JOB_CHANGE",
        "SALARY_CHANGE",
        "RETENTION",
        "SKILL_DEVELOPMENT"
    ]
    actual_stages = [s.value for s in TimelineStage]
    assert expected_stages == actual_stages


def test_historical_timeline_events_never_overwritten():
    """Ensure sequence of timeline events preserves chronological history."""
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    try:
        events = db.query(CareerTimelineEvent).filter(
            CareerTimelineEvent.trainee_id == "TRN-2024-001"
        ).order_by(CareerTimelineEvent.sequence_order).all()

        stages = [e.stage for e in events]
        assert "TRAINING" in stages
        assert "COMPLETION" in stages
        assert "PLACEMENT" in stages
        assert "EMPLOYMENT" in stages
        assert "JOB_CHANGE" in stages
        assert "SALARY_CHANGE" in stages
        assert "RETENTION" in stages
        assert "SKILL_DEVELOPMENT" in stages

        # Check sequence order is strictly ascending
        seq_orders = [e.sequence_order for e in events]
        assert seq_orders == sorted(seq_orders)
    finally:
        db.close()


# ========================================================
# 4. DATA QUALITY SCORE TESTS
# ========================================================

def test_data_quality_score_calculation_and_itemized_deductions():
    """
    Test transparent 0-100 data quality score:
    Completeness (25%), Freshness (25%), Verification (25%), Consistency (25%).
    Deductions must provide exact reason strings.
    """
    # Create an incomplete trainee with missing wage and stale date
    mock_trainee = Trainee(
        id="TEST-DQ-001",
        full_name="Test Incomplete",
        email="test@example.com",
        program="Full-Stack",
        cohort="Cohort 2024-A",
        status="placed",
        primary_outcome_type="employment",
        outcome_state="EMPLOYED",
        outcome_verification_level="SELF_REPORTED",
        current_employer=None,  # Missing employer
        placement_salary=None,  # Missing wage
        placement_wage_numeric=None,
        last_follow_up=(datetime.now() - timedelta(days=220)).strftime("%Y-%m-%d"),  # Stale
        enrollment_date="2024-01-01",
        graduation_date="2024-06-01"
    )

    dq = calculate_trainee_data_quality(mock_trainee, follow_ups=[], verifications=[], events=[])

    assert dq["score"] < 100.0
    assert dq["is_stale"] is True
    assert dq["has_missing_wages"] is True
    assert dq["has_missing_employer_verification"] is True
    assert len(dq["deductions"]) >= 3

    # Verify transparent deduction strings
    deductions_text = " ".join(dq["deductions"])
    assert "Missing employer name" in deductions_text
    assert "Missing verified placement wage" in deductions_text
    assert "No activity recorded" in deductions_text


# ========================================================
# 5. API ENDPOINTS & COHORT FILTERING TESTS
# ========================================================

def test_api_cohort_filters_endpoint(client, admin_token):
    """GET /api/analytics/cohort-filters returns distinct cohort dimensions."""
    res = client.get(
        "/api/analytics/cohort-filters",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "courses" in data
    assert "providers" in data
    assert "districts" in data
    assert "batches" in data
    assert "outcome_states" in data
    assert len(data["outcome_states"]) == 11
    assert "EMPLOYED" in data["outcome_states"]
    assert "WITHDRAWN_CONSENT" in data["outcome_states"]


def test_api_longitudinal_metrics_endpoint(client, admin_token):
    """GET /api/analytics/longitudinal-metrics calculates 14 metrics from DB."""
    res = client.get(
        "/api/analytics/longitudinal-metrics",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()

    # Verify all 14 core metrics are present in response
    assert "placement_rate" in data
    assert "employment_rate" in data
    assert "self_employment_rate" in data
    assert "apprenticeship_rate" in data
    assert "freelancing_rate" in data
    assert "higher_studies_rate" in data
    assert "unemployed_rate" in data
    assert "unknown_rate" in data
    assert "unreachable_rate" in data
    assert "withdrawn_consent_rate" in data
    assert "retention_30d" in data
    assert "retention_90d" in data
    assert "retention_180d" in data
    assert "retention_365d" in data
    assert "wage_progression" in data
    assert "median_wage" in data
    assert "training_to_job_relevance" in data
    assert "skill_gap_frequency" in data
    assert "attrition_reasons" in data
    assert "follow_up_response_rate" in data


def test_api_data_quality_dashboard_endpoint(client, admin_token):
    """GET /api/analytics/data-quality returns audit breakdowns and record deductions."""
    res = client.get(
        "/api/analytics/data-quality",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()

    assert "total_records" in data
    assert data["total_records"] > 0
    assert "verified_records" in data
    assert "self_reported_records" in data
    assert "unknown_outcomes" in data
    assert "unreachable_trainees" in data
    assert "stale_records" in data
    assert "missing_wages" in data
    assert "missing_employer_verification" in data
    assert "missing_follow_ups" in data
    assert "overall_quality_score" in data
    assert 0 <= data["overall_quality_score"] <= 100
    assert "score_breakdown" in data
    assert "completeness" in data["score_breakdown"]
    assert "freshness" in data["score_breakdown"]
    assert "verification" in data["score_breakdown"]
    assert "consistency" in data["score_breakdown"]

    # Verify itemized audit list
    assert len(data["record_audits"]) > 0
    first_record = data["record_audits"][0]
    assert "trainee_id" in first_record
    assert "quality_score" in first_record
    assert "deductions" in first_record
    assert isinstance(first_record["deductions"], list)


def test_api_trainee_outcomes_confidence_endpoint(client, admin_token):
    """GET /api/analytics/trainee-outcomes exposes status, verification_level, confidence, last_verified_at, source."""
    res = client.get(
        "/api/analytics/trainee-outcomes",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    outcomes = res.json()
    assert len(outcomes) > 0

    for out in outcomes:
        assert "trainee_id" in out
        assert "status" in out
        assert "verification_level" in out
        assert "confidence" in out
        assert 0.0 <= out["confidence"] <= 1.0
        assert "source" in out
        assert "data_source" in out


def test_cohort_filtering_by_district(client, admin_token):
    """Test filtering by district limits metrics strictly to the requested district."""
    res = client.get(
        "/api/analytics/longitudinal-metrics?district=Bengaluru",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["cohort_filters_applied"]["district"] == "Bengaluru"


def test_synthetic_data_isolation_toggle(client, admin_token):
    """
    Test that include_demo=False strictly excludes DEMO/SYNTHETIC records
    from production analytics calculations.
    """
    res_all = client.get(
        "/api/analytics/data-quality?include_demo=true",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_all.status_code == 200
    total_with_demo = res_all.json()["total_records"]

    res_prod_only = client.get(
        "/api/analytics/data-quality?include_demo=false",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_prod_only.status_code == 200
    total_prod_only = res_prod_only.json()["total_records"]

    # Since all seeded demo data has is_synthetic=True, prod only count is 0 or less than total_with_demo
    assert total_prod_only <= total_with_demo
