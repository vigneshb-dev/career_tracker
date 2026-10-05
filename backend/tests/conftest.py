import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from unittest.mock import patch

# Mock sentence transformer before imports to avoid HuggingFace model download during tests
with patch("app.services.job_intelligence_service.get_sentence_transformer", return_value=None):
    from app.core.database import Base, get_db
    from app.core.seed import seed_database, seed_users
    from app.services.career_progression_service import CareerProgressionService
    from app.services.employer_verification_service import EmployerVerificationService
    from app.services.intervention_service import InterventionEngine
    from main import app

from contextlib import asynccontextmanager

@asynccontextmanager
async def dummy_lifespan(app):
    yield

app.router.lifespan_context = dummy_lifespan

# Test SQLite in-memory database
TEST_DB_URL = "sqlite:///./test_skilltrace.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def mock_sentence_transformer():
    with patch("app.services.job_intelligence_service.get_sentence_transformer", return_value=None):
        yield

@pytest.fixture(scope="session", autouse=True)
def setup_test_db(mock_sentence_transformer):
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        with patch("app.services.job_intelligence_service.get_sentence_transformer", return_value=None):
            with patch("app.core.seed.seed_jobs_dataset"):
                seed_database(db)
                seed_users(db)
                InterventionEngine.seed_catalogue(db)
                CareerProgressionService.seed_career_data(db)
                EmployerVerificationService.seed_employer_verifications(db)
                from app.services.outcome_cause_intelligence_service import OutcomeCauseIntelligenceService
                OutcomeCauseIntelligenceService.ensure_reason_configs_seeded(db)
                from app.core.celery_app import schedule_longitudinal_milestones_task
                from app.models.entities import Job
                if not db.query(Job).filter(Job.id == "JOB-01").first():
                    db.add(Job(
                        id="JOB-01",
                        title="Cloud Infrastructure Architect",
                        company_id="CMP-01",
                        employer_id="EMP-01",
                        employer_name="Apex Cloud Technologies",
                        status="active",
                        salary_range="₹24,00,000 - ₹32,00,000",
                        posted_date="2024-09-25",
                        description="Cloud infrastructure role",
                        location="Bengaluru, KA"
                    ))
                if not db.query(Job).filter(Job.id == "JOB-02").first():
                    db.add(Job(
                        id="JOB-02",
                        title="Biomedical Informatics Engineer",
                        company_id="CMP-02",
                        employer_id="EMP-02",
                        employer_name="Meridian MedTech",
                        status="active",
                        salary_range="₹18,00,000 - ₹24,00,000",
                        posted_date="2024-09-25",
                        description="Biomedical role",
                        location="Hyderabad, TS"
                    ))
                db.commit()
                schedule_longitudinal_milestones_task("TRN-2024-001", "2024-06-30", "employment", db_session=db)
                schedule_longitudinal_milestones_task("TRN-2024-002", "2024-06-30", "employment", db_session=db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_skilltrace.db"):
        try:
            os.remove("./test_skilltrace.db")
        except Exception:
            pass

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def trainee1_token(client):
    res = client.post("/api/auth/login", json={"email": "priya.sharma@example.com", "password": "Trainee@123456"})
    assert res.status_code == 200, f"Trainee 1 login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture
def trainee2_token(client):
    res = client.post("/api/auth/login", json={"email": "rajesh.kumar@example.com", "password": "Trainee@123456"})
    assert res.status_code == 200, f"Trainee 2 login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture
def coach_token(client):
    res = client.post("/api/auth/login", json={"email": "coach.sarah@skilltrace.org", "password": "Coach@123456"})
    assert res.status_code == 200, f"Coach login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture
def employer_token(client):
    res = client.post("/api/auth/login", json={"email": "recruiter@apexcloud.io", "password": "Employer@123456"})
    assert res.status_code == 200, f"Employer login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture
def employer2_token(client):
    res = client.post("/api/auth/login", json={"email": "recruiter@meridianmedtech.co.in", "password": "Employer@123456"})
    assert res.status_code == 200, f"Employer 2 login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture
def coach2_token(client):
    res = client.post("/api/auth/login", json={"email": "coach.arun@skilltrace.org", "password": "Coach@123456"})
    assert res.status_code == 200, f"Coach 2 login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture
def admin_token(client):
    res = client.post("/api/auth/login", json={"email": "admin@skilltrace.gov", "password": "Admin@123456"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["token"]

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

