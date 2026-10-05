export type TraineeStatus = 'in_training' | 'graduated' | 'placed' | 'seeking_job' | 'at_risk' | 'outcome_unknown';

export type OutcomeType = 
  | 'employment' 
  | 'self_employment' 
  | 'freelancing' 
  | 'apprenticeship' 
  | 'entrepreneurship' 
  | 'further_education'
  | 'research'
  | 'other';

export interface TraineeSkill {
  skillId?: string;
  skill_id?: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
  score: number; // 0-100
}

export interface TrainingDetails {
  provider_name?: string;
  course_title?: string;
  accreditation?: string;
  instructor_name?: string;
  modality?: string;
  attendance_rate?: string;
  hours_completed?: number;
}

export interface Certification {
  id: string;
  title: string;
  issuing_organization: string;
  issue_date: string;
  expiry_date?: string;
  credential_id?: string;
  verification_url?: string;
  status: string;
  verification_status?: string;
  verification_notes?: string;
}

export interface AssessmentRecord {
  id: string;
  assessment_name: string;
  date: string;
  score: number;
  max_score: number;
  grade: string;
  evaluator: string;
  feedback: string;
}

export interface CareerPreference {
  target_roles: string[];
  preferred_workplace: string; // Remote, Hybrid, On-site, Flexible
  target_salary_min?: string;
  target_salary_max?: string;
  preferred_locations: string[];
  target_industries: string[];
  preferred_industry?: string;
  short_term_goal?: string;
  long_term_goal?: string;
}

export interface CurrentPathway {
  pathway_id?: string;
  title: string;
  current_stage: string;
  progress_percent: number;
  next_milestone: string;
}

export interface OutcomeRecord {
  id: string;
  outcome_type: OutcomeType;
  organization_or_venture: string;
  role_or_course: string;
  compensation_or_funding?: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  location?: string;
  work_arrangement?: string;
  description?: string;
  verification_status: 'verified' | 'pending_documentation' | 'unverified' | 'pending' | 'rejected';
  verification_notes?: string;
  created_at?: string;
}

export interface FollowUpAuditRecord {
  id: string;
  checkpoint_type: string;
  date: string;
  counselor_name: string;
  status: 'completed' | 'scheduled' | 'overdue' | 'pending';
  retention_confirmed: boolean;
  wage_progressed: boolean;
  counselor_notes: string;
}

export interface ConsentStatus {
  consent_status: 'granted' | 'partial' | 'revoked';
  share_with_employers: boolean;
  share_with_funding_bodies: boolean;
  share_anonymized_research: boolean;
  share_public_portfolio: boolean;
  consent_date: string;
  expiry_date?: string;
  version: string;
  notes?: string;
  last_reviewed_at?: string;
}

