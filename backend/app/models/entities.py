from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base, get_vector_type
from app.core.config import settings

from enum import Enum
from typing import Optional

vector_type = get_vector_type(settings.VECTOR_DIMENSION)

class VerificationStatus(str, Enum):
    SELF_REPORTED = "SELF_REPORTED"
    PARTIALLY_VERIFIED = "PARTIALLY_VERIFIED"
    EMPLOYER_VERIFIED = "EMPLOYER_VERIFIED"
    DOCUMENT_VERIFIED = "DOCUMENT_VERIFIED"
    SYSTEM_VERIFIED = "SYSTEM_VERIFIED"
    UNVERIFIED = "UNVERIFIED"
    UNKNOWN = "UNKNOWN"
    REJECTED = "REJECTED"

class ConsentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    WITHDRAWN = "WITHDRAWN"
    EXPIRED = "EXPIRED"
    NOT_GRANTED = "NOT_GRANTED"

class OutcomeState(str, Enum):
    EMPLOYED = "EMPLOYED"
    SELF_EMPLOYED = "SELF_EMPLOYED"
    APPRENTICESHIP = "APPRENTICESHIP"
    FREELANCING = "FREELANCING"
    ENTREPRENEURSHIP = "ENTREPRENEURSHIP"
    HIGHER_STUDIES = "HIGHER_STUDIES"
    UNEMPLOYED = "UNEMPLOYED"
    SEEKING_EMPLOYMENT = "SEEKING_EMPLOYMENT"
    UNKNOWN = "UNKNOWN"
    UNREACHABLE = "UNREACHABLE"
    WITHDRAWN_CONSENT = "WITHDRAWN_CONSENT"

class TimelineStage(str, Enum):
    TRAINING = "TRAINING"
    COMPLETION = "COMPLETION"
    PLACEMENT = "PLACEMENT"
    EMPLOYMENT = "EMPLOYMENT"
    JOB_CHANGE = "JOB_CHANGE"
    SALARY_CHANGE = "SALARY_CHANGE"
    RETENTION = "RETENTION"
    SKILL_DEVELOPMENT = "SKILL_DEVELOPMENT"

def normalize_outcome_state(
    state: Optional[str],
    consent_status: Optional[str] = None,
    is_reachable: bool = True
) -> str:
    if consent_status and consent_status.strip().upper() in ["WITHDRAWN", "REVOKED", "NOT_GRANTED"]:
        return OutcomeState.WITHDRAWN_CONSENT.value
    if not is_reachable:
        return OutcomeState.UNREACHABLE.value
    if not state:
        return OutcomeState.UNKNOWN.value

    s = state.strip().upper().replace("-", "_").replace(" ", "_")
    mapping = {
        "EMPLOYED": OutcomeState.EMPLOYED.value,
        "EMPLOYMENT": OutcomeState.EMPLOYED.value,
        "SALARIED": OutcomeState.EMPLOYED.value,
        "SALARIED_EMPLOYMENT": OutcomeState.EMPLOYED.value,
        "FULL_TIME": OutcomeState.EMPLOYED.value,
        "PART_TIME": OutcomeState.EMPLOYED.value,
        "PLACED": OutcomeState.EMPLOYED.value,
        
        "SELF_EMPLOYED": OutcomeState.SELF_EMPLOYED.value,
        "SELF_EMPLOYMENT": OutcomeState.SELF_EMPLOYED.value,
        "LLC": OutcomeState.SELF_EMPLOYED.value,
        
        "APPRENTICESHIP": OutcomeState.APPRENTICESHIP.value,
        "INTERNSHIP": OutcomeState.APPRENTICESHIP.value,
        "NAPS": OutcomeState.APPRENTICESHIP.value,
        "APPRENTICE": OutcomeState.APPRENTICESHIP.value,
        
        "FREELANCING": OutcomeState.FREELANCING.value,
        "FREELANCE": OutcomeState.FREELANCING.value,
        "CONTRACTOR": OutcomeState.FREELANCING.value,
        
        "ENTREPRENEURSHIP": OutcomeState.ENTREPRENEURSHIP.value,
        "STARTUP": OutcomeState.ENTREPRENEURSHIP.value,
        "FOUNDER": OutcomeState.ENTREPRENEURSHIP.value,
        
        "HIGHER_STUDIES": OutcomeState.HIGHER_STUDIES.value,
        "HIGHER_EDUCATION": OutcomeState.HIGHER_STUDIES.value,
        "FURTHER_EDUCATION": OutcomeState.HIGHER_STUDIES.value,
        "EDUCATION": OutcomeState.HIGHER_STUDIES.value,
        
        "UNEMPLOYED": OutcomeState.UNEMPLOYED.value,
        
        "SEEKING_EMPLOYMENT": OutcomeState.SEEKING_EMPLOYMENT.value,
        "JOB_SEEKING": OutcomeState.SEEKING_EMPLOYMENT.value,
        "SEEKING_JOB": OutcomeState.SEEKING_EMPLOYMENT.value,
        "IN_TRAINING": OutcomeState.SEEKING_EMPLOYMENT.value,
        
        "UNREACHABLE": OutcomeState.UNREACHABLE.value,
        "CONTACT_FAILED": OutcomeState.UNREACHABLE.value,
        
        "WITHDRAWN_CONSENT": OutcomeState.WITHDRAWN_CONSENT.value,
        "WITHDRAWN": OutcomeState.WITHDRAWN_CONSENT.value,
        
        "UNKNOWN": OutcomeState.UNKNOWN.value,
        "OUTCOME_UNKNOWN": OutcomeState.UNKNOWN.value,
    }
    return mapping.get(s, OutcomeState.UNKNOWN.value)

def calculate_outcome_confidence(
    verification_level: str,
    source: Optional[str] = None,
    verified_at: Optional[str] = None,
    multi_corroborated: bool = False
) -> float:
    """
    Calculates deterministic outcome confidence score (0.0 to 1.0) strictly from evidence.
    Zero synthetic or invented confidence.
    """
    norm_v = normalize_verification_status(verification_level)
    base_scores = {
        VerificationStatus.DOCUMENT_VERIFIED.value: 0.95,
        VerificationStatus.EMPLOYER_VERIFIED.value: 0.90,
        VerificationStatus.SYSTEM_VERIFIED.value: 0.85,
        VerificationStatus.PARTIALLY_VERIFIED.value: 0.70,
        VerificationStatus.SELF_REPORTED.value: 0.50,
        VerificationStatus.UNVERIFIED.value: 0.00,
        VerificationStatus.UNKNOWN.value: 0.00,
        VerificationStatus.REJECTED.value: 0.00,
    }
    score = base_scores.get(norm_v, 0.0)

    # Multi-source corroboration check (explicit flag or multi-source indicators in source string)
    is_multi = multi_corroborated
    if source and not is_multi:
        s_lower = source.lower()
        if any(term in s_lower for term in [" and ", " & ", " + ", ", ", "epfo", "digilocker", "challan", "dual"]):
            is_multi = True

    if is_multi and score > 0:
        score = min(1.0, score + 0.05)

    # Decay if verified > 180 days ago (freshness penalty)
    if verified_at and score > 0:
        try:
            from datetime import datetime, date
            clean_date = str(verified_at)[:10]
            v_date = datetime.strptime(clean_date, "%Y-%m-%d").date()
            days_old = (date.today() - v_date).days
            if days_old > 365:
                score = max(0.20, score - 0.20)
            elif days_old > 180:
                score = max(0.30, score - 0.10)
        except Exception:
            pass

    return round(score, 2)

