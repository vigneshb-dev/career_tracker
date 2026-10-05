import logging
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models.entities import (
    Trainee,
    Employer,
    EmployerFeedbackVerification,
    Skill,
    TraineeSkill,
    TraineeSkillEvidence,
    CareerTimelineEvent
)
from app.schemas.schemas import EmployerVerificationCreate
from app.services.normalization_service import SkillNormalizationService

logger = logging.getLogger("skilltrace.employer_verification")

# Evidence Level Hierarchy
# Level 1: self_reported -> Level 2: employer_confirmed -> Level 3: evidence_backed -> Level 4: multi_source_verified
EVIDENCE_LEVELS = [
    "self_reported",
    "employer_confirmed",
    "evidence_backed",
    "multi_source_verified"
]

EVIDENCE_LEVEL_CONFIG = {
    "self_reported": {
        "level": 1,
        "label": "Self-Reported",
        "description": "Unverified placement or skill metrics self-disclosed by candidate.",
        "badge_color": "neutral"
    },
    "employer_confirmed": {
        "level": 2,
        "label": "Employer-Confirmed",
        "description": "Officially validated by direct employer portal verification and role confirmation.",
        "badge_color": "brand"
    },
    "evidence_backed": {
        "level": 3,
        "label": "Evidence-Backed",
        "description": "Corroborated by formal artifacts (W-2, signed offer letter, contract, state wage match).",
        "badge_color": "purple"
    },
    "multi_source_verified": {
        "level": 4,
        "label": "Multi-Source Verified",
        "description": "Independently corroborated across 3+ distinct streams: Employer + Assessment + State Registry.",
        "badge_color": "success"
    }
}


