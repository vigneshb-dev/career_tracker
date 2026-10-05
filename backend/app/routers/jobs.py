import math
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.auth import (
    get_current_user,
    require_roles,
    verify_employer_owns_job,
    get_user_company_id,
    record_organization_audit,
)
from app.models.entities import Job, JobExtractedSkill, User, Company, JobApplication, Trainee
from app.schemas.schemas import (
    JobRead,
    JobCreate,
    JobUpdate,
    JobAnalyzeRequest,
    JobAnalyzeResponse,
    ExtractedSkillsResponse,
    JobExtractedSkillRead,
    JobApplicationRead,
    JobApplicationCreate,
)
from app.services.job_intelligence_service import JobIntelligenceService

router = APIRouter(prefix="/jobs", tags=["Job Intelligence"])

from app.core.math_utils import cosine_similarity

@router.get("", response_model=List[JobRead])
def list_jobs(
    search: Optional[str] = Query(None),
    domain: Optional[str] = Query(None),
    occupation_id: Optional[str] = Query(None),
    workplace_type: Optional[str] = Query(None),
    semantic_query: Optional[str] = Query(None, description="Semantic similarity search across job embeddings"),
    db: Session = Depends(get_db)
):
    """
    List job descriptions with multi-dimensional filtering and pgvector semantic similarity search.
    """
    query = db.query(Job)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Job.title.ilike(search_filter)) |
            (Job.employer_name.ilike(search_filter)) |
            (Job.description.ilike(search_filter)) |
            (Job.location.ilike(search_filter))
        )

    if domain and domain.lower() != "all":
        query = query.filter(Job.domain.ilike(domain))

    if occupation_id and occupation_id.lower() != "all":
        query = query.filter(Job.mapped_occupation_id == occupation_id)

    if workplace_type and workplace_type.lower() != "all":
        query = query.filter(Job.workplace_type == workplace_type)

    jobs = query.all()

    # Semantic similarity ranking if semantic_query provided
    if semantic_query and semantic_query.strip():
        query_emb = JobIntelligenceService.generate_embedding(semantic_query.strip())
        scored_jobs = []
        for j in jobs:
            sim = 0.0
            if j.embedding:
                # If stored as vector or list
                emb_list = list(j.embedding) if hasattr(j.embedding, "__iter__") else []
                sim = cosine_similarity(query_emb, emb_list)
            else:
                # Quick keyword score fallback
                q_words = semantic_query.lower().split()
                matched = sum(1 for w in q_words if w in j.title.lower() or w in j.description.lower())
                sim = matched / max(len(q_words), 1)
            scored_jobs.append((sim, j))

        scored_jobs.sort(key=lambda x: x[0], reverse=True)
        jobs = [item[1] for item in scored_jobs]

    return jobs

@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    current_user: User = Depends(require_roles(["ADMIN", "EMPLOYER"])),
    db: Session = Depends(get_db)
):
    """
    Creates a new job description:
    Triggers NLP Skill Extraction -> Skill Normalization -> Occupation Mapping -> Embedding Generation.
    Strictly enforces company ownership for employers.
    """
    user_role = (current_user.role or "").strip().upper()
    job_data = job_in.model_dump()
    target_company_id = job_data.get("company_id")

    if user_role == "EMPLOYER":
        if not current_user.employer_profile or not current_user.employer_profile.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employer is not associated with any registered company"
            )
        user_company_id = current_user.employer_profile.company_id
        if target_company_id and target_company_id != user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: You cannot create jobs for another company ({target_company_id})"
            )
        job_data["company_id"] = user_company_id
        job_data["created_by"] = current_user.id
        job_data["employer_id"] = current_user.employer_profile.employer_id or user_company_id

        company = db.query(Company).filter(Company.id == user_company_id).first()
        if company:
            job_data["employer_name"] = company.display_name or company.legal_name
    elif user_role == "ADMIN":
        if target_company_id:
            company = db.query(Company).filter(Company.id == target_company_id).first()
            if company and not job_data.get("employer_name"):
                job_data["employer_name"] = company.display_name or company.legal_name
        job_data["created_by"] = current_user.id

    job = JobIntelligenceService.process_and_save_job(db, job_data)

    org_id = job.company_id or "SYSTEM"
    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=org_id,
        action="CREATE_JOB",
        resource_type="JOB",
        resource_id=job.id,
        details={"title": job.title, "company_id": job.company_id}
    )

    return job

@router.put("/{job_id}", response_model=JobRead)
def update_job(
    job_id: str,
    job_update: JobUpdate,
    current_user: User = Depends(require_roles(["ADMIN", "EMPLOYER"])),
    db: Session = Depends(get_db)
):
    """
    Updates a job description. Strict tenant isolation: Employers can only edit jobs belonging to their own company.
    """
    job = verify_employer_owns_job(job_id=job_id, current_user=current_user, db=db)

    update_data = job_update.model_dump(exclude_unset=True)
    # Employer cannot re-assign company_id
    user_role = (current_user.role or "").strip().upper()
    if user_role == "EMPLOYER" and "company_id" in update_data:
        if update_data["company_id"] != job.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Cannot reassign job to another company"
            )

    for field, val in update_data.items():
        if hasattr(job, field) and val is not None:
            setattr(job, field, val)

    db.commit()
    db.refresh(job)

    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=job.company_id or "UNKNOWN",
        action="UPDATE_JOB",
        resource_type="JOB",
        resource_id=job.id,
        details={"updated_fields": list(update_data.keys())}
    )

    return job

