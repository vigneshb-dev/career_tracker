from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.entities import Skill
from app.schemas.schemas import SkillRead

router = APIRouter(prefix="/skills", tags=["Skills"])

@router.get("", response_model=List[SkillRead])
def list_skills(
    domain: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Skill)
    if domain and domain.lower() != "all":
        query = query.filter(Skill.domain.ilike(domain))
    if category and category.lower() != "all":
        query = query.filter(Skill.category.ilike(category))
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Skill.name.ilike(search_term)) |
            (Skill.description.ilike(search_term)) |
            (Skill.domain.ilike(search_term))
        )
    return query.all()

@router.get("/{skill_id}", response_model=SkillRead)
def get_skill(skill_id: str, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill
