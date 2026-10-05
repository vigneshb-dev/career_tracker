import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Award,
  Layers,
  Briefcase,
  TrendingUp,
  Filter,
  Search,
  RefreshCw,
  Building2,
  Compass,
  Info,
  Sliders,
  HelpCircle,
  ExternalLink,
  Target,
  FileText,
  ShieldCheck,
  CheckCheck,
  Eye,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  CartesianGrid
} from 'recharts';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/LoadingState';
import { SkillGapExplanationModal } from '../components/gaps/SkillGapExplanationModal';
import { InterventionReassessmentModal } from '../components/interventions/InterventionReassessmentModal';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  SkillGapAnalysis,
  SkillGapBreakdownItem,
  WorkforceSkillGapSummary,
  Occupation,
  Job,
  Trainee,
  TraineeInterventionItem,
  ReassessmentResult,
  SkillComparisonCounts,
  SkillComparisonVisualItem,
  UnifiedSkillProfile
} from '../types';

export const SkillGaps: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isTrainee = role === 'TRAINEE';

  // State
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [summary, setSummary] = useState<WorkforceSkillGapSummary | null>(null);
  const [allGaps, setAllGaps] = useState<SkillGapAnalysis[]>([]);
  const [selectedTraineeId, setSelectedTraineeId] = useState<string>(user?.trainee_id || 'TRN-2024-001');
  const [selectedOccId, setSelectedOccId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [targetMode, setTargetMode] = useState<'occupation' | 'job'>('occupation');
  const [currentAnalysis, setCurrentAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [activeInterventions, setActiveInterventions] = useState<TraineeInterventionItem[]>([]);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chartFilter, setChartFilter] = useState<'all' | 'hard' | 'soft' | 'gaps_only'>('all');

  // Modals & loading
  const [selectedGapForExplanation, setSelectedGapForExplanation] = useState<SkillGapBreakdownItem | null>(null);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [selectedGapForIntervention, setSelectedGapForIntervention] = useState<SkillGapBreakdownItem | null>(null);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [isUnifiedModalOpen, setIsUnifiedModalOpen] = useState(false);
  const [unifiedProfile, setUnifiedProfile] = useState<UnifiedSkillProfile | null>(null);
  const [isLoadingUnified, setIsLoadingUnified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initial Data Load (re-runs when user or role changes)
  useEffect(() => {
    async function initData() {
      setIsLoading(true);
      try {
        const [traineesRes, occsRes, jobsRes, summaryRes, gapsRes] = await Promise.allSettled([
          api.getTrainees(),
          api.getOccupations(),
          api.getJobs(),
          api.getSkillGapsSummary(),
          api.getSkillGaps()
        ]);

        const traineesData = traineesRes.status === 'fulfilled' ? traineesRes.value : [];
        const occsData = occsRes.status === 'fulfilled' ? occsRes.value : [];
        const jobsData = jobsRes.status === 'fulfilled' ? jobsRes.value : [];
        const summaryData = summaryRes.status === 'fulfilled' ? summaryRes.value : null;
        const gapsData = gapsRes.status === 'fulfilled' ? gapsRes.value : [];

        setTrainees(traineesData);
        setOccupations(occsData);
        setJobs(jobsData);
        if (summaryData) setSummary(summaryData);
        setAllGaps(gapsData);

        // Determine target trainee ID
        let targetId = selectedTraineeId;
        if (isTrainee && user?.trainee_id) {
          targetId = user.trainee_id;
        } else if (traineesData.length > 0) {
          const exists = traineesData.some(t => t.id === targetId);
          if (!exists) {
            targetId = traineesData[0].id;
          }
        }

        setSelectedTraineeId(targetId);
        if (targetId) {
          loadTraineeGap(targetId);
        }
      } catch (err) {
        console.error('Failed to load initial skill gap dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, [user?.id, user?.trainee_id, role]);

  // Load or re-analyze selected trainee gap
  const loadTraineeGap = async (traineeId: string, occId?: string, jobId?: string) => {
    setIsAnalyzing(true);
    try {
      const [data, interventions] = await Promise.all([
        api.getTraineeSkillGapAnalysis(traineeId, occId || undefined, jobId || undefined),
        api.getTraineeInterventions(traineeId).catch(() => [])
      ]);
      setCurrentAnalysis(data);
      setActiveInterventions(interventions);
      if (jobId) {
        setSelectedJobId(jobId);
        setTargetMode('job');
      } else if (data.target_occupation_id) {
        setSelectedOccId(data.target_occupation_id);
      }
    } catch (err) {
      console.error('Failed to load trainee skill gap audit', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenUnifiedProfile = async () => {
    setIsUnifiedModalOpen(true);
    setIsLoadingUnified(true);
    try {
      const prof = await api.getUnifiedSkillProfile(selectedTraineeId);
      setUnifiedProfile(prof);
    } catch (err) {
      console.error('Failed to load unified profile', err);
    } finally {
      setIsLoadingUnified(false);
    }
  };

  const handleOpenIntervention = (gap: SkillGapBreakdownItem) => {
    setSelectedGapForIntervention(gap);
    setIsInterventionModalOpen(true);
  };

  const handleReassessmentComplete = (result: ReassessmentResult) => {
    // Refresh current analysis and interventions to immediately reflect closed gap
    loadTraineeGap(selectedTraineeId, selectedOccId);
    api.getSkillGapsSummary().then(setSummary).catch(() => {});
  };

  const handleTraineeChange = (newTraineeId: string) => {
    setSelectedTraineeId(newTraineeId);
    setSelectedOccId(''); // Reset occupation override to default for new trainee
    loadTraineeGap(newTraineeId);
  };


  const handleOccupationChange = (newOccId: string) => {
    setSelectedOccId(newOccId);
    setSelectedJobId('');
    setTargetMode('occupation');
    loadTraineeGap(selectedTraineeId, newOccId, undefined);
  };

  const handleJobChange = (newJobId: string) => {
    setSelectedJobId(newJobId);
    loadTraineeGap(selectedTraineeId, undefined, newJobId);
  };

  const handleTargetModeChange = (mode: 'occupation' | 'job') => {
    setTargetMode(mode);
    if (mode === 'job' && jobs.length > 0) {
      const jid = selectedJobId || jobs[0].id;
      setSelectedJobId(jid);
      loadTraineeGap(selectedTraineeId, undefined, jid);
    } else {
      setSelectedJobId('');
      loadTraineeGap(selectedTraineeId, selectedOccId || undefined, undefined);
    }
  };

  const handleBatchSync = async () => {
    setIsSyncing(true);
    try {
      await api.batchSyncSkillGaps();
      const [newSummary, newGaps, newCurrent] = await Promise.all([
        api.getSkillGapsSummary(),
        api.getSkillGaps(),
        api.getTraineeSkillGapAnalysis(selectedTraineeId, selectedOccId || undefined)
      ]);
      setSummary(newSummary);
      setAllGaps(newGaps);
      setCurrentAnalysis(newCurrent);
    } catch (err) {
      console.error('Failed to batch sync gaps', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenExplanation = (gap: SkillGapBreakdownItem) => {
    setSelectedGapForExplanation(gap);
    setIsExplanationOpen(true);
  };

  // Filtered Gaps Breakdown
  const rawBreakdown: SkillGapBreakdownItem[] = currentAnalysis?.gaps_breakdown || [];
  const filteredGaps = rawBreakdown.filter((gap) => {
    if (priorityFilter !== 'all' && gap.priority_tier !== priorityFilter) return false;
    if (classificationFilter !== 'all' && gap.gap_type !== classificationFilter) return false;
    if (categoryFilter !== 'all' && gap.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        gap.skill_name.toLowerCase().includes(q) ||
        (gap.domain && gap.domain.toLowerCase().includes(q)) ||
        gap.detected_reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getPriorityBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'critical':
        return 'danger';
      case 'moderate':
        return 'warning';
      case 'low':
      default:
        return 'success';
    }
  };

  const getGapTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'workplace_gap':
        return 'danger';
      case 'curriculum_gap':
        return 'purple';
      case 'learner_gap':
      default:
        return 'brand';
    }
  };

  if (isLoading) {
    return <LoadingState message="Initializing AI Skill Gap Engine & Workforce Matrix..." />;
  }

  const selectedTrainee = trainees.find((t) => t.id === selectedTraineeId);
  const traineeDisplayName = selectedTrainee?.fullName || selectedTrainee?.full_name || currentAnalysis?.traineeName || currentAnalysis?.trainee_name || 'Candidate';
  const targetJobTitle = currentAnalysis?.targetJobTitle || currentAnalysis?.target_job_title || 'Software Engineer';

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200">
              Deterministic Scoring + AI Semantic Alignment
            </span>
            <span className="text-xs text-slate-400 font-mono font-bold">
              v2.4
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Skill Gap Verification & Occupational Alignment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Compare candidate demonstrated proficiencies against occupational requirements and market demand.
            Identifies <strong className="text-blue-700">Learner Gaps</strong>, <strong className="text-purple-700">Curriculum Gaps</strong>, and <strong className="text-rose-700">Workplace Gaps</strong> using transparent mathematical formulas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleBatchSync}
            variant="outline"
            size="sm"
            isLoading={isSyncing}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Batch Sync Workforce
          </Button>

          <Button
            onClick={() => navigate('/skills')}
            variant="primary"
            size="sm"
          >
            <Compass className="w-3.5 h-3.5 mr-1.5" />
            Explore Skills Ontology
          </Button>
        </div>
      </div>

      {/* 2. Executive Workforce Analytics Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Audited Talent</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">{summary.total_audited_candidates}</span>
              <span className="text-xs font-semibold text-slate-400">candidates</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold block">Across 7 Domains</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Avg Alignment</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-brand-700">{summary.average_match_score}%</span>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold block">Match vs Requisitions</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Critical Gaps</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-rose-700">{summary.critical_gaps_total}</span>
              <span className="text-xs font-semibold text-rose-500">deficits</span>
            </div>
            <span className="text-[11px] text-rose-600 font-bold block">Priority ≥ 50/100</span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Learner Gaps</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-blue-700">{summary.learner_gaps_total}</span>
            </div>
            <span className="text-[11px] text-blue-600 font-semibold block">Taught, needs mastery</span>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Curriculum Gaps</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-purple-700">{summary.curriculum_gaps_total}</span>
            </div>
            <span className="text-[11px] text-purple-600 font-semibold block">Missing from syllabus</span>
          </div>

          <div className="p-4 rounded-2xl bg-pink-50/70 border border-pink-100 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-700 block">Workplace Gaps</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-pink-700">{summary.workplace_gaps_total}</span>
            </div>
            <span className="text-[11px] text-pink-600 font-semibold block">Employer feedback audit</span>
          </div>
        </div>
      )}

      {/* 3. Distribution Visualizations */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Classification Breakdown (Learner vs Curriculum vs Workplace) */}
          <Card
            title="Institutional Gap Classifications"
            subtitle="Categorization based on curriculum presence and employer feedback"
          >
            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.classification_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-10} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {summary.classification_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase block">Learner</span>
                <span className="text-xs font-black text-slate-800">{summary.learner_gaps_total}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-600 uppercase block">Curriculum</span>
                <span className="text-xs font-black text-slate-800">{summary.curriculum_gaps_total}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-pink-600 uppercase block">Workplace</span>
                <span className="text-xs font-black text-slate-800">{summary.workplace_gaps_total}</span>
              </div>
            </div>
          </Card>

          {/* Severity Distribution (Critical vs Moderate vs Low) */}
          <Card
            title="Priority Severity Tiers"
            subtitle="Derived from Priority = Severity × Importance × Demand × Confidence"
          >
            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.severity_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-10} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {summary.severity_distribution.map((entry, index) => (
                      <Cell key={`cell-sev-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              <div>
                <span className="text-[10px] font-bold text-rose-600 uppercase block">Critical</span>
                <span className="text-xs font-black text-slate-800">{summary.critical_gaps_total}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase block">Moderate</span>
                <span className="text-xs font-black text-slate-800">{summary.moderate_gaps_total}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">Low</span>
                <span className="text-xs font-black text-slate-800">{summary.low_gaps_total}</span>
              </div>
            </div>
          </Card>

          {/* Hard vs Soft Skills Breakdown */}
          <Card
            title="Competency Categories"
            subtitle="Hard technical competencies vs interpersonal & workplace behaviors"
          >
            <div className="h-52 w-full pt-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.category_distribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={38}
                    paddingAngle={4}
                  >
                    {summary.category_distribution.map((entry, index) => (
                      <Cell key={`cat-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
              <div>
                <span className="text-[10px] font-bold text-brand-600 uppercase block">Hard Skills</span>
                <span className="text-xs font-black text-slate-800">{summary.hard_skills_gaps_total} Deficits</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-teal-600 uppercase block">Soft Skills</span>
                <span className="text-xs font-black text-slate-800">{summary.soft_skills_gaps_total} Deficits</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 4. Interactive Candidate Audit & Career Pivot Simulator Bar */}
      <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-card space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 block">
              Candidate Alignment Diagnostic & Simulator
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Select Trainee & Target Occupation Requisition
            </h2>
            <p className="text-xs text-slate-500">
              Simulate candidate mobility into different occupations to test real-time competency fit and curriculum coverage.
            </p>
          </div>

          {/* Match Score & Gap Score Badges */}
          {currentAnalysis && (
            <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
              <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-100 text-center min-w-[100px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Match Score</span>
                <span className="text-xl font-black text-emerald-700">{currentAnalysis.match_score ?? currentAnalysis.matchScore}%</span>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-rose-50 border border-rose-100 text-center min-w-[100px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Skill Gap</span>
                <span className="text-xl font-black text-rose-700">{currentAnalysis.gap_score ?? currentAnalysis.gapScore}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Selector Controls: Candidate & Dual Requisition Mode */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Candidate Selector */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Audited Candidate
            </label>
            <select
              value={selectedTraineeId}
              onChange={(e) => handleTraineeChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
            >
              {trainees.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName || t.full_name} — {t.program} ({t.id})
                </option>
              ))}
            </select>
          </div>

          {/* Requisition Mode & Target Selector */}
          <div className="lg:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Alignment Target
              </label>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => handleTargetModeChange('occupation')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    targetMode === 'occupation' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Occupation
                </button>
                <button
                  type="button"
                  onClick={() => handleTargetModeChange('job')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    targetMode === 'job' ? 'bg-white text-brand-700 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Job Intelligence
                </button>
              </div>
            </div>

            {targetMode === 'occupation' ? (
              <select
                value={selectedOccId}
                onChange={(e) => handleOccupationChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                {occupations.map((occ) => (
                  <option key={occ.id} value={occ.id}>
                    {occ.title} ({occ.domain}) — {occ.code}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => handleJobChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-brand-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} — {job.employer_name} ({job.location})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Actions: Unified Profile & Passport */}
          <div className="lg:col-span-3 flex items-end gap-2">
            <Button
              onClick={handleOpenUnifiedProfile}
              variant="outline"
              size="sm"
              className="flex-1 text-xs font-extrabold text-brand-700 bg-brand-50/60 border-brand-200 hover:bg-brand-100/70 py-2.5"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Unified Profile
            </Button>
            <Button
              onClick={() => navigate(`/trainees/${selectedTraineeId}`)}
              variant="outline"
              size="sm"
              className="text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 py-2.5 px-3"
              title="View Trainee Passport"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Selected Candidate Metadata Banner */}
        {currentAnalysis && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Target Requisition:</span>
              <span className="font-extrabold text-slate-900">
                {currentAnalysis.target_job_title || currentAnalysis.targetJobTitle}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Enrolled Course:</span>
              <span className="font-bold text-slate-800">
                {currentAnalysis.enrolled_course_title || selectedTrainee?.training_details?.course_title || 'Accredited Curriculum'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Hiring Partner:</span>
              <span className="font-bold text-brand-700">
                {currentAnalysis.target_employer || currentAnalysis.targetEmployer || 'Enterprise Employer Network'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Deficits Detected:</span>
              <span className="font-bold text-rose-700">
                {currentAnalysis.total_gaps_count || rawBreakdown.length} Competencies
              </span>
            </div>
          </div>
        )}

        {/* Selected Candidate Career Goals & Ambitions Card */}
        {selectedTrainee && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-50/60 via-purple-50/40 to-slate-50 border border-brand-100 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-brand-100/60">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-600" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Candidate Career Ambition & Longitudinal Goals
                </span>
              </div>
              <span className="text-[10px] font-bold text-brand-700 bg-white px-2 py-0.5 rounded-md border border-brand-200">
                Self-Reported & Verified Aspirations
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white/90 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Role & Roles of Interest</span>
                <span className="font-extrabold text-brand-700 mt-1 block">
                  {selectedTrainee.career_preference?.target_roles?.join(', ') || selectedTrainee.currentRole || selectedTrainee.program || 'Software Engineer'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                  Industry: {selectedTrainee.career_preference?.preferred_industry || 'Enterprise SaaS / Tech'}
                </span>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Short-Term Career Goal</span>
                <p className="font-bold text-slate-800 mt-1 line-clamp-2">
                  {selectedTrainee.career_preference?.short_term_goal || `Secure entry/mid position in ${selectedTrainee.program || 'technical engineering'}`}
                </p>
                <span className="text-[10px] font-semibold text-slate-400 block mt-1">
                  Preference: {selectedTrainee.career_preference?.preferred_workplace || 'Hybrid'} • Band: {selectedTrainee.career_preference?.target_salary_min || selectedTrainee.placementSalary || 'Competitive Market'}
                </span>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Long-Term Trajectory Horizon</span>
                <p className="font-bold text-purple-900 mt-1 line-clamp-2">
                  {selectedTrainee.career_preference?.long_term_goal || 'Progress to Lead Architect or Principal Technical Consultant within 3-5 years'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-emerald-700">Skill Gap Action Plan Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4.5. THE 4-WAY VISUAL: Resume Skills | Verified Skills | Required Skills | Missing Skills */}
      {currentAnalysis && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Resume Skills */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-50 to-white border border-sky-100/90 shadow-sm relative overflow-hidden space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">
                  Resume Skills
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  Detected Claims
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-sky-950">
                  {currentAnalysis.skill_comparison_counts?.resume_skills ?? 0}
                </span>
                <span className="text-xs font-semibold text-slate-500">skills</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">
                Self-reported from uploaded resume. Unverified claims alone do not score.
              </p>
            </div>

            {/* 2. Verified Skills */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100/90 shadow-sm relative overflow-hidden space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                  Verified Skills
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Proven Score &gt; 0
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-emerald-950">
                  {currentAnalysis.skill_comparison_counts?.verified_skills ?? 0}
                </span>
                <span className="text-xs font-semibold text-slate-500">competencies</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">
                Corroborated across assessments, projects, coach reviews & employer audits.
              </p>
            </div>

            {/* 3. Required Skills */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/90 shadow-sm relative overflow-hidden space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">
                  Required Skills
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Target Requisition
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-indigo-950">
                  {currentAnalysis.skill_comparison_counts?.required_skills ?? 0}
                </span>
                <span className="text-xs font-semibold text-slate-500">benchmarks</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">
                Mandatory hard & soft competencies required for {targetJobTitle}.
              </p>
            </div>

            {/* 4. Missing Skills */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-50 to-white border border-rose-100/90 shadow-sm relative overflow-hidden space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                  Missing Skills
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  Skill Gaps
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-rose-950">
                  {currentAnalysis.skill_comparison_counts?.missing_skills ?? (currentAnalysis.total_gaps_count ?? 0)}
                </span>
                <span className="text-xs font-semibold text-slate-500">deficits</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">
                Proficiency gaps (Learner, Curriculum & Workplace) requiring intervention.
              </p>
            </div>
          </div>

          {/* Recharts Multi-Bar Skill Comparison Chart */}
          {currentAnalysis.skill_comparison_visual && currentAnalysis.skill_comparison_visual.length > 0 && (
            <Card
              title="Multi-Source Skill Comparison: Resume vs. Verified vs. Required vs. Deficit"
              subtitle="Interactive comparative visualization across candidate demonstrated competency and target job requisitions"
              action={
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(['all', 'hard', 'soft', 'gaps_only'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setChartFilter(mode)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                        chartFilter === mode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mode === 'all'
                        ? 'All Skills'
                        : mode === 'hard'
                        ? 'Hard Skills'
                        : mode === 'soft'
                        ? 'Soft Skills'
                        : 'Gaps Only'}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="space-y-3 pt-2">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={currentAnalysis.skill_comparison_visual.filter((item) => {
                        if (chartFilter === 'hard') return item.category === 'hard';
                        if (chartFilter === 'soft') return item.category === 'soft';
                        if (chartFilter === 'gaps_only') return item.is_missing;
                        return true;
                      })}
                      margin={{ top: 15, right: 20, left: -10, bottom: 35 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="skill_name"
                        tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis
                        domain={[0, 5]}
                        ticks={[0, 1, 2, 3, 4, 5]}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as SkillComparisonVisualItem;
                            return (
                              <div className="p-3.5 bg-slate-950 text-white rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1.5 max-w-sm">
                                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                                  <span className="font-extrabold text-sm text-white">{data.skill_name}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-brand-300 uppercase">
                                    {data.category}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-1">
                                  <span className="text-sky-300 font-semibold">Resume Claim:</span>
                                  <span className="font-mono font-bold text-white">{data.resume_claim.toFixed(1)} / 5.0</span>

                                  <span className="text-emerald-300 font-semibold">Verified Level:</span>
                                  <span className="font-mono font-bold text-white">{data.verified_level.toFixed(1)} / 5.0</span>

                                  <span className="text-indigo-300 font-semibold">Required Benchmark:</span>
                                  <span className="font-mono font-bold text-white">{data.required_level.toFixed(1)} / 5.0</span>

                                  <span className="text-rose-300 font-semibold">Skill Deficit:</span>
                                  <span className="font-mono font-bold text-rose-300">
                                    {data.missing_gap > 0 ? `-${data.missing_gap.toFixed(1)}` : 'Mastered'}
                                  </span>
                                </div>
                                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-300 leading-snug">
                                  <span className="text-slate-400 font-bold block mb-0.5">EXPLAINABLE AUDIT:</span>
                                  <span className="font-mono text-slate-200">{data.explainable_gap}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                        iconType="circle"
                      />
                      <Bar
                        dataKey="resume_claim"
                        name="Resume Claim (Detected)"
                        fill="#38bdf8"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                      <Bar
                        dataKey="verified_level"
                        name="Verified Competency"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                      <Bar
                        dataKey="required_level"
                        name="Required Benchmark"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                      <Bar
                        dataKey="missing_gap"
                        name="Deficit Gap"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>
                      <strong>Strict Anti-Inflation Protocol:</strong> Resume claims alone are unverified and do not contribute to verified proficiency scores until corroborated.
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-brand-700">
                    4-Way Visual: Resume | Verified | Required | Missing
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 5. Filter Toolbar & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gaps by skill name or domain..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'critical', 'moderate', 'low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                  priorityFilter === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'all' ? 'All Severity' : p}
              </button>
            ))}
          </div>

          {/* Classification filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'learner_gap', 'curriculum_gap', 'workplace_gap'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setClassificationFilter(c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  classificationFilter === c ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c === 'all'
                  ? 'All Types'
                  : c === 'learner_gap'
                  ? 'Learner'
                  : c === 'curriculum_gap'
                  ? 'Curriculum'
                  : 'Workplace'}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'hard', 'soft'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                  categoryFilter === cat ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'all' ? 'All Skills' : `${cat} Skills`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5.5 Active Remediation Interventions & Progress */}
      {activeInterventions.length > 0 && (
        <Card
          title={`Active Remediation Interventions (${activeInterventions.length})`}
          subtitle={`Personalized Gap-to-Intervention learning tracks currently enrolled for ${traineeDisplayName}`}
          action={
            <Badge variant="purple" size="sm">
              In-Flight Remediation
            </Badge>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeInterventions.map((ti) => {
              const matchedGap = rawBreakdown.find(
                g => g.skill_id === ti.gap_skill_id || g.skill_name.toLowerCase() === ti.gap_skill_name.toLowerCase()
              );

              return (
                <div
                  key={ti.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-brand-300 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900">{ti.intervention_title}</span>
                      <Badge
                        variant={ti.status === 'completed' || ti.status === 'reassessed' ? 'success' : 'brand'}
                        size="sm"
                      >
                        {ti.status === 'reassessed' ? 'Reassessed' : ti.status === 'completed' ? 'Completed' : 'In Progress'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <span>Target Gap: <strong className="text-slate-800">{ti.gap_skill_name}</strong></span>
                      <span>•</span>
                      <span>Track: <strong className="capitalize text-slate-800">{ti.intervention_type.replace('_', ' ')}</strong></span>
                    </div>

                    {ti.why_it_matters && (
                      <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                        "{ti.why_it_matters}"
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-500">Progress</span>
                      <span className="font-black text-brand-700">{ti.progress_percent}%</span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          ti.progress_percent >= 100 ? 'bg-emerald-500' : 'bg-brand-600'
                        }`}
                        style={{ width: `${ti.progress_percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Baseline: {ti.baseline_proficiency.toFixed(1)} → Expected: {ti.expected_proficiency.toFixed(1)}
                      </span>

                      {matchedGap && (
                        <Button
                          onClick={() => handleOpenIntervention(matchedGap)}
                          variant="outline"
                          size="sm"
                          className="text-brand-700 border-brand-200 hover:bg-brand-50 text-[11px] py-1 px-2.5 h-auto"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          {ti.status === 'completed' ? 'Reassess Competency' : 'Track / Update'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 6. Actionable Skill Gaps List & Table */}
      <Card
        title={`Identified Skill Gaps for ${traineeDisplayName}`}
        subtitle={`Deterministic calculations: Skill Gap = Required Proficiency - Current Proficiency (Positive differences only)`}
        action={
          <Badge variant="brand" size="sm">
            {filteredGaps.length} Actionable Gaps
          </Badge>
        }
      >
        {isAnalyzing ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 text-brand-600 animate-spin" />
            <span className="text-xs font-bold text-slate-500">Recalculating competency distance...</span>
          </div>
        ) : filteredGaps.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No skill gaps match the active filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Candidate demonstrated proficiency satisfies all benchmark requirements in this selection.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredGaps.map((gap, index) => (
              <div
                key={`${gap.skill_id}-${index}`}
                className="py-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 p-3 rounded-2xl transition-colors"
              >
                {/* Left: Skill title, classification & explainable callout */}
                <div className="space-y-2 max-w-2xl flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-slate-900">
                      {gap.skill_name}
                    </span>
                    <Badge variant={gap.category === 'hard' ? 'brand' : 'neutral'} size="sm">
                      {gap.category.toUpperCase()}
                    </Badge>
                    <Badge variant={getGapTypeBadgeVariant(gap.gap_type)} size="sm">
                      {gap.gap_type_label}
                    </Badge>
                    <Badge variant={getPriorityBadgeVariant(gap.priority_tier)} size="sm">
                      {gap.priority_label}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">
                    {gap.detected_reason}
                  </p>

                  {/* Explainable Gap String Callout */}
                  <div className="p-2.5 rounded-xl bg-slate-900 text-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-xs border border-slate-800">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0 animate-pulse" />
                      <span className="font-semibold text-slate-100 truncate">
                        {gap.explainable_gap || `${gap.skill_name} — Required: ${Math.round(gap.required_proficiency)}/5 | Current: ${Math.round(gap.current_proficiency)}/5 | Gap: ${Math.round(gap.skill_gap)} levels | Evidence: ${gap.evidence_label || 'None'} | Priority: ${gap.priority_short || gap.priority_label || 'High'}.`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                      <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Evidence:</span>
                      <span className="text-[11px] font-sans font-extrabold text-brand-300">
                        {gap.evidence_label || 'Verified Evidence'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Scores & Actions */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {/* Proficiency numbers */}
                  <div className="text-center px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 min-w-[80px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Required</span>
                    <span className="text-xs font-extrabold text-slate-800">{gap.required_proficiency.toFixed(1)} / 5.0</span>
                  </div>

                  <div className="text-center px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 min-w-[80px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Current</span>
                    <span className={`text-xs font-extrabold ${gap.current_proficiency > 0 ? 'text-brand-600' : 'text-slate-400'}`}>
                      {gap.current_proficiency.toFixed(1)} / 5.0
                    </span>
                  </div>

                  <div className="text-center px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 min-w-[80px]">
                    <span className="text-[10px] font-bold text-rose-600 uppercase block">Deficit</span>
                    <span className="text-xs font-black text-rose-700">-{gap.skill_gap.toFixed(1)}</span>
                  </div>

                  <div className="text-center px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 min-w-[80px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Priority</span>
                    <span className="text-xs font-black text-slate-900">{gap.priority_score}/100</span>
                  </div>

                  {/* Explain Button */}
                  <Button
                    onClick={() => handleOpenExplanation(gap)}
                    variant="outline"
                    size="sm"
                    className="border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    <Info className="w-3.5 h-3.5 mr-1" />
                    Explain
                  </Button>

                  {/* Prescribe Action Button */}
                  <Button
                    onClick={() => handleOpenIntervention(gap)}
                    variant="primary"
                    size="sm"
                    className="bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Prescribe Action
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 7. Acquired / Mastered Competencies (Surplus Skills) */}
      {currentAnalysis?.acquired_skills && currentAnalysis.acquired_skills.length > 0 && (
        <Card
          title={`Mastered / Acquired Competencies for ${traineeDisplayName}`}
          subtitle="Skills where demonstrated proficiency meets or exceeds the required target (No gap)"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {currentAnalysis.acquired_skills.map((item: any, idx: number) => {
              const sname = typeof item === 'string' ? item : item.skill_name || item.name;
              const cur = typeof item === 'object' && item.current_proficiency !== undefined ? item.current_proficiency : 4.5;
              const req = typeof item === 'object' && item.required_proficiency !== undefined ? item.required_proficiency : 4.0;
              const surplus = typeof item === 'object' && item.surplus !== undefined ? item.surplus : (cur - req);

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-slate-900 block">{sname}</span>
                    <span className="text-[11px] text-emerald-700 font-semibold block">
                      Demonstrated: {cur.toFixed(1)} / 5.0 (Target: {req.toFixed(1)})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100/60 px-2 py-1 rounded-lg text-[10px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>+{surplus.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 8. Explanation Modal */}
      <SkillGapExplanationModal
        gap={selectedGapForExplanation}
        traineeName={traineeDisplayName}
        targetRole={targetJobTitle}
        isOpen={isExplanationOpen}
        onClose={() => setIsExplanationOpen(false)}
      />

      {/* 9. Personalized Gap-to-Intervention Modal */}
      <InterventionReassessmentModal
        isOpen={isInterventionModalOpen}
        onClose={() => setIsInterventionModalOpen(false)}
        gap={selectedGapForIntervention}
        traineeId={selectedTraineeId}
        traineeName={traineeDisplayName}
        targetRoleId={selectedOccId || currentAnalysis?.target_occupation_id}
        targetRoleTitle={targetJobTitle}
      />

      {/* 10. Unified Competency Profile Modal (Resume + Assessment + Project + Cert + Coach + Employer) */}
      {isUnifiedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-100 text-brand-800 border border-brand-200">
                    Heterogeneous Multi-Source Evidence Fusion
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {traineeDisplayName} ({selectedTraineeId})
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Unified Competency Profile & Verification Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Resume + Assessments + Practical Projects + Certifications + Coach Evaluation + Employer Feedback → Unified Skill Profile.
                </p>
              </div>

              <button
                onClick={() => setIsUnifiedModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Anti-Inflation Policy Callout */}
            <div className="px-6 py-3 bg-amber-50/80 border-b border-amber-100 flex items-center gap-3 text-xs text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Verification Standard:</strong> Resume claims alone are unverified and do NOT become verified competency scores until corroborated by an objective assessment, project capstone, coach evaluation, or employer feedback.
              </span>
            </div>

            {/* Modal Body: Table of Unified Skills */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {isLoadingUnified ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-brand-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-500">Fusing multi-source evidence streams...</span>
                </div>
              ) : !unifiedProfile || unifiedProfile.skills.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No competency records available yet for this candidate.
                </div>
              ) : (
                <>
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-4">Skill</th>
                          <th className="py-3 px-3 text-center">Resume Evidence</th>
                          <th className="py-3 px-3 text-center">Assessment</th>
                          <th className="py-3 px-3 text-center">Project</th>
                          <th className="py-3 px-3 text-center">Employer Feedback</th>
                          <th className="py-3 px-3 text-center">Coach Review</th>
                          <th className="py-3 px-3 text-center font-black text-slate-900 bg-brand-50/60">Final Skill Profile</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {unifiedProfile.skills.map((s) => {
                          const isVer = s.is_verified;
                          const sum = s.sources_summary || ({} as any);

                          return (
                            <tr key={s.skill_id} className="hover:bg-slate-50/60 transition-colors">
                              {/* Skill name & category */}
                              <td className="py-3.5 px-4 font-bold text-slate-900">
                                <div>{s.name}</div>
                                <span className={`text-[10px] font-extrabold uppercase ${
                                  s.category === 'soft' ? 'text-teal-600' : 'text-brand-600'
                                }`}>
                                  {s.category}
                                </span>
                              </td>

                              {/* Resume Evidence */}
                              <td className="py-3.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sum.resume && sum.resume !== 'Not Listed'
                                    ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                    : 'text-slate-400'
                                }`}>
                                  {sum.resume || 'Not Listed'}
                                </span>
                              </td>

                              {/* Assessment */}
                              <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                                {sum.assessment && sum.assessment !== 'Pending' ? (
                                  <span className="text-indigo-700 font-extrabold">{sum.assessment}</span>
                                ) : (
                                  <span className="text-slate-400 text-[11px] font-normal">Pending</span>
                                )}
                              </td>

                              {/* Project */}
                              <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                                {sum.practical_project && sum.practical_project !== 'Unverified' ? (
                                  <span className="text-emerald-700 font-extrabold">{sum.practical_project}</span>
                                ) : (
                                  <span className="text-slate-400 text-[11px] font-normal">Unverified</span>
                                )}
                              </td>

                              {/* Employer Feedback */}
                              <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                                {sum.employer_feedback && sum.employer_feedback !== 'None' ? (
                                  <span className="text-pink-700 font-extrabold">{sum.employer_feedback}</span>
                                ) : (
                                  <span className="text-slate-400 text-[11px] font-normal">None</span>
                                )}
                              </td>

                              {/* Coach Evaluation */}
                              <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                                {sum.coach_evaluation && sum.coach_evaluation !== 'Pending' ? (
                                  <span className="text-purple-700 font-extrabold">{sum.coach_evaluation}</span>
                                ) : (
                                  <span className="text-slate-400 text-[11px] font-normal">Pending</span>
                                )}
                              </td>

                              {/* Final Skill Profile */}
                              <td className="py-3.5 px-3 text-center bg-brand-50/50">
                                <div className="inline-flex items-baseline gap-1">
                                  <span className={`text-sm font-black ${
                                    isVer ? 'text-brand-700' : 'text-slate-400'
                                  }`}>
                                    {s.current_score.toFixed(1)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold">/ 5.0</span>
                                </div>
                              </td>

                              {/* Verification Status */}
                              <td className="py-3.5 px-4 text-center">
                                {isVer ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCheck className="w-3 h-3 text-emerald-600" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                                    Detected Claim
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Multi-Source Fusion Breakdown Cards (Matching Specification) */}
                <div className="pt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Multi-Source Evidence Breakdown Cards (Evidence Fusion Stream)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Resume Claim (0% weight) → Verified Sources (100% weight)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {unifiedProfile.skills.map((s) => {
                      const sum = s.sources_summary || ({} as any);
                      return (
                        <div
                          key={s.skill_id}
                          className="p-3.5 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800 space-y-2 font-mono text-xs hover:border-brand-500/50 transition-all"
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <span className="font-extrabold text-sm text-brand-300 font-sans">{s.name}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                s.is_verified
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {s.verification_status.toUpperCase()}
                            </span>
                          </div>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-slate-300">
                              <span>Resume Evidence</span>
                              <span className={sum.resume === 'Detected' ? 'text-sky-300 font-bold' : 'text-slate-500'}>
                                → {sum.resume || 'None'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-300">
                              <span>Assessment</span>
                              <span className={sum.assessment && sum.assessment !== 'None' ? 'text-indigo-300 font-bold' : 'text-slate-500'}>
                                → {sum.assessment || 'None'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-300">
                              <span>Project</span>
                              <span className={sum.practical_project === 'Verified' ? 'text-emerald-300 font-bold' : 'text-slate-500'}>
                                → {sum.practical_project || 'None'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-300">
                              <span>Employer Feedback</span>
                              <span className={sum.employer_feedback && sum.employer_feedback !== 'None' ? 'text-pink-300 font-bold' : 'text-slate-500'}>
                                → {sum.employer_feedback || 'None'}
                              </span>
                            </div>
                            <div className="pt-1.5 mt-1 border-t border-slate-800 flex items-center justify-between font-bold text-xs">
                              <span className="text-white">Final Skill Profile</span>
                              <span className={s.is_verified ? 'text-amber-400 font-black' : 'text-slate-400'}>
                                → {sum.final_skill_profile || `${s.current_score.toFixed(1)}/5`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Audited against standard: <strong>0–5 Proficiency | Source Weights: Capstone 30%, Exam 25%, Coach 20%, Cert 15%, Employer 10%, Resume 0%</strong>
              </span>
              <Button
                onClick={() => setIsUnifiedModalOpen(false)}
                variant="primary"
                size="sm"
              >
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

