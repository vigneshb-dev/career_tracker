import { 
  Trainee, Skill, Job, Employer, SkillGapAnalysis, CareerPath, FollowUpItem, DashboardMetrics, PaginatedResponse,
  ConsentStatus, OutcomeRecord, FollowUpAuditRecord, Certification, AssessmentRecord,
  CompetencySkill, Course, Competency, Occupation, SkillNormalizationResult, CompetencyGraph, DomainSummary,
  JobExtractedSkill, JobSkillsBreakdown, JobAnalysisResult,
  TraineeSkillEvidenceItem, ScoringConfiguration, TraineeRadarProfile, SoftSkillScenarioData,
  WorkforceSkillGapSummary,
  InterventionItem, InterventionRecommendation, TraineeInterventionItem,
  StartInterventionPayload, UpdateInterventionProgressPayload, SubmitReassessmentPayload, ReassessmentResult,
  CareerTimelineData, PathwaySummaryData, CareerTimelineEventItem, LongitudinalFollowUpItem,
  CreateCareerEventPayload, CompleteLongitudinalFollowUpPayload,
  EmployerFeedbackVerification, EmployerVerificationCreatePayload, EvidenceHierarchySummary,
  PendingVerificationCandidate, ComprehensiveAnalyticsData
} from '../types';


import { 
  mockDashboardMetrics, mockTrainees, mockSkills, mockJobs, mockEmployers, 
  mockSkillGaps, mockCareerPaths, mockFollowUps 
} from './mockData';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// In-memory cache for dynamic mutations during frontend session
let localTrainees: Trainee[] = [...mockTrainees];
let localFollowUps: FollowUpItem[] = [...mockFollowUps];
let localJobs: Job[] = [...mockJobs];
let localEmployers: Employer[] = [...mockEmployers];
let localSkills: Skill[] = [...mockSkills];

async function fetchWithFallback<T>(endpoint: string, fallbackData: T, options?: RequestInit): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return fallbackData;
    }
    return await res.json();
  } catch {
    return fallbackData;
  }
}