def calculate_trainee_data_quality(
    trainee,
    follow_ups: list = None,
    verifications: list = None,
    events: list = None
) -> dict:
    """
    Calculates a transparent Data Quality Score (0-100) based strictly on:
    - Completeness (25%)
    - Freshness (25%)
    - Verification (25%)
    - Consistency (25%)
    Includes explicit line-item reasons for any deductions.
    """
    from datetime import datetime, date
    today = date.today()
    deductions = []
    follow_ups = follow_ups or []
    verifications = verifications or []
    events = events or []

    # 1. Completeness (25 pts)
    comp_score = 25.0
    if not trainee.program:
        comp_score -= 5.0
        deductions.append("Missing training program affiliation (-5 pts)")
    if not trainee.enrollment_date or not trainee.graduation_date:
        comp_score -= 5.0
        deductions.append("Missing training cohort date bounds (-5 pts)")
    
    is_placed = (
        trainee.status == "placed" or 
        normalize_outcome_state(trainee.primary_outcome_type) in [
            OutcomeState.EMPLOYED.value,
            OutcomeState.SELF_EMPLOYED.value,
            OutcomeState.APPRENTICESHIP.value
        ]
    )
    if is_placed:
        if not trainee.current_employer:
            comp_score -= 8.0
            deductions.append("Missing employer name / organization for placed outcome (-8 pts)")
        if not trainee.placement_salary and not trainee.current_wage_numeric:
            comp_score -= 7.0
            deductions.append("Missing verified placement wage / salary record (-7 pts)")
    comp_score = max(0.0, comp_score)

    # 2. Freshness (25 pts)
    fresh_score = 25.0
    latest_date = None
    all_dates = []
    if trainee.last_follow_up:
        all_dates.append(trainee.last_follow_up)
    if getattr(trainee, "outcome_last_verified_at", None):
        all_dates.append(trainee.outcome_last_verified_at)
    for f in follow_ups:
        if f.completed_date:
            all_dates.append(f.completed_date)
    for v in verifications:
        if v.submission_date:
            all_dates.append(v.submission_date)
    for e in events:
        if e.event_date:
            all_dates.append(e.event_date)

    days_since_active = 999
    if all_dates:
        for d_str in all_dates:
            try:
                dt = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
                if latest_date is None or dt > latest_date:
                    latest_date = dt
            except Exception:
                pass
        if latest_date:
            days_since_active = (today - latest_date).days

    if days_since_active > 365:
        fresh_score -= 20.0
        deductions.append(f"Stale record: No activity recorded for {days_since_active} days (> 1 year) (-20 pts)")
    elif days_since_active > 180:
        fresh_score -= 12.0
        deductions.append(f"Aging record: No activity recorded for {days_since_active} days (> 180 days) (-12 pts)")
    elif days_since_active > 90:
        fresh_score -= 5.0
        deductions.append(f"Quarterly review pending: Inactive for {days_since_active} days (-5 pts)")
    fresh_score = max(0.0, fresh_score)

    # 3. Verification (25 pts)
    verif_score = 0.0
    v_norm = normalize_verification_status(getattr(trainee, "evidence_level", None) or getattr(trainee, "outcome_verification_level", None))
    if v_norm in [VerificationStatus.DOCUMENT_VERIFIED.value, VerificationStatus.EMPLOYER_VERIFIED.value]:
        verif_score = 25.0
    elif v_norm == VerificationStatus.SYSTEM_VERIFIED.value:
        verif_score = 22.0
    elif v_norm == VerificationStatus.PARTIALLY_VERIFIED.value:
        verif_score = 15.0
        deductions.append("Partially verified evidence lacking formal employer/document backing (-10 pts)")
    elif v_norm == VerificationStatus.SELF_REPORTED.value:
        verif_score = 8.0
        deductions.append("Self-reported claim with zero external corroboration (-17 pts)")
    else:
        verif_score = 0.0
        deductions.append("Unverified or unknown outcome evidence (-25 pts)")

    # 4. Consistency (25 pts)
    cons_score = 25.0
    has_overdue_fu = any(f.status == "overdue" for f in follow_ups)
    if has_overdue_fu:
        cons_score -= 10.0
        deductions.append("Contains uncompleted overdue longitudinal follow-up milestone (-10 pts)")
    
    if is_placed and not follow_ups:
        cons_score -= 8.0
        deductions.append("Missing scheduled longitudinal retention milestones (-8 pts)")

    has_placement_event = any(e.stage in ["first_outcome", "PLACEMENT", "EMPLOYMENT"] for e in events)
    if is_placed and not has_placement_event:
        cons_score -= 7.0
        deductions.append("Placed outcome discrepancy: Missing corresponding timeline event (-7 pts)")

    cons_score = max(0.0, cons_score)

    total_score = round(comp_score + fresh_score + verif_score + cons_score, 1)

    return {
        "score": total_score,
        "completeness": round(comp_score, 1),
        "freshness": round(fresh_score, 1),
        "verification": round(verif_score, 1),
        "consistency": round(cons_score, 1),
        "deductions": deductions,
        "is_stale": days_since_active > 180,
        "has_missing_wages": is_placed and (not trainee.placement_salary and not getattr(trainee, "current_wage_numeric", None)),
        "has_missing_employer_verification": is_placed and len(verifications) == 0,
        "days_since_active": days_since_active if days_since_active < 900 else None
    }

