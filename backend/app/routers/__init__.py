from app.routers.auth import router as auth_router
from app.routers.trainees import router as trainees_router
from app.routers.skills import router as skills_router
from app.routers.jobs import router as jobs_router
from app.routers.employers import router as employers_router
from app.routers.follow_ups import router as follow_ups_router
from app.routers.skill_gaps import router as skill_gaps_router
from app.routers.career_path import router as career_path_router
from app.routers.analytics import router as analytics_router
from app.routers.competency import router as competency_router
from app.routers.skill_scoring import router as skill_scoring_router
from app.routers.interventions import router as interventions_router
from app.routers.digital_twin import router as digital_twin_router
from app.routers.career_simulator import router as career_simulator_router
from app.routers.outcome_risks import router as outcome_risks_router
from app.routers.skill_intelligence import router as skill_intelligence_router
from app.routers.outcome_intelligence import (
    router as outcome_intelligence_router,
    outcomes_router,
    followups_router,
    follow_ups_questions_router,
)

from app.routers.companies import router as companies_router
from app.routers.training_institutes import router as training_institutes_router
from app.routers.courses import router as courses_router

__all__ = [
    "auth_router",
    "trainees_router",
    "skills_router",
    "jobs_router",
    "employers_router",
    "follow_ups_router",
    "skill_gaps_router",
    "career_path_router",
    "analytics_router",
    "competency_router",
    "skill_scoring_router",
    "interventions_router",
    "digital_twin_router",
    "career_simulator_router",
    "outcome_risks_router",
    "skill_intelligence_router",
    "outcome_intelligence_router",
    "outcomes_router",
    "followups_router",
    "follow_ups_questions_router",
    "companies_router",
    "training_institutes_router",
    "courses_router",
]


