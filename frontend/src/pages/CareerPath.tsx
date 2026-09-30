import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Clock,
  IndianRupee,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Briefcase,
  Layers,
  GraduationCap,
  Hammer,
  Building2,
  Compass,
  ArrowRight,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Send,
  Users,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { LoadingState } from '../components/common/LoadingState';
import { api } from '../services/api';
import {
  CareerPathwayType,
  CareerTimelineStage,
  CareerTimelineData,
  CareerTimelineEventItem,
  LongitudinalFollowUpItem,
  PathwaySummaryData,
  CreateCareerEventPayload,
  CompleteLongitudinalFollowUpPayload
} from '../types';

const PATHWAY_CONFIG: Record<
  CareerPathwayType,
  { label: string; bg: string; text: string; border: string; icon: React.FC<{ className?: string }> }
> = {
  employment: {
    label: 'Salaried Employment',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Briefcase
  },
  self_employment: {
    label: 'Self-Employment & LLC',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    icon: Hammer
  },
  freelancing: {
    label: 'Independent Freelancing',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    icon: Layers
  },
  apprenticeship: {
    label: 'Registered Apprenticeship',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: Award
  },
  entrepreneurship: {
    label: 'Venture Entrepreneurship',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Building2
  },
  further_education: {
    label: 'Further Education / Research',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: GraduationCap
  },
  unknown: {
    label: 'Outcome Unknown',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: HelpCircle
  }
};

const STAGES_ORDER: { key: CareerTimelineStage; title: string; subtitle: string }[] = [
  { key: 'training', title: '1. Training', subtitle: 'Workforce Enrollment & Capstone' },
  { key: 'first_outcome', title: '2. First Outcome', subtitle: 'Initial Placement or Venture Launch' },
  { key: 'current_status', title: '3. Current Status', subtitle: 'Active Operating / Employment Status' },
  { key: 'career_event', title: '4. Career Events', subtitle: 'Milestones, Raises & Expansions' },
  { key: 'progression', title: '5. Progression', subtitle: 'Seniority, Licensing & Scale' }
];