class EmployerVerificationService:

    @classmethod
    def calculate_evidence_level(
        cls,
        has_employer_confirmation: bool,
        artifacts_count: int,
        independent_sources_count: int
    ) -> str:
        """Determines the evidence hierarchy level based on corroboration rigor."""
        if has_employer_confirmation and independent_sources_count >= 2 and artifacts_count > 0:
            return "multi_source_verified"
        elif has_employer_confirmation and (artifacts_count > 0 or independent_sources_count >= 1):
            return "evidence_backed"
        elif has_employer_confirmation:
            return "employer_confirmed"
        else:
            return "self_reported"

    @classmethod
    def submit_verification(
        cls,
        db: Session,
        payload: EmployerVerificationCreate
    ) -> EmployerFeedbackVerification:
        """Processes and stores an employer's employment verification and skill feedback."""
        verification_id = f"EVF-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        # Calculate average skill score from employer ratings
        ratings = payload.skill_ratings or {}
        avg_score = round(sum(ratings.values()) / len(ratings), 2) if ratings else 4.0

        # Assess corroboration sources
        existing_evidences = (
            db.query(TraineeSkillEvidence)
            .filter(TraineeSkillEvidence.trainee_id == payload.trainee_id)
            .count()
        )
        has_artifacts = len(payload.verified_artifacts) > 0
        corroboration_sources = ["Employer Portal Verification"]
        if has_artifacts:
            corroboration_sources.append("Payroll / Offer Artifact")
        if existing_evidences >= 2:
            corroboration_sources.append("Standardized Assessment Benchmark")

        # Determine evidence level
        calculated_level = cls.calculate_evidence_level(
            has_employer_confirmation=(payload.verification_status == "confirmed"),
            artifacts_count=len(payload.verified_artifacts),
            independent_sources_count=len(corroboration_sources)
        )

        # Check if employer has already verified this trainee (idempotent upsert)
        existing_verification = db.query(EmployerFeedbackVerification).filter(
            EmployerFeedbackVerification.trainee_id == payload.trainee_id,
            (EmployerFeedbackVerification.employer_id == payload.employer_id) |
            (EmployerFeedbackVerification.employer_name.ilike(payload.employer_name))
        ).first()

        is_new_verification = existing_verification is None

        if existing_verification:
            verification = existing_verification
            verification.reviewer_name = payload.reviewer_name
            verification.reviewer_role = payload.reviewer_role
            verification.reviewer_email = payload.reviewer_email
            verification.trainee_name = payload.trainee_name
            verification.verification_status = payload.verification_status
            verification.confirmed_role = payload.confirmed_role
            verification.confirmed_department = payload.confirmed_department
            verification.employment_type = payload.employment_type
            verification.confirmed_start_date = payload.confirmed_start_date
            verification.salary_range = payload.salary_range
            verification.is_still_employed = payload.is_still_employed
            verification.retention_months = payload.retention_months
            verification.skill_ratings = ratings
            verification.average_skill_score = avg_score
            verification.missing_technical_skills = payload.missing_technical_skills or []
            verification.missing_soft_skills = payload.missing_soft_skills or []
            verification.training_relevance_rating = payload.training_relevance_rating
            verification.training_relevance_notes = payload.training_relevance_notes
            verification.curriculum_recommendations = payload.curriculum_recommendations
            verification.would_hire_from_provider_again = payload.would_hire_from_provider_again
            verification.evidence_level = calculated_level
            verification.verified_artifacts = payload.verified_artifacts or []
            verification.multi_source_corroboration = {
                "sources": corroboration_sources,
                "confidence_score": 0.95 if calculated_level == "multi_source_verified" else 0.88,
                "audit_timestamp": datetime.utcnow().isoformat()
            }
            verification.submission_date = datetime.utcnow().strftime("%Y-%m-%d")
        else:
            verification_id = f"EVF-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            verification = EmployerFeedbackVerification(
                id=verification_id,
                employer_id=payload.employer_id,
                employer_name=payload.employer_name,
                reviewer_name=payload.reviewer_name,
                reviewer_role=payload.reviewer_role,
                reviewer_email=payload.reviewer_email,
                trainee_id=payload.trainee_id,
                trainee_name=payload.trainee_name,
                verification_status=payload.verification_status,
                confirmed_role=payload.confirmed_role,
                confirmed_department=payload.confirmed_department,
                employment_type=payload.employment_type,
                confirmed_start_date=payload.confirmed_start_date,
                salary_range=payload.salary_range,
                is_still_employed=payload.is_still_employed,
                retention_months=payload.retention_months,
                skill_ratings=ratings,
                average_skill_score=avg_score,
                missing_technical_skills=payload.missing_technical_skills or [],
                missing_soft_skills=payload.missing_soft_skills or [],
                training_relevance_rating=payload.training_relevance_rating,
                training_relevance_notes=payload.training_relevance_notes,
                curriculum_recommendations=payload.curriculum_recommendations,
                would_hire_from_provider_again=payload.would_hire_from_provider_again,
                evidence_level=calculated_level,
                verified_artifacts=payload.verified_artifacts or [],
                multi_source_corroboration={
                    "sources": corroboration_sources,
                    "confidence_score": 0.95 if calculated_level == "multi_source_verified" else 0.88,
                    "audit_timestamp": datetime.utcnow().isoformat()
                },
                submission_date=datetime.utcnow().strftime("%Y-%m-%d")
            )
            db.add(verification)

        # 1. Update Trainee Dossier and Outcomes in Real Time
        trainee = db.query(Trainee).filter(Trainee.id == payload.trainee_id).first()
        if trainee:
            if payload.verification_status == "confirmed":
                trainee.current_role = payload.confirmed_role
                trainee.current_employer = payload.employer_name
                if payload.salary_range:
                    trainee.placement_salary = payload.salary_range
                trainee.status = "placed"
                trainee.evidence_level = calculated_level

            # Real-time synchronization and deduplication of outcome_history
            raw_history = list(trainee.outcome_history or [])
            emp_target = (payload.employer_name or "").strip().lower()
            matched = False

            for out in raw_history:
                org = (out.get("organization_or_venture") or "").strip().lower()
                is_curr = out.get("is_current")
                is_match = False
                if emp_target and org and (org in emp_target or emp_target in org):
                    is_match = True
                elif is_curr and (out.get("verification_status") == "pending"):
                    is_match = True

                if is_match:
                    out["verification_status"] = "verified" if payload.verification_status == "confirmed" else "disputed"
                    out["verified_by"] = payload.reviewer_name
                    out["verified_role"] = "EMPLOYER"
                    out["verified_at"] = datetime.utcnow().strftime("%Y-%m-%d")
                    out["verification_notes"] = payload.training_relevance_notes or f"Verified by {payload.employer_name} ({payload.reviewer_name})"
                    out["evidence_level"] = calculated_level
                    if payload.confirmed_role:
                        out["role_or_course"] = payload.confirmed_role
                    if payload.confirmed_start_date:
                        out["start_date"] = payload.confirmed_start_date
                    if payload.salary_range:
                        out["compensation_or_funding"] = payload.salary_range
                    out["is_current"] = payload.is_still_employed
                    if not out.get("organization_or_venture"):
                        out["organization_or_venture"] = payload.employer_name
                    matched = True

            if not matched and payload.verification_status == "confirmed":
                new_out = {
                    "id": f"OUT-{len(raw_history) + 1:03d}",
                    "outcome_type": "employment",
                    "role_or_course": payload.confirmed_role,
                    "organization_or_venture": payload.employer_name,
                    "location": "India",
                    "start_date": payload.confirmed_start_date or datetime.utcnow().strftime("%Y-%m-%d"),
                    "compensation_or_funding": payload.salary_range,
                    "is_current": payload.is_still_employed,
                    "verification_status": "verified",
                    "verified_by": payload.reviewer_name,
                    "verified_role": "EMPLOYER",
                    "verified_at": datetime.utcnow().strftime("%Y-%m-%d"),
                    "verification_notes": payload.training_relevance_notes or f"Verified by {payload.employer_name} ({payload.reviewer_name})",
                    "evidence_level": calculated_level,
                    "created_at": datetime.utcnow().strftime("%Y-%m-%d")
                }
                raw_history.insert(0, new_out)

            # Deduplicate outcome history by (role, organization, start_date)
            deduped_history = []
            seen_outcomes = set()
            for out in raw_history:
                role_key = (out.get("role_or_course") or "").strip().lower()
                org_key = (out.get("organization_or_venture") or "").strip().lower()
                date_key = (out.get("start_date") or "").strip().lower()
                key = (role_key, org_key, date_key)
                if key in seen_outcomes:
                    continue
                seen_outcomes.add(key)
                deduped_history.append(out)

            trainee.outcome_history = deduped_history
            flag_modified(trainee, "outcome_history")

            # Log Living Outcome Passport Event
            try:
                from app.services.trainee_service import TraineeService
                TraineeService.log_passport_event(
                    db=db,
                    trainee_id=trainee.id,
                    actor_name=payload.reviewer_name,
                    actor_role="EMPLOYER",
                    actor_id=payload.employer_id,
                    event_type="OUTCOME_VERIFIED",
                    action=f"Employer verified outcome: {payload.confirmed_role} at {payload.employer_name} ({calculated_level})",
                    entity_type="OUTCOME",
                    entity_id=trainee.id,
                    previous_value=None,
                    new_value={"evidence_level": calculated_level, "role": payload.confirmed_role, "employer": payload.employer_name},
                    source="EMPLOYER_PORTAL",
                    verification_status="verified" if payload.verification_status == "confirmed" else "disputed",
                    notes=f"Demonstrated competency ratings logged: {ratings}. Relevance score: {payload.training_relevance_rating}/5.0."
                )
            except Exception as e:
                logger.warning(f"Could not log passport event: {e}")

        # 2. Add skill evidence entries for each skill rated by employer
        if ratings and trainee:
            for skill_name, score in ratings.items():
                clean_name = str(skill_name).strip()
                if not clean_name:
                    continue

                # 1. Lookup skill by id, exact name, or canonical name
                skill_obj = db.query(Skill).filter(
                    (Skill.id == clean_name) | 
                    (Skill.name.ilike(clean_name)) |
                    (Skill.canonical_name.ilike(clean_name))
                ).first()

                # 2. Attempt normalization service match
                if not skill_obj:
                    try:
                        norm = SkillNormalizationService.normalize_skill(db, clean_name)
                        if norm.get("canonical_skill_id"):
                            skill_obj = db.query(Skill).filter(Skill.id == norm["canonical_skill_id"]).first()
                    except Exception:
                        pass

                # 3. If skill does not exist in skills table, create it to satisfy foreign key constraint
                if not skill_obj:
                    slug_id = f"sk-{re.sub(r'[^a-zA-Z0-9]+', '-', clean_name.lower()).strip('-')[:35]}"
                    skill_obj = db.query(Skill).filter(Skill.id == slug_id).first()
                    if not skill_obj:
                        is_soft = any(w in clean_name.lower() for w in [
                            "communication", "leadership", "teamwork", "management", 
                            "collaboration", "presentation", "stakeholder", "problem solving", "soft"
                        ])
                        skill_obj = Skill(
                            id=slug_id,
                            name=clean_name,
                            canonical_name=clean_name,
                            category="soft" if is_soft else "hard",
                            domain="Professional Competencies",
                            status="ACTIVE",
                            demand_score=75,
                            trainees_proficient=1,
                            open_job_demands=1,
                            description=f"Workplace skill evaluated during employer verification ({clean_name})."
                        )
                        db.add(skill_obj)
                        db.flush()

                # 4. Synchronize TraineeSkill record
                ts = db.query(TraineeSkill).filter(
                    TraineeSkill.trainee_id == trainee.id,
                    (TraineeSkill.skill_id == skill_obj.id) | (TraineeSkill.name.ilike(skill_obj.name))
                ).first()
                if not ts:
                    ts = TraineeSkill(
                        trainee_id=trainee.id,
                        skill_id=skill_obj.id,
                        name=skill_obj.name,
                        level="proficient" if float(score) >= 3.5 else "intermediate",
                        verified=True,
                        score=int(float(score) * 20),
                        proficiency_score=float(score),
                        target_level=4.0,
                        confidence=0.95,
                        calculation_explanation=f"Employer verified rating of {score}/5.0 by {payload.employer_name}."
                    )
                    db.add(ts)
                else:
                    ts.verified = True
                    ts.proficiency_score = float(score)
                    ts.score = int(float(score) * 20)
                    ts.calculation_explanation = f"Employer verified rating of {score}/5.0 by {payload.employer_name}."

                # 5. Insert or Update TraineeSkillEvidence
                evidence_row = db.query(TraineeSkillEvidence).filter(
                    TraineeSkillEvidence.trainee_id == trainee.id,
                    TraineeSkillEvidence.skill_id == skill_obj.id,
                    TraineeSkillEvidence.evidence_source == "employer_feedback"
                ).first()
                if evidence_row:
                    evidence_row.score = float(score)
                    evidence_row.confidence = 0.95
                    evidence_row.assessment_date = datetime.utcnow().strftime("%Y-%m-%d")
                    evidence_row.reviewer_source = f"Employer Review: {payload.employer_name} ({payload.reviewer_name})"
                    evidence_row.rubric_scores = {"on_the_job_performance": float(score)}
                    evidence_row.notes = f"Employer confirmed demonstrated competency score of {score}/5.0 during verified retention."
                else:
                    evidence_row = TraineeSkillEvidence(
                        trainee_id=trainee.id,
                        skill_id=skill_obj.id,
                        skill_name=skill_obj.name,
                        score=float(score),
                        evidence_source="employer_feedback",
                        confidence=0.95,
                        assessment_date=datetime.utcnow().strftime("%Y-%m-%d"),
                        reviewer_source=f"Employer Review: {payload.employer_name} ({payload.reviewer_name})",
                        rubric_scores={"on_the_job_performance": float(score)},
                        notes=f"Employer confirmed demonstrated competency score of {score}/5.0 during verified retention."
                    )
                    db.add(evidence_row)

        # 3. Corroborate Career Timeline Event
        current_event = (
            db.query(CareerTimelineEvent)
            .filter(
                CareerTimelineEvent.trainee_id == payload.trainee_id,
                CareerTimelineEvent.stage.in_(["current_status", "first_outcome"])
            )
            .first()
        )
        if current_event and payload.verification_status == "confirmed":
            current_event.verification_status = "verified"
            current_event.verification_notes = (
                f"Employer-Confirmed: Verified by {payload.employer_name} ({payload.reviewer_name}) "
                f"at Evidence Level '{calculated_level.replace('_', ' ').title()}'."
            )

        # 4. Increment Employer hire stats (only on new verification)
        if is_new_verification and payload.verification_status == "confirmed" and payload.employer_id:
            employer = db.query(Employer).filter(Employer.id == payload.employer_id).first()
            if employer:
                employer.hired_trainees_count = (employer.hired_trainees_count or 0) + 1

        db.commit()
        db.refresh(verification)
        logger.info(f"Recorded employer verification {verification.id} for trainee {payload.trainee_id} (Level: {calculated_level})")
        return verification

    @classmethod
    def get_verifications(
        cls,
        db: Session,
        employer_id: Optional[str] = None,
        trainee_id: Optional[str] = None
    ) -> List[EmployerFeedbackVerification]:
        query = db.query(EmployerFeedbackVerification)
        if employer_id:
            query = query.filter(EmployerFeedbackVerification.employer_id == employer_id)
        if trainee_id:
            query = query.filter(EmployerFeedbackVerification.trainee_id == trainee_id)
        return query.order_by(EmployerFeedbackVerification.submission_date.desc()).all()

    @classmethod
    def get_evidence_hierarchy_summary(cls, db: Session) -> Dict[str, Any]:
        """Calculates cohort-wide distribution across evidence tiers strictly from database records."""
        trainees = db.query(Trainee).all()
        total_trainees = len(trainees)

        level_counts = {
            "self_reported": 0,
            "employer_confirmed": 0,
            "evidence_backed": 0,
            "multi_source_verified": 0
        }

        for t in trainees:
            lvl = getattr(t, "evidence_level", "self_reported") or "self_reported"
            # Normalize legacy level strings
            if lvl in ["employer_verified", "confirmed"]:
                lvl = "employer_confirmed"
            elif lvl in ["document_verified"]:
                lvl = "evidence_backed"
            elif lvl in ["partially_verified"]:
                lvl = "evidence_backed"

            if lvl in level_counts:
                level_counts[lvl] += 1
            else:
                level_counts["self_reported"] += 1

        distribution = []
        for key in EVIDENCE_LEVELS:
            cfg = EVIDENCE_LEVEL_CONFIG[key]
            cnt = level_counts[key]
            pct = round((cnt / total_trainees) * 100, 1) if total_trainees > 0 else 0.0
            distribution.append({
                "level_key": key,
                "level_number": cfg["level"],
                "label": cfg["label"],
                "description": cfg["description"],
                "badge_color": cfg["badge_color"],
                "count": cnt,
                "percentage": pct
            })

        return {
            "total_trainees": total_trainees,
            "self_reported_count": level_counts["self_reported"],
            "self_reported_percent": round((level_counts["self_reported"] / total_trainees) * 100, 1) if total_trainees > 0 else 0.0,
            "employer_confirmed_count": level_counts["employer_confirmed"],
            "employer_confirmed_percent": round((level_counts["employer_confirmed"] / total_trainees) * 100, 1) if total_trainees > 0 else 0.0,
            "evidence_backed_count": level_counts["evidence_backed"],
            "evidence_backed_percent": round((level_counts["evidence_backed"] / total_trainees) * 100, 1) if total_trainees > 0 else 0.0,
            "multi_source_verified_count": level_counts["multi_source_verified"],
            "multi_source_verified_percent": round((level_counts["multi_source_verified"] / total_trainees) * 100, 1) if total_trainees > 0 else 0.0,
            "evidence_levels": distribution
        }

    @classmethod
    def seed_employer_verifications(cls, db: Session, force: bool = False):
        """Seeds initial realistic employer verification & feedback submissions."""
        existing_count = db.query(EmployerFeedbackVerification).count()
        if not force and existing_count >= 3:
            return

        if force:
            db.query(EmployerFeedbackVerification).delete()
            db.commit()

        logger.info("Seeding realistic Employer Feedback and Outcome Verifications...")

        seed_data = [
            # 1. Priya Sharma - Apex Cloud Technologies India (Multi-Source Verified)
            EmployerFeedbackVerification(
                id="EVF-2024-001",
                employer_id="EMP-01",
                employer_name="Apex Cloud Technologies India Pvt. Ltd.",
                reviewer_name="Sunita Rao",
                reviewer_role="Director of Frontend Engineering",
                reviewer_email="s.rao@apexcloud.co.in",
                trainee_id="TRN-2024-001",
                trainee_name="Priya Sharma",
                verification_status="confirmed",
                confirmed_role="Junior Frontend Engineer",
                confirmed_department="Enterprise Cloud UI",
                employment_type="Full-time",
                confirmed_start_date="2024-06-01",
                salary_range="₹8,40,000 / yr",
                is_still_employed=True,
                retention_months=6,
                skill_ratings={
                    "React.js": 4.8,
                    "TypeScript": 4.5,
                    "REST APIs": 4.6,
                    "State Management": 4.4,
                    "Git Version Control": 4.7
                },
                average_skill_score=4.6,
                missing_technical_skills=[
                    "CI/CD Pipeline Automation (GitHub Actions)",
                    "Docker Containerization for Local Dev"
                ],
                missing_soft_skills=[
                    "Cross-Functional Stakeholder Presentations"
                ],
                training_relevance_rating=4.9,
                training_relevance_notes="Priya transitioned into our enterprise frontend codebase with zero hand-holding. Exceptionally well prepared in modern React and TypeScript architecture.",
                curriculum_recommendations="Incorporate 2 weeks of Docker and automated continuous integration so candidates are familiar with cloud build pipelines on day one.",
                would_hire_from_provider_again=True,
                evidence_level="multi_source_verified",
                verified_artifacts=["offer_letter_signed.pdf", "epfo_wage_corroboration.pdf"],
                multi_source_corroboration={
                    "sources": ["Employer Verification Portal", "EPFO Wage Registry Corroboration", "Capstone Defense Grade"],
                    "confidence_score": 0.98,
                    "audit_timestamp": "2024-07-22T10:00:00"
                },
                submission_date="2024-07-22"
            ),
            # 2. Karthik Venkataraman - Vanguard Healthcare Networks India (Evidence-Backed)
            EmployerFeedbackVerification(
                id="EVF-2024-002",
                employer_id="EMP-04",
                employer_name="Vanguard Healthcare Networks India",
                reviewer_name="Dr. Mohanarangam Pillai",
                reviewer_role="Chief Information Security Officer & Apprenticeship Supervisor",
                reviewer_email="m.pillai@vanguardhealth.co.in",
                trainee_id="TRN-2024-004",
                trainee_name="Karthik Venkataraman",
                verification_status="confirmed",
                confirmed_role="Healthcare Cybersecurity Systems Apprentice",
                confirmed_department="Hospital Infrastructure Security",
                employment_type="Apprenticeship",
                confirmed_start_date="2024-08-01",
                salary_range="₹4,80,000 / yr",
                is_still_employed=True,
                retention_months=8,
                skill_ratings={
                    "Network & Cloud Security": 4.8,
                    "DISHA / NABH Compliance": 5.0,
                    "Incident Response": 4.5,
                    "System Hardening": 4.6
                },
                average_skill_score=4.72,
                missing_technical_skills=[
                    "Automated Vulnerability Scanning (Nessus/Qualys)"
                ],
                missing_soft_skills=[
                    "Clinical Staff Incident Briefing"
                ],
                training_relevance_rating=4.8,
                training_relevance_notes="Solid fundamental security hygiene, network perimeter isolation, and practical hands-on proficiency defending hospital IoT telemetry.",
                curriculum_recommendations="Add more practice hours with medical device zero-trust micro-segmentation.",
                would_hire_from_provider_again=True,
                evidence_level="evidence_backed",
                verified_artifacts=["naps_apprenticeship_contract.pdf", "naps_portal_verification.pdf"],
                multi_source_corroboration={
                    "sources": ["Employer Verification Portal", "NAPS / MSDE Registered Apprenticeship Log"],
                    "confidence_score": 0.94,
                    "audit_timestamp": "2024-08-10T14:30:00"
                },
                submission_date="2024-08-10"
            ),
            # 3. Ananya Iyer - Meridian MedTech India (Employer-Confirmed)
            EmployerFeedbackVerification(
                id="EVF-2024-003",
                employer_id="EMP-02",
                employer_name="Meridian MedTech India Pvt. Ltd.",
                reviewer_name="Dr. Vikram Reddy",
                reviewer_role="Chief Medical Information Officer",
                reviewer_email="v.reddy@meridianmedtech.co.in",
                trainee_id="TRN-2024-006",
                trainee_name="Ananya Iyer",
                verification_status="confirmed",
                confirmed_role="Health Informatics Research Fellow",
                confirmed_department="Clinical NLP & Bio-Informatics",
                employment_type="Fellowship",
                confirmed_start_date="2024-08-25",
                salary_range="₹6,00,000 / yr (₹50,000 / mo Fellowship Stipend)",
                is_still_employed=True,
                retention_months=4,
                skill_ratings={
                    "EHR Data Extraction": 4.6,
                    "DISHA & DPDP Act Compliance": 5.0,
                    "SQL / Healthcare Queries": 4.4,
                    "Clinical Terminologies (SNOMED/ICD)": 4.2
                },
                average_skill_score=4.55,
                missing_technical_skills=[
                    "HL7 / FHIR API Integration"
                ],
                missing_soft_skills=[
                    "Interdisciplinary Physician Communication"
                ],
                training_relevance_rating=4.7,
                training_relevance_notes="Ananya demonstrates impeccable data governance and security compliance. A standout research fellow.",
                curriculum_recommendations="Recommend adding practical Fast Healthcare Interoperability Resources (FHIR) API sandbox labs.",
                would_hire_from_provider_again=True,
                evidence_level="employer_confirmed",
                verified_artifacts=["fellowship_appointment_letter.pdf"],
                multi_source_corroboration={
                    "sources": ["Employer Verification Portal"],
                    "confidence_score": 0.90,
                    "audit_timestamp": "2024-09-01T09:00:00"
                },
                submission_date="2024-09-01"
            )
        ]

        for v in seed_data:
            try:
                with db.begin_nested():
                    if not db.query(Trainee).filter(Trainee.id == v.trainee_id).first():
                        continue
                    if not db.query(EmployerFeedbackVerification).filter(EmployerFeedbackVerification.id == v.id).first():
                        db.add(v)
                        db.flush()
                    t = db.query(Trainee).filter(Trainee.id == v.trainee_id).first()
                    if t:
                        t.evidence_level = v.evidence_level
            except Exception as e:
                logger.warning(f"Error seeding employer verification {v.id}: {e}")
        db.commit()

        # Also set David Chen (Self-Employment) as evidence_backed (LLC registration + client contracts)
        t_david = db.query(Trainee).filter(Trainee.id == "TRN-2024-006").first()
        if t_david:
            t_david.evidence_level = "evidence_backed"

        # Marcus Vance (Freelancing) as evidence_backed (verified Upwork & direct wire payments)
        t_marcus = db.query(Trainee).filter(Trainee.id == "TRN-2024-002").first()
        if t_marcus:
            t_marcus.evidence_level = "evidence_backed"

        # Maya Lin (Entrepreneurship) as multi_source_verified (Secretary of State Articles + Stripe ARR + W-2 payroll)
        t_maya = db.query(Trainee).filter(Trainee.id == "TRN-2024-003").first()
        if t_maya:
            t_maya.evidence_level = "multi_source_verified"

        # Jordan Miller as self_reported
        t_jordan = db.query(Trainee).filter(Trainee.id == "TRN-2024-007").first()
        if t_jordan:
            t_jordan.evidence_level = "self_reported"

        db.commit()
        logger.info(f"Seeded {len(seed_data)} employer verifications across evidence tiers.")
