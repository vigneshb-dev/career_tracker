from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.entities import FollowUp, LongitudinalFollowUp, Trainee
from app.schemas.schemas import (
    FollowUpRead,
    FollowUpComplete,
    LongitudinalFollowUpRead,
    CompleteLongitudinalFollowUpRequest
)
from app.core.celery_app import (
    schedule_longitudinal_milestones_task,
    automated_follow_up_sweep_task
)
from app.services.career_progression_service import CareerProgressionService

router = APIRouter(prefix="/follow-ups", tags=["Retention Follow-Ups & Automated Scheduling"])


@router.get("", response_model=List[FollowUpRead])
def list_follow_ups(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(FollowUp)
    if status and status != "all":
        query = query.filter(FollowUp.status == status)
    return query.all()


@router.put("/{follow_up_id}/complete", response_model=FollowUpRead)
def complete_follow_up(
    follow_up_id: str,
    payload: FollowUpComplete,
    db: Session = Depends(get_db)
):
    item = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    item.status = "completed"
    if payload.notes:
        item.notes = payload.notes
    db.commit()
    db.refresh(item)
    return item


# ========================================================
# Longitudinal 30 / 90 / 180 / 365 Days Endpoints
# ========================================================

@router.get("/longitudinal", response_model=List[LongitudinalFollowUpRead])
def list_longitudinal_follow_ups(
    milestone_days: Optional[int] = Query(None, description="Filter by 30, 90, 180, 365"),
    status: Optional[str] = Query(None, description="Filter by scheduled, due, overdue, completed, unreachable"),
    trainee_id: Optional[str] = Query(None),
    pathway: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retrieve longitudinal retention milestones scheduled at 30, 90, 180, and 365 days.
    """
    query = db.query(LongitudinalFollowUp)
    if milestone_days:
        query = query.filter(LongitudinalFollowUp.milestone_days == milestone_days)
    if status and status != "all":
        query = query.filter(LongitudinalFollowUp.status == status)
    if trainee_id:
        query = query.filter(LongitudinalFollowUp.trainee_id == trainee_id)
    if pathway and pathway != "all":
        query = query.filter(LongitudinalFollowUp.pathway == pathway)

    results = query.order_by(LongitudinalFollowUp.due_date.asc()).all()

    # If table is empty, auto-schedule for all trainees
    if not results and not milestone_days and not trainee_id:
        trainees = db.query(Trainee).all()
        for t in trainees:
            schedule_longitudinal_milestones_task(
                trainee_id=t.id,
                graduation_date_str=t.graduation_date or "2024-06-30",
                pathway=t.primary_outcome_type or "employment"
            )
        results = db.query(LongitudinalFollowUp).order_by(LongitudinalFollowUp.due_date.asc()).all()

    return results


@router.post("/longitudinal/{follow_up_id}/complete", response_model=LongitudinalFollowUpRead)
def complete_longitudinal_follow_up(
    follow_up_id: str,
    payload: CompleteLongitudinalFollowUpRequest,
    db: Session = Depends(get_db)
):
    """
    Records outcome audit verification at 30, 90, 180, or 365 days,
    recording retention status and pathway-specific metrics.
    """
    try:
        updated = CareerProgressionService.complete_longitudinal_follow_up(
            db=db,
            follow_up_id=follow_up_id,
            retention_confirmed=payload.retention_confirmed,
            pathway=payload.pathway,
            metrics=payload.metrics,
            notes=payload.notes
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete longitudinal audit: {str(e)}")


@router.post("/schedule-milestones/{trainee_id}")
def schedule_trainee_milestones(
    trainee_id: str,
    db: Session = Depends(get_db)
):
    """
    Automated Celery task trigger to schedule follow-ups at:
    30 / 90 / 180 / 365 days post-graduation.
    """
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=404, detail=f"Trainee '{trainee_id}' not found.")

    res = schedule_longitudinal_milestones_task(
        trainee_id=trainee.id,
        graduation_date_str=trainee.graduation_date or "2024-06-30",
        pathway=trainee.primary_outcome_type or "employment"
    )
    return res


@router.post("/run-automated-sweep")
def trigger_automated_follow_up_sweep():
    """
    Executes automated Celery sweep task across all scheduled milestones.
    Flags overdue items and identifies unreachable candidates as 'Outcome Unknown'.
    """
    res = automated_follow_up_sweep_task()
    return res