def normalize_verification_status(status: Optional[str]) -> str:
    if not status:
        return VerificationStatus.UNVERIFIED.value
    s = status.strip().upper().replace("-", "_").replace(" ", "_")
    mapping = {
        "SELF_REPORTED": VerificationStatus.SELF_REPORTED.value,
        "PARTIALLY_VERIFIED": VerificationStatus.PARTIALLY_VERIFIED.value,
        "EMPLOYER_VERIFIED": VerificationStatus.EMPLOYER_VERIFIED.value,
        "EMPLOYER_CONFIRMED": VerificationStatus.EMPLOYER_VERIFIED.value,
        "DOCUMENT_VERIFIED": VerificationStatus.DOCUMENT_VERIFIED.value,
        "EVIDENCE_BACKED": VerificationStatus.DOCUMENT_VERIFIED.value,
        "MULTI_SOURCE_VERIFIED": VerificationStatus.PARTIALLY_VERIFIED.value,
        "SYSTEM_VERIFIED": VerificationStatus.SYSTEM_VERIFIED.value,
        "AI_EXTRACTED": VerificationStatus.SYSTEM_VERIFIED.value,
        "UNVERIFIED": VerificationStatus.UNVERIFIED.value,
        "PENDING": VerificationStatus.UNVERIFIED.value,
        "PENDING_AUDIT": VerificationStatus.UNVERIFIED.value,
        "UNKNOWN": VerificationStatus.UNKNOWN.value,
        "REJECTED": VerificationStatus.REJECTED.value,
        "DISPUTED": VerificationStatus.REJECTED.value,
        "VERIFIED": VerificationStatus.DOCUMENT_VERIFIED.value,
        "CONFIRMED": VerificationStatus.EMPLOYER_VERIFIED.value,
    }
    return mapping.get(s, VerificationStatus.UNKNOWN.value)

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="TRAINEE", index=True) # TRAINEE, COACH, EMPLOYER, ADMIN
    full_name = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(String(50), nullable=True)

    trainee_profile = relationship("TraineeProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    coach_profile = relationship("CoachProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    employer_profile = relationship("EmployerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")


class TraineeProfile(Base):
    __tablename__ = "trainee_profiles"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id", ondelete="SET NULL"), nullable=True, index=True)
    headline = Column(String(200), nullable=True)
    bio = Column(Text, nullable=True)
    resume_url = Column(String(255), nullable=True)
    resume_filename = Column(String(255), nullable=True)
    resume_text = Column(Text, nullable=True)
    resume_parsed_skills = Column(JSON, default=list)
    education = Column(String(200), nullable=True)
    experience_years = Column(Float, default=0.0)
    assigned_coach_id = Column(String(50), nullable=True, index=True)

    user = relationship("User", back_populates="trainee_profile")
    trainee = relationship("Trainee", backref="profile_record")


class Company(Base):
    __tablename__ = "companies"

    id = Column(String(50), primary_key=True, index=True)
    legal_name = Column(String(200), nullable=False, index=True)
    display_name = Column(String(150), nullable=False, index=True)
    industry = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    location = Column(String(150), nullable=False)
    website = Column(String(255), nullable=True)
    contact_email = Column(String(150), nullable=False)
    status = Column(String(50), default="active", index=True) # active, pending, suspended, archived
    created_at = Column(String(50), nullable=False)

    employer_profiles = relationship("EmployerProfile", back_populates="company", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="company", cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="company", cascade="all, delete-orphan")


class TrainingInstitute(Base):
    __tablename__ = "training_institutes"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    location = Column(String(150), nullable=False)
    website = Column(String(255), nullable=True)
    contact_email = Column(String(150), nullable=False)
    status = Column(String(50), default="active", index=True) # active, pending, suspended
    created_at = Column(String(50), nullable=False)

    coach_profiles = relationship("CoachProfile", back_populates="training_institute", cascade="all, delete-orphan")
    courses = relationship("Course", back_populates="training_institute", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="training_institute", cascade="all, delete-orphan")


class CoachProfile(Base):
    __tablename__ = "coach_profiles"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    training_institute_id = Column(String(50), ForeignKey("training_institutes.id", ondelete="SET NULL"), nullable=True, index=True)
    full_name = Column(String(150), nullable=False)
    title = Column(String(150), default="Career & Workforce Coach")
    designation = Column(String(100), default="Senior Workforce Coach")
    organization = Column(String(150), default="National Skill Development Ecosystem")
    specialization = Column(String(200), nullable=True)
    verification_status = Column(String(50), default="VERIFIED", index=True)
    bio = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    assigned_trainee_ids = Column(JSON, default=list)

    user = relationship("User", back_populates="coach_profile")
    training_institute = relationship("TrainingInstitute", back_populates="coach_profiles")


class EmployerProfile(Base):
    __tablename__ = "employer_profiles"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    company_id = Column(String(50), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    employer_id = Column(String(50), ForeignKey("employers.id", ondelete="SET NULL"), nullable=True, index=True)
    company_name = Column(String(150), nullable=False)
    designation = Column(String(100), default="Talent Acquisition Partner")
    department = Column(String(100), default="Talent Acquisition & HR")
    verification_status = Column(String(50), default="VERIFIED", index=True)
    contact_phone = Column(String(50), nullable=True)
    authorized_candidate_ids = Column(JSON, default=list)

    user = relationship("User", back_populates="employer_profile")
    company = relationship("Company", back_populates="employer_profiles")
    employer = relationship("Employer", backref="representative_profiles")


class Trainee(Base):
    __tablename__ = "trainees"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), nullable=True, index=True)
    full_name = Column(String(150), nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    location = Column(String(100), default="Bengaluru, Karnataka")
    bio = Column(Text, nullable=True)

    # Training programme & Course/Provider
    program = Column(String(150), nullable=False, index=True)
    cohort = Column(String(50), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="in_training", index=True)
    enrollment_date = Column(String(50), nullable=False)
    graduation_date = Column(String(50), nullable=True)
    training_details = Column(JSON, default=dict)

    # Current role & primary outcome category
    current_role = Column(String(150), nullable=True)
    current_employer = Column(String(150), nullable=True)
    placement_date = Column(String(50), nullable=True)
    placement_salary = Column(String(200), nullable=True)
    primary_outcome_type = Column(String(50), default="employment", index=True)
    evidence_level = Column(String(50), default="self_reported", index=True) # self_reported, employer_confirmed, evidence_backed, multi_source_verified

    # Metrics
    overall_score = Column(Integer, default=80)
    match_score = Column(Integer, default=75)
    last_follow_up = Column(String(50), nullable=True)
    next_follow_up = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    # Trainee Outcome Passport Structured Modules
    certifications = Column(JSON, default=list)
    assessments = Column(JSON, default=list)
    career_preference = Column(JSON, default=dict)
    current_pathway = Column(JSON, default=dict)
    outcome_history = Column(JSON, default=list)
    follow_up_history = Column(JSON, default=list)
    consent_status = Column(JSON, default=dict)
    # Longitudinal Outcome Intelligence & Verification Fields
    outcome_state = Column(String(50), default="UNKNOWN", index=True)
    outcome_verification_level = Column(String(50), default="UNVERIFIED", index=True)
    outcome_confidence = Column(Float, default=0.0)
    outcome_last_verified_at = Column(String(50), nullable=True)
    outcome_source = Column(String(150), nullable=True)
    
    # Cohort & Geographic Dimensions
    district = Column(String(100), nullable=True, index=True)
    provider_name = Column(String(150), nullable=True, index=True)
    batch = Column(String(100), nullable=True, index=True)
    
    # Wage Metrics
    current_wage_numeric = Column(Float, nullable=True)
    placement_wage_numeric = Column(Float, nullable=True)
    
    # Data Quality & Synthetic Isolation
    is_synthetic = Column(Boolean, default=False, index=True)
    data_source = Column(String(50), default="LIVE_PRODUCTION", index=True) # DEMO/SYNTHETIC vs LIVE_PRODUCTION
    data_quality_score = Column(Float, default=0.0)
    data_quality_breakdown = Column(JSON, default=dict)

    embedding = Column(vector_type, nullable=True)

    skills = relationship("TraineeSkill", back_populates="trainee", cascade="all, delete-orphan")


# ========================================================
# Competency Intelligence Module Models
# Course -> Competency -> Skill -> Occupation
# ========================================================

class Course(Base):
    __tablename__ = "courses"

    id = Column(String(50), primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    training_institute_id = Column(String(50), ForeignKey("training_institutes.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True, index=True)
    domain = Column(String(100), nullable=False, index=True)
    provider = Column(String(150), nullable=False)
    duration = Column(String(50), default="12 Weeks")
    duration_weeks = Column(Integer, default=12)
    mode = Column(String(50), default="Hybrid") # Online, In-Person, Hybrid
    eligibility = Column(String(200), default="Open to all enrolled candidates")
    capacity = Column(Integer, default=30)
    status = Column(String(50), default="active", index=True) # active, archived, upcoming
    created_by = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    competency_ids = Column(JSON, default=list) # Links to Competency IDs

    training_institute = relationship("TrainingInstitute", back_populates="courses")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")


class Competency(Base):
    __tablename__ = "competencies"

    id = Column(String(50), primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    title = Column(String(150), nullable=False, index=True)
    domain = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    course_ids = Column(JSON, default=list) # Linked Course IDs
    skill_ids = Column(JSON, default=list)   # Linked Skill IDs


class Skill(Base):
    __tablename__ = "skills"

    id = Column(String(50), primary_key=True, index=True)
    code = Column(String(50), nullable=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    canonical_name = Column(String(100), index=True)
    category = Column(String(50), nullable=False, index=True) # hard or soft
    domain = Column(String(100), nullable=False, default="Software Development", index=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="ACTIVE", index=True) # ACTIVE, RETIRED, DRAFT
    demand_score = Column(Integer, default=70)
    trainees_proficient = Column(Integer, default=0)
    open_job_demands = Column(Integer, default=0)
    growth_trend = Column(String(50), default="+10% YoY")

    # Normalization Aliases (e.g. ["Python Programming", "Python Development", "Py"])
    aliases = Column(JSON, default=list)

    # Proficiency Levels 0 to 5 descriptions
    proficiency_levels = Column(JSON, default=dict)

    # Relational Links
    related_competency_ids = Column(JSON, default=list)
    related_occupation_ids = Column(JSON, default=list)

    embedding = Column(vector_type, nullable=True)


class Occupation(Base):
    __tablename__ = "occupations"

    id = Column(String(50), primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True) # O*NET/SOC code
    title = Column(String(150), nullable=False, index=True)
    domain = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    career_band = Column(String(100), default="Mid-Level")
    median_salary = Column(String(100), nullable=False)
    demand_outlook = Column(String(100), default="+14% (Faster than average)")
    required_skill_ids = Column(JSON, default=list)
    competency_ids = Column(JSON, default=list)


class SkillAlias(Base):
    __tablename__ = "skill_aliases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alias = Column(String(100), unique=True, index=True, nullable=False)
    canonical_skill_id = Column(String(50), ForeignKey("skills.id"), nullable=False, index=True)
    canonical_name = Column(String(100), nullable=False)


class TraineeSkill(Base):
    __tablename__ = "trainee_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False, index=True)
    skill_id = Column(String(50), ForeignKey("skills.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    level = Column(String(50), default="intermediate")
    verified = Column(Boolean, default=False)
    score = Column(Integer, default=75) # 0-100 legacy scale
    source = Column(String(50), default="ASSESSMENT", index=True) # TRAINING, ASSESSMENT, SELF_DECLARED, EMPLOYER, VERIFIED

    # 0-5 Proficiency Scoring Engine fields
    proficiency_score = Column(Float, default=3.0) # 0.0 to 5.0
    target_level = Column(Float, default=4.0)      # 0.0 to 5.0 target benchmark
    confidence = Column(Float, default=0.85)       # 0.0 to 1.0 confidence score
    calculation_explanation = Column(Text, nullable=True) # Full formula & evidence audit trail
    formula_weights = Column(JSON, default=dict)
    evidence_count = Column(Integer, default=1)
    last_assessed_at = Column(String(50), nullable=True)

    trainee = relationship("Trainee", back_populates="skills")


class TraineeSkillEvidence(Base):
    __tablename__ = "trainee_skill_evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False, index=True)
    skill_id = Column(String(50), ForeignKey("skills.id"), nullable=False, index=True)
    skill_name = Column(String(100), nullable=False)
    evidence_source = Column(String(50), nullable=False, index=True) # assessment, practical_project, certification, trainer_evaluation, employer_feedback
    score = Column(Float, nullable=False) # 0.0 to 5.0 scale
    max_score = Column(Float, default=5.0)
    confidence = Column(Float, default=0.90) # 0.0 to 1.0
    assessment_date = Column(String(50), nullable=False)
    reviewer_source = Column(String(150), nullable=False) # Reviewer/evaluator/certifying body
    rubric_scores = Column(JSON, default=dict) # Structured rubric ratings
    notes = Column(Text, nullable=True)
    artifact_url = Column(String(255), nullable=True)

    trainee = relationship("Trainee", backref="skill_evidences")


class Employer(Base):
    __tablename__ = "employers"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False, index=True)
    industry = Column(String(100), nullable=False)
    location = Column(String(100), nullable=False)
    contact_person = Column(String(100), nullable=False)
    contact_email = Column(String(150), nullable=False)
    contact_phone = Column(String(50), nullable=True)
    active_openings = Column(Integer, default=0)
    hired_trainees_count = Column(Integer, default=0)
    retention_rate = Column(Float, default=90.0)
    tier = Column(String(50), default="Standard")
    website_url = Column(String(255), nullable=True)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(50), primary_key=True, index=True)
    company_id = Column(String(50), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    employer_id = Column(String(50), ForeignKey("employers.id"), nullable=True)
    employer_name = Column(String(150), nullable=False)
    title = Column(String(150), nullable=False, index=True)
    location = Column(String(100), nullable=False)
    employment_type = Column(String(50), default="Full-time")
    workplace_type = Column(String(50), default="Hybrid")
    salary_range = Column(String(100), nullable=False)
    required_skills = Column(JSON, default=list)
    experience = Column(String(255), nullable=True)
    experience_level = Column(String(255), nullable=True)
    education_level = Column(String(255), nullable=True)
    openings_count = Column(Integer, default=1)
    applicants_count = Column(Integer, default=0)
    status = Column(String(50), default="active", index=True)
    posted_date = Column(String(50), default="2024-09-25", nullable=False)
    closing_date = Column(String(50), nullable=True)
    description = Column(Text, nullable=False)
    domain = Column(String(100), nullable=True, index=True)
    created_by = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    mapped_occupation_id = Column(String(50), nullable=True, index=True)
    mapped_occupation_title = Column(String(150), nullable=True)
    source = Column(String(50), default="direct_submission")
    extracted_metadata = Column(JSON, default=dict)

    embedding = Column(vector_type, nullable=True)

    company = relationship("Company", back_populates="jobs")
    extracted_skills = relationship("JobExtractedSkill", back_populates="job", cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="job", cascade="all, delete-orphan")


class JobExtractedSkill(Base):
    __tablename__ = "job_extracted_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(50), ForeignKey("jobs.id"), nullable=False, index=True)
    raw_text = Column(String(100), nullable=False, index=True)
    canonical_skill_id = Column(String(50), nullable=True, index=True)
    canonical_name = Column(String(100), nullable=True, index=True)
    category = Column(String(50), default="hard") # hard, soft, tool
    confidence = Column(Float, default=0.90)
    extraction_method = Column(String(50), default="spacy_ner")

    job = relationship("Job", back_populates="extracted_skills")


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("course_id", "trainee_id", name="uq_course_trainee_enrollment"),
    )

    id = Column(String(50), primary_key=True, index=True)
    training_institute_id = Column(String(50), ForeignKey("training_institutes.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(String(50), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="enrolled", index=True) # enrolled, completed, dropped, withdrawn
    enrolled_at = Column(String(50), nullable=False)
    completed_at = Column(String(50), nullable=True)
    progress_percent = Column(Integer, default=0)
    grade_or_result = Column(String(50), nullable=True)

    training_institute = relationship("TrainingInstitute", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    trainee = relationship("Trainee", backref="course_enrollments")


class JobApplication(Base):
    __tablename__ = "job_applications"
    __table_args__ = (
        UniqueConstraint("job_id", "trainee_id", name="uq_job_trainee_application"),
    )

    id = Column(String(50), primary_key=True, index=True)
    job_id = Column(String(50), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String(50), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="applied", index=True) # applied, screening, interviewing, offered, rejected, hired
    applied_at = Column(String(50), nullable=False)
    cover_note = Column(Text, nullable=True)
    match_score = Column(Float, nullable=True)

    job = relationship("Job", back_populates="applications")
    company = relationship("Company", back_populates="applications")
    trainee = relationship("Trainee", backref="job_applications")


class OrganizationAuditLog(Base):
    __tablename__ = "organization_audit_logs"

    id = Column(String(50), primary_key=True, index=True)
    actor_user_id = Column(String(50), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    organization_id = Column(String(50), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True) # CREATE_JOB, UPDATE_JOB, CLOSE_JOB, CREATE_COURSE, UPDATE_COURSE, ASSESS_TRAINEE, VERIFY_ASSESSMENT, VERIFY_EMPLOYMENT
    resource_type = Column(String(100), nullable=False, index=True) # JOB, COURSE, ASSESSMENT, VERIFICATION, ENROLLMENT
    resource_id = Column(String(50), nullable=False, index=True)
    details = Column(JSON, default=dict)
    timestamp = Column(String(50), nullable=False, index=True)


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False)
    trainee_name = Column(String(150), nullable=False)
    trainee_role = Column(String(150), nullable=False)
    type = Column(String(100), nullable=False)
    due_date = Column(String(50), nullable=False)
    status = Column(String(50), default="pending", index=True)
    priority = Column(String(50), default="Medium")
    assigned_counselor = Column(String(100), nullable=False)
    notes = Column(Text, nullable=True)
    last_contact_result = Column(String(255), nullable=True)


class SkillGap(Base):
    __tablename__ = "skill_gaps"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), nullable=False, index=True)
    trainee_name = Column(String(150), nullable=False)
    target_job_title = Column(String(150), nullable=False)
    target_employer = Column(String(150), nullable=False)
    target_occupation_id = Column(String(50), nullable=True, index=True)
    target_occupation_title = Column(String(150), nullable=True)
    enrolled_course_id = Column(String(50), nullable=True)
    enrolled_course_title = Column(String(150), nullable=True)
    gap_score = Column(Integer, default=20)
    match_score = Column(Integer, default=80)
    total_gaps_count = Column(Integer, default=0)
    critical_gaps_count = Column(Integer, default=0)
    moderate_gaps_count = Column(Integer, default=0)
    low_gaps_count = Column(Integer, default=0)
    curriculum_gaps_count = Column(Integer, default=0)
    learner_gaps_count = Column(Integer, default=0)
    workplace_gaps_count = Column(Integer, default=0)
    hard_gaps_count = Column(Integer, default=0)
    soft_gaps_count = Column(Integer, default=0)
    gaps_breakdown = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    acquired_skills = Column(JSON, default=list)
    recommendation = Column(Text, nullable=False)

    # Granular Skill-Gap Intelligence Fields
    course_id = Column(String(50), nullable=True, index=True)
    skill_id = Column(String(50), nullable=True, index=True)
    skill_name = Column(String(100), nullable=True, index=True)
    required_level = Column(Float, default=0.0)
    current_level = Column(Float, default=0.0)
    gap_level = Column(Float, default=0.0)
    gap_category = Column(String(50), default="NO_GAP", index=True) # NO_GAP, LOW, MEDIUM, HIGH, CRITICAL
    source = Column(String(50), default="JOB_REQUIREMENT", index=True) # JOB_REQUIREMENT, CURRICULUM, BENCHMARK
    detected_at = Column(String(50), nullable=True)


class CareerPath(Base):
    __tablename__ = "career_paths"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    track = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    projected_growth = Column(String(100), nullable=False)
    milestones = Column(JSON, default=list)
    target_industries = Column(JSON, default=list)


# ========================================================
# Gap-to-Intervention Engine Models
# ========================================================

class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True) # course_module, practice_task, project, certification, mentorship, apprenticeship, interview_prep, soft_skill_practice
    domain = Column(String(100), nullable=False, index=True)
    target_skills = Column(JSON, default=list) # Skills targeted by this intervention
    target_occupations = Column(JSON, default=list)
    difficulty_level = Column(String(50), default="intermediate") # beginner, intermediate, advanced
    min_proficiency = Column(Float, default=0.0) # prerequisite current level
    target_proficiency = Column(Float, default=4.0) # expected outcome level
    estimated_effort = Column(String(100), nullable=False) # e.g. "4 Hours", "2 Weeks", "40 Clock Hours"
    provider_or_platform = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    why_it_matters = Column(Text, nullable=True) # Occupational context & market demand rationale
    prerequisites = Column(JSON, default=list)
    learning_outcomes = Column(JSON, default=list)
    reassessment_rubric = Column(JSON, default=dict) # Evaluation criteria for reassessment
    market_demand_alignment = Column(Integer, default=90) # 0-100 score
    embedding = Column(vector_type, nullable=True)


class TraineeIntervention(Base):
    __tablename__ = "trainee_interventions"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False, index=True)
    trainee_name = Column(String(150), nullable=False)
    gap_skill_id = Column(String(50), nullable=False, index=True)
    gap_skill_name = Column(String(100), nullable=False)
    gap_type = Column(String(50), nullable=False) # learner_gap, curriculum_gap, workplace_gap
    intervention_id = Column(String(50), ForeignKey("interventions.id"), nullable=False, index=True)
    intervention_title = Column(String(200), nullable=False)
    intervention_type = Column(String(50), nullable=False)
    status = Column(String(50), default="recommended", index=True) # recommended, in_progress, completed, reassessed
    progress_percent = Column(Integer, default=0) # 0 to 100
    started_at = Column(String(50), nullable=True)
    completed_at = Column(String(50), nullable=True)
    baseline_proficiency = Column(Float, default=0.0)
    expected_proficiency = Column(Float, default=4.0)
    reassessed_proficiency = Column(Float, nullable=True)
    reassessment_date = Column(String(50), nullable=True)
    reassessment_notes = Column(Text, nullable=True)
    reassessment_evidence_id = Column(Integer, nullable=True)
    why_it_matters = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    semantic_match_score = Column(Float, default=0.90)

    trainee = relationship("Trainee", backref="interventions")
    intervention = relationship("Intervention")


# ========================================================
# Career Progression & Longitudinal Outcome Tracking Models
# ========================================================

class CareerTimelineEvent(Base):
    __tablename__ = "career_timeline_events"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False, index=True)
    trainee_name = Column(String(150), nullable=False)
    stage = Column(String(50), nullable=False, index=True) # training, first_outcome, current_status, career_event, progression
    pathway = Column(String(50), nullable=False, index=True) # employment, self_employment, freelancing, apprenticeship, entrepreneurship, further_education, unknown
    title = Column(String(200), nullable=False)
    organization = Column(String(150), nullable=False)
    event_date = Column(String(50), nullable=False)
    metrics = Column(JSON, default=dict) # pathway-specific metrics
    verification_status = Column(String(50), default="verified") # verified, self_reported, pending_audit, unknown
    verification_notes = Column(Text, nullable=True)
    is_current = Column(Boolean, default=False)
    sequence_order = Column(Integer, default=1)

    trainee = relationship("Trainee", backref="career_timeline_events")


class LongitudinalFollowUp(Base):
    __tablename__ = "longitudinal_follow_ups"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False, index=True)
    trainee_name = Column(String(150), nullable=False)
    milestone_days = Column(Integer, nullable=False, index=True) # 30, 90, 180, 365
    scheduled_date = Column(String(50), nullable=False)
    due_date = Column(String(50), nullable=False)
    completed_date = Column(String(50), nullable=True)
    status = Column(String(50), default="scheduled", index=True) # scheduled, due, overdue, completed, unreachable
    pathway = Column(String(50), nullable=True, index=True)
    retention_confirmed = Column(Boolean, default=False)
    metrics_recorded = Column(JSON, default=dict)
    notes = Column(Text, nullable=True)
    celery_task_id = Column(String(100), nullable=True)
    survey_link = Column(String(255), nullable=True)

    trainee = relationship("Trainee", backref="longitudinal_follow_ups")


# ========================================================
# Employer Feedback, Outcome Verification & Evidence Levels
# Self-reported -> Employer-confirmed -> Evidence-backed -> Multi-source verified
# ========================================================

class EmployerFeedbackVerification(Base):
    __tablename__ = "employer_feedback_verifications"

    id = Column(String(50), primary_key=True, index=True)
    employer_id = Column(String(50), ForeignKey("employers.id"), nullable=True, index=True)
    employer_name = Column(String(150), nullable=False)
    reviewer_name = Column(String(150), nullable=False)
    reviewer_role = Column(String(100), nullable=True) # e.g. Director of Engineering, VP People
    reviewer_email = Column(String(150), nullable=True)

    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False, index=True)
    trainee_name = Column(String(150), nullable=False)

    # 1. Verify Employment & Confirm Role
    verification_status = Column(String(50), default="confirmed", index=True) # confirmed, disputed, former_employee
    confirmed_role = Column(String(150), nullable=False)
    confirmed_department = Column(String(100), nullable=True)
    employment_type = Column(String(50), default="Full-time") # Full-time, Apprenticeship, Contractor, Part-time
    confirmed_start_date = Column(String(50), nullable=False)
    salary_range = Column(String(100), nullable=True)
    is_still_employed = Column(Boolean, default=True)
    retention_months = Column(Integer, default=6)

    # 2. Skill Ratings (0.0 to 5.0 scale per demonstrated competency)
    skill_ratings = Column(JSON, default=dict) # e.g. {"React.js": 4.5, "TypeScript": 4.0, "Git": 4.2}
    average_skill_score = Column(Float, default=4.0)

    # 3. Missing Technical & Soft Skills
    missing_technical_skills = Column(JSON, default=list) # e.g. ["Docker", "Kubernetes", "CI/CD"]
    missing_soft_skills = Column(JSON, default=list) # e.g. ["Time Management", "Stakeholder Communication"]

    # 4. Training Relevance
    training_relevance_rating = Column(Float, default=4.5) # 1.0 to 5.0
    training_relevance_notes = Column(Text, nullable=True)
    curriculum_recommendations = Column(Text, nullable=True)
    would_hire_from_provider_again = Column(Boolean, default=True)

    # 5. Evidence Level Progression (self_reported -> employer_confirmed -> evidence_backed -> multi_source_verified)
    evidence_level = Column(String(50), default="employer_confirmed", index=True)
    verified_artifacts = Column(JSON, default=list) # e.g. ["offer_letter_signed.pdf", "w2_wage_record.pdf"]
    multi_source_corroboration = Column(JSON, default=dict) # Corroborating sources

    submission_date = Column(String(50), nullable=False)

    trainee = relationship("Trainee", backref="employer_verifications")
    employer = relationship("Employer", backref="verifications")


# ========================================================
# Real-Time AI Resume Semantic Analysis & Competency Record
# ========================================================

class ResumeAnalysisRecord(Base):
    __tablename__ = "resume_analyses"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_url = Column(String(255), nullable=True)
    file_type = Column(String(20), default="pdf")
    raw_text = Column(Text, nullable=True)

    # NLP Extracted Entities
    extracted_metadata = Column(JSON, default=dict) # education, certifications, projects, work_experience, job_titles, years_of_experience, domains
    skills_profile = Column(JSON, default=list) # detected skills with canonical_id, canonical_name, category, domain, evidence_snippet, estimated_proficiency, confidence

    # System Completeness Indicator (explicitly system-generated indicator)
    completeness_score = Column(Float, default=0.0) # 0 to 100
    completeness_breakdown = Column(JSON, default=dict)

    # Real-Time Matching & Gaps
    job_matches = Column(JSON, default=list)
    skill_gaps = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)

    # Vector embedding of parsed resume text
    embedding = Column(vector_type, nullable=True)

    analyzed_at = Column(String(50), nullable=False)

    trainee = relationship("Trainee", backref="resume_analyses")


# ========================================================
# Longitudinal Trainee Outcome Passport & Audit Trail Models
# ========================================================

class TrainingRecord(Base):
    __tablename__ = "training_records"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False, index=True)
    course_name = Column(String(200), nullable=False)
    provider_name = Column(String(200), nullable=False)
    batch = Column(String(100), nullable=True)
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)
    delivery_mode = Column(String(50), default="Hybrid") # Online, In-Person, Hybrid
    completion_status = Column(String(50), default="completed") # in_progress, completed, dropped
    attendance_rate = Column(String(50), nullable=True)
    hours_completed = Column(Integer, default=0)
    assessment_result = Column(String(100), nullable=True)
    certificate_url = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    verification_status = Column(String(50), default="pending", index=True) # pending, verified, rejected
    verified_by = Column(String(150), nullable=True)
    verified_at = Column(String(50), nullable=True)
    source = Column(String(50), default="trainee") # trainee, coach, provider, system
    created_at = Column(String(50), nullable=False)

    trainee = relationship("Trainee", backref="training_records")


