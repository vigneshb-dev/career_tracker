import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Briefcase,
  TrendingUp,
  Target,
  Zap,
  RefreshCw,
  Award,
  Calendar,
  Building2,
  Layers,
  ArrowRight,
  ShieldAlert,
  Database,
  Search,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Info,
  DollarSign,
  Compass,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  DigitalTwinStateData,
  DigitalTwinTimelineResponse,
  DigitalTwinDataQualityResponse,
  UncertaintyState,
  DigitalTwinRiskState
} from '../types';

export const DigitalTwin: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  // Active trainee ID: route param, or user's trainee ID, or default to seed trainee
  const [selectedTraineeId, setSelectedTraineeId] = useState<string>(
    id || user?.trainee_id || 'TRN-2024-001'
  );

  const [traineeList, setTraineeList] = useState<Array<{ id: string; name: string; program: string; outcome: string }>>([
    { id: 'TRN-2024-001', name: 'Priya Sharma', program: 'Full-Stack Software Engineering', outcome: 'EMPLOYED' },
    { id: 'TRN-2024-002', name: 'Rajesh Kumar', program: 'Cloud Computing & DevOps', outcome: 'SELF_EMPLOYED' },
    { id: 'TRN-2024-003', name: 'Sneha Patel', program: 'Full-Stack Software Engineering', outcome: 'FREELANCING' },
    { id: 'TRN-2024-004', name: 'Karthik Venkataraman', program: 'Cybersecurity & Infrastructure', outcome: 'APPRENTICESHIP' },
    { id: 'TRN-2024-005', name: 'Aditya Deshmukh', program: 'AI & Data Science', outcome: 'ENTREPRENEURSHIP' },
    { id: 'TRN-2024-006', name: 'Ananya Iyer', program: 'Data Intelligence & AI Integration', outcome: 'HIGHER_STUDIES' },
    { id: 'TRN-2024-007', name: 'Deepa Menon', program: 'Data Intelligence & AI Integration', outcome: 'UNEMPLOYED' },
    { id: 'TRN-2024-008', name: 'Rohan Joshi', program: 'Full-Stack Software Engineering', outcome: 'SEEKING_EMPLOYMENT' },
    { id: 'TRN-2024-009', name: 'Vikram Choudhury', program: 'Enterprise Java Systems', outcome: 'UNKNOWN' },
    { id: 'TRN-2024-010', name: 'Aakash Verma', program: 'Cloud DevOps', outcome: 'UNREACHABLE' },
    { id: 'TRN-2024-011', name: 'Kavita Nair', program: 'Full-Stack Engineering', outcome: 'WITHDRAWN_CONSENT' },
  ]);

  const [twin, setTwin] = useState<DigitalTwinStateData | null>(null);
  const [timelineData, setTimelineData] = useState<DigitalTwinTimelineResponse | null>(null);
  const [dataQuality, setDataQuality] = useState<DigitalTwinDataQualityResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('state');
  const [evidenceFilter, setEvidenceFilter] = useState<string>('ALL');

  useEffect(() => {
    if (id && id !== selectedTraineeId) {
      setSelectedTraineeId(id);
    } else if (role === 'TRAINEE') {
      const targetId = id || user?.trainee_id || 'TRN-2024-001';
      if (targetId !== selectedTraineeId) {
        setSelectedTraineeId(targetId);
      }
    }
  }, [id, user?.trainee_id, role]);

  useEffect(() => {
    if (role !== 'TRAINEE') {
      api.getTraineesPaginated({ page_size: 50 }).then((res: any) => {
        const rawItems = res?.items || res?.data || [];
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const mapped = rawItems.map((t: any) => ({
            id: t.id,
            name: t.full_name || t.fullName || 'Trainee',
            program: t.program || 'Software Engineering',
            outcome: (t.status || t.primary_outcome_type || 'IN_TRAINING').toUpperCase(),
          }));
          setTraineeList(mapped);
        }
      }).catch(() => {});
    }
  }, [role]);

  const fetchTwinData = async (traineeId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [twinRes, timelineRes, dqRes] = await Promise.all([
        api.getDigitalTwin(traineeId),
        api.getDigitalTwinTimeline(traineeId).catch(() => null),
        api.getDigitalTwinDataQuality(traineeId).catch(() => null),
      ]);
      setTwin(twinRes);
      setTimelineData(timelineRes);
      setDataQuality(dqRes);
    } catch (err: any) {
      console.error('Error fetching digital twin:', err);
      setError(err.message || 'Failed to load Digital Twin data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTraineeId) {
      fetchTwinData(selectedTraineeId);
    }
  }, [selectedTraineeId]);

  const handleRefresh = async () => {
    if (!selectedTraineeId) return;
    setIsRefreshing(true);
    try {
      const refreshed = await api.refreshDigitalTwin(selectedTraineeId);
      setTwin(refreshed);
      const [tl, dq] = await Promise.all([
        api.getDigitalTwinTimeline(selectedTraineeId).catch(() => null),
        api.getDigitalTwinDataQuality(selectedTraineeId).catch(() => null),
      ]);
      setTimelineData(tl);
      setDataQuality(dq);
    } catch (err: any) {
      console.error('Failed to force refresh digital twin:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getUncertaintyBadge = (uncertainty?: UncertaintyState) => {
    switch (uncertainty) {
      case 'VERIFIED':
        return { variant: 'success' as const, label: 'VERIFIED EVIDENCE', icon: ShieldCheck, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'SELF_REPORTED':
        return { variant: 'warning' as const, label: 'SELF REPORTED', icon: UserCheck, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'KNOWN':
        return { variant: 'brand' as const, label: 'PARTIALLY KNOWN', icon: Info, color: 'text-brand-700 bg-brand-50 border-brand-200' };
      case 'STALE':
        return { variant: 'danger' as const, label: 'STALE RECORD (>180d)', icon: Clock, color: 'text-orange-700 bg-orange-50 border-orange-200' };
      case 'UNKNOWN':
      default:
        return { variant: 'neutral' as const, label: 'UNKNOWN / UNREACHABLE', icon: HelpCircle, color: 'text-slate-700 bg-slate-100 border-slate-200' };
    }
  };

  const getRiskBadge = (risk?: DigitalTwinRiskState) => {
    switch (risk) {
      case 'LOW':
        return { variant: 'success' as const, label: 'LOW RISK', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' };
      case 'MODERATE':
        return { variant: 'warning' as const, label: 'MODERATE RISK', color: 'text-amber-700 bg-amber-50 border-amber-300' };
      case 'HIGH':
        return { variant: 'danger' as const, label: 'HIGH RISK', color: 'text-rose-700 bg-rose-50 border-rose-300' };
      case 'CRITICAL':
        return { variant: 'danger' as const, label: 'CRITICAL RISK', color: 'text-red-900 bg-red-100 border-red-400 font-extrabold' };
      default:
        return { variant: 'neutral' as const, label: 'UNKNOWN RISK', color: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  const getOutcomeBadge = (outcome?: string) => {
    switch (outcome) {
      case 'EMPLOYED':
        return { label: 'Employed (Salaried)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'SELF_EMPLOYED':
        return { label: 'Self-Employed / LLP', color: 'bg-teal-100 text-teal-800 border-teal-200' };
      case 'FREELANCING':
        return { label: 'Freelancing / Gig', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
      case 'APPRENTICESHIP':
        return { label: 'Formal Apprenticeship', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'ENTREPRENEURSHIP':
        return { label: 'Entrepreneurship', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'HIGHER_STUDIES':
        return { label: 'Higher Studies / Fellowship', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'UNEMPLOYED':
        return { label: 'Unemployed', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'SEEKING_EMPLOYMENT':
        return { label: 'Seeking Employment', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'WITHDRAWN_CONSENT':
        return { label: 'Consent Withdrawn', color: 'bg-red-200 text-red-900 border-red-300' };
      case 'UNREACHABLE':
        return { label: 'Unreachable', color: 'bg-slate-200 text-slate-800 border-slate-300' };
      default:
        return { label: 'Unknown Outcome', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <LoadingState message="Constructing Career Outcome Digital Twin representation..." />
      </div>
    );
  }

  if (error || !twin) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <ErrorState
          title="Digital Twin Unavailable"
          message={error || 'Unable to compute digital twin state.'}
          onRetry={() => fetchTwinData(selectedTraineeId)}
        />
      </div>
    );
  }

  const uncertaintyBadge = getUncertaintyBadge(twin.uncertainty_state);
  const riskBadge = getRiskBadge(twin.risk_state);
  const outcomeBadge = getOutcomeBadge(twin.current_outcome);

  // Radar data formatting for Skill DNA
  const radarChartData = (twin.skill_dna || []).slice(0, 8).map((s: any) => {
    const sName = s.skill_name || s.name || 'Competency';
    const prof = s.proficiency_score ?? s.current_level ?? 3.0;
    return {
      subject: sName.length > 14 ? sName.substring(0, 12) + '...' : sName,
      proficiency: prof,
      fullMark: 5.0,
    };
  });

  // Evolution comparison chart
  const evolutionChartData: any[] = [];
  if (twin.skill_evolution && twin.skill_evolution.length > 0) {
    const allSkillNames = Array.from(
      new Set(twin.skill_evolution.flatMap((st) => (st.skills || []).map((s: any) => s.skill_name || s.name || '')))
    ).filter(Boolean).slice(0, 6);

    allSkillNames.forEach((name) => {
      const entry: any = { name };
      twin.skill_evolution.forEach((stage) => {
        const found = (stage.skills || []).find((s: any) => (s.skill_name || s.name) === name);
        entry[stage.stage_id] = found ? ((found as any).score ?? (found as any).proficiency_score ?? 0) : 0;
      });
      evolutionChartData.push(entry);
    });
  }

  // Filtered evidence items
  const filteredEvidence = (twin.evidence_traceability || []).filter((item) => {
    if (evidenceFilter === 'ALL') return true;
    if (evidenceFilter === 'HIGH_CONFIDENCE') return item.confidence >= 0.85;
    if (evidenceFilter === 'EMPLOYER') return item.source.toLowerCase().includes('employer');
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Top Header & Trainee Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-brand-50 text-brand-700 border border-brand-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
              Live Outcome Simulation Layer
            </span>
            <span className="text-xs font-mono text-slate-500">ID: {twin.trainee_id}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Career Outcome Digital Twin
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            A continuous, evidence-grounded representation of each trainee’s skilling-to-livelihood journey.
            Synthesizing assessments, longitudinal follow-ups, verified employer records, and explainable evidence.
          </p>
        </div>

        {/* Trainee Selector & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {role !== 'TRAINEE' && (
            <div className="relative min-w-[240px]">
              <select
                value={selectedTraineeId}
                onChange={(e) => {
                  setSelectedTraineeId(e.target.value);
                  navigate(`/digital-twin/${e.target.value}`);
                }}
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {traineeList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id}) - {t.outcome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/trainees/${twin.trainee_id}`)}
            className="flex items-center gap-1.5"
          >
            <span>Trainee Passport</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Recomputing...' : 'Live Resync'}</span>
          </Button>
        </div>
      </div>

      {/* Navigation Anchor Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 text-xs font-bold scrollbar-none">
        {[
          { id: 'state', label: '1. Career State' },
          { id: 'dna', label: '2. Skill DNA' },
          { id: 'timeline', label: '3. Career Timeline' },
          { id: 'journey', label: '4. Employment Journey' },
          { id: 'wages', label: '5. Wage Progression' },
          { id: 'gaps', label: '6. Skill Gaps' },
          { id: 'interventions', label: '7. Interventions' },
          { id: 'evidence', label: '8. Evidence Traceability' },
          { id: 'quality', label: '9. Data Quality' },
          { id: 'risk', label: '10. Risk Assessment' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSection(tab.id);
              const el = document.getElementById(tab.id);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeSection === tab.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: Current Career State */}
      <section id="state" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-600" />
            1. Current Career State
          </h2>
          <span className="text-xs text-slate-500 font-mono">Last Synced: {twin.updated_at}</span>
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Trainee & Role info */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate</span>
              <p className="text-xl font-extrabold text-slate-900">{twin.trainee_name || twin.trainee_id}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${outcomeBadge.color}`}>
                  {outcomeBadge.label}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1.5 ${uncertaintyBadge.color}`}>
                  <uncertaintyBadge.icon className="w-3.5 h-3.5" />
                  {uncertaintyBadge.label}
                </span>
              </div>
            </div>

            {/* Current Role & Employer */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Occupation</span>
              <p className="text-base font-bold text-slate-800">{twin.current_role || 'No Active Role'}</p>
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {twin.current_employer || 'Self / Not Employed'}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Status: <span className="font-semibold text-slate-700">{twin.employment_status}</span>
              </p>
            </div>

            {/* Income & Relevance */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compensation & Relevance</span>
              <p className="text-base font-extrabold text-brand-700">{twin.current_income_range || 'Unreported'}</p>
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-slate-400" />
                Training Relevance: <span className="font-semibold text-slate-800">{twin.training_relevance}</span>
              </p>
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Retention: <span className="font-semibold text-slate-800">{twin.retention_state}</span>
              </p>
            </div>

            {/* Scores & Confidence */}
            <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Confidence Score</span>
                <span className="text-emerald-700 font-extrabold">{(twin.confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${twin.confidence * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-bold pt-1">
                <span className="text-slate-500">Data Quality Audit</span>
                <span className="text-brand-700 font-extrabold">{twin.data_quality}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, twin.data_quality)}%` }}
                />
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Risk Assessment:</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-md font-extrabold border ${riskBadge.color}`}>
                  {riskBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Readiness Indicators */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-white rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Skill Readiness</span>
              <p className="text-xl font-extrabold text-brand-700 mt-0.5">{twin.skill_readiness}%</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Job Readiness</span>
              <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{twin.job_readiness}%</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Skill Gaps</span>
              <p className="text-xl font-extrabold text-amber-700 mt-0.5">{twin.skill_gap_count}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Active Interventions</span>
              <p className="text-xl font-extrabold text-purple-700 mt-0.5">{twin.active_interventions_count}</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Skill DNA & Evolution */}
      <section id="dna" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-600" />
            2. Skill DNA & Four-Stage Evolution
          </h2>
          <span className="text-xs text-slate-500">4-Stage Canonical Progression Model</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Radar Chart: Skill DNA Competency Profile */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center">
            <h3 className="text-sm font-bold text-slate-800 mb-2 self-start flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-600" />
              Verified Competency Radar
            </h3>
            <p className="text-xs text-slate-500 mb-4 self-start">
              Multi-source aggregated proficiency across 0.0 to 5.0 scale.
            </p>
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarChartData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#cbd5e1" />
                  <Radar
                    name="Proficiency"
                    dataKey="proficiency"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.4}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Evolution Across 4 Stages: Training -> Intervention -> Reassessment -> Target */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Skill Evolution Across Canonical Milestones
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Comparing skill scores from graduation to targeted employment benchmarks.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {(twin.skill_evolution || []).map((stage: any) => (
                <div key={stage.stage_id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Stage</span>
                  <p className="text-xs font-bold text-slate-800 truncate">{stage.stage_name || stage.title}</p>
                  <span className="text-[10px] font-mono text-slate-500">{stage.timestamp || stage.stage_id}</span>
                </div>
              ))}
            </div>

            <div className="w-full h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolutionChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="TRAINING_COMPLETION" name="Completion" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="INTERVENTION" name="Post-Intervention" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="REASSESSMENT" name="Reassessment" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="TARGET_JOB" name="Target Job" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Career Timeline */}
      <section id="timeline" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600" />
            3. Longitudinal Career Timeline
          </h2>
          <span className="text-xs text-slate-500">
            {timelineData?.total_events || 0} Immutable Chronological Events
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          {timelineData && timelineData.timeline_events.length > 0 ? (
            <div className="relative pl-6 border-l-2 border-brand-200 space-y-6">
              {timelineData.timeline_events.map((ev, idx) => (
                <div key={ev.id || idx} className="relative group">
                  {/* Timeline Node Dot */}
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-brand-600 border-4 border-white shadow-sm" />

                  <div className="bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 rounded-2xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800 uppercase">
                          {ev.stage}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{ev.title}</h4>
                      </div>
                      <span className="text-xs font-mono text-slate-500">{ev.event_date}</span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1">{ev.description}</p>

                    <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
                      <span>Org: <strong className="text-slate-700">{ev.organization}</strong></span>
                      <span>Verified: <strong className="text-emerald-700 uppercase">{ev.verification_status}</strong></span>
                      {ev.verified_by && <span>Audited By: <strong className="text-slate-700">{ev.verified_by}</strong></span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No career timeline events registered.</p>
          )}
        </div>
      </section>

      {/* SECTION 4: Employment Journey */}
      <section id="journey" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand-600" />
            4. Employment Outcome Evolution (Month 0 to Month 12+)
          </h2>
          <span className="text-xs text-slate-500 font-medium">Milestone-by-Milestone Traceability</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {(twin.outcome_evolution || []).map((m: any, idx: number) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
                    Month {m.month}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{m.event_date || m.date}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{m.milestone_label || m.title}</h4>
                <p className="text-xs text-slate-600 line-clamp-3">{m.notes}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
                {m.role && <p className="text-[11px] font-semibold text-slate-700 truncate">Role: {m.role}</p>}
                {m.organization && <p className="text-[11px] text-slate-500 truncate">Org: {m.organization}</p>}
                {m.wage && <p className="text-xs font-bold text-emerald-700">{m.wage}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: Wage Progression */}
      <section id="wages" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-600" />
            5. Wage Progression & Economic Mobility
          </h2>
          <span className="text-xs text-slate-500">Live Wage Audit Layer</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase">Placement Salary</span>
              <p className="text-2xl font-extrabold text-slate-800 mt-1">
                {twin.placement_wage_numeric ? `₹${twin.placement_wage_numeric.toLocaleString('en-IN')}` : 'Unrecorded'}
              </p>
              <span className="text-xs text-slate-500">Baseline outcome at graduation</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-700 uppercase">Current Audited Wage</span>
              <p className="text-2xl font-extrabold text-emerald-900 mt-1">
                {twin.current_wage_numeric ? `₹${twin.current_wage_numeric.toLocaleString('en-IN')}` : 'Unrecorded'}
              </p>
              <span className="text-xs text-emerald-700 font-medium">Verified longitudinal revision</span>
            </div>

            <div className="p-4 rounded-2xl bg-brand-50 border border-brand-200">
              <span className="text-xs font-bold text-brand-700 uppercase">Wage Progression</span>
              <p className="text-2xl font-extrabold text-brand-900 mt-1">
                {twin.wage_growth_percent !== undefined ? `+${twin.wage_growth_percent}%` : '0%'}
              </p>
              <span className="text-xs text-brand-700 font-medium">Economic trajectory growth</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 & 7: Skill Gaps and Active Interventions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 6: Skill Gaps */}
        <section id="gaps" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-600" />
              6. High-Priority Skill Gaps
            </h2>
            <Badge variant="warning" size="sm">{twin.skill_gap_count} Gaps</Badge>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            {twin.high_priority_gaps && twin.high_priority_gaps.length > 0 ? (
              twin.high_priority_gaps.map((g, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{g.skill_name}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                      {g.priority} PRIORITY
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Current: <strong>{g.current_level}</strong></span>
                    <span>Target: <strong>{g.target_level}</strong></span>
                    <span className="text-rose-600 font-bold">Deficit: -{g.gap}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full"
                      style={{ width: `${(g.current_level / g.target_level) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">Zero active high-priority skill deficits identified.</p>
            )}
          </div>
        </section>

        {/* SECTION 7: Interventions */}
        <section id="interventions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              7. Targeted Interventions
            </h2>
            <Badge variant="brand" size="sm">{twin.active_interventions_count} Active</Badge>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            {twin.active_interventions && twin.active_interventions.length > 0 ? (
              twin.active_interventions.map((iv, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{iv.intervention_name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-900 uppercase">
                      {iv.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Progress:</span>
                    <strong className="text-purple-700">{iv.progress_percentage}%</strong>
                  </div>
                  <div className="w-full bg-purple-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-600 h-1.5 rounded-full"
                      style={{ width: `${iv.progress_percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No active interventions assigned.</p>
            )}
          </div>
        </section>
      </div>

      {/* SECTION 8: Evidence Traceability ("Why does the system believe this?") */}
      <section id="evidence" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-brand-600" />
              8. Evidence Traceability: "Why does the system believe this?"
            </h2>
            <p className="text-xs text-slate-500">Every derived attribute is traceable to an authoritative factual source.</p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            {['ALL', 'HIGH_CONFIDENCE', 'EMPLOYER'].map((f) => (
              <button
                key={f}
                onClick={() => setEvidenceFilter(f)}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  evidenceFilter === f
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvidence.map((ev, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-brand-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attribute</span>
                  <h4 className="text-sm font-extrabold text-slate-900">{ev.attribute}</h4>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {(ev.confidence * 100).toFixed(0)}% Confidence
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                <strong>Why the system believes this:</strong>
                <p className="mt-1">{ev.explanation}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                <span className="truncate">Source: <strong className="text-slate-700">{ev.source}</strong></span>
                {ev.last_verified_at && (
                  <span className="font-mono">Audited: {ev.last_verified_at}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 9: Data Quality & Audit */}
      <section id="quality" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-brand-600" />
            9. Mathematical Data Quality Audit
          </h2>
          <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
            Score: {twin.data_quality}/100
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Completeness (25 pts)</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{dataQuality?.completeness || 25}/25</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Freshness (25 pts)</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{dataQuality?.freshness || 25}/25</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Verification (25 pts)</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{dataQuality?.verification || 25}/25</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Consistency (25 pts)</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{dataQuality?.consistency || 25}/25</p>
            </div>
          </div>

          {/* Itemized Deductions */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Itemized Transparency Audit & Deductions:
            </h4>
            {dataQuality && dataQuality.deductions.length > 0 ? (
              <ul className="space-y-1.5">
                {dataQuality.deductions.map((d, i) => (
                  <li key={i} className="text-xs text-rose-700 flex items-start gap-2 bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-700 flex items-center gap-1.5 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
                Zero deductions. High integrity record with fresh corroboration and valid longitudinal records.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 10: Risk Assessment */}
      <section id="risk" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            10. Risk State & Explainable Risk Factors
          </h2>
          <span className={`text-xs px-2.5 py-1 rounded-lg font-extrabold border ${riskBadge.color}`}>
            {riskBadge.label}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <p className="text-xs text-slate-600">
            Automated detection of retention vulnerability, stale outreach, unverified claims, or withdrawn consent.
          </p>

          {twin.risk_factors && twin.risk_factors.length > 0 ? (
            <div className="space-y-2">
              {twin.risk_factors.map((rf, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <span>{rf}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Low career risk. Retained in active employment with verified skills and up-to-date follow-ups.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DigitalTwin;
