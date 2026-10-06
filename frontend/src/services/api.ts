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
  PendingVerificationCandidate, ComprehensiveAnalyticsData,
  ResumeAnalysisResult, ResumeInfoResponse, UnifiedSkillProfile,
  TrainingRecord, PassportEvent, TraineePassportData, TraineeProfileUpdatePayload,
  TrainingRecordCreatePayload, CareerGoalsUpdatePayload, SkillAddPayload,
  FollowUpResponsePayload, OutcomeVerifyPayload,
  LongitudinalMetricsData, DataQualityDashboardData, TraineeOutcomeRecord, CohortFilterOptionsData, CohortFilterParams,
  DigitalTwinStateData, DigitalTwinTimelineResponse, DigitalTwinSkillEvolutionStage, DigitalTwinOutcomeMilestone,
  DigitalTwinEvidenceItem, DigitalTwinDataQualityResponse,
  SimulatorOptions, ScenarioInput, SimulationResponse, OutcomeRiskItem, OutcomeRiskSummary,
  TraineeSkillGapResponse, CourseSkillAnalysisResponse, TopSkillGapsResponse,
  EmergingSkillsResponse, JobSkillDemandResponse, OutcomeReasonItem,
  OutcomeReasonBreakdownResponse, OutcomeSummaryAnalyticsResponse,
  FollowUpGenerationResponse, FollowUpResponseSubmission,
  Company, TrainingInstitute, EmployerProfileDetail, CoachProfileDetail,
  CourseDetail, Enrollment, JobApplication, OrganizationAuditLog
} from '../types';
import { AuthUser, AuthResponse, SignupPayload } from '../types/auth';


import { 
  mockDashboardMetrics, mockTrainees, mockSkills, mockJobs, mockEmployers, 
  mockSkillGaps, mockCareerPaths, mockFollowUps 
} from './mockData';

const rawBaseUrl = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
const BASE_URL = rawBaseUrl.endsWith('/api')
  ? rawBaseUrl
  : (rawBaseUrl.startsWith('http') ? `${rawBaseUrl}/api` : rawBaseUrl);

export async function safeJson<T = any>(res: Response, fallback?: T): Promise<T> {
  const text = await res.text();
  if (!text || !text.trim()) {
    return (fallback !== undefined ? fallback : {}) as T;
  }
  try {
    return JSON.parse(text);
  } catch {
    if (!res.ok) {
      throw new Error(`Server returned error (${res.status}): ${text.slice(0, 150)}`);
    }
    return (fallback !== undefined ? fallback : {}) as T;
  }
}