class PassportEvent(Base):
    __tablename__ = "passport_events"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False, index=True)
    actor_id = Column(String(50), nullable=True)
    actor_name = Column(String(150), nullable=False)
    actor_role = Column(String(50), nullable=False) # TRAINEE, COACH, EMPLOYER, ADMIN, SYSTEM
    event_type = Column(String(100), nullable=False, index=True)
    action = Column(String(255), nullable=False)
    entity_type = Column(String(50), nullable=False, index=True) # PROFILE, TRAINING, SKILL, CERTIFICATION, CAREER_GOAL, OUTCOME, FOLLOWUP
    entity_id = Column(String(50), nullable=True)
    previous_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    source = Column(String(50), default="TRAINEE")
    verification_status = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(String(50), nullable=False, index=True)

    trainee = relationship("Trainee", backref="events")


# ========================================================
# Career Outcome Digital Twin State Model
# ========================================================

class UncertaintyState(str, Enum):
    KNOWN = "KNOWN"
    SELF_REPORTED = "SELF_REPORTED"
    VERIFIED = "VERIFIED"
    STALE = "STALE"
    UNKNOWN = "UNKNOWN"


class RiskState(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


class DigitalTwinState(Base):
    __tablename__ = "digital_twin_states"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), unique=True, nullable=False, index=True)

    # Current Career State
    current_outcome = Column(String(50), default="UNKNOWN") # Canonical OutcomeState
    current_role = Column(String(150), nullable=True)
    current_employer = Column(String(150), nullable=True)
    employment_status = Column(String(50), default="UNKNOWN") # FULL_TIME, PART_TIME, CONTRACT, APPRENTICE, SEEKING, UNKNOWN
    employment_start_date = Column(String(50), nullable=True)
    current_income_range = Column(String(100), nullable=True)
    current_income_numeric = Column(Float, nullable=True)
    placement_wage_numeric = Column(Float, nullable=True)

    # Intelligence & Readiness Metrics
    training_relevance = Column(Float, nullable=True) # 0.0 to 100.0%
    retention_state = Column(String(50), nullable=True) # 30D_CONFIRMED, 90D_CONFIRMED, 180D_CONFIRMED, 365D_CONFIRMED, PENDING, AT_RISK, UNKNOWN
    skill_readiness = Column(Float, default=0.0) # 0.0 to 100.0%
    job_readiness = Column(Float, default=0.0) # 0.0 to 100.0%
    skill_gap_count = Column(Integer, default=0)
    high_priority_gaps = Column(JSON, default=list) # [{skill_name, priority, current_level, target_level, gap}]

    # Verification, Audit Quality & Risk
    last_verified_at = Column(String(50), nullable=True)
    data_quality = Column(Float, default=0.0) # 0 to 100
    data_quality_breakdown = Column(JSON, default=dict)
    confidence = Column(Float, default=0.0) # 0.0 to 1.0
    uncertainty_state = Column(String(50), default="UNKNOWN") # KNOWN, SELF_REPORTED, VERIFIED, STALE, UNKNOWN
    risk_state = Column(String(50), default="LOW") # LOW, MODERATE, HIGH, CRITICAL, UNKNOWN
    risk_factors = Column(JSON, default=list) # ["Reason 1", "Reason 2"]

    # Structured Evolutionary Dimensions & Evidence Traceability
    skill_dna = Column(JSON, default=list) # [{skill_id, name, category, baseline_level, current_level, target_level, verified}]
    skill_evolution = Column(JSON, default=list) # [{stage, timestamp, skills: [...]}]
    outcome_evolution = Column(JSON, default=list) # [{month, stage, title, date, status, notes}]
    evidence_traceability = Column(JSON, default=list) # [{attribute, value, evidence_type, source, verified_by, date, confidence, explanation}]

    updated_at = Column(String(50), nullable=False)

    trainee = relationship("Trainee", backref="digital_twin_state")