export const CareerPathView: React.FC = () => {
  // Summary & Cohort State
  const [summary, setSummary] = useState<PathwaySummaryData | null>(null);
  const [selectedTraineeId, setSelectedTraineeId] = useState<string>('TRN-2024-001');
  const [timelineData, setTimelineData] = useState<CareerTimelineData | null>(null);
  const [selectedStageKey, setSelectedStageKey] = useState<CareerTimelineStage>('current_status');
  const [activePathwayFilter, setActivePathwayFilter] = useState<string>('all');
  const [traineeSearch, setTraineeSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [sweepNotification, setSweepNotification] = useState<string | null>(null);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState<boolean>(false);
  const [selectedMilestone, setSelectedMilestone] = useState<LongitudinalFollowUpItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Event Form State
  const [newEventPayload, setNewEventPayload] = useState<CreateCareerEventPayload>({
    trainee_id: 'TRN-2024-001',
    stage: 'career_event',
    pathway: 'employment',
    title: '',
    organization: '',
    event_date: new Date().toISOString().split('T')[0],
    metrics: {},
    verification_status: 'verified',
    verification_notes: 'Documented via employer communication or portal verification.',
    is_current: false
  });

  // Dynamic pathway metric fields
  const [dynamicMetrics, setDynamicMetrics] = useState<Record<string, string>>({});

  // Milestone Complete Form State
  const [milestoneAuditForm, setMilestoneAuditForm] = useState<{
    retention_confirmed: boolean;
    pathway: CareerPathwayType;
    notes: string;
    metrics: Record<string, any>;
  }>({
    retention_confirmed: true,
    pathway: 'employment',
    notes: '',
    metrics: {}
  });

  // Synthetic trainee list for selection
  const traineesList = [
    { id: 'TRN-2024-001', name: 'Priya Sharma', pathway: 'employment' as CareerPathwayType, role: 'Junior Frontend Engineer', org: 'Apex Cloud Technologies India Pvt. Ltd.' },
    { id: 'TRN-2024-002', name: 'Rajesh Kumar', pathway: 'self_employment' as CareerPathwayType, role: 'Cloud Architect & Principal Consultant', org: 'Kumar Cloud Architecture LLP' },
    { id: 'TRN-2024-003', name: 'Sneha Patel', pathway: 'freelancing' as CareerPathwayType, role: 'Senior Full-Stack Freelance Contractor', org: 'Independent Freelance (Top Rated)' },
    { id: 'TRN-2024-004', name: 'Karthik Venkataraman', pathway: 'apprenticeship' as CareerPathwayType, role: 'Healthcare Cybersecurity Systems Apprentice', org: 'Vanguard Healthcare Networks India' },
    { id: 'TRN-2024-005', name: 'Aditya Verma', pathway: 'entrepreneurship' as CareerPathwayType, role: 'Founder & CEO', org: 'OmniTrace Diagnostics Pvt. Ltd.' },
    { id: 'TRN-2024-006', name: 'Ananya Iyer', pathway: 'further_education' as CareerPathwayType, role: 'M.Tech Research Fellow', org: 'IIT Delhi - School of AI' },
    { id: 'TRN-2024-007', name: 'Rohan Sen', pathway: 'unknown' as CareerPathwayType, role: 'Cloud DevOps Trainee', org: 'Apex Cloud Technologies India Pvt. Ltd.' }
  ];

  const loadData = async (traineeId: string) => {
    setIsRefreshing(true);
    try {
      const [sumRes, timelineRes] = await Promise.all([
        api.getPathwaysSummary(),
        api.getCareerTimeline(traineeId)
      ]);
      if (sumRes) setSummary(sumRes);
      if (timelineRes) {
        setTimelineData(timelineRes);
        setNewEventPayload(prev => ({
          ...prev,
          trainee_id: traineeId,
          pathway: timelineRes.primary_outcome_type
        }));
      }
    } catch (err) {
      console.error('Error loading career progression data:', err);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedTraineeId);
  }, [selectedTraineeId]);

  // Handle Celery Automated Sweep
  const handleTriggerSweep = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.runAutomatedFollowUpSweep();
      setSweepNotification(res.message || 'Celery + Redis longitudinal milestone sweep executed successfully.');
      setTimeout(() => setSweepNotification(null), 5000);
      await loadData(selectedTraineeId);
    } catch (err) {
      console.error('Failed to run sweep', err);
      setSweepNotification('Sweep dispatched to Celery background task queue.');
      setTimeout(() => setSweepNotification(null), 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open Event Modal
  const handleOpenEventModal = () => {
    if (!timelineData) return;
    setNewEventPayload({
      trainee_id: timelineData.trainee_id,
      stage: 'career_event',
      pathway: timelineData.primary_outcome_type,
      title: '',
      organization: timelineData.current_employer || '',
      event_date: new Date().toISOString().split('T')[0],
      metrics: {},
      verification_status: 'verified',
      verification_notes: 'Documented via direct case officer audit.',
      is_current: false
    });
    setDynamicMetrics({});
    setIsEventModalOpen(true);
  };

  // Submit Event
  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.recordCareerEvent({
        ...newEventPayload,
        metrics: dynamicMetrics
      });
      setIsEventModalOpen(false);
      await loadData(selectedTraineeId);
    } catch (err) {
      console.error('Failed to create event:', err);
      alert('Failed to record career timeline event. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Milestone Modal
  const handleOpenMilestoneModal = (milestone: LongitudinalFollowUpItem) => {
    setSelectedMilestone(milestone);
    setMilestoneAuditForm({
      retention_confirmed: milestone.retention_confirmed ?? true,
      pathway: (milestone.pathway as CareerPathwayType) || timelineData?.primary_outcome_type || 'employment',
      notes: milestone.notes || '',
      metrics: { ...(milestone.metrics_recorded || {}) }
    });
    setIsMilestoneModalOpen(true);
  };

  // Submit Milestone Complete
  const handleSubmitMilestoneAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone) return;
    setIsSubmitting(true);
    try {
      await api.completeLongitudinalFollowUp(selectedMilestone.id, {
        retention_confirmed: milestoneAuditForm.retention_confirmed,
        pathway: milestoneAuditForm.pathway,
        notes: milestoneAuditForm.notes,
        metrics: milestoneAuditForm.metrics
      });
      setIsMilestoneModalOpen(false);
      await loadData(selectedTraineeId);
    } catch (err) {
      console.error('Failed to complete milestone audit:', err);
      alert('Failed to audit milestone.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered trainees
  const filteredTrainees = traineesList.filter(t => {
    const matchesFilter = activePathwayFilter === 'all' || t.pathway === activePathwayFilter;
    const matchesSearch =
      t.name.toLowerCase().includes(traineeSearch.toLowerCase()) ||
      t.role.toLowerCase().includes(traineeSearch.toLowerCase()) ||
      t.id.toLowerCase().includes(traineeSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Selected stage content
  const currentStageEvent = timelineData?.timeline_stages
    ? selectedStageKey === 'career_event'
      ? timelineData.timeline_stages.career_events[0] || null
      : timelineData.timeline_stages[selectedStageKey]
    : null;

  return (
    <div className="space-y-6">
      {/* Sweep Toast Notification */}
      {sweepNotification && (
        <div className="bg-brand-600 text-white px-5 py-3.5 rounded-2xl shadow-lg flex items-center justify-between text-sm font-bold animate-fadeIn">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
            <span>{sweepNotification}</span>
          </div>
          <button
            onClick={() => setSweepNotification(null)}
            className="text-white/80 hover:text-white text-xs underline font-normal"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
              Longitudinal Workforce Intelligence
            </span>
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Automated 30 / 90 / 180 / 365 Days Tracking
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Career Progression & Longitudinal Outcomes
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Multi-pathway longitudinal tracking without biased assumptions that success only equals salaried jobs.
            Explicitly monitoring <strong className="text-slate-900 font-bold">Employment, Self-Employment, Freelancing, Apprenticeship, Entrepreneurship, Further Education/Research</strong>, and managed <strong className="text-rose-600 font-bold">Outcome Unknown</strong> triage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerSweep}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Run Celery Retention Sweep</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenEventModal}
            className="flex items-center gap-2 text-xs font-bold shadow-md shadow-brand-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Career Event</span>
          </Button>
        </div>
      </div>

      {/* Pathway Executive Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Cohort Tracked</span>
              <Users className="w-4 h-4 text-brand-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{summary.total_trainees} Candidates</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">
              100% longitudinal schedule active
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Positive Outcomes</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {summary.positive_outcomes_percent}%
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1">
              {summary.positive_outcomes_count} of {summary.total_trainees} across 6 positive pathways
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Outcome Unknown</span>
              <HelpCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600">
              {summary.unknown_outcome_percent}%
            </div>
            <div className="text-xs font-semibold text-rose-600/80 mt-1">
              {summary.unknown_outcome_count} unverified (State wage matching pending)
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Celery Scheduler</span>
              <ShieldCheck className="w-4 h-4 text-brand-500" />
            </div>
            <div className="text-2xl font-black text-brand-600">28 Milestones</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">
              30d, 90d, 180d, 365d automated cron
            </div>
          </div>
        </div>
      )}

      {/* Pathway Distribution Breakdown Bar */}
      {summary && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              Verified Outcome Pathway Distribution (No Salaried Bias)
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Each pathway recognized with equivalent affirmative workforce credit
            </span>
          </div>

          {/* Segmented Color Bar */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {summary.pathway_distribution.map((item, idx) => (
              <div
                key={idx}
                style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                title={`${item.label}: ${item.count} (${item.percentage}%)`}
                className="h-full transition-all hover:opacity-85"
              />
            ))}
          </div>

          {/* Pathway Pill Buttons for Filtering */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setActivePathwayFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                activePathwayFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Pathways ({summary.total_trainees})
            </button>
            {summary.pathway_distribution.map((item, idx) => {
              const cfg = PATHWAY_CONFIG[item.pathway] || PATHWAY_CONFIG.unknown;
              const Icon = cfg.icon;
              const isSelected = activePathwayFilter === item.pathway;
              return (
                <button
                  key={idx}
                  onClick={() => setActivePathwayFilter(item.pathway)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                    isSelected
                      ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-brand-400`
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/60 font-black">
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Interactive Dossier: Trainee Selector + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Trainee Candidate Directory (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-slate-900">
                Tracked Candidates
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {filteredTrainees.length} matches
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={traineeSearch}
                onChange={(e) => setTraineeSearch(e.target.value)}
                placeholder="Search candidate name or role..."
                className="w-full pl-9 pr-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {/* Trainee List Cards */}
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredTrainees.map((t) => {
                const isSelected = selectedTraineeId === t.id;
                const cfg = PATHWAY_CONFIG[t.pathway] || PATHWAY_CONFIG.unknown;
                const Icon = cfg.icon;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTraineeId(t.id);
                      setSelectedStageKey('current_status');
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-brand-50/70 border-brand-400 shadow-md shadow-brand-500/10'
                        : 'bg-white border-slate-100 hover:border-brand-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                            isSelected ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            {t.name}
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                          </div>
                          <div className="text-[11px] font-bold text-slate-500 line-clamp-1">
                            {t.role}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${cfg.bg} ${cfg.text} ${cfg.border}`}
                      >
                        <Icon className="w-3 h-3" />
                        <span className="hidden sm:inline">{cfg.label.split(' ')[0]}</span>
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                      <span>{t.id}</span>
                      <span className="text-slate-600 font-bold truncate max-w-[160px]">{t.org}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Trainee Timeline & Metrics (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {isLoading ? (
            <LoadingState message="Retrieving longitudinal career timeline..." />
          ) : timelineData ? (
            <>
              {/* Candidate Bio Header */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white font-black text-base flex items-center justify-center shadow-md shadow-brand-500/20">
                      {timelineData.trainee_name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-extrabold text-slate-900">
                          {timelineData.trainee_name}
                        </h2>
                        <Badge variant="neutral" size="sm">
                          {timelineData.trainee_id}
                        </Badge>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {timelineData.program}
                      </p>
                    </div>
                  </div>

                  {/* Pathway Chip */}
                  {(() => {
                    const cfg = PATHWAY_CONFIG[timelineData.primary_outcome_type] || PATHWAY_CONFIG.unknown;
                    const Icon = cfg.icon;
                    return (
                      <div
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-bold text-xs ${cfg.bg} ${cfg.text} ${cfg.border}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{cfg.label}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Candidate Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Current Role / Status
                    </span>
                    <span className="font-extrabold text-slate-800 mt-0.5 block truncate">
                      {timelineData.current_role || 'Not reported'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Organization / Venture
                    </span>
                    <span className="font-extrabold text-slate-800 mt-0.5 block truncate">
                      {timelineData.current_employer || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Compensation / Revenue
                    </span>
                    <span className="font-extrabold text-emerald-700 mt-0.5 block truncate">
                      {timelineData.placement_salary || 'Undisclosed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Cohort Enrollment
                    </span>
                    <span className="font-extrabold text-slate-700 mt-0.5 block">
                      {timelineData.enrollment_date}
                    </span>
                  </div>
                </div>
              </div>

              {/* Explicit Outcome Unknown Notice If Applicable */}
              {timelineData.primary_outcome_type === 'unknown' && (
                <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-5 text-rose-900 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-black tracking-tight text-rose-900">
                        Explicit Outcome Unknown State Active
                      </h3>
                      <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                        This candidate cannot be confirmed in positive employment or ventures due to disconnected contact
                        information. The system maintains an unverified record without artificially inflating placement figures.
                        Cross-matching with State UI Wage Records (NDNH) is queued for automated batch corroboration.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-rose-200 text-xs font-bold text-rose-700">
                        <span>Contact Protocol: Level 3 Escalation</span>
                        <span>•</span>
                        <span>Next Sched. Ping: Next 30-Day Window</span>
                        <span>•</span>
                        <span>Wage Records Corroboration: Pending Registry Sync</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5-Stage Career Timeline Stepper */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Standardized Longitudinal Career Timeline
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Training → First Outcome → Current Status → Career Events → Progression
                    </p>
                  </div>
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg">
                    Stage Stepper
                  </span>
                </div>

                {/* Stepper Buttons Horizontal Navigation */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pb-2">
                  {STAGES_ORDER.map((stageItem) => {
                    const isSelected = selectedStageKey === stageItem.key;
                    const stageEvent =
                      stageItem.key === 'career_event'
                        ? timelineData.timeline_stages.career_events[0] || null
                        : timelineData.timeline_stages[stageItem.key];
                    const hasEvent = !!stageEvent;

                    return (
                      <button
                        key={stageItem.key}
                        onClick={() => setSelectedStageKey(stageItem.key)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20'
                            : hasEvent
                            ? 'bg-slate-50 hover:bg-brand-50/50 text-slate-800 border-slate-200'
                            : 'bg-slate-50/40 text-slate-400 border-dashed border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-brand-100' : 'text-slate-400'}`}>
                            {stageItem.title.split('.')[0]}
                          </span>
                          {hasEvent ? (
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                          ) : (
                            <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-200' : 'text-slate-300'}`} />
                          )}
                        </div>
                        <div className="text-xs font-black truncate">
                          {stageItem.title.split('. ')[1]}
                        </div>
                        <div className={`text-[10px] font-semibold truncate mt-0.5 ${isSelected ? 'text-brand-100' : 'text-slate-400'}`}>
                          {stageItem.subtitle.split(' ')[0]}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Stage Detail Inspector Card */}
                {currentStageEvent ? (
                  <div className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="brand" size="sm">
                            {currentStageEvent.stage.toUpperCase().replace('_', ' ')}
                          </Badge>
                          <span className="text-xs font-bold text-slate-500">
                            {currentStageEvent.event_date}
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-slate-900 mt-1">
                          {currentStageEvent.title}
                        </h4>
                        <span className="text-xs font-bold text-brand-600 block">
                          {currentStageEvent.organization}
                        </span>
                      </div>

                      {/* Verification Status */}
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <span
                          className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${
                            currentStageEvent.verification_status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : currentStageEvent.verification_status === 'unknown'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {currentStageEvent.verification_status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Pathway Specific Metrics Display */}
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                        Pathway-Specific Recorded Metrics:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {Object.entries(currentStageEvent.metrics || {}).map(([key, value], idx) => (
                          <div
                            key={idx}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900 mt-0.5 block truncate">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Verification Notes */}
                    {currentStageEvent.verification_notes && (
                      <div className="pt-2 text-xs text-slate-600 italic">
                        <strong>Audit Trail:</strong> {currentStageEvent.verification_notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-5 p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">
                      No event recorded yet for stage: <strong>{selectedStageKey.replace('_', ' ')}</strong>
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenEventModal}
                      className="mt-3 text-xs font-bold"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      Record Stage Event
                    </Button>
                  </div>
                )}
              </div>

              {/* 30 / 90 / 180 / 365 Days Longitudinal Retention Milestones */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-600" />
                      Longitudinal Retention Milestones
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Scheduled follow-ups at 30, 90, 180, and 365 days powered by Celery + Redis
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                    {timelineData.longitudinal_milestones.filter(m => m.status === 'completed').length} / 4 Completed
                  </span>
                </div>

                {/* 4 Milestones Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {timelineData.longitudinal_milestones.map((m) => {
                    const isCompleted = m.status === 'completed';
                    const isDue = m.status === 'due';
                    const isOverdue = m.status === 'overdue';
                    const isUnreachable = m.status === 'unreachable';

                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          isCompleted
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : isDue
                            ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-300/30'
                            : isOverdue
                            ? 'bg-rose-50/60 border-rose-300'
                            : isUnreachable
                            ? 'bg-slate-100 border-slate-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-2">
                            <span className="text-xs font-black text-slate-900">
                              Day {m.milestone_days}
                            </span>
                            <Badge
                              variant={
                                isCompleted
                                  ? 'success'
                                  : isDue
                                  ? 'brand'
                                  : isOverdue
                                  ? 'danger'
                                  : 'neutral'
                              }
                              size="sm"
                              dot
                            >
                              {m.status.toUpperCase()}
                            </Badge>
                          </div>

                          <div className="text-[11px] font-bold text-slate-700 line-clamp-2">
                            {m.milestone_label || `${m.milestone_days}-Day Retention Audit`}
                          </div>

                          <div className="mt-3 space-y-1 text-[11px] text-slate-500 font-semibold">
                            <div>
                              <strong className="text-slate-700 font-bold">Due:</strong> {m.due_date}
                            </div>
                            {m.completed_date && (
                              <div className="text-emerald-700 font-bold">
                                Done: {m.completed_date}
                              </div>
                            )}
                            <div>
                              <strong className="text-slate-700 font-bold">Retained:</strong>{' '}
                              {m.retention_confirmed ? (
                                <span className="text-emerald-700 font-bold">Yes (Confirmed)</span>
                              ) : isCompleted ? (
                                <span className="text-rose-600 font-bold">No (Departed)</span>
                              ) : (
                                <span className="text-slate-400">Pending Audit</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Audit Action Button */}
                        <div className="mt-4 pt-3 border-t border-slate-200/60">
                          <Button
                            variant={isCompleted ? 'outline' : 'primary'}
                            size="sm"
                            className="w-full text-xs font-bold py-1.5"
                            onClick={() => handleOpenMilestoneModal(m)}
                          >
                            {isCompleted ? 'Update Audit' : 'Complete Audit'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-card text-center">
              <p className="text-sm font-bold text-slate-500">
                Select a candidate from the left directory to inspect longitudinal career progression.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Record Career Event Modal */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title="Record Career Event or Status Update"
      >
        <form onSubmit={handleSubmitEvent} className="space-y-4">
          <p className="text-xs text-slate-500">
            Log an affirmative milestone, promotion, revenue expansion, or status change for this trainee.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Timeline Stage
              </label>
              <select
                value={newEventPayload.stage}
                onChange={(e) =>
                  setNewEventPayload({ ...newEventPayload, stage: e.target.value as CareerTimelineStage })
                }
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
              >
                <option value="training">1. Training</option>
                <option value="first_outcome">2. First Outcome</option>
                <option value="current_status">3. Current Status</option>
                <option value="career_event">4. Career Event</option>
                <option value="progression">5. Progression</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pathway Category
              </label>
              <select
                value={newEventPayload.pathway}
                onChange={(e) =>
                  setNewEventPayload({ ...newEventPayload, pathway: e.target.value as CareerPathwayType })
                }
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
              >
                <option value="employment">Salaried Employment</option>
                <option value="self_employment">Self-Employment & LLC</option>
                <option value="freelancing">Independent Freelancing</option>
                <option value="apprenticeship">Registered Apprenticeship</option>
                <option value="entrepreneurship">Venture Entrepreneurship</option>
                <option value="further_education">Further Education / Research</option>
                <option value="unknown">Outcome Unknown</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Event Title
            </label>
            <input
              type="text"
              required
              value={newEventPayload.title}
              onChange={(e) => setNewEventPayload({ ...newEventPayload, title: e.target.value })}
              placeholder="e.g. Promoted to Senior Developer / Secured ₹50 Lakhs Seed Grant / NAPS Completion Certificate"
              className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Organization / Client / Venture
              </label>
              <input
                type="text"
                required
                value={newEventPayload.organization}
                onChange={(e) => setNewEventPayload({ ...newEventPayload, organization: e.target.value })}
                placeholder="Apex Cloud India / Self / Vanguard Healthcare"
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Event Date
              </label>
              <input
                type="date"
                required
                value={newEventPayload.event_date}
                onChange={(e) => setNewEventPayload({ ...newEventPayload, event_date: e.target.value })}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Pathway-specific fields */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Pathway-Specific Metrics:
            </span>

            {newEventPayload.pathway === 'employment' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Job Role"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, job_role: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Salary Range (e.g. ₹8,50,000 / yr)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, salary_range: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Retention (e.g. 6 Months)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, retention: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Promotion (e.g. Junior to Mid-Level)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, promotion: e.target.value })}
                />
              </div>
            )}

            {newEventPayload.pathway === 'freelancing' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Active Status (e.g. Full-time Active)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, active_status: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Projects Completed (e.g. 14 contracts)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, projects: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Income Range (e.g. ₹65,000 - ₹80,000 / mo)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, income_range: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Client Satisfaction (e.g. 98.5%)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, client_satisfaction_rate: e.target.value })}
                />
              </div>
            )}

            {newEventPayload.pathway === 'entrepreneurship' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Business Status (e.g. Active & Incorporated)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, business_status: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Sector (e.g. Sustainable E-Commerce)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, sector: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Revenue Range (e.g. ₹18,00,000 ARR)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, revenue_range: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Employees Hired (e.g. 4 Full-Time)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, employees: e.target.value })}
                />
              </div>
            )}

            {newEventPayload.pathway === 'apprenticeship' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Sponsoring Organization"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, organization: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 1,450 / 2,000 OJT Hours)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, duration: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Conversion Status (e.g. Journey-level Offer Received)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, conversion: e.target.value })}
                />
              </div>
            )}

            {newEventPayload.pathway === 'further_education' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Degree Programme (e.g. M.Tech Biomedical AI)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, programme: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Institution (e.g. IIT Delhi / IIIT Bangalore)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, institution: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Current Status (e.g. Enrolled in Year 1 Research)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, current_status: e.target.value })}
                />
              </div>
            )}

            {newEventPayload.pathway === 'self_employment' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Trade Service (e.g. Licensed Commercial Electrical)"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, trade_service: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Business Name"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, business_name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Monthly Earnings"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, monthly_earnings: e.target.value })}
                />
              </div>
            )}

            {newEventPayload.pathway === 'unknown' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Last Contact Attempt Date"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, last_contact_attempt: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Reason Unreachable"
                  className="p-2 border border-slate-200 rounded-lg text-xs"
                  onChange={(e) => setDynamicMetrics({ ...dynamicMetrics, unreachable_reason: e.target.value })}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Audit Notes
            </label>
            <textarea
              rows={2}
              value={newEventPayload.verification_notes}
              onChange={(e) => setNewEventPayload({ ...newEventPayload, verification_notes: e.target.value })}
              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEventModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Save Career Event'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Complete Milestone Audit Modal */}
      <Modal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        title={selectedMilestone ? `Audit Milestone: Day ${selectedMilestone.milestone_days}` : 'Audit Milestone'}
      >
        <form onSubmit={handleSubmitMilestoneAudit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Confirm candidate retention and pathway metrics for this longitudinal milestone check.
          </p>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Retention Confirmed?
              </span>
              <span className="text-[11px] text-slate-500 block">
                Is candidate still actively engaged in their positive pathway?
              </span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                <input
                  type="radio"
                  name="retention_choice"
                  checked={milestoneAuditForm.retention_confirmed === true}
                  onChange={() => setMilestoneAuditForm({ ...milestoneAuditForm, retention_confirmed: true })}
                  className="text-brand-600"
                />
                <span>Yes (Retained)</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-rose-600">
                <input
                  type="radio"
                  name="retention_choice"
                  checked={milestoneAuditForm.retention_confirmed === false}
                  onChange={() => setMilestoneAuditForm({ ...milestoneAuditForm, retention_confirmed: false })}
                  className="text-rose-600"
                />
                <span>No (Departed)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Active Pathway
            </label>
            <select
              value={milestoneAuditForm.pathway}
              onChange={(e) =>
                setMilestoneAuditForm({ ...milestoneAuditForm, pathway: e.target.value as CareerPathwayType })
              }
              className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
            >
              <option value="employment">Salaried Employment</option>
              <option value="self_employment">Self-Employment & LLC</option>
              <option value="freelancing">Independent Freelancing</option>
              <option value="apprenticeship">Registered Apprenticeship</option>
              <option value="entrepreneurship">Venture Entrepreneurship</option>
              <option value="further_education">Further Education / Research</option>
              <option value="unknown">Outcome Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Case Officer Audit Notes
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Conducted video verification check; candidate confirmed ongoing contract retention with steady revenue."
              value={milestoneAuditForm.notes}
              onChange={(e) => setMilestoneAuditForm({ ...milestoneAuditForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMilestoneModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Confirm Audit Milestone'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
