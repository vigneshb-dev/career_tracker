import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user, require_roles, verify_trainee_resource_access
from app.models.entities import User, Trainee, CareerTimelineEvent, DigitalTwinState
from app.schemas.schemas import (
    DigitalTwinRead,
    DigitalTwinTimelineResponse,
    DigitalTwinSkillEvolutionResponse,
    DigitalTwinOutcomeEvolutionResponse,
    DigitalTwinDataQualityResponse,
    DigitalTwinEvidenceItem
)
from app.services.digital_twin_service import DigitalTwinService

logger = logging.getLogger("skilltrace.digital_twin_router")

router = APIRouter(prefix="/digital-twin", tags=["Career Outcome Digital Twin"])


@router.get("/{trainee_id}", response_model=DigitalTwinRead)
def get_digital_twin(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the comprehensive Career Outcome Digital Twin state for a specific trainee.
    Enforces resource-level authorization (Trainee can only view own twin).
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    twin = DigitalTwinService.get_or_compute_twin(db, trainee_id)
    twin.trainee_name = trainee.full_name
    return twin


@router.get("/{trainee_id}/timeline", response_model=DigitalTwinTimelineResponse)
def get_digital_twin_timeline(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the visual chronological career timeline for the Digital Twin.
    Preserves all historical events (TRAINING -> COMPLETION -> PLACEMENT -> EMPLOYMENT -> JOB_CHANGE -> SALARY_CHANGE -> RETENTION -> SKILL_DEVELOPMENT).
    """
    verify_trainee_resource_access(trainee_id, current_user, db)
    events = db.query(CareerTimelineEvent).filter(
        CareerTimelineEvent.trainee_id == trainee_id
    ).order_by(CareerTimelineEvent.sequence_order).all()

    timeline_data = []
    for ev in events:
        timeline_data.append({
            "id": ev.id,
            "trainee_id": ev.trainee_id,
            "stage": ev.stage,
            "title": ev.title,
            "description": getattr(ev, "description", None) or getattr(ev, "verification_notes", None) or f"{ev.title} at {ev.organization}",
            "organization": getattr(ev, "organization", ""),
            "pathway": getattr(ev, "pathway", ""),
            "event_date": ev.event_date,
            "sequence_order": ev.sequence_order,
            "verification_status": ev.verification_status,
            "verified_by": getattr(ev, "verified_by", None) or "System Verified",
            "evidence_url": getattr(ev, "evidence_url", None),
            "metadata": getattr(ev, "metadata_json", None) or getattr(ev, "metrics", {}) or {}
        })

    return DigitalTwinTimelineResponse(
        trainee_id=trainee_id,
        total_events=len(timeline_data),
        timeline_events=timeline_data
    )


@router.get("/{trainee_id}/skill-evolution", response_model=DigitalTwinSkillEvolutionResponse)
def get_digital_twin_skill_evolution(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the 4 canonical stages of skill progression:
    1. Skill at Training Completion
    2. Skill After Intervention
    3. Skill After Reassessment
    4. Skill Required by Target Job
    """
    verify_trainee_resource_access(trainee_id, current_user, db)
    twin = DigitalTwinService.get_or_compute_twin(db, trainee_id)
    return DigitalTwinSkillEvolutionResponse(
        trainee_id=trainee_id,
        stages=twin.skill_evolution or []
    )


@router.get("/{trainee_id}/employment-evolution", response_model=DigitalTwinOutcomeEvolutionResponse)
def get_digital_twin_employment_evolution(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the month-by-month employment journey (Month 0: Training, Month 2: Search, Month 4: Employed, Month 8: Salary Increase, Month 12: Retained).
    """
    verify_trainee_resource_access(trainee_id, current_user, db)
    twin = DigitalTwinService.get_or_compute_twin(db, trainee_id)
    return DigitalTwinOutcomeEvolutionResponse(
        trainee_id=trainee_id,
        current_outcome=twin.current_outcome,
        journey=twin.outcome_evolution or []
    )


@router.get("/{trainee_id}/evidence", response_model=List[DigitalTwinEvidenceItem])
def get_digital_twin_evidence(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Provides granular evidence traceability answering: 'Why does the system believe this?'
    Exposes attribute, value, evidence_type, source, verified_by, date, confidence, and plain-English explanation.
    """
    verify_trainee_resource_access(trainee_id, current_user, db)
    twin = DigitalTwinService.get_or_compute_twin(db, trainee_id)
    return twin.evidence_traceability or []


@router.get("/{trainee_id}/data-quality", response_model=DigitalTwinDataQualityResponse)
def get_digital_twin_data_quality(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the mathematical 0-100 data quality score and transparent deductions for this specific trainee record.
    """
    verify_trainee_resource_access(trainee_id, current_user, db)
    twin = DigitalTwinService.get_or_compute_twin(db, trainee_id)
    breakdown = twin.data_quality_breakdown or {}
    return DigitalTwinDataQualityResponse(
        trainee_id=trainee_id,
        quality_score=twin.data_quality,
        completeness=breakdown.get("completeness", 0.0),
        freshness=breakdown.get("freshness", 0.0),
        verification=breakdown.get("verification", 0.0),
        consistency=breakdown.get("consistency", 0.0),
        deductions=breakdown.get("deductions", []),
        is_stale=breakdown.get("is_stale", False),
        has_missing_wages=breakdown.get("has_missing_wages", False),
        has_missing_employer_verification=breakdown.get("has_missing_employer_verification", False),
        days_since_active=breakdown.get("days_since_active")
    )


@router.post("/{trainee_id}/refresh", response_model=DigitalTwinRead)
def refresh_digital_twin(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Forces a synchronous recomputation of the Digital Twin state from live database records.
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    twin = DigitalTwinService.get_or_compute_twin(db, trainee_id, force_refresh=True)
    twin.trainee_name = trainee.full_name
    return twin
