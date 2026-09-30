from pydantic import BaseModel
from typing import List, Optional, Any, Dict

# Trainee Schemas
class TraineeSkillBase(BaseModel):
    skill_id: str
    name: str
    level: str = "intermediate"
    verified: bool = False
    score: int = 75
    proficiency_score: float = 3.0 # 0.0 to 5.0
    target_level: float = 4.0      # 0.0 to 5.0
    confidence: float = 0.85       # 0.0 to 1.0
    calculation_explanation: Optional[str] = None
    formula_weights: Optional[Dict[str, Any]] = None
    evidence_count: int = 1
    last_assessed_at: Optional[str] = None

class TraineeSkillRead(TraineeSkillBase):
    id: Optional[int] = None
    class Config:
        from_attributes = True

# Trainee Skill Evidence Schemas
class TraineeSkillEvidenceBase(BaseModel):
    trainee_id: str
    skill_id: str
    skill_name: str
    evidence_source: str # assessment, practical_project, certification, trainer_evaluation, employer_feedback
    score: float # 0.0 to 5.0
    max_score: float = 5.0
    confidence: float = 0.90 # 0.0 to 1.0
    assessment_date: str
    reviewer_source: str
    rubric_scores: Optional[Dict[str, Any]] = {}
    notes: Optional[str] = None
    artifact_url: Optional[str] = None

class TraineeSkillEvidenceCreate(TraineeSkillEvidenceBase):
    pass

class TraineeSkillEvidenceRead(TraineeSkillEvidenceBase):
    id: int
    class Config:
        from_attributes = True

class ScoringConfigRequest(BaseModel):
    source_weights: Dict[str, float]

class SoftSkillScenarioAnswer(BaseModel):
    question_id: str
    selected_option_id: str

class SoftSkillAssessmentSubmission(BaseModel):
    trainee_id: str
    answers: List[SoftSkillScenarioAnswer]
    reviewer_name: Optional[str] = "Workforce Assessment Engine"

