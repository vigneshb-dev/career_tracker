import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user, require_roles, verify_trainee_resource_access
from app.models.entities import User, Trainee, Skill, Course, Intervention, Job
from app.schemas.schemas import (
    ScenarioInput,
    SimulationResponse
)
from app.services.career_simulator_service import CareerSimulatorService

logger = logging.getLogger("skilltrace.career_simulator_router")

router = APIRouter(prefix="/simulator", tags=["What-If Career Simulator"])


@router.post("/run", response_model=SimulationResponse)
def run_career_simulation(
    scenario: ScenarioInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes an explainable What-If Career Simulation.
    Compares CURRENT PROFILE vs SIMULATED PROFILE.
    Outputs: newly matched jobs, remaining gaps, changed match scores,
    newly eligible pathways, required training, and estimated readiness change.

    Labels: SIMULATION, ESTIMATION.
    Does NOT fabricate salaries, job guarantees, or employment probabilities.
    """
    if scenario.trainee_id:
        verify_trainee_resource_access(scenario.trainee_id, current_user, db)

    try:
        response = CareerSimulatorService.run_simulation(db, scenario)
        return response
    except Exception as e:
        logger.error(f"Error executing career simulation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation failed: {str(e)}"
        )


@router.get("/trainee/{trainee_id}/baseline")
def get_trainee_simulation_baseline(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches actual trainee baseline skills, certifications, and current target role
    for initializing the Career Simulator builder.
    """
    verify_trainee_resource_access(trainee_id, current_user, db)
    try:
        baseline = CareerSimulatorService.get_trainee_baseline(db, trainee_id)
        return baseline
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/options")
def get_simulator_options(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns available skills, target roles, locations, certifications, and interventions
    for populating the What-If Scenario Builder selectors.
    """
    skills = db.query(Skill).order_by(Skill.demand_score.desc()).limit(40).all()
    jobs = db.query(Job).filter(Job.status == "active").all()
    interventions = db.query(Intervention).all()

    roles = list({j.title for j in jobs if j.title})
    locations = list({j.location for j in jobs if j.location})

    # Standard certifications across top domains
    sample_certs = [
        "AWS Certified Solutions Architect - Associate",
        "Microsoft Certified: Power BI Data Analyst Associate",
        "Meta Front-End Developer Professional Certificate",
        "CompTIA Security+ Certification",
        "Google Data Analytics Professional Certificate",
        "Docker Certified Associate (DCA)",
        "Certified Kubernetes Administrator (CKA)"
    ]

    return {
        "available_skills": [{"id": s.id, "name": s.name, "category": s.category, "domain": s.domain} for s in skills],
        "target_roles": sorted(roles)[:15],
        "locations": sorted(locations)[:10],
        "suggested_certifications": sample_certs,
        "interventions": [{"id": i.id, "title": i.title, "type": i.type, "domain": i.domain} for i in interventions]
    }
