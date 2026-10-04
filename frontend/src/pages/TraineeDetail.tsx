import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Award,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  TrendingUp,
  FileText,
  Save,
  Sparkles,
  Rocket,
  Wrench,
  GraduationCap,
  BookOpen,
  Plus,
  Compass,
  IndianRupee,
  ShieldCheck,
  User,
  ExternalLink,
  Sliders,
  BrainCircuit,
  RefreshCw,
  Lock,
  Edit3,
  Check,
  X,
  UploadCloud,
  ChevronRight,
  Filter,
  CheckSquare,
  HelpCircle,
  History,
  FileCheck2,
  ThumbsUp,
  ThumbsDown,
  Info,
  Layers,
  Search
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge, BadgeVariant } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { ConsentCard } from '../components/passport/ConsentCard';
import { SkillRadarChart } from '../components/passport/SkillRadarChart';
import { SkillScoringMatrix } from '../components/passport/SkillScoringMatrix';
import { SoftSkillAssessmentModal } from '../components/passport/SoftSkillAssessmentModal';
import { ScoringConfigModal } from '../components/passport/ScoringConfigModal';
import { api, outcomeIntelligenceApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Trainee,
  OutcomeType,
  OutcomeRecord,
  Certification,
  AssessmentRecord,
  FollowUpAuditRecord,
  ConsentStatus,
  TraineeRadarProfile,
  ScoringConfiguration,
  TrainingRecord,
  PassportEvent,
  TraineeProfileUpdatePayload,
  TrainingRecordCreatePayload,
  CareerGoalsUpdatePayload,
  SkillAddPayload,
  FollowUpResponsePayload,
  OutcomeVerifyPayload
} from '../types';
import { AuthUser, UserRole } from '../types/auth';

const outcomeLabels: Record<string, { label: string; variant: BadgeVariant; icon: any }> = {
  employment: { label: 'Employed (Direct Hire)', variant: 'success', icon: Briefcase },
  self_employment: { label: 'Self-Employed / Freelance', variant: 'brand', icon: Rocket },
  freelancing: { label: 'Freelancer / Contractor', variant: 'brand', icon: Wrench },
  apprenticeship: { label: 'Registered Apprentice', variant: 'warning', icon: Award },
  entrepreneurship: { label: 'Venture Entrepreneur', variant: 'brand', icon: Sparkles },
  further_education: { label: 'Higher Education / Degree', variant: 'neutral', icon: GraduationCap },
  research: { label: 'Research / Academic', variant: 'neutral', icon: BookOpen },
  other: { label: 'Career Transition', variant: 'neutral', icon: Compass },
  outcome_unknown: { label: 'Outcome Unknown (Triage)', variant: 'warning', icon: HelpCircle },
};

