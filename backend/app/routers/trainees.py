import os
import re
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
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
    FollowUpAddRequest,
    CertificationAddRequest,
    AssessmentAddRequest,
)
from app.services.trainee_service import TraineeService

logger = logging.getLogger("skilltrace.trainees_router")

router = APIRouter(prefix="/trainees", tags=["Trainee Outcome Passport"])

RESUME_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "resumes")
os.makedirs(RESUME_UPLOAD_DIR, exist_ok=True)


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
        # Trainee sees only their own profile
        trainee = db.query(Trainee).filter(
            (Trainee.user_id == current_user.id) | 
            (Trainee.email == current_user.email)
        ).first()
        if not trainee and current_user.trainee_profile and current_user.trainee_profile.trainee_id:
            trainee = db.query(Trainee).filter(Trainee.id == current_user.trainee_profile.trainee_id).first()
        return [trainee] if trainee else []

    elif user_role == "COACH":
        assigned_ids = current_user.coach_profile.assigned_trainee_ids if current_user.coach_profile else []
        if not assigned_ids:
            return []
        query = db.query(Trainee).filter(Trainee.id.in_(assigned_ids))
        if search:
            query = query.filter(Trainee.full_name.ilike(f"%{search}%"))
        return query.offset(skip).limit(limit).all()

    elif user_role == "EMPLOYER":
        auth_ids = current_user.employer_profile.authorized_candidate_ids if current_user.employer_profile else []
        query = db.query(Trainee)
        if auth_ids:
            query = query.filter(Trainee.id.in_(auth_ids))
        return query.offset(skip).limit(limit).all()

    # ADMIN: Full directory access
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
    if user_role == "TRAINEE":
        trainee = db.query(Trainee).filter(
            (Trainee.user_id == current_user.id) | 
            (Trainee.email == current_user.email)
        ).first()
        items = [trainee] if trainee else []
        return {
            "items": items,
            "total": len(items),
            "page": 1,
            "page_size": page_size,
            "total_pages": 1 if items else 0
        }

    items, total, total_pages = TraineeService.get_paginated_trainees(
        db,
        search=search,
        status=status,
        program=program,
        outcome_type=outcome_type,
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


@router.post("", response_model=TraineeRead, status_code=201)
def create_trainee(
    payload: TraineeCreate,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Administrative trainee provisioning.
    Standard learners use self-service registration at /api/auth/signup.
    """
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


@router.post("/{trainee_id}/resume")
@router.post("/{trainee_id}/analyze-resume")
async def upload_trainee_resume(
    trainee_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Real-Time AI Resume Analyzer:
    Upload Resume -> Parse (PDF/DOCX/TXT) -> Extract (spaCy) -> Normalize (Sentence Transformers)
    -> Score -> Match (Jobs) -> Gap Detection -> Recommendations
    Integrates directly with SkillTrace competency engine.
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)

    # Read and store resume file
    content = await file.read()
    safe_filename = f"{trainee.id}_{uuid.uuid4().hex[:6]}_{file.filename}"
    file_path = os.path.join(RESUME_UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as f:
        f.write(content)

    file_url = f"/uploads/resumes/{safe_filename}"

    # Run complete AI Resume Analyzer & Competency System Integration Engine
    try:
        result = ResumeAnalyzerService.analyze_and_integrate_resume(
            db=db,
            trainee_id=trainee.id,
            file_bytes=content,
            filename=file.filename,
            file_url=file_url
        )
        return {
            "success": True,
            "message": "Resume parsed and competencies successfully mapped.",
            **result
        }
    except Exception as exc:
        logger.error(f"Error analyzing resume for trainee {trainee.id}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze resume: {str(exc)}"
        )


@router.post("/{trainee_id}/reanalyze-resume")
def reanalyze_trainee_resume(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Re-runs the NLP and competency pipeline on the trainee's currently stored resume.
    """
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    profile = db.query(TraineeProfile).filter(TraineeProfile.trainee_id == trainee.id).first()
    if not profile or not profile.resume_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No uploaded resume found to re-analyze. Please upload a resume first."
        )

    # Find the file on disk
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
    return {
        "success": True,
        "message": "Resume successfully re-analyzed and competencies synchronized.",
        **result
    }


@router.get("/{trainee_id}/latest-resume-analysis")
def get_latest_resume_analysis(
    trainee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves the most recent AI Resume Analysis Record for the specified trainee."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    record = (
        db.query(ResumeAnalysisRecord)
        .filter(ResumeAnalysisRecord.trainee_id == trainee.id)
        .order_by(ResumeAnalysisRecord.analyzed_at.desc())
        .first()
    )

    if not record:
        return {
            "has_analysis": False,
            "analysis": None
        }

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
    """Retrieves resume metadata and extracted skills for an authorized trainee."""
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
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.update_consent(db, trainee, payload)


@router.post("/{trainee_id}/outcomes", response_model=TraineeRead)
def add_outcome(
    trainee_id: str,
    payload: OutcomeAddRequest,
    current_user: User = Depends(require_roles(["ADMIN", "COACH"])),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.add_outcome(db, trainee, payload)


@router.post("/{trainee_id}/follow-ups", response_model=TraineeRead)
def add_follow_up(
    trainee_id: str,
    payload: FollowUpAddRequest,
    current_user: User = Depends(require_roles(["ADMIN", "COACH"])),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.add_follow_up(db, trainee, payload)


@router.post("/{trainee_id}/certifications", response_model=TraineeRead)
def add_certification(
    trainee_id: str,
    payload: CertificationAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.add_certification(db, trainee, payload)


@router.post("/{trainee_id}/assessments", response_model=TraineeRead)
def add_assessment(
    trainee_id: str,
    payload: AssessmentAddRequest,
    current_user: User = Depends(require_roles(["ADMIN", "COACH"])),
    db: Session = Depends(get_db)
):
    """Allows assigned Coach or Admin to record a formal skill assessment."""
    trainee = verify_trainee_resource_access(trainee_id, current_user, db)
    return TraineeService.add_assessment(db, trainee, payload)