export function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('skilltrace_auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// In-memory cache for dynamic mutations during frontend session
let localTrainees: Trainee[] = [...mockTrainees];
let localFollowUps: FollowUpItem[] = [...mockFollowUps];
let localJobs: Job[] = [...mockJobs];
let localEmployers: Employer[] = [...mockEmployers];
let localSkills: Skill[] = [...mockSkills];

function toQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

async function fetchWithFallback<T>(endpoint: string, fallbackData: T, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...(options?.headers || {}),
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (IS_DEMO_MODE) {
        return fallbackData;
      }
      const err: any = await safeJson(res, { detail: `Request to ${endpoint} failed with status ${res.status}` });
      const error: any = new Error(err.detail || err.message || `Request to ${endpoint} failed with status ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return await safeJson<T>(res, fallbackData);
  } catch (error) {
    clearTimeout(timeoutId);
    if (IS_DEMO_MODE) {
      return fallbackData;
    }
    throw error;
  }
}

// ========================================================
// Organization & Multi-Tenant RBAC Services
// ========================================================
export const organizationApi = {
  // Companies
  async getCompanies(): Promise<Company[]> {
    return fetchWithFallback<Company[]>('/companies', []);
  },

  async getCompany(companyId: string): Promise<Company> {
    const res = await fetch(`${BASE_URL}/companies/${encodeURIComponent(companyId)}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`Failed to load company ${companyId}`);
    return await res.json();
  },

  async updateCompany(companyId: string, payload: Partial<Company>): Promise<Company> {
    const res = await fetch(`${BASE_URL}/companies/${encodeURIComponent(companyId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update company');
    return await res.json();
  },

  async getCompanyEmployers(companyId: string): Promise<EmployerProfileDetail[]> {
    return fetchWithFallback<EmployerProfileDetail[]>(`/companies/${encodeURIComponent(companyId)}/employers`, []);
  },

  async getCompanyJobs(companyId: string): Promise<Job[]> {
    return fetchWithFallback<Job[]>(`/companies/${encodeURIComponent(companyId)}/jobs`, []);
  },

  async createCompanyJob(companyId: string, jobData: Partial<Job>): Promise<Job> {
    const res = await fetch(`${BASE_URL}/companies/${encodeURIComponent(companyId)}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(jobData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create company job');
    }
    return await res.json();
  },

  async getCompanyApplications(companyId: string): Promise<JobApplication[]> {
    return fetchWithFallback<JobApplication[]>(`/companies/${encodeURIComponent(companyId)}/applications`, []);
  },

  async getCompanyAuditLogs(companyId: string): Promise<OrganizationAuditLog[]> {
    return fetchWithFallback<OrganizationAuditLog[]>(`/companies/${encodeURIComponent(companyId)}/audit-logs`, []);
  },

  // Training Institutes
  async getTrainingInstitutes(): Promise<TrainingInstitute[]> {
    return fetchWithFallback<TrainingInstitute[]>('/training-institutes', []);
  },

  async getTrainingInstitute(instituteId: string): Promise<TrainingInstitute> {
    const res = await fetch(`${BASE_URL}/training-institutes/${encodeURIComponent(instituteId)}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`Failed to load training institute ${instituteId}`);
    return await res.json();
  },

  async updateTrainingInstitute(instituteId: string, payload: Partial<TrainingInstitute>): Promise<TrainingInstitute> {
    const res = await fetch(`${BASE_URL}/training-institutes/${encodeURIComponent(instituteId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update training institute');
    return await res.json();
  },

  async getInstituteCoaches(instituteId: string): Promise<CoachProfileDetail[]> {
    return fetchWithFallback<CoachProfileDetail[]>(`/training-institutes/${encodeURIComponent(instituteId)}/coaches`, []);
  },

  async getInstituteCourses(instituteId: string): Promise<CourseDetail[]> {
    return fetchWithFallback<CourseDetail[]>(`/training-institutes/${encodeURIComponent(instituteId)}/courses`, []);
  },

  async createInstituteCourse(instituteId: string, courseData: Partial<CourseDetail>): Promise<CourseDetail> {
    const res = await fetch(`${BASE_URL}/training-institutes/${encodeURIComponent(instituteId)}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(courseData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create institute course');
    }
    return await res.json();
  },

  async getInstituteTrainees(instituteId: string): Promise<Enrollment[]> {
    return fetchWithFallback<Enrollment[]>(`/training-institutes/${encodeURIComponent(instituteId)}/trainees`, []);
  },

  async getInstituteAuditLogs(instituteId: string): Promise<OrganizationAuditLog[]> {
    return fetchWithFallback<OrganizationAuditLog[]>(`/training-institutes/${encodeURIComponent(instituteId)}/audit-logs`, []);
  },

  // Courses & Assessments
  async getCourses(): Promise<CourseDetail[]> {
    return fetchWithFallback<CourseDetail[]>('/courses', []);
  },

  async getCourse(courseId: string): Promise<CourseDetail> {
    const res = await fetch(`${BASE_URL}/courses/${encodeURIComponent(courseId)}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error(`Failed to load course ${courseId}`);
    return await res.json();
  },

  async updateCourse(courseId: string, payload: Partial<CourseDetail>): Promise<CourseDetail> {
    const res = await fetch(`${BASE_URL}/courses/${encodeURIComponent(courseId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update course');
    return await res.json();
  },

  async archiveCourse(courseId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/courses/${encodeURIComponent(courseId)}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to archive course');
    return await res.json();
  },

  async getCourseEnrollments(courseId: string): Promise<Enrollment[]> {
    return fetchWithFallback<Enrollment[]>(`/courses/${encodeURIComponent(courseId)}/enrollments`, []);
  },

  async enrollTraineeInCourse(courseId: string, traineeId: string): Promise<Enrollment> {
    const res = await fetch(`${BASE_URL}/courses/${encodeURIComponent(courseId)}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ trainee_id: traineeId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to enroll trainee');
    }
    return await res.json();
  },

  async assessTraineeInCourse(courseId: string, payload: {
    trainee_id: string;
    skill_name: string;
    score: number;
    evaluation_type?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; evidence_id: string }> {
    const res = await fetch(`${BASE_URL}/courses/${encodeURIComponent(courseId)}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to assess trainee');
    }
    return await res.json();
  },

  async completeCourseForTrainee(courseId: string, payload: {
    trainee_id: string;
    grade_or_result?: string;
    certificate_url?: string;
    notes?: string;
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/courses/${encodeURIComponent(courseId)}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to mark course completion');
    }
    return await res.json();
  },

  // Jobs RBAC
  async updateJob(jobId: string, payload: Partial<Job>): Promise<Job> {
    const res = await fetch(`${BASE_URL}/jobs/${encodeURIComponent(jobId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update job');
    }
    return await res.json();
  },

  async archiveJob(jobId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/jobs/${encodeURIComponent(jobId)}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to archive job');
    return await res.json();
  },

  async getJobApplications(jobId: string): Promise<JobApplication[]> {
    return fetchWithFallback<JobApplication[]>(`/jobs/${encodeURIComponent(jobId)}/applications`, []);
  },

  async applyToJob(jobId: string, payload: { trainee_id?: string; cover_note?: string }): Promise<JobApplication> {
    const res = await fetch(`${BASE_URL}/jobs/${encodeURIComponent(jobId)}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to apply to job');
    }
    return await res.json();
  }
};

export const api = {
  ...organizationApi,
  // Authentication & RBAC API
  async signup(payload: SignupPayload): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to sign up.' }));
      throw new Error(err.detail || 'Failed to sign up.');
    }
    return await res.json();
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invalid credentials.' }));
      throw new Error(err.detail || 'Invalid email or password.');
    }
    return await res.json();
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Verification failed.' }));
      throw new Error(err.detail || 'Invalid or expired OTP code.');
    }
    return await res.json();
  },

  async resendOtp(email: string): Promise<{ message: string; demo_otp?: string }> {
    const res = await fetch(`${BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to resend OTP.' }));
      throw new Error(err.detail || 'Failed to resend OTP.');
    }
    return await res.json();
  },

  async forgotPassword(email: string): Promise<{ message: string; demo_otp?: string }> {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to process request.' }));
      throw new Error(err.detail || 'Failed to process password reset.');
    }
    return await res.json();
  },

  async resetPassword(email: string, otp: string, new_password: string): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, new_password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to reset password.' }));
      throw new Error(err.detail || 'Failed to reset password.');
    }
    return await res.json();
  },

  async getMe(): Promise<AuthUser> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      throw new Error('Unauthorized');
    }
    return await res.json();
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
    } catch {
      // Ignore network errors on logout
    }
  },

  async uploadAndAnalyzeResume(traineeId: string, file: File): Promise<{
    message: string;
    filename: string;
    resume_url: string;
    extracted_skills: string[];
    analysis_id?: string;
    completeness_score?: number;
    completeness_label?: string;
    completeness_breakdown?: any;
    skills_profile?: any[];
    extracted_metadata?: any;
    job_matches?: any[];
    skill_gaps?: any[];
    recommendations?: any[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('skilltrace_auth_token');
    const res = await fetch(`${BASE_URL}/trainees/${traineeId}/resume/analyze`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload and analyze resume.' }));
      const error: any = new Error(err.detail || 'Failed to upload and analyze resume.');
      error.status = res.status;
      throw error;
    }
    return await res.json();
  },

  // Backward-compatibility wrappers delegating to canonical uploadAndAnalyzeResume
  uploadResume(traineeId: string, file: File) {
    return this.uploadAndAnalyzeResume(traineeId, file);
  },

  analyzeResume(traineeId: string, file: File): Promise<ResumeAnalysisResult> {
    return this.uploadAndAnalyzeResume(traineeId, file) as unknown as Promise<ResumeAnalysisResult>;
  },

  async reanalyzeResume(traineeId: string): Promise<ResumeAnalysisResult> {
    const res = await fetch(`${BASE_URL}/trainees/${traineeId}/resume/reanalyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      // Compatibility fallback to legacy endpoint if required
      const fallbackRes = await fetch(`${BASE_URL}/trainees/${traineeId}/reanalyze-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      if (!fallbackRes.ok) {
        const err = await fallbackRes.json().catch(() => ({ detail: 'Failed to re-analyze resume.' }));
        const error: any = new Error(err.detail || 'Failed to re-analyze resume.');
        error.status = fallbackRes.status;
        throw error;
      }
      return await fallbackRes.json();
    }
    return await res.json();
  },

  async getResumeInfo(traineeId: string): Promise<ResumeInfoResponse> {
    const res = await fetch(`${BASE_URL}/trainees/${traineeId}/resume`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      if (res.status === 404 || IS_DEMO_MODE) {
        return { has_resume: false, extracted_skills: [] };
      }
      const err = await res.json().catch(() => ({ detail: 'Failed to get resume info' }));
      const error: any = new Error(err.detail || 'Failed to get resume info');
      error.status = res.status;
      throw error;
    }
    return await res.json();
  },

  async getLatestResumeAnalysis(traineeId: string): Promise<{ has_analysis: boolean; analysis: ResumeAnalysisResult | null }> {
    const res = await fetch(`${BASE_URL}/trainees/${traineeId}/latest-resume-analysis`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      if (res.status === 404 || IS_DEMO_MODE) {
        return { has_analysis: false, analysis: null };
      }
      const err = await res.json().catch(() => ({ detail: 'Failed to get latest resume analysis' }));
      const error: any = new Error(err.detail || 'Failed to get latest resume analysis');
      error.status = res.status;
      throw error;
    }
    return await res.json();
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
      const res = await fetch(`${BASE_URL}/trainees/paginated/list?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      if (res.ok) {
        return await res.json();
      }
      if (!IS_DEMO_MODE) {
        const err = await res.json().catch(() => ({ detail: `Failed to fetch paginated trainees: ${res.status}` }));
        const error: any = new Error(err.detail || `Failed to fetch paginated trainees: ${res.status}`);
        error.status = res.status;
        throw error;
      }
    } catch (e) {
      if (!IS_DEMO_MODE) throw e;
    }

    return fallback;
  },

  async getTraineeById(id: string): Promise<Trainee | null> {
    const fallback = (id === 'me' ? localTrainees[0] : localTrainees.find(t => t.id === id)) || null;
    return fetchWithFallback<Trainee | null>(`/trainees/${id}`, fallback);
  },

  async createTrainee(data: Partial<Trainee>): Promise<Trainee> {
    const newTrainee: Trainee = {
      id: `TRN-2024-${String(localTrainees.length + 1).padStart(3, '0')}`,
      fullName: data.fullName || data.full_name || 'New Trainee',
      full_name: data.fullName || data.full_name || 'New Trainee',
      email: data.email || 'trainee@example.com',
      phone: data.phone || '+91 98765 43210',
      avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      avatar_url: data.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      location: data.location || 'Bengaluru, KA',
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
        provider_name: 'Bengaluru Institute of Technology & Advanced Skills',
        course_title: data.program || 'Full-Stack Software Engineering',
        accreditation: 'National Skill Development Corporation (NSDC) Accredited',
        modality: 'Hybrid',
        attendance_rate: '98.0%',
      },
      certifications: [],
      assessments: [],
      career_preference: {
        target_roles: ['Software Engineer', 'Frontend Developer'],
        preferred_workplace: 'Hybrid',
        preferred_locations: ['Bengaluru, KA', 'Remote India'],
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
      if (!IS_DEMO_MODE) {
        const err = await res.json().catch(() => ({ detail: 'Failed to create trainee' }));
        const error: any = new Error(err.detail || 'Failed to create trainee');
        error.status = res.status;
        throw error;
      }
    } catch (e) {
      if (!IS_DEMO_MODE) throw e;
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
      if (!IS_DEMO_MODE) {
        const err = await res.json().catch(() => ({ detail: 'Failed to update trainee' }));
        const error: any = new Error(err.detail || 'Failed to update trainee');
        error.status = res.status;
        throw error;
      }
    } catch (e) {
      if (!IS_DEMO_MODE) throw e;
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
      if (!IS_DEMO_MODE) {
        const err = await res.json().catch(() => ({ detail: 'Failed to update consent' }));
        const error: any = new Error(err.detail || 'Failed to update consent');
        error.status = res.status;
        throw error;
      }
    } catch (e) {
      if (!IS_DEMO_MODE) throw e;
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
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(outcome)
      });
      if (res.ok) return await res.json();
      if (!IS_DEMO_MODE) {
        const err = await res.json().catch(() => ({ detail: 'Failed to add outcome' }));
        const error: any = new Error(err.detail || 'Failed to add outcome');
        error.status = res.status;
        throw error;
      }
    } catch (e) {
      if (!IS_DEMO_MODE) throw e;
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
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(followUp)
      });
      if (res.ok) return await res.json();
      if (!IS_DEMO_MODE) {
        const err = await res.json().catch(() => ({ detail: 'Failed to add follow-up' }));
        const error: any = new Error(err.detail || 'Failed to add follow-up');
        error.status = res.status;
        throw error;
      }
    } catch (e) {
      if (!IS_DEMO_MODE) throw e;
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
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(cert)
      });
      if (res.ok) return await res.json();
      if (!IS_DEMO_MODE) {
        const err = await res.json().catch(() => ({ detail: 'Failed to add certification' }));
        const error: any = new Error(err.detail || 'Failed to add certification');
        error.status = res.status;
        throw error;
      }
    } catch (e) {
      if (!IS_DEMO_MODE) throw e;
    }
    const t = localTrainees.find(tr => tr.id === id);
    if (t) {
      const certs = t.certifications || [];
      t.certifications = [...certs, { ...cert, id: `CRT-${String(certs.length + 1).padStart(3, '0')}` } as any];
    }
    return t || null;
  },

  async verifyTraineeCertification(id: string, certId: string, status: 'verified' | 'rejected', notes?: string): Promise<Trainee> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/certifications/${certId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        verification_status: status,
        verification_notes: notes,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to verify certification' }));
      throw new Error(err.detail || 'Failed to verify certification');
    }
    return await res.json();
  },

  async addAssessment(id: string, assess: Partial<AssessmentRecord>): Promise<Trainee | null> {
    try {
      const res = await fetch(`${BASE_URL}/trainees/${id}/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(assess)
      });
      if (res.ok) return await res.json();
      if (!IS_DEMO_MODE) {
        const err = await res.json().catch(() => ({ detail: 'Failed to add assessment' }));
        const error: any = new Error(err.detail || 'Failed to add assessment');
        error.status = res.status;
        throw error;
      }
    } catch (e) {
      if (!IS_DEMO_MODE) throw e;
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
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
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
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
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
    const res = await fetch(`${BASE_URL}/skill-gaps/summary`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      throw new Error('Failed to fetch workforce skill gap summary');
    }
    return await res.json();
  },

  async getTraineeSkillGapAnalysis(
    traineeId: string,
    targetOccupationId?: string,
    targetJobId?: string
  ): Promise<SkillGapAnalysis> {
    const params = new URLSearchParams();
    if (targetOccupationId) params.append('target_occupation_id', targetOccupationId);
    if (targetJobId) params.append('target_job_id', targetJobId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${BASE_URL}/skill-gaps/trainees/${traineeId}${qs}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch skill gap analysis for trainee ${traineeId}`);
    }
    return await res.json();
  },

  // Backward-compatibility alias delegating to canonical getTraineeSkillGapAnalysis
  async getTraineeSkillGap(
    traineeId: string,
    targetOccupationId?: string,
    targetJobId?: string
  ): Promise<SkillGapAnalysis> {
    return this.getTraineeSkillGapAnalysis(traineeId, targetOccupationId, targetJobId);
  },

  async analyzeSkillGap(payload: {
    trainee_id: string;
    target_occupation_id?: string;
    target_job_id?: string;
    target_employer?: string;
  }): Promise<SkillGapAnalysis> {
    const res = await fetch(`${BASE_URL}/skill-gaps/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error('Failed to run on-demand skill gap analysis');
    }
    return await res.json();
  },

  async getUnifiedSkillProfile(traineeId: string): Promise<UnifiedSkillProfile> {
    const res = await fetch(`${BASE_URL}/skill-scoring/trainees/${traineeId}/unified-profile`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch unified skill profile for trainee ${traineeId}`);
    }
    return await res.json();
  },

  async batchSyncSkillGaps(): Promise<any> {
    const res = await fetch(`${BASE_URL}/skill-gaps/batch-sync`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
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
    try {
      const res = await fetch(`${BASE_URL}/follow-ups/${id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        return await res.json();
      }
      if (!IS_DEMO_MODE) {
        const err = await res.json().catch(() => ({ detail: 'Failed to complete follow-up' }));
        const error: any = new Error(err.detail || 'Failed to complete follow-up');
        error.status = res.status;
        throw error;
      }
    } catch (e: any) {
      if (!IS_DEMO_MODE) {
        throw e;
      }
    }
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ source_weights: weights }),
    });
    if (!res.ok) {
      throw new Error('Failed to update scoring configuration');
    }
    return await res.json();
  },

  async getTraineeRadarProfile(traineeId: string): Promise<TraineeRadarProfile | null> {
    try {
      const res = await fetch(`${BASE_URL}/skill-scoring/trainees/${traineeId}/radar`, {
        headers: { ...getAuthHeader() }
      });
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      const res = await fetch(`${BASE_URL}/skill-scoring/soft-skills/scenarios`, {
        headers: { ...getAuthHeader() }
      });
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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

  async startSkillGapIntervention(payload: StartInterventionPayload): Promise<TraineeInterventionItem> {
    const res = await fetch(`${BASE_URL}/interventions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to start intervention');
    }
    return await res.json();
  },

  // Backward-compatibility alias delegating to canonical startSkillGapIntervention
  async startIntervention(payload: StartInterventionPayload): Promise<TraineeInterventionItem> {
    return this.startSkillGapIntervention(payload);
  },

  async updateInterventionProgress(
    trackingId: string,
    payload: UpdateInterventionProgressPayload
  ): Promise<TraineeInterventionItem> {
    const res = await fetch(`${BASE_URL}/interventions/${trackingId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      const res = await fetch(`${BASE_URL}/career-path/trainees/${traineeId}/timeline`, {
        headers: { ...getAuthHeader() }
      });
      if (res.ok) {
        return await res.json();
      }
      console.warn(`Failed to fetch career timeline for ${traineeId}: HTTP ${res.status}`);
    } catch (err) {
      console.error(`Error fetching career timeline for ${traineeId}:`, err);
    }
    return null;
  },

  async getPathwaysSummary(): Promise<PathwaySummaryData | null> {
    try {
      const res = await fetch(`${BASE_URL}/career-path/pathways/summary`, {
        headers: { ...getAuthHeader() }
      });
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      headers: { ...getAuthHeader() },
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
      headers: { ...getAuthHeader() },
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
        employer_name: "Apex Cloud Technologies India Pvt. Ltd.",
        reviewer_name: "Sunita Rao",
        reviewer_role: "Director of Frontend Engineering",
        reviewer_email: "sunita.r@apexcloud.in",
        trainee_id: "TRN-2024-001",
        trainee_name: "Priya Sharma",
        verification_status: "confirmed",
        confirmed_role: "Junior Frontend Engineer",
        confirmed_department: "Enterprise Cloud UI",
        employment_type: "Full-time",
        confirmed_start_date: "2024-06-01",
        salary_range: "₹8,40,000 / yr",
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
        training_relevance_notes: "Priya transitioned into our enterprise frontend codebase with zero hand-holding. Exceptionally well prepared in modern React and TypeScript architecture.",
        curriculum_recommendations: "Incorporate 2 weeks of Docker and automated continuous integration so candidates are familiar with cloud build pipelines on day one.",
        would_hire_from_provider_again: true,
        evidence_level: "multi_source_verified",
        verified_artifacts: ["offer_letter_signed.pdf", "epfo_wage_corroboration.pdf"],
        multi_source_corroboration: {
          sources: ["Employer Verification Portal", "EPFO Wage Registry Corroboration", "Capstone Defense Grade"],
          confidence_score: 0.98,
          audit_timestamp: "2024-07-22T10:00:00"
        },
        submission_date: "2024-07-22"
      },
      {
        id: "EVF-2024-002",
        employer_id: "EMP-04",
        employer_name: "Vanguard Healthcare Networks India",
        reviewer_name: "Dr. Mohanarangam Pillai",
        reviewer_role: "Medical Operations Director & Apprenticeship Supervisor",
        reviewer_email: "mpillai@vanguardhealth.in",
        trainee_id: "TRN-2024-004",
        trainee_name: "Karthik Venkataraman",
        verification_status: "confirmed",
        confirmed_role: "Healthcare Cybersecurity Systems Apprentice",
        confirmed_department: "Clinical Information Security",
        employment_type: "Apprenticeship",
        confirmed_start_date: "2024-05-15",
        salary_range: "₹4,80,000 / yr + Skill Allowance",
        is_still_employed: true,
        retention_months: 8,
        skill_ratings: {
          "Network & Cloud Security": 4.8,
          "DISHA & DPDP Healthcare Compliance": 5.0,
          "Circuit Diagnostics": 4.3,
          "Incident Response & Triage": 4.6
        },
        average_skill_score: 4.68,
        missing_technical_skills: [
          "FHIR / HL7 Interoperability Security"
        ],
        missing_soft_skills: [
          "Field Incident Documentation"
        ],
        training_relevance_rating: 4.8,
        training_relevance_notes: "Solid fundamental security hygiene and practical hands-on proficiency with healthcare infrastructure triage.",
        curriculum_recommendations: "Add more practice hours with high-capacity healthcare data exchange protocol security.",
        would_hire_from_provider_again: true,
        evidence_level: "evidence_backed",
        verified_artifacts: ["naps_apprenticeship_contract.pdf", "comptia_sec_badge.pdf"],
        multi_source_corroboration: {
          sources: ["Employer Verification Portal", "NAPS Apprenticeship Registry"],
          confidence_score: 0.94,
          audit_timestamp: "2024-08-10T14:30:00"
        },
        submission_date: "2024-08-10"
      },
      {
        id: "EVF-2024-003",
        employer_id: "EMP-02",
        employer_name: "Meridian MedTech India Pvt. Ltd.",
        reviewer_name: "Vikram Reddy",
        reviewer_role: "Engineering Director",
        reviewer_email: "v.reddy@meridianmedtech.in",
        trainee_id: "TRN-2024-006",
        trainee_name: "Ananya Iyer",
        verification_status: "confirmed",
        confirmed_role: "M.Tech Data Science & AI Research Fellow",
        confirmed_department: "Clinical Informatics & Analytics",
        employment_type: "Fellowship",
        confirmed_start_date: "2024-08-01",
        salary_range: "₹9,50,000 / yr (Fellowship Stipend + Grant)",
        is_still_employed: true,
        retention_months: 4,
        skill_ratings: {
          "EHR Data Extraction": 4.6,
          "DISHA / DPDP Compliance": 5.0,
          "SQL / Healthcare Queries": 4.4,
          "Clinical Terminologies (SNOMED/ICD)": 4.2
        },
        average_skill_score: 4.55,
        missing_technical_skills: [
          "FHIR API Interoperability"
        ],
        missing_soft_skills: [
          "Interdisciplinary Physician Communication"
        ],
        training_relevance_rating: 4.7,
        training_relevance_notes: "Ananya demonstrates impeccable data governance and security compliance. A standout research fellow.",
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
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
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
          description: "Corroborated by formal artifacts (signed offer letter, EPF payroll record, NAPS apprenticeship agreement).",
          badge_color: "purple",
          count: 3,
          percentage: 42.9
        },
        {
          level_key: "multi_source_verified",
          level_number: 4,
          label: "Multi-Source Verified",
          description: "Independently corroborated across 3+ distinct streams: Direct Employer + EPFO Wage Registry + Capstone Defense.",
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
        trainee_name: "Priya Sharma",
        program: "Full-Stack Software Engineering",
        cohort: "Cohort 2024-A",
        status: "placed",
        current_role: "Junior Frontend Engineer",
        current_employer: "Apex Cloud Technologies India Pvt. Ltd.",
        placement_salary: "₹8,40,000 / yr",
        evidence_level: "multi_source_verified",
        is_direct_match: true,
        skills: ["React.js", "TypeScript", "REST APIs", "Git", "State Management"]
      },
      {
        trainee_id: "TRN-2024-004",
        trainee_name: "Karthik Venkataraman",
        program: "Commercial Clean Energy & Cyber Defense",
        cohort: "Cohort 2024-A",
        status: "placed",
        current_role: "Healthcare Cybersecurity Systems Apprentice",
        current_employer: "Vanguard Healthcare Networks India",
        placement_salary: "₹4,80,000 / yr + Skill Allowance",
        evidence_level: "evidence_backed",
        is_direct_match: true,
        skills: ["Electrical Safety & CEA", "Network & Cloud Security", "Circuit Diagnostics"]
      },
      {
        trainee_id: "TRN-2024-006",
        trainee_name: "Ananya Iyer",
        program: "Health Informatics & Data Analytics",
        cohort: "Cohort 2024-A",
        status: "placed",
        current_role: "M.Tech Data Science & AI Research Fellow",
        current_employer: "Meridian MedTech India Pvt. Ltd.",
        placement_salary: "₹9,50,000 / yr (Fellowship Stipend + Grant)",
        evidence_level: "employer_confirmed",
        is_direct_match: true,
        skills: ["EHR Data Extraction", "DISHA / DPDP Compliance", "SQL", "Clinical Terminologies"]
      },
      {
        trainee_id: "TRN-2024-007",
        trainee_name: "Rohan Sen",
        program: "Backend Systems & Cloud Engineering",
        cohort: "Cohort 2024-B",
        status: "in_training",
        current_role: "Cloud DevOps Trainee",
        current_employer: "Apex Cloud Technologies India Pvt. Ltd.",
        placement_salary: "₹4,20,000 / yr",
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

  async getComprehensiveAnalytics(params?: CohortFilterParams): Promise<ComprehensiveAnalyticsData> {
    const qs = toQueryString(params);
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
        average_pre_training_wage: "₹3,20,000",
        average_placement_wage: "₹7,20,000",
        average_one_year_wage: "₹9,60,000",
        wage_gain_percentage: 125.0,
        progression_milestones: [
          { stage: "Pre-Training Baseline", avg_wage: 320000, label: "Intake Baseline" },
          { stage: "First Outcome Placement", avg_wage: 720000, label: "Graduation Hire (+₹4.0L)" },
          { stage: "6-Month Retention", avg_wage: 810000, label: "Probationary Increase (+₹4.9L)" },
          { stage: "1-Year Progression", avg_wage: 960000, label: "Annualized Promotion (+₹6.4L)" },
          { stage: "2-Year Senior Tier", avg_wage: 1250000, label: "Mid/Senior Benchmark (+₹9.3L)" }
        ],
        pathway_wage_comparison: [
          { pathway: "Salaried Employment", starting_wage: 840000, one_year_wage: 1050000, pct_gain: 25.0 },
          { pathway: "Registered Apprenticeship", starting_wage: 480000, one_year_wage: 650000, pct_gain: 35.4 },
          { pathway: "Self-Employment & LLC", starting_wage: 680000, one_year_wage: 920000, pct_gain: 35.3 },
          { pathway: "Independent Freelancing", starting_wage: 620000, one_year_wage: 880000, pct_gain: 41.9 },
          { pathway: "Venture Entrepreneurship", starting_wage: 500000, one_year_wage: 1400000, pct_gain: 180.0 },
          { pathway: "Further Education/Research", starting_wage: 420000, one_year_wage: 600000, pct_gain: 42.9 }
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
          { skill: "Electrical Safety & CEA", intake_score: 0.5, graduation_score: 4.4, on_the_job_score: 4.9, net_delta: 4.4 },
          { skill: "Clinical Informatics & DISHA", intake_score: 1.0, graduation_score: 4.2, on_the_job_score: 4.8, net_delta: 3.8 },
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
          provider_name: "Bengaluru Institute of Technology & Advanced Skills",
          enrolled: 480,
          graduated: 456,
          placed: 412,
          placement_rate: 90.4,
          average_salary: "₹8,52,000",
          employer_satisfaction: 4.8,
          top_domains: "Full-Stack Software, Cloud DevOps"
        },
        {
          provider_name: "NSTI Chennai & National Skills Training Institute",
          enrolled: 320,
          graduated: 308,
          placed: 294,
          placement_rate: 95.5,
          average_salary: "₹4,80,000",
          employer_satisfaction: 4.9,
          top_domains: "Commercial Solar, Industrial Electrical"
        },
        {
          provider_name: "Cyberabad Cloud Tech Academy",
          enrolled: 260,
          graduated: 242,
          placed: 218,
          placement_rate: 90.1,
          average_salary: "₹7,80,000",
          employer_satisfaction: 4.7,
          top_domains: "Data Science, Business Intelligence"
        },
        {
          provider_name: "Apollo MedSkills & Health Sciences Initiative",
          enrolled: 188,
          graduated: 178,
          placed: 148,
          placement_rate: 83.1,
          average_salary: "₹5,20,000",
          employer_satisfaction: 4.8,
          top_domains: "Health Informatics, Clinical Data"
        }
      ],
      course_outcomes: [
        {
          course_code: "CS-101",
          course_title: "Full-Stack Enterprise React & Cloud Web Services",
          provider: "Bengaluru Institute of Technology & Advanced Skills",
          enrolled: 280,
          placement_rate: 91.4,
          avg_salary: "₹8,65,000",
          skill_gain: "+3.3",
          retention_365d: 88.2
        },
        {
          course_code: "DEV-201",
          course_title: "Backend Engineering & FastAPI Cloud Architecture",
          provider: "Cyberabad Cloud Tech Academy",
          enrolled: 200,
          placement_rate: 89.0,
          avg_salary: "₹8,80,000",
          skill_gain: "+3.4",
          retention_365d: 87.5
        },
        {
          course_code: "ELEC-301",
          course_title: "Industrial Electrical & Clean Energy Systems (CEA / DGFASLI)",
          provider: "NSTI Chennai & National Skills Training Institute",
          enrolled: 320,
          placement_rate: 95.5,
          avg_salary: "₹4,80,000",
          skill_gain: "+4.2",
          retention_365d: 92.4
        },
        {
          course_code: "DATA-101",
          course_title: "Applied Data Pipelines & Predictive Analytics",
          provider: "Bengaluru Institute of Technology & Advanced Skills",
          enrolled: 260,
          placement_rate: 90.1,
          avg_salary: "₹8,10,000",
          skill_gain: "+2.9",
          retention_365d: 84.0
        },
        {
          course_code: "HLTH-101",
          course_title: "Clinical EHR & Health Data Informatics (DISHA & DPDP)",
          provider: "Apollo MedSkills & Health Sciences Initiative",
          enrolled: 188,
          placement_rate: 83.1,
          avg_salary: "₹5,20,000",
          skill_gain: "+3.6",
          retention_365d: 94.0
        }
      ],
      district_trends: [
        {
          district: "Bengaluru Urban Tech Corridor",
          trainees_count: 420,
          placed_count: 382,
          employment_rate: 90.9,
          top_sector: "Enterprise Software & AI",
          avg_wage: "₹8,74,000"
        },
        {
          district: "Cyberabad Knowledge City (Hyderabad)",
          trainees_count: 310,
          placed_count: 284,
          employment_rate: 91.6,
          top_sector: "Semiconductors & Cloud Services",
          avg_wage: "₹8,48,000"
        },
        {
          district: "Chennai IT Highway (OMR)",
          trainees_count: 240,
          placed_count: 218,
          employment_rate: 90.8,
          top_sector: "Clean Energy & Electrical Trades",
          avg_wage: "₹7,62,000"
        },
        {
          district: "Pune Innovation District (Hinjawadi)",
          trainees_count: 180,
          placed_count: 156,
          employment_rate: 86.7,
          top_sector: "Advanced Manufacturing & Robotics",
          avg_wage: "₹7,85,000"
        },
        {
          district: "Mumbai Metro FinTech Hub",
          trainees_count: 98,
          placed_count: 82,
          employment_rate: 83.7,
          top_sector: "Logistics & Solar Infrastructure",
          avg_wage: "₹8,65,000"
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

    return fetchWithFallback<ComprehensiveAnalyticsData>(`/analytics/comprehensive${qs}`, fallback);
  },

  async getLongitudinalMetrics(params?: CohortFilterParams): Promise<LongitudinalMetricsData> {
    const qs = toQueryString(params);
    const fallback: LongitudinalMetricsData = {
      placement_rate: null,
      employment_rate: null,
      self_employment_rate: null,
      apprenticeship_rate: null,
      freelancing_rate: null,
      higher_studies_rate: null,
      unemployed_rate: null,
      unknown_rate: null,
      unreachable_rate: null,
      withdrawn_consent_rate: null,
      retention_30d: null,
      retention_90d: null,
      retention_180d: null,
      retention_365d: null,
      wage_progression: null,
      median_wage: null,
      average_placement_wage: null,
      average_current_wage: null,
      training_to_job_relevance: null,
      skill_gap_frequency: [],
      attrition_reasons: [],
      follow_up_response_rate: null
    };
    return fetchWithFallback<LongitudinalMetricsData>(`/analytics/longitudinal-metrics${qs}`, fallback);
  },

  async getDataQualityDashboard(params?: CohortFilterParams): Promise<DataQualityDashboardData> {
    const qs = toQueryString(params);
    const fallback: DataQualityDashboardData = {
      total_records: 0,
      verified_records: 0,
      verified_pct: 0,
      self_reported_records: 0,
      self_reported_pct: 0,
      unknown_outcomes: 0,
      unknown_pct: 0,
      unreachable_trainees: 0,
      unreachable_pct: 0,
      stale_records: 0,
      stale_pct: 0,
      missing_wages: 0,
      missing_wages_pct: 0,
      missing_employer_verification: 0,
      missing_employer_verification_pct: 0,
      missing_follow_ups: 0,
      missing_follow_ups_pct: 0,
      overall_quality_score: 0,
      score_breakdown: { completeness: 0, freshness: 0, verification: 0, consistency: 0 },
      record_audits: []
    };
    return fetchWithFallback<DataQualityDashboardData>(`/analytics/data-quality${qs}`, fallback);
  },

  async getCohortFilterOptions(): Promise<CohortFilterOptionsData> {
    const fallback: CohortFilterOptionsData = {
      courses: [],
      providers: [],
      districts: [],
      batches: [],
      outcome_states: [],
      verification_levels: [],
      data_sources: []
    };
    return fetchWithFallback<CohortFilterOptionsData>('/analytics/cohort-filters', fallback);
  },

  async getTraineeOutcomes(params?: CohortFilterParams): Promise<TraineeOutcomeRecord[]> {
    const qs = toQueryString(params);
    return fetchWithFallback<TraineeOutcomeRecord[]>(`/analytics/trainee-outcomes${qs}`, []);
  },

  // ---------------------------------------------------------------------------
  // Longitudinal Trainee Passport & Event Audit Service Methods
  // ---------------------------------------------------------------------------

  async getTraineePassport(id: string): Promise<TraineePassportData | null> {
    try {
      const res = await fetch(`${BASE_URL}/trainees/${id}/passport`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Error fetching trainee passport:', e);
    }
    return null;
  },

  async updateTraineeProfile(id: string, updates: TraineeProfileUpdatePayload): Promise<Trainee> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update profile' }));
      throw new Error(err.detail || 'Failed to update profile');
    }
    return await res.json();
  },

  async getTrainingRecords(id: string): Promise<TrainingRecord[]> {
    try {
      const res = await fetch(`${BASE_URL}/trainees/${id}/training`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Error fetching training records:', e);
    }
    return [];
  },

  async addTrainingRecord(id: string, record: TrainingRecordCreatePayload): Promise<TrainingRecord> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/training`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to add training record' }));
      throw new Error(err.detail || 'Failed to add training record');
    }
    return await res.json();
  },

  async verifyTrainingRecord(id: string, recordId: string, status: 'verified' | 'rejected', notes?: string): Promise<TrainingRecord> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/training/${recordId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        verification_status: status,
        verification_notes: notes,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to verify training record' }));
      throw new Error(err.detail || 'Failed to verify training record');
    }
    return await res.json();
  },

  async addTraineeSkill(id: string, payload: SkillAddPayload): Promise<any> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/skills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to add skill' }));
      throw new Error(err.detail || 'Failed to add skill');
    }
    return await res.json();
  },

  async verifyTraineeSkill(id: string, skillId: string, score: number, notes?: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/skills/${skillId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ score, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to verify skill' }));
      throw new Error(err.detail || 'Failed to verify skill');
    }
    return await res.json();
  },

  async updateCareerGoals(id: string, payload: CareerGoalsUpdatePayload): Promise<any> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/career-goals`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update career goals' }));
      throw new Error(err.detail || 'Failed to update career goals');
    }
    return await res.json();
  },

  async verifyTraineeOutcome(id: string, outcomeId: string, payload: OutcomeVerifyPayload): Promise<Trainee> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/outcomes/${outcomeId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to verify outcome' }));
      throw new Error(err.detail || 'Failed to verify outcome');
    }
    return await res.json();
  },

  async respondToFollowUp(id: string, followupId: string, payload: FollowUpResponsePayload): Promise<Trainee> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/follow-ups/${followupId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit follow-up response' }));
      throw new Error(err.detail || 'Failed to submit follow-up response');
    }
    return await res.json();
  },

  async getPassportTimeline(id: string): Promise<PassportEvent[]> {
    try {
      const res = await fetch(`${BASE_URL}/trainees/${id}/timeline`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Error fetching passport timeline:', e);
    }
    return [];
  },

  async getPassportAuditHistory(id: string): Promise<PassportEvent[]> {
    try {
      const res = await fetch(`${BASE_URL}/trainees/${id}/audit-history`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Error fetching audit history:', e);
    }
    return [];
  },

  async updateTrainingRecord(id: string, recordId: string, updates: Record<string, any>): Promise<any> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/training/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update training record' }));
      throw new Error(err.detail || 'Failed to update training record');
    }
    return await res.json();
  },

  async requestTrainingVerification(id: string, recordId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/training/${recordId}/verification-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to request verification' }));
      throw new Error(err.detail || 'Failed to request verification');
    }
    return await res.json();
  },

  async updateTraineeSkill(id: string, skillId: string, updates: Record<string, any>): Promise<any> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/skills/${skillId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update skill' }));
      throw new Error(err.detail || 'Failed to update skill');
    }
    return await res.json();
  },

  async updateCertification(id: string, certId: string, updates: Record<string, any>): Promise<any> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/certifications/${certId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update certification' }));
      throw new Error(err.detail || 'Failed to update certification');
    }
    return await res.json();
  },

  async updateTraineeOutcome(id: string, outcomeId: string, updates: Record<string, any>): Promise<any> {
    const res = await fetch(`${BASE_URL}/trainees/${id}/outcomes/${outcomeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update outcome' }));
      throw new Error(err.detail || 'Failed to update outcome');
    }
    return await res.json();
  },

  async analyzeTraineeResume(id: string, file: File): Promise<any> {
    return this.uploadAndAnalyzeResume(id, file);
  },

  // Self-Service /me API wrappers
  async getMyPassport(): Promise<TraineePassportData | null> {
    try {
      const res = await fetch(`${BASE_URL}/trainees/me/passport`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Error fetching my passport:', e);
    }
    return null;
  },

  async updateMyProfile(updates: TraineeProfileUpdatePayload): Promise<Trainee> {
    const res = await fetch(`${BASE_URL}/trainees/me/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update profile' }));
      throw new Error(err.detail || 'Failed to update profile');
    }
    return await res.json();
  },

  // Career Outcome Digital Twin APIs
  async getDigitalTwin(traineeId: string): Promise<DigitalTwinStateData> {
    const res = await fetch(`${BASE_URL}/digital-twin/${traineeId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch digital twin' }));
      throw new Error(err.detail || 'Failed to fetch digital twin');
    }
    return await res.json();
  },

  async getDigitalTwinTimeline(traineeId: string): Promise<DigitalTwinTimelineResponse> {
    const res = await fetch(`${BASE_URL}/digital-twin/${traineeId}/timeline`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch digital twin timeline' }));
      throw new Error(err.detail || 'Failed to fetch digital twin timeline');
    }
    return await res.json();
  },

  async getDigitalTwinSkillEvolution(traineeId: string): Promise<{ trainee_id: string; stages: DigitalTwinSkillEvolutionStage[] }> {
    const res = await fetch(`${BASE_URL}/digital-twin/${traineeId}/skill-evolution`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch skill evolution' }));
      throw new Error(err.detail || 'Failed to fetch skill evolution');
    }
    return await res.json();
  },

  async getDigitalTwinEmploymentEvolution(traineeId: string): Promise<{ trainee_id: string; current_outcome: string; journey: DigitalTwinOutcomeMilestone[] }> {
    const res = await fetch(`${BASE_URL}/digital-twin/${traineeId}/employment-evolution`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch employment evolution' }));
      throw new Error(err.detail || 'Failed to fetch employment evolution');
    }
    return await res.json();
  },

  async getDigitalTwinEvidence(traineeId: string): Promise<DigitalTwinEvidenceItem[]> {
    const res = await fetch(`${BASE_URL}/digital-twin/${traineeId}/evidence`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch digital twin evidence' }));
      throw new Error(err.detail || 'Failed to fetch digital twin evidence');
    }
    return await res.json();
  },

  async getDigitalTwinDataQuality(traineeId: string): Promise<DigitalTwinDataQualityResponse> {
    const res = await fetch(`${BASE_URL}/digital-twin/${traineeId}/data-quality`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch digital twin data quality' }));
      throw new Error(err.detail || 'Failed to fetch digital twin data quality');
    }
    return await res.json();
  },

  async refreshDigitalTwin(traineeId: string): Promise<DigitalTwinStateData> {
    const res = await fetch(`${BASE_URL}/digital-twin/${traineeId}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to refresh digital twin' }));
      throw new Error(err.detail || 'Failed to refresh digital twin');
    }
    return await res.json();
  }
};

