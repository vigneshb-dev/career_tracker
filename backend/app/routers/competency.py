from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.models.entities import Course, Competency, Skill, Occupation, SkillAlias
from app.schemas.schemas import (
    CourseRead,
    CompetencyRead,
    SkillRead,
    OccupationRead,
    SkillNormalizationRequest,
    SkillNormalizationResponse,
    CompetencyGraphResponse,
    CompetencyGraphNode,
    CompetencyGraphEdge,
)
from app.services.normalization_service import SkillNormalizationService

router = APIRouter(prefix="/competency", tags=["Competency Intelligence"])

@router.get("/domains", response_model=List[Dict[str, Any]])
def list_domains(db: Session = Depends(get_db)):
    """Returns available competency domains with entity counts."""
    domains = [
        "Software Development",
        "Data Analytics",
        "Digital Marketing",
        "Electrician",
        "Healthcare",
        "Retail",
        "Manufacturing",
    ]
    result = []
    for d in domains:
        course_count = db.query(Course).filter(Course.domain == d).count()
        comp_count = db.query(Competency).filter(Competency.domain == d).count()
        skill_count = db.query(Skill).filter(Skill.domain == d).count()
        occ_count = db.query(Occupation).filter(Occupation.domain == d).count()
        result.append({
            "domain": d,
            "courses_count": course_count,
            "competencies_count": comp_count,
            "skills_count": skill_count,
            "occupations_count": occ_count,
        })
    return result

@router.get("/courses", response_model=List[CourseRead])
def list_courses(domain: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """List training courses, optionally filtered by domain."""
    query = db.query(Course)
    if domain and domain.lower() != "all":
        query = query.filter(Course.domain.ilike(domain))
    return query.all()

@router.get("/courses/{course_id}", response_model=CourseRead)
def get_course(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@router.get("/competencies", response_model=List[CompetencyRead])
def list_competencies(domain: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """List competencies, optionally filtered by domain."""
    query = db.query(Competency)
    if domain and domain.lower() != "all":
        query = query.filter(Competency.domain.ilike(domain))
    return query.all()

@router.get("/competencies/{comp_id}", response_model=CompetencyRead)
def get_competency(comp_id: str, db: Session = Depends(get_db)):
    comp = db.query(Competency).filter(Competency.id == comp_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competency not found")
    return comp

@router.get("/occupations", response_model=List[OccupationRead])
def list_occupations(domain: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """List occupations, optionally filtered by domain."""
    query = db.query(Occupation)
    if domain and domain.lower() != "all":
        query = query.filter(Occupation.domain.ilike(domain))
    return query.all()

@router.get("/occupations/{occ_id}", response_model=OccupationRead)
def get_occupation(occ_id: str, db: Session = Depends(get_db)):
    occ = db.query(Occupation).filter(Occupation.id == occ_id).first()
    if not occ:
        raise HTTPException(status_code=404, detail="Occupation not found")
    return occ

@router.post("/normalize", response_model=SkillNormalizationResponse)
def normalize_skill_term(request: SkillNormalizationRequest, db: Session = Depends(get_db)):
    """
    Normalizes unstructured or varying skill terms to a canonical skill.
    Example: 'Python Programming', 'Python Development', or 'Py' -> 'Python'
    """
    result = SkillNormalizationService.normalize_skill(db, request.query)
    return SkillNormalizationResponse(**result)

@router.get("/graph", response_model=CompetencyGraphResponse)
def get_competency_graph(domain: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """
    Returns the complete structured graph connecting:
    Course -> Competency -> Skill -> Occupation
    """
    course_q = db.query(Course)
    comp_q = db.query(Competency)
    skill_q = db.query(Skill)
    occ_q = db.query(Occupation)

    if domain and domain.lower() != "all":
        course_q = course_q.filter(Course.domain.ilike(domain))
        comp_q = comp_q.filter(Competency.domain.ilike(domain))
        skill_q = skill_q.filter(Skill.domain.ilike(domain))
        occ_q = occ_q.filter(Occupation.domain.ilike(domain))

    courses = course_q.all()
    competencies = comp_q.all()
    skills = skill_q.all()
    occupations = occ_q.all()

    nodes: List[CompetencyGraphNode] = []
    edges: List[CompetencyGraphEdge] = []
    seen_nodes = set()

    for c in courses:
        if c.id not in seen_nodes:
            seen_nodes.add(c.id)
            nodes.append(CompetencyGraphNode(
                id=c.id,
                label=c.title,
                type="course",
                domain=c.domain,
                metadata={"code": c.code, "provider": c.provider, "duration_weeks": c.duration_weeks}
            ))

    for comp in competencies:
        if comp.id not in seen_nodes:
            seen_nodes.add(comp.id)
            nodes.append(CompetencyGraphNode(
                id=comp.id,
                label=comp.title,
                type="competency",
                domain=comp.domain,
                metadata={"code": comp.code, "description": comp.description}
            ))
        # Edge from courses to competency
        for c_id in (comp.course_ids or []):
            edges.append(CompetencyGraphEdge(
                source=c_id,
                target=comp.id,
                relation="teaches"
            ))

    for s in skills:
        if s.id not in seen_nodes:
            seen_nodes.add(s.id)
            nodes.append(CompetencyGraphNode(
                id=s.id,
                label=s.name,
                type="skill",
                domain=s.domain,
                metadata={
                    "category": s.category,
                    "demand_score": s.demand_score,
                    "growth_trend": s.growth_trend,
                    "aliases": s.aliases or []
                }
            ))
        # Edge from competency to skill
        for comp_id in (s.related_competency_ids or []):
            edges.append(CompetencyGraphEdge(
                source=comp_id,
                target=s.id,
                relation="develops"
            ))

    for occ in occupations:
        if occ.id not in seen_nodes:
            seen_nodes.add(occ.id)
            nodes.append(CompetencyGraphNode(
                id=occ.id,
                label=occ.title,
                type="occupation",
                domain=occ.domain,
                metadata={
                    "code": occ.code,
                    "median_salary": occ.median_salary,
                    "career_band": occ.career_band,
                    "demand_outlook": occ.demand_outlook
                }
            ))
        # Edge from skills to occupation
        for req_skill_id in (occ.required_skill_ids or []):
            edges.append(CompetencyGraphEdge(
                source=req_skill_id,
                target=occ.id,
                relation="qualifies_for"
            ))

    return CompetencyGraphResponse(nodes=nodes, edges=edges)
