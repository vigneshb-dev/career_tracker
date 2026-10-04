from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.auth import (
    get_current_user,
    require_roles,
    verify_employer_resource_access,
    verify_employer_can_verify_trainee,
)
from app.models.entities import Employer, Trainee, User, EmployerFeedbackVerification
from app.schemas.schemas import (
    EmployerRead,
    EmployerVerificationCreate,
    EmployerVerificationRead,
    EvidenceHierarchySummary
)
from app.services.employer_verification_service import EmployerVerificationService

router = APIRouter(prefix="/employers", tags=["Employers"])

@router.get("", response_model=List[EmployerRead])
def list_employers(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Public listing of approved employer partners."""
    query = db.query(Employer)
    if search:
        query = query.filter(
            (Employer.name.ilike(f"%{search}%")) |
            (Employer.industry.ilike(f"%{search}%")) |
            (Employer.location.ilike(f"%{search}%"))
        )
    return query.all()


@router.post("/verify", response_model=EmployerVerificationRead, status_code=status.HTTP_201_CREATED)
def submit_employer_verification(
    payload: EmployerVerificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows authorized employers or platform administrators to verify employment, confirm role,
    provide competency ratings, identify skill gaps, and advance candidate evidence level.
    Enforces that only the authenticated employer representing that organization (or Admin) can submit.
    """
    employer = verify_employer_can_verify_trainee(
        employer_id=payload.employer_id,
        trainee_id=payload.trainee_id,
        current_user=current_user,
        db=db
    )

    # Ensure payload reflects the verified employer organization
    payload.employer_id = employer.id
    payload.employer_name = employer.name
    if not payload.reviewer_name or payload.reviewer_name == "Unknown":
        payload.reviewer_name = current_user.full_name
    if not payload.reviewer_email:
        payload.reviewer_email = current_user.email

    try:
        return EmployerVerificationService.submit_verification(db, payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to submit employer verification: {str(e)}"
        )


@router.get("/verifications", response_model=List[EmployerVerificationRead])
def list_employer_verifications(
    employer_id: Optional[str] = Query(None),
    trainee_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves submitted employer verification records with strict ownership scoping:
    - EMPLOYER: Can only view verifications submitted by their own organization.
    - TRAINEE: Can only view verifications for their own profile.
    - COACH / TRAINING_PROVIDER / ADMIN / ANALYST: Authorized overview access.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role == "EMPLOYER":
        user_emp_id = current_user.employer_profile.employer_id if current_user.employer_profile else None
        if not user_emp_id:
            return []
        employer_id = user_emp_id
    elif user_role == "TRAINEE":
        trn_id = None
        if current_user.trainee_profile and current_user.trainee_profile.trainee_id:
            trn_id = current_user.trainee_profile.trainee_id
        else:
            t_rec = db.query(Trainee).filter((Trainee.user_id == current_user.id) | (Trainee.email == current_user.email)).first()
            if t_rec:
                trn_id = t_rec.id
        if not trn_id:
            return []
        trainee_id = trn_id

    return EmployerVerificationService.get_verifications(db, employer_id, trainee_id)


@router.get("/evidence-hierarchy", response_model=EvidenceHierarchySummary)
def get_evidence_hierarchy_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns cohort statistics across evidence tiers:
    Self-reported -> Employer-confirmed -> Evidence-backed -> Multi-source verified.
    """
    return EmployerVerificationService.get_evidence_hierarchy_summary(db)


def _fetch_candidates_for_employer(id: str, current_user: User, db: Session):
    employer = verify_employer_resource_access(id, current_user, db)
    emp_name = (employer.name or "").strip().lower()

    trainees = db.query(Trainee).all()
    results = []
    for t in trainees:
        # Check if this employer has already officially verified this trainee
        existing_ver = db.query(EmployerFeedbackVerification).filter(
            EmployerFeedbackVerification.trainee_id == t.id,
            (EmployerFeedbackVerification.employer_id == employer.id) |
            (EmployerFeedbackVerification.employer_name.ilike(employer.name))
        ).first()

        matching_outcome = None
        has_pending_outcome = False
        for out in (t.outcome_history or []):
            org = (out.get("organization_or_venture") or "").strip().lower()
            if emp_name and org and (org in emp_name or emp_name in org):
                if matching_outcome is None or out.get("verification_status") == "pending":
                    matching_outcome = out
                if out.get("verification_status") == "pending":
                    has_pending_outcome = True

        current_emp_str = (t.current_employer or "").strip().lower()
        is_direct_employer = bool(emp_name and current_emp_str and (emp_name in current_emp_str or current_emp_str in emp_name))
        is_direct_match = bool(is_direct_employer or matching_outcome or existing_ver)

        role = t.current_role or "In Training / Awaiting Placement"
        salary = t.placement_salary
        reported_date = t.placement_date
        evidence_level = getattr(t, "evidence_level", "self_reported") or "self_reported"
        is_verified = bool(existing_ver is not None and not has_pending_outcome)

        if has_pending_outcome:
            has_pending = True
            if matching_outcome:
                role = matching_outcome.get("role_or_course") or role
                salary = matching_outcome.get("compensation_or_funding") or salary
                reported_date = matching_outcome.get("start_date") or reported_date
                outcome_status = "pending"
        elif existing_ver:
            role = existing_ver.confirmed_role or role
            salary = existing_ver.salary_range or salary
            reported_date = existing_ver.confirmed_start_date or reported_date
            outcome_status = existing_ver.verification_status
            evidence_level = existing_ver.evidence_level or evidence_level
            has_pending = False
        else:
            if matching_outcome:
                role = matching_outcome.get("role_or_course") or role
                salary = matching_outcome.get("compensation_or_funding") or salary
                reported_date = matching_outcome.get("start_date") or reported_date
                outcome_status = matching_outcome.get("verification_status", "pending")
            elif is_direct_employer:
                outcome_status = "pending" if getattr(t, "evidence_level", "self_reported") == "self_reported" else "verified"
            else:
                outcome_status = "unreported"

            has_pending = bool(is_direct_employer and getattr(t, "evidence_level", "self_reported") == "self_reported")

        skills_list = [s.name for s in t.skills if s.name] if t.skills else []

        results.append({
            "trainee_id": t.id,
            "trainee_name": t.full_name,
            "program": t.program,
            "cohort": t.cohort,
            "status": t.status,
            "current_role": role,
            "current_employer": existing_ver.employer_name if existing_ver else (t.current_employer or (employer.name if matching_outcome else None)),
            "placement_salary": salary,
            "reported_start_date": reported_date,
            "evidence_level": evidence_level,
            "is_direct_match": bool(is_direct_match),
            "is_verified": bool(is_verified),
            "has_pending": bool(has_pending),
            "verification_id": existing_ver.id if existing_ver else None,
            "outcome_status": outcome_status,
            "skills": skills_list
        })

    # Sort results: Direct matches with pending verification first, then verified direct matches, then others
    results.sort(key=lambda c: (
        not (c["is_direct_match"] and c["has_pending"]),
        not (c["is_direct_match"] and c["is_verified"]),
        not c["is_direct_match"],
        c["trainee_name"]
    ))
    return results


@router.get("/pending-candidates")
def get_all_pending_candidates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns pending candidates for current user's employer organization or cohort.
    """
    return _fetch_candidates_for_employer("all", current_user, db)


@router.get("/{id}/pending-candidates")
def get_pending_candidates_for_employer(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns candidates who have indicated this employer or match candidate profile for verification.
    Restricted to the authenticated employer managing this organization or Admin.
    """
    return _fetch_candidates_for_employer(id, current_user, db)
