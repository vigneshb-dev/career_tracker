import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal, HAS_PGVECTOR
from app.core.seed import seed_database
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
)
from app.services.intervention_service import InterventionEngine
from app.services.career_progression_service import CareerProgressionService
from app.services.employer_verification_service import EmployerVerificationService


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
        seed_database(db)
        InterventionEngine.seed_catalogue(db)
        CareerProgressionService.seed_career_data(db)
        EmployerVerificationService.seed_employer_verifications(db)
    except Exception as e:
        logger.warning(f"Error during database seed: {e}")
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
)

# Health & Status Endpoint
@app.get("/health", tags=["System"])
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