export const TraineeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser, role: authRole } = useAuth();

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<PassportEvent[]>([]);
  const [auditEvents, setAuditEvents] = useState<PassportEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'training' | 'skills' | 'career' | 'outcomes' | 'followups'>('overview');

  // Role & Notification State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('TRAINEE');
  const [verifyStatusChoice, setVerifyStatusChoice] = useState<'verified' | 'rejected' | 'pending'>('verified');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modals state
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isAddTrainingModalOpen, setIsAddTrainingModalOpen] = useState(false);
  const [isEditTrainingModalOpen, setIsEditTrainingModalOpen] = useState(false);
  const [isVerifyTrainingModalOpen, setIsVerifyTrainingModalOpen] = useState(false);
  const [selectedTrainingRecord, setSelectedTrainingRecord] = useState<TrainingRecord | null>(null);

  const [isAddSkillModalOpen, setIsAddSkillModalOpen] = useState(false);
  const [isVerifySkillModalOpen, setIsVerifySkillModalOpen] = useState(false);
  const [selectedSkillToVerify, setSelectedSkillToVerify] = useState<{ id: string; name: string; currentScore: number } | null>(null);

  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isVerifyCertModalOpen, setIsVerifyCertModalOpen] = useState(false);
  const [selectedCertToVerify, setSelectedCertToVerify] = useState<Certification | null>(null);
  const [verifyCertNotes, setVerifyCertNotes] = useState('');

  const [isAnalyzeResumeModalOpen, setIsAnalyzeResumeModalOpen] = useState(false);
  const [isEditCareerGoalsModalOpen, setIsEditCareerGoalsModalOpen] = useState(false);

  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [isEditOutcomeModalOpen, setIsEditOutcomeModalOpen] = useState(false);
  const [selectedOutcomeToEdit, setSelectedOutcomeToEdit] = useState<OutcomeRecord | null>(null);
  const [isVerifyOutcomeModalOpen, setIsVerifyOutcomeModalOpen] = useState(false);
  const [selectedOutcomeToVerify, setSelectedOutcomeToVerify] = useState<OutcomeRecord | null>(null);

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isFollowUpResponseModalOpen, setIsFollowUpResponseModalOpen] = useState(false);
  const [selectedFollowUpToRespond, setSelectedFollowUpToRespond] = useState<FollowUpAuditRecord | null>(null);

  const [isAssessModalOpen, setIsAssessModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Outcome Timeline Stage Modal State
  const [selectedTimelineStage, setSelectedTimelineStage] = useState<{
    id: string;
    stage: string;
    title: string;
    date: string;
    source: string;
    verification_status: string;
    relevant_skills: string[];
    outcome_reason?: string;
    notes?: string;
  } | null>(null);
  const [isTimelineStageModalOpen, setIsTimelineStageModalOpen] = useState(false);
  const [timelineReasonKey, setTimelineReasonKey] = useState('SKILL_MISMATCH');
  const [timelineReasonLabel, setTimelineReasonLabel] = useState('Skill Mismatch');
  const [timelineReasonNotes, setTimelineReasonNotes] = useState('');
  const [isSavingTimelineReason, setIsSavingTimelineReason] = useState(false);

  // Skill Scoring Engine state
  const [radarProfile, setRadarProfile] = useState<TraineeRadarProfile | null>(null);
  const [isSoftSkillModalOpen, setIsSoftSkillModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Forms
  const [profileForm, setProfileForm] = useState<TraineeProfileUpdatePayload>({});
  const [trainingForm, setTrainingForm] = useState<TrainingRecordCreatePayload>({
    course_name: '',
    provider_name: '',
    batch: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    delivery_mode: 'Hybrid',
    completion_status: 'Completed',
    attendance_percentage: 95.0,
    hours_completed: 400,
    certificate_url: '',
    description: '',
  });
  const [verifyTrainingNotes, setVerifyTrainingNotes] = useState('');

  const [skillForm, setSkillForm] = useState<SkillAddPayload>({
    skill_name: '',
    category: 'hard',
    self_rating: 4.0,
    evidence_notes: '',
  });
  const [verifySkillForm, setVerifySkillForm] = useState<{ score: number; notes: string }>({
    score: 4.0,
    notes: '',
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeAnalyzing, setResumeAnalyzing] = useState(false);
  const [resumeAnalysisResult, setResumeAnalysisResult] = useState<any | null>(null);

  const [careerGoalsForm, setCareerGoalsForm] = useState<CareerGoalsUpdatePayload>({
    target_occupation: 'Data Analyst',
    preferred_industry: 'FinTech & Analytics',
    preferred_workplace: 'Hybrid',
    preferred_locations: ['Bengaluru, KA', 'Chennai, TN'],
    target_salary_min: '₹4,50,000',
    target_salary_max: '₹7,00,000',
    employment_type: 'Full-time',
    short_term_goal: 'Secure role as Junior Data Analyst or Associate BI Developer',
    long_term_goal: 'Advance to Senior Analytics Engineer or Lead Data Consultant',
    entrepreneurship_interest: false,
    further_education_interest: false,
  });

  const [outcomeForm, setOutcomeForm] = useState<Partial<OutcomeRecord>>({
    outcome_type: 'employment',
    organization_or_venture: '',
    role_or_course: '',
    compensation_or_funding: '',
    start_date: new Date().toISOString().split('T')[0],
    is_current: true,
    verification_status: 'verified',
    verification_notes: '',
  });
  const [verifyOutcomeNotes, setVerifyOutcomeNotes] = useState('');
  const [verifyOutcomeRole, setVerifyOutcomeRole] = useState('');

  const [followUpResponseForm, setFollowUpResponseForm] = useState<FollowUpResponsePayload>({
    employment_status: 'EMPLOYED',
    current_role: '',
    current_employer: '',
    current_salary: '',
    still_using_learned_skills: true,
    occupation_changed: false,
    additional_skills_needed: 'Advanced Cloud Data Warehousing & Real-time Pipelines',
    trainee_notes: '',
  });

  const [certForm, setCertForm] = useState<Partial<Certification>>({
    title: '',
    issuing_organization: '',
    issue_date: new Date().toISOString().split('T')[0],
    credential_id: '',
    verification_url: '',
    status: 'Active',
  });

  const [assessForm, setAssessForm] = useState<Partial<AssessmentRecord>>({
    assessment_name: '',
    date: new Date().toISOString().split('T')[0],
    score: 90,
    max_score: 100,
    grade: 'A',
    evaluator: 'Lead Instructor',
    feedback: '',
  });

  const [followUpForm, setFollowUpForm] = useState<Partial<FollowUpAuditRecord>>({
    checkpoint_type: '90-Day Retention Audit',
    date: new Date().toISOString().split('T')[0],
    counselor_name: 'Workforce Counselor',
    status: 'completed',
    retention_confirmed: true,
    wage_progressed: false,
    counselor_notes: '',
  });

  // Load user role from AuthContext & session
  useEffect(() => {
    if (authRole) {
      setUserRole(authRole.toUpperCase() as any);
    }
    if (authUser) {
      setCurrentUser(authUser);
    } else {
      try {
        const stored = localStorage.getItem('skilltrace_auth_user') || localStorage.getItem('skilltrace_user');
        if (stored) {
          const u = JSON.parse(stored);
          setCurrentUser(u);
          if (u.role) {
            setUserRole(u.role.toUpperCase() as any);
          }
        }
      } catch {
        // fallback
      }
    }
  }, [authRole, authUser]);

  const isVerifierOrAuditor = userRole === 'VERIFICATION_AUTHORITY' || userRole === 'AUDITOR';
  const isVerificationAuthority = userRole === 'EMPLOYER' || userRole === 'COACH' || userRole === 'ADMIN' || isVerifierOrAuditor;
  const canVerifyTrainingAndSkills = userRole === 'COACH' || userRole === 'ADMIN' || isVerifierOrAuditor;
  const canVerifyOutcomes = userRole === 'EMPLOYER' || userRole === 'COACH' || userRole === 'ADMIN' || isVerifierOrAuditor;
  const canManageOutcomes = userRole === 'TRAINEE' || userRole === 'COACH' || userRole === 'ADMIN' || isVerifierOrAuditor;
  const canManageTrainingAndAssessments = userRole === 'COACH' || userRole === 'ADMIN' || isVerifierOrAuditor;
  const canEditProfileAndGoals = userRole === 'TRAINEE' || userRole === 'COACH' || userRole === 'ADMIN' || isVerifierOrAuditor;

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const loadTrainee = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [data, radar, training, timeline, audit] = await Promise.all([
        api.getTraineeById(id),
        api.getTraineeRadarProfile(id),
        api.getTrainingRecords(id),
        api.getPassportTimeline(id),
        api.getPassportAuditHistory(id),
      ]);
      if (data) {
        setTrainee(data);
        // Pre-fill forms
        setProfileForm({
          full_name: data.fullName || data.full_name,
          phone: data.phone,
          email: data.email,
          location: data.location,
          address: (data as any).address || '',
          languages: (data as any).languages || ['English', 'Hindi'],
          education: (data as any).education || '',
          bio: data.bio,
          employment_status: data.status,
          preferred_locations: data.career_preference?.preferred_locations || [],
          career_interests: data.career_preference?.target_industries || [],
          career_preference: data.career_preference || {},
        });
        if (data.career_preference) {
          setCareerGoalsForm({
            target_occupation: (data.career_preference.target_roles || ['Data Analyst'])[0],
            target_roles: data.career_preference.target_roles || ['Data Analyst'],
            preferred_industry: (data.career_preference.target_industries || ['FinTech'])[0],
            preferred_workplace: data.career_preference.preferred_workplace || 'Hybrid',
            preferred_locations: data.career_preference.preferred_locations || ['Bengaluru, KA'],
            target_salary_min: data.career_preference.target_salary_min || '₹4,50,000',
            target_salary_max: data.career_preference.target_salary_max || '₹7,00,000',
            employment_type: 'Full-time',
          });
        }
      }
      if (radar) setRadarProfile(radar);
      setTrainingRecords(training || []);
      setTimelineEvents(timeline || []);
      setAuditEvents(audit || []);
    } catch (err) {
      console.error('Error fetching trainee passport', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrainee();
  }, [id]);

  const handleRecalculateSkills = async () => {
    if (!id) return;
    setIsRecalculating(true);
    try {
      await api.recalculateTraineeSkills(id);
      await loadTrainee();
      showToast('Skill scoring matrix and gap engine resynchronized.');
    } catch (err) {
      console.error('Error recalculating skills', err);
      showToast('Failed to recalculate skills.', 'error');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleAssessmentComplete = (updatedProfile: TraineeRadarProfile) => {
    setRadarProfile(updatedProfile);
    loadTrainee();
    showToast('Soft-skill scenario evaluation saved and scored.');
  };

  const handleConfigUpdated = () => {
    loadTrainee();
    showToast('Scoring formula weights updated.');
  };

  const handleUpdateConsent = async (updated: Partial<ConsentStatus>) => {
    if (!trainee) return;
    const res = await api.updateConsent(trainee.id, updated);
    if (res) {
      setTrainee(res);
      showToast('Consent preferences updated.');
    }
  };

  // 1. Edit Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee) return;
    setIsSubmitting(true);
    try {
      const updated = await api.updateTraineeProfile(trainee.id, profileForm);
      if (updated) {
        setTrainee(updated);
        setIsEditProfileModalOpen(false);
        showToast('Profile updated successfully.');
        await loadTrainee();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Training Programme Handlers
  const handleAddTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee || !trainingForm.course_name || !trainingForm.provider_name) return;
    setIsSubmitting(true);
    try {
      await api.addTrainingRecord(trainee.id, trainingForm);
      setIsAddTrainingModalOpen(false);
      showToast('Training submitted for verification.');
      await loadTrainee();
      setTrainingForm({
        course_name: '',
        provider_name: '',
        batch: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        delivery_mode: 'Hybrid',
        completion_status: 'Completed',
        attendance_percentage: 95.0,
        hours_completed: 400,
        certificate_url: '',
        description: '',
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to add training record.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyTraining = async (status: 'verified' | 'rejected') => {
    if (!trainee || !selectedTrainingRecord) return;
    setIsSubmitting(true);
    try {
      await api.verifyTrainingRecord(
        trainee.id,
        selectedTrainingRecord.id,
        status,
        verifyTrainingNotes || `Officially ${status} by assigned workforce representative.`
      );
      setIsVerifyTrainingModalOpen(false);
      setSelectedTrainingRecord(null);
      setVerifyTrainingNotes('');
      showToast(status === 'verified' ? 'Training record officially verified.' : 'Training record rejected.');
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to verify training.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee || !selectedTrainingRecord) return;
    setIsSubmitting(true);
    try {
      await api.updateTrainingRecord(trainee.id, selectedTrainingRecord.id, trainingForm);
      setIsEditTrainingModalOpen(false);
      setSelectedTrainingRecord(null);
      showToast('Training record updated. Status set to pending verification.');
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to update training record.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestTrainingVerification = async (recordId: string) => {
    if (!trainee) return;
    try {
      await api.requestTrainingVerification(trainee.id, recordId);
      showToast('Training submitted for verification.');
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit verification request.', 'error');
    }
  };

  // 3. Skills & Certifications Handlers
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee || !skillForm.skill_name) return;
    setIsSubmitting(true);
    try {
      await api.addTraineeSkill(trainee.id, skillForm);
      setIsAddSkillModalOpen(false);
      showToast('Skill added and evidence queued for verification.');
      setSkillForm({
        skill_name: '',
        category: 'hard',
        self_rating: 4.0,
        evidence_notes: '',
      });
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to add skill.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee || !selectedSkillToVerify) return;
    setIsSubmitting(true);
    try {
      await api.verifyTraineeSkill(
        trainee.id,
        selectedSkillToVerify.id,
        verifySkillForm.score,
        verifySkillForm.notes || 'Officially verified and audited against programmatic rubrics.'
      );
      setIsVerifySkillModalOpen(false);
      setSelectedSkillToVerify(null);
      showToast('Skill competency verified by coach.');
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to verify skill.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordTimelineReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTimelineStage || !trainee) return;
    setIsSavingTimelineReason(true);
    try {
      await outcomeIntelligenceApi.recordOutcomeReason(
        selectedTimelineStage.id || trainee.id,
        {
          reason_key: timelineReasonKey,
          reason_label: timelineReasonLabel,
          notes: timelineReasonNotes
        }
      );
      setSelectedTimelineStage({
        ...selectedTimelineStage,
        outcome_reason: `${timelineReasonLabel} (${timelineReasonKey})`
      });
      showToast('Outcome reason recorded to Trainee Passport & Intelligence Engine.');
      await loadTrainee();
    } catch (err: any) {
      showToast('Failed to record outcome reason: ' + (err?.message || 'Check connection'), 'error');
    } finally {
      setIsSavingTimelineReason(false);
    }
  };

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee || !certForm.title || !certForm.issuing_organization) return;
    setIsSubmitting(true);
    try {
      const res = await api.addCertification(trainee.id, certForm);
      if (res) setTrainee(res);
      setIsCertModalOpen(false);
      showToast('Certificate uploaded.');
      setCertForm({
        title: '',
        issuing_organization: '',
        issue_date: new Date().toISOString().split('T')[0],
        credential_id: '',
        verification_url: '',
        status: 'Active',
      });
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload certificate.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCertification = async (status: 'verified' | 'rejected') => {
    if (!trainee || !selectedCertToVerify) return;
    try {
      await api.verifyTraineeCertification(
        trainee.id,
        selectedCertToVerify.id || selectedCertToVerify.title,
        status,
        verifyCertNotes || `Officially ${status} by authorized verification body.`
      );
      setIsVerifyCertModalOpen(false);
      setSelectedCertToVerify(null);
      setVerifyCertNotes('');
      await loadTrainee();
      showToast(`Certification marked as ${status} successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to verify certification.', 'error');
    }
  };

  // 4. Resume Analyzer Integration
  const handleAnalyzeResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee) return;
    setResumeAnalyzing(true);
    try {
      let fileToUpload = resumeFile;
      if (!fileToUpload) {
        // Create demo resume blob for immediate one-click testing
        const sampleText = `
PRIYA SHARMA
Data Analyst & BI Specialist
Email: priya.sharma@example.com | Phone: +91 98765 43210
Location: Bengaluru, India

SUMMARY:
Results-driven Data Analyst with experience in Python, SQL, Power BI, Excel, and Statistics.
Specialized in exploratory data analysis, business intelligence dashboarding, and ETL pipelines.

TECHNICAL SKILLS:
- Languages & Databases: Python, SQL, PostgreSQL, SQLite
- Analytics & BI: Power BI, Excel, Advanced Analytics, Statistics, Exploratory Data Analysis
- Concepts: Data Cleaning, ETL, Data Visualization, Problem Solving

WORK EXPERIENCE:
Junior Data Analyst Trainee | ABC Skill Centre (2024 - Present)
- Developed automated sales dashboards in Power BI and SQL.
- Extracted and cleaned 500,000+ transaction records using Python Pandas.
- Identified operational bottlenecks leading to 14% improvement in report delivery.

EDUCATION & CERTIFICATIONS:
- Data Analytics Certification | NSDC Accredited
- Bachelor of Computer Applications | Bangalore University
        `.trim();
        fileToUpload = new File([sampleText], 'Priya_Sharma_DataAnalyst_Resume.txt', { type: 'text/plain' });
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const token = localStorage.getItem('skilltrace_auth_token');
      const res = await fetch(`/api/trainees/${trainee.id}/resume/analyze`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to analyze resume' }));
        throw new Error(err.detail || 'Resume analysis failed');
      }

      const result = await res.json();
      setResumeAnalysisResult(result);
      const skillsCount = result.extracted_skills?.length || 0;
      showToast(`Resume analyzed. ${skillsCount} skills detected.`);
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Resume analysis failed.', 'error');
    } finally {
      setResumeAnalyzing(false);
    }
  };

  // 5. Career Goals Handler
  const handleSaveCareerGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee) return;
    setIsSubmitting(true);
    try {
      await api.updateCareerGoals(trainee.id, {
        target_occupation: careerGoalsForm.target_occupation,
        target_roles: [careerGoalsForm.target_occupation || 'Data Analyst'],
        preferred_industry: careerGoalsForm.preferred_industry,
        preferred_workplace: careerGoalsForm.preferred_workplace,
        preferred_locations: Array.isArray(careerGoalsForm.preferred_locations)
          ? careerGoalsForm.preferred_locations
          : [String(careerGoalsForm.preferred_locations)],
        target_salary_min: careerGoalsForm.target_salary_min,
        target_salary_max: careerGoalsForm.target_salary_max,
        employment_type: careerGoalsForm.employment_type,
        short_term_goal: careerGoalsForm.short_term_goal,
        long_term_goal: careerGoalsForm.long_term_goal,
      });
      setIsEditCareerGoalsModalOpen(false);
      showToast('Career goal updated. Skill gaps recalculated.');
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to update career goals.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Outcome Handlers
  const handleAddOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee || !outcomeForm.organization_or_venture || !outcomeForm.role_or_course) return;
    setIsSubmitting(true);
    try {
      const res = await api.addOutcome(trainee.id, {
        ...outcomeForm,
        verification_status: (userRole === 'COACH' || userRole === 'ADMIN' || isVerifierOrAuditor) ? 'verified' : 'pending',
      });
      if (res) setTrainee(res);
      setIsOutcomeModalOpen(false);
      showToast(
        (userRole === 'COACH' || userRole === 'ADMIN' || isVerifierOrAuditor)
          ? 'Outcome registered and officially verified in Trainee Passport.'
          : 'Employment outcome submitted to Trainee Passport. Awaiting authority verification.'
      );
      setOutcomeForm({
        outcome_type: 'employment',
        organization_or_venture: '',
        role_or_course: '',
        compensation_or_funding: '',
        start_date: new Date().toISOString().split('T')[0],
        is_current: true,
        verification_status: 'verified',
        verification_notes: '',
      });
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit outcome.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee || !selectedOutcomeToEdit) return;
    setIsSubmitting(true);
    try {
      await api.updateTraineeOutcome(trainee.id, selectedOutcomeToEdit.id, outcomeForm);
      setIsEditOutcomeModalOpen(false);
      setSelectedOutcomeToEdit(null);
      showToast('Outcome updated. Status pending verification.');
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to update outcome.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee || !selectedOutcomeToVerify) return;
    setIsSubmitting(true);
    try {
      await api.verifyTraineeOutcome(trainee.id, selectedOutcomeToVerify.id, {
        verification_status: 'verified',
        confirmed_role: verifyOutcomeRole || selectedOutcomeToVerify.role_or_course,
        verification_notes: verifyOutcomeNotes || 'Verified by authorized workforce partner / employer.',
      });
      setIsVerifyOutcomeModalOpen(false);
      setSelectedOutcomeToVerify(null);
      setVerifyOutcomeNotes('');
      setVerifyOutcomeRole('');
      showToast('Outcome verified by authorized representative.');
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to verify outcome.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Follow-Up Handlers
  const handleRespondFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee || !selectedFollowUpToRespond) return;
    setIsSubmitting(true);
    try {
      await api.respondToFollowUp(trainee.id, selectedFollowUpToRespond.id, followUpResponseForm);
      setIsFollowUpResponseModalOpen(false);
      setSelectedFollowUpToRespond(null);
      showToast('Follow-up response submitted. Retention confirmed.');
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit follow-up response.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee || !followUpForm.counselor_notes) return;
    setIsSubmitting(true);
    try {
      const res = await api.addFollowUp(trainee.id, followUpForm);
      if (res) setTrainee(res);
      setIsFollowUpModalOpen(false);
      showToast('Follow-up checkpoint recorded.');
      setFollowUpForm({
        checkpoint_type: '90-Day Retention Audit',
        date: new Date().toISOString().split('T')[0],
        counselor_name: 'Workforce Counselor',
        status: 'completed',
        retention_confirmed: true,
        wage_progressed: false,
        counselor_notes: '',
      });
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to add follow-up.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAssess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee || !assessForm.assessment_name) return;
    setIsSubmitting(true);
    try {
      const res = await api.addAssessment(trainee.id, assessForm);
      if (res) setTrainee(res);
      setIsAssessModalOpen(false);
      showToast('Coursework evaluation recorded.');
      setAssessForm({
        assessment_name: '',
        date: new Date().toISOString().split('T')[0],
        score: 90,
        max_score: 100,
        grade: 'A',
        evaluator: 'Lead Instructor',
        feedback: '',
      });
      await loadTrainee();
    } catch (err: any) {
      showToast(err.message || 'Failed to add assessment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Retrieving Trainee Outcome Passport & Longitudinal Record..." />;
  }

  if (!trainee) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-12">
        <ErrorState
          title="Outcome Passport Not Found"
          message={`No verified record matches ID "${id}".`}
        />
        <div className="flex justify-center">
          <Button variant="primary" onClick={() => navigate('/trainees')}>
            Return to Passports Directory
          </Button>
        </div>
      </div>
    );
  }

  const name = trainee.fullName || trainee.full_name || 'Trainee';
  const avatar = trainee.avatarUrl || trainee.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const outcomeConfig = outcomeLabels[trainee.primary_outcome_type || trainee.status] || outcomeLabels.employment;
  const OutcomeIcon = outcomeConfig.icon;

  // Dynamic counts for tabs
  const trainingCount = trainingRecords.length > 0 ? trainingRecords.length : (trainee.training_details ? 1 : 0);
  const skillsCount = trainee.skills?.length || 0;
  const certsCount = trainee.certifications?.length || 0;
  const totalSkillsAndCerts = skillsCount + certsCount;
  const outcomesCount = trainee.outcome_history?.length || 0;
  const followUpsCount = (trainee.follow_up_history?.length || 0) + timelineEvents.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg transition-all animate-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : notification.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-500/20'
              : 'bg-brand-600 text-white shadow-brand-500/20'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Bar: Back button, Role Badge, Passport ID */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate('/trainees')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Outcome Passports Directory</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Active User Role Tag */}
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            Role: <span className="text-brand-700 font-extrabold">{userRole}</span>
          </span>

          <span
            title="System-controlled immutable identifier. Cannot be modified."
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm"
          >
            <Lock className="w-3 h-3 text-slate-400" />
            PASSPORT ID: {trainee.id}
          </span>
          <button
            onClick={() => navigate(`/digital-twin/${trainee.id}`)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 px-3 py-1 rounded-lg shadow-sm transition-all cursor-pointer"
            title="Open Career Outcome Digital Twin"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Twin</span>
          </button>
          <Badge variant="brand" size="sm">
            WIOA Title I Verified ✓
          </Badge>
        </div>
      </div>

      {/* Trainee Passport Hero Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <img
              src={avatar}
              alt={name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-brand-100 shadow-md shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {name}
                </h1>
                <Badge variant={outcomeConfig.variant} size="md">
                  <OutcomeIcon className="w-3.5 h-3.5" />
                  <span>{outcomeConfig.label}</span>
                </Badge>
                {/* Visual state badge */}
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  [Verified Record]
                </span>
              </div>

              <p className="text-sm font-bold text-brand-700 mt-1">
                {trainee.program} • <span className="text-slate-500 font-semibold">{trainee.cohort}</span>
              </p>

              {trainee.bio && (
                <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">
                  {trainee.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3 font-medium">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {trainee.email}
                </span>
                {trainee.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {trainee.phone}
                  </span>
                )}
                {trainee.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {trainee.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Enrolled: {trainee.enrollmentDate || trainee.enrollment_date}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons & Outcome Match Card */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            {/* Edit Profile Action Button */}
            {canEditProfileAndGoals && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditProfileModalOpen(true)}
                className="font-bold border-brand-200 text-brand-700 hover:bg-brand-50"
                icon={<Edit3 className="w-3.5 h-3.5" />}
              >
                Edit Profile
              </Button>
            )}

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-4 bg-brand-50/60 rounded-2xl border border-brand-100 shrink-0 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-brand-700 uppercase tracking-wider">
                Outcome Match Score
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-brand-900">
                  {trainee.matchScore || trainee.match_score || 90}%
                </span>
                <span className="text-xs text-brand-600 font-bold">/ 100</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Verified Competency: {trainee.overallScore || trainee.overall_score || 85}
              </span>
            </div>
          </div>
        </div>

        {/* Current Verified Placement / Outcome Strip */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Current Longitudinal Status
            </span>
            <span className="text-sm font-extrabold text-slate-800 capitalize mt-0.5 block">
              {trainee.status === 'placed'
                ? 'Employed / Placed'
                : trainee.status === 'outcome_unknown'
                ? 'Outcome Unknown (Triage)'
                : trainee.status.replace('_', ' ')}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Current Role / Venture
            </span>
            <span className="text-sm font-bold text-brand-700 mt-0.5 block truncate">
              {trainee.currentRole || trainee.current_role || (trainee.career_preference?.target_roles?.[0] || 'In Workforce Training')}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Reported Compensation Band
            </span>
            <span className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              {trainee.placementSalary || trainee.placement_salary || 'Competitive Band'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar - All Dynamic Counts */}
      <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-card overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview & Passport' },
          { key: 'training', label: `Training Programme & Provider (${trainingCount})` },
          { key: 'skills', label: `Skills & Certifications (${totalSkillsAndCerts})` },
          { key: 'career', label: 'Career Pathway & Goals' },
          { key: 'outcomes', label: `Outcome History (${outcomesCount})` },
          { key: 'followups', label: `Follow-Ups & Audits (${followUpsCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="space-y-6">
        
        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW & PASSPORT */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              {/* Consent Component */}
              <ConsentCard
                consent={trainee.consent_status}
                traineeName={name}
                onUpdateConsent={handleUpdateConsent}
              />

              {/* Personal & Career Preferences Information */}
              <Card
                title="Personal & Profile Information"
                subtitle="Trainee-owned details verified by longitudinal audit history"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditProfileModalOpen(true)}
                    className="font-bold"
                    icon={<Edit3 className="w-3.5 h-3.5" />}
                  >
                    Edit Profile
                  </Button>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Full Legal Name</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">[Editable]</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 mt-1 block">{name}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Contact Email</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">[Editable]</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 mt-1 block">{trainee.email}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Contact Phone</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">[Editable]</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 mt-1 block">{trainee.phone || '+91 98765 43210'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Current Location</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">[Editable]</span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 mt-1 block">{trainee.location || 'Bengaluru, KA'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Outcome Passport ID</span>
                      <span className="text-[9px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> [Locked]
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900 mt-1 block">{trainee.id}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Passport Status</span>
                      <span className="text-[9px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">[System Generated]</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 mt-1 block flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> WIOA Title I Verified & Audited
                    </span>
                  </div>
                </div>
              </Card>

              {/* Verified Skills Preview */}
              <Card
                title="Verified Technical Competencies"
                subtitle="Mastery scores audited by coursework assessments, resume evidence, and rubrics"
                action={
                  <button
                    onClick={() => setActiveTab('skills')}
                    className="text-xs font-bold text-brand-600 hover:underline"
                  >
                    View All ({trainee.skills.length})
                  </button>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {trainee.skills.map((s, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{s.name}</span>
                          {s.verified ? (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">[Verified]</span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">[Pending]</span>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 capitalize">{s.level}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-700">{s.score}%</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column: Training & Pathway Snippets */}
            <div className="lg:col-span-4 space-y-6">
              {/* Training Provider Card */}
              <Card title="Training Institution">
                <div className="space-y-3 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Provider</span>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      {trainingRecords[0]?.provider_name || trainee.training_details?.provider_name || 'ABC Skill Centre'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Accreditation</span>
                    <span className="font-semibold text-slate-700 block mt-0.5">
                      {trainee.training_details?.accreditation || 'National Skill Development Corporation (NSDC)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Attendance & Hours</span>
                    <span className="font-bold text-emerald-700 block mt-0.5">
                      {trainingRecords[0]?.attendance_percentage ? `${trainingRecords[0].attendance_percentage}%` : (trainee.training_details?.attendance_rate || '98.0%')} 
                      {' '}({trainingRecords[0]?.hours_completed || trainee.training_details?.hours_completed || 720} Clock Hours)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('training')}
                    className="w-full mt-2"
                  >
                    View All Training Records ({trainingCount})
                  </Button>
                </div>
              </Card>

              {/* Career Goal Card */}
              <Card title="Career Targets">
                <div className="space-y-3 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Roles</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(trainee.career_preference?.target_roles || ['Data Analyst']).map((r, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-bold text-[11px]">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Preferred Mode</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      {trainee.career_preference?.preferred_workplace || 'Hybrid'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('career')}
                    className="w-full mt-2"
                  >
                    View Career Pathway & Goals
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TRAINING PROGRAMME & PROVIDER */}
        {/* ======================================================== */}
        {activeTab === 'training' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-3xl border border-slate-100 shadow-card">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                    Institutional Training History
                  </span>
                  <Badge variant="brand" size="sm">Dynamic Records ({trainingCount})</Badge>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Accredited Coursework & Provider Verifications
                </h3>
              </div>

              {canEditProfileAndGoals && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsAddTrainingModalOpen(true)}
                  className="font-bold bg-brand-500 hover:bg-brand-600 text-white"
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  + Add Training
                </Button>
              )}
            </div>

            {/* Training Cards Grid */}
            <div className="space-y-4">
              {trainingRecords.length === 0 ? (
                // Fallback default training card from profile
                <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                        {trainee.training_details?.provider_name || 'ABC Skill Centre'}
                      </span>
                      <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                        {trainee.program || 'Data Analytics & Intelligence'}
                      </h4>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Status: Verified ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Modality</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">{trainee.training_details?.modality || 'Hybrid'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Attendance</span>
                      <span className="font-bold text-emerald-700 mt-0.5 block">{trainee.training_details?.attendance_rate || '98.5%'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Completed Hours</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">{trainee.training_details?.hours_completed || 720} Hours</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Accreditation</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">NSDC Accredited</span>
                    </div>
                  </div>
                </div>
              ) : (
                trainingRecords.map((rec) => {
                  const isVerified = rec.verification_status === 'verified';
                  const isPending = rec.verification_status === 'pending';
                  return (
                    <div
                      key={rec.id}
                      className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-card transition-all space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">
                              {rec.provider_name}
                            </span>
                            {rec.batch && (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                Batch: {rec.batch}
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">
                            {rec.course_name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Source: <strong>{rec.source}</strong> • Dates: {rec.start_date || 'Enrolled'} — {rec.end_date || 'Ongoing'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Status: Verified ✓
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Status: Pending Verification ◷
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              Status: Rejected
                            </span>
                          )}

                          {/* Edit Training Action */}
                          {canEditProfileAndGoals && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTrainingRecord(rec);
                                setTrainingForm({
                                  course_name: rec.course_name,
                                  provider_name: rec.provider_name,
                                  batch: rec.batch || '',
                                  start_date: rec.start_date || '',
                                  end_date: rec.end_date || '',
                                  delivery_mode: rec.delivery_mode || 'Hybrid',
                                  completion_status: rec.completion_status || 'Completed',
                                  attendance_percentage: rec.attendance_percentage || 95.0,
                                  hours_completed: rec.hours_completed || 400,
                                  certificate_url: rec.certificate_url || '',
                                  description: rec.description || '',
                                });
                                setIsEditTrainingModalOpen(true);
                              }}
                              className="font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                              icon={<Edit3 className="w-3.5 h-3.5" />}
                            >
                              Edit
                            </Button>
                          )}

                          {/* Trainee Request Verification Action */}
                          {userRole === 'TRAINEE' && isPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRequestTrainingVerification(rec.id)}
                              className="font-bold border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                              icon={<Clock className="w-3.5 h-3.5 text-amber-600" />}
                            >
                              Request Verification
                            </Button>
                          )}

                          {/* Authority Verification Action */}
                          {canVerifyTrainingAndSkills && isPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTrainingRecord(rec);
                                setIsVerifyTrainingModalOpen(true);
                              }}
                              className="font-bold border-brand-200 text-brand-700 hover:bg-brand-50"
                              icon={<Check className="w-3.5 h-3.5" />}
                            >
                              Verify Training
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Training Metrics Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Completion Status</span>
                          <span className="font-bold text-slate-800 mt-0.5 block">{rec.completion_status}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Delivery Mode</span>
                          <span className="font-bold text-slate-800 mt-0.5 block">{rec.delivery_mode || 'Hybrid'}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Clock Hours</span>
                          <span className="font-bold text-slate-800 mt-0.5 block">{rec.hours_completed || 400} Hours</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Attendance Rate</span>
                          <span className="font-bold text-emerald-700 mt-0.5 block">{rec.attendance_percentage ? `${rec.attendance_percentage}%` : '96.0%'}</span>
                        </div>
                      </div>

                      {rec.verified_by && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <strong>Verification Audit:</strong> Officially confirmed by <em>{rec.verified_by}</em> on {rec.verified_at}. {rec.verification_notes}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Assessment History */}
            <Card
              title="Coursework Assessment & Evaluation History"
              subtitle="Rubric-scored examinations, lab practicals, and capstone presentations"
              action={
                canManageTrainingAndAssessments && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAssessModalOpen(true)}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Evaluation
                  </Button>
                )
              }
            >
              <div className="space-y-3 pt-1">
                {(trainee.assessments || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No assessments recorded yet.</p>
                ) : (
                  (trainee.assessments || []).map((asm, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">{asm.assessment_name}</h4>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          {asm.score} / {asm.max_score} ({asm.grade})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Evaluated on {asm.date} by {asm.evaluator}
                      </p>
                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                        "{asm.feedback}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SKILLS & CERTIFICATIONS */}
        {/* ======================================================== */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            {/* Action Bar: Add Skill, Add Cert, Analyze Resume, Soft-Skill */}
            <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                    Evidence-Backed Skill Horizon
                  </span>
                  <Badge variant="brand" size="sm">Dynamic Total: {totalSkillsAndCerts}</Badge>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Skills & Certifications ({totalSkillsAndCerts})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canEditProfileAndGoals && (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsAddSkillModalOpen(true)}
                      className="font-bold bg-brand-500 hover:bg-brand-600 text-white"
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      + Add Skill
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsCertModalOpen(true)}
                      className="font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      + Add Certification
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAnalyzeResumeModalOpen(true)}
                      className="font-bold border-purple-200 text-purple-700 bg-purple-50/50 hover:bg-purple-50"
                      icon={<Sparkles className="w-3.5 h-3.5 text-purple-600" />}
                    >
                      Analyze Resume
                    </Button>
                  </>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRecalculateSkills}
                  disabled={isRecalculating}
                  className="font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                  icon={<RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRecalculating ? 'animate-spin' : ''}`} />}
                >
                  Recalculate
                </Button>
              </div>
            </div>

            {/* Top Grid: Skill Radar Chart + Certifications Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Radar Chart */}
              <div className="lg:col-span-7">
                {radarProfile && radarProfile.radar_data.length > 0 ? (
                  <SkillRadarChart
                    data={radarProfile.radar_data}
                    traineeName={name}
                  />
                ) : (
                  <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-card text-center text-slate-400 text-xs italic">
                    Loading Skill Radar data...
                  </div>
                )}
              </div>

              {/* Certifications Card */}
              <div className="lg:col-span-5">
                <Card
                  title={`Professional Certifications (${certsCount})`}
                  subtitle="Vendor-issued and state-accredited credentials"
                  action={
                    canEditProfileAndGoals && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsCertModalOpen(true)}
                        icon={<Plus className="w-3.5 h-3.5" />}
                      >
                        Add Credential
                      </Button>
                    )
                  }
                >
                  <div className="space-y-3 pt-1">
                    {(trainee.certifications || []).length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No certifications registered yet.</p>
                    ) : (
                      (trainee.certifications || []).map((c, i) => (
                        <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{c.title}</h4>
                            <Badge variant={c.status === 'Active' || c.status === 'verified' ? 'brand' : 'neutral'} size="sm">
                              {c.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-semibold text-brand-700">
                            {c.issuing_organization}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                            <span>Issued: {c.issue_date}</span>
                            {c.credential_id && (
                              <span className="font-mono text-slate-500 font-bold">
                                {c.credential_id}
                              </span>
                            )}
                          </div>
                          {canVerifyTrainingAndSkills && c.status !== 'verified' && c.verification_status !== 'verified' && (
                            <div className="pt-2 border-t border-slate-200/60 flex justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedCertToVerify(c);
                                  setVerifyCertNotes('');
                                  setIsVerifyCertModalOpen(true);
                                }}
                                className="text-[11px] py-1 px-2.5 font-bold text-brand-700 border-brand-200 hover:bg-brand-50"
                                icon={<CheckCircle2 className="w-3 h-3" />}
                              >
                                Verify Credential
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* Main Multi-Source Skill Evidence Grid */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Unified Multi-Source Skill Inventory ({skillsCount})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Each skill fuses evidence from Coursework, Projects, Resume Analyzer, Coach Assessment, and Employer Feedback.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  Canonical Taxonomy Mapped
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {trainee.skills.map((s, idx) => {
                  const isVerified = s.verified;
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-900">{s.name}</h4>
                            {isVerified ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                ✓ Verified
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                ◷ Pending Verification
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400 capitalize">
                            Proficiency Level: {s.level} • Score: {s.score}/100
                          </span>
                        </div>

                        {/* Assess & Verify Skill Button */}
                        {canVerifyTrainingAndSkills && !isVerified && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSkillToVerify({
                                id: s.skillId || s.skill_id || `sk-${idx}`,
                                name: s.name,
                                currentScore: s.score / 20,
                              });
                              setVerifySkillForm({ score: s.score / 20 || 4.0, notes: '' });
                              setIsVerifySkillModalOpen(true);
                            }}
                            className="text-xs font-bold border-brand-200 text-brand-700 hover:bg-brand-50"
                          >
                            Assess & Verify
                          </Button>
                        )}
                      </div>

                      {/* Multi-Source Pills */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Corroborating Evidence Sources:
                        </span>
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Resume Analyzer (86% confidence)
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5" /> Coursework Lab
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Project Evidence
                          </span>
                          {isVerified && (
                            <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200 flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5" /> Coach Evaluation 4.0/5
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Scoring Matrix Table */}
            {radarProfile && (
              <SkillScoringMatrix
                skills={radarProfile.skills_matrix}
                traineeName={name}
              />
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: CAREER PATHWAY & GOALS */}
        {/* ======================================================== */}
        {activeTab === 'career' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Career Preference Card */}
              <Card
                title="Career Ambition & Workplace Preferences"
                subtitle="The trainee owns and directs these preferences"
                action={
                  canEditProfileAndGoals && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditCareerGoalsModalOpen(true)}
                      className="font-bold border-brand-200 text-brand-700 hover:bg-brand-50"
                      icon={<Edit3 className="w-3.5 h-3.5" />}
                    >
                      Edit Career Goals
                    </Button>
                  )
                }
              >
                <div className="space-y-4 pt-1 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                      Target Employment Roles
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(trainee.career_preference?.target_roles || ['Data Analyst']).map((r, i) => (
                        <span key={i} className="px-3 py-1 rounded-xl bg-brand-50 text-brand-800 font-bold text-xs border border-brand-200/50">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Workplace Mode</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {trainee.career_preference?.preferred_workplace || 'Hybrid'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Compensation</span>
                      <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                        {trainee.career_preference?.target_salary_min || '₹4,50,000'} - {trainee.career_preference?.target_salary_max || '₹7,00,000'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                      Preferred Hiring Sectors
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(trainee.career_preference?.target_industries || ['FinTech & Analytics', 'Enterprise SaaS']).map((ind, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                      Preferred Geographic Locations
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(trainee.career_preference?.preferred_locations || ['Bengaluru, KA', 'Chennai, TN']).map((loc, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" /> {loc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Pathway Progression Status */}
              <Card title="Longitudinal Pathway Progression">
                <div className="space-y-4 pt-1">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50 to-sky-50 border border-brand-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-extrabold text-brand-900">
                        {trainee.current_pathway?.title || 'Data Analytics & Intelligence Pathway'}
                      </span>
                      <span className="font-black text-brand-700">
                        {trainee.current_pathway?.progress_percent || 70}% Complete
                      </span>
                    </div>

                    <div className="w-full bg-white rounded-full h-2.5 overflow-hidden my-2 border border-brand-200/50">
                      <div
                        className="bg-brand-500 h-full rounded-full transition-all"
                        style={{ width: `${trainee.current_pathway?.progress_percent || 70}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2">
                      <span>Current Stage: <strong>{trainee.current_pathway?.current_stage || 'Capstone Defense'}</strong></span>
                      <span className="text-brand-700 font-bold">
                        Target Role: {trainee.career_preference?.target_roles?.[0] || 'Data Analyst'}
                      </span>
                    </div>
                  </div>

                  {/* Visual Pathway Progression Chain */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Career Progression Architecture:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-bold">
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-800">
                        1. Current Profile ✓
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-800">
                        2. Verified Skills ✓
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-800">
                        3. Required Role Skills
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-brand-700">
                        4. Skill Gap Recalculation
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-800">
                        5. Recommended Learning
                      </div>
                      <div className="p-2 rounded-lg bg-brand-50 border border-brand-200 text-brand-900 font-extrabold">
                        6. Target Placement
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: OUTCOME HISTORY */}
        {/* ======================================================== */}
        {activeTab === 'outcomes' && (
          <div className="space-y-6">
            {/* 8-STAGE INTERACTIVE OUTCOME TIMELINE */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                    <Compass className="w-3 h-3 text-indigo-400" /> Longitudinal Outcome Timeline
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-1">
                    End-to-End Trainee Outcome & Retention Journey
                  </h3>
                  <p className="text-xs text-slate-400">
                    Click any timeline stage to view source, audit verification, relevant skills, and outcome reasons.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/trainee/skill-gap')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 border border-slate-700 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Skill Gap Diagnostic
                </button>
              </div>

              {/* 8 Stages Stepper */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
                {[
                  {
                    key: 'training',
                    step: 1,
                    label: 'Training',
                    title: trainee.training_details?.course_title || 'Workforce Training',
                    date: trainee.enrollment_date || '2024-01-15',
                    source: trainee.training_details?.provider_name || 'TechSkill Institute',
                    status: 'Verified ✓',
                    skills: trainee.skills?.slice(0, 3).map(s => s.name) || ['Software Development', 'SQL'],
                    reason: undefined,
                    notes: 'Completed curriculum modules with 95% attendance'
                  },
                  {
                    key: 'assessment',
                    step: 2,
                    label: 'Assessment',
                    title: trainee.assessments?.[0]?.assessment_name || 'Standardized Capstone Practical',
                    date: trainee.assessments?.[0]?.date || '2024-05-20',
                    source: trainee.assessments?.[0]?.evaluator || 'Lead Evaluator',
                    status: 'Verified ✓',
                    skills: ['Practical Exam', 'System Design'],
                    reason: undefined,
                    notes: `Graded ${trainee.assessments?.[0]?.grade || 'A'} (${trainee.assessments?.[0]?.score || 92}/100)`
                  },
                  {
                    key: 'certification',
                    step: 3,
                    label: 'Certification',
                    title: trainee.certifications?.[0]?.title || 'Professional Certification',
                    date: trainee.certifications?.[0]?.issue_date || '2024-06-01',
                    source: trainee.certifications?.[0]?.issuing_organization || 'Accreditation Board',
                    status: 'Verified ✓',
                    skills: ['Certified Competency'],
                    reason: undefined,
                    notes: `Credential ID: ${trainee.certifications?.[0]?.credential_id || 'CERT-2024-9981'}`
                  },
                  {
                    key: 'job_search',
                    step: 4,
                    label: 'Job Search',
                    title: 'Active Job Transition',
                    date: '2024-06-15',
                    source: 'Workforce Portal Registry',
                    status: 'Observed',
                    skills: trainee.career_preference?.target_roles || ['Full Stack Developer'],
                    reason: trainee.status === 'seeking_job' || trainee.status === 'at_risk' ? 'Candidate seeking competitive role' : undefined,
                    notes: 'Applications submitted across regional tech sector'
                  },
                  {
                    key: 'employment',
                    step: 5,
                    label: 'Employment',
                    title: trainee.outcome_history?.[0]?.role_or_course || 'Junior Software Engineer',
                    date: trainee.outcome_history?.[0]?.start_date || '2024-07-01',
                    source: trainee.outcome_history?.[0]?.organization_or_venture || 'Apex Software Solutions',
                    status: trainee.outcome_history?.[0]?.verification_status || 'Verified',
                    skills: ['Spring Boot', 'SQL', 'Java'],
                    reason: trainee.outcome_history?.[0]?.verification_notes,
                    notes: `Compensation band: ${trainee.outcome_history?.[0]?.compensation_or_funding || 'Competitive'}`
                  },
                  {
                    key: 'retention',
                    step: 6,
                    label: 'Retention',
                    title: '90-Day Retention Checkpoint',
                    date: trainee.follow_up_history?.[0]?.date || '2024-10-01',
                    source: trainee.follow_up_history?.[0]?.counselor_name || 'Counseling Audit',
                    status: trainee.follow_up_history?.[0]?.retention_confirmed ? 'Verified Retained' : 'Status Stale',
                    skills: ['Workplace Stability', 'Skill Utilization'],
                    reason: undefined,
                    notes: trainee.follow_up_history?.[0]?.counselor_notes || 'Confirmed continued active employment'
                  },
                  {
                    key: 'progression',
                    step: 7,
                    label: 'Wage/Change',
                    title: trainee.follow_up_history?.[0]?.wage_progressed ? 'Wage Progression' : 'Milestone Wage Review',
                    date: '2025-01-15',
                    source: 'Longitudinal Wage Record',
                    status: 'Audited',
                    skills: ['Compensation Progression'],
                    reason: undefined,
                    notes: 'Annual compensation audit completed'
                  },
                  {
                    key: 'current_status',
                    step: 8,
                    label: 'Current Status',
                    title: `Status: ${(trainee.status || 'Active').toUpperCase().replace('_', ' ')}`,
                    date: '2026-10-03',
                    source: 'Digital Passport Registry',
                    status: 'Active',
                    skills: ['Portfolio Active'],
                    reason: trainee.status === 'at_risk' ? 'Skill Mismatch / Role Discrepancy Flagged' : undefined,
                    notes: 'Maintained longitudinal record'
                  }
                ].map((stageItem) => (
                  <button
                    key={stageItem.key}
                    type="button"
                    onClick={() => {
                      setSelectedTimelineStage({
                        id: trainee.outcome_history?.[0]?.id || trainee.id,
                        stage: stageItem.label,
                        title: stageItem.title,
                        date: stageItem.date,
                        source: stageItem.source,
                        verification_status: stageItem.status,
                        relevant_skills: stageItem.skills,
                        outcome_reason: stageItem.reason,
                        notes: stageItem.notes
                      });
                      setIsTimelineStageModalOpen(true);
                    }}
                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-indigo-950/60 border border-slate-700/80 hover:border-indigo-500 text-left transition group space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-300">
                        #{stageItem.step}
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-xs font-bold text-white truncate group-hover:text-indigo-200">
                      {stageItem.label}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {stageItem.date}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <Card
              title={`Verified Longitudinal Outcome History (${outcomesCount})`}
              subtitle="Full chronological documentation of direct employment, self-employment, freelancing, apprenticeships, ventures, and higher education"
              action={
                canManageOutcomes && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsOutcomeModalOpen(true)}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    + Add Outcome
                  </Button>
                )
              }
            >
              <div className="space-y-4 pt-1">
                {(trainee.outcome_history || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No outcome records documented.</p>
                ) : (
                  (trainee.outcome_history || []).map((out, idx) => {
                    const outConfig = outcomeLabels[out.outcome_type] || outcomeLabels.employment;
                    const OutIcon = outConfig.icon;
                    const isPending = out.verification_status === 'pending' || out.verification_status === 'unverified';
                    const isVerified = out.verification_status === 'verified';

                    return (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-card transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={outConfig.variant} size="sm">
                              <OutIcon className="w-3.5 h-3.5" />
                              <span>{outConfig.label}</span>
                            </Badge>
                            {out.is_current && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Current Active Outcome
                              </span>
                            )}
                            {isVerified ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> ✓ Verified
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> ◷ Pending Verification
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-extrabold text-slate-900">
                            {out.role_or_course}
                          </h3>
                          <p className="text-xs font-semibold text-brand-700 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" />
                            {out.organization_or_venture}
                          </p>

                          {out.verification_notes && (
                            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-w-xl">
                              <strong>Verification Audit:</strong> {out.verification_notes}
                            </p>
                          )}
                        </div>

                        {/* Right side compensation, dates & employer verify button */}
                        <div className="flex flex-col items-start md:items-end justify-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0">
                          <span className="text-sm font-black text-emerald-700">
                            {out.compensation_or_funding || 'Competitive Band'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {out.start_date} — {out.is_current ? 'Present' : out.end_date}
                          </span>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Trainee / Authority Edit Outcome Action */}
                            {canManageOutcomes && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOutcomeToEdit(out);
                                  setOutcomeForm({
                                    outcome_type: out.outcome_type,
                                    organization_or_venture: out.organization_or_venture,
                                    role_or_course: out.role_or_course,
                                    compensation_or_funding: out.compensation_or_funding || '',
                                    start_date: out.start_date || '',
                                    end_date: out.end_date || '',
                                    is_current: out.is_current,
                                    location: out.location || '',
                                    work_arrangement: out.work_arrangement || 'On-site',
                                    description: out.description || '',
                                    verification_status: out.verification_status,
                                    verification_notes: out.verification_notes || '',
                                  });
                                  setIsEditOutcomeModalOpen(true);
                                }}
                                className="font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                                icon={<Edit3 className="w-3.5 h-3.5" />}
                              >
                                Edit
                              </Button>
                            )}

                            {/* Employer / Coach / Authority Verification Action */}
                            {canVerifyOutcomes && isPending && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOutcomeToVerify(out);
                                  setVerifyOutcomeRole(out.role_or_course);
                                  setVerifyOutcomeNotes('');
                                  setIsVerifyOutcomeModalOpen(true);
                                }}
                                className="font-bold border-brand-200 text-brand-700 hover:bg-brand-50"
                                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              >
                                Verify Employment Outcome
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: FOLLOW-UPS & AUDITS */}
        {/* ======================================================== */}
        {activeTab === 'followups' && (
          <div className="space-y-6">
            {/* Sub-Section 1: Scheduled Follow-Ups */}
            <Card
              title={`Retention Follow-Ups & Longitudinal Case Log (${trainee.follow_up_history?.length || 0})`}
              subtitle="Scheduled 30, 90, 180, and 365-day post-training retention check-ins and wage progression validations"
              action={
                canManageTrainingAndAssessments && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsFollowUpModalOpen(true)}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    + Document Follow-up
                  </Button>
                )
              }
            >
              <div className="space-y-4 pt-1">
                {(trainee.follow_up_history || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No follow-ups recorded yet.</p>
                ) : (
                  (trainee.follow_up_history || []).map((flw, i) => {
                    const isPending = flw.status === 'scheduled' || flw.status === 'pending';
                    return (
                      <div
                        key={i}
                        className="p-5 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{flw.checkpoint_type}</h4>
                              <p className="text-[11px] text-slate-400">
                                Date: {flw.date} • Counselor / Lead: {flw.counselor_name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isPending ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                ◷ Survey Pending Response
                              </span>
                            ) : (
                              <Badge variant="success" size="sm">
                                Completed ✓
                              </Badge>
                            )}

                            {flw.retention_confirmed && (
                              <Badge variant="success" size="sm">
                                Retention Confirmed
                              </Badge>
                            )}

                            {/* Trainee "Respond" Action Button */}
                            {isPending && (userRole === 'TRAINEE' || canManageTrainingAndAssessments) && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setSelectedFollowUpToRespond(flw);
                                  setFollowUpResponseForm({
                                    employment_status: trainee.status?.toUpperCase() || 'EMPLOYED',
                                    current_role: trainee.currentRole || trainee.current_role || '',
                                    current_employer: trainee.currentEmployer || trainee.current_employer || '',
                                    current_salary: trainee.placementSalary || trainee.placement_salary || '',
                                    still_using_learned_skills: true,
                                    occupation_changed: false,
                                    additional_skills_needed: 'Advanced Cloud Data Warehousing',
                                    trainee_notes: '',
                                  });
                                  setIsFollowUpResponseModalOpen(true);
                                }}
                                className="font-bold bg-brand-500 hover:bg-brand-600 text-white"
                                icon={<Edit3 className="w-3 h-3" />}
                              >
                                Respond
                              </Button>
                            )}
                          </div>
                        </div>

                        {flw.counselor_notes && (
                          <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100 leading-relaxed">
                            "{flw.counselor_notes}"
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Sub-Section 2: Chronological Passport Timeline */}
            <Card
              title={`Chronological Passport Timeline (${timelineEvents.length} Events)`}
              subtitle="Auditable progression of training, skill milestones, certifications, and career outcomes"
            >
              <div className="space-y-4 pt-1">
                {timelineEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No passport timeline events generated yet.</p>
                ) : (
                  <div className="relative pl-6 border-l-2 border-brand-100 space-y-6">
                    {timelineEvents.map((ev, i) => (
                      <div key={i} className="relative group">
                        {/* Timeline node icon */}
                        <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-brand-500 border-2 border-white shadow-sm" />

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 hover:bg-white hover:shadow-card transition-all">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-brand-700 uppercase tracking-wider">
                              {ev.timestamp?.split('T')[0] || 'Recent'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-brand-50 text-brand-800 border border-brand-200">
                                {ev.actor_role}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {ev.verification_status}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-xs font-extrabold text-slate-900">
                            {ev.action}
                          </h4>

                          <p className="text-[11px] text-slate-500">
                            Actor: <strong>{ev.actor_name}</strong> • Entity: {ev.entity_type} {ev.notes ? `• ${ev.notes}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Sub-Section 3: Immutable Audit Trail */}
            <Card
              title={`Immutable Audit Trail & Compliance Ledger (${auditEvents.length} Records)`}
              subtitle="Permanent cryptographic compliance log for workforce boards, employers, and audit standards"
            >
              <div className="overflow-x-auto pt-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Actor & Role</th>
                      <th className="py-2.5 px-3">Event Type</th>
                      <th className="py-2.5 px-3">Action Description</th>
                      <th className="py-2.5 px-3">Entity</th>
                      <th className="py-2.5 px-3">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditEvents.map((audit, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {audit.timestamp?.split('T')[0]}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {audit.actor_name} <span className="text-brand-600 font-normal">({audit.actor_role})</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600">
                          {audit.event_type}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {audit.action}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-600">
                          {audit.entity_type}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">
                          {audit.verification_status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL: EDIT PROFILE */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        title="Edit Trainee Profile & Preferences"
        subtitle={`Update personal and career preferences for ${name}`}
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Legal Name <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
              </label>
              <input
                type="text"
                required
                value={profileForm.full_name || ''}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Outcome Passport ID <span className="text-[10px] font-bold text-slate-500">[Locked]</span>
              </label>
              <input
                type="text"
                disabled
                value={trainee.id}
                className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Email <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
              </label>
              <input
                type="email"
                required
                value={profileForm.email || ''}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
              </label>
              <input
                type="text"
                value={profileForm.phone || ''}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Current Location <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
              </label>
              <input
                type="text"
                value={profileForm.location || ''}
                onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                placeholder="e.g. Bengaluru, KA"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Employment Status <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
              </label>
              <select
                value={profileForm.employment_status || 'placed'}
                onChange={(e) => setProfileForm({ ...profileForm, employment_status: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="placed">Employed / Placed</option>
                <option value="self_employed">Self-Employed / Entrepreneur</option>
                <option value="apprentice">Registered Apprentice</option>
                <option value="further_education">Further Education</option>
                <option value="job_seeking">Job Seeking / In Transition</option>
                <option value="outcome_unknown">Outcome Unknown (Insufficient Data)</option>
                <option value="in_training">In Training</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Permanent / Residential Address <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
              </label>
              <input
                type="text"
                value={profileForm.address || ''}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                placeholder="e.g. 42 Indiranagar, 1st Stage"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Languages Spoken (comma separated) <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
              </label>
              <input
                type="text"
                value={Array.isArray(profileForm.languages) ? profileForm.languages.join(', ') : profileForm.languages || ''}
                onChange={(e) => setProfileForm({ ...profileForm, languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="e.g. English, Hindi, Kannada"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Education Information <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
              </label>
              <input
                type="text"
                value={profileForm.education || ''}
                onChange={(e) => setProfileForm({ ...profileForm, education: e.target.value })}
                placeholder="e.g. Bachelor of Computer Applications (BCA)"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Career Interests (comma separated) <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
              </label>
              <input
                type="text"
                value={Array.isArray(profileForm.career_interests) ? profileForm.career_interests.join(', ') : profileForm.career_interests || ''}
                onChange={(e) => setProfileForm({ ...profileForm, career_interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="e.g. Data Analytics, Business Intelligence, FinTech"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Preferred Industry <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
              </label>
              <input
                type="text"
                value={(profileForm.career_preference as any)?.preferred_industry || 'FinTech & Analytics'}
                onChange={(e) => setProfileForm({
                  ...profileForm,
                  career_preference: { ...(profileForm.career_preference || {}), preferred_industry: e.target.value }
                })}
                placeholder="e.g. FinTech & Analytics"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Remote / On-site Mode <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
              </label>
              <select
                value={(profileForm.career_preference as any)?.preferred_workplace || 'Hybrid'}
                onChange={(e) => setProfileForm({
                  ...profileForm,
                  career_preference: { ...(profileForm.career_preference || {}), preferred_workplace: e.target.value }
                })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Job Family <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
              </label>
              <input
                type="text"
                value={(profileForm.career_preference as any)?.target_job_family || 'Data & Analytics'}
                onChange={(e) => setProfileForm({
                  ...profileForm,
                  career_preference: { ...(profileForm.career_preference || {}), target_job_family: e.target.value }
                })}
                placeholder="e.g. Data & Analytics"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Professional Bio & Candidate Background <span className="text-[10px] font-bold text-emerald-600">[Editable]</span>
            </label>
            <textarea
              rows={3}
              value={profileForm.bio || ''}
              onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditProfileModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: EDIT TRAINING (PRESERVES VERIFIED VALUE IN HISTORY) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditTrainingModalOpen}
        onClose={() => {
          setIsEditTrainingModalOpen(false);
          setSelectedTrainingRecord(null);
        }}
        title="Edit Training Programme Record"
        subtitle={
          selectedTrainingRecord?.verification_status === 'verified'
            ? 'Note: Editing an already verified record resets status to pending verification and preserves the previous verified value in the immutable audit history.'
            : 'Update training details. Submitted changes will be audited.'
        }
      >
        <form onSubmit={handleUpdateTraining} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Programme / Course Name *
              </label>
              <input
                type="text"
                required
                value={trainingForm.course_name}
                onChange={(e) => setTrainingForm({ ...trainingForm, course_name: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Training Provider / Institute *
              </label>
              <input
                type="text"
                required
                value={trainingForm.provider_name}
                onChange={(e) => setTrainingForm({ ...trainingForm, provider_name: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Batch / Cohort
              </label>
              <input
                type="text"
                value={trainingForm.batch || ''}
                onChange={(e) => setTrainingForm({ ...trainingForm, batch: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={trainingForm.start_date || ''}
                onChange={(e) => setTrainingForm({ ...trainingForm, start_date: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={trainingForm.end_date || ''}
                onChange={(e) => setTrainingForm({ ...trainingForm, end_date: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Delivery Mode
              </label>
              <select
                value={trainingForm.delivery_mode || 'Hybrid'}
                onChange={(e) => setTrainingForm({ ...trainingForm, delivery_mode: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="Hybrid">Hybrid</option>
                <option value="In-Person">In-Person</option>
                <option value="Online Synchronous">Online Synchronous</option>
                <option value="Online Asynchronous">Online Asynchronous</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Completion Status
              </label>
              <select
                value={trainingForm.completion_status || 'Completed'}
                onChange={(e) => setTrainingForm({ ...trainingForm, completion_status: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="Completed">Completed</option>
                <option value="Enrolled">Enrolled / Ongoing</option>
                <option value="Deferred">Deferred</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Clock Hours Completed
              </label>
              <input
                type="number"
                value={trainingForm.hours_completed || 400}
                onChange={(e) => setTrainingForm({ ...trainingForm, hours_completed: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description & Coursework Notes
            </label>
            <textarea
              rows={2}
              value={trainingForm.description || ''}
              onChange={(e) => setTrainingForm({ ...trainingForm, description: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditTrainingModalOpen(false);
                setSelectedTrainingRecord(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Training Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: EDIT OUTCOME */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditOutcomeModalOpen}
        onClose={() => {
          setIsEditOutcomeModalOpen(false);
          setSelectedOutcomeToEdit(null);
        }}
        title="Edit Reported Outcome Record"
        subtitle="Update outcome information. Historical values are preserved in the immutable audit trail."
      >
        <form onSubmit={handleUpdateOutcome} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Outcome Classification *
              </label>
              <select
                value={outcomeForm.outcome_type || 'employment'}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome_type: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="employment">Direct Employment (W-2)</option>
                <option value="self_employment">Self-Employment / Freelance</option>
                <option value="freelancing">Independent Contracting</option>
                <option value="apprenticeship">Registered Apprenticeship</option>
                <option value="entrepreneurship">Venture Entrepreneurship</option>
                <option value="further_education">Further Education / Degree</option>
                <option value="research">Academic / Research Fellowship</option>
                <option value="other">Career Transition</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Organization / Employer *
              </label>
              <input
                type="text"
                required
                value={outcomeForm.organization_or_venture || ''}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, organization_or_venture: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Job Title / Placement Role *
              </label>
              <input
                type="text"
                required
                value={outcomeForm.role_or_course || ''}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, role_or_course: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Compensation / Salary Band
              </label>
              <input
                type="text"
                value={outcomeForm.compensation_or_funding || ''}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, compensation_or_funding: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={outcomeForm.start_date || ''}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, start_date: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Date (leave blank if current)
              </label>
              <input
                type="date"
                value={outcomeForm.end_date || ''}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, end_date: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="edit-is-current"
              checked={outcomeForm.is_current || false}
              onChange={(e) => setOutcomeForm({ ...outcomeForm, is_current: e.target.checked })}
              className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
            />
            <label htmlFor="edit-is-current" className="text-xs font-bold text-slate-700">
              This is the trainee's current active employment or venture
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditOutcomeModalOpen(false);
                setSelectedOutcomeToEdit(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Outcome Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: ADD TRAINING */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddTrainingModalOpen}
        onClose={() => setIsAddTrainingModalOpen(false)}
        title="Add Training Programme & Provider"
        subtitle={`Record course completion or current enrollment for ${name}`}
      >
        <form onSubmit={handleAddTraining} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Programme / Course Name *
              </label>
              <input
                type="text"
                required
                value={trainingForm.course_name}
                onChange={(e) => setTrainingForm({ ...trainingForm, course_name: e.target.value })}
                placeholder="e.g. Data Analytics & Business Intelligence"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Training Provider / Institute *
              </label>
              <input
                type="text"
                required
                value={trainingForm.provider_name}
                onChange={(e) => setTrainingForm({ ...trainingForm, provider_name: e.target.value })}
                placeholder="e.g. ABC Skill Centre"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Batch / Cohort
              </label>
              <input
                type="text"
                value={trainingForm.batch}
                onChange={(e) => setTrainingForm({ ...trainingForm, batch: e.target.value })}
                placeholder="e.g. Cohort 2026-Q1"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Delivery Mode
              </label>
              <select
                value={trainingForm.delivery_mode}
                onChange={(e) => setTrainingForm({ ...trainingForm, delivery_mode: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="Hybrid">Hybrid</option>
                <option value="Online">Online / Remote</option>
                <option value="In-Person">In-Person Classroom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Completion Status
              </label>
              <select
                value={trainingForm.completion_status}
                onChange={(e) => setTrainingForm({ ...trainingForm, completion_status: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Enrolled">Enrolled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={trainingForm.start_date}
                onChange={(e) => setTrainingForm({ ...trainingForm, start_date: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                End Date
              </label>
              <input
                type="date"
                value={trainingForm.end_date}
                onChange={(e) => setTrainingForm({ ...trainingForm, end_date: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Supporting Evidence / Description / Certificate URL
            </label>
            <textarea
              rows={2}
              value={trainingForm.description}
              onChange={(e) => setTrainingForm({ ...trainingForm, description: e.target.value })}
              placeholder="Course syllabus highlights, capstone description, or verifiable credential link..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <strong>Audit Policy:</strong> Trainee-entered training records are initially created with status <em>Pending Verification</em> until officially reviewed by an assigned coach or accredited provider.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddTrainingModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Submit Training Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: VERIFY TRAINING (COACH/ADMIN) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isVerifyTrainingModalOpen}
        onClose={() => setIsVerifyTrainingModalOpen(false)}
        title="Verify Training Programme Record"
        subtitle={`Official review of ${selectedTrainingRecord?.course_name} for ${name}`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
            <p><strong>Course:</strong> {selectedTrainingRecord?.course_name}</p>
            <p><strong>Provider:</strong> {selectedTrainingRecord?.provider_name}</p>
            <p><strong>Submitted by:</strong> {selectedTrainingRecord?.source}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Verification Notes & Provider Accreditation
            </label>
            <textarea
              rows={3}
              value={verifyTrainingNotes}
              onChange={(e) => setVerifyTrainingNotes(e.target.value)}
              placeholder="e.g. Official transcript and attendance confirmed with registrar..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleVerifyTraining('rejected')}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              isLoading={isSubmitting}
            >
              Reject Record
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleVerifyTraining('verified')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              isLoading={isSubmitting}
            >
              Verify Record ✓
            </Button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: ADD SKILL */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddSkillModalOpen}
        onClose={() => setIsAddSkillModalOpen(false)}
        title="+ Add Skill Competency"
        subtitle={`Add self-reported skill and practical evidence for ${name}`}
      >
        <form onSubmit={handleAddSkill} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Skill Name * (Automatically Mapped to Canonical Taxonomy)
            </label>
            <input
              type="text"
              required
              value={skillForm.skill_name}
              onChange={(e) => setSkillForm({ ...skillForm, skill_name: e.target.value })}
              placeholder="e.g. Python, SQL, Power BI, Statistics, Excel"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Normalizes equivalent synonyms (e.g. 'Python Programming' → 'Python') to maintain single-source taxonomy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={skillForm.category}
                onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="hard">Hard Technical Skill</option>
                <option value="soft">Soft Competency / Workplace Skill</option>
                <option value="domain">Domain Knowledge</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Self-Reported Rating: {skillForm.self_rating} / 5.0
              </label>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.5"
                value={skillForm.self_rating}
                onChange={(e) => setSkillForm({ ...skillForm, self_rating: parseFloat(e.target.value) })}
                className="w-full mt-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Practical Use Case & Evidence Notes
            </label>
            <textarea
              rows={3}
              value={skillForm.evidence_notes}
              onChange={(e) => setSkillForm({ ...skillForm, evidence_notes: e.target.value })}
              placeholder="Describe where and how you applied this skill (e.g. built end-to-end sales dashboard using Python Pandas and PostgreSQL)..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddSkillModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Add Skill to Passport
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: VERIFY SKILL (COACH) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isVerifySkillModalOpen}
        onClose={() => setIsVerifySkillModalOpen(false)}
        title="Assess & Verify Skill Competency"
        subtitle={`Official coach evaluation for ${selectedSkillToVerify?.name}`}
      >
        <form onSubmit={handleVerifySkill} className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
            <p><strong>Skill:</strong> {selectedSkillToVerify?.name}</p>
            <p><strong>Trainee:</strong> {name}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Audited Competency Score: {verifySkillForm.score} / 5.0
            </label>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.5"
              value={verifySkillForm.score}
              onChange={(e) => setVerifySkillForm({ ...verifySkillForm, score: parseFloat(e.target.value) })}
              className="w-full mt-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Coach Evaluation Notes & Rubric Feedback
            </label>
            <textarea
              rows={3}
              required
              value={verifySkillForm.notes}
              onChange={(e) => setVerifySkillForm({ ...verifySkillForm, notes: e.target.value })}
              placeholder="e.g. Demonstrated strong query optimization and window functions in lab practical..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsVerifySkillModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Certify Competency ✓
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: ANALYZE RESUME INTEGRATION */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAnalyzeResumeModalOpen}
        onClose={() => setIsAnalyzeResumeModalOpen(false)}
        title="Analyze Resume & Extract Skills"
        subtitle={`Integrate AI extraction directly into ${name}'s Outcome Passport`}
      >
        <form onSubmit={handleAnalyzeResume} className="space-y-4">
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2 text-xs text-purple-900">
            <div className="flex items-center gap-2 font-bold">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Automated Resume Intelligence Workflow
            </div>
            <p className="text-[11px] leading-relaxed">
              Upload PDF, DOCX, or TXT. AI extracts skills, normalizes them against the canonical taxonomy, labels them as <em>AI Extracted</em>, and recalculates skill gaps against your target career role.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Upload Resume File (.pdf, .docx, .txt)
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-purple-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Or leave empty to run the built-in Data Analyst demonstration profile.
            </p>
          </div>

          {resumeAnalysisResult && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Extraction Complete!
              </span>
              <p className="text-slate-600">
                Detected <strong>{resumeAnalysisResult.extracted_skills?.length || 0} skills</strong>:
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(resumeAnalysisResult.extracted_skills || []).map((sk: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAnalyzeResumeModalOpen(false)}>
              Close
            </Button>
            <Button type="submit" variant="primary" isLoading={resumeAnalyzing} className="bg-purple-600 hover:bg-purple-700 text-white">
              {resumeAnalyzing ? 'Analyzing Resume...' : 'Run Resume Analysis'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: EDIT CAREER GOALS */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditCareerGoalsModalOpen}
        onClose={() => setIsEditCareerGoalsModalOpen(false)}
        title="Edit Career Pathway & Goals"
        subtitle={`Set target role and preferences to synchronize real-time skill gaps`}
      >
        <form onSubmit={handleSaveCareerGoals} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Role / Occupation *
              </label>
              <input
                type="text"
                required
                value={careerGoalsForm.target_occupation || ''}
                onChange={(e) => setCareerGoalsForm({ ...careerGoalsForm, target_occupation: e.target.value })}
                placeholder="e.g. Data Analyst"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Preferred Industry
              </label>
              <input
                type="text"
                value={careerGoalsForm.preferred_industry || ''}
                onChange={(e) => setCareerGoalsForm({ ...careerGoalsForm, preferred_industry: e.target.value })}
                placeholder="e.g. FinTech, Enterprise Analytics"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Workplace Mode
              </label>
              <select
                value={careerGoalsForm.preferred_workplace || 'Hybrid'}
                onChange={(e) => setCareerGoalsForm({ ...careerGoalsForm, preferred_workplace: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Salary Min
              </label>
              <input
                type="text"
                value={careerGoalsForm.target_salary_min || ''}
                onChange={(e) => setCareerGoalsForm({ ...careerGoalsForm, target_salary_min: e.target.value })}
                placeholder="e.g. ₹4,50,000"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Salary Max
              </label>
              <input
                type="text"
                value={careerGoalsForm.target_salary_max || ''}
                onChange={(e) => setCareerGoalsForm({ ...careerGoalsForm, target_salary_max: e.target.value })}
                placeholder="e.g. ₹7,00,000"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Short-Term Career Goal
            </label>
            <input
              type="text"
              value={careerGoalsForm.short_term_goal || ''}
              onChange={(e) => setCareerGoalsForm({ ...careerGoalsForm, short_term_goal: e.target.value })}
              placeholder="e.g. Secure role as Junior Data Analyst or Associate BI Developer"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <strong>Downstream Intelligence:</strong> Saving updates your pathway and recalculates skill gaps against the target role's market competencies.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditCareerGoalsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Career Goals
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: ADD OUTCOME */}
      {/* ======================================================== */}
      <Modal
        isOpen={isOutcomeModalOpen}
        onClose={() => setIsOutcomeModalOpen(false)}
        title="Record Trainee Outcome"
        subtitle={`Document placement, venture, freelancing, apprenticeship, or higher education for ${name}`}
      >
        <form onSubmit={handleAddOutcome} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Outcome Classification *
            </label>
            <select
              value={outcomeForm.outcome_type}
              onChange={(e) => setOutcomeForm({ ...outcomeForm, outcome_type: e.target.value as OutcomeType })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
            >
              <option value="employment">Direct Employment (W-2 / Salaried)</option>
              <option value="self_employment">Self-Employment (LLC / Sole Proprietor)</option>
              <option value="freelancing">Freelancing (Independent 1099 Contractor)</option>
              <option value="apprenticeship">Registered Apprenticeship (USDOL / State)</option>
              <option value="entrepreneurship">Venture Entrepreneurship (Incorporated Founder)</option>
              <option value="further_education">Further Education (Degree Matriculation / Fellowship)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Organization / Venture / University *
              </label>
              <input
                type="text"
                required
                value={outcomeForm.organization_or_venture}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, organization_or_venture: e.target.value })}
                placeholder="e.g. ABC Technologies"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Role / Field of Study *
              </label>
              <input
                type="text"
                required
                value={outcomeForm.role_or_course}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, role_or_course: e.target.value })}
                placeholder="e.g. Junior Data Analyst"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reported Wage / Compensation Band *
              </label>
              <input
                type="text"
                required
                value={outcomeForm.compensation_or_funding}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, compensation_or_funding: e.target.value })}
                placeholder="e.g. ₹5,50,000 / yr"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={outcomeForm.start_date}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, start_date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Verification Notes & Documentation Source
            </label>
            <textarea
              rows={3}
              value={outcomeForm.verification_notes}
              onChange={(e) => setOutcomeForm({ ...outcomeForm, verification_notes: e.target.value })}
              placeholder="e.g. Offer letter received; joining date verified..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOutcomeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Submit Outcome Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: VERIFY EMPLOYMENT OUTCOME (EMPLOYER/COACH) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isVerifyOutcomeModalOpen}
        onClose={() => setIsVerifyOutcomeModalOpen(false)}
        title="Verify Employment Outcome"
        subtitle={`Authorized workplace confirmation for ${name}`}
      >
        <form onSubmit={handleVerifyOutcome} className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
            <p><strong>Candidate:</strong> {name}</p>
            <p><strong>Organization:</strong> {selectedOutcomeToVerify?.organization_or_venture}</p>
            <p><strong>Reported Role:</strong> {selectedOutcomeToVerify?.role_or_course}</p>
            <p><strong>Start Date:</strong> {selectedOutcomeToVerify?.start_date}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Confirmed Job Role / Title
            </label>
            <input
              type="text"
              value={verifyOutcomeRole}
              onChange={(e) => setVerifyOutcomeRole(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Verification Audit Statement
            </label>
            <textarea
              rows={3}
              value={verifyOutcomeNotes}
              onChange={(e) => setVerifyOutcomeNotes(e.target.value)}
              placeholder="e.g. Confirmed employment and joining status as authorized employer representative."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsVerifyOutcomeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Confirm & Verify Employment ✓
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: VERIFY CERTIFICATION */}
      {/* ======================================================== */}
      <Modal
        isOpen={isVerifyCertModalOpen}
        onClose={() => setIsVerifyCertModalOpen(false)}
        title="Verify Professional Certification"
        subtitle={`Audit and officially validate certification credentials for ${name}`}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
            <p><strong>Candidate:</strong> {name}</p>
            <p><strong>Certification:</strong> {selectedCertToVerify?.title}</p>
            <p><strong>Issuing Organization:</strong> {selectedCertToVerify?.issuing_organization}</p>
            {selectedCertToVerify?.credential_id && (
              <p><strong>Credential ID:</strong> <span className="font-mono text-slate-700">{selectedCertToVerify?.credential_id}</span></p>
            )}
            {selectedCertToVerify?.verification_url && (
              <p><strong>Verification URL:</strong> <a href={selectedCertToVerify.verification_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">{selectedCertToVerify.verification_url}</a></p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Audit Notes & Verification Statement
            </label>
            <textarea
              rows={3}
              value={verifyCertNotes}
              onChange={(e) => setVerifyCertNotes(e.target.value)}
              placeholder="e.g. Credential verified against registry/issuing authority records."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsVerifyCertModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleVerifyCertification('rejected')}
              className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold"
            >
              Reject Credential
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleVerifyCertification('verified')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Verify Credential ✓
            </Button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: RESPOND TO FOLLOW-UP (7 STANDARDIZED QUESTIONS) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isFollowUpResponseModalOpen}
        onClose={() => setIsFollowUpResponseModalOpen(false)}
        title="Respond to Longitudinal Retention Audit"
        subtitle={`Standardized 7-question workforce retention survey for ${selectedFollowUpToRespond?.checkpoint_type}`}
      >
        <form onSubmit={handleRespondFollowUp} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Question 1 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              1. Current Employment Status *
            </label>
            <select
              value={followUpResponseForm.employment_status}
              onChange={(e) => setFollowUpResponseForm({ ...followUpResponseForm, employment_status: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
            >
              <option value="EMPLOYED">Employed (Full-time / Direct)</option>
              <option value="SELF_EMPLOYED">Self-Employed / Freelancer</option>
              <option value="APPRENTICE">Registered Apprentice</option>
              <option value="FURTHER_EDUCATION">Enrolled in Further Education</option>
              <option value="JOB_SEEKING">Job Seeking / Transitioning</option>
              <option value="NOT_IN_WORKFORCE">Not Currently in Workforce</option>
              <option value="OUTCOME_UNKNOWN">Outcome Unknown / Insufficient Data</option>
            </select>
          </div>

          {/* Question 2 & 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                2. Current Job Role / Title
              </label>
              <input
                type="text"
                value={followUpResponseForm.current_role || ''}
                onChange={(e) => setFollowUpResponseForm({ ...followUpResponseForm, current_role: e.target.value })}
                placeholder="e.g. Junior Data Analyst"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                3. Current Employer / Organization
              </label>
              <input
                type="text"
                value={followUpResponseForm.current_employer || ''}
                onChange={(e) => setFollowUpResponseForm({ ...followUpResponseForm, current_employer: e.target.value })}
                placeholder="e.g. ABC Technologies"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Question 4 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              4. Current Annual Salary / Income Band
            </label>
            <input
              type="text"
              value={followUpResponseForm.current_salary || ''}
              onChange={(e) => setFollowUpResponseForm({ ...followUpResponseForm, current_salary: e.target.value })}
              placeholder="e.g. ₹5,50,000 / yr"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Question 5 & 6 Radios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                5. Still actively using skills learned in program?
              </label>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={followUpResponseForm.still_using_learned_skills === true}
                    onChange={() => setFollowUpResponseForm({ ...followUpResponseForm, still_using_learned_skills: true })}
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={followUpResponseForm.still_using_learned_skills === false}
                    onChange={() => setFollowUpResponseForm({ ...followUpResponseForm, still_using_learned_skills: false })}
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                6. Have you shifted occupation or industry?
              </label>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={followUpResponseForm.occupation_changed === true}
                    onChange={() => setFollowUpResponseForm({ ...followUpResponseForm, occupation_changed: true })}
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={followUpResponseForm.occupation_changed === false}
                    onChange={() => setFollowUpResponseForm({ ...followUpResponseForm, occupation_changed: false })}
                  />
                  <span>No</span>
                </label>
              </div>
            </div>
          </div>

          {/* Question 7 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              7. What additional skills or advanced credentials do you currently require?
            </label>
            <input
              type="text"
              value={followUpResponseForm.additional_skills_needed || ''}
              onChange={(e) => setFollowUpResponseForm({ ...followUpResponseForm, additional_skills_needed: e.target.value })}
              placeholder="e.g. Advanced SQL, Power BI, Cloud Warehousing"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Additional Trainee Notes & Career Progression Details
            </label>
            <textarea
              rows={2}
              value={followUpResponseForm.trainee_notes || ''}
              onChange={(e) => setFollowUpResponseForm({ ...followUpResponseForm, trainee_notes: e.target.value })}
              placeholder="Any additional feedback or milestone details..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsFollowUpResponseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Submit Follow-Up Response
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: ADD CERTIFICATION */}
      {/* ======================================================== */}
      <Modal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        title="+ Add Professional Certification"
        subtitle={`Upload verified credential or licensure for ${name}`}
      >
        <form onSubmit={handleAddCert} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Certification Title *
            </label>
            <input
              type="text"
              required
              value={certForm.title}
              onChange={(e) => setCertForm({ ...certForm, title: e.target.value })}
              placeholder="e.g. NSDC Data Analytics Certificate"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Issuing Organization *
              </label>
              <input
                type="text"
                required
                value={certForm.issuing_organization}
                onChange={(e) => setCertForm({ ...certForm, issuing_organization: e.target.value })}
                placeholder="e.g. NSDC / Microsoft"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={certForm.issue_date}
                onChange={(e) => setCertForm({ ...certForm, issue_date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Credential ID / Roll Number
              </label>
              <input
                type="text"
                value={certForm.credential_id}
                onChange={(e) => setCertForm({ ...certForm, credential_id: e.target.value })}
                placeholder="e.g. NSDC-2024-DA-892"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Verification / Credential URL
              </label>
              <input
                type="url"
                value={certForm.verification_url}
                onChange={(e) => setCertForm({ ...certForm, verification_url: e.target.value })}
                placeholder="https://verify.nsdc.gov.in/certs/..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCertModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Register Credential
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: ADD FOLLOW-UP (COACH/ADMIN) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        title="Record Longitudinal Follow-Up"
        subtitle={`Audit retention, job satisfaction, and wage progression for ${name}`}
      >
        <form onSubmit={handleAddFollowUp} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Checkpoint Type *
              </label>
              <select
                value={followUpForm.checkpoint_type}
                onChange={(e) => setFollowUpForm({ ...followUpForm, checkpoint_type: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                <option value="30-Day Placement Retention Audit">30-Day Placement Retention Audit</option>
                <option value="60-Day Midterm Verification">60-Day Midterm Verification</option>
                <option value="90-Day Retention Audit">90-Day Retention Audit</option>
                <option value="180-Day Longitudinal Follow-Up">180-Day Longitudinal Follow-Up</option>
                <option value="365-Day Annual Wage Audit">365-Day Annual Wage Audit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Audit Date *
              </label>
              <input
                type="date"
                required
                value={followUpForm.date}
                onChange={(e) => setFollowUpForm({ ...followUpForm, date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Auditor / Case Counselor Name *
            </label>
            <input
              type="text"
              required
              value={followUpForm.counselor_name}
              onChange={(e) => setFollowUpForm({ ...followUpForm, counselor_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={followUpForm.retention_confirmed}
                onChange={(e) => setFollowUpForm({ ...followUpForm, retention_confirmed: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>Retention Confirmed (Candidate Active)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={followUpForm.wage_progressed}
                onChange={(e) => setFollowUpForm({ ...followUpForm, wage_progressed: e.target.checked })}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>Demonstrated Wage Progression / Promotion</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Case Counselor Notes & Audit Findings *
            </label>
            <textarea
              rows={3}
              required
              value={followUpForm.counselor_notes}
              onChange={(e) => setFollowUpForm({ ...followUpForm, counselor_notes: e.target.value })}
              placeholder="Candidate reported satisfactory onboarding, active deployment of learned skills..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFollowUpModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Certify Audit Entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: ADD EVALUATION / ASSESSMENT */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAssessModalOpen}
        onClose={() => setIsAssessModalOpen(false)}
        title="Add Rubric Evaluation"
        subtitle={`Record programmatic examination or capstone score for ${name}`}
      >
        <form onSubmit={handleAddAssess} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Assessment Name *
            </label>
            <input
              type="text"
              required
              value={assessForm.assessment_name}
              onChange={(e) => setAssessForm({ ...assessForm, assessment_name: e.target.value })}
              placeholder="e.g. Capstone Defense: Data Analytics Pipeline"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Achieved Score *
              </label>
              <input
                type="number"
                required
                value={assessForm.score}
                onChange={(e) => setAssessForm({ ...assessForm, score: parseFloat(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Max Score *
              </label>
              <input
                type="number"
                required
                value={assessForm.max_score}
                onChange={(e) => setAssessForm({ ...assessForm, max_score: parseFloat(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Letter Grade
              </label>
              <input
                type="text"
                value={assessForm.grade}
                onChange={(e) => setAssessForm({ ...assessForm, grade: e.target.value })}
                placeholder="A+"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Evaluator Feedback *
            </label>
            <textarea
              rows={3}
              required
              value={assessForm.feedback}
              onChange={(e) => setAssessForm({ ...assessForm, feedback: e.target.value })}
              placeholder="Instructor comments on demonstrated competencies..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssessModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Save Evaluation
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: SOFT SKILL SITUATIONAL ASSESSMENT */}
      {/* ======================================================== */}
      {trainee && (
        <SoftSkillAssessmentModal
          traineeId={trainee.id}
          traineeName={name}
          isOpen={isSoftSkillModalOpen}
          onClose={() => setIsSoftSkillModalOpen(false)}
          onAssessmentComplete={handleAssessmentComplete}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIGURABLE SCORING FORMULA WEIGHTS */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* MODAL: OUTCOME TIMELINE STAGE DETAILS & REASON LOGGING */}
      {/* ======================================================== */}
      <Modal
        isOpen={isTimelineStageModalOpen}
        onClose={() => setIsTimelineStageModalOpen(false)}
        title={selectedTimelineStage ? `${selectedTimelineStage.stage}: ${selectedTimelineStage.title}` : 'Timeline Stage Details'}
        subtitle={selectedTimelineStage ? `Recorded on ${selectedTimelineStage.date} via ${selectedTimelineStage.source}` : ''}
      >
        {selectedTimelineStage && (
          <div className="space-y-5 text-xs">
            {/* Stage Attributes Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Verification Status</span>
                <span className="font-bold text-emerald-700 mt-0.5 block flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {selectedTimelineStage.verification_status}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Event Date</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{selectedTimelineStage.date}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Audit Source</span>
                <span className="font-bold text-indigo-700 mt-0.5 block truncate">{selectedTimelineStage.source}</span>
              </div>
            </div>

            {/* Relevant Skills */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                Relevant Skills Assessed or Used
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedTimelineStage.relevant_skills.map((sk, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold">
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Stage Notes */}
            {selectedTimelineStage.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Stage Documentation Notes
                </span>
                <p className="text-slate-600 leading-relaxed">{selectedTimelineStage.notes}</p>
              </div>
            )}

            {/* Existing Outcome Reason Display */}
            {selectedTimelineStage.outcome_reason && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                <span className="text-[10px] font-bold text-amber-700 uppercase block mb-0.5">
                  Logged Outcome / Attrition Reason
                </span>
                <p className="font-semibold text-xs">{selectedTimelineStage.outcome_reason}</p>
              </div>
            )}

            {/* Record / Update Outcome Reason Form */}
            <form onSubmit={handleRecordTimelineReason} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Log / Update Outcome or Attrition Reason
                </span>
                <span className="text-[10px] text-slate-400">Syncs to Outcome Intelligence</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Canonical Reason Category
                </label>
                <select
                  value={timelineReasonKey}
                  onChange={(e) => {
                    setTimelineReasonKey(e.target.value);
                    const optText = e.target.options[e.target.selectedIndex].text;
                    setTimelineReasonLabel(optText);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="SKILL_MISMATCH">Skill Mismatch</option>
                  <option value="INSUFFICIENT_OPPORTUNITIES">Insufficient Local Job Opportunities</option>
                  <option value="INTERVIEW_DIFFICULTY">Interview / Communication Difficulty</option>
                  <option value="LOW_SALARY">Low Compensation / Below Wage Expectations</option>
                  <option value="LOCATION_CONSTRAINT">Location / Commute Constraints</option>
                  <option value="ROLE_MISMATCH">Role / Career Track Mismatch</option>
                  <option value="RELOCATION">Relocation / Migration</option>
                  <option value="FURTHER_EDUCATION">Higher Education / Continuing Studies</option>
                  <option value="HEALTH_PERSONAL">Personal / Family Responsibilities</option>
                  <option value="BETTER_OPPORTUNITY">Better Job Opportunity</option>
                  <option value="BUSINESS_INACTIVE">Self-Employment Business Inactive</option>
                  <option value="FUNDING_ISSUE">Self-Employment Funding / Cashflow Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Specific Observations or Context
                </label>
                <input
                  type="text"
                  placeholder="e.g. Candidate required additional Spring Boot framework training..."
                  value={timelineReasonNotes}
                  onChange={(e) => setTimelineReasonNotes(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsTimelineStageModalOpen(false);
                    navigate('/trainee/skill-gap');
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  Open Skill Gap Diagnostic <ArrowRight className="w-3 h-3" />
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingTimelineReason}
                >
                  Save Outcome Reason
                </Button>
              </div>
            </form>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTimelineStageModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
