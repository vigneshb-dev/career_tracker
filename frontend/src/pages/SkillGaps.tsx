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
  Target
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
  Pie
} from 'recharts';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/LoadingState';
import { SkillGapExplanationModal } from '../components/gaps/SkillGapExplanationModal';
import { InterventionReassessmentModal } from '../components/interventions/InterventionReassessmentModal';
import { api } from '../services/api';
import {
  SkillGapAnalysis,
  SkillGapBreakdownItem,
  WorkforceSkillGapSummary,
  Occupation,
  Trainee,
  TraineeInterventionItem,
  ReassessmentResult
} from '../types';

export const SkillGaps: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [summary, setSummary] = useState<WorkforceSkillGapSummary | null>(null);
  const [allGaps, setAllGaps] = useState<SkillGapAnalysis[]>([]);
  const [selectedTraineeId, setSelectedTraineeId] = useState<string>('TRN-2024-001');
  const [selectedOccId, setSelectedOccId] = useState<string>('');
  const [currentAnalysis, setCurrentAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [activeInterventions, setActiveInterventions] = useState<TraineeInterventionItem[]>([]);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & loading
  const [selectedGapForExplanation, setSelectedGapForExplanation] = useState<SkillGapBreakdownItem | null>(null);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [selectedGapForIntervention, setSelectedGapForIntervention] = useState<SkillGapBreakdownItem | null>(null);
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);


  // Initial Data Load
  useEffect(() => {
    async function initData() {
      setIsLoading(true);
      try {
        const [traineesData, occsData, summaryData, gapsData] = await Promise.all([
          api.getTrainees(),
          api.getOccupations(),
          api.getSkillGapsSummary(),
          api.getSkillGaps()
        ]);

        setTrainees(traineesData);
        setOccupations(occsData);
        setSummary(summaryData);
        setAllGaps(gapsData);

        if (traineesData.length > 0) {
          const firstTraineeId = traineesData[0].id;
          setSelectedTraineeId(firstTraineeId);
          loadTraineeGap(firstTraineeId);
        }
      } catch (err) {
        console.error('Failed to load initial skill gap dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, []);

  // Load or re-analyze selected trainee gap
  const loadTraineeGap = async (traineeId: string, occId?: string) => {
    setIsAnalyzing(true);
    try {
      const [data, interventions] = await Promise.all([
        api.getTraineeSkillGap(traineeId, occId || undefined),
        api.getTraineeInterventions(traineeId).catch(() => [])
      ]);
      setCurrentAnalysis(data);
      setActiveInterventions(interventions);
      if (data.target_occupation_id) {
        setSelectedOccId(data.target_occupation_id);
      }
    } catch (err) {
      console.error('Failed to load trainee skill gap audit', err);
    } finally {
      setIsAnalyzing(false);
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
    loadTraineeGap(selectedTraineeId, newOccId);
  };

  const handleBatchSync = async () => {
    setIsSyncing(true);
    try {
      await api.batchSyncSkillGaps();
      const [newSummary, newGaps, newCurrent] = await Promise.all([
        api.getSkillGapsSummary(),
        api.getSkillGaps(),
        api.getTraineeSkillGap(selectedTraineeId, selectedOccId || undefined)
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

        {/* Selector Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
          {/* Candidate Selector */}
          <div className="lg:col-span-5 space-y-1.5">
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

          {/* Target Occupation Selector */}
          <div className="lg:col-span-5 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Target Occupation (Simulate Career Pivot)
            </label>
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
          </div>

          {/* Quick Profile Link */}
          <div className="lg:col-span-2 flex items-end">
            <Button
              onClick={() => navigate(`/trainees/${selectedTraineeId}`)}
              variant="outline"
              size="sm"
              className="w-full text-xs font-bold text-brand-600 border-brand-200 hover:bg-brand-50 py-2.5"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              View Passport
            </Button>
          </div>
        </div>

        {/* Selected Candidate Metadata Banner */}
        {currentAnalysis && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
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
      </div>

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
                {/* Left: Skill title & classification */}
                <div className="space-y-1.5 max-w-xl">
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
        onReassessmentComplete={handleReassessmentComplete}
      />

    </div>
  );
};

