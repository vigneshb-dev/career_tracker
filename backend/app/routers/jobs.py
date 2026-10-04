import math
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.auth import get_current_user, require_roles
from app.models.entities import Job, JobExtractedSkill, User
from app.schemas.schemas import (
    JobRead,
    JobCreate,
    JobAnalyzeRequest,
    JobAnalyzeResponse,
    ExtractedSkillsResponse,
    JobExtractedSkillRead,
)
from app.services.job_intelligence_service import JobIntelligenceService

router = APIRouter(prefix="/jobs", tags=["Job Intelligence"])

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)

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
    Restricted to authorized Employer or Admin.
    """
    user_role = (current_user.role or "").strip().upper()
    job_data = job_in.model_dump()
    if user_role == "EMPLOYER" and current_user.employer_profile:
        # Enforce employer affiliation
        job_data["employer_id"] = current_user.employer_profile.employer_id
        if current_user.employer_profile.company_name:
            job_data["employer_name"] = current_user.employer_profile.company_name

    job = JobIntelligenceService.process_and_save_job(db, job_data)
    return job

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
