from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base, get_vector_type
from app.core.config import settings

vector_type = get_vector_type(settings.VECTOR_DIMENSION)

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


class CoachProfile(Base):
    __tablename__ = "coach_profiles"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    full_name = Column(String(150), nullable=False)
    title = Column(String(150), default="Career & Workforce Coach")
    organization = Column(String(150), default="National Skill Development Ecosystem")
    specialization = Column(String(200), nullable=True)
    bio = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    assigned_trainee_ids = Column(JSON, default=list)

    user = relationship("User", back_populates="coach_profile")


class EmployerProfile(Base):
    __tablename__ = "employer_profiles"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    employer_id = Column(String(50), ForeignKey("employers.id", ondelete="SET NULL"), nullable=True, index=True)
    company_name = Column(String(150), nullable=False)
    designation = Column(String(100), default="Talent Acquisition Partner")
    contact_phone = Column(String(50), nullable=True)
    authorized_candidate_ids = Column(JSON, default=list)

    user = relationship("User", back_populates="employer_profile")
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
    placement_salary = Column(String(50), nullable=True)
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
    title = Column(String(150), nullable=False, index=True)
    domain = Column(String(100), nullable=False, index=True)
    provider = Column(String(150), nullable=False)
    duration_weeks = Column(Integer, default=12)
    description = Column(Text, nullable=True)
    competency_ids = Column(JSON, default=list) # Links to Competency IDs


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
    title = Column(String(150), nullable=False, index=True)
    employer_id = Column(String(50), ForeignKey("employers.id"), nullable=True)
    employer_name = Column(String(150), nullable=False)
    location = Column(String(100), nullable=False)
    employment_type = Column(String(50), default="Full-time")
    workplace_type = Column(String(50), default="Hybrid")
    salary_range = Column(String(100), nullable=False)
    required_skills = Column(JSON, default=list)
    openings_count = Column(Integer, default=1)
    applicants_count = Column(Integer, default=0)
    status = Column(String(50), default="active")
    posted_date = Column(String(50), nullable=False)
    closing_date = Column(String(50), nullable=True)
    description = Column(Text, nullable=False)
    domain = Column(String(100), nullable=True, index=True)

    mapped_occupation_id = Column(String(50), nullable=True, index=True)
    mapped_occupation_title = Column(String(150), nullable=True)
    experience_level = Column(String(100), nullable=True)
    education_level = Column(String(100), nullable=True)
    source = Column(String(50), default="direct_submission")
    extracted_metadata = Column(JSON, default=dict)

    embedding = Column(vector_type, nullable=True)

    extracted_skills = relationship("JobExtractedSkill", back_populates="job", cascade="all, delete-orphan")


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

