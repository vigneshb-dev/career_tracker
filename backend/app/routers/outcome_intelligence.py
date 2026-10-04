import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user, require_roles, verify_trainee_resource_access
from app.models.entities import User
from app.schemas.schemas import (
    OutcomeReasonConfigRead,
    NonPlacementResponse,
    AttritionResponse,
    SelfEmploymentResponse,
    OutcomeIntelligenceSummaryResponse,
    OutcomeReasonCreateRequest,
    FollowUpGenerateRequest,
    FollowUpGenerateResponse,
    FollowUpSubmitAnswersRequest,
)
from app.services.outcome_cause_intelligence_service import OutcomeCauseIntelligenceService

logger = logging.getLogger("skilltrace.outcome_intelligence_router")

router = APIRouter(prefix="/outcome-intelligence", tags=["Outcome Cause & Attrition Intelligence"])

# Secondary router for root-level `/outcomes` and `/followups` endpoints
outcomes_router = APIRouter(prefix="/outcomes", tags=["Outcome Cause Actions"])
followups_router = APIRouter(prefix="/followups", tags=["Dynamic Follow-Up Engine"])


@router.get("/reasons", response_model=List[OutcomeReasonConfigRead])
def get_configurable_reasons(
    category: Optional[str] = Query(None), # NON_PLACEMENT, ATTRITION, SELF_EMPLOYMENT
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns administrator-configurable outcome reasons.
    Enables tracking without modifying application codebase.
    """
    return OutcomeCauseIntelligenceService.get_all_configurable_reasons(db, category=category)


@router.get("/non-placement", response_model=NonPlacementResponse)
def get_non_placement_intelligence(
    course_id: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Aggregates distributions of reported non-placement reasons among unemployed trainees.
    Never assigns singular opaque failure scores.
    """
    return OutcomeCauseIntelligenceService.get_non_placement_intelligence(db, course_id=course_id, district=district)


@router.get("/attrition", response_model=AttritionResponse)
def get_attrition_intelligence(
    course_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Longitudinal Attrition Intelligence:
    Aggregates reasons among employees who departed within 6 months of placement.
    Includes tenure breakdown (<3m, 3-6m, >6m).
    """
    return OutcomeCauseIntelligenceService.get_attrition_intelligence(db, course_id=course_id)


@router.get("/self-employment", response_model=SelfEmploymentResponse)
def get_self_employment_intelligence(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregates challenges and survival rates for self-employed and entrepreneurial trainees."""
    return OutcomeCauseIntelligenceService.get_self_employment_intelligence(db)


@router.get("/summary", response_model=OutcomeIntelligenceSummaryResponse)
def get_outcome_intelligence_summary(
    course_id: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Comprehensive Overview of Outcome Failures, Attrition Causes, and Associations:
    - 8 Canonical Outcome States Breakdown
    - Top Non-Placement and Attrition Causes
    - Explainable Correlation / Association Pathways (e.g. Course -> Skill Gap -> Outcome)
    - Stale Record & Data Quality Indicators (>180 / 210 days -> STATUS_STALE / REQUIRES_FOLLOW_UP)
    """
    return OutcomeCauseIntelligenceService.get_outcome_intelligence_summary(
        db, course_id=course_id, district=district, provider=provider
    )


# ========================================================
# POST /api/outcomes/{id}/reason
# ========================================================

@outcomes_router.post("/{id}/reason")
def record_outcome_reason_endpoint(
    id: str,
    payload: OutcomeReasonCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Records an explicit, structured reason explaining non-placement or attrition for a trainee.
    Audited directly to the trainee's PassportEvent log.
    """
    verify_trainee_resource_access(id, current_user, db, require_write=True)
    try:
        actor_name = current_user.full_name or current_user.email
        rec = OutcomeCauseIntelligenceService.record_outcome_reason(
            trainee_id=id,
            reason_category=payload.reason_category,
            reason_code=payload.reason_code,
            outcome_type=payload.outcome_type,
            reason_text=payload.reason_text,
            tenure_months=payload.tenure_months,
            metadata_json=payload.metadata_json,
            reported_by=actor_name,
            outcome_id=payload.outcome_id,
            db=db,
        )
        return {
            "status": "success",
            "message": f"Outcome reason '{payload.reason_code}' successfully recorded.",
            "record_id": rec.id,
        }
    except Exception as e:
        logger.error(f"Error recording outcome reason for {id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record outcome reason: {str(e)}",
        )


# ========================================================
# POST /api/followups/generate and /respond
# ========================================================

@followups_router.post("/generate", response_model=FollowUpGenerateResponse)
def generate_followup_questions_endpoint(
    payload: FollowUpGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generates dynamic, state-based follow-up questions tailored to trainee's current status:
    - If UNEMPLOYED: asks about search, interviews, rejections, location, additional training
    - If EMPLOYED: asks about retention, role/wage changes, training skill usage
    - If SELF_EMPLOYED: asks about business status, revenue, operational bottlenecks
    - If EMPLOYMENT_LOST: asks about exit timing, primary reason, previous job match
    """
    verify_trainee_resource_access(payload.trainee_id, current_user, db)
    try:
        return OutcomeCauseIntelligenceService.generate_follow_up_questions(payload.trainee_id, db)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error generating follow up questions: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate follow-up questions: {str(e)}",
        )


@followups_router.post("/respond")
def submit_followup_responses_endpoint(
    payload: FollowUpSubmitAnswersRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submits answers to generated follow-up questions and refreshes audit state."""
    verify_trainee_resource_access(payload.trainee_id, current_user, db, require_write=True)
    try:
        return OutcomeCauseIntelligenceService.record_follow_up_responses(
            trainee_id=payload.trainee_id,
            employment_status=payload.employment_status,
            responses=payload.responses,
            db=db,
        )
    except Exception as e:
        logger.error(f"Error submitting follow-up responses: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record follow-up answers: {str(e)}",
        )
