import os
import re
import uuid
import logging
import tempfile
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Body, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user, require_roles, verify_trainee_resource_access
from app.models.entities import User, Trainee, TraineeProfile, ResumeAnalysisRecord
from app.services.resume_analyzer_service import ResumeAnalyzerService
from app.core.ontology_data import SKILLS_DATA
from app.schemas.schemas import (
    TraineeCreate,
    TraineeUpdate,
    TraineeRead,
    PaginatedTraineeResponse,
    ConsentUpdateRequest,
    OutcomeAddRequest,
    OutcomeUpdateRequest,
    FollowUpAddRequest,
    CertificationAddRequest,
    CertificationUpdateRequest,
    AssessmentAddRequest,
    TrainingRecordCreate,
    TrainingRecordUpdate,
    TrainingRecordVerifyRequest,
    TrainingRecordRead,
    PassportEventRead,
    TraineeProfileUpdateRequest,
    CareerGoalsUpdateRequest,
    SkillAddRequest,
    SkillUpdateRequest,
    SkillVerifyRequest,
    FollowUpResponseRequest,
    OutcomeVerifyRequest,
    CertificationVerifyRequest,
)
from app.services.trainee_service import TraineeService

logger = logging.getLogger("skilltrace.trainees_router")

router = APIRouter(prefix="/trainees", tags=["Trainee Outcome Passport"])

RESUME_UPLOAD_DIR = os.getenv(
    "RESUME_UPLOAD_DIR",
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "uploads",
        "resumes"
    )
)
try:
    os.makedirs(RESUME_UPLOAD_DIR, exist_ok=True)
except Exception:
    pass


def _get_caller_trainee(current_user: User, db: Session) -> Trainee:
    """Helper to locate authenticated caller's own Trainee record."""
    trainee = db.query(Trainee).filter(
        (Trainee.user_id == current_user.id) | 
        (Trainee.email.ilike(current_user.email))
    ).first()
    if not trainee and current_user.trainee_profile and current_user.trainee_profile.trainee_id:
        trainee = db.query(Trainee).filter(Trainee.id == current_user.trainee_profile.trainee_id).first()
    if not trainee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Trainee Outcome Passport registered for this user account."
        )
    return trainee


def _build_passport_response(trainee: Trainee, db: Session) -> Dict[str, Any]:
    """Helper that packages full longitudinal outcome passport data."""
    training_records = TraineeService.get_training_records(db, trainee)
    timeline = TraineeService.get_timeline(db, trainee.id)
    audit_history = TraineeService.get_audit_history(db, trainee.id)
    detailed_skills = TraineeService.get_detailed_skills(db, trainee)

    skills_count = len(trainee.skills)
    certs_count = len(trainee.certifications or [])
    outcomes_count = len(trainee.outcome_history or [])
    followups_count = len(trainee.follow_up_history or [])
    training_count = len(training_records)

    verified_outcomes_count = len([o for o in (trainee.outcome_history or []) if o.get("verification_status") == "verified"])
    verified_training_count = len([r for r in training_records if getattr(r, "verification_status", "") == "verified"])
    verified_skills_count = len([s for s in trainee.skills if getattr(s, "verified", False)])
    verified_certs_count = len([c for c in (trainee.certifications or []) if c.get("verification_status") == "verified" or c.get("status") in ["verified", "Active"]])

    return {
        "trainee": TraineeRead.from_orm(trainee),
        "passport_id": trainee.id,
        "is_locked_id": True,
        "evidence_level": trainee.evidence_level,
        "counts": {
            "skills": skills_count,
            "certifications": certs_count,
            "skills_and_certifications": skills_count + certs_count,
            "outcomes": outcomes_count,
            "followups": followups_count,
            "training": training_count,
            "verified_outcomes": verified_outcomes_count,
            "verified_training": verified_training_count,
            "verified_skills": verified_skills_count,
            "verified_certifications": verified_certs_count,
        },
        "stats": {
            "skills_count": skills_count,
            "certifications_count": certs_count,
            "outcomes_count": outcomes_count,
            "follow_ups_count": followups_count,
            "training_count": training_count,
            "events_count": len(timeline),
            "verified_outcomes_count": verified_outcomes_count,
            "verified_training_count": verified_training_count,
            "verified_skills_count": verified_skills_count,
            "verified_certifications_count": verified_certs_count,
        },
        "training_records": [
            TrainingRecordRead.from_orm(r) for r in training_records
        ],
        "skills": detailed_skills,
        "certifications": trainee.certifications or [],
        "career_goals": trainee.career_preference or {},
        "outcomes": trainee.outcome_history or [],
        "followups": trainee.follow_up_history or [],
        "timeline": timeline,
        "audit_history": audit_history,
    }


