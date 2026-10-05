import logging
from typing import List, Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import (
    get_current_user,
    require_roles,
    verify_coach_owns_institute,
    get_user_training_institute_id,
    record_organization_audit,
)
from app.models.entities import User, TrainingInstitute, CoachProfile, Course, Enrollment, Trainee, OrganizationAuditLog
from app.schemas.schemas import (
    TrainingInstituteRead,
    TrainingInstituteCreate,
    TrainingInstituteUpdate,
    CoachProfileDetailRead,
    CourseDetailRead,
    CourseCreate,
    TraineeRead,
    OrganizationAuditLogRead,
)

logger = logging.getLogger("skilltrace.training_institutes")

router = APIRouter(prefix="/training-institutes", tags=["Training Institutes & Coaches"])


@router.get("", response_model=List[TrainingInstituteRead])
def list_training_institutes(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists all registered workforce training institutes."""
    query = db.query(TrainingInstitute)
    if status:
        query = query.filter(TrainingInstitute.status == status)
    return query.all()


@router.post("", response_model=TrainingInstituteRead, status_code=status.HTTP_201_CREATED)
def create_training_institute(
    payload: TrainingInstituteCreate,
    current_user: User = Depends(require_roles(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """Creates a new Training Institute organization (Admin only)."""
    inst_id = f"INST-{uuid.uuid4().hex[:6].upper()}"
    institute = TrainingInstitute(
        id=inst_id,
        name=payload.name,
        description=payload.description,
        location=payload.location,
        website=payload.website,
        contact_email=payload.contact_email,
        status=payload.status or "active",
        created_at=datetime.utcnow().isoformat()
    )
    db.add(institute)
    db.commit()
    db.refresh(institute)

    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=institute.id,
        action="CREATE_TRAINING_INSTITUTE",
        resource_type="TRAINING_INSTITUTE",
        resource_id=institute.id,
        details={"name": institute.name}
    )
    db.commit()
    return institute


@router.get("/{institute_id}", response_model=TrainingInstituteRead)
def get_training_institute(
    institute_id: str,
    db: Session = Depends(get_db)
):
    """Retrieves full profile of a training institute."""
    institute = db.query(TrainingInstitute).filter(TrainingInstitute.id == institute_id).first()
    if not institute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Training institute '{institute_id}' not found.")
    return institute


@router.put("/{institute_id}", response_model=TrainingInstituteRead)
@router.patch("/{institute_id}", response_model=TrainingInstituteRead)
def update_training_institute(
    institute_id: str,
    payload: TrainingInstituteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates training institute profile.
    Strictly enforced: User must be a coach belonging to this institute, or ADMIN.
    """
    institute = verify_coach_owns_institute(institute_id, current_user, db)
    update_data = payload.model_dump(exclude_unset=True)

    for field, val in update_data.items():
        if hasattr(institute, field) and val is not None:
            setattr(institute, field, val)

    db.commit()
    db.refresh(institute)

    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=institute.id,
        action="UPDATE_TRAINING_INSTITUTE",
        resource_type="TRAINING_INSTITUTE",
        resource_id=institute.id,
        details=update_data
    )
    db.commit()
    return institute


@router.get("/{institute_id}/coaches", response_model=List[CoachProfileDetailRead])
def list_institute_coaches(
    institute_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists all coaches belonging to this training institute."""
    verify_coach_owns_institute(institute_id, current_user, db)
    coaches = db.query(CoachProfile).filter(CoachProfile.training_institute_id == institute_id).all()
    return coaches


@router.get("/{institute_id}/courses", response_model=List[CourseDetailRead])
def list_institute_courses(
    institute_id: str,
    db: Session = Depends(get_db)
):
    """Lists all courses offered by this training institute."""
    courses = db.query(Course).filter(Course.training_institute_id == institute_id).all()
    return courses


@router.post("/{institute_id}/courses", response_model=CourseDetailRead, status_code=status.HTTP_201_CREATED)
def create_institute_course(
    institute_id: str,
    payload: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new course under this training institute.
    Strictly enforced: Current user must be a coach belonging to this institute or ADMIN.
    """
    institute = verify_coach_owns_institute(institute_id, current_user, db)

    course_id = f"CRS-{uuid.uuid4().hex[:6].upper()}"
    course = Course(
        id=course_id,
        code=f"C-{uuid.uuid4().hex[:4].upper()}",
        training_institute_id=institute.id,
        title=payload.title,
        description=payload.description,
        category=payload.category or "Information Technology",
        domain=payload.domain or "Software Engineering",
        provider=institute.name,
        duration=payload.duration or "12 Weeks",
        duration_weeks=payload.duration_weeks or 12,
        mode=payload.mode or "Hybrid",
        eligibility=payload.eligibility or "Open to all enrolled candidates",
        capacity=payload.capacity or 30,
        status=payload.status or "active",
        created_by=current_user.id,
        competency_ids=payload.competency_ids or []
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=institute.id,
        action="CREATE_COURSE",
        resource_type="COURSE",
        resource_id=course.id,
        details={"title": course.title}
    )
    db.commit()
    return course


@router.get("/{institute_id}/trainees", response_model=List[TraineeRead])
def list_institute_trainees(
    institute_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all trainees currently or previously enrolled in any course of this training institute.
    Strictly enforced: Current user must be a coach of this institute or ADMIN.
    """
    verify_coach_owns_institute(institute_id, current_user, db)

    trainee_ids = [
        enr.trainee_id
        for enr in db.query(Enrollment.trainee_id).filter(Enrollment.training_institute_id == institute_id).distinct().all()
    ]
    if not trainee_ids:
        return []

    trainees = db.query(Trainee).filter(Trainee.id.in_(trainee_ids)).all()
    return trainees


@router.get("/{institute_id}/audit-logs", response_model=List[OrganizationAuditLogRead])
def get_institute_audit_logs(
    institute_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves immutable audit trail for all institute-scoped actions.
    Restricted to authorized institute coaches or platform administrators.
    """
    verify_coach_owns_institute(institute_id, current_user, db)
    logs = (
        db.query(OrganizationAuditLog)
        .filter(OrganizationAuditLog.organization_id == institute_id)
        .order_by(OrganizationAuditLog.timestamp.desc())
        .all()
    )
    return logs
