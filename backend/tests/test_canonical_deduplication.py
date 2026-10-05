import io
import pytest
from app.core.math_utils import cosine_similarity, vector_cosine_similarity

def test_math_utils_cosine_similarity():
    """Verify canonical math_utils handles vectors and dicts identically and handles edge cases."""
    # Zero vector returns 0.0 without division by zero
    assert cosine_similarity([0, 0, 0], [1, 2, 3]) == 0.0
    assert cosine_similarity([1, 2, 3], [0, 0, 0]) == 0.0
    assert cosine_similarity([], []) == 0.0

    # Identical vectors return 1.0
    assert pytest.approx(cosine_similarity([1.0, 2.0, 3.0], [1.0, 2.0, 3.0])) == 1.0

    # Orthogonal vectors return 0.0
    assert pytest.approx(cosine_similarity([1.0, 0.0], [0.0, 1.0])) == 0.0

    # Dict-based vector cosine similarity
    d1 = {"python": 1.0, "sql": 0.5}
    d2 = {"python": 1.0, "sql": 0.5}
    assert pytest.approx(vector_cosine_similarity(d1, d2)) == 1.0

    # Disjoint dicts
    d3 = {"react": 1.0}
    assert vector_cosine_similarity(d1, d3) == 0.0


def test_resume_endpoints_canonical_and_compatibility(client, admin_token):
    """Verify canonical /resume/analyze and its compatibility aliases behave identically."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    sample_content = b"Priya Sharma. Experienced Python and SQL developer with React experience."
    
    # 1. Canonical endpoint: POST /api/trainees/TRN-2024-001/resume/analyze
    res_canonical = client.post(
        "/api/trainees/TRN-2024-001/resume/analyze",
        headers=headers,
        files={"file": ("test_resume.txt", sample_content, "text/plain")}
    )
    assert res_canonical.status_code == 200
    data_canonical = res_canonical.json()
    assert "extracted_skills" in data_canonical
    assert data_canonical["status"] in ("analyzed", "success")

    # 2. Compatibility alias: POST /api/trainees/TRN-2024-001/resume
    res_alias1 = client.post(
        "/api/trainees/TRN-2024-001/resume",
        headers=headers,
        files={"file": ("test_resume.txt", sample_content, "text/plain")}
    )
    assert res_alias1.status_code == 200
    assert "extracted_skills" in res_alias1.json()

    # 3. Compatibility alias: POST /api/trainees/TRN-2024-001/analyze-resume
    res_alias2 = client.post(
        "/api/trainees/TRN-2024-001/analyze-resume",
        headers=headers,
        files={"file": ("test_resume.txt", sample_content, "text/plain")}
    )
    assert res_alias2.status_code == 200
    assert "extracted_skills" in res_alias2.json()

    # 4. Canonical reanalyze: POST /api/trainees/TRN-2024-001/resume/reanalyze
    res_reanalyze_canon = client.post(
        "/api/trainees/TRN-2024-001/resume/reanalyze",
        headers=headers
    )
    assert res_reanalyze_canon.status_code == 200
    assert "extracted_skills" in res_reanalyze_canon.json()

    # 5. Compatibility alias: POST /api/trainees/TRN-2024-001/reanalyze-resume
    res_reanalyze_alias = client.post(
        "/api/trainees/TRN-2024-001/reanalyze-resume",
        headers=headers
    )
    assert res_reanalyze_alias.status_code == 200
    assert "extracted_skills" in res_reanalyze_alias.json()


def test_resume_endpoints_unauthorized_blocked(client, trainee1_token):
    """Verify unauthorized users (e.g. trainee accessing another trainee's resume analysis) are blocked."""
    # Unauthenticated
    res_unauth = client.post(
        "/api/trainees/TRN-2024-001/resume/analyze",
        files={"file": ("test_resume.txt", b"Test", "text/plain")}
    )
    assert res_unauth.status_code == 401

    # Trainee 1 attempting to analyze Trainee 2's resume
    headers = {"Authorization": f"Bearer {trainee1_token}"}
    res_forbidden = client.post(
        "/api/trainees/TRN-2024-002/resume/analyze",
        headers=headers,
        files={"file": ("test_resume.txt", b"Test", "text/plain")}
    )
    assert res_forbidden.status_code == 403


def test_follow_up_routes_canonical_and_compatibility(client, coach_token):
    """Verify canonical /follow-ups/generate and compatibility alias /followups/generate."""
    headers = {"Authorization": f"Bearer {coach_token}"}

    # 1. Canonical endpoint: POST /api/follow-ups/generate
    res_canon = client.post(
        "/api/follow-ups/generate?trainee_id=TRN-2024-001&employment_status=employed",
        headers=headers
    )
    assert res_canon.status_code == 200
    data_canon = res_canon.json()
    assert "questions" in data_canon

    # 2. Compatibility alias: POST /api/followups/generate
    res_alias = client.post(
        "/api/followups/generate?trainee_id=TRN-2024-001&employment_status=employed",
        headers=headers
    )
    assert res_alias.status_code == 200
    assert "questions" in res_alias.json()
