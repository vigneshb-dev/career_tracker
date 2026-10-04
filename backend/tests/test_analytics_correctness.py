import pytest

def test_analytics_requires_authentication(client):
    res = client.get("/api/analytics/dashboard")
    assert res.status_code == 401

    res2 = client.get("/api/analytics/comprehensive")
    assert res2.status_code == 401

def test_analytics_calculated_from_real_database_records(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/analytics/comprehensive", headers=headers)
    assert res.status_code == 200
    data = res.json()

    kpis = data["summary_kpis"]
    # Verify no fake artificial minimums
    # Total enrolled should be exactly the count of seeded trainees (7 in seed), NOT fake 1248!
    assert kpis["total_enrolled"] < 100, f"Expected realistic database count, got artificial {kpis['total_enrolled']}"
    assert kpis["total_enrolled"] > 0

    # Placed count must not be artificial 1072
    emp_rate = data["employment_rate"]
    assert emp_rate["overall_rate"] is not None
    assert 0 <= emp_rate["overall_rate"] <= 100

    # Retention curves must be calculated from real follow-ups
    retention = data["retention"]
    assert "milestone_curves" in retention
    for curve in retention["milestone_curves"]:
        # If no audits completed, retention_rate must be None (not fake 96.4%)
        if curve.get("audited_total") == 0:
            assert curve["retention_rate"] is None
            assert curve.get("insufficient_data") is True
            assert "reason" in curve

def test_dashboard_metrics_matches_database(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/analytics/dashboard", headers=headers)
    assert res.status_code == 200
    dash = res.json()

    # Verify real DB counts
    assert dash["totalTrainees"] < 100
    assert dash["traineesPlaced"] <= dash["totalTrainees"]
    assert "statusDistribution" in dash
    # Sum of status distribution must equal total trainees
    status_sum = sum(s["count"] for s in dash["statusDistribution"])
    assert status_sum == dash["totalTrainees"], f"Status distribution sum ({status_sum}) should equal total ({dash['totalTrainees']})"

    # activeJobOpenings must not be hardcoded 142 if DB has different count
    assert isinstance(dash["activeJobOpenings"], int)
    assert dash["activeJobOpenings"] != 142 or dash["activeJobOpenings"] == 0

def test_no_synthetic_minimum_never_uses_max_fake_value(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/analytics/comprehensive", headers=headers)
    data = res.json()
    kpis = data["summary_kpis"]

    # In previous vulnerable code:
    # total_trainees_count = max(len(df_trainees), 1248)
    # placed_trainees_count = max(len(...), 1072)
    # active_employer_partners = len(employers) if employers else 12
    # verified_outcomes_count = max(len(verifications), 3)
    assert kpis["total_enrolled"] != 1248
    assert kpis["active_employer_partners"] != 12 or kpis["active_employer_partners"] <= 10
