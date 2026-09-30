from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.entities import CareerPath
from app.schemas.schemas import (
    CareerPathRead,
    CareerTimelineResponse,
    CareerTimelineEventCreate,
    CareerTimelineEventRead,
    PathwaySummaryResponse
)
from app.services.career_progression_service import CareerProgressionService

router = APIRouter(prefix="/career-path", tags=["Career Trajectories & Longitudinal Progression"])


@router.get("", response_model=List[CareerPathRead])
def list_career_paths(db: Session = Depends(get_db)):
    """Retrieve all high-level career pathways and milestones."""
    return db.query(CareerPath).all()


@router.get("/trainees/{trainee_id}/timeline", response_model=CareerTimelineResponse)
def get_trainee_career_timeline(trainee_id: str, db: Session = Depends(get_db)):
    """
    Constructs the 5-stage career timeline:
    Training -> First Outcome -> Current Status -> Career Events -> Progression
    with pathway-specific metrics across:
    - Employment (job role, employer, salary range, retention, promotion)
    - Self-Employment (business name, client base, monthly earnings, operating status)
    - Freelancing (active status, projects, income range, client satisfaction)
    - Apprenticeship (organization, duration hours, conversion status)
    - Entrepreneurship (business status, sector, revenue range, employees)
    - Further Education/Research (programme, institution, current status)
    - Outcome Unknown (explicit state when reliable info is unavailable)
    """
    try:
        timeline = CareerProgressionService.get_trainee_career_timeline(db, trainee_id)
        return timeline
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate career timeline: {str(e)}")


@router.get("/pathways/summary", response_model=PathwaySummaryResponse)
def get_pathways_summary(db: Session = Depends(get_db)):
    """
    Workforce longitudinal summary:
    - Pathway distribution across the 6 positive pathways + Outcome Unknown
    - Overall retention rate and milestone adherence
    - 30 / 90 / 180 / 365 day retention funnel
    """
    return CareerProgressionService.get_pathways_executive_summary(db)


@router.post("/events", response_model=CareerTimelineEventRead)
def record_career_event(payload: CareerTimelineEventCreate, db: Session = Depends(get_db)):
    """Record a new career event, milestone, promotion, or status update."""
    try:
        event = CareerProgressionService.record_career_event(
            db=db,
            trainee_id=payload.trainee_id,
            stage=payload.stage,
            pathway=payload.pathway,
            title=payload.title,
            organization=payload.organization,
            event_date=payload.event_date,
            metrics=payload.metrics,
            verification_status=payload.verification_status or "verified",
            verification_notes=payload.verification_notes,
            is_current=payload.is_current or False
        )
        return event
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record career event: {str(e)}")


@router.post("/seed")
def seed_career_data(force: bool = False, db: Session = Depends(get_db)):
    """Seed or reseed career progression timeline events."""
    CareerProgressionService.seed_career_data(db, force_reseed=force)
    return {"status": "success", "message": "Career progression timelines seeded successfully."}
