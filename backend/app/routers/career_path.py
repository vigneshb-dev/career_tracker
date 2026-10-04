from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import (
    get_current_user,
    require_roles,
    verify_trainee_resource_access
)
from app.models.entities import CareerPath, User, Trainee, VerificationStatus
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
def get_trainee_career_timeline(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Constructs the 5-stage career timeline:
    Training -> First Outcome -> Current Status -> Career Events -> Progression
    Protected by strict trainee resource-level authorization.
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db, require_write=False)
    try:
        timeline = CareerProgressionService.get_trainee_career_timeline(db, trainee.id)
        return timeline
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate career timeline: {str(e)}")


@router.get("/pathways/summary", response_model=PathwaySummaryResponse)
def get_pathways_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Workforce longitudinal summary:
    - Pathway distribution across positive pathways + Outcome Unknown
    - Overall retention rate and milestone adherence
    - 30 / 90 / 180 / 365 day retention funnel
    """
    return CareerProgressionService.get_pathways_executive_summary(db)


@router.post("/events", response_model=CareerTimelineEventRead, status_code=status.HTTP_201_CREATED)
def record_career_event(
    payload: CareerTimelineEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record a new career event, milestone, promotion, or status update.
    Strictly authorized:
    - Trainee can only record events for their own profile and verification is forced to SELF_REPORTED.
    - Coach/Training Provider/Admin can record verified events.
    - Employer can only record events for candidate associated with their organization.
    """
    trainee = verify_trainee_resource_access(payload.trainee_id, current_user, db, require_write=False)
    user_role = (current_user.role or "").strip().upper()

    # Determine permitted verification status based on actor role
    if user_role == "TRAINEE":
        # Trainees cannot self-verify milestones
        verification_status = VerificationStatus.SELF_REPORTED.value
        verification_notes = payload.verification_notes or "Self-reported milestone submitted by candidate."
    elif user_role in ["COACH", "TRAINING_PROVIDER", "PROVIDER", "ADMIN"]:
        verification_status = payload.verification_status or VerificationStatus.DOCUMENT_VERIFIED.value
        verification_notes = payload.verification_notes or f"Verified by {current_user.full_name} ({user_role})."
    elif user_role == "EMPLOYER":
        verification_status = VerificationStatus.EMPLOYER_VERIFIED.value
        verification_notes = payload.verification_notes or f"Verified by employer representative {current_user.full_name}."
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to record timeline event.")

    try:
        event = CareerProgressionService.record_career_event(
            db=db,
            trainee_id=trainee.id,
            stage=payload.stage,
            pathway=payload.pathway,
            title=payload.title,
            organization=payload.organization,
            event_date=payload.event_date,
            metrics=payload.metrics,
            verification_status=verification_status,
            verification_notes=verification_notes,
            is_current=payload.is_current or False
        )
        return event
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record career event: {str(e)}")


@router.post("/seed")
def seed_career_data(
    force: bool = False,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Seed or reseed career progression timeline events. Restricted to Admin."""
    CareerProgressionService.seed_career_data(db, force_reseed=force)
    return {"status": "success", "message": "Career progression timelines seeded successfully."}