@router.delete("/{job_id}")
def delete_or_archive_job(
    job_id: str,
    current_user: User = Depends(require_roles(["ADMIN", "EMPLOYER"])),
    db: Session = Depends(get_db)
):
    """
    Closes or archives a job. Restricted to company owning the job or Admin.
    """
    job = verify_employer_owns_job(job_id=job_id, current_user=current_user, db=db)
    job.status = "archived"
    db.commit()

    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=job.company_id or "UNKNOWN",
        action="ARCHIVE_JOB",
        resource_type="JOB",
        resource_id=job.id,
        details={"status": "archived"}
    )
    return {"status": "success", "message": f"Job {job_id} archived successfully", "id": job_id}

@router.get("/{job_id}/applications", response_model=List[JobApplicationRead])
def list_job_applications(
    job_id: str,
    current_user: User = Depends(require_roles(["ADMIN", "EMPLOYER"])),
    db: Session = Depends(get_db)
):
    """
    List applications for a job. Enforces company-level RBAC.
    """
    job = verify_employer_owns_job(job_id=job_id, current_user=current_user, db=db)
    applications = db.query(JobApplication).filter(JobApplication.job_id == job.id).all()
    return applications

@router.post("/{job_id}/apply", response_model=JobApplicationRead, status_code=status.HTTP_201_CREATED)
def apply_to_job(
    job_id: str,
    app_in: JobApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Apply for a company job.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    trainee_id = app_in.trainee_id
    if not trainee_id and current_user.trainee_profile:
        trainee_id = current_user.trainee_profile.id
    elif not trainee_id:
        # Fallback to user ID if no trainee profile
        trainee_id = current_user.id

    existing = db.query(JobApplication).filter(
        JobApplication.job_id == job_id,
        JobApplication.trainee_id == trainee_id
    ).first()
    if existing:
        return existing

    import uuid
    application = JobApplication(
        id=f"APP-{uuid.uuid4().hex[:8].upper()}",
        job_id=job.id,
        company_id=job.company_id,
        trainee_id=trainee_id,
        status="APPLIED",
        cover_note=app_in.cover_note
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=job.company_id or "COMPANY",
        action="APPLY_JOB",
        resource_type="JOB_APPLICATION",
        resource_id=application.id,
        details={"job_id": job.id, "trainee_id": trainee_id}
    )
    return application

@router.post("/analyze", response_model=JobAnalyzeResponse)
def analyze_job_description(
    request: JobAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Instant on-the-fly NLP extraction and analysis of any raw job description text.
    Extracts Hard Skills, Soft Skills, Tools, Experience, Education, Salary, and Mapped Occupation.
    """
    analysis = JobIntelligenceService.analyze_job_description(
        db=db,
        text=request.description,
        title=request.title,
        employer_name=request.employer_name,
        location=request.location
    )
    return JobAnalyzeResponse(
        title=analysis["title"],
        extracted_hard_skills=analysis["extracted_hard_skills"],
        extracted_soft_skills=analysis["extracted_soft_skills"],
        extracted_tools=analysis["extracted_tools"],
        experience_requirements=analysis["experience_requirements"],
        education_requirements=analysis["education_requirements"],
        location=analysis["location"],
        salary=analysis["salary"],
        normalized_skills=analysis["normalized_skills"],
        mapped_occupation=analysis["mapped_occupation"],
        domain=analysis["domain"]
    )

@router.get("/{job_id}/skills", response_model=ExtractedSkillsResponse)
def get_job_skills(job_id: str, db: Session = Depends(get_db)):
    """
    Returns AI-extracted and normalized skills breakdown with confidence scores for a specific job.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    extracted_records = db.query(JobExtractedSkill).filter(JobExtractedSkill.job_id == job_id).all()

    hard_skills: List[JobExtractedSkillRead] = []
    soft_skills: List[JobExtractedSkillRead] = []
    tools: List[JobExtractedSkillRead] = []

    for r in extracted_records:
        item = JobExtractedSkillRead(
            id=r.id,
            raw_text=r.raw_text,
            canonical_skill_id=r.canonical_skill_id,
            canonical_name=r.canonical_name,
            category=r.category,
            confidence=r.confidence,
            extraction_method=r.extraction_method
        )
        if r.category == "hard":
            hard_skills.append(item)
        elif r.category == "soft":
            soft_skills.append(item)
        else:
            tools.append(item)

    all_items = hard_skills + soft_skills + tools

    return ExtractedSkillsResponse(
        job_id=job.id,
        job_title=job.title,
        hard_skills=hard_skills,
        soft_skills=soft_skills,
        tools_and_tech=tools,
        all_skills=all_items,
        total_extracted=len(all_items)
    )

@router.get("/{job_id}", response_model=JobRead)
def get_job_detail(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
