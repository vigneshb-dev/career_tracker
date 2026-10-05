import sys
from pathlib import Path

# Ensure backend directory is in sys.path so app.* imports resolve regardless of cwd
_backend_dir = Path(__file__).resolve().parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal, HAS_PGVECTOR
import app.models
from app.core.seed import seed_database, seed_users
from app.routers import (
    auth_router,
    trainees_router,
    skills_router,
    jobs_router,
    employers_router,
    follow_ups_router,
    skill_gaps_router,
    career_path_router,
    analytics_router,
    competency_router,
    skill_scoring_router,
    interventions_router,
    digital_twin_router,
    career_simulator_router,
    outcome_risks_router,
    skill_intelligence_router,
    outcome_intelligence_router,
    outcomes_router,
    follow_ups_questions_router,
    followups_router,
    companies_router,
    training_institutes_router,
    courses_router,
)
from app.services.intervention_service import InterventionEngine
from app.services.career_progression_service import CareerProgressionService
from app.services.employer_verification_service import EmployerVerificationService
from app.services.outcome_risk_service import OutcomeRiskService
from app.core.skill_outcome_seed import seed_scale_workforce_data


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("skilltrace.main")


def _sync_seed_worker():
    """
    Background worker that verifies and populates workforce seed datasets.
    Runs asynchronously off the main thread so Uvicorn can immediately bind
    to the designated port and respond to Render's port scan and health probes.
    """
    logger.info("Verifying background workforce datasets...")
    db = SessionLocal()
    try:
        try:
            seed_database(db)
            logger.info("Core database seed verified/completed.")
        except Exception as e:
            logger.warning(f"Error during core database seed: {e}")
            db.rollback()

        try:
            seed_users(db)
            logger.info("Users and RBAC seed verified/completed.")
        except Exception as e:
            logger.warning(f"Error during users seed: {e}")
            db.rollback()

        try:
            InterventionEngine.seed_catalogue(db)
        except Exception as e:
            logger.warning(f"Error during intervention catalogue seed: {e}")
            db.rollback()

        try:
            CareerProgressionService.seed_career_data(db)
        except Exception as e:
            logger.warning(f"Error during career data seed: {e}")
            db.rollback()

        try:
            EmployerVerificationService.seed_employer_verifications(db)
        except Exception as e:
            logger.warning(f"Error during employer verifications seed: {e}")
            db.rollback()

        # Seed scale workforce dataset (courses, employers, 1000+ job reqs, trainees)
        try:
            seed_scale_workforce_data(db, target_trainee_count=520)
        except Exception as seed_err:
            logger.warning(f"Error seeding scale workforce data: {seed_err}")
            db.rollback()

        # Seed initial outcome risks across trainees if not already scanned
        try:
            from app.models.entities import Trainee, OutcomeRisk
            if db.query(OutcomeRisk).count() == 0:
                logger.info("Scanning trainees for initial explainable Outcome Risks...")
                for trn in db.query(Trainee).limit(20).all():
                    try:
                        OutcomeRiskService.scan_trainee_risks(db, trn.id)
                    except Exception as ex:
                        logger.warning(f"Error scanning trainee {trn.id} for risks: {ex}")
        except Exception as e:
            logger.warning(f"Error checking/scanning outcome risks: {e}")
            db.rollback()
    finally:
        db.close()
        import gc
        gc.collect()
    logger.info("Workforce dataset verification finished.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize database schema & tables synchronously (< 0.5s)
    logger.info("Initializing database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified.")
        # Safe migration check: audit and adapt vector column dimensions
        try:
            from scripts.migrate_vector_dimensions import check_and_migrate_vector_dimensions
            check_and_migrate_vector_dimensions(engine)
        except Exception as mig_err:
            logger.warning(f"Vector dimension migration check notice: {mig_err}")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        if settings.ENVIRONMENT == "production" and not settings.DATABASE_URL.startswith("sqlite"):
            raise

    # 2. Run initial seed verification in background thread so Uvicorn binds to PORT immediately
    # This completely eliminates Render "Port scan timeout reached" errors on startup
    seed_task = asyncio.create_task(asyncio.to_thread(_sync_seed_worker))

    from app.core.diagnostics import get_process_rss_mb
    startup_rss = get_process_rss_mb()
    logger.info(f"SkillTrace API startup complete. Server listening on port. Initial RSS: {startup_rss:.1f} MiB (Render limit: 512 MiB)")

    yield

    logger.info("SkillTrace API shutting down.")
    if not seed_task.done():
        try:
            await seed_task
        except Exception:
            pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SkillTrace Workforce Intelligence API - Post-training trajectory tracking, competency verification, and semantic search.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Root API Information Endpoint (Eliminates 404s on platform root probes)
@app.get("/", tags=["System"])
def root_endpoint():
    return {
        "service": settings.PROJECT_NAME,
        "status": "operational",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/health",
        "environment": settings.ENVIRONMENT,
    }

# Health & Status Endpoint (Actively verifies database connectivity)
@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check(response: Response):
    from app.core.diagnostics import get_memory_diagnostics
    db_connected = False
    db_error = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1;"))
            db_connected = True
    except Exception as e:
        db_connected = False
        db_error = "Database connectivity check failed"
        logger.error(f"Health check database query error: {e}")

    if not db_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "healthy" if db_connected else "unhealthy",
        "service": settings.PROJECT_NAME,
        "database": {
            "engine": engine.name,
            "connected": db_connected,
            "error": db_error if not db_connected else None,
        },
        "pgvector_ready": HAS_PGVECTOR,
        "vector_dimension": settings.VECTOR_DIMENSION,
        "environment": settings.ENVIRONMENT,
        "memory": get_memory_diagnostics(),
    }

# Memory Diagnostics Endpoint (Zero-overhead production telemetry)
@app.get("/system/memory", tags=["System"])
@app.get("/api/system/memory", tags=["System"])
def memory_diagnostics_check():
    from app.core.diagnostics import get_memory_diagnostics
    return get_memory_diagnostics()

# Register API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(trainees_router, prefix=settings.API_V1_STR)
app.include_router(skills_router, prefix=settings.API_V1_STR)
app.include_router(jobs_router, prefix=settings.API_V1_STR)
app.include_router(employers_router, prefix=settings.API_V1_STR)
app.include_router(follow_ups_router, prefix=settings.API_V1_STR)
app.include_router(skill_gaps_router, prefix=settings.API_V1_STR)
app.include_router(career_path_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(competency_router, prefix=settings.API_V1_STR)
app.include_router(skill_scoring_router, prefix=settings.API_V1_STR)
app.include_router(interventions_router, prefix=settings.API_V1_STR)
app.include_router(digital_twin_router, prefix=settings.API_V1_STR)
app.include_router(career_simulator_router, prefix=settings.API_V1_STR)
app.include_router(outcome_risks_router, prefix=settings.API_V1_STR)
app.include_router(skill_intelligence_router, prefix=settings.API_V1_STR)
app.include_router(outcome_intelligence_router, prefix=settings.API_V1_STR)
app.include_router(outcomes_router, prefix=settings.API_V1_STR)
app.include_router(follow_ups_questions_router, prefix=settings.API_V1_STR)
app.include_router(followups_router, prefix=settings.API_V1_STR)
app.include_router(companies_router, prefix=settings.API_V1_STR)
app.include_router(training_institutes_router, prefix=settings.API_V1_STR)
app.include_router(courses_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
