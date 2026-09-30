import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Award,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Building2,
  BookOpen,
  MapPin,
  Briefcase,
  HelpCircle,
  BarChart3,
  Filter,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Compass,
  Zap,
  Target,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/LoadingState';
import { api } from '../services/api';
import { ComprehensiveAnalyticsData } from '../types';

type DimensionKey =
  | 'all'
  | 'employment_rate'
  | 'retention'
  | 'wage_progression'
  | 'skill_improvement'
  | 'skill_gaps'
  | 'training_providers'
  | 'courses'
  | 'districts'
  | 'occupation_demand'
  | 'non_placement';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<ComprehensiveAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDimension, setActiveDimension] = useState<DimensionKey>('all');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await api.getComprehensiveAnalytics();
        setData(res);
      } catch (err) {
        console.error('Failed to load comprehensive analytics', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (isLoading || !data) {
    return <LoadingState message="Computing Pandas-powered 10-dimension workforce analytics..." />;
  }

  const {
    summary_kpis,
    employment_rate,
    retention,
    wage_progression,
    skill_improvement,
    skill_gaps,
    training_provider_outcomes,
    course_outcomes,
    district_trends,
    occupation_demand,
    non_placement_reasons
  } = data;

  // Custom Chart Colors
  const COLORS = {
    brand: '#4f46e5',
    brandLight: '#818cf8',
    emerald: '#10b981',
    emeraldLight: '#34d399',
    amber: '#f59e0b',
    rose: '#f43f5e',
    sky: '#0284c7',
    purple: '#8b5cf6',
    slate: '#64748b'
  };

  const PIE_COLORS = ['#4f46e5', '#0284c7', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

  const dimensionTabs: { id: DimensionKey; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All 10 Dimensions', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'employment_rate', label: '1. Employment Rate', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'retention', label: '2. Retention', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: 'wage_progression', label: '3. Wage Progression', icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'skill_improvement', label: '4. Skill Improvement', icon: <Award className="w-3.5 h-3.5" /> },
    { id: 'skill_gaps', label: '5. Skill Gaps', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: 'training_providers', label: '6. Training Providers', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'courses', label: '7. Course Outcomes', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'districts', label: '8. District Trends', icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: 'occupation_demand', label: '9. Occupation Demand', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'non_placement', label: '10. Non-Placement Reasons', icon: <HelpCircle className="w-3.5 h-3.5" /> },
  ];

  const handleExportCSV = () => {
    alert('Generating Pandas compliance outcomes report in CSV format...');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-brand-50 text-brand-700 rounded-lg border border-brand-200/60 uppercase">
              Pandas Analytics Engine
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200/60">
              WIOA Audited
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
            Workforce Outcomes & 10-Dimension Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Longitudinal workforce intelligence aggregating employment placement rates, wage deltas, employer-verified skill ratings, geographic district demand, and non-placement root causes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-4 h-4" />}
            className="text-xs font-bold"
          >
            Export WIOA Report (CSV)
          </Button>
        </div>
      </div>

      {/* Top 4 Impact KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Overall Placement</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {summary_kpis.overall_placement_rate}%
          </div>
          <span className="text-[11px] font-bold text-emerald-600 mt-1 block">
            {summary_kpis.positive_outcome_rate}% Positive Outcome Total
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>90-Day Retention</span>
            <CheckCircle2 className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {summary_kpis.longitudinal_retention_90d}%
          </div>
          <span className="text-[11px] font-bold text-brand-600 mt-1 block">
            {summary_kpis.longitudinal_retention_365d}% 1-Year Retention
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Wage Increase</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            +{summary_kpis.average_wage_increase_pct}%
          </div>
          <span className="text-[11px] font-bold text-emerald-600 mt-1 block">
            {wage_progression.average_placement_wage} Starting Benchmark
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Skill Delta</span>
            <Award className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            +{summary_kpis.average_skill_proficiency_gain}
          </div>
          <span className="text-[11px] font-bold text-sky-600 mt-1 block">
            Average Gain out of 5.0 scale
          </span>
        </div>
      </div>

      {/* Dimension Switcher Pills (Horizontal Scrolling on mobile) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-card overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {dimensionTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDimension(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeDimension === tab.id
                  ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                  : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* Dimension 1: Employment Rate                             */}
      {/* ======================================================== */}
      {(activeDimension === 'all' || activeDimension === 'employment_rate') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand-500 text-white flex items-center justify-center text-xs">
                1
              </span>
              Employment Rate & Pathway Inclusivity
            </h2>
            <Badge variant="brand" size="sm">Monthly & Cohort Trends</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Monthly Trend Area Chart */}
            <div className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Monthly Placement Rate vs Program Target</h3>
                  <p className="text-xs text-slate-500">Trailing 6 months longitudinal rate (%) vs state target benchmark</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Current: {employment_rate.monthly_trends[employment_rate.monthly_trends.length - 1].employment_rate}%
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={employment_rate.monthly_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPlacedRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.brand} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={COLORS.brand} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis domain={[60, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area type="monotone" dataKey="employment_rate" name="Achieved Placement %" stroke={COLORS.brand} strokeWidth={2.5} fillOpacity={1} fill="url(#colorPlacedRate)" />
                    <Line type="monotone" dataKey="target" name="Target Benchmark %" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cohort Breakdown BarChart */}
            <div className="lg:col-span-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Cohort Placement Breakdown</h3>
                <p className="text-xs text-slate-500">Enrolled vs Placed candidates</p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={employment_rate.cohort_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="cohort" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="enrolled" name="Enrolled" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="placed" name="Placed" fill={COLORS.brand} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Dimension 2: Retention                                   */}
      {/* ======================================================== */}
      {(activeDimension === 'all' || activeDimension === 'retention') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs">
                2
              </span>
              Longitudinal Retention (30 / 90 / 180 / 365 Days)
            </h2>
            <Badge variant="success" size="sm">Audited Milestones</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Retention Milestones Area Chart */}
            <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Milestone Retention Curve vs Benchmark</h3>
                  <p className="text-xs text-slate-500">Candidate retention survival curve up to 1 full year</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  1-Year: {retention.average_365_day_retention}%
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={retention.milestone_curves} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="milestone" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis domain={[70, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="retention_rate" name="Achieved Retention %" stroke={COLORS.emerald} strokeWidth={2.5} fillOpacity={1} fill="url(#colorRetention)" />
                    <Line type="monotone" dataKey="benchmark" name="Benchmark %" stroke="#94a3b8" strokeWidth={2} strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Retention by Pathway */}
            <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Retention by Career Pathway</h3>
                <p className="text-xs text-slate-500">Day 90, 180, and 365 milestone performance by track</p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={retention.pathway_retention_comparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="pathway" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis domain={[70, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="day_90" name="90 Days" fill={COLORS.sky} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="day_180" name="180 Days" fill={COLORS.brand} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="day_365" name="365 Days" fill={COLORS.emerald} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Dimension 3: Wage Progression                            */}
      {/* ======================================================== */}
      {(activeDimension === 'all' || activeDimension === 'wage_progression') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs">
                3
              </span>
              Wage Progression & Economic Mobility
            </h2>
            <Badge variant="purple" size="sm">Pre vs Post Progression</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Progression Milestones BarChart */}
            <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Career Stage Wage Trajectory</h3>
                  <p className="text-xs text-slate-500">Average annualized compensation at each milestone</p>
                </div>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  +{wage_progression.wage_gain_percentage}% Gain
                </span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wage_progression.progression_milestones} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="stage" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `$${val / 1000}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Average Salary']}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="avg_wage" name="Average Salary" fill={COLORS.purple} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pathway Wage Comparison */}
            <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Starting vs 1-Year Wage by Pathway</h3>
                <p className="text-xs text-slate-500">Progression across traditional and alternative pathways</p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wage_progression.pathway_wage_comparison} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="pathway" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `$${val / 1000}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Annual Compensation']}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="starting_wage" name="Starting Wage" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="one_year_wage" name="1-Year Wage" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Dimension 4: Skill Improvement                           */}
      {/* ======================================================== */}
      {(activeDimension === 'all' || activeDimension === 'skill_improvement') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center text-xs">
                4
              </span>
              Skill Improvement & Net Proficiency Deltas
            </h2>
            <Badge variant="brand" size="sm">0.0 to 5.0 Scoring Scale</Badge>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Intake vs Graduation vs On-the-Job Employer Evaluation
                </h3>
                <p className="text-xs text-slate-500">
                  Net proficiency gains measured across technical and soft competency benchmarks
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  Technical Gain: <strong className="text-brand-600">+{skill_improvement.hard_skill_average_gain}</strong>
                </span>
                <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  Soft Skill Gain: <strong className="text-emerald-600">+{skill_improvement.soft_skill_average_gain}</strong>
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skill_improvement.skills_benchmarks} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="skill" stroke="#94a3b8" fontSize={10} tickLine={false} angle={-15} textAnchor="end" />
                  <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                  <Bar dataKey="intake_score" name="Intake Baseline (0-5)" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="graduation_score" name="Graduation Score (0-5)" fill={COLORS.brandLight} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="on_the_job_score" name="Employer Verified (0-5)" fill={COLORS.brand} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Dimension 5: Skill Gaps                                  */}
      {/* ======================================================== */}
      {(activeDimension === 'all' || activeDimension === 'skill_gaps') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs">
                5
              </span>
              Skill Gaps (Reported by Employers & Gap Engine)
            </h2>
            <Badge variant="danger" size="sm">Employer Citations</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Technical Skill Gaps */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Top Technical Skill Gaps</h3>
                <p className="text-xs text-slate-500">Employer citations & severity score</p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skill_gaps.top_technical_gaps} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis dataKey="skill" type="category" stroke="#64748b" fontSize={10} width={120} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="employer_citations" name="Employer Citations" fill={COLORS.rose} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Soft Skill Gaps */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Top Soft & Workplace Skill Gaps</h3>
                <p className="text-xs text-slate-500">Employer citations & sprint communication</p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skill_gaps.top_soft_gaps} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis dataKey="skill" type="category" stroke="#64748b" fontSize={10} width={120} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="employer_citations" name="Employer Citations" fill={COLORS.amber} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Dimension 6 & 7: Training Provider & Course Outcomes     */}
      {/* ======================================================== */}
      {(activeDimension === 'all' || activeDimension === 'training_providers' || activeDimension === 'courses') && (
        <div className="space-y-6">
          {/* Training Provider Outcomes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">
                  6
                </span>
                Training-Provider Outcomes
              </h2>
              <Badge variant="brand" size="sm">Provider Benchmarks</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {training_provider_outcomes.map((prov, idx) => (
                <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-black text-slate-900 leading-tight">{prov.provider_name}</h4>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                      {prov.placement_rate}%
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Placed / Enrolled:</span>
                      <span className="font-bold text-slate-800">{prov.placed} / {prov.enrolled}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Average Salary:</span>
                      <span className="font-bold text-emerald-600">{prov.average_salary}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Employer Rating:</span>
                      <span className="font-bold text-amber-500">★ {prov.employer_satisfaction} / 5.0</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Specialization:</span>
                    <span className="text-xs font-semibold text-slate-700">{prov.top_domains}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Course Outcomes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">
                  7
                </span>
                Course Outcomes Breakdown
              </h2>
              <Badge variant="purple" size="sm">Curricular ROI</Badge>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-4">Course</th>
                      <th className="py-3.5 px-4">Provider</th>
                      <th className="py-3.5 px-4 text-center">Enrolled</th>
                      <th className="py-3.5 px-4 text-center">Placement Rate</th>
                      <th className="py-3.5 px-4 text-center">Avg Salary</th>
                      <th className="py-3.5 px-4 text-center">Skill Gain</th>
                      <th className="py-3.5 px-4 text-center">365d Retention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {course_outcomes.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-brand-600 font-bold block">{c.course_code}</span>
                          <span className="font-bold text-slate-900">{c.course_title}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{c.provider}</td>
                        <td className="py-3.5 px-4 text-center font-bold">{c.enrolled}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700">
                            {c.placement_rate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{c.avg_salary}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-sky-600">{c.skill_gain}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">{c.retention_365d}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Dimension 8: District Trends                             */}
      {/* ======================================================== */}
      {(activeDimension === 'all' || activeDimension === 'districts') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs">
                8
              </span>
              District Trends (Regional Geographic Workforce)
            </h2>
            <Badge variant="neutral" size="sm">Regional Distribution</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">District Placement Rates & Talent Volume</h3>
                <p className="text-xs text-slate-500">Trainees enrolled and successfully placed by county district</p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={district_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="district" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="trainees_count" name="Enrolled" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="placed_count" name="Placed" fill={COLORS.sky} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-3">
              {district_trends.map((d, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-card flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{d.district}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{d.top_sector}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-600 block">{d.employment_rate}% Placed</span>
                    <span className="text-[11px] font-semibold text-slate-400">Avg: {d.avg_wage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Dimension 9: Occupation Demand vs Pipeline Volume         */}
      {/* ======================================================== */}
      {(activeDimension === 'all' || activeDimension === 'occupation_demand') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-600 text-white flex items-center justify-center text-xs">
                9
              </span>
              Occupation Demand vs Pipeline Supply Volume
            </h2>
            <Badge variant="brand" size="sm">Labor Supply & Demand</Badge>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Open Job Openings vs Program Pipeline Supply</h3>
                <p className="text-xs text-slate-500">Net supply deficit indicates high priority training tracks</p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupation_demand} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="occupation" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="open_jobs" name="Open Job Requisitions" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pipeline_supply" name="Workforce Pipeline Supply" fill={COLORS.brand} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Dimension 10: Non-Placement Reasons                      */}
      {/* ======================================================== */}
      {(activeDimension === 'all' || activeDimension === 'non_placement') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs">
                10
              </span>
              Non-Placement Reasons & Targeted Interventions
            </h2>
            <Badge variant="danger" size="sm">Root Cause Remediation</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Donut Chart */}
            <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Root Cause Distribution</h3>
                <p className="text-xs text-slate-500">Identified blockers preventing immediate placement</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={non_placement_reasons}
                      dataKey="percentage"
                      nameKey="reason"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {non_placement_reasons.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, 'Proportion']}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Actionable Intervention Mapping */}
            <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card space-y-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Actionable Remediation Interventions</h3>
                <p className="text-xs text-slate-500">Assigned pathway interventions to resolve blockers</p>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {non_placement_reasons.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{item.reason}</span>
                      <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                        {item.percentage}% ({item.count} cases)
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
                      <strong className="text-brand-600 font-bold shrink-0">Intervention:</strong>
                      <span>{item.recommended_intervention}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
