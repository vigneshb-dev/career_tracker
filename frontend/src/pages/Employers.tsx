import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Briefcase,
  MapPin,
  Mail,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileCheck,
  Star,
  ExternalLink,
  ChevronRight,
  Plus,
  X,
  Search,
  Award,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  Sliders,
  FileText,
  BadgeAlert,
  ThumbsUp
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SearchInput } from '../components/common/SearchInput';
import { LoadingState } from '../components/common/LoadingState';
import { Card } from '../components/common/Card';
import { api } from '../services/api';
import {
  Employer,
  EmployerFeedbackVerification,
  EmployerVerificationCreatePayload,
  EvidenceHierarchySummary,
  PendingVerificationCandidate,
  EvidenceLevelType
} from '../types';

export const Employers: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<'candidates' | 'verifications' | 'employers'>('candidates');
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [selectedEmployerId, setSelectedEmployerId] = useState<string>('all');
  const [candidates, setCandidates] = useState<PendingVerificationCandidate[]>([]);
  const [verifications, setVerifications] = useState<EmployerFeedbackVerification[]>([]);
  const [evidenceHierarchy, setEvidenceHierarchy] = useState<EvidenceHierarchySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Verification Modal State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<PendingVerificationCandidate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Form Fields
  const [verifyStatus, setVerifyStatus] = useState<'confirmed' | 'disputed' | 'former_employee'>('confirmed');
  const [confirmedRole, setConfirmedRole] = useState('');
  const [confirmedDept, setConfirmedDept] = useState('Engineering & Tech Operations');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [salaryRange, setSalaryRange] = useState('₹8,40,000 / yr');
  const [isStillEmployed, setIsStillEmployed] = useState(true);
  const [retentionMonths, setRetentionMonths] = useState(6);

  // Reviewer credentials
  const [reviewerName, setReviewerName] = useState('Sunita Rao');
  const [reviewerRole, setReviewerRole] = useState('Engineering Director / VP People');
  const [reviewerEmail, setReviewerEmail] = useState('sunita.r@apexcloud.in');

  // Skill Ratings (0.0 to 5.0)
  const [skillRatings, setSkillRatings] = useState<Record<string, number>>({});
  const [newSkillName, setNewSkillName] = useState('');

  // Missing Skills
  const [missingTechSkills, setMissingTechSkills] = useState<string[]>([]);
  const [customTechInput, setCustomTechInput] = useState('');
  const [missingSoftSkills, setMissingSoftSkills] = useState<string[]>([]);
  const [customSoftInput, setCustomSoftInput] = useState('');

  // Training Relevance
  const [relevanceRating, setRelevanceRating] = useState<number>(4.8);
  const [relevanceNotes, setRelevanceNotes] = useState('');
  const [curriculumRecommendations, setCurriculumRecommendations] = useState('');
  const [wouldHireAgain, setWouldHireAgain] = useState(true);

  // Evidence Level & Artifacts
  const [selectedArtifacts, setSelectedArtifacts] = useState<string[]>(['offer_letter_signed.pdf']);

  // Detail Modal
  const [detailVerification, setDetailVerification] = useState<EmployerFeedbackVerification | null>(null);

  // Common quick-pick lists
  const commonTechGaps = [
    'Docker & Container Workflows',
    'CI/CD Pipeline Automation (GitHub Actions)',
    'Cloud IaC (Terraform / AWS)',
    'Automated Unit/E2E Testing (Playwright/Jest)',
    'Medium-Voltage Battery Storage Systems',
    'FHIR / HL7 Healthcare APIs',
    'Kubernetes Cluster Orchestration',
    'Redis Caching & Async Queues'
  ];

  const commonSoftGaps = [
    'Cross-Functional Stakeholder Communication',
    'Time Estimation in Agile Sprints',
    'Independent Troubleshooting Before Escalation',
    'Technical Documentation & Runbooks',
    'Client-Facing Architecture Demos',
    'Receiving & Iterating on Code Review Feedback'
  ];

  const commonArtifacts = [
    { id: 'offer_letter_signed.pdf', label: 'Signed Offer Letter / Employment Contract' },
    { id: 'twc_wage_corroboration.pdf', label: 'State Wage Registry / TWC Match Corroboration' },
    { id: 'w2_wage_record.pdf', label: 'W-2 Payroll Withholding Statement' },
    { id: 'apprenticeship_agreement_usdol.pdf', label: 'USDOL Registered Apprenticeship Agreement' },
    { id: 'capstone_defense_rubric.pdf', label: 'Industry Capstone Review Defense Rubric' }
  ];

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empList, verList, hierarchy, candidateList] = await Promise.all([
        api.getEmployers(),
        api.getEmployerVerifications(selectedEmployerId !== 'all' ? { employer_id: selectedEmployerId } : undefined),
        api.getEvidenceHierarchySummary(),
        api.getPendingCandidatesForEmployer(selectedEmployerId !== 'all' ? selectedEmployerId : 'EMP-01')
      ]);

      setEmployers(empList);
      setVerifications(verList);
      setEvidenceHierarchy(hierarchy);
      setCandidates(candidateList);
    } catch (err) {
      console.error('Failed to load employer portal data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEmployerId]);

  // Open modal for a specific candidate
  const handleOpenVerifyModal = (candidate: PendingVerificationCandidate) => {
    setSelectedCandidate(candidate);
    setConfirmedRole(candidate.current_role);
    setSalaryRange(candidate.placement_salary || '₹8,00,000 / yr');
    setStartDate('2024-06-01');
    setRetentionMonths(6);
    setIsStillEmployed(true);
    setVerifyStatus('confirmed');

    // Pre-populate skills from candidate
    const initialSkills: Record<string, number> = {};
    candidate.skills.forEach((s) => {
      initialSkills[s] = 4.5;
    });
    setSkillRatings(initialSkills);

    // Reset feedback
    setMissingTechSkills(['CI/CD Pipeline Automation (GitHub Actions)']);
    setMissingSoftSkills(['Cross-Functional Stakeholder Communication']);
    setRelevanceRating(4.8);
    setRelevanceNotes(
      `${candidate.trainee_name} transitioned smoothly into our production environment. Core competency execution is strong and dependable.`
    );
    setCurriculumRecommendations('Incorporate hands-on Docker and CI/CD pipelines so candidates are cloud-ready on Day 1.');
    setSelectedArtifacts(['offer_letter_signed.pdf']);
    setIsVerifyModalOpen(true);
  };

  // Skill Rating change
  const handleRatingChange = (skill: string, val: number) => {
    setSkillRatings((prev) => ({ ...prev, [skill]: val }));
  };

  const handleAddCustomSkill = () => {
    if (newSkillName.trim() && !skillRatings[newSkillName.trim()]) {
      setSkillRatings((prev) => ({ ...prev, [newSkillName.trim()]: 4.0 }));
      setNewSkillName('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkillRatings((prev) => {
      const copy = { ...prev };
      delete copy[skill];
      return copy;
    });
  };

  // Missing Skills Toggles
  const toggleTechGap = (gap: string) => {
    setMissingTechSkills((prev) =>
      prev.includes(gap) ? prev.filter((g) => g !== gap) : [...prev, gap]
    );
  };

  const addCustomTech = () => {
    if (customTechInput.trim() && !missingTechSkills.includes(customTechInput.trim())) {
      setMissingTechSkills((prev) => [...prev, customTechInput.trim()]);
      setCustomTechInput('');
    }
  };

  const toggleSoftGap = (gap: string) => {
    setMissingSoftSkills((prev) =>
      prev.includes(gap) ? prev.filter((g) => g !== gap) : [...prev, gap]
    );
  };

  const addCustomSoft = () => {
    if (customSoftInput.trim() && !missingSoftSkills.includes(customSoftInput.trim())) {
      setMissingSoftSkills((prev) => [...prev, customSoftInput.trim()]);
      setCustomSoftInput('');
    }
  };

  const toggleArtifact = (artId: string) => {
    setSelectedArtifacts((prev) =>
      prev.includes(artId) ? prev.filter((a) => a !== artId) : [...prev, artId]
    );
  };

  // Calculated evidence level preview
  const previewEvidenceLevel: EvidenceLevelType = (() => {
    if (verifyStatus !== 'confirmed') return 'self_reported';
    if (selectedArtifacts.length >= 2) return 'multi_source_verified';
    if (selectedArtifacts.length >= 1) return 'evidence_backed';
    return 'employer_confirmed';
  })();

  // Average skill score
  const avgSkillScore = (() => {
    const scores = Object.values(skillRatings);
    if (!scores.length) return 4.0;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  })();

  // Submit Verification
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    setIsSubmitting(true);
    setSubmitSuccess(null);

    const activeEmployerObj = employers.find((e) => e.id === selectedEmployerId) || employers[0];
    const employerName = activeEmployerObj ? activeEmployerObj.name : selectedCandidate.current_employer;

    const payload: EmployerVerificationCreatePayload = {
      employer_id: activeEmployerObj?.id,
      employer_name: employerName,
      reviewer_name: reviewerName,
      reviewer_role: reviewerRole,
      reviewer_email: reviewerEmail,
      trainee_id: selectedCandidate.trainee_id,
      trainee_name: selectedCandidate.trainee_name,
      verification_status: verifyStatus,
      confirmed_role: confirmedRole,
      confirmed_department: confirmedDept,
      employment_type: employmentType,
      confirmed_start_date: startDate,
      salary_range: salaryRange,
      is_still_employed: isStillEmployed,
      retention_months: Number(retentionMonths),
      skill_ratings: skillRatings,
      missing_technical_skills: missingTechSkills,
      missing_soft_skills: missingSoftSkills,
      training_relevance_rating: relevanceRating,
      training_relevance_notes: relevanceNotes,
      curriculum_recommendations: curriculumRecommendations,
      would_hire_from_provider_again: wouldHireAgain,
      verified_artifacts: selectedArtifacts
    };

    try {
      await api.submitEmployerVerification(payload);
      setSubmitSuccess(
        `Successfully verified ${selectedCandidate.trainee_name}! Evidence tier advanced to '${previewEvidenceLevel.replace('_', ' ').toUpperCase()}'.`
      );
      setTimeout(() => {
        setIsVerifyModalOpen(false);
        setSubmitSuccess(null);
        loadData();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtering
  const filteredCandidates = candidates.filter((c) =>
    c.trainee_name.toLowerCase().includes(search.toLowerCase()) ||
    c.current_role.toLowerCase().includes(search.toLowerCase()) ||
    c.program.toLowerCase().includes(search.toLowerCase())
  );

  const filteredVerifications = verifications.filter((v) =>
    v.trainee_name.toLowerCase().includes(search.toLowerCase()) ||
    v.confirmed_role.toLowerCase().includes(search.toLowerCase()) ||
    v.employer_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEmployers = employers.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.industry.toLowerCase().includes(search.toLowerCase()) ||
    e.location.toLowerCase().includes(search.toLowerCase())
  );

  const getEvidenceBadge = (level: EvidenceLevelType | string) => {
    switch (level) {
      case 'multi_source_verified':
        return <Badge variant="success" size="sm">Level 4: Multi-Source Verified</Badge>;
      case 'evidence_backed':
        return <Badge variant="purple" size="sm">Level 3: Evidence-Backed</Badge>;
      case 'employer_confirmed':
        return <Badge variant="brand" size="sm">Level 2: Employer-Confirmed</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Level 1: Self-Reported</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Employer Feedback & Verification Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Multi-tier outcome verification, competency validation, and workforce evidence corroborated by hiring employers.
              </p>
            </div>
          </div>
        </div>

        {/* Employer Filter / Persona Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-600">Active Employer:</span>
            <select
              value={selectedEmployerId}
              onChange={(e) => setSelectedEmployerId(e.target.value)}
              className="bg-transparent font-bold text-brand-600 focus:outline-none cursor-pointer"
            >
              <option value="all">All Partner Employers</option>
              {employers.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (candidates.length > 0) {
                handleOpenVerifyModal(candidates[0]);
              } else {
                alert('No candidates available to verify');
              }
            }}
            icon={<FileCheck className="w-4 h-4" />}
          >
            Verify Trainee Outcome
          </Button>
        </div>
      </div>

      {/* Evidence Levels Progression Banner */}
      {evidenceHierarchy && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-300">
                  Rigorous Verification Standard
                </span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-brand-500/30 text-brand-200 border border-brand-400/30 rounded-full">
                  WIOA & Title I Compliant
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold mt-1">
                4-Tier Outcome Evidence Hierarchy
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Outcomes advance upward as employer validation, wage artifacts, and multi-source registry corroborations are logged.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-300 block">Audited Cohort</span>
                <span className="text-xl font-black text-white">{evidenceHierarchy.total_trainees} Candidates</span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-300 block">Employer Validated</span>
                <span className="text-xl font-black text-emerald-400">
                  {Math.round(
                    ((evidenceHierarchy.employer_confirmed_count +
                      evidenceHierarchy.evidence_backed_count +
                      evidenceHierarchy.multi_source_verified_count) /
                      evidenceHierarchy.total_trainees) *
                      100
                  )}%
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {evidenceHierarchy.evidence_levels.map((lvl) => {
              const isMultiSource = lvl.level_key === 'multi_source_verified';
              const isEvidenceBacked = lvl.level_key === 'evidence_backed';
              const isEmployerConfirmed = lvl.level_key === 'employer_confirmed';

              return (
                <div
                  key={lvl.level_key}
                  className={`p-4 rounded-2xl border transition-all ${
                    isMultiSource
                      ? 'bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400'
                      : isEvidenceBacked
                      ? 'bg-purple-950/40 border-purple-500/40 hover:border-purple-400'
                      : isEmployerConfirmed
                      ? 'bg-sky-950/40 border-sky-500/40 hover:border-sky-400'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-wider text-slate-400 uppercase">
                      Level {lvl.level_number}
                    </span>
                    <span className="text-sm font-extrabold text-white">
                      {lvl.count} ({lvl.percentage}%)
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-1.5 flex items-center gap-1.5">
                    {lvl.label}
                    {isMultiSource && <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
                  </h3>

                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    {lvl.description}
                  </p>

                  <div className="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isMultiSource
                          ? 'bg-emerald-400'
                          : isEvidenceBacked
                          ? 'bg-purple-400'
                          : isEmployerConfirmed
                          ? 'bg-sky-400'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${lvl.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-card">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'candidates'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Candidates to Verify</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'candidates' ? 'bg-white text-brand-600' : 'bg-slate-100 text-slate-700'}`}>
              {candidates.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('verifications')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'verifications'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Verified Outcomes & Audit Trail</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'verifications' ? 'bg-white text-brand-600' : 'bg-slate-100 text-slate-700'}`}>
              {verifications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('employers')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'employers'
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Partner Employers Directory</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'employers' ? 'bg-white text-brand-600' : 'bg-slate-100 text-slate-700'}`}>
              {employers.length}
            </span>
          </button>
        </div>

        <div className="w-full sm:w-72">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search candidates, roles, skills..."
          />
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingState message="Loading employer verification records..." />
      ) : activeTab === 'candidates' ? (
        /* Candidates to Verify */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold">
              Showing candidates awaiting or completed for verification ({filteredCandidates.length})
            </span>
            <span>Click 'Verify & Rate' to submit direct employer evaluation</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCandidates.map((c) => (
              <div
                key={c.trainee_id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                        {c.trainee_name}
                      </h3>
                      <p className="text-xs font-semibold text-brand-600 mt-0.5">
                        {c.current_role}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">{c.program} • {c.cohort}</p>
                    </div>

                    {getEvidenceBadge(c.evidence_level)}
                  </div>

                  {/* Employer & Compensation details */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 space-y-1.5 text-xs text-slate-600 mt-3 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Employer:</span>
                      <span className="font-bold text-slate-800">{c.current_employer}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Compensation:</span>
                      <span className="font-bold text-emerald-600">{c.placement_salary}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Status:</span>
                      <Badge variant={c.status === 'placed' ? 'success' : 'brand'} size="sm">
                        {c.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Candidate Skills */}
                  <div className="mt-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Target Competencies to Validate
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {c.skills.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs font-semibold bg-brand-50/70 text-brand-700 rounded-lg border border-brand-100"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenVerifyModal(c)}
                    className="flex-1 font-bold text-xs"
                    icon={<FileCheck className="w-3.5 h-3.5" />}
                  >
                    Verify & Submit Feedback
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/trainees/${c.trainee_id}`)}
                    className="text-xs"
                  >
                    Dossier
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'verifications' ? (
        /* Verified Outcomes Feed */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold">
              Historical Employer Verifications & Competency Audit Trail ({filteredVerifications.length})
            </span>
            <span>Audited with corroborating evidence</span>
          </div>

          <div className="space-y-4">
            {filteredVerifications.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card hover:shadow-card-hover transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg border border-emerald-100 shrink-0">
                      <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900">{v.trainee_name}</h3>
                        {getEvidenceBadge(v.evidence_level)}
                        <span className="text-xs font-semibold text-slate-400">ID: {v.id}</span>
                      </div>
                      <p className="text-xs font-semibold text-brand-600 mt-0.5">
                        {v.confirmed_role} ({v.employment_type}) • {v.employer_name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Verified by <strong className="text-slate-700">{v.reviewer_name}</strong> ({v.reviewer_role}) on {v.submission_date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Training Relevance</span>
                      <div className="flex items-center gap-1 justify-end font-black text-slate-900">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span>{v.training_relevance_rating} / 5.0</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Skill Score</span>
                      <span className="text-base font-black text-brand-600">{v.average_skill_score} / 5.0</span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailVerification(v)}
                      className="text-xs font-bold"
                    >
                      Audit Details
                    </Button>
                  </div>
                </div>

                {/* Verification Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
                  {/* Rated Skills */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-brand-500" />
                      Demonstrated Skill Ratings
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(v.skill_ratings).map(([skill, score]) => (
                        <div key={skill} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-700">
                            <span>{skill}</span>
                            <span className="font-bold text-brand-600">{score} / 5.0</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-brand-500 h-full rounded-full"
                              style={{ width: `${(score / 5.0) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Identified Missing Skills */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      Identified Skill Gaps
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Technical Gaps:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {v.missing_technical_skills.map((gap, i) => (
                            <span key={i} className="px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 rounded-md border border-rose-100">
                              {gap}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Soft Skill Gaps:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {v.missing_soft_skills.map((gap, i) => (
                            <span key={i} className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 rounded-md border border-amber-200/60">
                              {gap}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Training Relevance & Artifacts */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                        Employer Curriculum Feedback
                      </h4>
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        "{v.training_relevance_notes}"
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Verified Corroboration Artifacts:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {v.verified_artifacts.map((art, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-medium bg-slate-100 text-slate-700 rounded-md border border-slate-200"
                          >
                            <FileText className="w-3 h-3 text-slate-400" />
                            {art}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Employers Directory */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEmployers.map((emp) => (
            <div
              key={emp.id}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 font-extrabold text-lg">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                        {emp.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">{emp.industry}</p>
                    </div>
                  </div>

                  <Badge variant={emp.tier === 'Strategic Partner' ? 'brand' : 'neutral'} size="sm">
                    {emp.tier}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{emp.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Lead Contact: {emp.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{emp.contactEmail}</span>
                  </div>
                </div>
              </div>

              {/* Metrics & Action Bar */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Trainees Hired
                    </span>
                    <span className="text-base font-black text-slate-900 mt-0.5 block">
                      {emp.hiredTraineesCount}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Active Roles
                    </span>
                    <span className="text-base font-black text-brand-600 mt-0.5 block">
                      {emp.activeOpenings}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Retention
                    </span>
                    <span className="text-base font-black text-emerald-600 mt-0.5 block">
                      {emp.retentionRate}%
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedEmployerId(emp.id);
                      setActiveTab('candidates');
                    }}
                    className="flex-1 text-xs font-bold"
                    icon={<FileCheck className="w-3.5 h-3.5" />}
                  >
                    Verify Candidates
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/jobs?search=${encodeURIComponent(emp.name)}`)}
                    className="text-xs"
                    icon={<Briefcase className="w-3.5 h-3.5" />}
                  >
                    Jobs ({emp.activeOpenings})
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* Complete Employer Verification Modal                     */}
      {/* ======================================================== */}
      {isVerifyModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Employer Verification: {selectedCandidate.trainee_name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Officially confirm employment, validate role competencies, and rate training relevance.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Message Banner */}
            {submitSuccess && (
              <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitVerification} className="mt-6 space-y-6">
              {/* Evidence Level Preview Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-600 block">
                    Calculated Evidence Progression
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    Upon submission, this candidate advances to:
                  </p>
                </div>
                {getEvidenceBadge(previewEvidenceLevel)}
              </div>

              {/* Step 1: Verify Employment & Role Confirmation */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-xs">
                    1
                  </span>
                  Employment Verification & Role Confirmation
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Verification Status</label>
                    <select
                      value={verifyStatus}
                      onChange={(e: any) => setVerifyStatus(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    >
                      <option value="confirmed">Confirmed Active Employee</option>
                      <option value="former_employee">Former Employee (Retained & Completed)</option>
                      <option value="disputed">Disputed / Record Mismatch</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Confirmed Job Title</label>
                    <input
                      type="text"
                      value={confirmedRole}
                      onChange={(e) => setConfirmedRole(e.target.value)}
                      placeholder="e.g. Junior Frontend Engineer"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Department / Team</label>
                    <input
                      type="text"
                      value={confirmedDept}
                      onChange={(e) => setConfirmedDept(e.target.value)}
                      placeholder="e.g. Enterprise Cloud UI"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Employment Type</label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    >
                      <option value="Full-time">Full-time Permanent</option>
                      <option value="Apprenticeship">Registered Apprenticeship</option>
                      <option value="Fellowship">Fellowship / Residency</option>
                      <option value="Contractor">Long-term Contractor</option>
                      <option value="Part-time">Part-time Specialist</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Confirmed Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Verified Annual Salary / Wage</label>
                    <input
                      type="text"
                      value={salaryRange}
                      onChange={(e) => setSalaryRange(e.target.value)}
                      placeholder="e.g. ₹8,40,000 / yr"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Retention Duration (Months)</label>
                    <input
                      type="number"
                      min={1}
                      max={48}
                      value={retentionMonths}
                      onChange={(e) => setRetentionMonths(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="isStillEmployed"
                      checked={isStillEmployed}
                      onChange={(e) => setIsStillEmployed(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    <label htmlFor="isStillEmployed" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Candidate is Currently Employed
                    </label>
                  </div>
                </div>
              </div>

              {/* Step 2: Provide Skill Ratings */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-xs">
                      2
                    </span>
                    Demonstrated Competency Ratings (0.0 to 5.0)
                  </h3>
                  <span className="text-xs font-black text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">
                    Average Score: {avgSkillScore} / 5.0
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(skillRatings).map(([skill, score]) => (
                    <div key={skill} className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{skill}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-brand-600">{score.toFixed(1)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="text-slate-400 hover:text-rose-500"
                            title="Remove skill"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="1.0"
                          max="5.0"
                          step="0.1"
                          value={score}
                          onChange={(e) => handleRatingChange(skill, parseFloat(e.target.value))}
                          className="w-full accent-brand-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Novice (1.0)</span>
                        <span>Competent (3.0)</span>
                        <span>Expert (5.0)</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Custom Skill */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="Add an additional workplace skill to evaluate..."
                    className="flex-1 p-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddCustomSkill}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Skill
                  </Button>
                </div>
              </div>

              {/* Step 3: Identify Missing Technical & Soft Skills */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-xs">
                    3
                  </span>
                  Identify Missing Technical & Soft Skills
                </h3>

                {/* Technical Gaps */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Missing Technical Skills (Click to tag identified gaps):
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {commonTechGaps.map((gap) => {
                      const isSelected = missingTechSkills.includes(gap);
                      return (
                        <button
                          key={gap}
                          type="button"
                          onClick={() => toggleTechGap(gap)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-rose-300'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {gap}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customTechInput}
                      onChange={(e) => setCustomTechInput(e.target.value)}
                      placeholder="Add custom technical skill gap..."
                      className="p-2 text-xs bg-white border border-slate-200 rounded-xl font-medium flex-1"
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={addCustomTech}>
                      Add
                    </Button>
                  </div>
                </div>

                {/* Soft Skills Gaps */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Missing Soft / Workplace Skills (Click to tag identified gaps):
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {commonSoftGaps.map((gap) => {
                      const isSelected = missingSoftSkills.includes(gap);
                      return (
                        <button
                          key={gap}
                          type="button"
                          onClick={() => toggleSoftGap(gap)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {gap}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customSoftInput}
                      onChange={(e) => setCustomSoftInput(e.target.value)}
                      placeholder="Add custom soft skill gap..."
                      className="p-2 text-xs bg-white border border-slate-200 rounded-xl font-medium flex-1"
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={addCustomSoft}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 4: Rate Training Relevance */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-xs">
                    4
                  </span>
                  Rate Training Relevance & Curriculum Feedback
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1.5">
                      Training Program Relevance Score (1.0 to 5.0)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={relevanceRating}
                        onChange={(e) => setRelevanceRating(parseFloat(e.target.value))}
                        className="w-full accent-brand-500 cursor-pointer"
                      />
                      <span className="text-sm font-black text-brand-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        {relevanceRating.toFixed(1)} / 5.0
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 sm:pt-6">
                    <input
                      type="checkbox"
                      id="wouldHireAgain"
                      checked={wouldHireAgain}
                      onChange={(e) => setWouldHireAgain(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    <label htmlFor="wouldHireAgain" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Would hire candidates from this training provider again
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Qualitative Feedback on Workplace Preparation
                  </label>
                  <textarea
                    rows={2}
                    value={relevanceNotes}
                    onChange={(e) => setRelevanceNotes(e.target.value)}
                    placeholder="How well did the training curriculum prepare the candidate for their day-to-day role?"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Curriculum Recommendations for Training Provider
                  </label>
                  <textarea
                    rows={2}
                    value={curriculumRecommendations}
                    onChange={(e) => setCurriculumRecommendations(e.target.value)}
                    placeholder="What specific tools, frameworks, or lab exercises should be added to future cohorts?"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Step 5: Evidence Corroboration & Artifacts */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-xs">
                    5
                  </span>
                  Corroborating Evidence & Artifact Attachment
                </h3>
                <p className="text-xs text-slate-500">
                  Select valid verification artifacts attached to corroborate this placement record.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {commonArtifacts.map((art) => {
                    const isAttached = selectedArtifacts.includes(art.id);
                    return (
                      <div
                        key={art.id}
                        onClick={() => toggleArtifact(art.id)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${
                          isAttached
                            ? 'bg-brand-50/80 border-brand-300 text-brand-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAttached}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-brand-600"
                        />
                        <span className="text-xs font-bold">{art.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 6: Reviewer Attestation */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-xs">
                    6
                  </span>
                  Reviewer Credentials & Attestation
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Reviewer Name</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Reviewer Title / Role</label>
                    <input
                      type="text"
                      value={reviewerRole}
                      onChange={(e) => setReviewerRole(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Company Email</label>
                    <input
                      type="email"
                      value={reviewerEmail}
                      onChange={(e) => setReviewerEmail(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Submit Action Bar */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVerifyModalOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  icon={<FileCheck className="w-4 h-4" />}
                >
                  {isSubmitting ? 'Recording Verification...' : 'Submit Verification & Update Level'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Verification Detail & Audit Modal                        */}
      {/* ======================================================== */}
      {detailVerification && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Verification Audit: {detailVerification.trainee_name}
                </h3>
                <p className="text-xs text-slate-500">Record ID: {detailVerification.id}</p>
              </div>

              <button
                onClick={() => setDetailVerification(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Evidence Tier</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {detailVerification.evidence_level.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                {getEvidenceBadge(detailVerification.evidence_level)}
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Employer</span>
                  <span className="font-bold text-slate-800">{detailVerification.employer_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Role</span>
                  <span className="font-bold text-slate-800">{detailVerification.confirmed_role}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Start Date</span>
                  <span className="font-bold text-slate-800">{detailVerification.confirmed_start_date}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Salary Range</span>
                  <span className="font-bold text-emerald-600">{detailVerification.salary_range}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Corroborating Sources
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(detailVerification.multi_source_corroboration?.sources || ['Employer Direct Portal']).map(
                    (src: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700">
                        {src}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Reviewer Notes & Curriculum Recommendations
                </span>
                <p className="text-slate-700 italic">
                  "{detailVerification.training_relevance_notes}"
                </p>
                {detailVerification.curriculum_recommendations && (
                  <p className="text-slate-600 mt-2 font-medium">
                    <strong>Recommendations:</strong> {detailVerification.curriculum_recommendations}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <Button size="sm" variant="primary" onClick={() => setDetailVerification(null)}>
                Close Audit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employers;
