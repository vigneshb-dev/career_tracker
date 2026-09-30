from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
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

router = APIRouter(prefix="/trainees", tags=["Trainee Outcome Passport"])

@router.get("", response_model=List[TraineeRead])
def list_trainees(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    program: Optional[str] = Query(None),
    outcome_type: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
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
def get_trainee(trainee_id: str, db: Session = Depends(get_db)):
    trainee = TraineeService.get_by_id(db, trainee_id)
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    return trainee

@router.post("", response_model=TraineeRead, status_code=201)
def create_trainee(payload: TraineeCreate, db: Session = Depends(get_db)):
    return TraineeService.create(db, payload)

@router.put("/{trainee_id}", response_model=TraineeRead)
def update_trainee(trainee_id: str, payload: TraineeUpdate, db: Session = Depends(get_db)):
    trainee = TraineeService.get_by_id(db, trainee_id)
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    return TraineeService.update(db, trainee, payload)

@router.put("/{trainee_id}/consent", response_model=TraineeRead)
def update_consent(
    trainee_id: str,
    payload: ConsentUpdateRequest,
    db: Session = Depends(get_db)
):
    trainee = TraineeService.get_by_id(db, trainee_id)
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    return TraineeService.update_consent(db, trainee, payload)

@router.post("/{trainee_id}/outcomes", response_model=TraineeRead)
def add_outcome(
    trainee_id: str,
    payload: OutcomeAddRequest,
    db: Session = Depends(get_db)
):
    trainee = TraineeService.get_by_id(db, trainee_id)
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    return TraineeService.add_outcome(db, trainee, payload)

@router.post("/{trainee_id}/follow-ups", response_model=TraineeRead)
def add_follow_up(
    trainee_id: str,
    payload: FollowUpAddRequest,
    db: Session = Depends(get_db)
):
    trainee = TraineeService.get_by_id(db, trainee_id)
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    return TraineeService.add_follow_up(db, trainee, payload)

@router.post("/{trainee_id}/certifications", response_model=TraineeRead)
def add_certification(
    trainee_id: str,
    payload: CertificationAddRequest,
    db: Session = Depends(get_db)
):
    trainee = TraineeService.get_by_id(db, trainee_id)
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    return TraineeService.add_certification(db, trainee, payload)

@router.post("/{trainee_id}/assessments", response_model=TraineeRead)
def add_assessment(
    trainee_id: str,
    payload: AssessmentAddRequest,
    db: Session = Depends(get_db)
):
    trainee = TraineeService.get_by_id(db, trainee_id)
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    return TraineeService.add_assessment(db, trainee, payload)
