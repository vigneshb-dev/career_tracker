import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
  RefreshCw
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
import { api } from '../services/api';
import {
  Trainee,
  OutcomeType,
  OutcomeRecord,
  Certification,
  AssessmentRecord,
  FollowUpAuditRecord,
  ConsentStatus,
  TraineeRadarProfile,
  ScoringConfiguration
} from '../types';

export const TraineeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'training' | 'skills' | 'career' | 'outcomes' | 'followups'>('overview');

  // Modals state
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isAssessModalOpen, setIsAssessModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Skill Scoring Engine state
  const [radarProfile, setRadarProfile] = useState<TraineeRadarProfile | null>(null);
  const [isSoftSkillModalOpen, setIsSoftSkillModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // New Outcome Form
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

  // New Follow-Up Form
  const [followUpForm, setFollowUpForm] = useState<Partial<FollowUpAuditRecord>>({
    checkpoint_type: '90-Day Retention Audit',
    date: new Date().toISOString().split('T')[0],
    counselor_name: 'Director Reynolds',
    status: 'completed',
    retention_confirmed: true,
    wage_progressed: false,
    counselor_notes: '',
  });

  // New Certification Form
  const [certForm, setCertForm] = useState<Partial<Certification>>({
    title: '',
    issuing_organization: '',
    issue_date: new Date().toISOString().split('T')[0],
    credential_id: '',
    verification_url: '',
    status: 'Active',
  });

  // New Assessment Form
  const [assessForm, setAssessForm] = useState<Partial<AssessmentRecord>>({
    assessment_name: '',
    date: new Date().toISOString().split('T')[0],
    score: 90,
    max_score: 100,
    grade: 'A',
    evaluator: 'Lead Instructor',
    feedback: '',
  });

  const loadTrainee = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [data, radar] = await Promise.all([
        api.getTraineeById(id),
        api.getTraineeRadarProfile(id)
      ]);
      if (data) {
        setTrainee(data);
      }
      if (radar) {
        setRadarProfile(radar);
      }
    } catch (err) {
      console.error('Error fetching trainee', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculateSkills = async () => {
    if (!id) return;
    setIsRecalculating(true);
    try {
      await api.recalculateTraineeSkills(id);
      const [data, radar] = await Promise.all([
        api.getTraineeById(id),
        api.getTraineeRadarProfile(id)
      ]);
      if (data) setTrainee(data);
      if (radar) setRadarProfile(radar);
    } catch (err) {
      console.error('Error recalculating skills', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleAssessmentComplete = (updatedProfile: TraineeRadarProfile) => {
    setRadarProfile(updatedProfile);
    if (id) {
      api.getTraineeById(id).then((t) => { if (t) setTrainee(t); });
    }
  };

  const handleConfigUpdated = (newConfig: ScoringConfiguration) => {
    if (id) {
      api.getTraineeRadarProfile(id).then((p) => { if (p) setRadarProfile(p); });
    }
  };

  useEffect(() => {
    loadTrainee();
  }, [id]);

  const handleUpdateConsent = async (updated: Partial<ConsentStatus>) => {
    if (!trainee) return;
    const res = await api.updateConsent(trainee.id, updated);
    if (res) setTrainee(res);
  };

  const handleAddOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainee || !outcomeForm.organization_or_venture || !outcomeForm.role_or_course) return;
    setIsSubmitting(true);
    try {
      const res = await api.addOutcome(trainee.id, outcomeForm);
      if (res) setTrainee(res);
      setIsOutcomeModalOpen(false);
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
      setFollowUpForm({
        checkpoint_type: '90-Day Retention Audit',
        date: new Date().toISOString().split('T')[0],
        counselor_name: 'Director Reynolds',
        status: 'completed',
        retention_confirmed: true,
        wage_progressed: false,
        counselor_notes: '',
      });
    } finally {
      setIsSubmitting(false);
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
      setCertForm({
        title: '',
        issuing_organization: '',
        issue_date: new Date().toISOString().split('T')[0],
        credential_id: '',
        verification_url: '',
        status: 'Active',
      });
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
      setAssessForm({
        assessment_name: '',
        date: new Date().toISOString().split('T')[0],
        score: 90,
        max_score: 100,
        grade: 'A',
        evaluator: 'Lead Instructor',
        feedback: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Retrieving Trainee Outcome Passport..." />;
  }

  if (!trainee) {
    return (
      <ErrorState
        title="Outcome Passport Not Found"
        message={`No verified record matches ID "${id}".`}
        onRetry={() => navigate('/trainees')}
      />
    );
  }

  const name = trainee.fullName || trainee.full_name || 'Trainee';
  const avatar = trainee.avatarUrl || trainee.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
  const outcomeType = (trainee.primary_outcome_type || 'employment') as OutcomeType;

  const outcomeLabels: Record<OutcomeType, { label: string; variant: BadgeVariant; icon: any }> = {
    employment: { label: 'Employment (Direct Hire)', variant: 'success', icon: Briefcase },
    self_employment: { label: 'Self-Employment', variant: 'purple', icon: Building2 },
    freelancing: { label: 'Freelancing', variant: 'brand', icon: Wrench },
    apprenticeship: { label: 'Registered Apprenticeship', variant: 'amber', icon: GraduationCap },
    entrepreneurship: { label: 'Venture Entrepreneurship', variant: 'danger', icon: Rocket },
    further_education: { label: 'Higher Education (Fellowship)', variant: 'neutral', icon: BookOpen },
  };

  const outcomeConfig = outcomeLabels[outcomeType] || outcomeLabels.employment;
  const OutcomeIcon = outcomeConfig.icon;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back button and Passport ID */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/trainees')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Outcome Passports Directory</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">
            PASSPORT ID: {trainee.id}
          </span>
          <Badge variant="brand" size="sm">
            WIOA Title I Verified
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

          {/* Quick Outcome Metric Card */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-4 bg-brand-50/60 rounded-2xl border border-brand-100 shrink-0">
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

        {/* Current Verified Placement / Outcome Strip */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Organization / Venture
            </span>
            <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-4 h-4 text-brand-600" />
              {trainee.currentEmployer || trainee.current_employer || 'Active Practice'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Verified Role / Specialization
            </span>
            <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <Briefcase className="w-4 h-4 text-brand-600" />
              {trainee.currentRole || trainee.current_role || 'Placed'}
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

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-card overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview & Passport' },
          { key: 'training', label: 'Training Programme & Provider' },
          { key: 'skills', label: `Skills & Certifications (${trainee.skills.length})` },
          { key: 'career', label: 'Career Pathway & Goals' },
          { key: 'outcomes', label: `Outcome History (${trainee.outcome_history?.length || 1})` },
          { key: 'followups', label: `Follow-Ups & Audits (${trainee.follow_up_history?.length || 0})` },
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
        
        {/* --- TAB 1: OVERVIEW --- */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              {/* Consent Component */}
              <ConsentCard
                consent={trainee.consent_status}
                traineeName={name}
                onUpdateConsent={handleUpdateConsent}
              />

              {/* Verified Skills Preview */}
              <Card
                title="Verified Technical Competencies"
                subtitle="Mastery scores audited by coursework assessments and industry rubrics"
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
                        <span className="text-xs font-bold text-slate-800 block">{s.name}</span>
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
                      {trainee.training_details?.provider_name || 'Bengaluru Institute of Technology & Advanced Skills'}
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
                      {trainee.training_details?.attendance_rate || '98.0%'} ({trainee.training_details?.hours_completed || 720} Clock Hours)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('training')}
                    className="w-full mt-2"
                  >
                    View Curriculum & Assessments
                  </Button>
                </div>
              </Card>

              {/* Career Goal Card */}
              <Card title="Career Targets">
                <div className="space-y-3 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Target Roles</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(trainee.career_preference?.target_roles || ['Software Engineer']).map((r, i) => (
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
                    View Pathway Progression
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* --- TAB 2: TRAINING --- */}
        {activeTab === 'training' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Accredited Course & Provider Information">
                <div className="space-y-4 pt-1 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <span className="text-[11px] font-bold text-brand-700 uppercase tracking-wider block">
                      Training Provider
                    </span>
                    <p className="text-base font-extrabold text-slate-900">
                      {trainee.training_details?.provider_name || 'State Workforce Partner Institute'}
                    </p>
                    <p className="text-slate-500">
                      Accreditation: <strong>{trainee.training_details?.accreditation || 'State Accredited'}</strong>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Instructional Modality</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {trainee.training_details?.modality || 'Hybrid'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Verified Attendance</span>
                      <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                        {trainee.training_details?.attendance_rate || '98.5%'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Instructor / Mentor</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {trainee.training_details?.instructor_name || 'Faculty Team'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Completed Hours</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {trainee.training_details?.hours_completed || 720} Hours
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Assessment History */}
              <Card
                title="Coursework Assessment & Evaluation History"
                subtitle="Rubric-scored examinations, lab practicals, and capstone presentations"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAssessModalOpen(true)}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Evaluation
                  </Button>
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
          </div>
        )}

        {/* --- TAB 3: SKILLS, RADAR & MULTI-SOURCE SCORING ENGINE --- */}
        {activeTab === 'skills' && (
          <div className="space-y-6">

            {/* Action Bar: Soft-Skill Assessment, Config, Recalculate */}
            <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                    Proficiency Scoring Engine
                  </span>
                  <Badge variant="brand" size="sm">Multi-Source Corroborated</Badge>
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Trainee Skill Horizon & Evidence Inventory
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                  icon={<Sliders className="w-3.5 h-3.5 text-slate-500" />}
                >
                  Formula Weights
                </Button>

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

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsSoftSkillModalOpen(true)}
                  className="font-bold bg-brand-500 hover:bg-brand-600 text-white"
                  icon={<BrainCircuit className="w-3.5 h-3.5" />}
                >
                  Take Soft-Skill Assessment (Rubric-based)
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
                  title="Official Professional Certifications"
                  subtitle="Vendor-issued and state-accredited credentials"
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsCertModalOpen(true)}
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Add Credential
                    </Button>
                  }
                >
                  <div className="space-y-3 pt-1">
                    {(trainee.certifications || []).length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No certifications registered.</p>
                    ) : (
                      (trainee.certifications || []).map((c, i) => (
                        <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-slate-900">{c.title}</h4>
                            <Badge variant="brand" size="sm">
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
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

            </div>

            {/* Main Scoring Matrix Table: Current Level | Target Level | Confidence | Evidence */}
            {radarProfile && (
              <SkillScoringMatrix
                skills={radarProfile.skills_matrix}
                traineeName={name}
              />
            )}

          </div>
        )}

        {/* --- TAB 4: CAREER PATHWAY --- */}
        {activeTab === 'career' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Career Preference Card */}
              <Card title="Career Ambition & Workplace Preferences">
                <div className="space-y-4 pt-1 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                      Target Employment Roles
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(trainee.career_preference?.target_roles || ['Full-Stack Engineer']).map((r, i) => (
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
                        {trainee.career_preference?.target_salary_min || '₹8,00,000'} - {trainee.career_preference?.target_salary_max || '₹12,00,000'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                      Preferred Hiring Sectors
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(trainee.career_preference?.target_industries || ['Enterprise SaaS', 'FinTech']).map((ind, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs">
                          {ind}
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
                        {trainee.current_pathway?.title || 'Modern Full-Stack Web Architecture'}
                      </span>
                      <span className="font-black text-brand-700">
                        {trainee.current_pathway?.progress_percent || 40}% Complete
                      </span>
                    </div>

                    <div className="w-full bg-white rounded-full h-2 overflow-hidden my-2 border border-brand-200/50">
                      <div
                        className="bg-brand-500 h-full rounded-full transition-all"
                        style={{ width: `${trainee.current_pathway?.progress_percent || 40}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2">
                      <span>Current Stage: <strong>{trainee.current_pathway?.current_stage || 'Apprentice'}</strong></span>
                      <span className="text-brand-700 font-bold">
                        Target: {trainee.current_pathway?.next_milestone || 'Engineer II'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 text-xs text-slate-600">
                    <p className="leading-relaxed">
                      Career trajectory milestones verified against employer partner retention audits and wage step increases.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* --- TAB 5: OUTCOMES HISTORY --- */}
        {activeTab === 'outcomes' && (
          <div className="space-y-6">
            <Card
              title="Verified Longitudinal Outcome History"
              subtitle="Full chronological documentation of direct employment, self-employment, freelancing, apprenticeships, ventures, and higher education"
              action={
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsOutcomeModalOpen(true)}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Record New Outcome
                </Button>
              }
            >
              <div className="space-y-4 pt-1">
                {(trainee.outcome_history || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No outcome records documented.</p>
                ) : (
                  (trainee.outcome_history || []).map((out, idx) => {
                    const outConfig = outcomeLabels[out.outcome_type] || outcomeLabels.employment;
                    const OutIcon = outConfig.icon;
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

                        {/* Right side compensation & dates */}
                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0">
                          <span className="text-sm font-black text-emerald-700">
                            {out.compensation_or_funding || 'Verified Band'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {out.start_date} — {out.is_current ? 'Present' : out.end_date}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified Evidence
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}

        {/* --- TAB 6: FOLLOW-UPS & AUDITS --- */}
        {activeTab === 'followups' && (
          <div className="space-y-6">
            <Card
              title="Retention Follow-Ups & Longitudinal Case Log"
              subtitle="Scheduled 30, 60, 90, and 180-day post-training retention check-ins and wage progression validations"
              action={
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsFollowUpModalOpen(true)}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Document Follow-up
                </Button>
              }
            >
              <div className="space-y-4 pt-1">
                {(trainee.follow_up_history || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No follow-ups recorded yet.</p>
                ) : (
                  (trainee.follow_up_history || []).map((flw, i) => (
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
                              Audited on {flw.date} by Case Officer {flw.counselor_name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {flw.retention_confirmed && (
                            <Badge variant="success" size="sm">
                              Retention Confirmed
                            </Badge>
                          )}
                          {flw.wage_progressed && (
                            <Badge variant="brand" size="sm">
                              Wage Progression
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-100 leading-relaxed">
                        "{flw.counselor_notes}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* --- MODAL 1: ADD OUTCOME --- */}
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
                placeholder="e.g. Apex Cloud Solutions"
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
                placeholder="e.g. Junior Frontend Engineer"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reported Wage / Stipend / Revenue *
              </label>
              <input
                type="text"
                required
                value={outcomeForm.compensation_or_funding}
                onChange={(e) => setOutcomeForm({ ...outcomeForm, compensation_or_funding: e.target.value })}
                placeholder="e.g. ₹8,40,000 / yr or ₹1,500/hr"
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
              placeholder="e.g. W-2 offer letter verified by counselor or platform invoice statements..."
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
              Certify Outcome Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: ADD FOLLOW-UP --- */}
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
                <option value="30-Day Check-in">30-Day Check-in</option>
                <option value="60-Day Check-in">60-Day Check-in</option>
                <option value="90-Day Retention Audit">90-Day Retention Audit (WIOA Standard)</option>
                <option value="180-Day Longitudinal Audit">180-Day Longitudinal Audit</option>
                <option value="1-Year Wage Progression Audit">1-Year Wage Progression Audit</option>
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

          <div className="flex items-center gap-6 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
              <input
                type="checkbox"
                checked={followUpForm.retention_confirmed}
                onChange={(e) => setFollowUpForm({ ...followUpForm, retention_confirmed: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <span>Retention Confirmed</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
              <input
                type="checkbox"
                checked={followUpForm.wage_progressed}
                onChange={(e) => setFollowUpForm({ ...followUpForm, wage_progressed: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <span>Wage Progression Documented</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Counselor Case Observation *
            </label>
            <textarea
              rows={4}
              required
              value={followUpForm.counselor_notes}
              onChange={(e) => setFollowUpForm({ ...followUpForm, counselor_notes: e.target.value })}
              placeholder="Record candidate feedback, supervisor feedback, hours worked, or promotional milestones..."
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
              Save Audit Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 3: ADD CERTIFICATION --- */}
      <Modal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        title="Add Professional Certification"
        subtitle={`Record verified industry credential for ${name}`}
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
              placeholder="e.g. AWS Certified Cloud Practitioner"
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
                placeholder="e.g. Amazon Web Services"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Credential ID / License
              </label>
              <input
                type="text"
                value={certForm.credential_id}
                onChange={(e) => setCertForm({ ...certForm, credential_id: e.target.value })}
                placeholder="AWS-CCP-12345"
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

      {/* --- MODAL 4: ADD ASSESSMENT --- */}
      <Modal
        isOpen={isAssessModalOpen}
        onClose={() => setIsAssessModalOpen(false)}
        title="Add Coursework Evaluation"
        subtitle={`Record rubric assessment for ${name}`}
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
              placeholder="e.g. Final Capstone Architecture Defense"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Score (out of 100) *
              </label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={assessForm.score}
                onChange={(e) => setAssessForm({ ...assessForm, score: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Grade Letter *
              </label>
              <input
                type="text"
                required
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

      {/* --- MODAL 5: SOFT SKILL SITUATIONAL ASSESSMENT --- */}
      {trainee && (
        <SoftSkillAssessmentModal
          traineeId={trainee.id}
          traineeName={name}
          isOpen={isSoftSkillModalOpen}
          onClose={() => setIsSoftSkillModalOpen(false)}
          onAssessmentComplete={handleAssessmentComplete}
        />
      )}

      {/* --- MODAL 6: CONFIGURABLE SCORING FORMULA WEIGHTS --- */}
      <ScoringConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onConfigUpdated={handleConfigUpdated}
      />
    </div>
  );
};
