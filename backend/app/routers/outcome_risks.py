import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user, require_roles, verify_trainee_resource_access
from app.models.entities import User, Trainee, OutcomeRisk
from app.schemas.schemas import (
    OutcomeRiskRead,
    OutcomeRiskSummaryResponse,
    OutcomeRiskActionRequest,
    OutcomeRiskReassessmentRequest
)
from app.services.outcome_risk_service import OutcomeRiskService

logger = logging.getLogger("skilltrace.outcome_risks_router")

router = APIRouter(prefix="/outcome-risks", tags=["Outcome Risk Engine & Intervention Loop"])


@router.get("", response_model=List[OutcomeRiskRead])
def get_outcome_risks(
    trainee_id: Optional[str] = Query(None),
    risk_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists outcome risks across trainees.
    If the caller is a TRAINEE, access is strictly scoped to their own trainee records.
    Every risk exposes Signal 1, Signal 2, Signal 3 under why_explanation.
    """
    user_role = (current_user.role or "").upper()
    if user_role == "TRAINEE":
        # Trainees can only see their own risks
        profile = current_user.trainee_profile
        t_id = profile.trainee_id if profile else None
        if not t_id:
            # Check if user.id matches any trainee user_id
            t_rec = db.query(Trainee).filter(Trainee.user_id == current_user.id).first()
            t_id = t_rec.id if t_rec else None

        if not t_id:
            return []
        trainee_id = t_id

    # If coach with assigned trainees
    if user_role in ["COACH", "TRAINING_PROVIDER"] and not trainee_id:
        coach_prof = current_user.coach_profile
        if coach_prof and coach_prof.assigned_trainee_ids:
            assigned = list(coach_prof.assigned_trainee_ids)
            risks = []
            for tid in assigned:
                risks.extend(OutcomeRiskService.list_risks(db, trainee_id=tid, risk_type=risk_type, severity=severity, status=status))
            return risks

    return OutcomeRiskService.list_risks(
        db=db,
        trainee_id=trainee_id,
        risk_type=risk_type,
        severity=severity,
        status=status
    )


@router.get("/summary", response_model=OutcomeRiskSummaryResponse)
def get_outcome_risks_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns executive aggregation of outcome risks by severity, canonical type, and status.
    """
    return OutcomeRiskService.get_summary(db)


@router.get("/{risk_id}", response_model=OutcomeRiskRead)
def get_outcome_risk_detail(
    risk_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves full detail of a specific OutcomeRisk with complete evidence and explainable signals.
    """
    risk = db.query(OutcomeRisk).filter(OutcomeRisk.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Risk {risk_id} not found.")

    verify_trainee_resource_access(risk.trainee_id, current_user, db)
    t = db.query(Trainee).filter(Trainee.id == risk.trainee_id).first()

    why = {
        "signal_1": risk.signals[0] if len(risk.signals) > 0 else "Signal: Metric deviation detected.",
        "signal_2": risk.signals[1] if len(risk.signals) > 1 else "Signal: Historical threshold anomaly.",
        "signal_3": risk.signals[2] if len(risk.signals) > 2 else "Signal: Predictive intervention trigger.",
        "evidence_breakdown": risk.evidence or {}
    }

    return OutcomeRiskRead(
        id=risk.id,
        trainee_id=risk.trainee_id,
        trainee_name=t.full_name if t else "Trainee",
        risk_type=risk.risk_type,
        severity=risk.severity,
        signals=risk.signals or [],
        evidence=risk.evidence or {},
        status=risk.status,
        recommended_intervention=risk.recommended_intervention,
        reassessment_record=risk.reassessment_record,
        created_at=risk.created_at,
        updated_at=risk.updated_at,
        risk_signal_label="RISK SIGNAL",
        why_explanation=why
    )


@router.post("/scan")
def scan_outcome_risks(
    trainee_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Executes automated outcome risk detection across all 10 signals and 6 risk types.
    Trainees are authorized to scan their own individual records.
    """
    user_role = (current_user.role or "").upper()
    if user_role == "TRAINEE":
        # Trainees can only scan their own records
        profile = current_user.trainee_profile
        t_id = profile.trainee_id if profile else None
        if not t_id:
            t_rec = db.query(Trainee).filter(Trainee.user_id == current_user.id).first()
            t_id = t_rec.id if t_rec else None

        if not t_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trainee profile not linked.")

        risks = OutcomeRiskService.scan_trainee_risks(db, t_id)
        return {"scanned_trainees": 1, "risks_generated": len(risks)}

    # Admin/Coach/Training Provider
    if user_role not in ["ADMIN", "COACH", "TRAINING_PROVIDER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to run bulk outcome risk scan."
        )

    if trainee_id:
        risks = OutcomeRiskService.scan_trainee_risks(db, trainee_id)
        return {"scanned_trainees": 1, "risks_generated": len(risks)}

    all_trainees = db.query(Trainee).all()
    total_risks = 0
    for t in all_trainees:
        try:
            r = OutcomeRiskService.scan_trainee_risks(db, t.id)
            total_risks += len(r)
        except Exception as e:
            logger.warning(f"Error scanning trainee {t.id}: {e}")

    return {"scanned_trainees": len(all_trainees), "risks_generated": total_risks}


# ========================================================
# INTERVENTION LOOP REST ENDPOINTS
# Risk -> Suggested intervention -> Accept/Reject -> In Progress -> Complete -> Reassessment -> Risk Recalculated -> Outcome Recorded
# ========================================================

@router.post("/{risk_id}/accept", response_model=OutcomeRiskRead)
def accept_risk_intervention(
    risk_id: str,
    action: Optional[OutcomeRiskActionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Intervention Loop Step 3a: Trainee/Coach accepts suggested remediation intervention.
    Transitions status to INTERVENTION_ACCEPTED and provisions TraineeIntervention.
    """
    risk = db.query(OutcomeRisk).filter(OutcomeRisk.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk not found.")
    verify_trainee_resource_access(risk.trainee_id, current_user, db)

    updated_risk = OutcomeRiskService.accept_intervention(db, risk_id, notes=action.reason_or_notes if action else None)
    return get_outcome_risk_detail(risk_id, current_user, db)


@router.post("/{risk_id}/reject", response_model=OutcomeRiskRead)
def reject_risk_intervention(
    risk_id: str,
    action: Optional[OutcomeRiskActionRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Intervention Loop Step 3b: Trainee/Coach rejects suggested remediation intervention.
    Transitions status to INTERVENTION_REJECTED with transparent reason audit.
    """
    risk = db.query(OutcomeRisk).filter(OutcomeRisk.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk not found.")
    verify_trainee_resource_access(risk.trainee_id, current_user, db)

    updated_risk = OutcomeRiskService.reject_intervention(db, risk_id, reason=action.reason_or_notes if action else "Declined by trainee")
    return get_outcome_risk_detail(risk_id, current_user, db)


@router.post("/{risk_id}/start", response_model=OutcomeRiskRead)
def start_risk_intervention(
    risk_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Intervention Loop Step 4a: Starts the intervention.
    Transitions status to INTERVENTION_IN_PROGRESS.
    """
    risk = db.query(OutcomeRisk).filter(OutcomeRisk.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk not found.")
    verify_trainee_resource_access(risk.trainee_id, current_user, db)

    updated_risk = OutcomeRiskService.start_intervention(db, risk_id)
    return get_outcome_risk_detail(risk_id, current_user, db)


@router.post("/{risk_id}/complete", response_model=OutcomeRiskRead)
def complete_risk_intervention(
    risk_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Intervention Loop Step 4b: Marks intervention tasks completed, enabling reassessment.
    Transitions status to INTERVENTION_COMPLETED.
    """
    risk = db.query(OutcomeRisk).filter(OutcomeRisk.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk not found.")
    verify_trainee_resource_access(risk.trainee_id, current_user, db)

    updated_risk = OutcomeRiskService.complete_intervention(db, risk_id)
    return get_outcome_risk_detail(risk_id, current_user, db)


@router.post("/{risk_id}/reassess", response_model=OutcomeRiskRead)
def reassess_risk(
    risk_id: str,
    req: OutcomeRiskReassessmentRequest,
    current_user: User = Depends(require_roles(["ADMIN", "COACH", "TRAINING_PROVIDER"])),
    db: Session = Depends(get_db)
):
    """
    Intervention Loop Steps 5, 6, 7:
    Reassessment -> Risk recalculated -> Outcome recorded.
    Recalculates risk severity based on verified reassessment score.
    If score >= 80%, transitions status to RESOLVED and severity to LOW.
    """
    risk = db.query(OutcomeRisk).filter(OutcomeRisk.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk not found.")

    updated_risk = OutcomeRiskService.submit_reassessment(db, risk_id, req)
    return get_outcome_risk_detail(risk_id, current_user, db)
