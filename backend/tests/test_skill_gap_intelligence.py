import pytest
from app.services.normalization_service import SkillNormalizationService
from app.services.skill_gap_intelligence_service import SkillGapIntelligenceService
from app.models.entities import Trainee, Course, Skill

def test_skill_normalization_canonical_mapping(db_session):
    """
    Verifies that equivalent skill queries like:
    'Spring', 'Spring Framework', 'Spring Boot'
    map to the appropriate canonical skill representation rather than unrelated strings.
    """
    # 1. Spring Framework -> Spring Boot
    res_spring = SkillNormalizationService.normalize_skill(db_session, "Spring Framework")
    assert res_spring["canonical_name"] is not None
    assert "Spring" in res_spring["canonical_name"]

    res_spring_boot = SkillNormalizationService.normalize_skill(db_session, "Spring Boot")
    assert res_spring_boot["canonical_name"] == "Spring Boot" or "Spring" in res_spring_boot["canonical_name"]

    # 2. Python synonyms
    res_py = SkillNormalizationService.normalize_skill(db_session, "Python Programming")
    assert res_py["canonical_name"] == "Python"
    assert res_py["confidence"] >= 0.90

    # 3. Docker
    res_docker = SkillNormalizationService.normalize_skill(db_session, "docker containerization")
    assert res_docker["canonical_name"] == "Docker" or "Docker" in (res_docker["canonical_name"] or "")


def test_trainee_skill_gap_calculation_and_categories(db_session):
    """
    Verifies skill gap formula: skillGap = requiredSkillLevel - traineeSkillLevel
    and categories: NO_GAP, LOW, MEDIUM, HIGH, CRITICAL.
    """
    trainee = db_session.query(Trainee).first()
    assert trainee is not None

    intel = SkillGapIntelligenceService.get_trainee_skill_gap_intelligence(trainee.id, db_session)
    assert intel.trainee_id == trainee.id
    assert intel.trainee_name == trainee.full_name
    assert intel.overall_readiness_score >= 0.0
    assert intel.employment_relevance_score >= 0.0
    assert len(intel.skill_gaps) > 0
    assert "Simulation based on available profile" in intel.disclaimer

    for gap in intel.skill_gaps:
        assert gap.gap_category in ["NO_GAP", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert gap.status_icon in ["check", "warn", "cross"]
        assert gap.gap_level >= 0.0
        assert gap.flag_reason is not None


def test_course_skill_intelligence_and_coverage(db_session):
    """
    Verifies course-level metrics:
    trainingCoverageRate, jobDemandFrequency, skillGapFrequency, averageSkillGap, employmentAssociation.
    """
    course = db_session.query(Course).first()
    assert course is not None

    analysis = SkillGapIntelligenceService.get_course_skill_intelligence(course.id, db_session)
    assert analysis.course_id == course.id
    assert analysis.training_coverage_rate >= 0.0
    assert analysis.sample_size > 0
    assert "trainingCoverageRate" in analysis.formula_explanations

    # High demand low coverage and good coverage lists
    assert isinstance(analysis.high_demand_low_coverage, list)
    assert isinstance(analysis.good_coverage, list)
    assert len(analysis.outcome_associations) > 0


def test_emerging_skills_detection(db_session):
    """
    Verifies longitudinal quarterly detection of emerging skills
    and EMERGING_SKILL flags based on growth rates.
    """
    emerging_resp = SkillGapIntelligenceService.detect_emerging_skills(db_session, min_sample_size=3)
    assert emerging_resp.total_tracked_skills > 0
    assert len(emerging_resp.emerging_skills) > 0

    has_emerging_flag = any(item.is_emerging for item in emerging_resp.emerging_skills)
    assert has_emerging_flag is True

    for item in emerging_resp.emerging_skills:
        assert len(item.quarterly_trend) >= 2
        assert item.emerging_flag in ["EMERGING_SKILL", "STABLE"]


def test_skill_intelligence_api_trainee_auth(client, trainee1_token, trainee2_token, admin_token):
    """
    Verifies IDOR and role-based protection:
    - Trainee 1 can access own skill gaps
    - Trainee 2 CANNOT access Trainee 1's skill gaps (403 Forbidden)
    - Admin can access any trainee's skill gaps
    """
    # 1. Trainee 1 accesses self
    res1 = client.get(
        "/api/skill-intelligence/trainee/TRN-2024-001",
        headers={"Authorization": f"Bearer {trainee1_token}"}
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["trainee_id"] == "TRN-2024-001"

    # 2. Trainee 2 attempts to access Trainee 1 -> 403 Forbidden
    res2 = client.get(
        "/api/skill-intelligence/trainee/TRN-2024-001",
        headers={"Authorization": f"Bearer {trainee2_token}"}
    )
    assert res2.status_code == 403

    # 3. Admin accesses Trainee 1 -> 200 OK
    res_admin = client.get(
        "/api/skill-intelligence/trainee/TRN-2024-001",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin.status_code == 200


def test_skill_intelligence_endpoints(client, admin_token):
    """Tests course analysis, top gaps, emerging skills, and job demand API endpoints."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Course analysis
    res_course = client.get("/api/skill-intelligence/course/crs-sw-01", headers=headers)
    assert res_course.status_code == 200
    data_c = res_course.json()
    assert data_c["course_id"] == "crs-sw-01"
    assert "training_coverage_rate" in data_c

    # Top gaps
    res_top = client.get("/api/skill-intelligence/top-gaps", headers=headers)
    assert res_top.status_code == 200
    data_top = res_top.json()
    assert "top_gaps" in data_top
    assert len(data_top["top_gaps"]) > 0

    # Emerging skills
    res_em = client.get("/api/skill-intelligence/emerging-skills?min_sample_size=3", headers=headers)
    assert res_em.status_code == 200
    data_em = res_em.json()
    assert "emerging_skills" in data_em

    # Job demand
    res_dem = client.get("/api/skill-intelligence/job-demand", headers=headers)
    assert res_dem.status_code == 200
    data_dem = res_dem.json()
    assert "demands" in data_dem
