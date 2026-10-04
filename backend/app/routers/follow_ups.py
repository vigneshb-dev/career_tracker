from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.auth import (
    get_current_user,
    require_roles,
    verify_trainee_resource_access,
    verify_follow_up_access
)
from app.models.entities import FollowUp, LongitudinalFollowUp, Trainee, User
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List retention follow-ups with role-aware scoping."""
    user_role = (current_user.role or "").strip().upper()
    query = db.query(FollowUp)

    if user_role == "TRAINEE":
        trn_id = current_user.trainee_profile.trainee_id if current_user.trainee_profile else None
        if not trn_id:
            t = db.query(Trainee).filter((Trainee.user_id == current_user.id) | (Trainee.email == current_user.email)).first()
            trn_id = t.id if t else None
        if not trn_id:
            return []
        query = query.filter(FollowUp.trainee_id == trn_id)

    if status and status != "all":
        query = query.filter(FollowUp.status == status)

    return query.all()


@router.put("/{follow_up_id}/complete", response_model=FollowUpRead)
def complete_follow_up(
    follow_up_id: str,
    payload: FollowUpComplete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Completes a counselor follow-up task. Authorized for Coach, Training Provider, and Admin."""
    user_role = (current_user.role or "").strip().upper()
    item = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up not found")

    if user_role not in ["ADMIN", "COACH", "TRAINING_PROVIDER", "PROVIDER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only coaches, training providers, or administrators can complete counselor follow-up tasks."
        )

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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve longitudinal retention milestones scheduled at 30, 90, 180, and 365 days.
    Enforces trainee data privacy:
    - Trainee only sees their own follow-ups.
    - Employer only sees authorized candidates.
    - Coach/Provider/Admin/Analyst can view cohort longitudinal records.
    """
    user_role = (current_user.role or "").strip().upper()

    if user_role == "TRAINEE":
        own_id = current_user.trainee_profile.trainee_id if current_user.trainee_profile else None
        if not own_id:
            t = db.query(Trainee).filter((Trainee.user_id == current_user.id) | (Trainee.email == current_user.email)).first()
            own_id = t.id if t else None
        trainee_id = own_id or "NONE"

    elif user_role == "EMPLOYER":
        auth_candidates = current_user.employer_profile.authorized_candidate_ids if current_user.employer_profile else []
        if trainee_id and trainee_id not in auth_candidates:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Candidate not authorized for employer.")

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

    # If table is empty for an admin/coach query, auto-schedule for existing trainees who have granted consent
    if not results and not milestone_days and not trainee_id and user_role in ["ADMIN", "COACH", "TRAINING_PROVIDER"]:
        trainees = db.query(Trainee).all()
        for t in trainees:
            schedule_longitudinal_milestones_task(
                trainee_id=t.id,
                graduation_date_str=t.graduation_date or "2024-06-30",
                pathway=t.primary_outcome_type or "employment",
                db_session=db
            )
        results = db.query(LongitudinalFollowUp).order_by(LongitudinalFollowUp.due_date.asc()).all()

    return results


@router.post("/longitudinal/{follow_up_id}/complete", response_model=LongitudinalFollowUpRead)
def complete_longitudinal_follow_up(
    follow_up_id: str,
    payload: CompleteLongitudinalFollowUpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Records outcome audit verification at 30, 90, 180, or 365 days.
    Enforces authorization and trainee consent check.
    Addresses Known Issue #4.
    """
    lfu = db.query(LongitudinalFollowUp).filter(LongitudinalFollowUp.id == follow_up_id).first()
    if not lfu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Longitudinal follow-up '{follow_up_id}' not found.")

    # Authorization check
    trainee = verify_follow_up_access(lfu.trainee_id, current_user, db)

    # Consent check
    consent_dict = trainee.consent_status or {}
    consent_st = (consent_dict.get("status") or consent_dict.get("consent_status") or "ACTIVE").upper()
    if consent_st in ["WITHDRAWN", "REVOKED", "NOT_GRANTED", "DENIED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot record longitudinal audit: Trainee consent is currently '{consent_st}'."
        )

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
    current_user: User = Depends(require_roles(["ADMIN", "COACH", "TRAINING_PROVIDER"])),
    db: Session = Depends(get_db)
):
    """
    Automated Celery task trigger to schedule follow-ups at:
    30 / 90 / 180 / 365 days post-graduation.
    Respects trainee consent status.
    """
    trainee = db.query(Trainee).filter(Trainee.id == trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trainee '{trainee_id}' not found.")

    res = schedule_longitudinal_milestones_task(
        trainee_id=trainee.id,
        graduation_date_str=trainee.graduation_date or "2024-06-30",
        pathway=trainee.primary_outcome_type or "employment",
        db_session=db
    )
    return res


@router.post("/run-automated-sweep")
def trigger_automated_follow_up_sweep(
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Executes automated Celery sweep task across all scheduled milestones.
    Flags overdue items and identifies unreachable candidates as 'Outcome Unknown'.
    Restricted to Administrator.
    """
    res = automated_follow_up_sweep_task()
    return res
