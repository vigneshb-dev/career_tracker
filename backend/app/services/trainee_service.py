import uuid
import re
import logging
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import or_, desc

from app.models.entities import (
    Trainee,
    TraineeSkill,
    TraineeSkillEvidence,
    TrainingRecord,
    PassportEvent,
    Skill,
    SkillAlias,
    Occupation,
    EmployerFeedbackVerification,
)
from app.schemas.schemas import (
    TraineeCreate,
    TraineeUpdate,
    ConsentUpdateRequest,
    OutcomeAddRequest,
    FollowUpAddRequest,
    CertificationAddRequest,
    AssessmentAddRequest,
    TrainingRecordCreate,
    TrainingRecordVerifyRequest,
    TrainingRecordUpdate,
    TraineeProfileUpdateRequest,
    CareerGoalsUpdateRequest,
    SkillAddRequest,
    SkillUpdateRequest,
    SkillVerifyRequest,
    CertificationUpdateRequest,
    OutcomeUpdateRequest,
    FollowUpResponseRequest,
    OutcomeVerifyRequest,
    CertificationVerifyRequest,
)
from app.services.normalization_service import SkillNormalizationService
from app.services.skill_scoring_service import SkillScoringEngine
from app.services.skill_gap_service import SkillGapEngine

logger = logging.getLogger("skilltrace.services.trainee_service")


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
        allowed_trainee_ids: Optional[List[str]] = None,
        page: int = 1,
        page_size: int = 10
    ) -> Tuple[List[Trainee], int, int]:
        query = db.query(Trainee)
        if allowed_trainee_ids is not None:
            if not allowed_trainee_ids:
                return [], 0, 1
            query = query.filter(Trainee.id.in_(allowed_trainee_ids))
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
    def log_passport_event(
        db: Session,
        trainee_id: str,
        actor_name: str,
        actor_role: str,
        event_type: str,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        previous_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
        source: str = "TRAINEE",
        verification_status: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> PassportEvent:
        """
        Creates an immutable, timestamped passport audit event record.
        """
        evt_id = f"EVT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
        event = PassportEvent(
            id=evt_id,
            trainee_id=trainee_id,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            event_type=event_type,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            previous_value=previous_value,
            new_value=new_value,
            source=source,
            verification_status=verification_status,
            notes=notes,
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        db.add(event)
        db.commit()
        return event

    @staticmethod
    def create(db: Session, trainee_in: TraineeCreate) -> Trainee:
        tid = trainee_in.id or f"TRN-2024-{db.query(Trainee).count() + 1:03d}"
        trainee = Trainee(
            id=tid,
            full_name=trainee_in.full_name,
            email=trainee_in.email,
            phone=trainee_in.phone,
            avatar_url=trainee_in.avatar_url or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
            location=trainee_in.location or "Bengaluru, KA",
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
    def update_profile(
        db: Session,
        trainee: Trainee,
        updates: TraineeProfileUpdateRequest,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> Trainee:
        """
        Updates trainee-editable personal and career preference information.
        Preserves verified info, logs previous/new values into immutable audit log.
        Supports OUTCOME_UNKNOWN logic.
        """
        prev_state = {
            "full_name": trainee.full_name,
            "phone": trainee.phone,
            "email": trainee.email,
            "location": trainee.location,
            "bio": trainee.bio,
            "status": trainee.status,
            "career_preference": trainee.career_preference or {}
        }

        diff = {}
        if updates.full_name is not None and updates.full_name != trainee.full_name:
            trainee.full_name = updates.full_name
            diff["full_name"] = {"prev": prev_state["full_name"], "new": updates.full_name}

        if updates.phone is not None and updates.phone != trainee.phone:
            trainee.phone = updates.phone
            diff["phone"] = {"prev": prev_state["phone"], "new": updates.phone}

        if updates.email is not None and updates.email != trainee.email:
            trainee.email = updates.email
            diff["email"] = {"prev": prev_state["email"], "new": updates.email}

        if updates.avatar_url is not None:
            trainee.avatar_url = updates.avatar_url

        if updates.location is not None and updates.location != trainee.location:
            trainee.location = updates.location
            diff["location"] = {"prev": prev_state["location"], "new": updates.location}

        if updates.bio is not None and updates.bio != trainee.bio:
            trainee.bio = updates.bio
            diff["bio"] = {"prev": prev_state["bio"], "new": updates.bio}

        # Handle employment status update with OUTCOME_UNKNOWN support
        if updates.employment_status is not None:
            status_val = updates.employment_status.strip().lower()
            if status_val in ["outcome_unknown", "outcome unknown", "unknown"]:
                trainee.status = "outcome_unknown"
            elif status_val in ["employed", "active", "placed"]:
                trainee.status = "placed"
            elif status_val in ["job_seeking", "seeking", "unemployed"]:
                trainee.status = "job_seeking"
            elif status_val in ["in_training", "training"]:
                trainee.status = "in_training"
            else:
                trainee.status = status_val
            diff["employment_status"] = {"prev": prev_state["status"], "new": trainee.status}

        # Merge career preferences
        if updates.career_preference is not None or updates.preferred_locations is not None or updates.career_interests is not None:
            current_pref = dict(trainee.career_preference or {})
            if updates.career_preference:
                current_pref.update(updates.career_preference)
            if updates.preferred_locations is not None:
                current_pref["preferred_locations"] = updates.preferred_locations
            if updates.career_interests is not None:
                current_pref["career_interests"] = updates.career_interests
            trainee.career_preference = current_pref
            flag_modified(trainee, "career_preference")
            diff["career_preference"] = {"updated": True}

        db.commit()
        db.refresh(trainee)

        # Log audit event
        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="PROFILE_UPDATED",
            action=f"{actor_role} updated personal profile details",
            entity_type="PROFILE",
            entity_id=trainee.id,
            previous_value=prev_state,
            new_value=diff,
            source="TRAINEE" if actor_role == "TRAINEE" else actor_role,
            verification_status="SELF_REPORTED" if actor_role == "TRAINEE" else "VERIFIED",
            notes="Trainee profile fields updated with full audit trail preservation."
        )

        return trainee

    @staticmethod
    def get_training_records(db: Session, trainee: Trainee) -> List[TrainingRecord]:
        """
        Retrieves training records for trainee.
        If table has no records yet, initializes the baseline accredited course from trainee.training_details.
        """
        records = db.query(TrainingRecord).filter(TrainingRecord.trainee_id == trainee.id).all()
        if not records and trainee.training_details:
            details = trainee.training_details or {}
            course_name = details.get("course_title") or trainee.program or "Full-Stack Enterprise React & Cloud Web Services"
            provider_name = details.get("provider_name") or "Bengaluru Institute of Technology & Advanced Skills"
            modality = details.get("modality") or "Hybrid"
            att = details.get("attendance_rate") or "98.4%"
            hrs = details.get("hours_completed") or 720

            initial_record = TrainingRecord(
                id=f"TRG-001-{uuid.uuid4().hex[:4].upper()}",
                trainee_id=trainee.id,
                course_name=course_name,
                provider_name=provider_name,
                batch=trainee.cohort or "Cohort 2024-Q1",
                start_date=trainee.enrollment_date,
                end_date=trainee.graduation_date or "2024-06-30",
                delivery_mode=modality,
                completion_status="completed",
                attendance_rate=att,
                hours_completed=hrs,
                assessment_result="92% (Pass with Distinction)",
                certificate_url=f"/certificates/{trainee.id}_course_cert.pdf",
                description=f"Accredited training: {details.get('accreditation', 'NSDC Accredited')}. Lead: {details.get('instructor_name', 'Faculty Team')}",
                verification_status="verified",
                verified_by="Bengaluru Institute of Technology & Advanced Skills",
                verified_at=trainee.enrollment_date,
                source="provider",
                created_at=datetime.now().strftime("%Y-%m-%d")
            )
            db.add(initial_record)
            db.commit()
            records = [initial_record]

        return records

    @staticmethod
    def add_training_record(
        db: Session,
        trainee: Trainee,
        payload: TrainingRecordCreate,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> TrainingRecord:
        """
        Adds a training programme record. If entered by trainee, starts with verification_status='pending'.
        """
        rec_id = f"TRG-{len(db.query(TrainingRecord).filter(TrainingRecord.trainee_id == trainee.id).all()) + 1:03d}-{uuid.uuid4().hex[:4].upper()}"
        initial_status = "verified" if actor_role in ["COACH", "ADMIN"] else "pending"

        record = TrainingRecord(
            id=rec_id,
            trainee_id=trainee.id,
            course_name=payload.course_name,
            provider_name=payload.provider_name,
            batch=payload.batch,
            start_date=payload.start_date,
            end_date=payload.end_date,
            delivery_mode=payload.delivery_mode or "Hybrid",
            completion_status=payload.completion_status or "completed",
            attendance_rate=payload.attendance_rate,
            hours_completed=payload.hours_completed or 0,
            assessment_result=payload.assessment_result,
            certificate_url=payload.certificate_url,
            description=payload.description,
            verification_status=initial_status,
            verified_by=actor_name if initial_status == "verified" else None,
            verified_at=datetime.now().strftime("%Y-%m-%d") if initial_status == "verified" else None,
            source="trainee" if actor_role == "TRAINEE" else "coach",
            created_at=datetime.now().strftime("%Y-%m-%d")
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        # Log passport event
        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="TRAINING_ADDED",
            action=f"Added training programme: {payload.course_name} at {payload.provider_name}",
            entity_type="TRAINING",
            entity_id=record.id,
            previous_value=None,
            new_value=payload.model_dump(),
            source=actor_role,
            verification_status=initial_status,
            notes=f"Training completion status: {record.completion_status}. Status: {initial_status}."
        )

        return record

    @staticmethod
    def verify_training_record(
        db: Session,
        trainee: Trainee,
        record_id: str,
        payload: TrainingRecordVerifyRequest,
        actor_name: str,
        actor_role: str,
        actor_id: Optional[str] = None
    ) -> TrainingRecord:
        """
        Coach or Admin verifies an existing training record.
        """
        record = db.query(TrainingRecord).filter(
            TrainingRecord.id == record_id,
            TrainingRecord.trainee_id == trainee.id
        ).first()

        if not record:
            record = db.query(TrainingRecord).filter(
                TrainingRecord.id == record_id
            ).first()

        if not record:
            record = db.query(TrainingRecord).filter(
                TrainingRecord.id.ilike(f"%{record_id}%")
            ).first()

        if not record:
            raise ValueError(f"Training record '{record_id}' not found for trainee.")

        prev_status = record.verification_status
        record.verification_status = payload.verification_status
        record.verified_by = actor_name
        record.verified_at = datetime.now().strftime("%Y-%m-%d")
        db.commit()
        db.refresh(record)

        # Log audit event
        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="TRAINING_VERIFIED",
            action=f"{actor_role} {actor_name} verified training record: {record.course_name}",
            entity_type="TRAINING",
            entity_id=record.id,
            previous_value={"verification_status": prev_status},
            new_value={"verification_status": record.verification_status, "verified_by": actor_name, "notes": payload.verification_notes},
            source=actor_role,
            verification_status=record.verification_status,
            notes=payload.verification_notes or "Training credentials verified by authorized institution."
        )

        return record

    @staticmethod
    def update_training_record(
        db: Session,
        trainee: Trainee,
        record_id: str,
        payload: TrainingRecordUpdate,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> TrainingRecord:
        """
        Updates training record details.
        CRITICAL: If trainee edits an already verified record, do NOT silently overwrite.
        Preserve previous verified value in audit log, set status to pending, and queue for re-verification.
        """
        record = db.query(TrainingRecord).filter(
            TrainingRecord.id == record_id,
            TrainingRecord.trainee_id == trainee.id
        ).first()

        if not record:
            raise ValueError(f"Training record '{record_id}' not found for trainee.")

        prev_data = {
            "course_name": record.course_name,
            "provider_name": record.provider_name,
            "batch": record.batch,
            "start_date": record.start_date,
            "end_date": record.end_date,
            "delivery_mode": record.delivery_mode,
            "completion_status": record.completion_status,
            "attendance_rate": record.attendance_rate,
            "hours_completed": record.hours_completed,
            "assessment_result": record.assessment_result,
            "verification_status": record.verification_status,
            "verified_by": record.verified_by,
            "verified_at": record.verified_at,
        }

        was_verified = (record.verification_status == "verified")
        up_dict = payload.model_dump(exclude_unset=True)

        for field, value in up_dict.items():
            if value is not None and hasattr(record, field):
                setattr(record, field, value)

        if was_verified and actor_role == "TRAINEE":
            # Do not freely overwrite verified status; flag as pending correction
            record.verification_status = "pending"
            event_type = "TRAINING_CORRECTION_REQUESTED"
            action = f"Trainee requested correction on verified training: {record.course_name}"
            notes = "Correction submitted on previously verified record. Preserved previous values in history."
        else:
            event_type = "TRAINING_UPDATED"
            action = f"{actor_role} updated training record: {record.course_name}"
            notes = "Training record details updated."

        db.commit()
        db.refresh(record)

        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type=event_type,
            action=action,
            entity_type="TRAINING",
            entity_id=record.id,
            previous_value=prev_data,
            new_value=payload.model_dump(exclude_unset=True),
            source=actor_role,
            verification_status=record.verification_status,
            notes=notes
        )

        return record

    @staticmethod
    def request_training_verification(
        db: Session,
        trainee: Trainee,
        record_id: str,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> TrainingRecord:
        """
        Trainee explicitly requests verification on a training record.
        """
        record = db.query(TrainingRecord).filter(
            TrainingRecord.id == record_id,
            TrainingRecord.trainee_id == trainee.id
        ).first()

        if not record:
            raise ValueError(f"Training record '{record_id}' not found.")

        record.verification_status = "pending"
        db.commit()
        db.refresh(record)

        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="VERIFICATION_REQUESTED",
            action=f"Trainee requested verification for: {record.course_name}",
            entity_type="TRAINING",
            entity_id=record.id,
            previous_value={"verification_status": "pending"},
            new_value={"requested": True},
            source=actor_role,
            verification_status="PENDING",
            notes="Formal verification request logged for coach/provider audit."
        )

        return record

    @staticmethod
    def add_skill(
        db: Session,
        trainee: Trainee,
        payload: SkillAddRequest,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Adds a new canonical skill or updates existing skill with self-rating & practical evidence.
        Normalizes names (e.g. 'Python Programming' -> 'Python').
        Automatically triggers SkillScoringEngine and SkillGapEngine recalculation.
        """
        # 1. Normalize skill name
        norm = SkillNormalizationService.normalize_skill(db, payload.skill_name)
        canonical_name = norm.get("canonical_name") or payload.skill_name.strip()
        canonical_id = norm.get("canonical_skill_id")
        category = norm.get("category") or payload.category or "hard"

        # If canonical_id not found via alias, search skills table
        if not canonical_id:
            sk = db.query(Skill).filter(Skill.name.ilike(canonical_name)).first()
            if sk:
                canonical_id = sk.id
                canonical_name = sk.name
                category = sk.category
            else:
                canonical_id = f"sk-usr-{canonical_name.lower().replace(' ', '-')[:12]}"

        # 2. Check if TraineeSkill already exists
        ts = db.query(TraineeSkill).filter(
            TraineeSkill.trainee_id == trainee.id,
            (TraineeSkill.skill_id == canonical_id) | (TraineeSkill.name.ilike(canonical_name))
        ).first()

        self_rate = payload.self_rating if payload.self_rating is not None else 3.0
        self_rate = max(0.5, min(5.0, float(self_rate)))

        if not ts:
            ts = TraineeSkill(
                trainee_id=trainee.id,
                skill_id=canonical_id,
                name=canonical_name,
                level="intermediate" if self_rate >= 3.0 else "beginner",
                verified=False,
                score=int(self_rate * 20),
                proficiency_score=self_rate,
                target_level=4.0,
                confidence=0.75,
                calculation_explanation=f"Self-reported skill claim rated {self_rate:.1f}/5.0 by trainee. Pending objective verification."
            )
            db.add(ts)
        else:
            ts.name = canonical_name
            ts.score = int(self_rate * 20)

        # 3. Add TraineeSkillEvidence
        evidence_source = "practical_project" if payload.project_title else "self_reported"
        ev = TraineeSkillEvidence(
            trainee_id=trainee.id,
            skill_id=canonical_id,
            skill_name=canonical_name,
            evidence_source=evidence_source,
            score=self_rate,
            max_score=5.0,
            confidence=0.80 if payload.project_title else 0.70,
            assessment_date=datetime.now().strftime("%Y-%m-%d"),
            reviewer_source=f"Trainee Self-Report: {payload.project_title or 'Practical Portfolio'}",
            notes=payload.evidence_notes or f"Self-reported competency claim ({self_rate}/5).",
            artifact_url=payload.project_url
        )
        db.add(ev)
        db.commit()

        # 4. Trigger Scoring Engine & Gap Recalculation
        SkillScoringEngine.sync_trainee_skill_scores(db, trainee.id)
        try:
            SkillGapEngine.analyze_trainee_skill_gap(db, trainee.id, save_record=True)
        except Exception as e:
            logger.warning(f"Skill gap recalculation error on add_skill: {e}")

        # 5. Log Passport Event
        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="SKILL_ADDED",
            action=f"Added skill competency: {canonical_name} (Self-rated: {self_rate}/5)",
            entity_type="SKILL",
            entity_id=canonical_id,
            previous_value=None,
            new_value={"skill_name": canonical_name, "self_rating": self_rate, "evidence": payload.evidence_notes},
            source=actor_role,
            verification_status="PENDING",
            notes=f"Canonical mapping: '{payload.skill_name}' -> '{canonical_name}'. Skill gap engine synchronized."
        )

        return {
            "success": True,
            "skill_id": canonical_id,
            "canonical_name": canonical_name,
            "category": category,
            "self_rating": self_rate,
            "verification_status": "pending",
            "message": f"Skill '{canonical_name}' added and evidence queued for verification."
        }

    @staticmethod
    def verify_skill(
        db: Session,
        trainee: Trainee,
        skill_id: str,
        score: float,
        notes: str,
        actor_name: str,
        actor_role: str,
        actor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Allows Coach or Admin to officially verify a skill and assign an audited rubric score.
        """
        ts = db.query(TraineeSkill).filter(
            TraineeSkill.trainee_id == trainee.id,
            TraineeSkill.skill_id == skill_id
        ).first()

        if not ts:
            raise ValueError(f"Skill '{skill_id}' not found for trainee.")

        score = max(0.5, min(5.0, float(score)))
        ts.verified = True
        ts.proficiency_score = score
        ts.score = int(score * 20)

        ev = TraineeSkillEvidence(
            trainee_id=trainee.id,
            skill_id=skill_id,
            skill_name=ts.name,
            evidence_source="trainer_evaluation",
            score=score,
            max_score=5.0,
            confidence=0.95,
            assessment_date=datetime.now().strftime("%Y-%m-%d"),
            reviewer_source=f"Coach {actor_name}",
            notes=notes or "Officially assessed and verified by assigned workforce coach."
        )
        db.add(ev)
        db.commit()

        # Resync engine
        SkillScoringEngine.sync_trainee_skill_scores(db, trainee.id)
        try:
            SkillGapEngine.analyze_trainee_skill_gap(db, trainee.id, save_record=True)
        except Exception as e:
            logger.warning(f"Skill gap error on verify_skill: {e}")

        # Log Passport Event
        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="SKILL_VERIFIED",
            action=f"Coach {actor_name} verified skill competency: {ts.name} ({score}/5.0)",
            entity_type="SKILL",
            entity_id=skill_id,
            previous_value={"verified": False},
            new_value={"verified": True, "score": score, "evaluator": actor_name},
            source=actor_role,
            verification_status="VERIFIED",
            notes=notes or "Coach formal evaluation completed."
        )

        return {
            "success": True,
            "skill_id": skill_id,
            "skill_name": ts.name,
            "verified_score": score,
            "message": f"Skill '{ts.name}' verified with score {score}/5.0."
        }

    @staticmethod
    def get_detailed_skills(db: Session, trainee: Trainee) -> List[Dict[str, Any]]:
        """
        Retrieves trainee's skills with comprehensive source metadata, confidence %,
        coach assessment, employer verification, and evidence records.
        """
        detailed = []
        evidences = db.query(TraineeSkillEvidence).filter(TraineeSkillEvidence.trainee_id == trainee.id).all()
        ev_by_skill = {}
        for ev in evidences:
            if ev.skill_id not in ev_by_skill:
                ev_by_skill[ev.skill_id] = []
            ev_by_skill[ev.skill_id].append(ev)
            name_key = ev.skill_name.lower()
            if name_key not in ev_by_skill:
                ev_by_skill[name_key] = []
            ev_by_skill[name_key].append(ev)

        for ts in trainee.skills:
            ts_evs = ev_by_skill.get(ts.skill_id) or ev_by_skill.get(ts.name.lower()) or []
            seen_ids = set()
            unique_evs = []
            for e in ts_evs:
                if e.id not in seen_ids:
                    seen_ids.add(e.id)
                    unique_evs.append(e)

            sources = []
            coach_assessment = None
            employer_verification = None

            for e in unique_evs:
                src_label = e.reviewer_source or e.evidence_source.replace("_", " ").title()
                if "Resume" in src_label or e.evidence_source == "resume":
                    sources.append("Resume Analyzer")
                elif "Coach" in src_label or e.evidence_source == "trainer_evaluation":
                    sources.append(f"Coach Assessment")
                    coach_assessment = f"{e.score:.1f}/5.0"
                elif "Employer" in src_label or e.evidence_source == "employer_feedback":
                    sources.append(f"Employer Verification")
                    employer_verification = "Verified"
                elif e.evidence_source == "practical_project":
                    sources.append("Project Evidence")
                elif e.evidence_source == "certification":
                    sources.append("Certificate")
                elif e.evidence_source == "course" or "Course" in src_label:
                    sources.append("Course Derived")
                else:
                    sources.append(src_label)

            if not sources:
                sources = ["Self-Reported" if not ts.verified else "Assessment Engine"]

            clean_sources = list(dict.fromkeys(sources))
            status_label = "Verified" if ts.verified else ("AI Extracted" if any("Resume" in s for s in clean_sources) else "Pending Verification")
            if ts.verified and not coach_assessment:
                coach_assessment = f"{ts.proficiency_score:.1f}/5.0"

            detailed.append({
                "skill_id": ts.skill_id,
                "name": ts.name,
                "canonical_name": ts.name,
                "category": getattr(ts, "category", "hard"),
                "level": ts.level or "intermediate",
                "verified": ts.verified,
                "score": ts.score,
                "proficiency_score": ts.proficiency_score or 3.0,
                "target_level": ts.target_level or 4.0,
                "confidence": ts.confidence or 0.85,
                "sources": clean_sources,
                "status": status_label,
                "verification_status": "verified" if ts.verified else "pending",
                "coach_assessment": coach_assessment,
                "employer_verification": employer_verification,
                "evidence_count": len(unique_evs),
                "calculation_explanation": ts.calculation_explanation or f"{ts.name} proficiency: {ts.proficiency_score or 3.0}/5.0",
                "evidences": [
                    {
                        "id": e.id,
                        "source": e.evidence_source,
                        "score": e.score,
                        "confidence": e.confidence,
                        "date": e.assessment_date,
                        "reviewer": e.reviewer_source,
                        "notes": e.notes,
                        "artifact_url": e.artifact_url
                    } for e in unique_evs
                ]
            })
        return detailed

    @staticmethod
    def update_skill(
        db: Session,
        trainee: Trainee,
        skill_id: str,
        payload: SkillUpdateRequest,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates self-rating & practical evidence for an existing skill.
        If skill was verified by Coach, preserves verified score and records update event.
        """
        ts = db.query(TraineeSkill).filter(
            TraineeSkill.trainee_id == trainee.id,
            (TraineeSkill.skill_id == skill_id) | (TraineeSkill.name.ilike(skill_id))
        ).first()

        if not ts:
            raise ValueError(f"Skill '{skill_id}' not found for trainee.")

        prev_score = ts.proficiency_score
        was_verified = ts.verified

        if payload.self_rating is not None:
            self_rate = max(0.5, min(5.0, float(payload.self_rating)))
            if actor_role in ["COACH", "ADMIN"]:
                ts.proficiency_score = self_rate
                ts.score = int(self_rate * 20)
                ts.verified = True
            else:
                if not was_verified:
                    ts.proficiency_score = self_rate
                    ts.score = int(self_rate * 20)

            ev = TraineeSkillEvidence(
                trainee_id=trainee.id,
                skill_id=ts.skill_id,
                skill_name=ts.name,
                evidence_source="practical_project" if payload.project_title else "self_reported",
                score=self_rate,
                max_score=5.0,
                confidence=0.80 if payload.project_title else 0.70,
                assessment_date=datetime.now().strftime("%Y-%m-%d"),
                reviewer_source=f"Trainee Update: {payload.project_title or 'Practical Portfolio'}",
                notes=payload.evidence_notes or f"Self-reported competency claim ({self_rate}/5).",
                artifact_url=payload.project_url
            )
            db.add(ev)

        db.commit()
        db.refresh(ts)

        SkillScoringEngine.sync_trainee_skill_scores(db, trainee.id)
        try:
            SkillGapEngine.analyze_trainee_skill_gap(db, trainee.id, save_record=True)
        except Exception:
            pass

        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="SKILL_UPDATED",
            action=f"{actor_role} updated skill: {ts.name}",
            entity_type="SKILL",
            entity_id=ts.skill_id,
            previous_value={"proficiency_score": prev_score, "verified": was_verified},
            new_value={"proficiency_score": ts.proficiency_score, "self_rating": payload.self_rating},
            source=actor_role,
            verification_status="VERIFIED" if ts.verified else "PENDING",
            notes="Skill claims updated. Score engine and skill gaps synchronized."
        )

        return {
            "success": True,
            "skill_id": ts.skill_id,
            "skill_name": ts.name,
            "proficiency_score": ts.proficiency_score,
            "verified": ts.verified,
            "message": f"Skill '{ts.name}' updated successfully."
        }

    @classmethod
    def update_career_goals(
        cls,
        db: Session,
        trainee: Trainee,
        payload: CareerGoalsUpdateRequest,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates trainee career ambition & target role.
        Triggers live downstream skill gaps and career pathway recalculation.
        """
        existing = dict(trainee.career_preference or {})
        prev_role = (existing.get("target_roles") or ["Software Engineer"])[0]

        if payload.target_roles is not None:
            existing["target_roles"] = payload.target_roles
        elif payload.target_occupation is not None:
            existing["target_roles"] = [payload.target_occupation]

        if payload.preferred_industry is not None:
            existing["target_industries"] = [payload.preferred_industry]
        if payload.preferred_workplace is not None:
            existing["preferred_workplace"] = payload.preferred_workplace
        if payload.preferred_locations is not None:
            existing["preferred_locations"] = payload.preferred_locations
        if payload.target_salary_min is not None:
            existing["target_salary_min"] = payload.target_salary_min
        if payload.target_salary_max is not None:
            existing["target_salary_max"] = payload.target_salary_max
        if payload.employment_type is not None:
            existing["employment_type"] = payload.employment_type
        if payload.short_term_goal is not None:
            existing["short_term_goal"] = payload.short_term_goal
        if payload.long_term_goal is not None:
            existing["long_term_goal"] = payload.long_term_goal
        if payload.entrepreneurship_interest is not None:
            existing["entrepreneurship_interest"] = payload.entrepreneurship_interest
        if payload.further_education_interest is not None:
            existing["further_education_interest"] = payload.further_education_interest

        trainee.career_preference = existing
        flag_modified(trainee, "career_preference")
        db.commit()
        db.refresh(trainee)

        # Recalculate skill gaps against new target role
        target_role = (existing.get("target_roles") or ["Data Analyst"])[0]
        try:
            # Match occupation
            occ = db.query(Occupation).filter(Occupation.title.ilike(f"%{target_role}%")).first()
            occ_id = occ.id if occ else None
            SkillGapEngine.analyze_trainee_skill_gap(db, trainee.id, target_occupation_id=occ_id, save_record=True)
        except Exception as e:
            logger.warning(f"Error recalculating skill gaps on career goal change: {e}")

        # Log Passport Event
        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="CAREER_GOALS_UPDATED",
            action=f"Career goal updated: Target role -> {target_role}",
            entity_type="CAREER_GOAL",
            entity_id="career_preference",
            previous_value={"target_role": prev_role},
            new_value=existing,
            source=actor_role,
            verification_status="SELF_REPORTED",
            notes=f"Target role updated to '{target_role}'. Skill gaps and pathway recommendations synchronized."
        )

        return {
            "success": True,
            "target_role": target_role,
            "career_preference": existing,
            "message": "Career goals updated and skill gaps recalculated."
        }

    @staticmethod
    def add_outcome(
        db: Session,
        trainee: Trainee,
        outcome: OutcomeAddRequest,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> Trainee:
        """
        Reports an employment or longitudinal career outcome.
        Trainee-submitted outcomes default to 'pending' verification.
        Coach/Admin submitted outcomes are 'verified'.
        """
        history = list(trainee.outcome_history or [])
        item = outcome.model_dump()
        item["id"] = f"OUT-{len(history) + 1:03d}"
        item["created_at"] = datetime.now().strftime("%Y-%m-%d")

        # Set verification status based on role
        if actor_role in ["COACH", "ADMIN", "VERIFICATION_AUTHORITY", "AUDITOR"]:
            item["verification_status"] = "verified"
            item["verified_by"] = actor_name
            item["verified_role"] = actor_role
            item["verified_at"] = datetime.now().strftime("%Y-%m-%d")
            trainee.evidence_level = "evidence_backed"
        elif actor_role == "EMPLOYER":
            item["verification_status"] = "verified"
            item["verified_by"] = actor_name
            item["verified_role"] = "EMPLOYER"
            item["verified_at"] = datetime.now().strftime("%Y-%m-%d")
            trainee.evidence_level = "employer_confirmed"
        else:
            item["verification_status"] = "pending"

        # If this outcome is current, reset is_current on all other outcome records to ensure clean state
        if outcome.is_current:
            for prev_out in history:
                prev_out["is_current"] = False

        history.insert(0, item)
        trainee.outcome_history = history
        flag_modified(trainee, "outcome_history")

        # If current outcome, update top-level trainee fields
        if outcome.is_current:
            trainee.current_role = outcome.role_or_course
            trainee.current_employer = outcome.organization_or_venture
            trainee.placement_salary = outcome.compensation_or_funding
            trainee.placement_date = outcome.start_date
            trainee.primary_outcome_type = outcome.outcome_type
            if outcome.outcome_type in ["employment", "apprenticeship", "freelance", "entrepreneurship"]:
                trainee.status = "placed"
            elif outcome.outcome_type in ["higher_education", "education"]:
                trainee.status = "higher_ed"
            elif outcome.outcome_type in ["unemployed", "job_seeking"]:
                trainee.status = "job_seeking"
            else:
                trainee.status = "placed"

        db.commit()
        db.refresh(trainee)

        # Log Passport Event
        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="OUTCOME_REPORTED",
            action=f"Reported outcome: {outcome.role_or_course} at {outcome.organization_or_venture} ({item['verification_status']})",
            entity_type="OUTCOME",
            entity_id=item["id"],
            previous_value=None,
            new_value=item,
            source=actor_role,
            verification_status=item["verification_status"],
            notes=f"Outcome type: {outcome.outcome_type}. Status: {item['verification_status']}."
        )

        return trainee

    @staticmethod
    def verify_outcome(
        db: Session,
        trainee: Trainee,
        outcome_id: str,
        payload: OutcomeVerifyRequest,
        actor_name: str,
        actor_role: str,
        actor_id: Optional[str] = None
    ) -> Trainee:
        """
        Employer or Coach verifies an outcome record.
        Preserves original report and logs verification event.
        """
        history = list(trainee.outcome_history or [])
        target_idx = -1
        for idx, out in enumerate(history):
            if out.get("id") == outcome_id:
                target_idx = idx
                break

        if target_idx == -1 and history:
            target_idx = 0 # Default to most recent if matching ID not found

        if target_idx >= 0:
            history[target_idx]["verification_status"] = payload.verification_status
            history[target_idx]["verified_by"] = actor_name
            history[target_idx]["verified_role"] = actor_role
            history[target_idx]["verified_at"] = datetime.now().strftime("%Y-%m-%d")
            history[target_idx]["verification_notes"] = payload.verification_notes or f"Verified by {actor_role} ({actor_name})"
            if payload.confirmed_role:
                history[target_idx]["role_or_course"] = payload.confirmed_role
                if history[target_idx].get("is_current"):
                    trainee.current_role = payload.confirmed_role
            if payload.confirmed_start_date:
                history[target_idx]["start_date"] = payload.confirmed_start_date
                if history[target_idx].get("is_current"):
                    trainee.placement_date = payload.confirmed_start_date
            if payload.is_still_employed is not None:
                history[target_idx]["is_current"] = payload.is_still_employed
                if not payload.is_still_employed and history[target_idx].get("is_current"):
                    trainee.status = "job_seeking"

            trainee.outcome_history = history
            flag_modified(trainee, "outcome_history")

            # Update trainee evidence level and status if verified
            if payload.verification_status == "verified":
                if actor_role == "EMPLOYER":
                    trainee.evidence_level = "employer_confirmed"
                elif actor_role in ["COACH", "ADMIN", "VERIFICATION_AUTHORITY", "AUDITOR"]:
                    trainee.evidence_level = "evidence_backed"
                if history[target_idx].get("is_current"):
                    trainee.status = "placed"

        db.commit()
        db.refresh(trainee)

        # Log Passport Event
        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="OUTCOME_VERIFIED",
            action=f"{actor_role} {actor_name} verified employment outcome",
            entity_type="OUTCOME",
            entity_id=outcome_id,
            previous_value={"verification_status": "pending"},
            new_value=history[target_idx] if target_idx >= 0 else {},
            source=actor_role,
            verification_status=payload.verification_status,
            notes=payload.verification_notes or "Employment confirmed by authorized employer representative."
        )

        return trainee

    @staticmethod
    def update_outcome(
        db: Session,
        trainee: Trainee,
        outcome_id: str,
        payload: OutcomeUpdateRequest,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> Trainee:
        """
        Updates an existing outcome record. If verified by employer/coach, trainee cannot overwrite verification status,
        but can submit correction notes. Preserves previous values in audit history.
        """
        history = list(trainee.outcome_history or [])
        target_idx = -1
        for idx, out in enumerate(history):
            if out.get("id") == outcome_id:
                target_idx = idx
                break

        if target_idx == -1:
            raise ValueError(f"Outcome record '{outcome_id}' not found.")

        prev_outcome = dict(history[target_idx])
        is_verified = prev_outcome.get("verification_status") == "verified"
        up_dict = payload.model_dump(exclude_unset=True)

        for k, v in up_dict.items():
            if v is not None:
                if is_verified and actor_role == "TRAINEE" and k == "verification_status":
                    continue
                history[target_idx][k] = v

        if is_verified and actor_role == "TRAINEE":
            history[target_idx]["verification_status"] = "pending"
        elif actor_role in ["COACH", "ADMIN", "VERIFICATION_AUTHORITY", "AUDITOR", "EMPLOYER"] and up_dict.get("verification_status"):
            history[target_idx]["verification_status"] = up_dict["verification_status"]
            history[target_idx]["verified_by"] = actor_name
            history[target_idx]["verified_role"] = actor_role
            history[target_idx]["verified_at"] = datetime.now().strftime("%Y-%m-%d")
            if up_dict["verification_status"] == "verified":
                if actor_role == "EMPLOYER":
                    trainee.evidence_level = "employer_confirmed"
                else:
                    trainee.evidence_level = "evidence_backed"

        # If updated outcome is current, synchronize top-level trainee fields
        if history[target_idx].get("is_current"):
            trainee.current_role = history[target_idx].get("role_or_course")
            trainee.current_employer = history[target_idx].get("organization_or_venture")
            trainee.placement_salary = history[target_idx].get("compensation_or_funding")
            trainee.placement_date = history[target_idx].get("start_date")
            trainee.primary_outcome_type = history[target_idx].get("outcome_type")

        trainee.outcome_history = history
        flag_modified(trainee, "outcome_history")
        db.commit()
        db.refresh(trainee)

        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="OUTCOME_UPDATED",
            action=f"{actor_role} updated outcome: {history[target_idx].get('role_or_course')}",
            entity_type="OUTCOME",
            entity_id=outcome_id,
            previous_value=prev_outcome,
            new_value=history[target_idx],
            source=actor_role,
            verification_status=history[target_idx].get("verification_status", "pending"),
            notes="Outcome details updated with full audit trail."
        )

        return trainee

    @staticmethod
    def respond_to_follow_up(
        db: Session,
        trainee: Trainee,
        followup_id: str,
        payload: FollowUpResponseRequest,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> Trainee:
        """
        Trainee responds to scheduled retention follow-up audit questions.
        Creates a timestamped Passport event and updates longitudinal tracking.
        """
        history = list(trainee.follow_up_history or [])
        target_idx = -1
        for idx, flw in enumerate(history):
            if flw.get("id") == followup_id or flw.get("checkpoint_type", "").lower() in followup_id.lower():
                target_idx = idx
                break

        if target_idx == -1 and history:
            target_idx = 0

        now_str = datetime.now().strftime("%Y-%m-%d")
        response_data = payload.model_dump()

        if target_idx >= 0:
            history[target_idx]["status"] = "completed"
            history[target_idx]["response_date"] = now_str
            history[target_idx]["responses"] = response_data
            history[target_idx]["counselor_notes"] = (
                f"[Trainee Survey Response {now_str}]: Employment status: {payload.employment_status}. "
                f"Role: {payload.current_role or 'Unchanged'}. Using learned skills: {payload.still_using_learned_skills}. "
                f"Additional skills needed: {payload.additional_skills_needed or 'None specified'}. "
                f"{payload.trainee_notes or ''}"
            )
            # Check retention
            if payload.employment_status.upper() in ["EMPLOYED", "SELF_EMPLOYED", "APPRENTICE"]:
                history[target_idx]["retention_confirmed"] = True
            elif payload.employment_status.upper() == "OUTCOME_UNKNOWN":
                history[target_idx]["retention_confirmed"] = False
                trainee.status = "outcome_unknown"
            trainee.follow_up_history = history
            trainee.last_follow_up = now_str
        else:
            # Create completed follow-up record
            new_flw = {
                "id": f"AUD-{len(history) + 1:03d}",
                "checkpoint_type": "Longitudinal Retention Survey",
                "date": now_str,
                "counselor_name": "Self-Service Trainee Audit",
                "status": "completed",
                "retention_confirmed": payload.employment_status.upper() in ["EMPLOYED", "SELF_EMPLOYED"],
                "wage_progressed": False,
                "responses": response_data,
                "counselor_notes": f"Trainee survey completed on {now_str}. Status: {payload.employment_status}."
            }
            history.append(new_flw)
            trainee.follow_up_history = history
            trainee.last_follow_up = now_str

        flag_modified(trainee, "follow_up_history")
        db.commit()
        db.refresh(trainee)

        # Log Passport Event
        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="FOLLOWUP_RESPONDED",
            action=f"Trainee submitted response to follow-up audit (Status: {payload.employment_status})",
            entity_type="FOLLOWUP",
            entity_id=followup_id,
            previous_value=None,
            new_value=response_data,
            source=actor_role,
            verification_status="SELF_REPORTED",
            notes="Follow-up response recorded. Retention validation updated."
        )

        return trainee

    @staticmethod
    def add_certification(
        db: Session,
        trainee: Trainee,
        payload: CertificationAddRequest,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> Trainee:
        certs = list(trainee.certifications or [])
        item = payload.model_dump()
        item["id"] = f"CRT-{len(certs) + 1:03d}"
        item["verification_status"] = "verified" if actor_role in ["COACH", "ADMIN", "VERIFICATION_AUTHORITY", "AUDITOR"] else "pending"
        certs.append(item)
        trainee.certifications = certs
        flag_modified(trainee, "certifications")

        # Certificate Skill Extraction (OCR / text keyword mapping)
        cert_text = f"{payload.title} {payload.issuing_organization} {payload.credential_id or ''}"
        detected_keywords = []
        all_skills = db.query(Skill).all()
        for sk in all_skills:
            if re.search(r"(?i)\b" + re.escape(sk.name.lower()) + r"\b", cert_text):
                detected_keywords.append(sk)
            elif sk.aliases:
                for al in sk.aliases:
                    if al and len(al) > 2 and re.search(r"(?i)\b" + re.escape(al.lower()) + r"\b", cert_text):
                        detected_keywords.append(sk)
                        break

        for sk in detected_keywords:
            ts = db.query(TraineeSkill).filter(
                TraineeSkill.trainee_id == trainee.id,
                (TraineeSkill.skill_id == sk.id) | (TraineeSkill.name.ilike(sk.name))
            ).first()
            if not ts:
                ts = TraineeSkill(
                    trainee_id=trainee.id,
                    skill_id=sk.id,
                    name=sk.name,
                    level="intermediate",
                    verified=item["verification_status"] == "verified",
                    score=70,
                    proficiency_score=3.0,
                    target_level=4.0,
                    confidence=0.80,
                    calculation_explanation=f"Skill detected from certificate '{payload.title}'. Pending objective verification."
                )
                db.add(ts)

            ev = TraineeSkillEvidence(
                trainee_id=trainee.id,
                skill_id=sk.id,
                skill_name=sk.name,
                evidence_source="certification",
                score=3.5,
                max_score=5.0,
                confidence=0.85,
                assessment_date=payload.issue_date or datetime.now().strftime("%Y-%m-%d"),
                reviewer_source=f"Certificate: {payload.title} ({payload.issuing_organization})",
                notes=f"Extracted from credential ID: {payload.credential_id or 'Verified Credential'}",
                artifact_url=payload.verification_url
            )
            db.add(ev)

        db.commit()
        db.refresh(trainee)

        SkillScoringEngine.sync_trainee_skill_scores(db, trainee.id)

        # Log Passport Event
        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="CERTIFICATION_UPLOADED",
            action=f"Uploaded certification: {payload.title} ({payload.issuing_organization})",
            entity_type="CERTIFICATION",
            entity_id=item["id"],
            previous_value=None,
            new_value=item,
            source=actor_role,
            verification_status=item["verification_status"],
            notes=f"Credential ID: {payload.credential_id or 'None'}. Detected {len(detected_keywords)} associated competencies."
        )

        return trainee

    @staticmethod
    def update_certification(
        db: Session,
        trainee: Trainee,
        cert_id: str,
        payload: CertificationUpdateRequest,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> Trainee:
        """
        Updates an existing certification record and logs audit history.
        """
        certs = list(trainee.certifications or [])
        target_idx = -1
        for idx, c in enumerate(certs):
            if c.get("id") == cert_id or c.get("title") == cert_id:
                target_idx = idx
                break

        if target_idx == -1:
            raise ValueError(f"Certification '{cert_id}' not found.")

        prev_cert = dict(certs[target_idx])
        up_dict = payload.model_dump(exclude_unset=True)
        for k, v in up_dict.items():
            if v is not None:
                certs[target_idx][k] = v

        trainee.certifications = certs
        flag_modified(trainee, "certifications")
        db.commit()
        db.refresh(trainee)

        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="CERTIFICATION_UPDATED",
            action=f"Updated certification: {certs[target_idx].get('title')}",
            entity_type="CERTIFICATION",
            entity_id=cert_id,
            previous_value=prev_cert,
            new_value=certs[target_idx],
            source=actor_role,
            verification_status=certs[target_idx].get("verification_status", "pending"),
            notes="Certification details updated."
        )

        return trainee

    @staticmethod
    def verify_certification(
        db: Session,
        trainee: Trainee,
        cert_id: str,
        payload: CertificationVerifyRequest,
        actor_name: str,
        actor_role: str,
        actor_id: Optional[str] = None
    ) -> Trainee:
        """
        Coach, Admin, or Verification Authority officially audits and verifies a certification.
        Synchronizes verified status to extracted competencies.
        """
        certs = list(trainee.certifications or [])
        target_idx = -1
        for idx, c in enumerate(certs):
            if c.get("id") == cert_id or c.get("credential_id") == cert_id or c.get("title") == cert_id:
                target_idx = idx
                break

        if target_idx == -1 and certs:
            target_idx = 0

        if target_idx >= 0:
            certs[target_idx]["verification_status"] = payload.verification_status
            certs[target_idx]["status"] = "Active" if payload.verification_status == "verified" else "Unverified"
            certs[target_idx]["verified_by"] = actor_name
            certs[target_idx]["verified_role"] = actor_role
            certs[target_idx]["verified_at"] = datetime.now().strftime("%Y-%m-%d")
            certs[target_idx]["verification_notes"] = payload.verification_notes or f"Verified by {actor_role} ({actor_name})"
            trainee.certifications = certs
            flag_modified(trainee, "certifications")

            # If verified, mark corresponding skills extracted from cert as verified
            cert_title = certs[target_idx].get("title", "")
            if payload.verification_status == "verified" and cert_title:
                evs = db.query(TraineeSkillEvidence).filter(
                    TraineeSkillEvidence.trainee_id == trainee.id,
                    TraineeSkillEvidence.evidence_source == "certification"
                ).all()
                for ev in evs:
                    if (cert_title.lower() in (ev.reviewer_source or "").lower() or 
                        certs[target_idx].get("issuing_organization", "").lower() in (ev.reviewer_source or "").lower()):
                        ts = db.query(TraineeSkill).filter(
                            TraineeSkill.trainee_id == trainee.id,
                            TraineeSkill.skill_id == ev.skill_id
                        ).first()
                        if ts:
                            ts.verified = True

            db.commit()
            db.refresh(trainee)

            SkillScoringEngine.sync_trainee_skill_scores(db, trainee.id)

            TraineeService.log_passport_event(
                db=db,
                trainee_id=trainee.id,
                actor_name=actor_name,
                actor_role=actor_role,
                actor_id=actor_id,
                event_type="CERTIFICATION_VERIFIED",
                action=f"{actor_role} {actor_name} verified certification: {certs[target_idx].get('title')}",
                entity_type="CERTIFICATION",
                entity_id=certs[target_idx].get("id", cert_id),
                previous_value={"verification_status": "pending"},
                new_value=certs[target_idx],
                source=actor_role,
                verification_status=payload.verification_status,
                notes=payload.verification_notes or "Certification credential officially audited and verified."
            )

        return trainee

    @staticmethod
    def add_assessment(db: Session, trainee: Trainee, payload: AssessmentAddRequest) -> Trainee:
        assessments = list(trainee.assessments or [])
        item = payload.model_dump()
        item["id"] = f"ASM-{len(assessments) + 1:03d}"
        assessments.append(item)
        trainee.assessments = assessments
        flag_modified(trainee, "assessments")
        db.commit()
        db.refresh(trainee)

        # Log Passport Event
        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=payload.evaluator,
            actor_role="COACH",
            event_type="ASSESSMENT_RECORDED",
            action=f"Recorded course evaluation: {payload.assessment_name} ({payload.score}/{payload.max_score})",
            entity_type="ASSESSMENT",
            entity_id=item["id"],
            previous_value=None,
            new_value=item,
            source="COACH",
            verification_status="VERIFIED",
            notes=f"Evaluator: {payload.evaluator}. Feedback: {payload.feedback}"
        )

        return trainee

    @staticmethod
    def get_timeline(db: Session, trainee_id: str) -> List[Dict[str, Any]]:
        """
        Returns a unified chronological timeline of all verified and trainee-reported events.
        """
        events = db.query(PassportEvent).filter(
            PassportEvent.trainee_id == trainee_id
        ).order_by(desc(PassportEvent.timestamp)).all()

        timeline = []
        for ev in events:
            timeline.append({
                "id": ev.id,
                "timestamp": ev.timestamp,
                "event_type": ev.event_type,
                "action": ev.action,
                "actor_name": ev.actor_name,
                "actor_role": ev.actor_role,
                "entity_type": ev.entity_type,
                "source": ev.source,
                "verification_status": ev.verification_status,
                "notes": ev.notes,
                "new_value": ev.new_value
            })

        return timeline

    @staticmethod
    def get_audit_history(db: Session, trainee_id: str) -> List[Dict[str, Any]]:
        """
        Returns full immutable audit trail for governance, compliance, and dispute resolution.
        """
        events = db.query(PassportEvent).filter(
            PassportEvent.trainee_id == trainee_id
        ).order_by(desc(PassportEvent.timestamp)).all()

        return [
            {
                "id": ev.id,
                "timestamp": ev.timestamp,
                "actor_name": ev.actor_name,
                "actor_role": ev.actor_role,
                "event_type": ev.event_type,
                "action": ev.action,
                "entity_type": ev.entity_type,
                "entity_id": ev.entity_id,
                "previous_value": ev.previous_value,
                "new_value": ev.new_value,
                "source": ev.source,
                "verification_status": ev.verification_status,
                "notes": ev.notes
            }
            for ev in events
        ]

    @staticmethod
    def update_consent(
        db: Session,
        trainee: Trainee,
        payload: ConsentUpdateRequest,
        actor_name: str = "Trainee",
        actor_role: str = "TRAINEE",
        actor_id: Optional[str] = None
    ) -> Trainee:
        """
        Updates trainee consent status with full validation of states:
        ACTIVE, WITHDRAWN, EXPIRED, NOT_GRANTED.
        Enforces consent across all longitudinal tracking workflows.
        """
        raw_status = (payload.consent_status or "").strip().upper()
        mapping = {
            "ACTIVE": "ACTIVE",
            "GRANTED": "ACTIVE",
            "WITHDRAWN": "WITHDRAWN",
            "REVOKED": "WITHDRAWN",
            "EXPIRED": "EXPIRED",
            "NOT_GRANTED": "NOT_GRANTED",
            "DENIED": "NOT_GRANTED",
        }
        canonical_status = mapping.get(raw_status)
        if not canonical_status:
            valid_options = ["ACTIVE", "WITHDRAWN", "EXPIRED", "NOT_GRANTED"]
            raise ValueError(f"Invalid consent status '{payload.consent_status}'. Must be one of {valid_options}.")

        previous_consent = dict(trainee.consent_status or {})
        now_str = datetime.now().isoformat()

        updated_consent = {
            "status": canonical_status,
            "consent_status": canonical_status, # backward compatibility
            "share_with_employers": payload.share_with_employers,
            "share_with_funding_bodies": payload.share_with_funding_bodies,
            "share_anonymized_research": payload.share_anonymized_research,
            "share_public_portfolio": payload.share_public_portfolio,
            "updated_at": now_str,
            "consent_date": trainee.consent_status.get("consent_date", now_str[:10]) if trainee.consent_status else now_str[:10],
            "notes": payload.notes
        }

        trainee.consent_status = updated_consent
        flag_modified(trainee, "consent_status")

        # If consent is withdrawn, suspend active longitudinal follow-up items
        if canonical_status == "WITHDRAWN":
            from app.models.entities import LongitudinalFollowUp
            pending_milestones = db.query(LongitudinalFollowUp).filter(
                LongitudinalFollowUp.trainee_id == trainee.id,
                LongitudinalFollowUp.status.in_(["scheduled", "due"])
            ).all()
            for m in pending_milestones:
                m.notes = f"{m.notes or ''} [Follow-up suspended: Trainee withdrew tracking consent on {now_str[:10]}]"

        db.commit()
        db.refresh(trainee)

        # Log audit event
        TraineeService.log_passport_event(
            db=db,
            trainee_id=trainee.id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_id=actor_id,
            event_type="CONSENT_UPDATED",
            action=f"Updated longitudinal tracking consent to: {canonical_status}",
            entity_type="CONSENT",
            entity_id=trainee.id,
            previous_value=previous_consent,
            new_value=updated_consent,
            source=actor_role,
            verification_status="SYSTEM_VERIFIED",
            notes=f"Consent status transitioned to {canonical_status}."
        )

        return trainee