# ========================================================
# Feature A & B: Career Simulator & Outcome Risk Engine Models
# ========================================================

class OutcomeRiskType(str, Enum):
    SKILL_GAP = "SKILL_GAP"
    EMPLOYMENT_INSTABILITY = "EMPLOYMENT_INSTABILITY"
    FOLLOWUP_FAILURE = "FOLLOWUP_FAILURE"
    DATA_STALENESS = "DATA_STALENESS"
    JOB_SEARCH_DIFFICULTY = "JOB_SEARCH_DIFFICULTY"
    TRAINING_JOB_MISMATCH = "TRAINING_JOB_MISMATCH"


class OutcomeRiskSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class OutcomeRiskStatus(str, Enum):
    DETECTED = "DETECTED"
    INTERVENTION_SUGGESTED = "INTERVENTION_SUGGESTED"
    INTERVENTION_ACCEPTED = "INTERVENTION_ACCEPTED"
    INTERVENTION_REJECTED = "INTERVENTION_REJECTED"
    INTERVENTION_IN_PROGRESS = "INTERVENTION_IN_PROGRESS"
    INTERVENTION_COMPLETED = "INTERVENTION_COMPLETED"
    REASSESSED = "REASSESSED"
    RESOLVED = "RESOLVED"
    MONITORING = "MONITORING"