class TraineeBase(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    location: Optional[str] = "Bengaluru, KA"
    bio: Optional[str] = None
    program: str
    cohort: str
    status: str = "in_training"
    enrollment_date: str
    graduation_date: Optional[str] = None
    training_details: Optional[Dict[str, Any]] = {}
    current_role: Optional[str] = None
    current_employer: Optional[str] = None
    placement_date: Optional[str] = None
    placement_salary: Optional[str] = None
    primary_outcome_type: Optional[str] = "employment"
    overall_score: int = 80
    match_score: int = 75
    notes: Optional[str] = None
    certifications: Optional[List[Dict[str, Any]]] = []
    assessments: Optional[List[Dict[str, Any]]] = []
    career_preference: Optional[Dict[str, Any]] = {}
    current_pathway: Optional[Dict[str, Any]] = {}
    outcome_history: Optional[List[Dict[str, Any]]] = []
    follow_up_history: Optional[List[Dict[str, Any]]] = []
    consent_status: Optional[Dict[str, Any]] = {}

class TraineeCreate(TraineeBase):
    id: Optional[str] = None
    skills: Optional[List[TraineeSkillBase]] = []

class TraineeUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    status: Optional[str] = None
    current_role: Optional[str] = None
    current_employer: Optional[str] = None
    placement_date: Optional[str] = None
    placement_salary: Optional[str] = None
    primary_outcome_type: Optional[str] = None
    notes: Optional[str] = None
    overall_score: Optional[int] = None
    match_score: Optional[int] = None
    training_details: Optional[Dict[str, Any]] = None
    career_preference: Optional[Dict[str, Any]] = None
    current_pathway: Optional[Dict[str, Any]] = None
    consent_status: Optional[Dict[str, Any]] = None

class TraineeRead(TraineeBase):
    id: str
    last_follow_up: Optional[str] = None
    next_follow_up: Optional[str] = None
    skills: List[TraineeSkillRead] = []

    class Config:
        from_attributes = True

class PaginatedTraineeResponse(BaseModel):
    items: List[TraineeRead]
    total: int
    page: int
    page_size: int
    total_pages: int

# Passport Sub-entity Requests
class ConsentUpdateRequest(BaseModel):
    consent_status: str
    share_with_employers: bool = True
    share_with_funding_bodies: bool = True
    share_anonymized_research: bool = True
    share_public_portfolio: bool = False
    notes: Optional[str] = None

class OutcomeAddRequest(BaseModel):
    outcome_type: str
    organization_or_venture: str
    role_or_course: str
    compensation_or_funding: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    is_current: bool = True
    verification_status: str = "verified"
    verification_notes: Optional[str] = None

class FollowUpAddRequest(BaseModel):
    checkpoint_type: str
    date: str
    counselor_name: str
    status: str = "completed"
    retention_confirmed: bool = True
    wage_progressed: bool = False
    counselor_notes: str

class CertificationAddRequest(BaseModel):
    title: str
    issuing_organization: str
    issue_date: str
    expiry_date: Optional[str] = None
    credential_id: Optional[str] = None
    verification_url: Optional[str] = None
    status: str = "Active"

class AssessmentAddRequest(BaseModel):
    assessment_name: str
    date: str
    score: int
    max_score: int = 100
    grade: str
    evaluator: str
    feedback: str


# ========================================================
# Longitudinal Passport, Audit & Event Schemas
# ========================================================

class TrainingRecordCreate(BaseModel):
    course_name: str
    provider_name: str
    batch: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    delivery_mode: Optional[str] = "Hybrid"
    completion_status: Optional[str] = "completed"
    attendance_rate: Optional[str] = None
    hours_completed: Optional[int] = 0
    assessment_result: Optional[str] = None
    certificate_url: Optional[str] = None
    description: Optional[str] = None
    verification_status: Optional[str] = "pending"

class TrainingRecordVerifyRequest(BaseModel):
    verification_status: str = "verified"
    verification_notes: Optional[str] = None

class TrainingRecordRead(BaseModel):
    id: str
    trainee_id: str
    course_name: str
    provider_name: str
    batch: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    delivery_mode: str = "Hybrid"
    completion_status: str = "completed"
    attendance_rate: Optional[str] = None
    hours_completed: int = 0
    assessment_result: Optional[str] = None
    certificate_url: Optional[str] = None
    description: Optional[str] = None
    verification_status: str = "pending"
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    source: str = "trainee"
    created_at: str

    class Config:
        from_attributes = True

class PassportEventRead(BaseModel):
    id: str
    trainee_id: str
    actor_id: Optional[str] = None
    actor_name: str
    actor_role: str
    event_type: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    previous_value: Optional[Any] = None
    new_value: Optional[Any] = None
    source: str = "TRAINEE"
    verification_status: Optional[str] = None
    notes: Optional[str] = None
    timestamp: str

    class Config:
        from_attributes = True

class TraineeProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    languages: Optional[List[str]] = None
    education: Optional[str] = None
    career_interests: Optional[List[str]] = None
    preferred_locations: Optional[List[str]] = None
    employment_status: Optional[str] = None
    career_preference: Optional[Dict[str, Any]] = None

class CareerGoalsUpdateRequest(BaseModel):
    target_occupation: Optional[str] = None
    target_roles: Optional[List[str]] = None
    preferred_industry: Optional[str] = None
    preferred_workplace: Optional[str] = None
    preferred_locations: Optional[List[str]] = None
    target_salary_min: Optional[str] = None
    target_salary_max: Optional[str] = None
    employment_type: Optional[str] = None
    short_term_goal: Optional[str] = None
    long_term_goal: Optional[str] = None
    entrepreneurship_interest: Optional[str] = None
    further_education_interest: Optional[str] = None

class SkillAddRequest(BaseModel):
    skill_name: str
    canonical_id: Optional[str] = None
    category: Optional[str] = "hard"
    self_rating: Optional[float] = 3.0
    evidence_notes: Optional[str] = None
    project_title: Optional[str] = None
    project_url: Optional[str] = None

class FollowUpResponseRequest(BaseModel):
    employment_status: str
    current_role: Optional[str] = None
    current_employer: Optional[str] = None
    current_compensation: Optional[str] = None
    current_salary: Optional[str] = None
    still_using_learned_skills: Optional[Any] = True
    has_changed_occupation: Optional[Any] = False
    occupation_changed: Optional[Any] = False
    changed_occupation_details: Optional[str] = None
    additional_skills_needed: Optional[str] = None
    trainee_notes: Optional[str] = None

class OutcomeVerifyRequest(BaseModel):
    verification_status: str = "verified"
    verification_notes: Optional[str] = None
    confirmed_role: Optional[str] = None
    confirmed_start_date: Optional[str] = None
    is_still_employed: Optional[bool] = True

class SkillVerifyRequest(BaseModel):
    score: float = 4.0
    notes: Optional[str] = ""

class TrainingRecordUpdate(BaseModel):
    course_name: Optional[str] = None
    provider_name: Optional[str] = None
    batch: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    delivery_mode: Optional[str] = None
    completion_status: Optional[str] = None
    attendance_rate: Optional[str] = None
    hours_completed: Optional[int] = None
    assessment_result: Optional[str] = None
    certificate_url: Optional[str] = None
    description: Optional[str] = None

class SkillUpdateRequest(BaseModel):
    self_rating: Optional[float] = None
    evidence_notes: Optional[str] = None
    project_title: Optional[str] = None
    project_url: Optional[str] = None

class CertificationUpdateRequest(BaseModel):
    title: Optional[str] = None
    issuing_organization: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    credential_id: Optional[str] = None
    verification_url: Optional[str] = None
    status: Optional[str] = None

class OutcomeUpdateRequest(BaseModel):
    outcome_type: Optional[str] = None
    organization_or_venture: Optional[str] = None
    role_or_course: Optional[str] = None
    compensation_or_funding: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: Optional[bool] = None
    location: Optional[str] = None
    work_arrangement: Optional[str] = None
    description: Optional[str] = None
    verification_notes: Optional[str] = None


# ========================================================
# Competency Intelligence Schemas
# ========================================================

class CourseRead(BaseModel):
    id: str
    code: str
    title: str
    domain: str
    provider: str
    duration_weeks: int
    description: Optional[str] = None
    competency_ids: List[str] = []

    class Config:
        from_attributes = True

class CompetencyRead(BaseModel):
    id: str
    code: str
    title: str
    domain: str
    description: Optional[str] = None
    course_ids: List[str] = []
    skill_ids: List[str] = []

    class Config:
        from_attributes = True

class ProficiencyLevel(BaseModel):
    level: int
    title: str
    description: str
    behavioral_indicators: Optional[List[str]] = []

class SkillRead(BaseModel):
    id: str
    code: Optional[str] = None
    name: str
    canonical_name: Optional[str] = None
    category: str # hard or soft
    domain: str
    description: Optional[str] = None
    demand_score: int = 70
    trainees_proficient: int = 0
    open_job_demands: int = 0
    growth_trend: str = "+10% YoY"
    aliases: List[str] = []
    proficiency_levels: Dict[str, Any] = {}
    related_competency_ids: List[str] = []
    related_occupation_ids: List[str] = []

    class Config:
        from_attributes = True

class OccupationRead(BaseModel):
    id: str
    code: str
    title: str
    domain: str
    description: Optional[str] = None
    career_band: str
    median_salary: str
    demand_outlook: str
    required_skill_ids: List[str] = []
    competency_ids: List[str] = []

    class Config:
        from_attributes = True

class SkillNormalizationRequest(BaseModel):
    query: str

class SkillNormalizationResponse(BaseModel):
    query: str
    canonical_skill_id: Optional[str] = None
    canonical_name: Optional[str] = None
    matched_alias: Optional[str] = None
    confidence: float
    category: Optional[str] = None
    domain: Optional[str] = None
    skill_details: Optional[Dict[str, Any]] = None

class CompetencyGraphNode(BaseModel):
    id: str
    label: str
    type: str # course, competency, skill, occupation
    domain: str
    metadata: Dict[str, Any] = {}

class CompetencyGraphEdge(BaseModel):
    source: str
    target: str
    relation: str # teaches, requires, maps_to

class CompetencyGraphResponse(BaseModel):
    nodes: List[CompetencyGraphNode]
    edges: List[CompetencyGraphEdge]


# Employer Schemas
class EmployerBase(BaseModel):
    id: str
    name: str
    industry: str
    location: str
    contact_person: str
    contact_email: str
    contact_phone: Optional[str] = None
    active_openings: int = 0
    hired_trainees_count: int = 0
    retention_rate: float = 90.0
    tier: str = "Standard"
    website_url: Optional[str] = None

class EmployerRead(EmployerBase):
    class Config:
        from_attributes = True

# Job Schemas
class JobExtractedSkillRead(BaseModel):
    id: Optional[int] = None
    raw_text: str
    canonical_skill_id: Optional[str] = None
    canonical_name: Optional[str] = None
    category: str = "hard" # hard, soft, tool
    confidence: float = 0.90
    extraction_method: str = "spacy_ner"

    class Config:
        from_attributes = True

class JobBase(BaseModel):
    id: str
    title: str
    employer_id: Optional[str] = None
    employer_name: str
    location: str
    employment_type: str = "Full-time"
    workplace_type: str = "Hybrid"
    salary_range: str
    required_skills: List[str] = []
    openings_count: int = 1
    applicants_count: int = 0
    status: str = "active"
    posted_date: str
    closing_date: Optional[str] = None
    description: str
    domain: Optional[str] = None
    mapped_occupation_id: Optional[str] = None
    mapped_occupation_title: Optional[str] = None
    experience_level: Optional[str] = None
    education_level: Optional[str] = None
    source: Optional[str] = "direct_submission"
    extracted_metadata: Optional[Dict[str, Any]] = None

class JobCreate(BaseModel):
    title: str
    employer_name: str
    location: str
    description: str
    employer_id: Optional[str] = None
    employment_type: Optional[str] = "Full-time"
    workplace_type: Optional[str] = "Hybrid"
    salary_range: Optional[str] = None
    domain: Optional[str] = None
    openings_count: Optional[int] = 1
    closing_date: Optional[str] = None
    source: Optional[str] = "direct_submission"

class JobRead(JobBase):
    extracted_skills: Optional[List[JobExtractedSkillRead]] = []

    class Config:
        from_attributes = True

class JobAnalyzeRequest(BaseModel):
    description: str
    title: Optional[str] = ""
    employer_name: Optional[str] = "Confidential Employer"
    location: Optional[str] = None

class SkillExtractionItem(BaseModel):
    raw_text: str
    canonical_name: Optional[str] = None
    canonical_skill_id: Optional[str] = None
    category: str # hard, soft, tool
    confidence: float # 0.0 - 1.0
    extraction_method: str

class JobAnalyzeResponse(BaseModel):
    title: str
    extracted_hard_skills: List[SkillExtractionItem] = []
    extracted_soft_skills: List[SkillExtractionItem] = []
    extracted_tools: List[SkillExtractionItem] = []
    experience_requirements: Optional[str] = None
    education_requirements: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None
    normalized_skills: List[Dict[str, Any]] = []
    mapped_occupation: Optional[Dict[str, Any]] = None
    domain: Optional[str] = None

class ExtractedSkillsResponse(BaseModel):
    job_id: str
    job_title: str
    hard_skills: List[JobExtractedSkillRead] = []
    soft_skills: List[JobExtractedSkillRead] = []
    tools_and_tech: List[JobExtractedSkillRead] = []
    all_skills: List[JobExtractedSkillRead] = []
    total_extracted: int


# FollowUp Schemas
class FollowUpBase(BaseModel):
    id: str
    trainee_id: str
    trainee_name: str
    trainee_role: str
    type: str
    due_date: str
    status: str = "pending"
    priority: str = "Medium"
    assigned_counselor: str
    notes: Optional[str] = None
    last_contact_result: Optional[str] = None

class FollowUpRead(FollowUpBase):
    class Config:
        from_attributes = True

class FollowUpComplete(BaseModel):
    notes: Optional[str] = None
    status: str = "completed"

# SkillGap Schemas
class SkillGapBreakdownItem(BaseModel):
    skill_id: str
    skill_name: str
    category: str
    domain: Optional[str] = None
    required_proficiency: float
    current_proficiency: float
    skill_gap: float
    gap_severity: float
    skill_importance: float
    importance_label: str
    market_demand: float
    market_demand_score: int
    confidence: float
    priority_score: int
    priority_tier: str
    priority_label: str
    gap_type: str
    gap_type_label: str
    is_taught_in_course: bool
    course_title: Optional[str] = None
    detected_reason: str
    remediation_action: str
    employer_notes: Optional[str] = None
    formula_breakdown: Optional[Dict[str, Any]] = None

class SkillGapRead(BaseModel):
    id: str
    trainee_id: str
    trainee_name: str
    target_job_title: str
    target_employer: str
    target_occupation_id: Optional[str] = None
    target_occupation_title: Optional[str] = None
    enrolled_course_id: Optional[str] = None
    enrolled_course_title: Optional[str] = None
    gap_score: int
    match_score: int
    total_gaps_count: Optional[int] = 0
    critical_gaps_count: Optional[int] = 0
    moderate_gaps_count: Optional[int] = 0
    low_gaps_count: Optional[int] = 0
    curriculum_gaps_count: Optional[int] = 0
    learner_gaps_count: Optional[int] = 0
    workplace_gaps_count: Optional[int] = 0
    hard_gaps_count: Optional[int] = 0
    soft_gaps_count: Optional[int] = 0
    gaps_breakdown: Optional[List[Dict[str, Any]]] = []
    missing_skills: List[Any] = []
    acquired_skills: List[Any] = []
    recommendation: str

    class Config:
        from_attributes = True

class SkillGapAnalyzeRequest(BaseModel):
    trainee_id: str
    target_occupation_id: Optional[str] = None
    target_job_id: Optional[str] = None
    target_employer: Optional[str] = None

# CareerPath Schemas
class CareerPathRead(BaseModel):
    id: str
    title: str
    track: str
    description: str
    projected_growth: str
    milestones: List[Any] = []
    target_industries: List[str] = []

    class Config:
        from_attributes = True

# Analytics Schemas
class DashboardMetricsRead(BaseModel):
    totalTrainees: int
    traineesPlaced: int
    placementRate: float
    activeJobOpenings: int
    avgMatchRate: float
    overdueFollowUps: int
    retentionRate: float
    monthlyPlacementTrend: List[Any] = []
    skillsDemandSupply: List[Any] = []
    statusDistribution: List[Any] = []

# Auth Schemas
class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str # TRAINEE | COACH | EMPLOYER
    phone: Optional[str] = None
    
    # Trainee-specific fields
    program: Optional[str] = "Full Stack Cloud & AI Engineering"
    cohort: Optional[str] = "2024-Q3"
    location: Optional[str] = "Bengaluru, KA"
    headline: Optional[str] = None
    bio: Optional[str] = None
    education: Optional[str] = "B.Tech / B.E. in Computer Science"
    
    # Coach-specific fields
    title: Optional[str] = "Workforce Career Coach"
    organization: Optional[str] = "National Skill Development Ecosystem"
    specialization: Optional[str] = "Software & Cloud Systems"
    
    # Employer-specific fields
    company_name: Optional[str] = None
    designation: Optional[str] = "Talent Acquisition Partner"
    employer_id: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

class ResendOtpRequest(BaseModel):
    email: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    profile_id: Optional[str] = None
    trainee_id: Optional[str] = None
    employer_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    token: str
    token_type: str = "Bearer"
    user: UserProfileResponse
    requires_verification: bool = False
    demo_otp: Optional[str] = None


# Intervention Schemas
class InterventionRead(BaseModel):
    id: str
    title: str
    type: str
    domain: str
    target_skills: List[str] = []
    target_occupations: List[str] = []
    difficulty_level: str
    min_proficiency: float
    target_proficiency: float
    estimated_effort: str
    provider_or_platform: str
    description: str
    why_it_matters: Optional[str] = None
    prerequisites: List[str] = []
    learning_outcomes: List[str] = []
    reassessment_rubric: Optional[Dict[str, Any]] = {}
    market_demand_alignment: int

    class Config:
        from_attributes = True

class InterventionRecommendation(BaseModel):
    intervention_id: str
    title: str
    type: str
    type_label: str
    domain: str
    difficulty_level: str
    estimated_effort: str
    provider_or_platform: str
    description: str
    why_it_matters: str
    recommendation_rationale: str
    recommendation_score: int
    semantic_similarity: float
    current_proficiency: float
    expected_skill_level: float
    min_proficiency: float
    prerequisites_satisfied: bool
    prerequisite_note: str
    prerequisites: List[str] = []
    learning_outcomes: List[str] = []
    reassessment_rubric: Optional[Dict[str, Any]] = {}
    market_demand_alignment: int
    tracking_status: str
    progress_percent: int
    trainee_intervention_id: Optional[str] = None

class TraineeInterventionRead(BaseModel):
    id: str
    trainee_id: str
    trainee_name: str
    gap_skill_id: str
    gap_skill_name: str
    gap_type: str
    intervention_id: str
    intervention_title: str
    intervention_type: str
    status: str
    progress_percent: int
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    baseline_proficiency: float
    expected_proficiency: float
    reassessed_proficiency: Optional[float] = None
    reassessment_date: Optional[str] = None
    reassessment_notes: Optional[str] = None
    why_it_matters: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class StartInterventionRequest(BaseModel):
    trainee_id: str
    gap_skill_id: str
    gap_skill_name: str
    intervention_id: str

class UpdateProgressRequest(BaseModel):
    progress_percent: int
    notes: Optional[str] = None

class SubmitReassessmentRequest(BaseModel):
    reassessed_score: float # 0.0 to 5.0
    reviewer_name: Optional[str] = "Senior Technical Evaluator"
    evaluator_notes: str
    artifact_url: Optional[str] = None

class ReassessmentResponse(BaseModel):
    status: str
    trainee_id: str
    trainee_name: str
    skill_name: str
    baseline_proficiency: float
    reassessed_score: float
    new_overall_proficiency: float
    gap_closed: bool
    updated_match_score: Optional[int] = None
    remaining_gaps_count: Optional[int] = None
    evidence_id: int
    reassessment_date: str
    message: str


# Career Progression & Longitudinal Outcome Schemas
class CareerTimelineEventCreate(BaseModel):
    trainee_id: str
    stage: str # training, first_outcome, current_status, career_event, progression
    pathway: str # employment, self_employment, freelancing, apprenticeship, entrepreneurship, further_education, unknown
    title: str
    organization: str
    event_date: str
    metrics: Dict[str, Any] = {}
    verification_status: Optional[str] = "verified"
    verification_notes: Optional[str] = None
    is_current: Optional[bool] = False

class CareerTimelineEventRead(BaseModel):
    id: str
    trainee_id: str
    trainee_name: str
    stage: str
    pathway: str
    title: str
    organization: str
    event_date: str
    metrics: Dict[str, Any] = {}
    verification_status: str
    verification_notes: Optional[str] = None
    is_current: bool
    sequence_order: int

    class Config:
        from_attributes = True

class LongitudinalFollowUpRead(BaseModel):
    id: str
    trainee_id: str
    trainee_name: str
    milestone_days: int
    scheduled_date: str
    due_date: str
    completed_date: Optional[str] = None
    status: str
    pathway: Optional[str] = None
    retention_confirmed: bool = False
    metrics_recorded: Dict[str, Any] = {}
    notes: Optional[str] = None
    survey_link: Optional[str] = None

    class Config:
        from_attributes = True

class CareerTimelineResponse(BaseModel):
    trainee_id: str
    trainee_name: str
    program: str
    primary_outcome_type: str
    pathway_label: str
    current_role: Optional[str] = None
    current_employer: Optional[str] = None
    placement_salary: Optional[str] = None
    enrollment_date: str
    graduation_date: Optional[str] = None
    timeline_stages: Dict[str, Any]
    all_events: List[Dict[str, Any]]
    longitudinal_milestones: List[Dict[str, Any]]

class PathwaySummaryResponse(BaseModel):
    total_trainees: int
    overall_retention_rate: float
    unknown_outcome_count: int
    unknown_outcome_percent: float
    positive_outcomes_count: int
    positive_outcomes_percent: float
    pathway_distribution: List[Dict[str, Any]]
    milestone_retention_funnel: Dict[str, Any]

class CompleteLongitudinalFollowUpRequest(BaseModel):
    retention_confirmed: bool
    pathway: str
    metrics: Dict[str, Any] = {}
    notes: str


# ========================================================
# Employer Verification & Evidence Levels Schemas
# Self-reported -> Employer-confirmed -> Evidence-backed -> Multi-source verified
# ========================================================

class EmployerVerificationCreate(BaseModel):
    employer_id: Optional[str] = None
    employer_name: str
    reviewer_name: str
    reviewer_role: Optional[str] = "Engineering Lead"
    reviewer_email: Optional[str] = None
    
    trainee_id: str
    trainee_name: str
    
    verification_status: str = "confirmed" # confirmed, disputed, former_employee
    confirmed_role: str
    confirmed_department: Optional[str] = "Engineering"
    employment_type: str = "Full-time"
    confirmed_start_date: str
    salary_range: Optional[str] = "₹7,50,000 - ₹9,50,000"
    is_still_employed: bool = True
    retention_months: int = 6
    
    skill_ratings: Dict[str, float] = {} # e.g. {"React.js": 4.5, "TypeScript": 4.0}
    missing_technical_skills: List[str] = []
    missing_soft_skills: List[str] = []
    
    training_relevance_rating: float = 4.5
    training_relevance_notes: Optional[str] = None
    curriculum_recommendations: Optional[str] = None
    would_hire_from_provider_again: bool = True
    
    verified_artifacts: List[str] = []


class EmployerVerificationRead(BaseModel):
    id: str
    employer_id: Optional[str]
    employer_name: str
    reviewer_name: str
    reviewer_role: Optional[str]
    reviewer_email: Optional[str]
    
    trainee_id: str
    trainee_name: str
    
    verification_status: str
    confirmed_role: str
    confirmed_department: Optional[str]
    employment_type: str
    confirmed_start_date: str
    salary_range: Optional[str]
    is_still_employed: bool
    retention_months: int
    
    skill_ratings: Dict[str, float]
    average_skill_score: float
    missing_technical_skills: List[str]
    missing_soft_skills: List[str]
    
    training_relevance_rating: float
    training_relevance_notes: Optional[str]
    curriculum_recommendations: Optional[str]
    would_hire_from_provider_again: bool
    
    evidence_level: str
    verified_artifacts: List[str]
    multi_source_corroboration: Dict[str, Any]
    submission_date: str

    class Config:
        from_attributes = True


class EvidenceHierarchySummary(BaseModel):
    total_trainees: int
    self_reported_count: int
    self_reported_percent: float
    employer_confirmed_count: int
    employer_confirmed_percent: float
    evidence_backed_count: int
    evidence_backed_percent: float
    multi_source_verified_count: int
    multi_source_verified_percent: float
    evidence_levels: List[Dict[str, Any]]


# ========================================================
# Comprehensive Analytics Schemas (10 Dashboard Dimensions)
# ========================================================

class ComprehensiveAnalyticsResponse(BaseModel):
    summary_kpis: Dict[str, Any]
    employment_rate: Dict[str, Any]
    retention: Dict[str, Any]
    wage_progression: Dict[str, Any]
    skill_improvement: Dict[str, Any]
    skill_gaps: Dict[str, Any]
    training_provider_outcomes: List[Dict[str, Any]]
    course_outcomes: List[Dict[str, Any]]
    district_trends: List[Dict[str, Any]]
    occupation_demand: List[Dict[str, Any]]
    non_placement_reasons: List[Dict[str, Any]]



