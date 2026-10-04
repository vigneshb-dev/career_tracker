import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    followups_router,
)
from app.services.intervention_service import InterventionEngine
from app.services.career_progression_service import CareerProgressionService
from app.services.employer_verification_service import EmployerVerificationService
from app.services.outcome_risk_service import OutcomeRiskService
from app.core.skill_outcome_seed import seed_scale_workforce_data


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("skilltrace.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    logger.info("Initializing database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

    # Seed initial realistic workforce data if empty
    db = SessionLocal()
    try:
        try:
            seed_database(db)
            logger.info("Core database seed completed.")
        except Exception as e:
            logger.warning(f"Error during core database seed: {e}")
            db.rollback()

        try:
            seed_users(db)
            logger.info("Users and RBAC seed completed.")
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

    yield


    logger.info("SkillTrace API shutting down.")

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

# Health & Status Endpoint
@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": engine.name,
        "pgvector_ready": HAS_PGVECTOR,
        "environment": settings.ENVIRONMENT,
    }

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
app.include_router(followups_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