class OutcomeRisk(Base):
    __tablename__ = "outcome_risks"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False, index=True)
    risk_type = Column(String(50), nullable=False, index=True) # SKILL_GAP, EMPLOYMENT_INSTABILITY, FOLLOWUP_FAILURE, DATA_STALENESS, JOB_SEARCH_DIFFICULTY, TRAINING_JOB_MISMATCH
    severity = Column(String(50), nullable=False, default="MEDIUM", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    signals = Column(JSON, default=list) # List of explainable signal strings: ["Signal 1: ...", "Signal 2: ...", "Signal 3: ..."]
    evidence = Column(JSON, default=dict) # Structured evidence dictionary with data points, dates, and threshold metrics
    status = Column(String(50), default="DETECTED", index=True) # DETECTED, INTERVENTION_SUGGESTED, INTERVENTION_ACCEPTED, etc.
    recommended_intervention = Column(JSON, default=dict) # Details of suggested remediation
    reassessment_record = Column(JSON, nullable=True) # Reassessment scores, notes, outcome
    created_at = Column(String(50), nullable=False)
    updated_at = Column(String(50), nullable=False)

    trainee = relationship("Trainee", backref="outcome_risks")


class CareerSimulationRecord(Base):
    __tablename__ = "career_simulations"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id", ondelete="SET NULL"), nullable=True, index=True)
    scenario_name = Column(String(150), nullable=False)
    input_payload = Column(JSON, default=dict)
    simulation_result = Column(JSON, default=dict)
    created_at = Column(String(50), nullable=False)

    trainee = relationship("Trainee", backref="career_simulations")


# ========================================================
# Skill Gap Intelligence & Course Demand Models
# ========================================================

class TrainingCourseSkill(Base):
    __tablename__ = "training_course_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(String(50), ForeignKey("courses.id"), nullable=False, index=True)
    skill_id = Column(String(50), ForeignKey("skills.id"), nullable=False, index=True)
    proficiency_level = Column(Float, default=3.0) # Target level taught (0.0 - 5.0)
    mandatory = Column(Boolean, default=True)

    course = relationship("Course", backref="curriculum_skills")
    skill = relationship("Skill")


class JobSkillRequirement(Base):
    __tablename__ = "job_skill_requirements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(50), ForeignKey("jobs.id"), nullable=False, index=True)
    skill_id = Column(String(50), ForeignKey("skills.id"), nullable=False, index=True)
    required_level = Column(Float, default=3.0) # Benchmark required level (0.0 - 5.0)
    importance = Column(String(50), default="MANDATORY", index=True) # MANDATORY, PREFERRED

    job = relationship("Job", backref="skill_requirements")
    skill = relationship("Skill")


class EmploymentOutcomeSkill(Base):
    __tablename__ = "employment_outcome_skills"

    id = Column(Integer, primary_key=True, autoincrement=True)
    employment_id = Column(String(50), nullable=False, index=True) # links to CareerTimelineEvent or Trainee
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=True, index=True)
    skill_id = Column(String(50), ForeignKey("skills.id"), nullable=False, index=True)
    proficiency_required = Column(Float, default=3.0)
    skill_used = Column(Boolean, default=True)

    skill = relationship("Skill")


