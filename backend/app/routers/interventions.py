from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.core.auth import (
    get_current_user,
    require_roles,
    verify_trainee_resource_access,
)
from app.models.entities import TraineeIntervention, User
from app.services.intervention_service import InterventionEngine
from app.schemas.schemas import (
    InterventionRead,
    InterventionRecommendation,
    TraineeInterventionRead,
    StartInterventionRequest,
    UpdateProgressRequest,
    SubmitReassessmentRequest,
    ReassessmentResponse
)

router = APIRouter(prefix="/interventions", tags=["Interventions"])


@router.get("/catalogue", response_model=List[InterventionRead])
def get_intervention_catalogue(
    type: Optional[str] = None,
    domain: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve structured intervention catalogue with optional type and domain filters."""
    return InterventionEngine.get_all_interventions(db, type_filter=type, domain_filter=domain)


@router.post("/catalogue/seed")
def seed_intervention_catalogue(
    force: bool = False,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Seed or reseed the intervention catalogue with vector embeddings. Restricted to Admin."""
    InterventionEngine.seed_catalogue(db, force_reseed=force)
    return {"status": "success", "message": "Intervention catalogue seeded successfully."}


@router.get("/recommendations", response_model=List[InterventionRecommendation])
def get_recommendations_for_gap(
    trainee_id: str = Query(..., description="ID of the trainee"),
    gap_skill_name: str = Query(..., description="Name of the skill with identified gap"),
    target_occupation_id: Optional[str] = Query(None, description="Optional target occupation ID"),
    limit: int = Query(5, ge=1, le=15),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate ranked intervention recommendations for an identified skill gap.
    Protected by trainee resource-level authorization.
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db, require_write=False)

    try:
        recommendations = InterventionEngine.recommend_interventions_for_gap(
            db=db,
            trainee_id=trainee.id,
            gap_skill_name=gap_skill_name,
            target_occupation_id=target_occupation_id,
            limit=limit
        )
        return recommendations
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation engine error: {str(e)}")


@router.get("/trainees/{trainee_id}", response_model=List[TraineeInterventionRead])
def get_trainee_active_interventions(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch all active, completed, or recommended interventions for an authorized trainee."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db, require_write=False)
    return InterventionEngine.get_trainee_interventions(db, trainee.id)


@router.post("/start", response_model=TraineeInterventionRead)
def start_intervention(
    payload: StartInterventionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enroll trainee into an intervention and transition status to 'in_progress'.
    Protected by trainee resource-level authorization.
    """
    trainee = verify_trainee_resource_access(payload.trainee_id, current_user, db, require_write=True)

    try:
        tint = InterventionEngine.start_trainee_intervention(
            db=db,
            trainee_id=trainee.id,
            gap_skill_id=payload.gap_skill_id,
            gap_skill_name=payload.gap_skill_name,
            intervention_id=payload.intervention_id
        )
        return tint
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start intervention: {str(e)}")


@router.post("/{intervention_tracking_id}/progress", response_model=TraineeInterventionRead)
def update_intervention_progress(
    intervention_tracking_id: str,
    payload: UpdateProgressRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Track completion progress (0-100%).
    Ensures that caller owns or coaches this trainee intervention.
    """
    tint_record = db.query(TraineeIntervention).filter(TraineeIntervention.id == intervention_tracking_id).first()
    if not tint_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intervention tracking record not found.")

    verify_trainee_resource_access(tint_record.trainee_id, current_user, db, require_write=True)

    try:
        tint = InterventionEngine.update_intervention_progress(
            db=db,
            trainee_intervention_id=intervention_tracking_id,
            progress_percent=payload.progress_percent,
            notes=payload.notes
        )
        return tint
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")


@router.post("/{intervention_tracking_id}/reassess", response_model=ReassessmentResponse)
def submit_reassessment(
    intervention_tracking_id: str,
    payload: SubmitReassessmentRequest,
    current_user: User = Depends(require_roles(["ADMIN", "COACH", "TRAINING_PROVIDER"])),
    db: Session = Depends(get_db)
):
    """
    Closed-Loop Reassessment Workflow:
    Authorized for Coach, Training Provider, or Administrator.
    """
    tint_record = db.query(TraineeIntervention).filter(TraineeIntervention.id == intervention_tracking_id).first()
    if not tint_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intervention tracking record not found.")

    verify_trainee_resource_access(tint_record.trainee_id, current_user, db, require_write=True)

    try:
        result = InterventionEngine.submit_reassessment_and_update_scores(
            db=db,
            trainee_intervention_id=intervention_tracking_id,
            reassessed_score=payload.reassessed_score,
            reviewer_name=payload.reviewer_name or current_user.full_name,
            evaluator_notes=payload.evaluator_notes,
            artifact_url=payload.artifact_url
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit reassessment: {str(e)}")
