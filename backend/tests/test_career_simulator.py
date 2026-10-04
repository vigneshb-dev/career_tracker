import pytest
from unittest.mock import patch
from app.models.entities import Job

@pytest.fixture(autouse=True)
def ensure_test_jobs():
    from tests.conftest import TestingSessionLocal
    from app.models.entities import Job
    db = TestingSessionLocal()
    try:
        if db.query(Job).count() < 3:
            jobs = [
                Job(
                    id="JOB-TEST-01",
                    title="Junior Data Analyst",
                    employer_name="Apex Cloud Technologies",
                    location="Bengaluru, KA",
                    employment_type="Full-time",
                    salary_range="₹6,00,000 - ₹8,00,000 / yr",
                    required_skills=["Python", "SQL", "Power BI"],
                    status="active",
                    posted_date="2024-09-01",
                    description="Data analyst role requiring Python, SQL, and Power BI."
                ),
                Job(
                    id="JOB-TEST-02",
                    title="BI Dashboard Developer",
                    employer_name="OmniTrade FinTech",
                    location="Mumbai, MH",
                    employment_type="Full-time",
                    salary_range="₹7,50,000 - ₹9,50,000 / yr",
                    required_skills=["Power BI", "SQL", "DAX", "Data Modeling"],
                    status="active",
                    posted_date="2024-09-05",
                    description="BI Developer specializing in Power BI reports."
                ),
                Job(
                    id="JOB-TEST-03",
                    title="Full-Stack Web Engineer",
                    employer_name="Meridian MedTech",
                    location="Hyderabad, TS",
                    employment_type="Full-time",
                    salary_range="₹8,00,000 - ₹11,00,000 / yr",
                    required_skills=["Python", "FastAPI", "React.js", "Docker"],
                    status="active",
                    posted_date="2024-09-10",
                    description="Full-stack developer building healthcare systems."
                ),
            ]
            db.add_all(jobs)
            db.commit()
    finally:
        db.close()


def test_get_simulator_options(client, trainee1_token):
    res = client.get(
        "/api/simulator/options",
        headers={"Authorization": f"Bearer {trainee1_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "available_skills" in data
    assert "target_roles" in data
    assert "locations" in data
    assert "suggested_certifications" in data
    assert "interventions" in data
    assert len(data["suggested_certifications"]) > 0


def test_get_trainee_baseline(client, trainee1_token):
    res = client.get(
        "/api/simulator/trainee/TRN-2024-001/baseline",
        headers={"Authorization": f"Bearer {trainee1_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["trainee_id"] == "TRN-2024-001"
    assert "skills" in data
    assert len(data["skills"]) > 0


def test_trainee_idor_cannot_fetch_other_trainee_baseline(client, trainee1_token):
    res = client.get(
        "/api/simulator/trainee/TRN-2024-002/baseline",
        headers={"Authorization": f"Bearer {trainee1_token}"}
    )
    assert res.status_code == 403


def test_run_what_if_career_simulation_success(client, trainee1_token):
    """
    Test prompt example:
    CURRENT: Python=strong, SQL=strong, Power BI=weak
    SCENARIO: Add Power BI=strong
    Check:
    - newly matched jobs
    - remaining skill gaps
    - changed job-match scores
    - newly eligible career pathways
    - required training/interventions
    - estimated readiness change
    - Explainable labels: SIMULATION, ESTIMATION
    - Mandatory disclaimer: "Simulation based on available profile and job requirement data."
    """
    scenario_payload = {
        "trainee_id": "TRN-2024-001",
        "baseline_skills": [
            {"name": "Python", "level": "strong", "proficiency_score": 4.5, "verified": True},
            {"name": "SQL", "level": "strong", "proficiency_score": 4.5, "verified": True},
            {"name": "Power BI", "level": "weak", "proficiency_score": 2.0, "verified": False}
        ],
        "additional_skills": [
            {"name": "Power BI", "level": "strong", "proficiency_score": 4.5}
        ],
        "certification": "Microsoft Certified: Power BI Data Analyst Associate",
        "target_role": "Data Analyst",
        "scenario_name": "Power BI Upskill Scenario"
    }

    res = client.post(
        "/api/simulator/run",
        json=scenario_payload,
        headers={"Authorization": f"Bearer {trainee1_token}"}
    )
    assert res.status_code == 200
    data = res.json()

    # Verify Output Labels
    assert data["output_label"] == "SIMULATION"
    assert data["estimation_label"] == "ESTIMATION"
    assert data["status"] == "SIMULATION"

    # Verify Mandatory Disclaimer & Guarantee Clause
    assert "Simulation based on available profile and job requirement data." in data["simulation_disclaimer"]
    assert "not guaranteed" in data["guarantee_clause"].lower()

    # Verify Profiles
    assert "current_profile" in data
    assert "simulated_profile" in data
    sim_skills = {s["name"].lower(): s for s in data["simulated_profile"]["skills"]}
    assert "power bi" in sim_skills
    assert sim_skills["power bi"]["proficiency_score"] >= 4.0

    # Verify Skill Changes tracked
    assert len(data["skill_changes"]) >= 1
    pbi_change = next((c for c in data["skill_changes"] if "power bi" in c["skill_name"].lower()), None)
    assert pbi_change is not None
    assert pbi_change["change_type"] in ["UPGRADED", "ADDED"]

    # Verify Changed Job Matches and Newly Matched Jobs
    assert "changed_job_matches" in data
    assert "newly_matched_jobs" in data
    assert isinstance(data["changed_job_matches"], list)

    # Verify Remaining Skill Gaps
    assert "remaining_skill_gaps" in data
    assert isinstance(data["remaining_skill_gaps"], list)

    # Verify Newly Eligible Career Pathways
    assert "newly_eligible_pathways" in data
    assert len(data["newly_eligible_pathways"]) > 0
    pathway = data["newly_eligible_pathways"][0]
    assert "current_readiness" in pathway
    assert "simulated_readiness" in pathway
    assert "readiness_delta" in pathway

    # Verify Required Training / Interventions
    assert "required_training_interventions" in data
    assert len(data["required_training_interventions"]) > 0

    # Verify Estimated Readiness Change (Never salary or probability)
    assert "estimated_readiness" in data
    est = data["estimated_readiness"]
    assert est["output_type"] == "ESTIMATION"
    assert "current_readiness" in est
    assert "simulated_readiness" in est
    assert "readiness_delta" in est
    assert "employment_probability" not in est
    assert "salary_prediction" not in est


def test_career_simulator_insufficient_data_handling(client, admin_token):
    """
    Test that when insufficient historical evidence / job data exists,
    the simulator returns INSUFFICIENT_DATA and transparent explanation.
    """
    with patch("sqlalchemy.orm.Query.all", return_value=[]):
        scenario_payload = {
            "additional_skills": [{"name": "Quantum Computing", "level": "strong"}],
            "target_role": "Quantum Engineer"
        }
        res = client.post(
            "/api/simulator/run",
            json=scenario_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "INSUFFICIENT_DATA"
        assert data["data_sufficiency"]["is_sufficient"] is False
        assert len(data["insufficient_data_reasons"]) > 0