class CourseSkillGap(Base):
    __tablename__ = "course_skill_gaps"

    id = Column(String(50), primary_key=True, index=True)
    course_id = Column(String(50), ForeignKey("courses.id"), nullable=False, index=True)
    skill_id = Column(String(50), ForeignKey("skills.id"), nullable=False, index=True)
    skill_name = Column(String(100), nullable=False)
    demand_frequency = Column(Float, default=0.0) # % of target jobs requiring this skill
    training_coverage = Column(Float, default=0.0) # % coverage in curriculum (0 or >0)
    average_trainee_proficiency = Column(Float, default=0.0)
    gap_severity = Column(String(50), default="LOW", index=True) # NO_GAP, LOW, MEDIUM, HIGH, CRITICAL
    gap_frequency = Column(Float, default=0.0) # % trainees with a gap in this skill
    average_skill_gap = Column(Float, default=0.0)
    employment_association = Column(String(100), default="neutral") # strong_positive, positive, neutral, negative
    updated_at = Column(String(50), nullable=False)

    course = relationship("Course", backref="course_gaps")
    skill = relationship("Skill")


# ========================================================
# Outcome Failure & Attrition Cause Intelligence Models
# ========================================================

class OutcomeReasonConfig(Base):
    """
    Administrator-configurable reasons for non-placement, attrition, and self-employment hurdles.
    Allows dynamic extension without modifying codebase.
    """
    __tablename__ = "outcome_reason_configs"

    id = Column(String(50), primary_key=True, index=True)
    category = Column(String(50), nullable=False, index=True) # NON_PLACEMENT, ATTRITION, SELF_EMPLOYMENT
    code = Column(String(100), unique=True, nullable=False, index=True)
    label = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(String(50), nullable=False)


