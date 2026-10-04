import pytest
from app.models.entities import OutcomeRisk, OutcomeRiskStatus, OutcomeRiskSeverity, OutcomeRiskType

def test_scan_outcome_risks_admin(client, admin_token):
    res = client.post(
        "/api/outcome-risks/scan",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "scanned_trainees" in data
    assert "risks_generated" in data
    assert data["risks_generated"] > 0


def test_get_outcome_risks_list_and_explainability(client, admin_token):
    res = client.get(
        "/api/outcome-risks",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    risks = res.json()
    assert len(risks) > 0

    first_risk = risks[0]
    assert "id" in first_risk
    assert "risk_type" in first_risk
    assert "severity" in first_risk
    assert "signals" in first_risk
    assert "evidence" in first_risk
    assert "status" in first_risk
    assert "recommended_intervention" in first_risk

    # Verify Label
    assert first_risk["risk_signal_label"] == "RISK SIGNAL"

    # Verify Transparent Explainability (WHY: Signal 1, Signal 2, Signal 3)
    why = first_risk["why_explanation"]
    assert "signal_1" in why
    assert "signal_2" in why
    assert "signal_3" in why
    assert len(first_risk["signals"]) >= 1


def test_get_outcome_risks_summary(client, admin_token):
    res = client.get(
        "/api/outcome-risks/summary",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    summary = res.json()
    assert "total_risks" in summary
    assert "by_severity" in summary
    assert "by_type" in summary
    assert "by_status" in summary
    assert "critical_trainees_count" in summary
    assert summary["total_risks"] > 0


def test_intervention_loop_full_lifecycle(client, admin_token, trainee1_token):
    """
    Test Complete Intervention Loop:
    Risk
      ↓
    Suggested intervention (status: INTERVENTION_SUGGESTED)
      ↓
    Trainee accepts (status: INTERVENTION_ACCEPTED)
      ↓
    Intervention performed (status: INTERVENTION_IN_PROGRESS -> INTERVENTION_COMPLETED)
      ↓
    Reassessment (submit score 88%)
      ↓
    Risk recalculated (severity -> LOW)
      ↓
    Outcome recorded (status: RESOLVED)
    """
    # 1. Fetch an existing risk for TRN-2024-001 or scan
    client.post("/api/outcome-risks/scan?trainee_id=TRN-2024-001", headers={"Authorization": f"Bearer {admin_token}"})
    res = client.get("/api/outcome-risks?trainee_id=TRN-2024-001", headers={"Authorization": f"Bearer {trainee1_token}"})
    assert res.status_code == 200
    risks = res.json()
    assert len(risks) > 0
    target_risk = risks[0]
    risk_id = target_risk["id"]

    # 2. Trainee Accepts Intervention
    acc_res = client.post(
        f"/api/outcome-risks/{risk_id}/accept",
        json={"reason_or_notes": "Accepted practical remediation lab."},
        headers={"Authorization": f"Bearer {trainee1_token}"}
    )
    assert acc_res.status_code == 200
    assert acc_res.json()["status"] == OutcomeRiskStatus.INTERVENTION_ACCEPTED.value

    # 3. Start Intervention
    start_res = client.post(
        f"/api/outcome-risks/{risk_id}/start",
        headers={"Authorization": f"Bearer {trainee1_token}"}
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == OutcomeRiskStatus.INTERVENTION_IN_PROGRESS.value

    # 4. Complete Intervention
    comp_res = client.post(
        f"/api/outcome-risks/{risk_id}/complete",
        headers={"Authorization": f"Bearer {trainee1_token}"}
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == OutcomeRiskStatus.INTERVENTION_COMPLETED.value

    # 5. Coach Conducts Reassessment
    reassess_payload = {
        "assessment_score": 92.5,
        "evaluator_name": "Sarah Jenkins (Lead Coach)",
        "evaluator_role": "Career Coach",
        "notes": "Trainee demonstrated comprehensive mastery of missing competencies.",
        "verified_evidence_url": "https://skilltrace.org/artifacts/reassessment-trn001.pdf"
    }
    reassess_res = client.post(
        f"/api/outcome-risks/{risk_id}/reassess",
        json=reassess_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert reassess_res.status_code == 200
    updated_data = reassess_res.json()

    # Verify Risk Recalculated and Outcome Recorded
    assert updated_data["status"] == OutcomeRiskStatus.RESOLVED.value
    assert updated_data["severity"] == OutcomeRiskSeverity.LOW.value
    assert "reassessment_record" in updated_data
    rec = updated_data["reassessment_record"]
    assert rec["normalized_score"] == 92.5
    assert rec["outcome_verdict"] == "RISK_RESOLVED"


def test_intervention_loop_rejection(client, trainee1_token):
    """Test Trainee rejecting suggested intervention with reason audit."""
    res = client.get("/api/outcome-risks?trainee_id=TRN-2024-001", headers={"Authorization": f"Bearer {trainee1_token}"})
    risks = res.json()
    if len(risks) > 1:
        target_risk = risks[1]
    else:
        target_risk = risks[0]

    rej_res = client.post(
        f"/api/outcome-risks/{target_risk['id']}/reject",
        json={"reason_or_notes": "Currently focused on active employer certification."},
        headers={"Authorization": f"Bearer {trainee1_token}"}
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == OutcomeRiskStatus.INTERVENTION_REJECTED.value


def test_outcome_risks_idor_protection(client, trainee1_token, trainee2_token, admin_token):
    """Verify Trainee 1 cannot access Trainee 2's outcome risks or accept interventions on them."""
    client.post("/api/outcome-risks/scan?trainee_id=TRN-2024-002", headers={"Authorization": f"Bearer {admin_token}"})
    res_t2 = client.get("/api/outcome-risks?trainee_id=TRN-2024-002", headers={"Authorization": f"Bearer {trainee2_token}"})
    risks_t2 = res_t2.json()
    if not risks_t2:
        pytest.skip("No risks found for TRN-2024-002 to test IDOR")

    risk_id = risks_t2[0]["id"]
    # Trainee 1 attempting to view Trainee 2's risk
    idor_get = client.get(f"/api/outcome-risks/{risk_id}", headers={"Authorization": f"Bearer {trainee1_token}"})
    assert idor_get.status_code == 403

    # Trainee 1 attempting to accept Trainee 2's intervention
    idor_post = client.post(f"/api/outcome-risks/{risk_id}/accept", headers={"Authorization": f"Bearer {trainee1_token}"})
    assert idor_post.status_code == 403