// ========================================================
// What-If Career Simulator API Service
// ========================================================

export const careerSimulatorApi = {
  async getSimulatorOptions(): Promise<SimulatorOptions> {
    const res = await fetch(`${BASE_URL}/simulator/options`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch simulator options' }));
      throw new Error(err.detail || 'Failed to fetch simulator options');
    }
    return await res.json();
  },

  async getTraineeBaseline(traineeId: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/simulator/trainee/${traineeId}/baseline`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch trainee baseline' }));
      throw new Error(err.detail || 'Failed to fetch trainee baseline');
    }
    return await res.json();
  },

  async runSimulation(scenario: ScenarioInput): Promise<SimulationResponse> {
    const res = await fetch(`${BASE_URL}/simulator/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(scenario),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to execute career simulation' }));
      throw new Error(err.detail || 'Failed to execute career simulation');
    }
    return await res.json();
  }
};

// ========================================================
// Outcome Risk Engine & Intervention Loop API Service
// ========================================================

export const outcomeRisksApi = {
  async getOutcomeRisks(params?: { trainee_id?: string; risk_type?: string; severity?: string; status?: string }): Promise<OutcomeRiskItem[]> {
    const qs = toQueryString(params);
    const res = await fetch(`${BASE_URL}/outcome-risks${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch outcome risks' }));
      throw new Error(err.detail || 'Failed to fetch outcome risks');
    }
    return await res.json();
  },

  async getOutcomeRisksSummary(): Promise<OutcomeRiskSummary> {
    const res = await fetch(`${BASE_URL}/outcome-risks/summary`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch outcome risk summary' }));
      throw new Error(err.detail || 'Failed to fetch outcome risk summary');
    }
    return await res.json();
  },

  async getOutcomeRiskDetail(riskId: string): Promise<OutcomeRiskItem> {
    const res = await fetch(`${BASE_URL}/outcome-risks/${riskId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch risk detail' }));
      throw new Error(err.detail || 'Failed to fetch risk detail');
    }
    return await res.json();
  },

  async scanOutcomeRisks(traineeId?: string): Promise<{ scanned_trainees: number; risks_generated: number }> {
    const qs = traineeId ? `?trainee_id=${traineeId}` : '';
    const res = await fetch(`${BASE_URL}/outcome-risks/scan${qs}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to scan outcome risks' }));
      throw new Error(err.detail || 'Failed to scan outcome risks');
    }
    return await res.json();
  },

  async acceptIntervention(riskId: string, notes?: string): Promise<OutcomeRiskItem> {
    const res = await fetch(`${BASE_URL}/outcome-risks/${riskId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ reason_or_notes: notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to accept intervention' }));
      throw new Error(err.detail || 'Failed to accept intervention');
    }
    return await res.json();
  },

  async rejectIntervention(riskId: string, reason?: string): Promise<OutcomeRiskItem> {
    const res = await fetch(`${BASE_URL}/outcome-risks/${riskId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ reason_or_notes: reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to reject intervention' }));
      throw new Error(err.detail || 'Failed to reject intervention');
    }
    return await res.json();
  },

  async startOutcomeRiskIntervention(riskId: string): Promise<OutcomeRiskItem> {
    const res = await fetch(`${BASE_URL}/outcome-risks/${riskId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to start intervention' }));
      throw new Error(err.detail || 'Failed to start intervention');
    }
    return await res.json();
  },

  // Backward-compatibility alias delegating to canonical startOutcomeRiskIntervention
  async startIntervention(riskId: string): Promise<OutcomeRiskItem> {
    return this.startOutcomeRiskIntervention(riskId);
  },

  async completeIntervention(riskId: string): Promise<OutcomeRiskItem> {
    const res = await fetch(`${BASE_URL}/outcome-risks/${riskId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to complete intervention' }));
      throw new Error(err.detail || 'Failed to complete intervention');
    }
    return await res.json();
  },

  async reassessRisk(
    riskId: string,
    payload: {
      assessment_score: number;
      evaluator_name: string;
      evaluator_role?: string;
      notes?: string;
      verified_evidence_url?: string;
    }
  ): Promise<OutcomeRiskItem> {
    const res = await fetch(`${BASE_URL}/outcome-risks/${riskId}/reassess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit risk reassessment' }));
      throw new Error(err.detail || 'Failed to submit risk reassessment');
    }
    return await res.json();
  }
};

// ========================================================
// Skill Gap Intelligence API Service
// ========================================================

export const skillIntelligenceApi = {
  async getTraineeSkillIntelligence(
    traineeId: string,
    params?: { target_role?: string; target_job_id?: string }
  ): Promise<TraineeSkillGapResponse> {
    const qs = params ? toQueryString(params) : '';
    const res = await fetch(`${BASE_URL}/skill-intelligence/trainee/${traineeId}${qs}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch trainee skill gap intelligence');
    return await res.json();
  },

  // Backward-compatibility alias delegating to canonical getTraineeSkillIntelligence
  async getTraineeSkillGap(
    traineeId: string,
    params?: { target_role?: string; target_job_id?: string }
  ): Promise<TraineeSkillGapResponse> {
    return this.getTraineeSkillIntelligence(traineeId, params);
  },

  async getCourseSkillAnalysis(courseId: string): Promise<CourseSkillAnalysisResponse> {
    const res = await fetch(`${BASE_URL}/skill-intelligence/course/${courseId}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch course skill analysis');
    return await res.json();
  },

  async getTopSkillGaps(params?: Record<string, any>): Promise<TopSkillGapsResponse> {
    const res = await fetch(`${BASE_URL}/skill-intelligence/top-gaps${toQueryString(params)}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch top skill gaps');
    return await res.json();
  },

  async getEmergingSkills(params?: Record<string, any>): Promise<EmergingSkillsResponse> {
    const res = await fetch(`${BASE_URL}/skill-intelligence/emerging-skills${toQueryString(params)}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch emerging skills');
    return await res.json();
  },

  async getJobDemand(params?: Record<string, any>): Promise<JobSkillDemandResponse> {
    const res = await fetch(`${BASE_URL}/skill-intelligence/job-demand${toQueryString(params)}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch job skill demand');
    return await res.json();
  },

  async recalculate(): Promise<{ status: string; processed_trainees: number; processed_courses: number }> {
    const res = await fetch(`${BASE_URL}/skill-intelligence/recalculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });
    if (!res.ok) throw new Error('Failed to recalculate skill intelligence');
    return await res.json();
  }
};

// ========================================================
// Outcome Cause & Attrition Intelligence API Service
// ========================================================

export const outcomeIntelligenceApi = {
  async getReasons(category?: string): Promise<OutcomeReasonItem[]> {
    const res = await fetch(`${BASE_URL}/outcome-intelligence/reasons${category ? `?category=${category}` : ''}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch outcome reasons');
    return await res.json();
  },

  async getNonPlacement(params?: Record<string, any>): Promise<OutcomeReasonBreakdownResponse> {
    const res = await fetch(`${BASE_URL}/outcome-intelligence/non-placement${toQueryString(params)}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch non-placement reasons');
    return await res.json();
  },

  async getAttrition(params?: Record<string, any>): Promise<OutcomeReasonBreakdownResponse> {
    const res = await fetch(`${BASE_URL}/outcome-intelligence/attrition${toQueryString(params)}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch attrition reasons');
    return await res.json();
  },

  async getSelfEmployment(params?: Record<string, any>): Promise<OutcomeReasonBreakdownResponse> {
    const res = await fetch(`${BASE_URL}/outcome-intelligence/self-employment${toQueryString(params)}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch self-employment challenges');
    return await res.json();
  },

  async getSummary(params?: Record<string, any>): Promise<OutcomeSummaryAnalyticsResponse> {
    const res = await fetch(`${BASE_URL}/outcome-intelligence/summary${toQueryString(params)}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch outcome summary intelligence');
    return await res.json();
  },

  async recordOutcomeReason(targetId: string, payload: any): Promise<any> {
    const bodyPayload = {
      outcome_type: payload.outcome_type || 'NON_PLACEMENT',
      reason_category: payload.reason_category || 'NON_PLACEMENT',
      reason_code: payload.reason_code || payload.reason_key || 'SKILL_MISMATCH',
      reason_text: payload.reason_text || payload.notes || payload.reason_label || 'Outcome reason recorded',
      outcome_id: payload.outcome_id,
      tenure_months: payload.tenure_months,
      metadata_json: payload.metadata_json || { label: payload.reason_label || payload.reason_code }
    };
    const res = await fetch(`${BASE_URL}/outcomes/${targetId}/reason`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(bodyPayload)
    });
    if (!res.ok) throw new Error('Failed to record outcome reason');
    return await res.json();
  },

  async generateFollowUpQuestions(traineeId: string, employmentStatus: string): Promise<FollowUpGenerationResponse> {
    const res = await fetch(`${BASE_URL}/follow-ups/generate?trainee_id=${encodeURIComponent(traineeId)}&employment_status=${encodeURIComponent(employmentStatus)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    });
    if (!res.ok) throw new Error('Failed to generate follow-up questions');
    return await res.json();
  },

  async submitFollowUpResponse(payload: FollowUpResponseSubmission): Promise<any> {
    const res = await fetch(`${BASE_URL}/follow-ups/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to submit follow-up response');
    return await res.json();
  }
};