export interface Trainee {
  id: string;
  fullName?: string;
  full_name?: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  avatar_url?: string;
  location?: string;
  bio?: string;
  program: string;
  cohort: string;
  status: TraineeStatus;
  enrollmentDate?: string;
  enrollment_date?: string;
  graduationDate?: string;
  graduation_date?: string;
  training_details?: TrainingDetails;
  currentRole?: string;
  current_role?: string;
  currentEmployer?: string;
  current_employer?: string;
  placementDate?: string;
  placement_date?: string;
  placementSalary?: string;
  placement_salary?: string;
  primary_outcome_type?: OutcomeType;
  overallScore?: number;
  overall_score?: number;
  matchScore?: number;
  match_score?: number;
  skills: TraineeSkill[];
  lastFollowUp?: string;
  last_follow_up?: string;
  nextFollowUp?: string;
  next_follow_up?: string;
  notes?: string;
  certifications?: Certification[];
  assessments?: AssessmentRecord[];
  career_preference?: CareerPreference;
  current_pathway?: CurrentPathway;
  outcome_history?: OutcomeRecord[];
  follow_up_history?: FollowUpAuditRecord[];
  consent_status?: ConsentStatus;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Skill {
  id: string;
  name: string;
  category: 'Technical' | 'Soft Skills' | 'Domain' | 'Tools & Frameworks' | 'Cloud & DevOps';
  demandScore?: number;
  demand_score?: number;
  traineesProficient?: number;
  trainees_proficient?: number;
  openJobDemands?: number;
  open_job_demands?: number;
  description: string;
  growthTrend?: string;
  growth_trend?: string;
}

export interface Job {
  id: string;
  title: string;
  employerId?: string;
  employer_id?: string;
  employerName?: string;
  employer_name?: string;
  location: string;
  employmentType?: string;
  employment_type?: string;
  workplaceType?: string;
  workplace_type?: string;
  salaryRange?: string;
  salary_range?: string;
  requiredSkills?: string[];
  required_skills?: string[];
  openingsCount?: number;
  openings_count?: number;
  applicantsCount?: number;
  applicants_count?: number;
  status: 'active' | 'closed' | 'draft' | 'archived';
  company_id?: string;
  postedDate?: string;
  posted_date?: string;
  closingDate?: string;
  closing_date?: string;
  description: string;
  domain?: string;
  mapped_occupation_id?: string;
  mapped_occupation_title?: string;
  experience_level?: string;
  experience?: string;
  education_level?: string;
  source?: string;
  extracted_metadata?: any;
}

export interface JobExtractedSkill {
  id?: number;
  raw_text: string;
  canonical_skill_id?: string;
  canonical_name?: string;
  category: 'hard' | 'soft' | 'tool' | string;
  confidence: number;
  extraction_method?: string;
}

export interface JobSkillsBreakdown {
  job_id: string;
  job_title: string;
  hard_skills: JobExtractedSkill[];
  soft_skills: JobExtractedSkill[];
  tools_and_tech: JobExtractedSkill[];
  all_skills: JobExtractedSkill[];
  total_extracted: number;
}

export interface JobAnalysisResult {
  title: string;
  extracted_hard_skills: JobExtractedSkill[];
  extracted_soft_skills: JobExtractedSkill[];
  extracted_tools: JobExtractedSkill[];
  experience_requirements?: string;
  education_requirements?: string;
  location?: string;
  salary?: string;
  normalized_skills: {
    raw: string;
    canonical_name: string;
    confidence: number;
    category: string;
  }[];
  mapped_occupation?: {
    id: string;
    code: string;
    title: string;
    domain: string;
    career_band: string;
    median_salary: string;
    demand_outlook: string;
    match_score: number;
  };
  domain?: string;
}

export interface Employer {
  id: string;
  name: string;
  industry: string;
  location: string;
  contactPerson?: string;
  contact_person?: string;
  contactEmail?: string;
  contact_email?: string;
  contactPhone?: string;
  contact_phone?: string;
  activeOpenings?: number;
  active_openings?: number;
  hiredTraineesCount?: number;
  hired_trainees_count?: number;
  retentionRate?: number;
  retention_rate?: number;
  tier: 'Strategic Partner' | 'Standard' | 'Emerging';
  websiteUrl?: string;
  website_url?: string;
}

export type GapClassification = 'learner_gap' | 'curriculum_gap' | 'workplace_gap';
export type GapPriorityTier = 'critical' | 'moderate' | 'low';

export interface SkillGapFormulaBreakdown {
  formula: string;
  gap_calculation: string;
  severity_factor: string;
  skill_importance: string;
  market_demand: string;
  confidence: string;
  raw_product: string;
  normalized_priority_score: number;
}

export interface SkillGapBreakdownItem {
  skill_id: string;
  skill_name: string;
  category: 'hard' | 'soft' | string;
  domain?: string;
  required_proficiency: number;
  current_proficiency: number;
  skill_gap: number;
  gap_severity: number;
  skill_importance: number;
  importance_label: string;
  market_demand: number;
  market_demand_score: number;
  confidence: number;
  priority_score: number;
  priority_tier: GapPriorityTier;
  priority_label: string;
  priority_short?: string;
  gap_type: GapClassification;
  gap_type_label: string;
  is_taught_in_course: boolean;
  course_title?: string;
  detected_reason: string;
  remediation_action: string;
  employer_notes?: string;
  evidence_sources?: string[];
  evidence_label?: string;
  explainable_gap?: string;
  formula_breakdown?: SkillGapFormulaBreakdown;
}

export interface SkillComparisonCounts {
  resume_skills: number;
  verified_skills: number;
  required_skills: number;
  missing_skills: number;
}

export interface SkillComparisonVisualItem {
  skill_name: string;
  category: 'hard' | 'soft' | string;
  domain?: string;
  resume_claim: number;
  has_resume: boolean;
  verified_level: number;
  is_verified: boolean;
  required_level: number;
  is_required: boolean;
  missing_gap: number;
  is_missing: boolean;
  gap_type: 'learner_gap' | 'curriculum_gap' | 'workplace_gap' | 'none';
  gap_type_label: string;
  priority_tier?: string;
  priority_label?: string;
  evidence_sources?: string[];
  evidence_label: string;
  explainable_gap: string;
}

export interface SkillGapAnalysis {
  id: string;
  traineeId: string;
  trainee_id?: string;
  traineeName: string;
  trainee_name?: string;
  targetJobTitle: string;
  target_job_title?: string;
  target_job_id?: string;
  targetEmployer: string;
  target_employer?: string;
  target_occupation_id?: string;
  target_occupation_title?: string;
  enrolled_course_id?: string;
  enrolled_course_title?: string;
  gapScore: number;
  gap_score?: number;
  matchScore: number;
  match_score?: number;
  total_gaps_count?: number;
  critical_gaps_count?: number;
  moderate_gaps_count?: number;
  low_gaps_count?: number;
  curriculum_gaps_count?: number;
  learner_gaps_count?: number;
  workplace_gaps_count?: number;
  hard_gaps_count?: number;
  soft_gaps_count?: number;
  gaps_breakdown?: SkillGapBreakdownItem[];
  missingSkills?: any[];
  missing_skills?: any[];
  acquiredSkills?: any[];
  acquired_skills?: any[];
  skill_comparison_counts?: SkillComparisonCounts;
  skill_comparison_visual?: SkillComparisonVisualItem[];
  recommendation: string;
}

export interface WorkforceSkillGapSummary {
  total_audited_candidates: number;
  average_match_score: number;
  critical_gaps_total: number;
  moderate_gaps_total: number;
  low_gaps_total: number;
  curriculum_gaps_total: number;
  learner_gaps_total: number;
  workplace_gaps_total: number;
  hard_skills_gaps_total: number;
  soft_skills_gaps_total: number;
  top_missing_market_skills: {
    skill_name: string;
    category: string;
    count: number;
    avg_gap: number;
    gap_type: string;
    market_demand: number;
  }[];
  severity_distribution: { name: string; count: number; color: string }[];
  classification_distribution: { name: string; count: number; color: string; description: string }[];
  category_distribution: { name: string; count: number; color: string }[];
}

export interface CareerMilestone {
  stage: string;
  role: string;
  typicalTimeframe: string;
  expectedSalary: string;
  competencies: string[];
}

export interface CareerPath {
  id: string;
  title: string;
  track: string;
  description: string;
  projectedGrowth?: string;
  projected_growth?: string;
  milestones: CareerMilestone[];
  targetIndustries?: string[];
  target_industries?: string[];
}

export interface FollowUpItem {
  id: string;
  traineeId?: string;
  trainee_id?: string;
  traineeName?: string;
  trainee_name?: string;
  traineeRole?: string;
  trainee_role?: string;
  type: string;
  dueDate?: string;
  due_date?: string;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'High' | 'Medium' | 'Low';
  assignedCounselor?: string;
  assigned_counselor?: string;
  notes?: string;
  lastContactResult?: string;
}

export interface DashboardMetrics {
  totalTrainees: number;
  traineesPlaced: number;
  placementRate: number;
  activeJobOpenings: number;
  avgMatchRate: number;
  overdueFollowUps: number;
  retentionRate: number;
  monthlyPlacementTrend: { month: string; placed: number; target: number }[];
  skillsDemandSupply: { skill: string; demand: number; supply: number }[];
  statusDistribution: { status: TraineeStatus; count: number; label: string }[];
}

// ========================================================
// Competency Intelligence Module Types
// Course -> Competency -> Skill -> Occupation
// ========================================================

export interface ProficiencyLevelRubric {
  level: number;
  title: string;
  description: string;
  rubric?: string[];
  behavioral_indicators?: string[];
}

export interface CompetencySkill {
  id: string;
  code?: string;
  name: string;
  canonical_name?: string;
  category: 'hard' | 'soft' | string;
  domain: string;
  description: string;
  demand_score?: number;
  demandScore?: number;
  trainees_proficient?: number;
  traineesProficient?: number;
  open_job_demands?: number;
  openJobDemands?: number;
  growth_trend?: string;
  growthTrend?: string;
  aliases?: string[];
  proficiency_levels?: Record<string, ProficiencyLevelRubric>;
  related_competency_ids?: string[];
  related_occupation_ids?: string[];
}

export interface Course {
  id: string;
  code: string;
  title: string;
  domain: string;
  provider: string;
  duration_weeks: number;
  description?: string;
  competency_ids: string[];
}

export interface Competency {
  id: string;
  code: string;
  title: string;
  domain: string;
  description?: string;
  course_ids: string[];
  skill_ids: string[];
}

export interface Occupation {
  id: string;
  code: string;
  title: string;
  domain: string;
  description?: string;
  career_band: string;
  median_salary: string;
  demand_outlook: string;
  required_skill_ids: string[];
  competency_ids: string[];
}

export interface SkillNormalizationResult {
  query: string;
  canonical_skill_id?: string;
  canonical_name?: string;
  matched_alias?: string;
  confidence: number;
  category?: string;
  domain?: string;
  skill_details?: CompetencySkill;
}

export interface CompetencyGraphNode {
  id: string;
  label: string;
  type: 'course' | 'competency' | 'skill' | 'occupation';
  domain: string;
  metadata?: Record<string, any>;
}

export interface CompetencyGraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface CompetencyGraph {
  nodes: CompetencyGraphNode[];
  edges: CompetencyGraphEdge[];
}

export interface DomainSummary {
  domain: string;
  courses_count: number;
  competencies_count: number;
  skills_count: number;
  occupations_count: number;
}

// ========================================================
// Trainee Skill Scoring Engine Types
// ========================================================

export type EvidenceSourceType =
  | 'assessment'
  | 'practical_project'
  | 'certification'
  | 'trainer_evaluation'
  | 'employer_feedback';

export interface TraineeSkillEvidenceItem {
  id?: number;
  trainee_id: string;
  skill_id: string;
  skill_name: string;
  evidence_source: EvidenceSourceType;
  source_label?: string;
  score: number; // 0.0 to 5.0
  max_score?: number;
  confidence: number; // 0.0 to 1.0
  assessment_date: string;
  reviewer_source: string;
  base_weight?: number;
  recency_factor?: number;
  effective_weight?: number;
  rubric_scores?: {
    proficiency_level?: number;
    rubric_title?: string;
    criteria_breakdown?: any[];
  };
  notes?: string;
  artifact_url?: string;
}

export interface ScoringConfiguration {
  source_weights: Record<string, number>;
  source_labels: Record<string, string>;
  min_score: number;
  max_score: number;
  recency_decay_enabled: boolean;
  formula_name: string;
  description: string;
}

export interface SkillRadarPoint {
  skill: string;
  skill_id: string;
  category: 'hard' | 'soft' | string;
  current_level: number;
  target_level: number;
  confidence: number;
  full_mark: number;
}

export interface SkillMatrixItem {
  skill_id: string;
  name: string;
  category: 'hard' | 'soft' | string;
  current_level: number;
  target_level: number;
  confidence: number;
  evidence_count: number;
  sources_present: string[];
  calculation_explanation?: string;
  evidence: TraineeSkillEvidenceItem[];
  sources_summary?: {
    resume?: string;
    assessment?: string;
    practical_project?: string;
    certification?: string;
    trainer_evaluation?: string;
    coach_evaluation?: string;
    employer_feedback?: string;
    final_skill_profile?: string;
  };
  verification_status?: string;
  evidence_label?: string;
}

export interface TraineeRadarProfile {
  trainee_id: string;
  trainee_name: string;
  program: string;
  scoring_formula: ScoringConfiguration;
  radar_data: SkillRadarPoint[];
  skills_matrix: SkillMatrixItem[];
  total_skills: number;
  total_evidence_records: number;
}

export interface SoftSkillRubricOption {
  id: string;
  level: number;
  score: number;
  text: string;
  rubric_rationale: string;
}

export interface SoftSkillScenarioQuestion {
  id: string;
  scenario: string;
  options: SoftSkillRubricOption[];
}

export interface SoftSkillScenarioCategory {
  skill_id: string;
  name: string;
  canonical_name: string;
  category: string;
  description: string;
  questions: SoftSkillScenarioQuestion[];
}

export interface SoftSkillScenarioData {
  categories: string[];
  scenarios: Record<string, SoftSkillScenarioCategory>;
  rubrics: Record<number, { title: string; description: string; behavioral_indicator: string }>;
}

// Gap-to-Intervention Engine Types
export type InterventionType =
  | 'course_module'
  | 'practice_task'
  | 'project'
  | 'certification'
  | 'mentorship'
  | 'apprenticeship'
  | 'interview_prep'
  | 'soft_skill_practice';

export interface InterventionItem {
  id: string;
  title: string;
  type: InterventionType;
  domain: string;
  target_skills: string[];
  target_occupations: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | string;
  min_proficiency: number;
  target_proficiency: number;
  estimated_effort: string;
  provider_or_platform: string;
  description: string;
  why_it_matters?: string;
  prerequisites: string[];
  learning_outcomes: string[];
  reassessment_rubric?: Record<string, any>;
  market_demand_alignment: number;
}

export interface InterventionRecommendation {
  intervention_id: string;
  title: string;
  type: InterventionType;
  type_label: string;
  domain: string;
  difficulty_level: string;
  estimated_effort: string;
  provider_or_platform: string;
  description: string;
  why_it_matters: string;
  recommendation_rationale: string;
  recommendation_score: number;
  semantic_similarity: number;
  current_proficiency: number;
  expected_skill_level: number;
  min_proficiency: number;
  prerequisites_satisfied: boolean;
  prerequisite_note: string;
  prerequisites: string[];
  learning_outcomes: string[];
  reassessment_rubric?: Record<string, any>;
  market_demand_alignment: number;
  tracking_status: 'recommended' | 'in_progress' | 'completed' | 'reassessed' | string;
  progress_percent: number;
  trainee_intervention_id?: string;
}

export interface TraineeInterventionItem {
  id: string;
  trainee_id: string;
  trainee_name: string;
  gap_skill_id: string;
  gap_skill_name: string;
  gap_type: string;
  intervention_id: string;
  intervention_title: string;
  intervention_type: InterventionType;
  status: 'recommended' | 'in_progress' | 'completed' | 'reassessed' | string;
  progress_percent: number;
  started_at?: string;
  completed_at?: string;
  baseline_proficiency: number;
  expected_proficiency: number;
  reassessed_proficiency?: number;
  reassessment_date?: string;
  reassessment_notes?: string;
  why_it_matters?: string;
  notes?: string;
}

export interface StartInterventionPayload {
  trainee_id: string;
  gap_skill_id: string;
  gap_skill_name: string;
  intervention_id: string;
}

export interface UpdateInterventionProgressPayload {
  progress_percent: number;
  notes?: string;
}

export interface SubmitReassessmentPayload {
  reassessed_score: number;
  reviewer_name?: string;
  evaluator_notes: string;
  artifact_url?: string;
}

export interface ReassessmentResult {
  status: string;
  trainee_id: string;
  trainee_name: string;
  skill_name: string;
  baseline_proficiency: number;
  reassessed_score: number;
  new_overall_proficiency: number;
  gap_closed: boolean;
  updated_match_score?: number;
  remaining_gaps_count?: number;
  evidence_id: number;
  reassessment_date: string;
  message: string;
}

// Career Progression & Longitudinal Outcome Types
export type CareerPathwayType =
  | 'employment'
  | 'self_employment'
  | 'freelancing'
  | 'apprenticeship'
  | 'entrepreneurship'
  | 'further_education'
  | 'unknown';

export type CareerTimelineStage =
  | 'training'
  | 'first_outcome'
  | 'current_status'
  | 'career_event'
  | 'progression';

export interface CareerTimelineEventItem {
  id: string;
  trainee_id: string;
  trainee_name?: string;
  stage: CareerTimelineStage;
  pathway: CareerPathwayType;
  pathway_label?: string;
  title: string;
  organization: string;
  event_date: string;
  metrics: Record<string, any>;
  verification_status: 'verified' | 'self_reported' | 'pending_audit' | 'unknown' | string;
  verification_notes?: string;
  is_current?: boolean;
  sequence_order?: number;
}

export interface LongitudinalFollowUpItem {
  id: string;
  trainee_id: string;
  trainee_name: string;
  milestone_days: 30 | 90 | 180 | 365 | number;
  milestone_label?: string;
  scheduled_date: string;
  due_date: string;
  completed_date?: string;
  status: 'scheduled' | 'due' | 'overdue' | 'completed' | 'unreachable' | string;
  pathway?: CareerPathwayType;
  retention_confirmed: boolean;
  metrics_recorded: Record<string, any>;
  notes?: string;
  survey_link?: string;
}

export interface CareerTimelineStages {
  training: CareerTimelineEventItem | null;
  first_outcome: CareerTimelineEventItem | null;
  current_status: CareerTimelineEventItem | null;
  career_events: CareerTimelineEventItem[];
  progression: CareerTimelineEventItem | null;
}

export interface CareerTimelineData {
  trainee_id: string;
  trainee_name: string;
  program: string;
  primary_outcome_type: CareerPathwayType;
  pathway_label: string;
  current_role?: string;
  current_employer?: string;
  placement_salary?: string;
  enrollment_date: string;
  graduation_date?: string;
  timeline_stages: CareerTimelineStages;
  all_events: CareerTimelineEventItem[];
  longitudinal_milestones: LongitudinalFollowUpItem[];
}

export interface PathwayDistributionItem {
  pathway: CareerPathwayType;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PathwaySummaryData {
  total_trainees: number;
  overall_retention_rate: number;
  unknown_outcome_count: number;
  unknown_outcome_percent: number;
  positive_outcomes_count: number;
  positive_outcomes_percent: number;
  pathway_distribution: PathwayDistributionItem[];
  milestone_retention_funnel: Record<string, { total: number; completed: number; retained: number }>;
}

export interface CreateCareerEventPayload {
  trainee_id: string;
  stage: CareerTimelineStage;
  pathway: CareerPathwayType;
  title: string;
  organization: string;
  event_date: string;
  metrics: Record<string, any>;
  verification_status?: string;
  verification_notes?: string;
  is_current?: boolean;
}

export interface CompleteLongitudinalFollowUpPayload {
  retention_confirmed: boolean;
  pathway: CareerPathwayType;
  metrics: Record<string, any>;
  notes: string;
}

// ========================================================
// Employer Verification, Evidence Levels & Analytics Types
// Self-reported -> Employer-confirmed -> Evidence-backed -> Multi-source verified
// ========================================================

export type EvidenceLevelType = 
  | 'self_reported' 
  | 'employer_confirmed' 
  | 'evidence_backed' 
  | 'multi_source_verified';

export interface EvidenceLevelConfig {
  level_key: EvidenceLevelType;
  level_number: number;
  label: string;
  description: string;
  badge_color: 'neutral' | 'brand' | 'purple' | 'success';
  count?: number;
  percentage?: number;
}

export interface EmployerVerificationCreatePayload {
  employer_id?: string;
  employer_name: string;
  reviewer_name: string;
  reviewer_role?: string;
  reviewer_email?: string;
  trainee_id: string;
  trainee_name: string;
  verification_status: 'confirmed' | 'disputed' | 'former_employee';
  confirmed_role: string;
  confirmed_department?: string;
  employment_type: string;
  confirmed_start_date: string;
  salary_range?: string;
  is_still_employed: boolean;
  retention_months: number;
  skill_ratings: Record<string, number>;
  missing_technical_skills: string[];
  missing_soft_skills: string[];
  training_relevance_rating: number;
  training_relevance_notes?: string;
  curriculum_recommendations?: string;
  would_hire_from_provider_again: boolean;
  verified_artifacts: string[];
}

export interface EmployerFeedbackVerification {
  id: string;
  employer_id?: string;
  employer_name: string;
  reviewer_name: string;
  reviewer_role?: string;
  reviewer_email?: string;
  trainee_id: string;
  trainee_name: string;
  verification_status: 'confirmed' | 'disputed' | 'former_employee';
  confirmed_role: string;
  confirmed_department?: string;
  employment_type: string;
  confirmed_start_date: string;
  salary_range?: string;
  is_still_employed: boolean;
  retention_months: number;
  skill_ratings: Record<string, number>;
  average_skill_score: number;
  missing_technical_skills: string[];
  missing_soft_skills: string[];
  training_relevance_rating: number;
  training_relevance_notes?: string;
  curriculum_recommendations?: string;
  would_hire_from_provider_again: boolean;
  evidence_level: EvidenceLevelType;
  verified_artifacts: string[];
  multi_source_corroboration: {
    sources?: string[];
    confidence_score?: number;
    audit_timestamp?: string;
  };
  submission_date: string;
}

export interface EvidenceHierarchySummary {
  total_trainees: number;
  self_reported_count: number;
  self_reported_percent: number;
  employer_confirmed_count: number;
  employer_confirmed_percent: number;
  evidence_backed_count: number;
  evidence_backed_percent: number;
  multi_source_verified_count: number;
  multi_source_verified_percent: number;
  evidence_levels: EvidenceLevelConfig[];
}

export interface PendingVerificationCandidate {
  trainee_id: string;
  trainee_name: string;
  program: string;
  cohort: string;
  status: string;
  current_role: string;
  current_employer: string;
  placement_salary: string;
  evidence_level: EvidenceLevelType;
  is_direct_match: boolean;
  is_verified?: boolean;
  verification_id?: string;
  has_pending?: boolean;
  outcome_status?: string;
  reported_start_date?: string;
  skills: string[];
}

export interface MonthlyPlacementTrendItem {
  month: string;
  employment_rate: number;
  target: number;
  total_placed: number;
  salaried: number;
  entrepreneurial_or_freelance: number;
}

export interface CohortEmploymentItem {
  cohort: string;
  enrolled: number;
  placed: number;
  rate: number;
  positive_outcomes: number;
}

export interface RetentionMilestoneCurveItem {
  milestone: string;
  days: number;
  retention_rate: number;
  benchmark: number;
  retained_count: number;
  audited_total: number;
}

export interface PathwayRetentionItem {
  pathway: string;
  day_90: number;
  day_180: number;
  day_365: number;
}

export interface WageMilestoneItem {
  stage: string;
  avg_wage: number;
  label: string;
}

export interface PathwayWageComparisonItem {
  pathway: string;
  starting_wage: number;
  one_year_wage: number;
  pct_gain: number;
}

export interface SkillImprovementBenchmarkItem {
  skill: string;
  intake_score: number;
  graduation_score: number;
  on_the_job_score: number;
  net_delta: number;
}

export interface SkillGapItem {
  skill?: string;
  skill_name?: string;
  severity?: number | string;
  employer_citations?: number;
  frequency?: number;
  frequency_count?: number;
  category?: 'technical' | 'soft' | string;
  urgency?: 'High' | 'Medium' | 'Low' | string;
  percentage_affected?: number;
  recommended_curriculum_action?: string;
}

export interface TrainingProviderOutcomeItem {
  provider?: string;
  provider_id?: string;
  provider_name?: string;
  domain?: string;
  enrolled?: number;
  graduated?: number;
  total_trainees?: number;
  trainees_enrolled?: number;
  placed?: number;
  trainees_placed?: number;
  placement_rate: number;
  average_salary?: any;
  employer_satisfaction?: number;
  employer_rating?: number;
  top_domains?: string;
  retention_90d_rate?: number;
  retention_365d_rate?: number;
  status?: string;
}

export interface CourseOutcomeItem {
  course_code?: string;
  course_title?: string;
  provider?: string;
  domain?: string;
  enrolled?: number;
  total_enrolled?: number;
  placement_rate: number;
  avg_salary?: any;
  average_wage?: any;
  skill_gain?: string;
  verified_skill_score?: number;
  retention_rate?: number;
  retention_365d?: number;
  completion_rate?: number;
}

export interface DistrictTrendItem {
  district: string;
  state?: string;
  trainees_count?: number;
  total_graduates?: number;
  placed_count?: number;
  placement_rate?: number;
  employment_rate?: number;
  top_sector?: string;
  avg_wage?: string;
  average_salary?: any;
  active_employers?: number;
  demand_growth_pct?: number;
}

export interface OccupationDemandItem {
  occupation?: string;
  occupation_code?: string;
  title?: string;
  market_demand_index?: number;
  open_jobs?: number;
  current_openings?: number;
  pipeline_supply?: number;
  pipeline_candidates?: number;
  pipeline_coverage_ratio?: number;
  supply_gap?: number;
  growth_rate?: string;
  median_market_salary?: string;
  status?: string;
}

export interface NonPlacementReasonItem {
  reason: string;
  category: string;
  count: number;
  percentage: number;
  recommended_intervention: string;
}

export interface ComprehensiveAnalyticsSummaryKPIs {
  total_enrolled: number;
  overall_placement_rate: number;
  positive_outcome_rate: number;
  longitudinal_retention_90d: number;
  longitudinal_retention_365d: number;
  average_wage_increase_pct: number;
  average_skill_proficiency_gain: number;
  active_employer_partners: number;
  verified_outcomes_count: number;
}

export interface ComprehensiveAnalyticsData {
  summary_kpis: ComprehensiveAnalyticsSummaryKPIs;
  employment_rate: {
    overall_rate: number;
    salaried_employment_rate: number;
    alternative_positive_pathways_rate: number;
    positive_outcome_total_rate: number;
    monthly_trends: MonthlyPlacementTrendItem[];
    cohort_breakdown: CohortEmploymentItem[];
  };
  retention: {
    average_90_day_retention: number;
    average_365_day_retention: number;
    milestone_curves: RetentionMilestoneCurveItem[];
    pathway_retention_comparison: PathwayRetentionItem[];
  };
  wage_progression: {
    average_pre_training_wage: string;
    average_placement_wage: string;
    average_one_year_wage: string;
    wage_gain_percentage: number;
    progression_milestones: WageMilestoneItem[];
    pathway_wage_comparison: PathwayWageComparisonItem[];
  };
  skill_improvement: {
    overall_average_gain: number;
    hard_skill_average_gain: number;
    soft_skill_average_gain: number;
    skills_benchmarks: SkillImprovementBenchmarkItem[];
  };
  skill_gaps: {
    top_technical_gaps: SkillGapItem[];
    top_soft_gaps: SkillGapItem[];
  };
  training_provider_outcomes: TrainingProviderOutcomeItem[];
  course_outcomes: CourseOutcomeItem[];
  district_trends: DistrictTrendItem[];
  occupation_demand: OccupationDemandItem[];
  non_placement_reasons: NonPlacementReasonItem[];
  longitudinal_intelligence?: LongitudinalMetricsData;
  data_quality_summary?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Longitudinal Outcome Intelligence & Cohort Filtering Types
// ---------------------------------------------------------------------------
export interface LongitudinalMetricsData {
  placement_rate: number | null;
  employment_rate: number | null;
  self_employment_rate: number | null;
  apprenticeship_rate: number | null;
  freelancing_rate: number | null;
  higher_studies_rate: number | null;
  unemployed_rate: number | null;
  unknown_rate: number | null;
  unreachable_rate: number | null;
  withdrawn_consent_rate: number | null;
  retention_30d: number | null;
  retention_90d: number | null;
  retention_180d: number | null;
  retention_365d: number | null;
  wage_progression: number | null;
  median_wage: number | null;
  average_placement_wage: number | null;
  average_current_wage: number | null;
  training_to_job_relevance: number | null;
  skill_gap_frequency: Array<{ skill: string; count: number; category: string; type: string }>;
  attrition_reasons: Array<{ reason: string; count: number; percentage: number }>;
  follow_up_response_rate: number | null;
  cohort_filters_applied?: Record<string, any>;
}

export interface DataQualityAuditRecord {
  trainee_id: string;
  trainee_name: string;
  program: string;
  cohort: string;
  outcome_state: string;
  verification_level: string;
  quality_score: number;
  completeness: number;
  freshness: number;
  verification: number;
  consistency: number;
  deductions: string[];
  is_stale: boolean;
  has_missing_wages: boolean;
  has_missing_employer_verification: boolean;
  days_since_active?: number | null;
  data_source: string;
}

export interface DataQualityDashboardData {
  total_records: number;
  verified_records: number;
  verified_pct: number;
  self_reported_records: number;
  self_reported_pct: number;
  unknown_outcomes: number;
  unknown_pct: number;
  unreachable_trainees: number;
  unreachable_pct: number;
  stale_records: number;
  stale_pct: number;
  missing_wages: number;
  missing_wages_pct: number;
  missing_employer_verification: number;
  missing_employer_verification_pct: number;
  missing_follow_ups: number;
  missing_follow_ups_pct: number;
  overall_quality_score: number;
  score_breakdown: {
    completeness: number;
    freshness: number;
    verification: number;
    consistency: number;
  };
  record_audits: DataQualityAuditRecord[];
}

export interface TraineeOutcomeRecord {
  trainee_id: string;
  trainee_name: string;
  status: string;
  verification_level: string;
  confidence: number;
  last_verified_at: string | null;
  source: string | null;
  is_synthetic: boolean;
  data_source: string;
}

export interface CohortFilterOptionsData {
  courses: string[];
  providers: string[];
  districts: string[];
  batches: string[];
  outcome_states: string[];
  verification_levels: string[];
  data_sources: string[];
}

export interface CohortFilterParams {
  course?: string;
  provider?: string;
  district?: string;
  batch?: string;
  training_period_start?: string;
  training_period_end?: string;
  demographic_dimension?: string;
  outcome_type?: string;
  include_demo?: boolean;
}

// ---------------------------------------------------------------------------
// Real-Time AI Resume Analyzer & Competency Mapping Types
// ---------------------------------------------------------------------------
export interface ExtractedSkillItem {
  skill_id: string;
  canonical_name: string;
  category: string;
  evidence_snippet: string;
  estimated_proficiency: number; // 0.0 - 5.0
  confidence: number; // 0.0 - 1.0
  matched_via: string;
  source_term: string;
  embedding_similarity?: number;
}

export interface ExtractedCareerMetadata {
  job_titles: string[];
  years_of_experience: number;
  education: Array<{ degree?: string; institution?: string; year?: string; details?: string }>;
  certifications: string[];
  projects: Array<{ title?: string; description?: string; metrics?: string[] }>;
  work_experience: Array<{ title?: string; organization?: string; duration?: string; description?: string }>;
  technical_skills_raw: string[];
  soft_skills_raw: string[];
  tools_technologies_raw: string[];
  domains_industries: string[];
  contact_info: { email?: string; phone?: string; linkedin?: string; github?: string };
}

export interface CompletenessCriterion {
  score: number;
  max: number;
  label: string;
  status: 'present' | 'missing' | 'partial';
  detail: string;
}

export interface CompletenessBreakdown {
  contact_info: CompletenessCriterion;
  summary: CompletenessCriterion;
  skills_evidence: CompletenessCriterion;
  work_experience: CompletenessCriterion;
  education: CompletenessCriterion;
  projects_metrics: CompletenessCriterion;
  certifications: CompletenessCriterion;
}

export interface ResumeJobMatch {
  job_id: string;
  title: string;
  company: string;
  location: string;
  salary_range: string;
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
}

export interface ResumeSkillGap {
  target_job_id: string;
  target_job_title: string;
  target_job_company: string;
  missing_skills: string[];
  gap_count: number;
  urgency: string;
}

export interface ResumeRecommendation {
  course_id: string;
  title: string;
  provider: string;
  duration_weeks: number;
  skills_covered: string[];
  target_job_relevance: string;
  enrollment_url: string;
}

export interface ResumeAnalysisResult {
  analysis_id: string;
  trainee_id: string;
  trainee_name?: string;
  filename: string;
  file_url: string;
  file_type: string;
  analyzed_at: string;
  extracted_metadata: ExtractedCareerMetadata;
  skills_profile: ExtractedSkillItem[];
  skills_count: number;
  completeness_score: number;
  completeness_label: string;
  completeness_breakdown: CompletenessBreakdown;
  job_matches: ResumeJobMatch[];
  skill_gaps: ResumeSkillGap[];
  recommendations: ResumeRecommendation[];
}

export interface ResumeInfoResponse {
  has_resume: boolean;
  filename?: string | null;
  resume_url?: string | null;
  extracted_skills: string[];
  analysis?: ResumeAnalysisResult | null;
}

// ---------------------------------------------------------------------------
// Unified Skill Profile Types (Multi-Source Competency Fusion)
// ---------------------------------------------------------------------------
export interface UnifiedSkillItem {
  skill_id: string;
  name: string;
  category: string;
  current_level: number;
  current_score: number;
  target_level: number;
  confidence: number;
  date_assessed?: string;
  verification_status: 'verified' | 'detected' | 'unverified';
  is_verified: boolean;
  sources_summary: {
    resume: string;
    assessment: string;
    practical_project: string;
    certification: string;
    coach_evaluation: string;
    employer_feedback: string;
    final_skill_profile: string;
  };
  evidence_label: string;
  evidence_count: number;
  sources_present: string[];
  calculation_explanation: string;
  evidence: any[];
}

export interface UnifiedSkillProfile {
  trainee_id: string;
  trainee_name: string;
  program: string;
  total_skills: number;
  verified_skills_count: number;
  detected_skills_count: number;
  skills: UnifiedSkillItem[];
  radar_data: any[];
  scoring_formula: any;
}

// ---------------------------------------------------------------------------
// Longitudinal Trainee Passport & Event Audit Types
// ---------------------------------------------------------------------------

export interface TrainingRecord {
  id: string;
  trainee_id: string;
  course_name: string;
  provider_name: string;
  batch?: string;
  start_date?: string;
  end_date?: string;
  delivery_mode?: string;
  completion_status: string;
  attendance_percentage?: number;
  hours_completed?: number;
  assessment_score?: number;
  certificate_url?: string;
  description?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  source: string;
  created_at?: string;
  updated_at?: string;
}

export interface PassportEvent {
  id: number;
  trainee_id?: string;
  timestamp: string;
  actor_name: string;
  actor_role: string;
  event_type: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  previous_value?: any;
  new_value?: any;
  source: string;
  verification_status: string;
  notes?: string;
}

export interface TraineePassportData {
  trainee: Trainee;
  training_records: TrainingRecord[];
  timeline: PassportEvent[];
  audit_history: PassportEvent[];
  stats: {
    training_count: number;
    skills_count: number;
    certifications_count: number;
    outcomes_count: number;
    follow_ups_count: number;
    events_count: number;
  };
}

export interface TraineeProfileUpdatePayload {
  full_name?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  location?: string;
  address?: string;
  languages?: string[];
  education?: string;
  bio?: string;
  employment_status?: string;
  career_interests?: string[];
  preferred_locations?: string[];
  career_preference?: Record<string, any>;
}

export interface TrainingRecordCreatePayload {
  course_name: string;
  provider_name: string;
  batch?: string;
  start_date?: string;
  end_date?: string;
  delivery_mode?: string;
  completion_status?: string;
  attendance_percentage?: number;
  hours_completed?: number;
  certificate_url?: string;
  description?: string;
}

export interface CareerGoalsUpdatePayload {
  target_occupation?: string;
  target_roles?: string[];
  preferred_industry?: string;
  preferred_workplace?: string;
  preferred_locations?: string[];
  target_salary_min?: string;
  target_salary_max?: string;
  employment_type?: string;
  short_term_goal?: string;
  long_term_goal?: string;
  entrepreneurship_interest?: boolean;
  further_education_interest?: boolean;
}

export interface SkillAddPayload {
  skill_name: string;
  category?: string;
  self_rating?: number;
  evidence_notes?: string;
  evidence_source?: string;
}

export interface FollowUpResponsePayload {
  employment_status: string;
  current_role?: string;
  current_employer?: string;
  current_salary?: string;
  still_using_learned_skills: boolean;
  occupation_changed: boolean;
  additional_skills_needed?: string;
  trainee_notes?: string;
}

export interface OutcomeVerifyPayload {
  verification_status: 'verified' | 'rejected' | 'pending';
  verification_notes?: string;
  confirmed_role?: string;
}

// ========================================================
// Career Outcome Digital Twin Types
// ========================================================

export type UncertaintyState = 'KNOWN' | 'SELF_REPORTED' | 'VERIFIED' | 'STALE' | 'UNKNOWN';
export type DigitalTwinRiskState = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';

export interface DigitalTwinEvidenceItem {
  attribute: string;
  source: string;
  confidence: number;
  explanation: string;
  last_verified_at?: string;
  verifier_identity?: string;
}

export interface DigitalTwinSkillDNAItem {
  skill_id?: string;
  skill_name: string;
  proficiency_score: number;
  score: number;
  level: string;
  confidence: number;
  verified: boolean;
  evidence_count: number;
}

export interface DigitalTwinSkillEvolutionStage {
  stage_id: 'TRAINING_COMPLETION' | 'INTERVENTION' | 'REASSESSMENT' | 'TARGET_JOB';
  stage_name: string;
  timestamp: string;
  skills: { skill_name: string; score: number; target: number }[];
}

export interface DigitalTwinOutcomeMilestone {
  month: number;
  milestone_label: string;
  status: string;
  event_date: string;
  role?: string;
  organization?: string;
  wage?: string;
  notes?: string;
}

export interface DigitalTwinStateData {
  trainee_id: string;
  trainee_name?: string;
  current_outcome: string;
  current_role?: string;
  current_employer?: string;
  employment_status: string;
  employment_start_date?: string;
  current_income_range?: string;
  current_wage_numeric?: number;
  placement_wage_numeric?: number;
  wage_growth_percent?: number;
  training_relevance: string;
  retention_state: string;
  skill_readiness: number;
  job_readiness: number;
  skill_gap_count: number;
  high_priority_gaps: {
    skill_name: string;
    priority: string;
    current_level: number;
    target_level: number;
    gap: number;
  }[];
  active_interventions_count: number;
  active_interventions: {
    id: string;
    intervention_name: string;
    status: string;
    progress_percentage: number;
  }[];
  last_verified_at?: string;
  data_quality: number;
  data_quality_breakdown?: {
    score: number;
    completeness: number;
    freshness: number;
    verification: number;
    consistency: number;
    deductions: string[];
    is_stale: boolean;
    days_since_active?: number;
  };
  confidence: number;
  confidence_percentage: number;
  uncertainty_state: UncertaintyState;
  risk_state: DigitalTwinRiskState;
  risk_factors: string[];
  skill_dna: DigitalTwinSkillDNAItem[];
  skill_evolution: DigitalTwinSkillEvolutionStage[];
  outcome_evolution: DigitalTwinOutcomeMilestone[];
  evidence_traceability: DigitalTwinEvidenceItem[];
  updated_at: string;
}

export interface DigitalTwinTimelineResponse {
  trainee_id: string;
  total_events: number;
  timeline_events: Array<{
    id: string;
    trainee_id: string;
    stage: string;
    title: string;
    description?: string;
    organization?: string;
    pathway?: string;
    event_date: string;
    sequence_order: number;
    verification_status: string;
    verified_by?: string;
    evidence_url?: string;
    metadata?: Record<string, any>;
  }>;
}

export interface DigitalTwinDataQualityResponse {
  trainee_id: string;
  quality_score: number;
  completeness: number;
  freshness: number;
  verification: number;
  consistency: number;
  deductions: string[];
  is_stale: boolean;
  has_missing_wages: boolean;
  has_missing_employer_verification: boolean;
  days_since_active?: number;
}

// ========================================================
// What-If Career Simulator Frontend Types
// ========================================================

export interface AdditionalSkillInput {
  name: string;
  level?: string; // weak, moderate, strong, beginner, intermediate, advanced
  proficiency_score?: number;
}

export interface ScenarioInput {
  trainee_id?: string;
  baseline_skills?: Array<{
    name: string;
    level: string;
    proficiency_score?: number;
    verified?: boolean;
  }>;
  additional_skills: AdditionalSkillInput[];
  certification?: string;
  target_role?: string;
  target_location?: string;
  intervention_id?: string;
  intervention_name?: string;
  scenario_name?: string;
}

export interface JobImpactItem {
  job_id: string;
  title: string;
  employer_name: string;
  location: string;
  employment_type: string;
  salary_range: string;
  current_match_score: number;
  simulated_match_score: number;
  score_change: number;
  is_newly_matched: boolean;
  status: 'NEWLY_MATCHED' | 'IMPROVED_MATCH' | 'UNCHANGED';
  explanation: string;
}

export interface RemainingGapItem {
  skill_name: string;
  category: string;
  current_level: number;
  target_level: number;
  gap: number;
  priority: string;
  importance_label: string;
}

export interface NewlyEligiblePathway {
  pathway_id: string;
  title: string;
  track: string;
  current_readiness: number;
  simulated_readiness: number;
  readiness_delta: number;
  status: string;
  unlocked_milestones: string[];
}

export interface RequiredTrainingIntervention {
  intervention_id: string;
  title: string;
  type: string;
  domain: string;
  target_skills: string[];
  estimated_effort: string;
  provider_or_platform: string;
  description: string;
  why_it_matters?: string;
}

export interface ReadinessEstimation {
  output_type: string; // "ESTIMATION"
  current_readiness: number;
  simulated_readiness: number;
  readiness_delta: number;
  benchmark_basis: string;
  disclaimer: string;
}

export interface SimulationResponse {
  status: 'SIMULATION' | 'INSUFFICIENT_DATA';
  trainee_id?: string;
  trainee_name?: string;
  scenario_name: string;
  output_label: 'SIMULATION';
  estimation_label: 'ESTIMATION';
  simulation_disclaimer: string;
  guarantee_clause: string;
  current_profile: {
    trainee_id?: string;
    trainee_name?: string;
    skills: Array<{
      name: string;
      level: string;
      proficiency_score: number;
      verified?: boolean;
    }>;
    total_skills?: number;
    target_role?: string;
  };
  simulated_profile: {
    skills: Array<{
      name: string;
      level: string;
      proficiency_score: number;
      verified?: boolean;
    }>;
    total_skills?: number;
    added_skills?: string[];
    certification?: string;
    intervention?: string;
  };
  skill_changes: Array<{
    skill_name: string;
    previous_level: string;
    simulated_level: string;
    previous_score: number;
    simulated_score: number;
    change_type: string;
    explanation: string;
  }>;
  newly_matched_jobs: JobImpactItem[];
  changed_job_matches: JobImpactItem[];
  remaining_skill_gaps: RemainingGapItem[];
  newly_eligible_pathways: NewlyEligiblePathway[];
  required_training_interventions: RequiredTrainingIntervention[];
  estimated_readiness: ReadinessEstimation;
  data_sufficiency: {
    is_sufficient: boolean;
    active_jobs_evaluated?: number;
    job_count?: number;
    note: string;
  };
  insufficient_data_reasons?: string[];
}

export interface SimulatorOptions {
  available_skills: Array<{ id: string; name: string; category: string; domain: string }>;
  target_roles: string[];
  locations: string[];
  suggested_certifications: string[];
  interventions: Array<{ id: string; title: string; type: string; domain: string }>;
}

// ========================================================
// Outcome Risk Engine Frontend Types
// ========================================================

export type OutcomeRiskType =
  | 'SKILL_GAP'
  | 'EMPLOYMENT_INSTABILITY'
  | 'FOLLOWUP_FAILURE'
  | 'DATA_STALENESS'
  | 'JOB_SEARCH_DIFFICULTY'
  | 'TRAINING_JOB_MISMATCH';

export type OutcomeRiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OutcomeRiskStatus =
  | 'DETECTED'
  | 'INTERVENTION_SUGGESTED'
  | 'INTERVENTION_ACCEPTED'
  | 'INTERVENTION_REJECTED'
  | 'INTERVENTION_IN_PROGRESS'
  | 'INTERVENTION_COMPLETED'
  | 'REASSESSED'
  | 'RESOLVED'
  | 'MONITORING';

export interface OutcomeRiskItem {
  id: string;
  trainee_id: string;
  trainee_name?: string;
  risk_type: OutcomeRiskType;
  severity: OutcomeRiskSeverity;
  signals: string[];
  evidence: Record<string, any>;
  status: OutcomeRiskStatus;
  recommended_intervention?: {
    title: string;
    type: string;
    domain?: string;
    target_skills?: string[];
    estimated_effort?: string;
    provider_or_platform?: string;
    rationale?: string;
    expected_outcome?: string;
  };
  reassessment_record?: {
    reassessed_at: string;
    evaluator_name: string;
    evaluator_role: string;
    raw_score: number;
    normalized_score: number;
    old_severity: string;
    new_severity: string;
    outcome_verdict: string;
    recalc_note: string;
    evaluator_notes?: string;
    evidence_url?: string;
  };
  created_at: string;
  updated_at: string;
  risk_signal_label: 'RISK SIGNAL';
  why_explanation: {
    signal_1: string;
    signal_2: string;
    signal_3: string;
    evidence_breakdown?: Record<string, any>;
  };
}

export interface OutcomeRiskSummary {
  total_risks: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  critical_trainees_count: number;
  high_trainees_count: number;
  active_interventions_count: number;
}

// ==========================================
// SKILL GAP INTELLIGENCE TYPES
// ==========================================

export type SkillGapCategory = 'NO_GAP' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TraineeSkillGapItem {
  skill_id: string;
  skill_name: string;
  canonical_name?: string;
  category: string;
  required_level: number;
  current_level: number;
  gap_level: number;
  gap_category: SkillGapCategory;
  source: string;
  detected_at?: string;
  status_icon?: string;
  status_flag: 'VALID' | 'WARNING' | 'CRITICAL_GAP';
  flag_reason?: string;
  explanation: string;
}

export interface TraineeSkillGapResponse {
  trainee_id: string;
  trainee_name: string;
  course_id?: string;
  course_title?: string;
  target_role?: string;
  target_job_id?: string;
  target_job_title?: string;
  target_domain?: string;
  overall_readiness_score?: number;
  current_skills_summary: TraineeSkillGapItem[];
  required_skills_summary: TraineeSkillGapItem[];
  skill_gaps: TraineeSkillGapItem[];
  suggested_learning_areas: (string | any)[];
  available_roles?: { id?: string; title: string; domain?: string }[];
  employment_relevance_score: number;
  sample_size_context: string;
  estimation_label: string;
}

export interface CourseCoverageSkillItem {
  skill_id: string;
  skill_name: string;
  category: string;
  covered_in_course: boolean;
  proficiency_taught: number;
  mandatory_in_course: boolean;
  job_demand_frequency: number;
  trainee_gap_frequency: number;
  average_trainee_proficiency: number;
  average_gap: number;
  coverage_status: 'GOOD_COVERAGE' | 'HIGH_DEMAND_LOW_COVERAGE' | 'CURRICULUM_GAP' | 'SUFFICIENT';
  employment_association: string;
}

export interface CourseSkillAnalysisResponse {
  course_id: string;
  course_title: string;
  domain: string;
  total_enrolled_trainees: number;
  sample_size: number;
  training_coverage_rate: number;
  average_skill_gap: number;
  skills_taught: CourseCoverageSkillItem[];
  skills_demanded: CourseCoverageSkillItem[];
  high_demand_low_coverage_skills: CourseCoverageSkillItem[];
  good_coverage_skills: CourseCoverageSkillItem[];
  emerging_skills_detected: string[];
  suggested_curriculum_additions: string[];
  outcome_associations: Record<string, any>;
  estimation_label: string;
}

export interface TopSkillGapItem {
  skill_id: string;
  skill_name: string;
  category: string;
  frequency: number;
  average_gap: number;
  severity_distribution: Record<string, number>;
  top_associated_courses: string[];
}

export interface TopSkillGapsResponse {
  sample_size: number;
  detected_at: string;
  filters_applied: Record<string, any>;
  top_gaps: TopSkillGapItem[];
}

export interface QuarterlyEmergingSkill {
  skill_id: string;
  skill_name: string;
  category: string;
  quarterly_growth: Record<string, number>;
  baseline_frequency: number;
  current_frequency: number;
  growth_rate_pct: number;
  is_emerging: boolean;
  sample_size: number;
  sample_warning: string | null;
}

export interface EmergingSkillsResponse {
  sample_size: number;
  threshold_growth_pct: number;
  emerging_skills: QuarterlyEmergingSkill[];
}

export interface JobSkillDemandItem {
  skill_id: string;
  skill_name: string;
  category: string;
  total_jobs_demanding: number;
  demand_percentage: number;
  mandatory_count: number;
  preferred_count: number;
  top_sectors: string[];
}

export interface JobSkillDemandResponse {
  sample_size: number;
  total_jobs_analyzed: number;
  skills: JobSkillDemandItem[];
}

// ==========================================
// OUTCOME FAILURE & ATTRITION CAUSE TYPES
// ==========================================

export interface OutcomeReasonItem {
  id: number;
  category: 'NON_PLACEMENT' | 'ATTRITION' | 'SELF_EMPLOYMENT';
  reason_key: string;
  reason_label: string;
  description: string;
  is_active: boolean;
}

export interface OutcomeReasonDistributionItem {
  reason_key: string;
  reason_label: string;
  count: number;
  percentage: number;
}

export interface OutcomeReasonBreakdownResponse {
  outcome_category: string;
  sample_size: number;
  filter_context: Record<string, any>;
  metric_definition: string;
  distribution: OutcomeReasonDistributionItem[];
  subgroup_breakdowns: Record<string, any>;
  associations: string[];
}

export interface RecommendedInterventionArea {
  title: string;
  domain: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface OutcomeSummaryAnalyticsResponse {
  total_outcomes: number;
  sample_size: number;
  date_range: string;
  stale_status_count: number;
  by_outcome_category: Record<string, number>;
  top_non_placement_reasons: OutcomeReasonDistributionItem[];
  top_attrition_reasons: OutcomeReasonDistributionItem[];
  top_self_employment_challenges: OutcomeReasonDistributionItem[];
  key_associations: string[];
  recommended_interventions: RecommendedInterventionArea[];
}

export interface FollowUpQuestion {
  id: string;
  question_text: string;
  question_type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TEXT' | 'RATING';
  options: string[];
  required: boolean;
}

export interface FollowUpGenerationResponse {
  trainee_id: string;
  employment_status: string;
  generated_at: string;
  questions: FollowUpQuestion[];
}

export interface FollowUpAnswerItem {
  question_id: string;
  question_text: string;
  answer_value: string;
  details?: string;
}

export interface FollowUpResponseSubmission {
  trainee_id: string;
  employment_status: string;
  answers: FollowUpAnswerItem[];
}

// ========================================================
// Organization & Multi-Tenant RBAC Types
// ========================================================

export interface Company {
  id: string;
  legal_name: string;
  display_name: string;
  industry?: string;
  description?: string;
  location?: string;
  website?: string;
  contact_email?: string;
  status?: string;
  created_at?: string;
}

export interface TrainingInstitute {
  id: string;
  name: string;
  description?: string;
  location?: string;
  website?: string;
  contact_email?: string;
  status?: string;
  created_at?: string;
}

export interface EmployerProfileDetail {
  id: string;
  user_id: string;
  employer_id?: string;
  company_id?: string;
  company_name?: string;
  full_name?: string;
  email?: string;
  designation?: string;
  department?: string;
  verification_status?: string;
}

export interface CoachProfileDetail {
  id: string;
  user_id: string;
  training_institute_id?: string;
  institute_name?: string;
  full_name?: string;
  email?: string;
  designation?: string;
  specialization?: string;
  verification_status?: string;
}

export interface CourseDetail {
  id: string;
  code?: string;
  training_institute_id?: string;
  title: string;
  description?: string;
  category?: string;
  domain?: string;
  provider?: string;
  duration?: string;
  mode?: string;
  eligibility?: string;
  capacity?: number;
  status?: string;
  created_by?: string;
}

export interface Enrollment {
  id: string;
  training_institute_id: string;
  course_id: string;
  trainee_id: string;
  trainee_name?: string;
  course_title?: string;
  status: string;
  enrolled_at: string;
  completed_at?: string;
  progress_percent: number;
  grade_or_result?: string;
}

export interface JobApplication {
  id: string;
  job_id: string;
  job_title?: string;
  company_id?: string;
  company_name?: string;
  trainee_id: string;
  trainee_name?: string;
  status: string;
  applied_at?: string;
  cover_note?: string;
  match_score?: number;
}

export interface OrganizationAuditLog {
  id: string;
  actor_user_id: string;
  organization_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details?: Record<string, any>;
  timestamp: string;
}


