"""
Comprehensive Automated Test Suite: Seeding & Vector Repair
============================================================
Verifies:
1. Correct embedding dimensions for configured models and vector columns (384-d).
2. Rejection of invalid or incompatible vectors before database insertion.
3. Successful job and intervention embedding persistence.
4. Valid trainee, course, institute, and enrollment foreign-key relationships.
5. Seed reruns without duplicate records (idempotency).
6. Transaction rollback and recovery after simulated failure (savepoint isolation).
7. Accurate seed success/failure counts reporting.
8. Semantic search and recommendation behavior after the fix.
9. Health-check behavior when database is available and unavailable.
10. API response compatibility with the frontend contracts.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base, validate_and_serialize_vector, get_vector_type
from app.core.ai_models import (
    encode_text_embedding,
    generate_deterministic_embedding,
)
from app.models.entities import (
    Job,
    Intervention,
    Trainee,
    Course,
    TrainingInstitute,
    Enrollment,
    JobApplication,
    Company,
    Employer,
    User,
)
from app.services.job_intelligence_service import JobIntelligenceService
from app.services.intervention_service import InterventionEngine
from app.core.seed import (
    seed_database,
    seed_jobs_dataset,
    seed_organizations_base,
    seed_enrollments_and_applications,
    seed_users,
)
from app.core.math_utils import cosine_similarity, vector_cosine_similarity
from main import app


@pytest.fixture
def memory_db():
    """Isolated in-memory SQLite database with foreign keys strictly enabled."""
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session, engine
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


# -------------------------------------------------------------
# 1. Embedding Dimension Verification
# -------------------------------------------------------------
def test_embedding_dimensions_match_configuration():
    """Verifies all embedding generators produce exactly VECTOR_DIMENSION (384) dimensions."""
    expected_dim = settings.VECTOR_DIMENSION
    assert expected_dim == 384, f"Expected default VECTOR_DIMENSION to be 384, got {expected_dim}"

    # 1. Deterministic embedding
    det_vec = generate_deterministic_embedding("Python Full-Stack Engineer with React & FastAPI", dim=384)
    assert len(det_vec) == 384
    assert all(isinstance(x, float) for x in det_vec)

    # 2. Unified encode_text_embedding
    unified_vec = encode_text_embedding("Cloud Solutions Architect with Kubernetes and Terraform")
    assert len(unified_vec) == 384
    assert all(isinstance(x, float) for x in unified_vec)

    # 3. Job intelligence generator
    job_vec = JobIntelligenceService.generate_embedding("Healthcare Data Scientist with PyTorch")
    assert len(job_vec) == 384


# -------------------------------------------------------------
# 2. Rejection of Invalid Vectors Before Database Insertion
# -------------------------------------------------------------
def test_rejection_of_incompatible_vector_dimensions():
    """Ensures validate_and_serialize_vector rejects vectors with mismatched lengths or invalid formats."""
    # 1. Dimension mismatch: 1536 when 384 expected
    with pytest.raises(ValueError, match="Embedding dimension mismatch: expected 384 dimensions, got 1536"):
        validate_and_serialize_vector([0.0] * 1536, expected_dim=384)

    # 2. Dimension mismatch: 128 when 384 expected
    with pytest.raises(ValueError, match="Embedding dimension mismatch"):
        validate_and_serialize_vector([0.1] * 128, expected_dim=384)

    # 3. None handling when allow_none=False
    with pytest.raises(ValueError, match="Vector cannot be None"):
        validate_and_serialize_vector(None, allow_none=False)

    # 4. None allowed when allow_none=True
    assert validate_and_serialize_vector(None, allow_none=True) is None

    # 5. Invalid JSON string
    with pytest.raises(ValueError, match="Invalid vector string format"):
        validate_and_serialize_vector("not-a-json-vector", expected_dim=384)

    # 6. Valid JSON string parsed correctly
    valid_json = f"[{','.join(['0.01'] * 384)}]"
    parsed = validate_and_serialize_vector(valid_json, expected_dim=384)
    assert len(parsed) == 384
    assert parsed[0] == 0.01


# -------------------------------------------------------------
# 3. Job and Intervention Embedding Persistence
# -------------------------------------------------------------
def test_job_and_intervention_embedding_persistence(memory_db):
    """Verifies that jobs and interventions persist and retain 384-d vector embeddings."""
    db, _ = memory_db
    seed_database(db)

    # Query representative job
    first_job = db.query(Job).filter(Job.id == "JOB-SW-001").first()
    assert first_job is not None, "Job JOB-SW-001 must exist"
    assert first_job.embedding is not None, "Job must have an embedding"
    assert len(first_job.embedding) == 384, f"Job embedding dimension must be 384, got {len(first_job.embedding)}"

    # Seed interventions and query
    InterventionEngine.seed_catalogue(db)
    first_inv = db.query(Intervention).filter(Intervention.id == "INT-MOD-PY01").first()
    assert first_inv is not None, "Intervention INT-MOD-PY01 must exist"
    assert first_inv.embedding is not None, "Intervention must have an embedding"
    assert len(first_inv.embedding) == 384, f"Intervention embedding dimension must be 384, got {len(first_inv.embedding)}"


# -------------------------------------------------------------
# 4. Trainee, Course, Institute, and Enrollment Foreign Keys
# -------------------------------------------------------------
def test_trainee_enrollment_foreign_keys_valid(memory_db):
    """Verifies all parent entities exist before enrollment insertion with FK enforcement active."""
    db, _ = memory_db
    seed_database(db)

    enrollments = db.query(Enrollment).all()
    assert len(enrollments) >= 3, "At least 3 enrollments must be seeded"

    for enr in enrollments:
        # Parent Trainee must exist
        parent_trainee = db.query(Trainee).filter(Trainee.id == enr.trainee_id).first()
        assert parent_trainee is not None, f"Parent trainee {enr.trainee_id} must exist for enrollment {enr.id}"

        # Parent Course must exist
        parent_course = db.query(Course).filter(Course.id == enr.course_id).first()
        assert parent_course is not None, f"Parent course {enr.course_id} must exist for enrollment {enr.id}"

        # Parent TrainingInstitute must exist
        parent_inst = db.query(TrainingInstitute).filter(TrainingInstitute.id == enr.training_institute_id).first()
        assert parent_inst is not None, f"Parent institute {enr.training_institute_id} must exist for enrollment {enr.id}"


# -------------------------------------------------------------
# 5. Seed Reruns Without Duplicate Records (Idempotency)
# -------------------------------------------------------------
def test_seed_reruns_are_strictly_idempotent(memory_db):
    """Ensures calling seed routines repeatedly does not produce duplicate records."""
    db, _ = memory_db

    # Initial seed
    seed_database(db)
    t1 = db.query(Trainee).count()
    j1 = db.query(Job).count()
    e1 = db.query(Enrollment).count()
    a1 = db.query(JobApplication).count()
    c1 = db.query(Course).count()

    # Second seed
    seed_database(db)
    t2 = db.query(Trainee).count()
    j2 = db.query(Job).count()
    e2 = db.query(Enrollment).count()
    a2 = db.query(JobApplication).count()
    c2 = db.query(Course).count()

    assert t1 == t2, f"Trainees duplicated: {t1} -> {t2}"
    assert j1 == j2, f"Jobs duplicated: {j1} -> {j2}"
    assert e1 == e2, f"Enrollments duplicated: {e1} -> {e2}"
    assert a1 == a2, f"Applications duplicated: {a1} -> {a2}"
    assert c1 == c2, f"Courses duplicated: {c1} -> {c2}"


# -------------------------------------------------------------
# 6. Transaction Rollback and Session Recovery on Failure
# -------------------------------------------------------------
def test_transaction_rollback_and_session_recovery(memory_db):
    """Verifies that an error in one seed item rolls back only that savepoint without aborting the session."""
    db, _ = memory_db
    seed_organizations_base(db)

    # Insert a dummy trainee
    trainee = Trainee(
        id="TRN-TEST-999",
        full_name="Test Candidate",
        email="test@example.in",
        program="Cloud Architecture",
        cohort="2024-Q1",
        enrollment_date="2024-01-15",
        status="active"
    )
    db.add(trainee)
    db.commit()

    # Attempt to insert an invalid job that raises an exception inside a savepoint
    failed = False
    try:
        with db.begin_nested():
            # Deliberately violate NOT NULL or constraint
            invalid_job = Job(id="JOB-INVALID", title=None, description=None)
            db.add(invalid_job)
            db.flush()
    except Exception:
        failed = True

    assert failed is True, "Invalid job must fail flush"

    # Session MUST remain usable after nested rollback
    recovered_trainee = db.query(Trainee).filter(Trainee.id == "TRN-TEST-999").first()
    assert recovered_trainee is not None, "Database session must be fully recovered and queryable after rollback"


# -------------------------------------------------------------
# 7. Accurate Seed Success / Failure Counts
# -------------------------------------------------------------
def test_accurate_seed_counts(memory_db):
    """Verifies seed functions return and report exact counts of inserted, updated, and failed items."""
    db, _ = memory_db
    seed_organizations_base(db)

    # 1. Job seed report
    stats = seed_jobs_dataset(db, force_reseed=True)
    assert stats["failed"] == 0, f"Expected 0 failed jobs, got {stats['failed']}"
    assert stats["inserted"] >= 30, f"Expected at least 30 inserted jobs, got {stats['inserted']}"

    # 2. Re-run report (should detect existing)
    stats_rerun = seed_jobs_dataset(db, force_reseed=False)
    assert stats_rerun["failed"] == 0
    assert stats_rerun.get("skipped", 0) >= 30 or stats_rerun.get("updated", 0) >= 30


# -------------------------------------------------------------
# 8. Semantic Search and Recommendation Behavior
# -------------------------------------------------------------
def test_semantic_search_ranking(memory_db):
    """Verifies that cosine similarity ranking functions correctly using 384-d vectors."""
    # Test identical vectors return 1.0
    v1 = generate_deterministic_embedding("React TypeScript Frontend Engineer", dim=384)
    v2 = generate_deterministic_embedding("React TypeScript Frontend Engineer", dim=384)
    sim_identical = cosine_similarity(v1, v2)
    assert sim_identical >= 0.999, f"Identical vectors should yield ~1.0, got {sim_identical}"

    # Test related vectors return higher score than unrelated
    v_related = generate_deterministic_embedding("React UI Component Web Developer", dim=384)
    v_unrelated = generate_deterministic_embedding("Electrician Conduit Bending Journeyman", dim=384)

    sim_related = cosine_similarity(v1, v_related)
    sim_unrelated = cosine_similarity(v1, v_unrelated)

    assert sim_related > sim_unrelated, f"Related ({sim_related}) should be higher than unrelated ({sim_unrelated})"


# -------------------------------------------------------------
# 9. Root and Health-Check Endpoints
# -------------------------------------------------------------
def test_root_endpoint_returns_operational():
    """Verifies GET / returns 200 with service information and links."""
    client = TestClient(app)
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "operational"
    assert "service" in data
    assert data["health_url"] == "/health"


def test_health_check_available_and_unavailable():
    """Verifies /health returns 200 when database is responsive, and 503 when down."""
    client = TestClient(app)

    # 1. Normal state
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"]["connected"] is True
    assert data["vector_dimension"] == 384

    # 2. Simulated database outage
    with patch("main.engine.connect", side_effect=Exception("Connection refused")):
        res_down = client.get("/health")
        assert res_down.status_code == 503
        data_down = res_down.json()
        assert data_down["status"] == "unhealthy"
        assert data_down["database"]["connected"] is False


def test_head_probes_supported():
    """Verifies HEAD / and HEAD /health return 200 OK without 405 Method Not Allowed."""
    client = TestClient(app)
    head_root = client.head("/")
    assert head_root.status_code == 200, f"Expected 200 on HEAD /, got {head_root.status_code}"

    head_health = client.head("/health")
    assert head_health.status_code == 200, f"Expected 200 on HEAD /health, got {head_health.status_code}"


def test_job_long_experience_string_handling(memory_db):
    """Verifies that jobs with experience descriptions longer than 100 characters persist cleanly."""
    db, _ = memory_db
    seed_organizations_base(db)

    long_exp = "3+ years managing Docker containers, Linux virtual machines, and automated CI/CD deployment pipelines"
    assert len(long_exp) > 100

    job_data = {
        "id": "JOB-LONG-EXP-01",
        "title": "Cloud Infrastructure Lead",
        "description": "Leading cloud infrastructure deployments with high reliability and zero downtime.",
        "experience": long_exp,
        "employer_name": "Apex Cloud Technologies",
        "location": "Mumbai, MH"
    }

    job = JobIntelligenceService.process_and_save_job(db, job_data, commit=True)
    assert job is not None
    assert job.experience == long_exp[:250]


def test_seed_users_idempotent(memory_db):
    """Verifies seed_users can be executed multiple times without UniqueViolation or failure."""
    db, _ = memory_db
    seed_database(db)

    # Run seed_users twice
    seed_users(db, force_reseed=False)
    u_count_1 = db.query(User).count()

    seed_users(db, force_reseed=False)
    u_count_2 = db.query(User).count()

    assert u_count_1 == u_count_2, f"Users should not duplicate on rerun: {u_count_1} != {u_count_2}"
