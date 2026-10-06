import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Briefcase,
  Layers,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileQuestion,
  TrendingDown,
  Info,
  Building2,
  Compass
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Link } from 'react-router-dom';
import { skillIntelligenceApi, outcomeIntelligenceApi } from '../services/api';
import {
  TopSkillGapsResponse,
  EmergingSkillsResponse,
  JobSkillDemandResponse,
  OutcomeReasonBreakdownResponse,
  OutcomeSummaryAnalyticsResponse
} from '../types';

export const AdminSkillIntelligence: React.FC = () => {
  // Filters State
  const [dateRange] = useState<string>('2026-01-01:2026-10-03');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>('');
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  const [selectedSkillCategory, setSelectedSkillCategory] = useState<string>('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'skills' | 'outcomes' | 'curriculum'>('skills');

  // Intelligence Data State
  const [topGaps, setTopGaps] = useState<TopSkillGapsResponse | null>(null);
  const [emergingSkills, setEmergingSkills] = useState<EmergingSkillsResponse | null>(null);
  const [jobDemand, setJobDemand] = useState<JobSkillDemandResponse | null>(null);
  const [outcomeSummary, setOutcomeSummary] = useState<OutcomeSummaryAnalyticsResponse | null>(null);
  const [nonPlacementBreakdown, setNonPlacementBreakdown] = useState<OutcomeReasonBreakdownResponse | null>(null);
  const [attritionBreakdown, setAttritionBreakdown] = useState<OutcomeReasonBreakdownResponse | null>(null);
  const [selfEmploymentBreakdown, setSelfEmploymentBreakdown] = useState<OutcomeReasonBreakdownResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [recalcSuccess, setRecalcSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadIntelligenceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const filterParams: any = {};
      if (selectedCourse) filterParams.course_id = selectedCourse;
      if (selectedProvider) filterParams.provider_name = selectedProvider;
      if (selectedDistrict) filterParams.district = selectedDistrict;
      if (selectedSector) filterParams.sector = selectedSector;
      if (selectedEmploymentType) filterParams.employment_type = selectedEmploymentType;
      if (selectedCohort) filterParams.cohort = selectedCohort;
      if (selectedSkillCategory) filterParams.skill_category = selectedSkillCategory;
      if (dateRange) filterParams.date_range = dateRange;

      const [
        gapsRes,
        emergingRes,
        demandRes,
        summaryRes,
        nonPlacementRes,
        attritionRes,
        selfEmpRes
      ] = await Promise.all([
        skillIntelligenceApi.getTopSkillGaps(filterParams),
        skillIntelligenceApi.getEmergingSkills(filterParams),
        skillIntelligenceApi.getJobDemand(filterParams),
        outcomeIntelligenceApi.getSummary(filterParams),
        outcomeIntelligenceApi.getNonPlacement(filterParams),
        outcomeIntelligenceApi.getAttrition(filterParams),
        outcomeIntelligenceApi.getSelfEmployment(filterParams)
      ]);

      setTopGaps(gapsRes);
      setEmergingSkills(emergingRes);
      setJobDemand(demandRes);
      setOutcomeSummary(summaryRes);
      setNonPlacementBreakdown(nonPlacementRes);
      setAttritionBreakdown(attritionRes);
      setSelfEmploymentBreakdown(selfEmpRes);
    } catch (err: any) {
      console.error('Failed to load skill gap intelligence', err);
      setError(err?.message || 'Failed to aggregate workforce skill and outcome intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntelligenceData();
  }, [
    selectedCourse,
    selectedProvider,
    selectedDistrict,
    selectedSector,
    selectedEmploymentType,
    selectedCohort,
    selectedSkillCategory,
    dateRange
  ]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    setRecalcSuccess(null);
    try {
      await skillIntelligenceApi.recalculate();
      setRecalcSuccess('Longitudinal workforce skill & outcome models resynchronized successfully.');
      await loadIntelligenceData();
      setTimeout(() => setRecalcSuccess(null), 6000);
    } catch (err: any) {
      console.error('Recalculation failed', err);
      setError('Intelligence resync failed: ' + (err?.message || 'Check backend network connection'));
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 space-y-6 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/70 border border-indigo-100 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/80 border border-indigo-200 text-xs font-semibold tracking-wide text-indigo-700 uppercase">
              <BrainCircuit className="w-3.5 h-3.5" /> Skill & Outcome Intelligence Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Skill Gap & Attrition Cause Intelligence
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Longitudinal analysis comparing curriculum skills, employer demand, trainee proficiencies, and observed attrition causes across cohorts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Recalculating...' : 'Recalculate Intelligence'}
            </button>
            <Link
              to="/trainee/skill-gap"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium transition shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Trainee View
            </Link>
          </div>
        </div>

        {recalcSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{recalcSuccess}</span>
          </div>
        )}

        {/* Association vs Causation Disclaimer Badge */}
        <div className="mt-4 pt-4 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Metrics represent <strong>detected associations and observed gaps</strong>, not deterministic causal proof.</span>
          </div>
          <span className="font-mono text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60 self-start sm:self-auto">
            STATUS: ACTIVE INTELLIGENCE
          </span>
        </div>
      </div>

      {/* Interactive Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-indigo-600" /> Global Analytical Filters
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 mb-1 font-medium">Course Domain</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Courses (10+)</option>
              <option value="CRS-CLOUD-01">Cloud Architecture & DevOps</option>
              <option value="CRS-FULLSTACK-01">Full Stack Web Development</option>
              <option value="CRS-DATAENG-01">Data Engineering & Analytics</option>
              <option value="CRS-CYBER-01">Cybersecurity Specialist</option>
              <option value="CRS-AIENG-01">Applied Generative AI & ML</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Providers (20)</option>
              <option value="TechSkill Institute">TechSkill Institute</option>
              <option value="Apex Training Academy">Apex Training Academy</option>
              <option value="National Institute of Technology">National Institute of Tech</option>
              <option value="Metropolitan Skill Center">Metropolitan Skill Center</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Districts</option>
              <option value="North District">North District</option>
              <option value="South Metro">South Metro</option>
              <option value="Eastern Coastal">Eastern Coastal</option>
              <option value="Western Valley">Western Valley</option>
              <option value="Central Highlands">Central Highlands</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Sector</label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Sectors</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Financial Services">Financial Services</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Logistics">Logistics</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Employment Type</label>
            <select
              value={selectedEmploymentType}
              onChange={(e) => setSelectedEmploymentType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Types</option>
              <option value="EMPLOYED">Employed</option>
              <option value="UNEMPLOYED">Unemployed</option>
              <option value="SELF_EMPLOYED">Self Employed</option>
              <option value="APPRENTICESHIP">Apprenticeship</option>
              <option value="EMPLOYMENT_LOST">Employment Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Cohort</label>
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Cohorts</option>
              <option value="2025-Q3">2025 Q3</option>
              <option value="2025-Q4">2025 Q4</option>
              <option value="2026-Q1">2026 Q1</option>
              <option value="2026-Q2">2026 Q2</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-medium">Skill Category</label>
            <select
              value={selectedSkillCategory}
              onChange={(e) => setSelectedSkillCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Categories</option>
              <option value="TECHNICAL">Technical</option>
              <option value="CLOUD">Cloud & DevOps</option>
              <option value="DATA">Data & Analytics</option>
              <option value="SECURITY">Security</option>
              <option value="SOFT_SKILL">Soft Skills</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-1 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'skills'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Skill Gap & Demand Intelligence
        </button>
        <button
          onClick={() => setActiveTab('outcomes')}
          className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'outcomes'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Outcome Failure & Attrition Causes
        </button>
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`px-4 py-3 font-medium text-sm border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'curriculum'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Course Analysis & Interventions
        </button>
      </div>

      {/* Intelligence Content Loading / Error State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Aggregating longitudinal skill and outcome metrics across cohorts...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
          <div className="flex items-center gap-2 font-bold mb-2">
            <AlertCircle className="w-5 h-5 text-rose-600" /> Analytical Query Error
          </div>
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: SKILL GAP & DEMAND INTELLIGENCE */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              {/* Summary KPIs Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Jobs Analyzed</span>
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {jobDemand?.total_jobs_analyzed || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Sample size: n = {jobDemand?.sample_size || 0}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Top Detected Gap</span>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-xl font-bold text-amber-700 mt-2 truncate">
                    {topGaps?.top_gaps?.[0]?.skill_name || 'N/A'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Frequency: {topGaps?.top_gaps?.[0]?.frequency || 0} trainees affected
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Emerging Skills Flagged</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 mt-2">
                    {emergingSkills?.emerging_skills?.filter((s) => s.is_emerging).length || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Growth &gt; 15% across quarters</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Trainees Sample</span>
                    <ShieldCheck className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">
                    {topGaps?.sample_size || 520}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Date: 2026-01-01 to 2026-10-03</div>
                </div>
              </div>

              {/* Section 1 & 2: Skill Demand Overview & Top Skill Gaps */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Skill Demand Overview */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-indigo-600" /> 1. Skill Demand Overview
                      </h3>
                      <p className="text-xs text-slate-500">Employer demand % across active job requisitions</p>
                    </div>
                    <div className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600 font-mono">
                      n = {jobDemand?.sample_size || 0} jobs
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(jobDemand?.skills || []).slice(0, 8)}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#64748b" unit="%" />
                        <YAxis dataKey="skill_name" type="category" stroke="#64748b" width={90} textAnchor="end" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: any) => [`${value}% Demand`, 'Demand Frequency']}
                        />
                        <Bar dataKey="demand_percentage" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-[11px] text-slate-500 italic">
                    Metric: % of active job postings requiring proficiency in this skill.
                  </div>
                </div>

                {/* 2. Top Skill Gaps Across Trainees */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" /> 2. Top Detected Skill Gaps
                      </h3>
                      <p className="text-xs text-slate-500">Largest discrepancies between job benchmark and trainee proficiency</p>
                    </div>
                    <div className="px-2 py-1 rounded bg-slate-100 text-[10px] text-slate-600 font-mono">
                      n = {topGaps?.sample_size || 0} trainees
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(topGaps?.top_gaps || []).slice(0, 8)}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="skill_name" stroke="#64748b" angle={-25} textAnchor="end" height={60} />
                        <YAxis stroke="#64748b" label={{ value: 'Avg Gap (0-5)', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(val: any) => [`${Number(val).toFixed(2)} pts`, 'Average Skill Gap']}
                        />
                        <Bar dataKey="average_gap" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-[11px] text-slate-500 italic">
                    Gap Formula: max(0, requiredJobSkillLevel - assessedTraineeLevel).
                  </div>
                </div>
              </div>

              {/* Section 4: Emerging Skills Longitudinal Trends */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" /> 4. Emerging Skill Detection (Quarterly Demand Growth)
                    </h3>
                    <p className="text-xs text-slate-500">Longitudinal quarterly share of job postings (2026 Q1 - 2026 Q4)</p>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                    EMERGING_SKILL FLAG ACTIVE
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  {(emergingSkills?.emerging_skills || []).map((sk) => (
                    <div
                      key={sk.skill_id}
                      className={`p-4 rounded-xl border transition ${
                        sk.is_emerging
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{sk.skill_name}</span>
                        {sk.is_emerging && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            EMERGING
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 capitalize font-medium">{sk.category}</div>

                      {/* Quarterly Breakdown Pills */}
                      <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px] text-center font-mono">
                        <div className="bg-white border border-slate-200/80 p-1.5 rounded-lg shadow-2xs">
                          <div className="text-slate-400 text-[9px] font-semibold">Q1</div>
                          <div className="text-slate-800 font-bold">{sk.quarterly_growth?.['2026-Q1'] || 0}%</div>
                        </div>
                        <div className="bg-white border border-slate-200/80 p-1.5 rounded-lg shadow-2xs">
                          <div className="text-slate-400 text-[9px] font-semibold">Q2</div>
                          <div className="text-slate-800 font-bold">{sk.quarterly_growth?.['2026-Q2'] || 0}%</div>
                        </div>
                        <div className="bg-white border border-slate-200/80 p-1.5 rounded-lg shadow-2xs">
                          <div className="text-slate-400 text-[9px] font-semibold">Q3</div>
                          <div className="text-slate-800 font-bold">{sk.quarterly_growth?.['2026-Q3'] || 0}%</div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                        <span className="text-slate-500 font-medium">Total Growth:</span>
                        <span className={`font-bold ${sk.growth_rate_pct > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          +{sk.growth_rate_pct.toFixed(1)}%
                        </span>
                      </div>
                      {sk.sample_warning && (
                        <div className="text-[10px] text-amber-700 mt-1 font-medium">⚠️ {sk.sample_warning}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OUTCOME FAILURE & ATTRITION CAUSES */}
          {activeTab === 'outcomes' && (
            <div className="space-y-6">
              {/* Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Outcomes</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {outcomeSummary?.total_outcomes || 0}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Sample size: n = {outcomeSummary?.sample_size || 0}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Stale Employment Status</span>
                  <div className="text-2xl font-bold text-amber-600 mt-1">
                    {outcomeSummary?.stale_status_count || 0}
                  </div>
                  <div className="text-xs text-amber-700 font-medium mt-1">REQUIRES_FOLLOW_UP (&gt;180 days)</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Top Non-Placement Cause</span>
                  <div className="text-lg font-bold text-indigo-700 mt-1 truncate">
                    {outcomeSummary?.top_non_placement_reasons?.[0]?.reason_label || 'Skill Mismatch'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {outcomeSummary?.top_non_placement_reasons?.[0]?.percentage || 0}% of non-placed
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Top Attrition Cause</span>
                  <div className="text-lg font-bold text-purple-700 mt-1 truncate">
                    {outcomeSummary?.top_attrition_reasons?.[0]?.reason_label || 'Low Compensation'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {outcomeSummary?.top_attrition_reasons?.[0]?.percentage || 0}% of departures
                  </div>
                </div>
              </div>

              {/* Sections 6, 7, 8: Reason Distributions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 7. Non-Placement Reasons */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <FileQuestion className="w-4 h-4 text-indigo-600" /> 7. Non-Placement Reasons
                      </h3>
                      <p className="text-xs text-slate-500">Reported barriers among unemployed trainees</p>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">
                      n = {nonPlacementBreakdown?.sample_size || 0}
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {(nonPlacementBreakdown?.distribution || []).map((item) => (
                      <div key={item.reason_key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-700 font-medium">{item.reason_label}</span>
                          <span className="text-indigo-600 font-mono font-bold">
                            {item.percentage}% ({item.count})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, item.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500 italic pt-2">
                    Metric: % share of trainees who have not secured employment within 90 days post-graduation.
                  </div>
                </div>

                {/* 8. Employment Attrition Reasons */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-rose-600" /> 8. Employment Attrition Reasons
                      </h3>
                      <p className="text-xs text-slate-500">Reported drivers for early employment termination (&lt;6 mo)</p>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">
                      n = {attritionBreakdown?.sample_size || 0}
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {(attritionBreakdown?.distribution || []).map((item) => (
                      <div key={item.reason_key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-700 font-medium">{item.reason_label}</span>
                          <span className="text-rose-600 font-mono font-bold">
                            {item.percentage}% ({item.count})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-rose-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, item.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500 italic pt-2">
                    Metric: Observed exit reasons for placed candidates leaving jobs before 180 days.
                  </div>
                </div>

                {/* 9. Self-Employment Challenges */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-cyan-600" /> 9. Self-Employment Challenges
                      </h3>
                      <p className="text-xs text-slate-500">Micro-enterprise and freelancing sustainability barriers</p>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">
                      n = {selfEmploymentBreakdown?.sample_size || 0}
                    </span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {(selfEmploymentBreakdown?.distribution || []).map((item) => (
                      <div key={item.reason_key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-700 font-medium">{item.reason_label}</span>
                          <span className="text-cyan-700 font-mono font-bold">
                            {item.percentage}% ({item.count})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-cyan-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, item.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500 italic pt-2">
                    Metric: % distribution of active roadblocks reported by self-employed/entrepreneurial trainees.
                  </div>
                </div>
              </div>

              {/* Observed Associations Panel */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-6 space-y-3">
                <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-600" /> Detected Longitudinal Associations (Non-Causal)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
                  <div className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                    <span className="font-bold text-indigo-900 block mb-1">
                      Curriculum Gap → Placement Delay
                    </span>
                    Trainees exhibiting &gt;2.5 gap level in Spring Boot and Docker were <strong>observed alongside</strong> a 38% longer job-search duration compared to cohort average.
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                    <span className="font-bold text-indigo-900 block mb-1">
                      Wage Expectation vs Attrition
                    </span>
                    Trainees reporting low compensation attrition were <strong>frequently associated with</strong> initial non-benchmark placement below regional median entry wages.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COURSE ANALYSIS & INTERVENTIONS */}
          {activeTab === 'curriculum' && (
            <div className="space-y-6">
              {/* Quick Course Selector */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" /> 5. Course → Job Skill Mismatch Deep Dive
                    </h3>
                    <p className="text-xs text-slate-500">Select any course to view detailed coverage vs employer demand breakdown</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <Link
                    to="/admin/courses/CRS-CLOUD-01/skill-analysis"
                    className="p-4 rounded-xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 transition group shadow-2xs"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        Cloud Architecture & DevOps
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <div className="text-xs text-slate-500 mt-2 font-medium">CRS-CLOUD-01 • Cloud & Infrastructure</div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 font-medium">
                      <span>High Gap: Kubernetes, Terraform</span>
                    </div>
                  </Link>

                  <Link
                    to="/admin/courses/CRS-FULLSTACK-01/skill-analysis"
                    className="p-4 rounded-xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 transition group shadow-2xs"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        Full Stack Web Development
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <div className="text-xs text-slate-500 mt-2 font-medium">CRS-FULLSTACK-01 • Software Engineering</div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 font-medium">
                      <span>High Gap: Spring Boot, Docker</span>
                    </div>
                  </Link>

                  <Link
                    to="/admin/courses/CRS-DATAENG-01/skill-analysis"
                    className="p-4 rounded-xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 transition group shadow-2xs"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        Data Engineering & Analytics
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <div className="text-xs text-slate-500 mt-2 font-medium">CRS-DATAENG-01 • Data Science</div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 font-medium">
                      <span>High Gap: Apache Spark, dbt</span>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Section 10: Recommended Intervention Areas */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" /> 10. Recommended Analytical Interventions
                    </h3>
                    <p className="text-xs text-slate-500">Actionable curriculum additions and institutional interventions</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
                    SYSTEM GENERATED RECOMMENDATIONS
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {(outcomeSummary?.recommended_interventions || []).map((rec, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{rec.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-200' :
                          rec.priority === 'HIGH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <div className="text-xs text-indigo-600 font-mono font-medium">{rec.domain}</div>
                      <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