export const api = {
  // Authentication
  async login(email: string, _password: string): Promise<{ token: string; user: { name: string; email: string; role: string } }> {
    return {
      token: 'jwt-skilltrace-session-token',
      user: {
        name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Administrator',
        email,
        role: 'Workforce Director'
      }
    };
  },

  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return fetchWithFallback<DashboardMetrics>('/analytics/dashboard', mockDashboardMetrics);
  },

  // Trainees List & Search
  async getTrainees(params?: { 
    search?: string; 
    status?: string; 
    program?: string;
    outcome_type?: string;
  }): Promise<Trainee[]> {
    let list = await fetchWithFallback<Trainee[]>('/trainees', localTrainees);
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(t => 
        (t.fullName || t.full_name || '').toLowerCase().includes(q) || 
        t.email.toLowerCase().includes(q) ||
        t.cohort.toLowerCase().includes(q) ||
        t.program.toLowerCase().includes(q) ||
        (t.currentRole || t.current_role || '').toLowerCase().includes(q) ||
        (t.currentEmployer || t.current_employer || '').toLowerCase().includes(q)
      );
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter(t => t.status === params.status);
    }
    if (params?.program && params.program !== 'all') {
      list = list.filter(t => t.program.toLowerCase().includes(params.program!.toLowerCase()));
    }
    if (params?.outcome_type && params.outcome_type !== 'all') {
      list = list.filter(t => (t.primary_outcome_type || 'employment') === params.outcome_type);
    }
    return list;
  },

  async getTraineesPaginated(params?: {
    search?: string;
    status?: string;
    program?: string;
    outcome_type?: string;
    consent_status?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Trainee>> {
    const page = params?.page || 1;
    const pageSize = params?.page_size || 6;
    
    // First try backend paginated endpoint
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params?.program && params.program !== 'all') queryParams.append('program', params.program);
    if (params?.outcome_type && params.outcome_type !== 'all') queryParams.append('outcome_type', params.outcome_type);
    queryParams.append('page', String(page));
    queryParams.append('page_size', String(pageSize));

    let allFiltered = await this.getTrainees(params);
    if (params?.consent_status && params.consent_status !== 'all') {
      allFiltered = allFiltered.filter(t => (t.consent_status?.consent_status || 'granted') === params.consent_status);
    }

    const total = allFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (page - 1) * pageSize;
    const items = allFiltered.slice(startIdx, startIdx + pageSize);

    const fallback: PaginatedResponse<Trainee> = {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };

    try {
      const res = await fetch(`${BASE_URL}/trainees/paginated/list?${queryParams.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }

    return fallback;
  },

  async getTraineeById(id: string): Promise<Trainee | null> {
    const fallback = localTrainees.find(t => t.id === id) || null;
    return fetchWithFallback<Trainee | null>(`/trainees/${id}`, fallback);
  },

  async createTrainee(data: Partial<Trainee>): Promise<Trainee> {
    const newTrainee: Trainee = {
      id: `TRN-2024-${String(localTrainees.length + 1).padStart(3, '0')}`,
      fullName: data.fullName || data.full_name || 'New Trainee',
      full_name: data.fullName || data.full_name || 'New Trainee',
      email: data.email || 'trainee@example.com',
      phone: data.phone || '+1 (555) 000-0000',
      avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      avatar_url: data.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      location: data.location || 'Austin, TX',
      bio: data.bio || 'Workforce cohort candidate enrolled in career trajectory tracking.',
      program: data.program || 'Full-Stack Software Engineering',
      cohort: data.cohort || 'Cohort 2024-C',
      status: data.status || 'in_training',
      primary_outcome_type: data.primary_outcome_type || 'employment',
      enrollmentDate: data.enrollmentDate || data.enrollment_date || new Date().toISOString().split('T')[0],
      graduationDate: data.graduationDate || data.graduation_date || '2024-12-31',
      overallScore: data.overallScore || 85,
      matchScore: data.matchScore || 80,
      skills: data.skills || [
        { skillId: 'sk-1', name: 'React.js', level: 'intermediate', verified: true, score: 80 },
        { skillId: 'sk-2', name: 'TypeScript', level: 'intermediate', verified: false, score: 75 }
      ],
      training_details: data.training_details || {
        provider_name: 'Austin Tech Institute of Technology',
        course_title: data.program || 'Full-Stack Software Engineering',
        accreditation: 'State Workforce Commission Accredited',
        modality: 'Hybrid',
        attendance_rate: '98.0%',
      },
      certifications: [],
      assessments: [],
      career_preference: {
        target_roles: ['Software Engineer', 'Frontend Developer'],
        preferred_workplace: 'Hybrid',
        preferred_locations: ['Austin, TX', 'Remote USA'],
        target_industries: ['Enterprise SaaS', 'HealthTech']
      },
      current_pathway: {
        title: 'Modern Full-Stack Web Architecture',
        current_stage: 'Enrolled Apprentice',
        progress_percent: 25,
        next_milestone: 'Midterm Capstone Defense'
      },
      outcome_history: [],
      follow_up_history: [],
      consent_status: {
        consent_status: 'granted',
        share_with_employers: true,
        share_with_funding_bodies: true,
        share_anonymized_research: true,
        share_public_portfolio: false,
        consent_date: new Date().toISOString().split('T')[0],
        expiry_date: '2026-12-31',
        version: 'v2.1'
      },
      notes: data.notes || 'Newly onboarded into workforce program.'
    };

    try {
      const res = await fetch(`${BASE_URL}/trainees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrainee)
      });
      if (res.ok) {
        const created = await res.json();
        localTrainees.unshift(created);
        return created;
      }
    } catch {
      // ignore
    }

    localTrainees.unshift(newTrainee);
    return newTrainee;
  },

  async updateTrainee(id: string, updates: Partial<Trainee>): Promise<Trainee | null> {
    const index = localTrainees.findIndex(t => t.id === id);
    if (index !== -1) {
      localTrainees[index] = { ...localTrainees[index], ...updates };
    }
    try {
      const res = await fetch(`${BASE_URL}/trainees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback to local
    }
    return localTrainees[index] || null;
  },

  async updateConsent(id: string, consent: Partial<ConsentStatus>): Promise<Trainee | null> {
    try {
      const res = await fetch(`${BASE_URL}/trainees/${id}/consent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consent)
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    const t = localTrainees.find(tr => tr.id === id);
    if (t) {
      t.consent_status = { ...(t.consent_status as any), ...consent };
    }
    return t || null;
  },

  async addOutcome(id: string, outcome: Partial<OutcomeRecord>): Promise<Trainee | null> {
    try {
      const res = await fetch(`${BASE_URL}/trainees/${id}/outcomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outcome)
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    const t = localTrainees.find(tr => tr.id === id);
    if (t) {
      const history = t.outcome_history || [];
      const item: any = {
        ...outcome,
        id: `OUT-${String(history.length + 1).padStart(3, '0')}`,
        created_at: new Date().toISOString().split('T')[0]
      };
      t.outcome_history = [item, ...history];
      if (outcome.is_current) {
        t.currentRole = outcome.role_or_course;
        t.current_role = outcome.role_or_course;
        t.currentEmployer = outcome.organization_or_venture;
        t.current_employer = outcome.organization_or_venture;
        t.primary_outcome_type = outcome.outcome_type;
        t.status = 'placed';
      }
    }
    return t || null;
  },

  async addFollowUp(id: string, followUp: Partial<FollowUpAuditRecord>): Promise<Trainee | null> {
    try {
      const res = await fetch(`${BASE_URL}/trainees/${id}/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followUp)
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    const t = localTrainees.find(tr => tr.id === id);
    if (t) {
      const history = t.follow_up_history || [];
      const item: any = {
        ...followUp,
        id: `AUD-${String(history.length + 1).padStart(3, '0')}`
      };
      t.follow_up_history = [...history, item];
      t.lastFollowUp = followUp.date;
      t.last_follow_up = followUp.date;
    }
    return t || null;
  },

  async addCertification(id: string, cert: Partial<Certification>): Promise<Trainee | null> {
    try {
      const res = await fetch(`${BASE_URL}/trainees/${id}/certifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cert)
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    const t = localTrainees.find(tr => tr.id === id);
    if (t) {
      const certs = t.certifications || [];
      t.certifications = [...certs, { ...cert, id: `CRT-${String(certs.length + 1).padStart(3, '0')}` } as any];
    }
    return t || null;
  },

  async addAssessment(id: string, assess: Partial<AssessmentRecord>): Promise<Trainee | null> {
    try {
      const res = await fetch(`${BASE_URL}/trainees/${id}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assess)
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    const t = localTrainees.find(tr => tr.id === id);
    if (t) {
      const assessments = t.assessments || [];
      t.assessments = [...assessments, { ...assess, id: `ASM-${String(assessments.length + 1).padStart(3, '0')}` } as any];
    }
    return t || null;
  },

  // Skills
  async getSkills(): Promise<Skill[]> {
    return fetchWithFallback<Skill[]>('/skills', localSkills);
  },

  // Jobs & AI Job Intelligence
  async getJobs(params?: {
    domain?: string;
    workplace?: string;
    search?: string;
    semantic_query?: string;
  }): Promise<Job[]> {
    const q = new URLSearchParams();
    if (params?.domain && params.domain !== 'all') q.append('domain', params.domain);
    if (params?.workplace && params.workplace !== 'all') q.append('workplace_type', params.workplace);
    if (params?.search) q.append('search', params.search);
    if (params?.semantic_query) q.append('semantic_query', params.semantic_query);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchWithFallback<Job[]>(`/jobs${qs}`, localJobs);
  },

  async getJobSkills(jobId: string): Promise<JobSkillsBreakdown | null> {
    try {
      const res = await fetch(`${BASE_URL}/jobs/${jobId}/skills`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return null;
  },

  async analyzeJob(payload: {
    description: string;
    title?: string;
    employer_name?: string;
    location?: string;
  }): Promise<JobAnalysisResult> {
    const res = await fetch(`${BASE_URL}/jobs/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error('Failed to analyze job description');
    }
    return await res.json();
  },

  async createJob(jobData: Partial<Job>): Promise<Job> {
    const res = await fetch(`${BASE_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData),
    });
    if (!res.ok) {
      throw new Error('Failed to create job');
    }
    const created = await res.json();
    localJobs.unshift(created);
    return created;
  },

  // Employers
  async getEmployers(): Promise<Employer[]> {
    return fetchWithFallback<Employer[]>('/employers', localEmployers);
  },

  // Skill Gaps
  async getSkillGaps(params?: {
    priority?: string;
    gap_type?: string;
    category?: string;
    trainee_id?: string;
  }): Promise<SkillGapAnalysis[]> {
    const q = new URLSearchParams();
    if (params?.priority && params.priority !== 'all') q.append('priority', params.priority);
    if (params?.gap_type && params.gap_type !== 'all') q.append('gap_type', params.gap_type);
    if (params?.category && params.category !== 'all') q.append('category', params.category);
    if (params?.trainee_id) q.append('trainee_id', params.trainee_id);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchWithFallback<SkillGapAnalysis[]>(`/skill-gaps${qs}`, mockSkillGaps);
  },

  async getSkillGapsSummary(): Promise<WorkforceSkillGapSummary> {
    const res = await fetch(`${BASE_URL}/skill-gaps/summary`);
    if (!res.ok) {
      throw new Error('Failed to fetch workforce skill gap summary');
    }
    return await res.json();
  },

  async getTraineeSkillGap(traineeId: string, targetOccupationId?: string): Promise<SkillGapAnalysis> {
    const qs = targetOccupationId ? `?target_occupation_id=${encodeURIComponent(targetOccupationId)}` : '';
    const res = await fetch(`${BASE_URL}/skill-gaps/trainees/${traineeId}${qs}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch skill gap analysis for trainee ${traineeId}`);
    }
    return await res.json();
  },

  async analyzeSkillGap(payload: {
    trainee_id: string;
    target_occupation_id?: string;
    target_employer?: string;
  }): Promise<SkillGapAnalysis> {
    const res = await fetch(`${BASE_URL}/skill-gaps/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error('Failed to run on-demand skill gap analysis');
    }
    return await res.json();
  },

  async batchSyncSkillGaps(): Promise<any> {
    const res = await fetch(`${BASE_URL}/skill-gaps/batch-sync`, {
      method: 'POST'
    });
    if (!res.ok) {
      throw new Error('Failed to batch sync skill gaps');
    }
    return await res.json();
  },

  // Career Paths
  async getCareerPaths(): Promise<CareerPath[]> {
    return fetchWithFallback<CareerPath[]>('/career-path', mockCareerPaths);
  },

  // Follow-ups
  async getFollowUps(): Promise<FollowUpItem[]> {
    return fetchWithFallback<FollowUpItem[]>('/follow-ups', localFollowUps);
  },

  async completeFollowUp(id: string, notes?: string): Promise<FollowUpItem | null> {
    const item = localFollowUps.find(f => f.id === id);
    if (item) {
      item.status = 'completed';
      if (notes) item.notes = notes;
    }
    return item || null;
  },

  // ========================================================
  // Competency Intelligence Methods
  // ========================================================
  async getCompetencyDomains(): Promise<DomainSummary[]> {
    return fetchWithFallback<DomainSummary[]>('/competency/domains', []);
  },

  async getCourses(domain?: string): Promise<Course[]> {
    const q = domain && domain !== 'all' ? `?domain=${encodeURIComponent(domain)}` : '';
    return fetchWithFallback<Course[]>(`/competency/courses${q}`, []);
  },

  async getCompetencies(domain?: string): Promise<Competency[]> {
    const q = domain && domain !== 'all' ? `?domain=${encodeURIComponent(domain)}` : '';
    return fetchWithFallback<Competency[]>(`/competency/competencies${q}`, []);
  },

  async getOccupations(domain?: string): Promise<Occupation[]> {
    const q = domain && domain !== 'all' ? `?domain=${encodeURIComponent(domain)}` : '';
    return fetchWithFallback<Occupation[]>(`/competency/occupations${q}`, []);
  },

  async getCompetencySkills(domain?: string, category?: string, search?: string): Promise<CompetencySkill[]> {
    const params = new URLSearchParams();
    if (domain && domain !== 'all') params.append('domain', domain);
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithFallback<CompetencySkill[]>(`/skills${qs}`, []);
  },

  async getSkillDetail(id: string): Promise<CompetencySkill | null> {
    return fetchWithFallback<CompetencySkill | null>(`/skills/${id}`, null);
  },

  async normalizeSkill(query: string): Promise<SkillNormalizationResult> {
    try {
      const res = await fetch(`${BASE_URL}/competency/normalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    // Simple client-side fallback if backend unreachable
    const isPy = query.toLowerCase().includes('python') || query.toLowerCase() === 'py';
    return {
      query,
      canonical_skill_id: isPy ? 'sk-6' : undefined,
      canonical_name: isPy ? 'Python' : undefined,
      matched_alias: isPy ? query : undefined,
      confidence: isPy ? 0.95 : 0.0,
      category: isPy ? 'hard' : undefined,
      domain: isPy ? 'Software Development' : undefined,
    };
  },

  async getCompetencyGraph(domain?: string): Promise<CompetencyGraph> {
    const q = domain && domain !== 'all' ? `?domain=${encodeURIComponent(domain)}` : '';
    return fetchWithFallback<CompetencyGraph>(`/competency/graph${q}`, { nodes: [], edges: [] });
  },

  // ========================================================
  // Trainee Skill Scoring Engine Methods
  // ========================================================
  async getScoringConfig(): Promise<ScoringConfiguration> {
    const fallback: ScoringConfiguration = {
      source_weights: {
        practical_project: 0.30,
        assessment: 0.25,
        trainer_evaluation: 0.20,
        certification: 0.15,
        employer_feedback: 0.10,
      },
      source_labels: {
        practical_project: 'Practical Capstone / Project',
        assessment: 'Standardized Assessment / SJT',
        trainer_evaluation: 'Trainer / Instructor Evaluation',
        certification: 'Industry Certification / Credential',
        employer_feedback: 'Employer / Internship Feedback',
      },
      min_score: 0.0,
      max_score: 5.0,
      recency_decay_enabled: true,
      formula_name: 'Multi-Source Bayesian Corroboration (Workforce Standard 2026)',
      description: 'Weights multiple verified evidence streams with time-decay and cross-source confidence boosts.'
    };
    return fetchWithFallback<ScoringConfiguration>('/skill-scoring/config', fallback);
  },

  async updateScoringConfig(weights: Record<string, number>): Promise<ScoringConfiguration> {
    const res = await fetch(`${BASE_URL}/skill-scoring/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_weights: weights }),
    });
    if (!res.ok) {
      throw new Error('Failed to update scoring configuration');
    }
    return await res.json();
  },

  async getTraineeRadarProfile(traineeId: string): Promise<TraineeRadarProfile | null> {
    try {
      const res = await fetch(`${BASE_URL}/skill-scoring/trainees/${traineeId}/radar`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return null;
  },

  async getTraineeEvidence(traineeId: string, skillId?: string): Promise<TraineeSkillEvidenceItem[]> {
    const q = skillId ? `?skill_id=${encodeURIComponent(skillId)}` : '';
    return fetchWithFallback<TraineeSkillEvidenceItem[]>(`/skill-scoring/trainees/${traineeId}/evidence${q}`, []);
  },

  async addSkillEvidence(
    traineeId: string,
    evidenceData: Partial<TraineeSkillEvidenceItem>
  ): Promise<TraineeSkillEvidenceItem> {
    const res = await fetch(`${BASE_URL}/skill-scoring/trainees/${traineeId}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...evidenceData,
        trainee_id: traineeId
      }),
    });
    if (!res.ok) {
      throw new Error('Failed to record skill evidence');
    }
    return await res.json();
  },

  async getSoftSkillScenarios(): Promise<SoftSkillScenarioData | null> {
    try {
      const res = await fetch(`${BASE_URL}/skill-scoring/soft-skills/scenarios`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return null;
  },

  async evaluateSoftSkills(submission: {
    trainee_id: string;
    answers: { question_id: string; selected_option_id: string }[];
    reviewer_name?: string;
  }): Promise<TraineeRadarProfile> {
    const res = await fetch(`${BASE_URL}/skill-scoring/soft-skills/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    });
    if (!res.ok) {
      throw new Error('Failed to submit soft-skill assessment');
    }
    return await res.json();
  },

  async recalculateTraineeSkills(traineeId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/skill-scoring/trainees/${traineeId}/recalculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error('Failed to recalculate trainee skills');
    }
    return await res.json();
  },

  // Gap-to-Intervention Engine API Endpoints
  async getInterventionsCatalogue(type?: string, domain?: string): Promise<InterventionItem[]> {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('type', type);
    if (domain && domain !== 'all') params.append('domain', domain);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchWithFallback<InterventionItem[]>(`/interventions/catalogue${query}`, []);
  },

  async getInterventionRecommendations(
    traineeId: string,
    gapSkillName: string,
    targetOccupationId?: string,
    limit: number = 5
  ): Promise<InterventionRecommendation[]> {
    const params = new URLSearchParams();
    params.append('trainee_id', traineeId);
    params.append('gap_skill_name', gapSkillName);
    if (targetOccupationId) params.append('target_occupation_id', targetOccupationId);
    params.append('limit', limit.toString());

    return fetchWithFallback<InterventionRecommendation[]>(
      `/interventions/recommendations?${params.toString()}`,
      []
    );
  },

  async getTraineeInterventions(traineeId: string): Promise<TraineeInterventionItem[]> {
    return fetchWithFallback<TraineeInterventionItem[]>(`/interventions/trainees/${traineeId}`, []);
  },

  async startIntervention(payload: StartInterventionPayload): Promise<TraineeInterventionItem> {
    const res = await fetch(`${BASE_URL}/interventions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to start intervention');
    }
    return await res.json();
  },

  async updateInterventionProgress(
    trackingId: string,
    payload: UpdateInterventionProgressPayload
  ): Promise<TraineeInterventionItem> {
    const res = await fetch(`${BASE_URL}/interventions/${trackingId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update intervention progress');
    }
    return await res.json();
  },

  async submitInterventionReassessment(
    trackingId: string,
    payload: SubmitReassessmentPayload
  ): Promise<ReassessmentResult> {
    const res = await fetch(`${BASE_URL}/interventions/${trackingId}/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit reassessment');
    }
    return await res.json();
  },

  // ========================================================
  // Career Progression & Longitudinal Outcome Tracking
  // ========================================================
  async getCareerTimeline(traineeId: string): Promise<CareerTimelineData | null> {
    try {
      const res = await fetch(`${BASE_URL}/career-path/trainees/${traineeId}/timeline`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return null;
  },

  async getPathwaysSummary(): Promise<PathwaySummaryData | null> {
    try {
      const res = await fetch(`${BASE_URL}/career-path/pathways/summary`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return null;
  },

  async recordCareerEvent(payload: CreateCareerEventPayload): Promise<CareerTimelineEventItem> {
    const res = await fetch(`${BASE_URL}/career-path/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to record career timeline event');
    }
    return await res.json();
  },

  async getLongitudinalFollowUps(params?: {
    trainee_id?: string;
    milestone_days?: number;
    status?: string;
    pathway?: string;
  }): Promise<LongitudinalFollowUpItem[]> {
    const q = new URLSearchParams();
    if (params?.trainee_id) q.append('trainee_id', params.trainee_id);
    if (params?.milestone_days) q.append('milestone_days', params.milestone_days.toString());
    if (params?.status && params.status !== 'all') q.append('status', params.status);
    if (params?.pathway && params.pathway !== 'all') q.append('pathway', params.pathway);
    const qs = q.toString() ? `?${q.toString()}` : '';

    return fetchWithFallback<LongitudinalFollowUpItem[]>(`/follow-ups/longitudinal${qs}`, []);
  },

  async completeLongitudinalFollowUp(
    id: string,
    payload: CompleteLongitudinalFollowUpPayload
  ): Promise<LongitudinalFollowUpItem> {
    const res = await fetch(`${BASE_URL}/follow-ups/longitudinal/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to complete longitudinal follow-up milestone');
    }
    return await res.json();
  },

  async scheduleLongitudinalMilestones(traineeId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/follow-ups/schedule-milestones/${traineeId}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to schedule milestones');
    }
    return await res.json();
  },

  async runAutomatedFollowUpSweep(): Promise<any> {
    const res = await fetch(`${BASE_URL}/follow-ups/run-automated-sweep`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to run automated follow-up sweep');
    }
    return await res.json();
  },

  // ========================================================
  // Employer Feedback, Verification & Evidence Levels API
  // ========================================================

  async getEmployerVerifications(params?: { employer_id?: string; trainee_id?: string }): Promise<EmployerFeedbackVerification[]> {
    const q = new URLSearchParams();
    if (params?.employer_id) q.append('employer_id', params.employer_id);
    if (params?.trainee_id) q.append('trainee_id', params.trainee_id);
    const qs = q.toString() ? `?${q.toString()}` : '';

    const fallback: EmployerFeedbackVerification[] = [
      {
        id: "EVF-2024-001",
        employer_id: "EMP-01",
        employer_name: "Apex Cloud Solutions",
        reviewer_name: "Sarah Jenkins",
        reviewer_role: "Director of Frontend Engineering",
        reviewer_email: "s.jenkins@apexcloud.io",
        trainee_id: "TRN-2024-001",
        trainee_name: "Elena Rostova",
        verification_status: "confirmed",
        confirmed_role: "Junior Frontend Engineer",
        confirmed_department: "Enterprise Cloud UI",
        employment_type: "Full-time",
        confirmed_start_date: "2024-06-01",
        salary_range: "$84,000 / yr",
        is_still_employed: true,
        retention_months: 6,
        skill_ratings: {
          "React.js": 4.8,
          "TypeScript": 4.5,
          "REST APIs": 4.6,
          "State Management": 4.4,
          "Git Version Control": 4.7
        },
        average_skill_score: 4.6,
        missing_technical_skills: [
          "CI/CD Pipeline Automation (GitHub Actions)",
          "Docker Containerization for Local Dev"
        ],
        missing_soft_skills: [
          "Cross-Functional Stakeholder Presentations"
        ],
        training_relevance_rating: 4.9,
        training_relevance_notes: "Elena transitioned into our enterprise frontend codebase with zero hand-holding. Exceptionally well prepared in modern React and TypeScript architecture.",
        curriculum_recommendations: "Incorporate 2 weeks of Docker and automated continuous integration so candidates are familiar with cloud build pipelines on day one.",
        would_hire_from_provider_again: true,
        evidence_level: "multi_source_verified",
        verified_artifacts: ["offer_letter_signed.pdf", "twc_wage_corroboration.pdf"],
        multi_source_corroboration: {
          sources: ["Employer Verification Portal", "TWC Wage Registry Corroboration", "Capstone Defense Grade"],
          confidence_score: 0.98,
          audit_timestamp: "2024-07-22T10:00:00"
        },
        submission_date: "2024-07-22"
      },
      {
        id: "EVF-2024-002",
        employer_id: "EMP-04",
        employer_name: "SunPower Grid Texas",
        reviewer_name: "Markus Sterling",
        reviewer_role: "Master Electrician & Apprenticeship Supervisor",
        reviewer_email: "m.sterling@sunpowergrid.com",
        trainee_id: "TRN-2024-004",
        trainee_name: "Carlos Rodriguez",
        verification_status: "confirmed",
        confirmed_role: "Solar Industrial Apprentice",
        confirmed_department: "Grid Infrastructure",
        employment_type: "Apprenticeship",
        confirmed_start_date: "2024-05-15",
        salary_range: "$32.00 / hr ($66,560 annualized)",
        is_still_employed: true,
        retention_months: 8,
        skill_ratings: {
          "Electrical Safety / OSHA 30": 5.0,
          "Photovoltaic Inverter Wiring": 4.7,
          "Circuit Diagnostics": 4.3,
          "Blueprint Reading": 4.5
        },
        average_skill_score: 4.63,
        missing_technical_skills: [
          "Medium-Voltage Transformer Coupling"
        ],
        missing_soft_skills: [
          "Field Service Tablet Documentation"
        ],
        training_relevance_rating: 4.8,
        training_relevance_notes: "Solid fundamental safety knowledge and practical hands-on proficiency with commercial solar array junction boxes.",
        curriculum_recommendations: "Add more practice hours with high-capacity battery storage systems (Tesla Megapack / Enphase).",
        would_hire_from_provider_again: true,
        evidence_level: "evidence_backed",
        verified_artifacts: ["apprenticeship_agreement_usdol.pdf", "osha_30_card_scan.pdf"],
        multi_source_corroboration: {
          sources: ["Employer Verification Portal", "USDOL Registered Apprenticeship Log"],
          confidence_score: 0.94,
          audit_timestamp: "2024-08-10T14:30:00"
        },
        submission_date: "2024-08-10"
      },
      {
        id: "EVF-2024-003",
        employer_id: "EMP-05",
        employer_name: "Austin Regional Clinic & Medical Center",
        reviewer_name: "Dr. Patricia Vance",
        reviewer_role: "Chief Medical Information Officer",
        reviewer_email: "pvance@austinregionalclinic.org",
        trainee_id: "TRN-2024-005",
        trainee_name: "Aisha Patel",
        verification_status: "confirmed",
        confirmed_role: "M.S. Health Informatics Research Fellow",
        confirmed_department: "Clinical Informatics",
        employment_type: "Fellowship",
        confirmed_start_date: "2024-08-01",
        salary_range: "$52,000 Academic Stipend + Tuition",
        is_still_employed: true,
        retention_months: 4,
        skill_ratings: {
          "EHR Data Extraction": 4.6,
          "HIPAA Compliance": 5.0,
          "SQL / Healthcare Queries": 4.4,
          "Clinical Terminologies (SNOMED/ICD)": 4.2
        },
        average_skill_score: 4.55,
        missing_technical_skills: [
          "HL7 / FHIR API Integration"
        ],
        missing_soft_skills: [
          "Interdisciplinary Physician Communication"
        ],
        training_relevance_rating: 4.7,
        training_relevance_notes: "Aisha demonstrates impeccable data governance and security compliance. A standout research fellow.",
        curriculum_recommendations: "Recommend adding practical Fast Healthcare Interoperability Resources (FHIR) API sandbox labs.",
        would_hire_from_provider_again: true,
        evidence_level: "employer_confirmed",
        verified_artifacts: ["fellowship_appointment_letter.pdf"],
        multi_source_corroboration: {
          sources: ["Employer Verification Portal"],
          confidence_score: 0.90,
          audit_timestamp: "2024-09-01T09:00:00"
        },
        submission_date: "2024-09-01"
      }
    ];

    return fetchWithFallback<EmployerFeedbackVerification[]>(`/employers/verifications${qs}`, fallback);
  },

  async submitEmployerVerification(payload: EmployerVerificationCreatePayload): Promise<EmployerFeedbackVerification> {
    const res = await fetch(`${BASE_URL}/employers/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit employer verification');
    }
    return await res.json();
  },

  async getEvidenceHierarchySummary(): Promise<EvidenceHierarchySummary> {
    const fallback: EvidenceHierarchySummary = {
      total_trainees: 7,
      self_reported_count: 1,
      self_reported_percent: 14.3,
      employer_confirmed_count: 1,
      employer_confirmed_percent: 14.3,
      evidence_backed_count: 3,
      evidence_backed_percent: 42.9,
      multi_source_verified_count: 2,
      multi_source_verified_percent: 28.6,
      evidence_levels: [
        {
          level_key: "self_reported",
          level_number: 1,
          label: "Self-Reported",
          description: "Unverified placement or skill metrics self-disclosed by candidate without independent attestation.",
          badge_color: "neutral",
          count: 1,
          percentage: 14.3
        },
        {
          level_key: "employer_confirmed",
          level_number: 2,
          label: "Employer-Confirmed",
          description: "Officially validated by hiring manager or direct employer portal confirmation with job title & date.",
          badge_color: "brand",
          count: 1,
          percentage: 14.3
        },
        {
          level_key: "evidence_backed",
          level_number: 3,
          label: "Evidence-Backed",
          description: "Corroborated by formal artifacts (signed offer letter, W-2 payroll record, DOL apprenticeship agreement).",
          badge_color: "purple",
          count: 3,
          percentage: 42.9
        },
        {
          level_key: "multi_source_verified",
          level_number: 4,
          label: "Multi-Source Verified",
          description: "Independently corroborated across 3+ distinct streams: Direct Employer + State Wage Registry + Capstone Defense.",
          badge_color: "success",
          count: 2,
          percentage: 28.6
        }
      ]
    };

    return fetchWithFallback<EvidenceHierarchySummary>('/employers/evidence-hierarchy', fallback);
  },

  async getPendingCandidatesForEmployer(employerId: string): Promise<PendingVerificationCandidate[]> {
    const fallback: PendingVerificationCandidate[] = [
      {
        trainee_id: "TRN-2024-001",
        trainee_name: "Elena Rostova",
        program: "Full-Stack Software Engineering",
        cohort: "Cohort 2024-A",
        status: "placed",
        current_role: "Junior Frontend Engineer",
        current_employer: "Apex Cloud Solutions",
        placement_salary: "$84,000 / yr",
        evidence_level: "multi_source_verified",
        is_direct_match: true,
        skills: ["React.js", "TypeScript", "REST APIs", "Git", "State Management"]
      },
      {
        trainee_id: "TRN-2024-004",
        trainee_name: "Carlos Rodriguez",
        program: "Commercial Clean Energy & Solar Systems",
        cohort: "Cohort 2024-A",
        status: "placed",
        current_role: "Solar Industrial Apprentice",
        current_employer: "SunPower Grid Texas",
        placement_salary: "$32.00 / hr ($66,560 annualized)",
        evidence_level: "evidence_backed",
        is_direct_match: true,
        skills: ["Electrical Safety / OSHA 30", "Photovoltaic Inverter Wiring", "Circuit Diagnostics"]
      },
      {
        trainee_id: "TRN-2024-005",
        trainee_name: "Aisha Patel",
        program: "Health Informatics & Data Analytics",
        cohort: "Cohort 2024-A",
        status: "placed",
        current_role: "M.S. Health Informatics Research Fellow",
        current_employer: "Austin Regional Clinic & Medical Center",
        placement_salary: "$52,000 Academic Stipend + Tuition",
        evidence_level: "employer_confirmed",
        is_direct_match: true,
        skills: ["EHR Data Extraction", "HIPAA Compliance", "SQL", "Clinical Terminologies"]
      },
      {
        trainee_id: "TRN-2024-007",
        trainee_name: "Jordan Miller",
        program: "Backend Systems & Cloud Engineering",
        cohort: "Cohort 2024-B",
        status: "in_training",
        current_role: "Cloud DevOps Intern",
        current_employer: "Apex Cloud Solutions",
        placement_salary: "$65,000 / yr",
        evidence_level: "self_reported",
        is_direct_match: true,
        skills: ["Python", "FastAPI", "Docker", "PostgreSQL", "Linux"]
      }
    ];

    return fetchWithFallback<PendingVerificationCandidate[]>(`/employers/${employerId}/pending-candidates`, fallback);
  },

  // ========================================================
  // Comprehensive Analytics API (10 Workforce Dimensions)
  // ========================================================

  async getComprehensiveAnalytics(): Promise<ComprehensiveAnalyticsData> {
    const fallback: ComprehensiveAnalyticsData = {
      summary_kpis: {
        total_enrolled: 1248,
        overall_placement_rate: 85.9,
        positive_outcome_rate: 89.6,
        longitudinal_retention_90d: 92.1,
        longitudinal_retention_365d: 84.8,
        average_wage_increase_pct: 130.7,
        average_skill_proficiency_gain: 3.1,
        active_employer_partners: 12,
        verified_outcomes_count: 3
      },
      employment_rate: {
        overall_rate: 85.9,
        salaried_employment_rate: 64.2,
        alternative_positive_pathways_rate: 25.4,
        positive_outcome_total_rate: 89.6,
        monthly_trends: [
          { month: "May", employment_rate: 81.2, target: 78.0, total_placed: 142, salaried: 98, entrepreneurial_or_freelance: 44 },
          { month: "Jun", employment_rate: 83.5, target: 80.0, total_placed: 168, salaried: 112, entrepreneurial_or_freelance: 56 },
          { month: "Jul", employment_rate: 84.8, target: 80.0, total_placed: 185, salaried: 120, entrepreneurial_or_freelance: 65 },
          { month: "Aug", employment_rate: 86.4, target: 82.0, total_placed: 204, salaried: 136, entrepreneurial_or_freelance: 68 },
          { month: "Sep", employment_rate: 88.2, target: 85.0, total_placed: 226, salaried: 152, entrepreneurial_or_freelance: 74 },
          { month: "Oct", employment_rate: 89.6, target: 85.0, total_placed: 247, salaried: 164, entrepreneurial_or_freelance: 83 }
        ],
        cohort_breakdown: [
          { cohort: "Cohort 2023-B", enrolled: 310, placed: 282, rate: 91.0, positive_outcomes: 282 },
          { cohort: "Cohort 2023-C", enrolled: 340, placed: 304, rate: 89.4, positive_outcomes: 304 },
          { cohort: "Cohort 2024-A", enrolled: 380, placed: 332, rate: 87.4, positive_outcomes: 332 },
          { cohort: "Cohort 2024-B", enrolled: 218, placed: 154, rate: 70.6, positive_outcomes: 182 }
        ]
      },
      retention: {
        average_90_day_retention: 92.1,
        average_365_day_retention: 84.8,
        milestone_curves: [
          { milestone: "Day 30", days: 30, retention_rate: 96.4, benchmark: 90.0, retained_count: 1033, audited_total: 1072 },
          { milestone: "Day 90", days: 90, retention_rate: 92.1, benchmark: 85.0, retained_count: 987, audited_total: 1072 },
          { milestone: "Day 180", days: 180, retention_rate: 88.5, benchmark: 80.0, retained_count: 948, audited_total: 1072 },
          { milestone: "Day 365", days: 365, retention_rate: 84.8, benchmark: 75.0, retained_count: 909, audited_total: 1072 }
        ],
        pathway_retention_comparison: [
          { pathway: "Salaried Employment", day_90: 94.2, day_180: 90.5, day_365: 87.0 },
          { pathway: "Registered Apprenticeship", day_90: 96.8, day_180: 93.2, day_365: 91.4 },
          { pathway: "Self-Employment & LLC", day_90: 89.5, day_180: 85.0, day_365: 81.2 },
          { pathway: "Independent Freelancing", day_90: 88.0, day_180: 84.1, day_365: 79.5 },
          { pathway: "Venture Entrepreneurship", day_90: 91.0, day_180: 87.4, day_365: 83.0 },
          { pathway: "Further Education/Research", day_90: 98.2, day_180: 96.0, day_365: 94.5 }
        ]
      },
      wage_progression: {
        average_pre_training_wage: "$38,400",
        average_placement_wage: "$72,500",
        average_one_year_wage: "$88,600",
        wage_gain_percentage: 130.7,
        progression_milestones: [
          { stage: "Pre-Training Baseline", avg_wage: 38400, label: "Intake Baseline" },
          { stage: "First Outcome Placement", avg_wage: 72500, label: "Graduation Hire ($+34.1k)" },
          { stage: "6-Month Retention", avg_wage: 78200, label: "Probationary Increase ($+39.8k)" },
          { stage: "1-Year Progression", avg_wage: 88600, label: "Annualized Promotion ($+50.2k)" },
          { stage: "2-Year Senior Tier", avg_wage: 104200, label: "Mid/Senior Benchmark ($+65.8k)" }
        ],
        pathway_wage_comparison: [
          { pathway: "Salaried Employment", starting_wage: 84000, one_year_wage: 94500, pct_gain: 12.5 },
          { pathway: "Registered Apprenticeship", starting_wage: 58240, one_year_wage: 74880, pct_gain: 28.6 },
          { pathway: "Self-Employment & LLC", starting_wage: 68000, one_year_wage: 86000, pct_gain: 26.5 },
          { pathway: "Independent Freelancing", starting_wage: 62400, one_year_wage: 81600, pct_gain: 30.8 },
          { pathway: "Venture Entrepreneurship", starting_wage: 45000, one_year_wage: 115000, pct_gain: 155.5 },
          { pathway: "Further Education/Research", starting_wage: 52000, one_year_wage: 68000, pct_gain: 30.8 }
        ]
      },
      skill_improvement: {
        overall_average_gain: 3.1,
        hard_skill_average_gain: 3.5,
        soft_skill_average_gain: 2.0,
        skills_benchmarks: [
          { skill: "React & Modern UI", intake_score: 1.4, graduation_score: 3.8, on_the_job_score: 4.5, net_delta: 3.1 },
          { skill: "TypeScript Architecture", intake_score: 0.8, graduation_score: 3.5, on_the_job_score: 4.3, net_delta: 3.5 },
          { skill: "Python / FastAPI", intake_score: 1.2, graduation_score: 4.0, on_the_job_score: 4.6, net_delta: 3.4 },
          { skill: "SQL & Data Pipelines", intake_score: 1.5, graduation_score: 3.9, on_the_job_score: 4.4, net_delta: 2.9 },
          { skill: "Electrical Safety & OSHA", intake_score: 0.5, graduation_score: 4.4, on_the_job_score: 4.9, net_delta: 4.4 },
          { skill: "Clinical Informatics & HIPAA", intake_score: 1.0, graduation_score: 4.2, on_the_job_score: 4.8, net_delta: 3.8 },
          { skill: "Team Communication", intake_score: 2.6, graduation_score: 3.9, on_the_job_score: 4.4, net_delta: 1.8 },
          { skill: "Problem Solving Under Sprints", intake_score: 2.2, graduation_score: 3.8, on_the_job_score: 4.3, net_delta: 2.1 }
        ]
      },
      skill_gaps: {
        top_technical_gaps: [
          { skill: "Docker & Container Workflows", severity: 4.4, employer_citations: 42, category: "technical", urgency: "High" },
          { skill: "CI/CD Deployment Pipelines", severity: 4.2, employer_citations: 38, category: "technical", urgency: "High" },
          { skill: "Medium-Voltage Battery Storage", severity: 3.9, employer_citations: 27, category: "technical", urgency: "Medium" },
          { skill: "FHIR / HL7 Interoperability", severity: 3.8, employer_citations: 24, category: "technical", urgency: "Medium" },
          { skill: "Automated Unit/E2E Testing (Playwright/Jest)", severity: 3.6, employer_citations: 22, category: "technical", urgency: "Medium" },
          { skill: "Cloud Infrastructure as Code (Terraform)", severity: 3.5, employer_citations: 19, category: "technical", urgency: "Low" }
        ],
        top_soft_gaps: [
          { skill: "Cross-Functional Stakeholder Communication", severity: 4.0, employer_citations: 35, category: "soft", urgency: "High" },
          { skill: "Time Estimation in Agile Sprints", severity: 3.8, employer_citations: 31, category: "soft", urgency: "High" },
          { skill: "Independent Troubleshooting Before Escalation", severity: 3.5, employer_citations: 25, category: "soft", urgency: "Medium" },
          { skill: "Technical Documentation & Runbooks", severity: 3.2, employer_citations: 18, category: "soft", urgency: "Medium" }
        ]
      },
      training_provider_outcomes: [
        {
          provider_name: "Austin Tech Institute of Technology",
          enrolled: 480,
          graduated: 456,
          placed: 412,
          placement_rate: 90.4,
          average_salary: "$85,200",
          employer_satisfaction: 4.8,
          top_domains: "Full-Stack Software, Cloud DevOps"
        },
        {
          provider_name: "Capital Trades & Energy Academy",
          enrolled: 320,
          graduated: 308,
          placed: 294,
          placement_rate: 95.5,
          average_salary: "$68,400",
          employer_satisfaction: 4.9,
          top_domains: "Commercial Solar, Industrial Electrical"
        },
        {
          provider_name: "Lone Star Digital Analytics Institute",
          enrolled: 260,
          graduated: 242,
          placed: 218,
          placement_rate: 90.1,
          average_salary: "$81,000",
          employer_satisfaction: 4.7,
          top_domains: "Data Science, Business Intelligence"
        },
        {
          provider_name: "UT Health Sciences Workforce Initiative",
          enrolled: 188,
          graduated: 178,
          placed: 148,
          placement_rate: 83.1,
          average_salary: "$74,500",
          employer_satisfaction: 4.8,
          top_domains: "Health Informatics, Clinical Data"
        }
      ],
      course_outcomes: [
        {
          course_code: "CS-101",
          course_title: "Full-Stack Enterprise React & Cloud Web Services",
          provider: "Austin Tech Institute of Technology",
          enrolled: 280,
          placement_rate: 91.4,
          avg_salary: "$86,500",
          skill_gain: "+3.3",
          retention_365d: 88.2
        },
        {
          course_code: "DEV-201",
          course_title: "Backend Engineering & FastAPI Cloud Architecture",
          provider: "Austin Tech Institute of Technology",
          enrolled: 200,
          placement_rate: 89.0,
          avg_salary: "$88,000",
          skill_gain: "+3.4",
          retention_365d: 87.5
        },
        {
          course_code: "ELEC-301",
          course_title: "Commercial Photovoltaic & Industrial Electrical Trades",
          provider: "Capital Trades & Energy Academy",
          enrolled: 320,
          placement_rate: 95.5,
          avg_salary: "$68,400",
          skill_gain: "+4.2",
          retention_365d: 92.4
        },
        {
          course_code: "DATA-101",
          course_title: "Applied Data Pipelines & Predictive Analytics",
          provider: "Lone Star Digital Analytics Institute",
          enrolled: 260,
          placement_rate: 90.1,
          avg_salary: "$81,000",
          skill_gain: "+2.9",
          retention_365d: 84.0
        },
        {
          course_code: "HLTH-101",
          course_title: "Clinical EHR & Health Data Informatics",
          provider: "UT Health Sciences Workforce Initiative",
          enrolled: 188,
          placement_rate: 83.1,
          avg_salary: "$74,500",
          skill_gain: "+3.6",
          retention_365d: 94.0
        }
      ],
      district_trends: [
        {
          district: "Travis County Central",
          trainees_count: 420,
          placed_count: 382,
          employment_rate: 90.9,
          top_sector: "Enterprise Software & AI",
          avg_wage: "$87,400"
        },
        {
          district: "North Austin Tech Hub",
          trainees_count: 310,
          placed_count: 284,
          employment_rate: 91.6,
          top_sector: "Semiconductors & Cloud Services",
          avg_wage: "$89,800"
        },
        {
          district: "South Metro Corridor",
          trainees_count: 240,
          placed_count: 218,
          employment_rate: 90.8,
          top_sector: "Clean Energy & Electrical Trades",
          avg_wage: "$71,200"
        },
        {
          district: "Williamson Innovation District",
          trainees_count: 180,
          placed_count: 156,
          employment_rate: 86.7,
          top_sector: "Advanced Manufacturing & Robotics",
          avg_wage: "$78,500"
        },
        {
          district: "East Industrial Belt",
          trainees_count: 98,
          placed_count: 82,
          employment_rate: 83.7,
          top_sector: "Logistics & Solar Infrastructure",
          avg_wage: "$65,000"
        }
      ],
      occupation_demand: [
        {
          occupation: "Full-Stack Web Developers",
          market_demand_index: 94,
          open_jobs: 420,
          pipeline_supply: 280,
          supply_gap: -140,
          growth_rate: "+18% YoY"
        },
        {
          occupation: "Solar Photovoltaic Electricians",
          market_demand_index: 92,
          open_jobs: 380,
          pipeline_supply: 320,
          supply_gap: -60,
          growth_rate: "+24% YoY"
        },
        {
          occupation: "Cloud Infrastructure & DevOps",
          market_demand_index: 88,
          open_jobs: 310,
          pipeline_supply: 200,
          supply_gap: -110,
          growth_rate: "+21% YoY"
        },
        {
          occupation: "Health Data & Informatics Analysts",
          market_demand_index: 82,
          open_jobs: 240,
          pipeline_supply: 188,
          supply_gap: -52,
          growth_rate: "+15% YoY"
        },
        {
          occupation: "Business Intelligence & SQL Analysts",
          market_demand_index: 78,
          open_jobs: 260,
          pipeline_supply: 260,
          supply_gap: 0,
          growth_rate: "+12% YoY"
        }
      ],
      non_placement_reasons: [
        {
          reason: "Lack of Hands-On Project Experience",
          category: "Curriculum & Portfolio",
          count: 48,
          percentage: 27.3,
          recommended_intervention: "Assign 2-week structured capstone with employer mentor"
        },
        {
          reason: "Transportation & Commute Barriers",
          category: "Socioeconomic Support",
          count: 36,
          percentage: 20.5,
          recommended_intervention: "Provide municipal transit vouchers or prioritize hybrid roles"
        },
        {
          reason: "Wage Expectation Discrepancy",
          category: "Candidate Alignment",
          count: 28,
          percentage: 15.9,
          recommended_intervention: "Conduct labor market wage calibration counseling"
        },
        {
          reason: "State Licensure / Exam Pending",
          category: "Credentialing",
          count: 24,
          percentage: 13.6,
          recommended_intervention: "Schedule funded journeyperson/certification voucher retake"
        },
        {
          reason: "Contact Unreachable / Disconnected",
          category: "Outcome Unknown Triage",
          count: 22,
          percentage: 12.5,
          recommended_intervention: "Escalate to Level 3 Triage & State Wage Registry matching"
        },
        {
          reason: "Family / Caregiving Obligations",
          category: "Socioeconomic Support",
          count: 18,
          percentage: 10.2,
          recommended_intervention: "Connect with workforce partner childcare subsidy programs"
        }
      ]
    };

    return fetchWithFallback<ComprehensiveAnalyticsData>('/analytics/comprehensive', fallback);
  }
};