# ========================================================
# /me Self-Service Routes (Trainee Outcome Passport)
# ========================================================

@router.get("/me", response_model=TraineeRead)
def get_my_trainee_record(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Convenience endpoint returning the authenticated caller's own Trainee record."""
    return _get_caller_trainee(current_user, db)


@router.get("/me/passport")
def get_my_passport(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Convenience endpoint returning the authenticated caller's own Outcome Passport."""
    trainee = _get_caller_trainee(current_user, db)
    return _build_passport_response(trainee, db)


@router.patch("/me/profile")
def update_my_profile(
    payload: TraineeProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trainee updates own permitted personal profile & career preference fields."""
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot modify trainee's personal profile.")
    trainee = _get_caller_trainee(current_user, db)
    updated = TraineeService.update_profile(
        db=db,
        trainee=trainee,
        updates=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )
    return {
        "success": True,
        "message": "Profile updated successfully.",
        "trainee": TraineeRead.from_orm(updated)
    }


@router.get("/me/training", response_model=List[TrainingRecordRead])
def get_my_training(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = _get_caller_trainee(current_user, db)
    return TraineeService.get_training_records(db, trainee)


@router.post("/me/training", status_code=201)
def add_my_training(
    payload: TrainingRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot add trainee training records.")
    trainee = _get_caller_trainee(current_user, db)
    record = TraineeService.add_training_record(
        db=db,
        trainee=trainee,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )
    rec_dict = TrainingRecordRead.from_orm(record).model_dump()
    return {
        "success": True,
        "message": "Training submitted for verification." if record.verification_status == "pending" else "Training record added.",
        "record": rec_dict,
        **rec_dict
    }


@router.patch("/me/training/{record_id}")
def update_my_training(
    record_id: str,
    payload: TrainingRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot modify trainee training records.")
    trainee = _get_caller_trainee(current_user, db)
    record = TraineeService.update_training_record(
        db=db,
        trainee=trainee,
        record_id=record_id,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )
    rec_dict = TrainingRecordRead.from_orm(record).model_dump()
    return {
        "success": True,
        "message": "Training update submitted for verification." if record.verification_status == "pending" else "Training record updated.",
        "record": rec_dict,
        **rec_dict
    }


@router.post("/me/training/{record_id}/verification-request")
def request_my_training_verification(
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = _get_caller_trainee(current_user, db)
    record = TraineeService.request_training_verification(
        db=db,
        trainee=trainee,
        record_id=record_id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )
    return {
        "success": True,
        "message": "Verification request submitted to training provider/coach.",
        "record": TrainingRecordRead.from_orm(record)
    }


@router.get("/me/skills")
def get_my_skills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = _get_caller_trainee(current_user, db)
    return TraineeService.get_detailed_skills(db, trainee)


@router.post("/me/skills")
def add_my_skill(
    payload: SkillAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot add trainee skills.")
    trainee = _get_caller_trainee(current_user, db)
    return TraineeService.add_skill(
        db=db,
        trainee=trainee,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.patch("/me/skills/{skill_id}")
def update_my_skill(
    skill_id: str,
    payload: SkillUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot modify trainee skills.")
    trainee = _get_caller_trainee(current_user, db)
    return TraineeService.update_skill(
        db=db,
        trainee=trainee,
        skill_id=skill_id,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.post("/me/certifications", response_model=TraineeRead)
def add_my_certification(
    payload: CertificationAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot upload trainee certifications.")
    trainee = _get_caller_trainee(current_user, db)
    return TraineeService.add_certification(
        db=db,
        trainee=trainee,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.patch("/me/certifications/{cert_id}", response_model=TraineeRead)
def update_my_certification(
    cert_id: str,
    payload: CertificationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot modify trainee certifications.")
    trainee = _get_caller_trainee(current_user, db)
    return TraineeService.update_certification(
        db=db,
        trainee=trainee,
        cert_id=cert_id,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.post("/me/resume/analyze")
async def analyze_my_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = _get_caller_trainee(current_user, db)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Resume file exceeds 10 MiB size limit.")
    try:
        return ResumeAnalyzerService.process_and_record_resume(
            db=db,
            trainee=trainee,
            file_bytes=content,
            filename=file.filename,
            upload_dir=RESUME_UPLOAD_DIR,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            actor_id=current_user.id
        )
    except Exception as exc:
        logger.error(f"Error analyzing resume: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/me/career-goals")
def get_my_career_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = _get_caller_trainee(current_user, db)
    return trainee.career_preference or {}


@router.patch("/me/career-goals")
def update_my_career_goals(
    payload: CareerGoalsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot modify trainee career goals.")
    trainee = _get_caller_trainee(current_user, db)
    return TraineeService.update_career_goals(
        db=db,
        trainee=trainee,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.get("/me/outcomes")
def get_my_outcomes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = _get_caller_trainee(current_user, db)
    return trainee.outcome_history or []


@router.post("/me/outcomes", response_model=TraineeRead)
def add_my_outcome(
    payload: OutcomeAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = _get_caller_trainee(current_user, db)
    return TraineeService.add_outcome(
        db=db,
        trainee=trainee,
        outcome=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.patch("/me/outcomes/{outcome_id}", response_model=TraineeRead)
def update_my_outcome(
    outcome_id: str,
    payload: OutcomeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = _get_caller_trainee(current_user, db)
    return TraineeService.update_outcome(
        db=db,
        trainee=trainee,
        outcome_id=outcome_id,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.get("/me/follow-ups")
@router.get("/me/followups", include_in_schema=False)
def get_my_followups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = _get_caller_trainee(current_user, db)
    return trainee.follow_up_history or []


@router.post("/me/follow-ups/{followup_id}/respond", response_model=TraineeRead)
@router.post("/me/followups/{followup_id}/respond", response_model=TraineeRead, include_in_schema=False)
def respond_my_followup(
    followup_id: str,
    payload: FollowUpResponseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = _get_caller_trainee(current_user, db)
    return TraineeService.respond_to_follow_up(
        db=db,
        trainee=trainee,
        followup_id=followup_id,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.get("/me/passport/timeline")
def get_my_timeline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = _get_caller_trainee(current_user, db)
    return TraineeService.get_timeline(db, trainee.id)


@router.get("/me/audit-history")
def get_my_audit_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = _get_caller_trainee(current_user, db)
    return TraineeService.get_audit_history(db, trainee.id)


@router.get("", response_model=List[TraineeRead])
def list_trainees(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    program: Optional[str] = Query(None),
    outcome_type: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists trainees scoped strictly by authenticated caller's role:
    - TRAINEE: restricted to their own record only
    - COACH: restricted to assigned trainees only
    - EMPLOYER: restricted to verified talent pool
    - ADMIN: full visibility across all trainees
    """
    user_role = (current_user.role or "").upper()

    if user_role == "TRAINEE":
        trainee = db.query(Trainee).filter(
            (Trainee.user_id == current_user.id) | 
            (Trainee.email == current_user.email)
        ).first()
        if not trainee and current_user.trainee_profile and current_user.trainee_profile.trainee_id:
            trainee = db.query(Trainee).filter(Trainee.id == current_user.trainee_profile.trainee_id).first()
        return [trainee] if trainee else []

    elif user_role == "COACH":
        coach_profile = current_user.coach_profile
        assigned_ids = set(coach_profile.assigned_trainee_ids or []) if coach_profile else set()
        if coach_profile and coach_profile.training_institute_id:
            from app.models.entities import Enrollment
            enrolled = db.query(Enrollment.trainee_id).filter(Enrollment.training_institute_id == coach_profile.training_institute_id).all()
            for (t_id,) in enrolled:
                if t_id:
                    assigned_ids.add(t_id)
        if not assigned_ids:
            return []
        query = db.query(Trainee).filter(Trainee.id.in_(list(assigned_ids)))
        if search:
            query = query.filter(Trainee.full_name.ilike(f"%{search}%"))
        return query.offset(skip).limit(limit).all()

    elif user_role == "EMPLOYER":
        employer_profile = current_user.employer_profile
        auth_ids = set(employer_profile.authorized_candidate_ids or []) if employer_profile else set()
        if employer_profile and employer_profile.company_id:
            from app.models.entities import JobApplication
            applied = db.query(JobApplication.trainee_id).filter(JobApplication.company_id == employer_profile.company_id).all()
            for (t_id,) in applied:
                if t_id:
                    auth_ids.add(t_id)
        query = db.query(Trainee)
        if auth_ids:
            query = query.filter(Trainee.id.in_(list(auth_ids)))
        return query.offset(skip).limit(limit).all()

    return TraineeService.get_trainees(
        db,
        search=search,
        status=status,
        program=program,
        outcome_type=outcome_type,
        skip=skip,
        limit=limit
    )


@router.get("/paginated/list", response_model=PaginatedTraineeResponse)
def list_trainees_paginated(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    program: Optional[str] = Query(None),
    outcome_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_role = (current_user.role or "").upper()
    allowed_ids = None

    if user_role == "TRAINEE":
        trainee = db.query(Trainee).filter(
            (Trainee.user_id == current_user.id) | 
            (Trainee.email == current_user.email)
        ).first()
        if not trainee and current_user.trainee_profile and current_user.trainee_profile.trainee_id:
            trainee = db.query(Trainee).filter(Trainee.id == current_user.trainee_profile.trainee_id).first()
        items = [trainee] if trainee else []
        return {
            "items": items,
            "total": len(items),
            "page": 1,
            "page_size": page_size,
            "total_pages": 1 if items else 0
        }

    elif user_role == "COACH":
        coach_profile = current_user.coach_profile
        assigned_ids = set(coach_profile.assigned_trainee_ids or []) if coach_profile else set()
        if coach_profile and coach_profile.training_institute_id:
            from app.models.entities import Enrollment
            enrolled = db.query(Enrollment.trainee_id).filter(Enrollment.training_institute_id == coach_profile.training_institute_id).all()
            for (t_id,) in enrolled:
                if t_id:
                    assigned_ids.add(t_id)
        allowed_ids = list(assigned_ids)

    elif user_role == "EMPLOYER":
        employer_profile = current_user.employer_profile
        auth_ids = set(employer_profile.authorized_candidate_ids or []) if employer_profile else set()
        if employer_profile and employer_profile.company_id:
            from app.models.entities import JobApplication
            applied = db.query(JobApplication.trainee_id).filter(JobApplication.company_id == employer_profile.company_id).all()
            for (t_id,) in applied:
                if t_id:
                    auth_ids.add(t_id)
        if auth_ids:
            allowed_ids = list(auth_ids)

    items, total, total_pages = TraineeService.get_paginated_trainees(
        db,
        search=search,
        status=status,
        program=program,
        outcome_type=outcome_type,
        allowed_trainee_ids=allowed_ids,
        page=page,
        page_size=page_size
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/{trainee_id}", response_model=TraineeRead)
def get_trainee(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enforces strict resource-level authorization: Trainees can only view their own profile."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return trainee


@router.get("/{trainee_id}/passport")
def get_trainee_passport(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the complete Living Trainee Outcome Passport:
    - Overview & Profile with state flags
    - Training Programme Records (accredited baseline + trainee-added)
    - Dynamic Skills & Certifications with source breakdown
    - Career Pathway & Goals
    - Longitudinal Outcome History
    - Retention Follow-Ups & Immutable Audit Trail
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return _build_passport_response(trainee, db)


@router.post("", response_model=TraineeRead, status_code=201)
def create_trainee(
    payload: TraineeCreate,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Administrative trainee provisioning."""
    return TraineeService.create(db, payload)


@router.put("/{trainee_id}", response_model=TraineeRead)
def update_trainee(
    trainee_id: str,
    payload: TraineeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enforces resource ownership: Trainees can edit only their own profile; Coaches/Admins can edit assigned records."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.update(db, trainee, payload)


@router.patch("/{trainee_id}/profile")
def update_trainee_profile_fields(
    trainee_id: str,
    payload: TraineeProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trainee-editable personal profile & career preference endpoint.
    Preserves verified data, audits diffs, logs previous values.
    Supports OUTCOME_UNKNOWN status without treating missing data as unemployed.
    """
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot modify trainee's personal profile.")
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    updated = TraineeService.update_profile(
        db=db,
        trainee=trainee,
        updates=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )
    return {
        "success": True,
        "message": "Profile updated successfully.",
        "trainee": TraineeRead.from_orm(updated)
    }


# ========================================================
# Training Programme & Provider Routes
# ========================================================

@router.get("/{trainee_id}/training", response_model=List[TrainingRecordRead])
def get_trainee_training(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all accredited training records for trainee."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.get_training_records(db, trainee)


@router.post("/{trainee_id}/training", status_code=201)
def add_trainee_training(
    trainee_id: str,
    payload: TrainingRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Allows trainee to add training programme.
    New trainee-entered training defaults to 'pending' verification.
    """
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot add trainee training records.")
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    record = TraineeService.add_training_record(
        db=db,
        trainee=trainee,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )
    rec_dict = TrainingRecordRead.from_orm(record).model_dump()
    return {
        "success": True,
        "message": "Training submitted for verification." if record.verification_status == "pending" else "Training record added.",
        "record": rec_dict,
        **rec_dict
    }


@router.patch("/{trainee_id}/training/{record_id}")
def update_trainee_training(
    trainee_id: str,
    record_id: str,
    payload: TrainingRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates training programme. If trainee edits a verified record,
    preserves previous verified value in history and sets status to pending.
    """
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot modify trainee training records.")
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    record = TraineeService.update_training_record(
        db=db,
        trainee=trainee,
        record_id=record_id,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )
    rec_dict = TrainingRecordRead.from_orm(record).model_dump()
    return {
        "success": True,
        "message": "Training update submitted for verification." if record.verification_status == "pending" else "Training record updated.",
        "record": rec_dict,
        **rec_dict
    }


@router.post("/{trainee_id}/training/{record_id}/verification-request")
def request_trainee_training_verification(
    trainee_id: str,
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    record = TraineeService.request_training_verification(
        db=db,
        trainee=trainee,
        record_id=record_id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )
    return {
        "success": True,
        "message": "Verification request submitted to training provider/coach.",
        "record": TrainingRecordRead.from_orm(record)
    }


@router.patch("/{trainee_id}/training/{record_id}/verify")
def verify_training_record(
    trainee_id: str,
    record_id: str,
    payload: TrainingRecordVerifyRequest,
    current_user: User = Depends(require_roles(["COACH", "ADMIN", "VERIFICATION_AUTHORITY", "AUDITOR"])),
    db: Session = Depends(get_db)
):
    """Allows assigned Coach, Admin, or Verification Authority to officially verify a training record."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    try:
        record = TraineeService.verify_training_record(
            db=db,
            trainee=trainee,
            record_id=record_id,
            payload=payload,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            actor_id=current_user.id
        )
        rec_dict = TrainingRecordRead.from_orm(record).model_dump()
        return {
            "success": True,
            "message": f"Training record marked as {record.verification_status}.",
            "record": rec_dict,
            **rec_dict
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ========================================================
# Skills & Evidence Routes
# ========================================================

@router.get("/{trainee_id}/skills")
def get_trainee_skills(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all trainee skills with detailed source metadata, confidence, and verification breakdown."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.get_detailed_skills(db, trainee)


@router.post("/{trainee_id}/skills")
def add_trainee_skill(
    trainee_id: str,
    payload: SkillAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trainee adds a skill with self-rating & practical evidence.
    Normalizes equivalents to canonical skill taxonomy.
    Triggers 0-5 scoring & gap recalculation.
    """
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot add trainee skills.")
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.add_skill(
        db=db,
        trainee=trainee,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.patch("/{trainee_id}/skills/{skill_id}")
def update_trainee_skill(
    trainee_id: str,
    skill_id: str,
    payload: SkillUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot modify trainee skills.")
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.update_skill(
        db=db,
        trainee=trainee,
        skill_id=skill_id,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.patch("/{trainee_id}/skills/{skill_id}/verify")
def verify_trainee_skill(
    trainee_id: str,
    skill_id: str,
    payload: SkillVerifyRequest,
    current_user: User = Depends(require_roles(["COACH", "ADMIN", "VERIFICATION_AUTHORITY", "AUDITOR"])),
    db: Session = Depends(get_db)
):
    """Coach assesses and officially verifies a trainee skill."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    try:
        return TraineeService.verify_skill(
            db=db,
            trainee=trainee,
            skill_id=skill_id,
            score=payload.score,
            notes=payload.notes or "",
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            actor_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ========================================================
# Career Pathway & Goals Routes
# ========================================================

@router.get("/{trainee_id}/career-goals")
def get_trainee_career_goals(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return trainee.career_preference or {}


@router.patch("/{trainee_id}/career-goals")
def update_trainee_career_goals(
    trainee_id: str,
    payload: CareerGoalsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trainee updates target role, salary band, and workplace preference.
    Triggers live skill gaps recalculation without overwriting trainee choice.
    """
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot modify trainee career goals.")
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.update_career_goals(
        db=db,
        trainee=trainee,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


# ========================================================
# Outcome History Routes
# ========================================================

@router.get("/{trainee_id}/outcomes")
def get_trainee_outcomes(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return trainee.outcome_history or []


@router.post("/{trainee_id}/outcomes", response_model=TraineeRead)
def add_outcome(
    trainee_id: str,
    payload: OutcomeAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trainee, Coach, or Admin reports a placement/venture outcome.
    Trainee-reported outcomes start as 'pending' verification.
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.add_outcome(
        db=db,
        trainee=trainee,
        outcome=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.patch("/{trainee_id}/outcomes/{outcome_id}", response_model=TraineeRead)
def update_outcome(
    trainee_id: str,
    outcome_id: str,
    payload: OutcomeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.update_outcome(
        db=db,
        trainee=trainee,
        outcome_id=outcome_id,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.patch("/{trainee_id}/outcomes/{outcome_id}/verify", response_model=TraineeRead)
def verify_outcome(
    trainee_id: str,
    outcome_id: str,
    payload: OutcomeVerifyRequest,
    current_user: User = Depends(require_roles(["EMPLOYER", "COACH", "ADMIN", "VERIFICATION_AUTHORITY", "AUDITOR"])),
    db: Session = Depends(get_db)
):
    """
    Employer or Coach verifies an employment/career outcome.
    Elevates evidence level and records immutable verification event.
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.verify_outcome(
        db=db,
        trainee=trainee,
        outcome_id=outcome_id,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


# ========================================================
# Follow-Ups & Longitudinal Audits
# ========================================================

@router.get("/{trainee_id}/follow-ups")
@router.get("/{trainee_id}/followups", include_in_schema=False)
def get_trainee_followups(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return trainee.follow_up_history or []


@router.post("/{trainee_id}/follow-ups", response_model=TraineeRead)
def add_follow_up(
    trainee_id: str,
    payload: FollowUpAddRequest,
    current_user: User = Depends(require_roles(["ADMIN", "COACH", "VERIFICATION_AUTHORITY", "AUDITOR"])),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.add_follow_up(db, trainee, payload)


@router.post("/{trainee_id}/follow-ups/{followup_id}/respond", response_model=TraineeRead)
@router.post("/{trainee_id}/followups/{followup_id}/respond", response_model=TraineeRead, include_in_schema=False)
def respond_follow_up(
    trainee_id: str,
    followup_id: str,
    payload: FollowUpResponseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trainee responds to scheduled retention check-in (30, 90, 180, 365 days).
    Captures employment status, salary, skill usage, and creates a passport audit event.
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.respond_to_follow_up(
        db=db,
        trainee=trainee,
        followup_id=followup_id,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


# ========================================================
# Certifications & Assessments
# ========================================================

@router.post("/{trainee_id}/certifications", response_model=TraineeRead)
def add_certification(
    trainee_id: str,
    payload: CertificationAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot upload trainee certifications.")
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.add_certification(
        db=db,
        trainee=trainee,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.patch("/{trainee_id}/certifications/{cert_id}", response_model=TraineeRead)
def update_trainee_certification(
    trainee_id: str,
    cert_id: str,
    payload: CertificationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if (current_user.role or "").upper() == "EMPLOYER":
        raise HTTPException(status_code=403, detail="Employers cannot modify trainee certifications.")
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.update_certification(
        db=db,
        trainee=trainee,
        cert_id=cert_id,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.patch("/{trainee_id}/certifications/{cert_id}/verify", response_model=TraineeRead)
def verify_trainee_certification(
    trainee_id: str,
    cert_id: str,
    payload: CertificationVerifyRequest,
    current_user: User = Depends(require_roles(["COACH", "ADMIN", "VERIFICATION_AUTHORITY", "AUDITOR"])),
    db: Session = Depends(get_db)
):
    """
    Allows Coach, Admin, or Verification Authority to officially verify a certification credential.
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.verify_certification(
        db=db,
        trainee=trainee,
        cert_id=cert_id,
        payload=payload,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id
    )


@router.post("/{trainee_id}/assessments", response_model=TraineeRead)
def add_assessment(
    trainee_id: str,
    payload: AssessmentAddRequest,
    current_user: User = Depends(require_roles(["ADMIN", "COACH", "VERIFICATION_AUTHORITY", "AUDITOR"])),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.add_assessment(db, trainee, payload)


# ========================================================
# Timeline & Immutable Audit History
# ========================================================

@router.get("/{trainee_id}/timeline")
@router.get("/{trainee_id}/passport/timeline")
def get_passport_timeline(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns chronological timeline of career milestones and verified updates."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.get_timeline(db, trainee.id)


@router.get("/{trainee_id}/audit-history")
def get_passport_audit_history(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns immutable audit log for governance and compliance."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.get_audit_history(db, trainee.id)


# ========================================================
# Resume Analyzer Integration
# ========================================================

# Canonical: POST /{trainee_id}/resume/analyze
# Compatibility aliases: POST /{trainee_id}/resume, POST /{trainee_id}/analyze-resume
@router.post("/{trainee_id}/resume/analyze", tags=["AI Resume Analyzer"])
@router.post("/{trainee_id}/resume", include_in_schema=False)
@router.post("/{trainee_id}/analyze-resume", include_in_schema=False)
async def upload_trainee_resume(
    trainee_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Canonical Endpoint: Upload and analyze trainee resume in real time.
    Extracts skills, matches target ontology, updates profile, and creates audit passport event.
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Resume file exceeds 10 MiB size limit.")
    try:
        return ResumeAnalyzerService.process_and_record_resume(
            db=db,
            trainee=trainee,
            file_bytes=content,
            filename=file.filename,
            upload_dir=RESUME_UPLOAD_DIR,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            actor_id=current_user.id
        )
    except Exception as exc:
        logger.error(f"Error analyzing resume for trainee {trainee.id}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze resume: {str(exc)}"
        )


# Canonical: POST /{trainee_id}/resume/reanalyze
# Compatibility alias: POST /{trainee_id}/reanalyze-resume
@router.post("/{trainee_id}/resume/reanalyze", tags=["AI Resume Analyzer"])
@router.post("/{trainee_id}/reanalyze-resume", include_in_schema=False)
def reanalyze_trainee_resume(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    profile = db.query(TraineeProfile).filter(TraineeProfile.trainee_id == trainee.id).first()
    if not profile or not profile.resume_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No uploaded resume found to re-analyze. Please upload a resume first."
        )

    rel_path = profile.resume_url.replace("/uploads/resumes/", "")
    file_path = os.path.join(RESUME_UPLOAD_DIR, rel_path)
    
    content = b""
    if os.path.exists(file_path):
        with open(file_path, "rb") as f:
            content = f.read()
    else:
        content = (profile.resume_text or "").encode("utf-8")

    result = ResumeAnalyzerService.analyze_and_integrate_resume(
        db=db,
        trainee_id=trainee.id,
        file_bytes=content,
        filename=profile.resume_filename or "resume.pdf",
        file_url=profile.resume_url
    )

    TraineeService.log_passport_event(
        db=db,
        trainee_id=trainee.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_id=current_user.id,
        event_type="RESUME_ANALYZED",
        action=f"AI Resume Analyzer re-scanned stored resume ({len(result.get('extracted_skills', []))} skills synchronized)",
        entity_type="RESUME",
        entity_id=profile.resume_filename or "resume.pdf",
        previous_value=None,
        new_value={"skills_detected": len(result.get("extracted_skills", []))},
        source="RESUME_ANALYZER",
        verification_status="AI_EXTRACTED",
        notes="Stored resume re-analyzed with updated canonical taxonomy."
    )

    return {
        "success": True,
        "message": f"Resume re-analyzed. {len(result.get('extracted_skills', []))} skills synchronized.",
        **result
    }


@router.get("/{trainee_id}/latest-resume-analysis")
def get_latest_resume_analysis(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    record = (
        db.query(ResumeAnalysisRecord)
        .filter(ResumeAnalysisRecord.trainee_id == trainee.id)
        .order_by(ResumeAnalysisRecord.analyzed_at.desc())
        .first()
    )

    if not record:
        return {"has_analysis": False, "analysis": None}

    return {
        "has_analysis": True,
        "analysis": {
            "analysis_id": record.id,
            "trainee_id": record.trainee_id,
            "filename": record.filename,
            "file_url": record.file_url,
            "file_type": record.file_type,
            "analyzed_at": record.analyzed_at,
            "extracted_metadata": record.extracted_metadata,
            "skills_profile": record.skills_profile,
            "skills_count": len(record.skills_profile or []),
            "completeness_score": record.completeness_score,
            "completeness_label": "System-Generated Section & Evidence Completeness Indicator (Not an objective employability score)",
            "completeness_breakdown": record.completeness_breakdown,
            "job_matches": record.job_matches,
            "skill_gaps": record.skill_gaps,
            "recommendations": record.recommendations,
        }
    }


@router.get("/{trainee_id}/resume")
def get_trainee_resume_info(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    profile = db.query(TraineeProfile).filter(TraineeProfile.trainee_id == trainee.id).first()
    latest_record = (
        db.query(ResumeAnalysisRecord)
        .filter(ResumeAnalysisRecord.trainee_id == trainee.id)
        .order_by(ResumeAnalysisRecord.analyzed_at.desc())
        .first()
    )

    if not profile or not profile.resume_filename:
        return {
            "has_resume": False,
            "filename": None,
            "resume_url": None,
            "extracted_skills": [],
            "analysis": None
        }

    analysis_data = None
    if latest_record:
        analysis_data = {
            "analysis_id": latest_record.id,
            "analyzed_at": latest_record.analyzed_at,
            "completeness_score": latest_record.completeness_score,
            "completeness_label": "System-Generated Section & Evidence Completeness Indicator (Not an objective employability score)",
            "completeness_breakdown": latest_record.completeness_breakdown,
            "skills_profile": latest_record.skills_profile,
            "skills_count": len(latest_record.skills_profile or []),
            "extracted_metadata": latest_record.extracted_metadata,
            "job_matches": latest_record.job_matches,
            "skill_gaps": latest_record.skill_gaps,
            "recommendations": latest_record.recommendations,
        }

    return {
        "has_resume": True,
        "filename": profile.resume_filename,
        "resume_url": profile.resume_url,
        "extracted_skills": profile.resume_parsed_skills or [],
        "analysis": analysis_data
    }


@router.put("/{trainee_id}/consent", response_model=TraineeRead)
def update_consent(
    trainee_id: str,
    payload: ConsentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db, require_write=True)
    try:
        return TraineeService.update_consent(
            db=db,
            trainee=trainee,
            payload=payload,
            actor_name=current_user.full_name,
            actor_role=current_user.role,
            actor_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
