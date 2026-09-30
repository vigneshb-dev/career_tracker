import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  TrendingUp,
  AlertCircle,
  CalendarCheck,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingState } from '../components/common/LoadingState';
import { api } from '../services/api';
import { DashboardMetrics, Trainee, FollowUpItem } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentTrainees, setRecentTrainees] = useState<Trainee[]>([]);
  const [urgentFollowUps, setUrgentFollowUps] = useState<FollowUpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [m, t, f] = await Promise.all([
          api.getDashboardMetrics(),
          api.getTrainees(),
          api.getFollowUps()
        ]);
        setMetrics(m);
        setRecentTrainees(t.slice(0, 5));
        setUrgentFollowUps(f.filter(item => item.status === 'overdue' || item.priority === 'High'));
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading || !metrics) {
    return <LoadingState message="Aggregating workforce intelligence..." />;
  }

  const statCards = [
    {
      title: 'Total Enrolled Trainees',
      value: metrics.totalTrainees.toLocaleString(),
      change: '+14.2% YoY',
      trend: 'up',
      icon: Users,
      color: 'brand',
      sub: 'Across 4 technical cohorts',
    },
    {
      title: 'Placement Rate',
      value: `${metrics.placementRate}%`,
      change: '+6.5% vs target',
      trend: 'up',
      icon: TrendingUp,
      color: 'emerald',
      sub: '986 career placements',
    },
    {
      title: 'Active Job Openings',
      value: metrics.activeJobOpenings.toString(),
      change: '45 Verified Employers',
      trend: 'neutral',
      icon: Briefcase,
      color: 'sky',
      sub: 'Direct partner matches',
    },
    {
      title: 'Pending Follow-Ups',
      value: metrics.overdueFollowUps.toString(),
      change: 'Action Required',
      trend: 'down',
      icon: AlertCircle,
      color: 'rose',
      sub: 'Retention & check-in audits',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Title & Operational Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Workforce Intelligence Dashboard
            </h1>
            <Badge variant="brand" size="sm">Live Feed</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time longitudinal telemetry across candidate competencies, employment placements, and retention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/analytics')}
            icon={<ArrowUpRight className="w-4 h-4" />}
          >
            Export Impact Report
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/trainees')}
            icon={<Users className="w-4 h-4" />}
          >
            View All Trainees
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-200 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {stat.title}
                </span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  stat.color === 'brand' ? 'bg-brand-50 text-brand-600' :
                  stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                  stat.color === 'sky' ? 'bg-sky-50 text-sky-600' :
                  'bg-rose-50 text-rose-600'
                }`}>
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {stat.value}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">{stat.sub}</span>
                <span className={`font-bold ${
                  stat.trend === 'up' ? 'text-emerald-600' :
                  stat.trend === 'down' ? 'text-rose-600' :
                  'text-brand-600'
                }`}>
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Urgent Operational Alerts & Tasks */}
      {urgentFollowUps.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Action Required: {urgentFollowUps.length} Priority Trainee Follow-Ups
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Overdue 30/60/90-day retention verifications and at-risk interventions require counselor documentation.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-900 hover:bg-amber-100/60 self-start md:self-center"
            onClick={() => navigate('/follow-ups')}
          >
            Review Follow-Up Queue
          </Button>
        </div>
      )}

      {/* Main Analytics & Trajectory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Skill Demand vs Supply & Status Mix */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Skill Market Demand vs Cohort Supply */}
          <Card
            title="Skill Demand vs. Trained Supply Index"
            subtitle="Comparing employer demand score against verified trainee competency levels"
            action={
              <button
                onClick={() => navigate('/skills')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>Full Skill Matrix</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            <div className="space-y-4 pt-2">
              {metrics.skillsDemandSupply.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{item.skill}</span>
                    <div className="flex items-center gap-4 text-[11px] font-semibold">
                      <span className="text-brand-600">Demand: {item.demand}%</span>
                      <span className="text-emerald-600">Supply: {item.supply}%</span>
                    </div>
                  </div>
                  {/* Visual Progress Dual Bar */}
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-brand-500 h-full rounded-l-full"
                      style={{ width: `${item.demand}%` }}
                      title={`Employer Demand: ${item.demand}%`}
                    />
                    <div
                      className="bg-emerald-400 h-full rounded-r-full -ml-1 border-l border-white"
                      style={{ width: `${item.supply}%` }}
                      title={`Trainee Supply: ${item.supply}%`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-brand-500 inline-block" />
                  Employer Openings Demand
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                  Cohort Competency Supply
                </span>
              </div>
              <span className="font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                Largest Gap: AI / Semantic Search (-45%)
              </span>
            </div>
          </Card>

          {/* Trainee Roster Snapshot */}
          <Card
            title="Recent Trainee Placements & Trajectories"
            subtitle="Real-time status updates across active program cohorts"
            action={
              <button
                onClick={() => navigate('/trainees')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <span>View Directory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            <div className="divide-y divide-slate-100">
              {recentTrainees.map((trainee) => (
                <div
                  key={trainee.id}
                  onClick={() => navigate(`/trainees/${trainee.id}`)}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 -mx-6 px-6 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={trainee.avatarUrl}
                      alt={trainee.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{trainee.fullName}</p>
                      <p className="text-xs text-slate-500 truncate">{trainee.program} • {trainee.cohort}</p>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800">
                      {trainee.currentRole ? trainee.currentRole : 'Seeking Placement'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {trainee.currentEmployer || 'Active in pipeline'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant={
                        trainee.status === 'placed' ? 'success' :
                        trainee.status === 'in_training' ? 'brand' :
                        trainee.status === 'seeking_job' ? 'amber' :
                        trainee.status === 'at_risk' ? 'danger' : 'neutral'
                      }
                      dot
                    >
                      {trainee.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* Right Column (4 cols): Trainee Pipeline Mix & Semantic Search Sandbox */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Pipeline Status Breakdown */}
          <Card title="Cohort Pipeline Distribution" subtitle="1,248 candidates tracked">
            <div className="space-y-3 pt-2">
              {metrics.statusDistribution.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      item.status === 'placed' ? 'bg-emerald-500' :
                      item.status === 'in_training' ? 'bg-brand-500' :
                      item.status === 'seeking_job' ? 'bg-amber-500' :
                      item.status === 'at_risk' ? 'bg-rose-500' : 'bg-slate-400'
                    }`} />
                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* AI Semantic Search Architecture Preview */}
          <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900 to-navy-900 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-500/20 text-brand-300 text-xs font-bold border border-brand-400/30 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-brand-300" />
                <span>pgvector Architecture</span>
              </div>
              <h3 className="text-base font-extrabold tracking-tight">
                Semantic Match Ready
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Vector similarity matching between trainee competency embeddings and live employer job descriptions.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Cosine Similarity Index</span>
                  <span className="font-bold text-emerald-400">pgvector v0.7+</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Embedding Dimension</span>
                  <span className="font-mono text-slate-400">vector(1536)</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/skill-gaps')}
                className="mt-5 w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <span>Run Verification Analysis</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl" />
          </div>

          {/* Quick Shortcuts */}
          <Card title="Quick Workflows">
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => navigate('/jobs')}
                className="p-3 text-left rounded-xl border border-slate-100 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 transition-colors group"
              >
                <Briefcase className="w-4 h-4 text-brand-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-800 group-hover:text-brand-700">Open Jobs</p>
                <p className="text-[10px] text-slate-400">142 vacancies</p>
              </button>

              <button
                onClick={() => navigate('/employers')}
                className="p-3 text-left rounded-xl border border-slate-100 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 transition-colors group"
              >
                <Users className="w-4 h-4 text-brand-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-800 group-hover:text-brand-700">Employers</p>
                <p className="text-[10px] text-slate-400">45 partners</p>
              </button>

              <button
                onClick={() => navigate('/career-path')}
                className="p-3 text-left rounded-xl border border-slate-100 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 transition-colors group"
              >
                <TrendingUp className="w-4 h-4 text-brand-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-800 group-hover:text-brand-700">Trajectories</p>
                <p className="text-[10px] text-slate-400">Career paths</p>
              </button>

              <button
                onClick={() => navigate('/analytics')}
                className="p-3 text-left rounded-xl border border-slate-100 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 transition-colors group"
              >
                <Award className="w-4 h-4 text-brand-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-800 group-hover:text-brand-700">Analytics</p>
                <p className="text-[10px] text-slate-400">Outcomes</p>
              </button>
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
};
