import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import (
    get_current_user,
    require_roles,
    verify_trainee_resource_access,
)
from app.models.entities import SkillGap, Trainee, Occupation, User
from app.schemas.schemas import SkillGapRead, SkillGapAnalyzeRequest
from app.services.skill_gap_service import SkillGapEngine

logger = logging.getLogger("skilltrace.routers.skill_gaps")

router = APIRouter(prefix="/skill-gaps", tags=["Skill Gaps"])


@router.get("", response_model=List[SkillGapRead])
def list_skill_gaps(
    priority: Optional[str] = Query(None, description="Filter by critical, moderate, low"),
    gap_type: Optional[str] = Query(None, description="Filter by learner_gap, curriculum_gap, workplace_gap"),
    category: Optional[str] = Query(None, description="Filter by hard or soft"),
    trainee_id: Optional[str] = Query(None, description="Filter by trainee ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves audited candidate skill gaps with role-aware privacy:
    - Trainees are restricted to their own gaps.
    - Authorized Coaches/Providers/Employers/Admins can view matching cohorts.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role == "TRAINEE":
        own_id = current_user.trainee_profile.trainee_id if current_user.trainee_profile else None
        if not own_id:
            t = db.query(Trainee).filter((Trainee.user_id == current_user.id) | (Trainee.email == current_user.email)).first()
            own_id = t.id if t else None
        trainee_id = own_id or "NONE"

    query = db.query(SkillGap)
    if trainee_id:
        query = query.filter(SkillGap.trainee_id == trainee_id)

    results = query.all()

    # If database has empty or uninitialized gap records for admin/coach, auto-sync
    if (not results or any(not r.gaps_breakdown for r in results)) and user_role in ["ADMIN", "COACH", "TRAINING_PROVIDER"]:
        trainees = db.query(Trainee).all()
        for t in trainees:
            try:
                SkillGapEngine.analyze_trainee_skill_gap(db, t.id, save_record=True)
            except Exception as e:
                logger.error(f"Error auto-syncing skill gap for {t.id}: {e}")
        results = db.query(SkillGap).all()
        if trainee_id:
            results = [r for r in results if r.trainee_id == trainee_id]

    # Apply in-memory filtering for detailed attributes if requested
    if priority or gap_type or category:
        filtered = []
        for r in results:
            breakdown = r.gaps_breakdown or []
            matches = True
            if priority:
                if not any(g.get("priority_tier") == priority for g in breakdown):
                    matches = False
            if gap_type:
                if not any(g.get("gap_type") == gap_type for g in breakdown):
                    matches = False
            if category:
                if not any(g.get("category") == category for g in breakdown):
                    matches = False
            if matches:
                filtered.append(r)
        return filtered

    return results


@router.get("/summary")
def get_skill_gaps_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns executive workforce-level analytics:
    - Critical, Moderate, Low breakdown
    - Learner, Curriculum, Workplace gap distribution
    - Hard vs Soft skill distribution
    - Top missing skills in the talent pool
    """
    # Verify records are populated
    first_gap = db.query(SkillGap).first()
    if not first_gap or not first_gap.gaps_breakdown:
        trainees = db.query(Trainee).all()
        for t in trainees:
            try:
                SkillGapEngine.analyze_trainee_skill_gap(db, t.id, save_record=True)
            except Exception as e:
                logger.error(f"Error syncing {t.id}: {e}")

    return SkillGapEngine.get_workforce_summary(db)


@router.get("/trainees/{id}")
def get_trainee_skill_gap(
    id: str,
    target_occupation_id: Optional[str] = Query(None, description="Optional target occupation override"),
    target_job_id: Optional[str] = Query(None, description="Optional target job requisition override"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the comprehensive Skill Gap Audit for an individual candidate.
    Protected by trainee resource-level authorization (IDOR safe).
    """
    trainee = verify_trainee_resource_access(id, current_user, db, require_write=False)

    try:
        analysis = SkillGapEngine.analyze_trainee_skill_gap(
            db=db,
            trainee_id=trainee.id,
            target_occupation_id=target_occupation_id,
            target_job_id=target_job_id,
            save_record=True
        )
        return analysis
    except Exception as e:
        logger.error(f"Error analyzing skill gap for {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Gap analysis error: {str(e)}")


@router.post("/analyze")
def analyze_skill_gap(
    payload: SkillGapAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Runs on-demand deterministic + semantic skill gap analysis for a trainee.
    Protected by trainee resource-level authorization.
    """
    trainee = verify_trainee_resource_access(payload.trainee_id, current_user, db, require_write=False)

    try:
        analysis = SkillGapEngine.analyze_trainee_skill_gap(
            db=db,
            trainee_id=trainee.id,
            target_occupation_id=payload.target_occupation_id,
            target_job_id=payload.target_job_id,
            target_employer=payload.target_employer,
            save_record=True
        )
        return analysis
    except Exception as e:
        logger.error(f"Error running on-demand skill gap analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-sync")
def batch_sync_all_gaps(
    current_user: User = Depends(require_roles(["ADMIN", "COACH", "TRAINING_PROVIDER"])),
    db: Session = Depends(get_db)
):
    """
    Re-runs the AI Skill Gap Engine across all registered candidates in the workforce database.
    Restricted to Admins and Coaches.
    """
    trainees = db.query(Trainee).all()
    synced_count = 0
    errors = []

    for t in trainees:
        try:
            SkillGapEngine.analyze_trainee_skill_gap(db, t.id, save_record=True)
            synced_count += 1
        except Exception as e:
            errors.append(f"{t.id}: {str(e)}")

    return {
        "status": "success",
        "synced_candidates": synced_count,
        "total_candidates": len(trainees),
        "errors": errors
    }