class TraineeOutcomeReason(Base):
    """
    Structured outcome reason records explaining why a trainee did not achieve or retain employment.
    Never relies on opaque AI decisions; stores transparent categories, reason codes, and explanatory text.
    """
    __tablename__ = "trainee_outcome_reasons"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False, index=True)
    outcome_id = Column(String(50), nullable=True, index=True) # links to timeline event or outcome record
    outcome_type = Column(String(50), nullable=False, index=True) # EMPLOYED, SELF_EMPLOYED, APPRENTICESHIP, FURTHER_EDUCATION, JOB_SEARCHING, UNEMPLOYED, DROPPED_OUT, EMPLOYMENT_LOST
    reason_category = Column(String(50), nullable=False, index=True) # NON_PLACEMENT, ATTRITION, SELF_EMPLOYMENT
    reason_code = Column(String(100), nullable=False, index=True)
    reason_text = Column(Text, nullable=True)
    reported_by = Column(String(50), default="TRAINEE") # TRAINEE, COACH, EMPLOYER, SYSTEM
    tenure_months = Column(Integer, nullable=True) # For attrition: months before leaving (e.g., < 6 months)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(String(50), nullable=False)

    trainee = relationship("Trainee", backref="outcome_reasons")


class FollowUpQuestionResponse(Base):
    """
    Longitudinal state-based follow-up questionnaire responses.
    Generated dynamically based on current employment status (UNEMPLOYED, EMPLOYED, SELF_EMPLOYED, EMPLOYMENT_LOST).
    """
    __tablename__ = "follow_up_question_responses"

    id = Column(String(50), primary_key=True, index=True)
    trainee_id = Column(String(50), ForeignKey("trainees.id"), nullable=False, index=True)
    employment_status = Column(String(50), nullable=False, index=True)
    question_key = Column(String(100), nullable=False)
    question_text = Column(String(255), nullable=False)
    answer_value = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True) # optional free-text explanation
    recorded_at = Column(String(50), nullable=False)

    trainee = relationship("Trainee", backref="question_responses")


