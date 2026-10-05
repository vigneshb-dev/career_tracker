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
    get_user_training_institute_id,
    verify_coach_owns_course,
    verify_coach_can_assess_trainee,
    record_organization_audit,
)
from app.models.entities import (
    User,
    Course,
    TrainingInstitute,
    Enrollment,
    Trainee,
    Skill,
    TraineeSkill,
    TraineeSkillEvidence,
    TrainingRecord,
    PassportEvent,
    OrganizationAuditLog,
)
from app.schemas.schemas import (
    CourseDetailRead,
    CourseCreate,
    CourseUpdate,
    EnrollmentRead,
    EnrollmentCreate,
    TraineeAssessmentCreate,
    CourseCompletionCreate,
)
from app.services.skill_scoring_service import SkillScoringEngine

logger = logging.getLogger("skilltrace.courses")

router = APIRouter(prefix="/courses", tags=["Courses & Training Institute Management"])


@router.get("", response_model=List[CourseDetailRead])
def list_courses(
    training_institute_id: Optional[str] = None,
    domain: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists all available workforce courses with optional institute or domain filtering."""
    query = db.query(Course)
    if training_institute_id:
        query = query.filter(Course.training_institute_id == training_institute_id)
    if domain:
        query = query.filter(Course.domain == domain)
    if status:
        query = query.filter(Course.status == status)
    return query.all()


@router.post("", response_model=CourseDetailRead, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    current_user: User = Depends(require_roles(["ADMIN", "COACH", "TRAINING_PROVIDER", "PROVIDER"])),
    db: Session = Depends(get_db)
):
    """
    Creates a new course.
    Derives training_institute_id from authenticated coach, or admin can specify.
    """
    user_role = (current_user.role or "").strip().upper()
    institute_id = payload.training_institute_id

    if user_role in ["COACH", "TRAINING_PROVIDER", "PROVIDER"]:
        coach_inst_id = get_user_training_institute_id(current_user, db)
        if not coach_inst_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Coach is not affiliated with any training institute."
            )
        # Never trust institute_id from payload if it conflicts with coach's institute
        if institute_id and institute_id != coach_inst_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You cannot create courses for another training institute."
            )
        institute_id = coach_inst_id

    if not institute_id:
        # Fallback to first institute or create default
        inst = db.query(TrainingInstitute).first()
        institute_id = inst.id if inst else "INST-01"

    inst_obj = db.query(TrainingInstitute).filter(TrainingInstitute.id == institute_id).first()
    provider_name = inst_obj.name if inst_obj else (payload.provider or "National Institute of Cloud & AI")

    course_id = f"CRS-{uuid.uuid4().hex[:6].upper()}"
    course = Course(
        id=course_id,
        code=f"C-{uuid.uuid4().hex[:4].upper()}",
        training_institute_id=institute_id,
        title=payload.title,
        description=payload.description,
        category=payload.category or "Information Technology",
        domain=payload.domain or "Software Engineering",
        provider=provider_name,
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
        organization_id=institute_id,
        action="CREATE_COURSE",
        resource_type="COURSE",
        resource_id=course.id,
        details={"title": course.title}
    )
    db.commit()
    return course


@router.get("/{course_id}", response_model=CourseDetailRead)
def get_course(
    course_id: str,
    db: Session = Depends(get_db)
):
    """Retrieves full details of a specific course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Course '{course_id}' not found.")
    return course


@router.put("/{course_id}", response_model=CourseDetailRead)
@router.patch("/{course_id}", response_model=CourseDetailRead)
def update_course(
    course_id: str,
    payload: CourseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates course details.
    Strictly enforced: User must be a coach belonging to the course's institute, or ADMIN.
    """
    course = verify_coach_owns_course(course_id, current_user, db)
    update_data = payload.model_dump(exclude_unset=True)

    for field, val in update_data.items():
        if hasattr(course, field) and val is not None:
            setattr(course, field, val)

    db.commit()
    db.refresh(course)

    if course.training_institute_id:
        record_organization_audit(
            db=db,
            actor_user_id=current_user.id,
            organization_id=course.training_institute_id,
            action="UPDATE_COURSE",
            resource_type="COURSE",
            resource_id=course.id,
            details=update_data
        )
        db.commit()

    return course


@router.delete("/{course_id}", status_code=status.HTTP_200_OK)
def archive_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Archives a course.
    Strictly enforced: Coach belonging to this institute or ADMIN.
    """
    course = verify_coach_owns_course(course_id, current_user, db)
    course.status = "archived"
    db.commit()

    if course.training_institute_id:
        record_organization_audit(
            db=db,
            actor_user_id=current_user.id,
            organization_id=course.training_institute_id,
            action="ARCHIVE_COURSE",
            resource_type="COURSE",
            resource_id=course.id,
            details={"status": "archived"}
        )
        db.commit()

    return {"success": True, "message": f"Course '{course_id}' archived successfully."}


@router.get("/{course_id}/enrollments", response_model=List[EnrollmentRead])
def list_course_enrollments(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all enrollments for a course.
    Strictly enforced: Coach belonging to this course's institute, or ADMIN.
    """
    verify_coach_owns_course(course_id, current_user, db)
    enrollments = db.query(Enrollment).filter(Enrollment.course_id == course_id).all()
    return enrollments


@router.post("/{course_id}/enroll", response_model=EnrollmentRead, status_code=status.HTTP_201_CREATED)
def enroll_trainee(
    course_id: str,
    payload: EnrollmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enrolls a trainee in this course.
    Authorized for Coaches of this institute, Admins, or Trainees self-enrolling.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Course '{course_id}' not found.")

    trainee = db.query(Trainee).filter(Trainee.id == payload.trainee_id).first()
    if not trainee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trainee '{payload.trainee_id}' not found.")

    user_role = (current_user.role or "").strip().upper()
    if user_role in ["COACH", "TRAINING_PROVIDER", "PROVIDER"]:
        verify_coach_owns_course(course_id, current_user, db)

    # Check for existing enrollment
    existing = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.trainee_id == payload.trainee_id
    ).first()
    if existing:
        return existing

    enrollment_id = f"ENR-{uuid.uuid4().hex[:6].upper()}"
    inst_id = course.training_institute_id or "INST-01"

    enrollment = Enrollment(
        id=enrollment_id,
        training_institute_id=inst_id,
        course_id=course.id,
        trainee_id=trainee.id,
        status="enrolled",
        enrolled_at=datetime.utcnow().isoformat(),
        progress_percent=10
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=inst_id,
        action="ENROLL_TRAINEE",
        resource_type="ENROLLMENT",
        resource_id=enrollment.id,
        details={"course_id": course.id, "trainee_id": trainee.id}
    )
    db.commit()
    return enrollment


@router.post("/{course_id}/assessments", status_code=status.HTTP_201_CREATED)
def assess_course_trainee(
    course_id: str,
    payload: TraineeAssessmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Assesses a trainee enrolled in this course.
    Strictly enforced:
    - Coach must belong to the institute offering this course.
    - Trainee MUST be enrolled in this course (cannot assess trainees of another institute).
    """
    course = verify_coach_can_assess_trainee(course_id, payload.trainee_id, current_user, db)

    # Add / update TraineeSkillEvidence
    skill_obj = db.query(Skill).filter(Skill.name.ilike(payload.skill_name)).first()
    if not skill_obj:
        skill_obj = db.query(Skill).first()
    skill_id = skill_obj.id if skill_obj else "skl-01"

    evidence = TraineeSkillEvidence(
        trainee_id=payload.trainee_id,
        skill_id=skill_id,
        skill_name=payload.skill_name,
        evidence_source="trainer_evaluation",
        score=payload.score,
        max_score=5.0,
        confidence=0.95,
        assessment_date=datetime.now().strftime("%Y-%m-%d"),
        reviewer_source=f"Coach {current_user.full_name} ({course.provider or 'Institute'})",
        notes=payload.notes or f"Evaluated under course {course.title}."
    )
    db.add(evidence)
    db.flush()

    # Refresh or update TraineeSkill
    skill_rec = db.query(TraineeSkill).filter(
        TraineeSkill.trainee_id == payload.trainee_id,
        TraineeSkill.name.ilike(payload.skill_name)
    ).first()

    if skill_rec:
        skill_rec.proficiency_score = max(skill_rec.proficiency_score or 0.0, payload.score)
        skill_rec.verified = True
        skill_rec.source = "ASSESSMENT"
    else:
        new_ts = TraineeSkill(
            trainee_id=payload.trainee_id,
            skill_id=skill_id,
            name=payload.skill_name,
            proficiency_score=payload.score,
            verified=True,
            source="ASSESSMENT"
        )
        db.add(new_ts)

    db.commit()

    # Record immutable organization audit log
    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=course.training_institute_id or "INST-01",
        action="ASSESS_TRAINEE",
        resource_type="ASSESSMENT",
        resource_id=str(evidence.id),
        details={
            "course_id": course.id,
            "trainee_id": payload.trainee_id,
            "skill_name": payload.skill_name,
            "score": payload.score
        }
    )
    db.commit()

    return {
        "success": True,
        "message": f"Successfully recorded assessment of {payload.skill_name} ({payload.score}/5.0) for trainee {payload.trainee_id}.",
        "evidence_id": str(evidence.id)
    }


@router.post("/{course_id}/complete", status_code=status.HTTP_200_OK)
def complete_course_for_trainee(
    course_id: str,
    payload: CourseCompletionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Records official course completion for an enrolled trainee.
    Strictly enforced:
    - Coach must belong to the institute offering this course.
    - Trainee must be enrolled in this course.
    """
    course = verify_coach_can_assess_trainee(course_id, payload.trainee_id, current_user, db)

    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.trainee_id == payload.trainee_id
    ).first()

    if enrollment:
        enrollment.status = "completed"
        enrollment.progress_percent = 100
        enrollment.completed_at = datetime.utcnow().isoformat()
        enrollment.grade_or_result = payload.grade_or_result

    # Add training record to trainee outcome passport
    tr_id = f"TR-{uuid.uuid4().hex[:8].upper()}"
    t_record = TrainingRecord(
        id=tr_id,
        trainee_id=payload.trainee_id,
        course_name=course.title,
        provider_name=course.provider,
        completion_status="completed",
        delivery_mode=course.mode or "Hybrid",
        assessment_result=payload.grade_or_result or "Passed",
        certificate_url=payload.certificate_url,
        description=payload.notes or f"Successfully completed accredited course {course.title}.",
        verification_status="verified",
        verified_by=current_user.full_name,
        verified_at=datetime.utcnow().strftime("%Y-%m-%d"),
        source="coach",
        created_at=datetime.utcnow().strftime("%Y-%m-%d")
    )
    db.add(t_record)
    db.commit()

    record_organization_audit(
        db=db,
        actor_user_id=current_user.id,
        organization_id=course.training_institute_id or "INST-01",
        action="RECORD_COURSE_COMPLETION",
        resource_type="COURSE_COMPLETION",
        resource_id=course.id,
        details={
            "trainee_id": payload.trainee_id,
            "grade_or_result": payload.grade_or_result,
            "training_record_id": tr_id
        }
    )
    db.commit()

    return {
        "success": True,
        "message": f"Course completion recorded for trainee {payload.trainee_id}.",
        "training_record_id": tr_id
    }
