from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.entities import Trainee, TraineeSkill
from app.schemas.schemas import (
    TraineeCreate,
    TraineeUpdate,
    ConsentUpdateRequest,
    OutcomeAddRequest,
    FollowUpAddRequest,
    CertificationAddRequest,
    AssessmentAddRequest,
)

class TraineeService:
    @staticmethod
    def get_trainees(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        program: Optional[str] = None,
        outcome_type: Optional[str] = None,
        consent_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Trainee]:
        query = db.query(Trainee)
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    Trainee.full_name.ilike(s),
                    Trainee.email.ilike(s),
                    Trainee.cohort.ilike(s),
                    Trainee.program.ilike(s),
                    Trainee.current_role.ilike(s),
                    Trainee.current_employer.ilike(s)
                )
            )
        if status and status != "all":
            query = query.filter(Trainee.status == status)
        if program and program != "all":
            query = query.filter(Trainee.program.ilike(f"%{program}%"))
        if outcome_type and outcome_type != "all":
            query = query.filter(Trainee.primary_outcome_type == outcome_type)
        
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_paginated_trainees(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        program: Optional[str] = None,
        outcome_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[Trainee], int, int]:
        query = db.query(Trainee)
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    Trainee.full_name.ilike(s),
                    Trainee.email.ilike(s),
                    Trainee.cohort.ilike(s),
                    Trainee.program.ilike(s),
                    Trainee.current_role.ilike(s),
                    Trainee.current_employer.ilike(s)
                )
            )
        if status and status != "all":
            query = query.filter(Trainee.status == status)
        if program and program != "all":
            query = query.filter(Trainee.program.ilike(f"%{program}%"))
        if outcome_type and outcome_type != "all":
            query = query.filter(Trainee.primary_outcome_type == outcome_type)

        total = query.count()
        total_pages = max(1, (total + page_size - 1) // page_size)
        skip = (page - 1) * page_size
        items = query.offset(skip).limit(page_size).all()
        return items, total, total_pages

    @staticmethod
    def get_by_id(db: Session, trainee_id: str) -> Optional[Trainee]:
        return db.query(Trainee).filter(Trainee.id == trainee_id).first()

    @staticmethod
    def create(db: Session, trainee_in: TraineeCreate) -> Trainee:
        tid = trainee_in.id or f"TRN-2024-{db.query(Trainee).count() + 1:03d}"
        trainee = Trainee(
            id=tid,
            full_name=trainee_in.full_name,
            email=trainee_in.email,
            phone=trainee_in.phone,
            avatar_url=trainee_in.avatar_url or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
            location=trainee_in.location or "Austin, TX",
            bio=trainee_in.bio,
            program=trainee_in.program,
            cohort=trainee_in.cohort,
            status=trainee_in.status,
            enrollment_date=trainee_in.enrollment_date,
            graduation_date=trainee_in.graduation_date,
            training_details=trainee_in.training_details or {},
            current_role=trainee_in.current_role,
            current_employer=trainee_in.current_employer,
            placement_date=trainee_in.placement_date,
            placement_salary=trainee_in.placement_salary,
            primary_outcome_type=trainee_in.primary_outcome_type or "employment",
            overall_score=trainee_in.overall_score,
            match_score=trainee_in.match_score,
            notes=trainee_in.notes,
            certifications=trainee_in.certifications or [],
            assessments=trainee_in.assessments or [],
            career_preference=trainee_in.career_preference or {},
            current_pathway=trainee_in.current_pathway or {},
            outcome_history=trainee_in.outcome_history or [],
            follow_up_history=trainee_in.follow_up_history or [],
            consent_status=trainee_in.consent_status or {
                "consent_status": "granted",
                "share_with_employers": True,
                "share_with_funding_bodies": True,
                "share_anonymized_research": True,
                "share_public_portfolio": False,
                "consent_date": datetime.now().strftime("%Y-%m-%d"),
                "expiry_date": "2026-12-31",
                "version": "v2.1"
            },
        )
        db.add(trainee)
        db.commit()
        db.refresh(trainee)

        if trainee_in.skills:
            for s in trainee_in.skills:
                ts = TraineeSkill(
                    trainee_id=trainee.id,
                    skill_id=s.skill_id,
                    name=s.name,
                    level=s.level,
                    verified=s.verified,
                    score=s.score,
                )
                db.add(ts)
            db.commit()
            db.refresh(trainee)

        return trainee

    @staticmethod
    def update(db: Session, trainee: Trainee, updates: TraineeUpdate) -> Trainee:
        update_data = updates.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(trainee, field, value)
        db.commit()
        db.refresh(trainee)
        return trainee

    @staticmethod
    def update_consent(db: Session, trainee: Trainee, payload: ConsentUpdateRequest) -> Trainee:
        existing = trainee.consent_status or {}
        updated_consent = {
            **existing,
            "consent_status": payload.consent_status,
            "share_with_employers": payload.share_with_employers,
            "share_with_funding_bodies": payload.share_with_funding_bodies,
            "share_anonymized_research": payload.share_anonymized_research,
            "share_public_portfolio": payload.share_public_portfolio,
            "last_reviewed_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "notes": payload.notes,
            "version": existing.get("version", "v2.1")
        }
        trainee.consent_status = updated_consent
        db.commit()
        db.refresh(trainee)
        return trainee

    @staticmethod
    def add_outcome(db: Session, trainee: Trainee, outcome: OutcomeAddRequest) -> Trainee:
        history = list(trainee.outcome_history or [])
        item = outcome.model_dump()
        item["id"] = f"OUT-{len(history) + 1:03d}"
        item["created_at"] = datetime.now().strftime("%Y-%m-%d")
        history.insert(0, item)
        trainee.outcome_history = history

        # If current outcome, update top-level trainee fields
        if outcome.is_current:
            trainee.current_role = outcome.role_or_course
            trainee.current_employer = outcome.organization_or_venture
            trainee.placement_salary = outcome.compensation_or_funding
            trainee.placement_date = outcome.start_date
            trainee.primary_outcome_type = outcome.outcome_type
            trainee.status = "placed"

        db.commit()
        db.refresh(trainee)
        return trainee

    @staticmethod
    def add_follow_up(db: Session, trainee: Trainee, payload: FollowUpAddRequest) -> Trainee:
        history = list(trainee.follow_up_history or [])
        item = payload.model_dump()
        item["id"] = f"AUD-{len(history) + 1:03d}"
        history.append(item)
        trainee.follow_up_history = history
        trainee.last_follow_up = payload.date
        db.commit()
        db.refresh(trainee)
        return trainee

    @staticmethod
    def add_certification(db: Session, trainee: Trainee, payload: CertificationAddRequest) -> Trainee:
        certs = list(trainee.certifications or [])
        item = payload.model_dump()
        item["id"] = f"CRT-{len(certs) + 1:03d}"
        certs.append(item)
        trainee.certifications = certs
        db.commit()
        db.refresh(trainee)
        return trainee

    @staticmethod
    def add_assessment(db: Session, trainee: Trainee, payload: AssessmentAddRequest) -> Trainee:
        assessments = list(trainee.assessments or [])
        item = payload.model_dump()
        item["id"] = f"ASM-{len(assessments) + 1:03d}"
        assessments.append(item)
        trainee.assessments = assessments
        db.commit()
        db.refresh(trainee)
        return trainee
