import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Sliders,
  TrendingUp,
  AlertTriangle,
  Briefcase,
  GitCompare,
  Award,
  BookOpen,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldAlert,
  Layers,
  MapPin,
  Clock,
  Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { careerSimulatorApi, api } from '../services/api';
import {
  ScenarioInput,
  SimulationResponse,
  SimulatorOptions,
  Trainee
} from '../types';

export const CareerSimulator: React.FC = () => {
  const { user, role } = useAuth();
  const isTrainee = role === 'TRAINEE';

  // State
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [selectedTraineeId, setSelectedTraineeId] = useState<string>(
    user?.trainee_id || 'TRN-2024-001'
  );
  const [baselineData, setBaselineData] = useState<any>(null);
  const [loadingBaseline, setLoadingBaseline] = useState<boolean>(false);
  const [options, setOptions] = useState<SimulatorOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scenario Builder Form State
  const [additionalSkills, setAdditionalSkills] = useState<
    Array<{ name: string; level: string }>
  >([
    { name: 'Power BI', level: 'strong' }
  ]);
  const [selectedCert, setSelectedCert] = useState<string>('Microsoft Certified: Power BI Data Analyst Associate');
  const [targetRole, setTargetRole] = useState<string>('Data Analyst');
  const [targetLocation, setTargetLocation] = useState<string>('Bengaluru, Karnataka');
  const [selectedIntervention, setSelectedIntervention] = useState<string>('Targeted Competency Accelerator & Practical Lab');
  const [customSkillInput, setCustomSkillInput] = useState<string>('');
  const [customSkillLevel, setCustomSkillLevel] = useState<string>('strong');

  // Synchronize trainee selection with authenticated user profile
  useEffect(() => {
    if (isTrainee && user?.trainee_id && selectedTraineeId !== user.trainee_id) {
      setSelectedTraineeId(user.trainee_id);
    }
  }, [user, isTrainee]);

  // Load Trainees (if coach/admin) and Simulator Options
  useEffect(() => {
    const initData = async () => {
      setLoadingOptions(true);
      try {
        const [optRes, traineesRes] = await Promise.all([
          careerSimulatorApi.getSimulatorOptions(),
          api.getTraineesPaginated({ page_size: 50 }).catch(() => ({ data: [] }))
        ]);
        setOptions(optRes);
        if (traineesRes && (traineesRes as any).data) {
          const list = (traineesRes as any).data;
          setTrainees(list);
          if (!isTrainee && list.length > 0) {
            // Select first trainee if selectedTraineeId not in list
            if (!selectedTraineeId || !list.some((t: any) => t.id === selectedTraineeId)) {
              setSelectedTraineeId(list[0].id);
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to load simulator metadata', err);
        setError('Could not initialize career simulator options. Using standard defaults.');
      } finally {
        setLoadingOptions(false);
      }
    };
    initData();
  }, [isTrainee]);

  // Fetch Trainee Baseline when selected candidate changes
  useEffect(() => {
    if (!selectedTraineeId) return;
    const fetchBaseline = async () => {
      setLoadingBaseline(true);
      try {
        const bl = await careerSimulatorApi.getTraineeBaseline(selectedTraineeId);
        setBaselineData(bl);
        if (bl.target_roles && bl.target_roles.length > 0) {
          setTargetRole(bl.target_roles[0]);
        } else if (bl.current_role) {
          setTargetRole(bl.current_role);
        }
        if (bl.location) {
          setTargetLocation(bl.location);
        }
      } catch (err) {
        console.warn('Could not fetch candidate baseline', err);
      } finally {
        setLoadingBaseline(false);
      }
    };
    fetchBaseline();
  }, [selectedTraineeId]);

  // Run Simulation when candidate changes or baseline is loaded
  useEffect(() => {
    if (selectedTraineeId) {
      handleRunSimulation();
    }
  }, [selectedTraineeId]);

  const handleAddSkill = () => {
    if (!customSkillInput.trim()) return;
    setAdditionalSkills(prev => [
      ...prev,
      { name: customSkillInput.trim(), level: customSkillLevel }
    ]);
    setCustomSkillInput('');
  };

  const handleRemoveSkill = (index: number) => {
    setAdditionalSkills(prev => prev.filter((_, i) => i !== index));
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setError(null);

    const effectiveTraineeId = isTrainee && user?.trainee_id ? user.trainee_id : selectedTraineeId;

    const scenarioPayload: ScenarioInput = {
      trainee_id: effectiveTraineeId || undefined,
      additional_skills: additionalSkills,
      certification: selectedCert || undefined,
      target_role: targetRole || undefined,
      target_location: targetLocation || undefined,
      intervention_name: selectedIntervention || undefined,
      scenario_name: `${targetRole || 'Career'} Pivot Simulation`
    };

    try {
      const res = await careerSimulatorApi.runSimulation(scenarioPayload);
      setSimulationResult(res);
    } catch (err: any) {
      console.error('Simulation execution failed', err);
      setError(err.message || 'Error executing What-If Career Simulation.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 font-sans">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold tracking-wide border border-brand-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>WHAT-IF CAREER SIMULATOR</span>
              <span className="bg-brand-500 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase">SIMULATION</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Career Trajectory & Competency Simulator
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Explore hypothetical career scenarios by testing additional skills, certifications, and interventions against active workforce job requirements.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {!isTrainee && trainees.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-medium">Select Candidate</label>
                <select
                  value={selectedTraineeId}
                  onChange={e => setSelectedTraineeId(e.target.value)}
                  className="bg-slate-800/80 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-400 outline-none"
                >
                  {trainees.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.id}) - {t.program}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleRunSimulation}
              disabled={simulating}
              className="mt-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 text-slate-950 font-bold hover:brightness-110 transition shadow-lg shadow-brand-500/25 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${simulating ? 'animate-spin' : ''}`} />
              <span>{simulating ? 'Simulating...' : 'Recalculate Scenario'}</span>
            </button>
          </div>
        </div>

        {/* Mandatory Transparency & Guarantee Disclaimer Banner */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-start gap-3 text-xs text-slate-400">
          <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-200">
              Disclaimer: Simulation based on available profile and job requirement data.
            </p>
            <p className="text-slate-400 mt-0.5">
              Predictions are exploratory estimations and are not guaranteed employment offers. The platform does not fabricate salaries or employment probabilities.
            </p>
          </div>
        </div>
      </div>

      {/* Error / Alert notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Grid: Left Column (Current Profile + Scenario Builder), Right Column (Results) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ========================================================
            SECTION 1 & 2: CURRENT PROFILE & SCENARIO BUILDER
            ======================================================== */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* SECTION 1: Current Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-900 text-base">Current Profile</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-700">
                Baseline
              </span>
            </div>

            {simulationResult ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Candidate:</span>
                  <span className="font-semibold text-slate-800">
                    {simulationResult.current_profile.trainee_name || selectedTraineeId}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Target Role:</span>
                  <span className="font-semibold text-slate-800">
                    {simulationResult.current_profile.target_role || 'Specialist'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Baseline Skills:</span>
                  <span className="font-semibold text-indigo-600">
                    {simulationResult.current_profile.skills.length} Competencies
                  </span>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Verified Competencies
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {simulationResult.current_profile.skills.map((s, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          s.level === 'strong' || s.proficiency_score >= 4.0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.level === 'weak' || s.proficiency_score < 3.0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {s.name}
                        <span className="opacity-70 text-[10px]">({s.level})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-2 py-4">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-4 bg-slate-100 rounded w-5/6" />
              </div>
            )}
          </div>

          {/* SECTION 2: Scenario Builder Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-600" />
                <h2 className="font-bold text-slate-900 text-base">Scenario Builder</h2>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                WHAT-IF
              </span>
            </div>

            {/* Additional Skills Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                + Additional Skill(s)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Power BI, Docker, Kubernetes"
                  value={customSkillInput}
                  onChange={e => setCustomSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <select
                  value={customSkillLevel}
                  onChange={e => setCustomSkillLevel(e.target.value)}
                  className="px-2 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium"
                >
                  <option value="weak">Weak (2.0)</option>
                  <option value="moderate">Moderate (3.5)</option>
                  <option value="strong">Strong (4.5)</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="p-2 bg-brand-500 text-slate-900 rounded-xl hover:bg-brand-600 transition"
                  title="Add Skill"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Active Additional Skills Tags */}
              <div className="space-y-1.5 pt-2">
                {additionalSkills.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-1.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-indigo-900">{s.name}</span>
                      <span className="text-[10px] uppercase font-semibold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                        {s.level}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(idx)}
                      className="text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Certification */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>+ Optional Certification</span>
              </label>
              <select
                value={selectedCert}
                onChange={e => setSelectedCert(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="">None / Uncertified</option>
                {(options?.suggested_certifications || [
                  'Microsoft Certified: Power BI Data Analyst Associate',
                  'AWS Certified Solutions Architect - Associate',
                  'Meta Front-End Developer Professional Certificate',
                  'Google Data Analytics Professional Certificate'
                ]).map((c, i) => (
                  <option key={i} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Target Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                <span>+ Optional Target Role</span>
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g. Data Analyst, BI Developer"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            {/* Optional Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>+ Optional Location</span>
              </label>
              <input
                type="text"
                value={targetLocation}
                onChange={e => setTargetLocation(e.target.value)}
                placeholder="e.g. Bengaluru, Remote India"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            {/* Optional Intervention */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                <span>+ Optional Intervention</span>
              </label>
              <select
                value={selectedIntervention}
                onChange={e => setSelectedIntervention(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="">None / Self-Study</option>
                <option value="Targeted Competency Accelerator & Practical Lab">
                  Targeted Competency Accelerator & Practical Lab
                </option>
                <option value="Comprehensive Interview & Technical Screening Clinic">
                  Comprehensive Interview & Technical Screening Clinic
                </option>
                <option value="On-the-Job Alignment & Workplace Skill Bridging">
                  On-the-Job Alignment & Workplace Skill Bridging
                </option>
                <option value="AWS Cloud Foundations Intensive">
                  AWS Cloud Foundations Intensive
                </option>
              </select>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={simulating}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition shadow flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>{simulating ? 'Calculating Impact...' : 'Simulate Profile Impact'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: SIMULATION RESULTS & SECTIONS 3-7
            ======================================================== */}
        <div className="lg:col-span-8 space-y-6">

          {/* Insufficient Data State */}
          {simulationResult?.status === 'INSUFFICIENT_DATA' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4">
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
              <div className="max-w-md mx-auto space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-amber-200 text-amber-900">
                  INSUFFICIENT_DATA
                </span>
                <h3 className="text-lg font-bold text-slate-900">Insufficient Observational Data</h3>
                <p className="text-sm text-slate-600">
                  {simulationResult.data_sufficiency?.note ||
                    'There are not enough verified active job benchmarks or historical observations to simulate this specific combination.'}
                </p>
                <div className="text-xs text-slate-500 pt-2">
                  Please widen your target role or location criteria to simulate across available workforce datasets.
                </div>
              </div>
            </div>
          ) : simulationResult ? (
            <>
              {/* SECTION 7: Comparison & Estimated Readiness Delta */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-bold text-slate-900 text-base">
                      Current Profile vs. Simulated Profile Comparison
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                      {simulationResult.output_label}
                    </span>
                    <span className="text-[11px] font-extrabold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      {simulationResult.estimation_label}
                    </span>
                  </div>
                </div>

                {/* Side-by-Side Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Current Profile Baseline
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-800">
                        {simulationResult.estimated_readiness.current_readiness}%
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Estimated Readiness</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-slate-600 h-2 rounded-full"
                        style={{ width: `${simulationResult.estimated_readiness.current_readiness}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Total Demonstrated Skills: {simulationResult.current_profile.skills.length}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/80 to-brand-50/40 border border-indigo-200 space-y-3 relative overflow-hidden">
                    <div className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center justify-between">
                      <span>Simulated Profile</span>
                      <span className="text-emerald-700 font-extrabold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                        +{simulationResult.estimated_readiness.readiness_delta}% Delta
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-indigo-950">
                        {simulationResult.estimated_readiness.simulated_readiness}%
                      </span>
                      <span className="text-xs text-indigo-700 font-medium">Estimated Readiness</span>
                    </div>
                    <div className="w-full bg-indigo-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-brand-500 to-indigo-600 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${simulationResult.estimated_readiness.simulated_readiness}%` }}
                      />
                    </div>
                    <p className="text-xs text-indigo-800 font-medium">
                      Simulated Skills: {simulationResult.simulated_profile.skills.length} (+
                      {simulationResult.simulated_profile.skills.length - simulationResult.current_profile.skills.length} New)
                    </p>
                  </div>
                </div>

                {/* Benchmark Explanation Note */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span>
                    <strong>Benchmark Basis:</strong> {simulationResult.estimated_readiness.benchmark_basis}
                  </span>
                  <span className="font-semibold text-slate-500 shrink-0">
                    Confidence: Grounded in Verified DB Requirements
                  </span>
                </div>
              </div>

              {/* SECTION 3: Skill Changes */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-slate-900 text-base">Skill Changes in Scenario</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {simulationResult.skill_changes.map((sc, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">{sc.skill_name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            sc.change_type === 'ADDED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sc.change_type === 'UPGRADED'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sc.change_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="text-slate-500 capitalize">{sc.previous_level} ({sc.previous_score}/5.0)</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-indigo-700 capitalize">
                          {sc.simulated_level} ({sc.simulated_score}/5.0)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{sc.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 4: Job Impact */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-brand-600" />
                    <h2 className="font-bold text-slate-900 text-base">
                      Job Market Impact & Changed Match Scores
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-slate-600">
                    {simulationResult.changed_job_matches.length} Relevant Vacancies Evaluated
                  </span>
                </div>

                {/* Newly Matched Jobs Banner */}
                {simulationResult.newly_matched_jobs.length > 0 && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Newly Matched Jobs ({simulationResult.newly_matched_jobs.length} Unlocked)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {simulationResult.newly_matched_jobs.map((job, idx) => (
                        <div key={idx} className="bg-white p-3.5 rounded-lg border border-emerald-200 shadow-2xs space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{job.title}</h4>
                            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                              {job.simulated_match_score}% Match
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{job.employer_name} • {job.location}</p>
                          <p className="text-[11px] text-emerald-800 font-medium">{job.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Changed Job Match Scores Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                        <th className="py-2.5">Job Title & Employer</th>
                        <th className="py-2.5">Location</th>
                        <th className="py-2.5">Baseline Match</th>
                        <th className="py-2.5">Simulated Match</th>
                        <th className="py-2.5">Score Delta</th>
                        <th className="py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {simulationResult.changed_job_matches.map((job, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 font-semibold text-slate-900">
                            <div>{job.title}</div>
                            <div className="text-[11px] text-slate-500 font-normal">{job.employer_name}</div>
                          </td>
                          <td className="py-3 text-slate-500">{job.location}</td>
                          <td className="py-3 font-medium text-slate-600">{job.current_match_score}%</td>
                          <td className="py-3 font-bold text-indigo-700">{job.simulated_match_score}%</td>
                          <td className="py-3">
                            <span className={`font-bold ${job.score_change > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {job.score_change > 0 ? `+${job.score_change}%` : '0.0%'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                job.status === 'NEWLY_MATCHED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : job.status === 'IMPROVED_MATCH'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {job.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 5: Remaining Gaps */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h2 className="font-bold text-slate-900 text-base">
                      Remaining Skill Gaps for Target Outcomes
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {simulationResult.remaining_skill_gaps.length} Remaining Gaps
                  </span>
                </div>

                {simulationResult.remaining_skill_gaps.length === 0 ? (
                  <p className="text-xs text-emerald-700 bg-emerald-50 p-4 rounded-xl">
                    All core qualification requirements for the target role are fully addressed in this simulation!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {simulationResult.remaining_skill_gaps.map((gap, i) => (
                      <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-slate-800 text-xs">{gap.skill_name}</span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                              gap.priority === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {gap.priority}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Current: {gap.current_level}/5.0</span>
                          <span>Target: {gap.target_level}/5.0</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-amber-500 h-1.5 rounded-full"
                            style={{ width: `${(gap.current_level / gap.target_level) * 100}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">{gap.importance_label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 6: Required Training / Interventions */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-bold text-slate-900 text-base">
                      Required Training & Catalog Interventions
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">To achieve this simulated scenario</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {simulationResult.required_training_interventions.map((inv, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {inv.type}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">{inv.title}</h4>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {inv.estimated_effort}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{inv.description}</p>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">{inv.provider_or_platform}</span>
                        <span className="text-indigo-600 font-semibold">{inv.domain}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 8: Newly Eligible Career Pathways */}
              {simulationResult.newly_eligible_pathways.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      <h2 className="font-bold text-slate-900 text-base">
                        Eligible Career Pathways & Milestone Progression
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      Pathway Expansion
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {simulationResult.newly_eligible_pathways.map((pw, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-500">{pw.track}</span>
                            <h4 className="font-bold text-slate-900 text-sm mt-0.5">{pw.title}</h4>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              pw.status === 'NEWLY_ELIGIBLE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {pw.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-600 font-medium">
                            <span>Readiness: {pw.current_readiness}% &rarr; {pw.simulated_readiness}%</span>
                            <span className="text-emerald-700 font-bold">+{pw.readiness_delta}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-emerald-600 h-2 rounded-full"
                              style={{ width: `${pw.simulated_readiness}%` }}
                            />
                          </div>
                        </div>

                        {pw.unlocked_milestones.length > 0 && (
                          <div className="text-[11px] text-slate-500 pt-1">
                            <strong>Unlocked Milestones:</strong> {pw.unlocked_milestones.join(' • ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Sparkles className="w-10 h-10 mx-auto text-slate-300 animate-pulse mb-3" />
              <p className="font-medium text-slate-600">Simulating scenario impact...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareerSimulator;
