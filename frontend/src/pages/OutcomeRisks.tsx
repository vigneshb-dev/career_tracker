import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Filter,
  User,
  Clock,
  BookOpen,
  HelpCircle,
  FileCheck,
  TrendingDown,
  Layers,
  ChevronRight,
  RefreshCw,
  Search,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { outcomeRisksApi } from '../services/api';
import {
  OutcomeRiskItem,
  OutcomeRiskSummary,
  OutcomeRiskType,
  OutcomeRiskSeverity,
  OutcomeRiskStatus,
  Trainee
} from '../types';

export const OutcomeRisks: React.FC = () => {
  const { user, role } = useAuth();
  const isTrainee = role === 'TRAINEE';
  const isCoachOrAdmin = role === 'ADMIN' || role === 'COACH';

  // State
  const [risks, setRisks] = useState<OutcomeRiskItem[]>([]);
  const [summary, setSummary] = useState<OutcomeRiskSummary | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<OutcomeRiskItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reassessment Modal State
  const [showReassessModal, setShowReassessModal] = useState<boolean>(false);
  const [reassessScore, setReassessScore] = useState<number>(85);
  const [reassessEvaluator, setReassessEvaluator] = useState<string>(user?.full_name || 'Coach Lead');
  const [reassessNotes, setReassessNotes] = useState<string>('Verified candidate proficiency improvement.');
  const [submittingReassess, setSubmittingReassess] = useState<boolean>(false);

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('Prioritizing active employment interview schedule.');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Load Data
  const loadRisksData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (filterType) params.risk_type = filterType;
      if (filterSeverity) params.severity = filterSeverity;
      if (filterStatus) params.status = filterStatus;
      if (isTrainee && user?.trainee_id) params.trainee_id = user.trainee_id;

      const [risksRes, summaryRes] = await Promise.all([
        outcomeRisksApi.getOutcomeRisks(params),
        outcomeRisksApi.getOutcomeRisksSummary().catch(() => null)
      ]);

      setRisks(risksRes);
      setSummary(summaryRes);
      if (risksRes.length > 0 && !selectedRisk) {
        setSelectedRisk(risksRes[0]);
      } else if (selectedRisk) {
        // Keep updated record selected
        const updated = risksRes.find((r: OutcomeRiskItem) => r.id === selectedRisk.id);
        if (updated) setSelectedRisk(updated);
      }
    } catch (err: any) {
      console.error('Failed to load outcome risks', err);
      setError(err.message || 'Error loading outcome risks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRisksData();
  }, [filterType, filterSeverity, filterStatus]);

  const handleScanRisks = async () => {
    setScanning(true);
    try {
      await outcomeRisksApi.scanOutcomeRisks(isTrainee && user?.trainee_id ? user.trainee_id : undefined);
      await loadRisksData();
    } catch (err: any) {
      console.error('Scan failed', err);
      setError('Risk scan failed: ' + (err.message || 'Unknown error'));
    } finally {
      setScanning(false);
    }
  };

  // Intervention Loop Actions
  const handleAcceptIntervention = async (riskId: string) => {
    setSubmittingAction(true);
    try {
      const updated = await outcomeRisksApi.acceptIntervention(riskId, 'Accepted by candidate / coach');
      setSelectedRisk(updated);
      await loadRisksData();
    } catch (err: any) {
      setError(err.message || 'Failed to accept intervention');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRejectIntervention = async () => {
    if (!selectedRisk) return;
    setSubmittingAction(true);
    try {
      const updated = await outcomeRisksApi.rejectIntervention(selectedRisk.id, rejectReason);
      setSelectedRisk(updated);
      setShowRejectModal(false);
      await loadRisksData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject intervention');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleStartIntervention = async (riskId: string) => {
    setSubmittingAction(true);
    try {
      const updated = await outcomeRisksApi.startOutcomeRiskIntervention(riskId);
      setSelectedRisk(updated);
      await loadRisksData();
    } catch (err: any) {
      setError(err.message || 'Failed to start intervention');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCompleteIntervention = async (riskId: string) => {
    setSubmittingAction(true);
    try {
      const updated = await outcomeRisksApi.completeIntervention(riskId);
      setSelectedRisk(updated);
      await loadRisksData();
    } catch (err: any) {
      setError(err.message || 'Failed to complete intervention');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSubmitReassessment = async () => {
    if (!selectedRisk) return;
    setSubmittingReassess(true);
    try {
      const updated = await outcomeRisksApi.reassessRisk(selectedRisk.id, {
        assessment_score: Number(reassessScore),
        evaluator_name: reassessEvaluator,
        evaluator_role: 'Career Coach',
        notes: reassessNotes
      });
      setSelectedRisk(updated);
      setShowReassessModal(false);
      await loadRisksData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit reassessment');
    } finally {
      setSubmittingReassess(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'INTERVENTION_IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'INTERVENTION_ACCEPTED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'INTERVENTION_REJECTED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'INTERVENTION_COMPLETED':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'REASSESSED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'MONITORING':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const filteredRisks = risks.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.trainee_name || '').toLowerCase().includes(q) ||
      r.trainee_id.toLowerCase().includes(q) ||
      r.risk_type.toLowerCase().includes(q) ||
      (r.signals || []).some(s => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 pb-16 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold tracking-wide border border-rose-500/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>OUTCOME RISK ENGINE & INTERVENTION LOOP</span>
              <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase">
                RISK SIGNAL
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Workforce Outcome Risk Intelligence
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Detects early risk signals across persistent skill gaps, employment instability, follow-up failures, and data staleness. Governs the complete closed-loop remediation lifecycle.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isCoachOrAdmin && (
              <button
                onClick={handleScanRisks}
                disabled={scanning}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 text-white font-bold hover:brightness-110 transition shadow-lg shadow-rose-500/25 flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                <span>{scanning ? 'Scanning Workforce...' : 'Scan for Risk Signals'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Explainability Banner */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-start gap-3 text-xs text-slate-300">
          <HelpCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white">
              Zero Black-Box AI: Every risk is 100% explainable and exposes exactly WHY: Signal 1, Signal 2, Signal 3.
            </p>
            <p className="text-slate-400 mt-0.5">
              Closed Loop: Risk &rarr; Suggested Intervention &rarr; Trainee Accepts/Rejects &rarr; Intervention Performed &rarr; Reassessment &rarr; Risk Recalculated &rarr; Outcome Recorded.
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================
          SECTION 1: RISK OVERVIEW KPI METRICS
          ======================================================== */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Active Risks</span>
            <div className="text-2xl font-black text-slate-900">{summary.total_risks}</div>
            <span className="text-[11px] text-slate-500">Across cohorts</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs space-y-1 bg-rose-50/20">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Critical Severity</span>
            <div className="text-2xl font-black text-rose-700">{summary.by_severity['CRITICAL'] || 0}</div>
            <span className="text-[11px] text-rose-600 font-medium">Immediate intervention</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-1 bg-amber-50/20">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">High Severity</span>
            <div className="text-2xl font-black text-amber-700">{summary.by_severity['HIGH'] || 0}</div>
            <span className="text-[11px] text-amber-600 font-medium">Action recommended</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-2xs space-y-1 bg-indigo-50/20">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Medium / Low</span>
            <div className="text-2xl font-black text-indigo-700">
              {(summary.by_severity['MEDIUM'] || 0) + (summary.by_severity['LOW'] || 0)}
            </div>
            <span className="text-[11px] text-indigo-600 font-medium">Under observation</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs space-y-1 bg-blue-50/20">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">In Remediation</span>
            <div className="text-2xl font-black text-blue-700">{summary.active_interventions_count}</div>
            <span className="text-[11px] text-blue-600 font-medium">Interventions active</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-1 bg-emerald-50/20">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Resolved</span>
            <div className="text-2xl font-black text-emerald-700">{summary.by_status['RESOLVED'] || 0}</div>
            <span className="text-[11px] text-emerald-600 font-medium">Post-reassessment</span>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Risk List & Filters (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by trainee, signal, or type..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs border-none outline-none text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="text-[11px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
              >
                <option value="">All Types</option>
                <option value="SKILL_GAP">Skill Gap</option>
                <option value="EMPLOYMENT_INSTABILITY">Instability</option>
                <option value="FOLLOWUP_FAILURE">Follow-up</option>
                <option value="DATA_STALENESS">Staleness</option>
                <option value="JOB_SEARCH_DIFFICULTY">Job Search</option>
                <option value="TRAINING_JOB_MISMATCH">Mismatch</option>
              </select>

              <select
                value={filterSeverity}
                onChange={e => setFilterSeverity(e.target.value)}
                className="text-[11px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-[11px] px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
              >
                <option value="">All Statuses</option>
                <option value="INTERVENTION_SUGGESTED">Suggested</option>
                <option value="INTERVENTION_ACCEPTED">Accepted</option>
                <option value="INTERVENTION_IN_PROGRESS">In Progress</option>
                <option value="INTERVENTION_COMPLETED">Completed</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          {/* Risk Items List */}
          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {loading ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                <p className="text-xs">Loading outcome risk signals...</p>
              </div>
            ) : filteredRisks.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">No Matching Risk Signals</h4>
                <p className="text-xs text-slate-400">All scanned candidates meet current workforce benchmarks.</p>
              </div>
            ) : (
              filteredRisks.map(r => {
                const isSelected = selectedRisk?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRisk(r)}
                    className={`p-4 rounded-2xl border cursor-pointer transition relative space-y-2.5 ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white text-slate-800 border-slate-200/90 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase border ${
                        isSelected ? 'bg-slate-800 text-white border-slate-700' : getSeverityBadge(r.severity)
                      }`}>
                        {r.severity}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase border ${
                        isSelected ? 'bg-slate-800 text-slate-300 border-slate-700' : getStatusBadge(r.status)
                      }`}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div>
                      <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {r.risk_type.replace(/_/g, ' ')}
                      </div>
                      <div className={`text-xs ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                        Candidate: {r.trainee_name || r.trainee_id}
                      </div>
                    </div>

                    {/* Primary Signal snippet */}
                    {r.signals && r.signals[0] && (
                      <p className={`text-xs line-clamp-2 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                        {r.signals[0]}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px] opacity-70">
                      <span>{r.signals.length} Signals Detected</span>
                      <span>{r.updated_at.slice(0, 10)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Risk Detail, Evidence, Intervention & Reassessment (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedRisk ? (
            <>
              {/* SECTION 2: Risk Detail Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-100 text-rose-800 uppercase border border-rose-200">
                        {selectedRisk.risk_signal_label}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase border ${getSeverityBadge(selectedRisk.severity)}`}>
                        {selectedRisk.severity} SEVERITY
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase border ${getStatusBadge(selectedRisk.status)}`}>
                        {selectedRisk.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mt-1.5">
                      {selectedRisk.risk_type.replace(/_/g, ' ')}
                    </h2>
                  </div>

                  <div className="text-right text-xs text-slate-500">
                    <div>ID: <span className="font-mono text-slate-700">{selectedRisk.id}</span></div>
                    <div>Updated: {selectedRisk.updated_at}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <User className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-slate-500">Candidate:</span>{' '}
                    <strong className="text-slate-900">{selectedRisk.trainee_name || selectedRisk.trainee_id}</strong>
                  </div>
                  <div className="text-slate-300">|</div>
                  <div>
                    <span className="text-slate-500">Trainee ID:</span>{' '}
                    <strong className="font-mono text-slate-700">{selectedRisk.trainee_id}</strong>
                  </div>
                </div>

                {/* ========================================================
                    SECTION 3: EVIDENCE & EXPLAINABILITY (WHY:)
                    ======================================================== */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                      Explainability Diagnostic (WHY This Risk Was Flagged)
                    </h3>
                  </div>

                  {/* 3 Explicit Signals (Signal 1, Signal 2, Signal 3) */}
                  <div className="space-y-2">
                    <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-rose-900 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 text-[10px] flex items-center justify-center font-black">
                          1
                        </span>
                        <span>Signal 1 (Primary Diagnostic)</span>
                      </div>
                      <p className="text-rose-800 pl-5.5 font-medium leading-relaxed">
                        {selectedRisk.why_explanation.signal_1}
                      </p>
                    </div>

                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-[10px] flex items-center justify-center font-black">
                          2
                        </span>
                        <span>Signal 2 (Historical Corroboration)</span>
                      </div>
                      <p className="text-amber-800 pl-5.5 font-medium leading-relaxed">
                        {selectedRisk.why_explanation.signal_2}
                      </p>
                    </div>

                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-800 text-[10px] flex items-center justify-center font-black">
                          3
                        </span>
                        <span>Signal 3 (Longitudinal Milestone Baseline)</span>
                      </div>
                      <p className="text-indigo-800 pl-5.5 font-medium leading-relaxed">
                        {selectedRisk.why_explanation.signal_3}
                      </p>
                    </div>
                  </div>

                  {/* Structured Evidence Table */}
                  {selectedRisk.evidence && Object.keys(selectedRisk.evidence).length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Structured Evidence Audit Trail
                      </p>
                      <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 overflow-x-auto">
                        <pre className="text-[11px] text-slate-700 font-mono">
                          {JSON.stringify(selectedRisk.evidence, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>

                {/* ========================================================
                    SECTION 4: INTERVENTION (RECOMMENDED ACTION)
                    ======================================================== */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                        Suggested Remediation Intervention
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Actionable Plan
                    </span>
                  </div>

                  {selectedRisk.recommended_intervention ? (
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            {selectedRisk.recommended_intervention.type}
                          </span>
                          <h4 className="font-bold text-slate-900 text-base mt-1">
                            {selectedRisk.recommended_intervention.title}
                          </h4>
                        </div>
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {selectedRisk.recommended_intervention.estimated_effort}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        {selectedRisk.recommended_intervention.rationale}
                      </p>

                      <div className="text-xs text-slate-600 pt-2 border-t border-emerald-100 flex flex-wrap gap-4">
                        <div>
                          <span className="text-slate-400">Provider:</span>{' '}
                          <strong>{selectedRisk.recommended_intervention.provider_or_platform}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Expected Outcome:</span>{' '}
                          <strong className="text-emerald-800">
                            {selectedRisk.recommended_intervention.expected_outcome}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No specific catalog intervention assigned.</p>
                  )}

                  {/* Intervention Loop Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {/* If Suggested or Detected */}
                    {['DETECTED', 'INTERVENTION_SUGGESTED'].includes(selectedRisk.status) && (
                      <>
                        <button
                          onClick={() => handleAcceptIntervention(selectedRisk.id)}
                          disabled={submittingAction}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept Intervention</span>
                        </button>

                        <button
                          onClick={() => setShowRejectModal(true)}
                          disabled={submittingAction}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200 flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          <span>Decline / Reject</span>
                        </button>
                      </>
                    )}

                    {/* If Accepted */}
                    {selectedRisk.status === 'INTERVENTION_ACCEPTED' && (
                      <button
                        onClick={() => handleStartIntervention(selectedRisk.id)}
                        disabled={submittingAction}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Start Intervention</span>
                      </button>
                    )}

                    {/* If In Progress */}
                    {selectedRisk.status === 'INTERVENTION_IN_PROGRESS' && (
                      <button
                        onClick={() => handleCompleteIntervention(selectedRisk.id)}
                        disabled={submittingAction}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Mark Intervention Completed</span>
                      </button>
                    )}

                    {/* If Completed or Under Reassessment (Coach / Admin) */}
                    {['INTERVENTION_COMPLETED', 'MONITORING', 'INTERVENTION_IN_PROGRESS'].includes(
                      selectedRisk.status
                    ) && isCoachOrAdmin && (
                      <button
                        onClick={() => setShowReassessModal(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Conduct Reassessment & Recalculate Risk</span>
                      </button>
                    )}

                    {selectedRisk.status === 'RESOLVED' && (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Risk Successfully Resolved via Verified Reassessment</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ========================================================
                    SECTION 5: REASSESSMENT AUDIT HISTORY
                    ======================================================== */}
                {selectedRisk.reassessment_record && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-purple-600" />
                      <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                        Reassessment Outcome & Recalculation Audit
                      </h3>
                    </div>

                    <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 text-xs space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-purple-900">
                          Verified Score: {selectedRisk.reassessment_record.normalized_score}%
                        </span>
                        <span className="font-extrabold text-[10px] px-2 py-0.5 rounded bg-purple-200 text-purple-800 uppercase">
                          {selectedRisk.reassessment_record.outcome_verdict}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-slate-600">
                        <span>Evaluator: {selectedRisk.reassessment_record.evaluator_name}</span>
                        <span>•</span>
                        <span>Date: {selectedRisk.reassessment_record.reassessed_at}</span>
                        <span>•</span>
                        <span>
                          Severity Shift: {selectedRisk.reassessment_record.old_severity} &rarr;{' '}
                          <strong>{selectedRisk.reassessment_record.new_severity}</strong>
                        </span>
                      </div>

                      <p className="text-purple-800 font-medium">
                        {selectedRisk.reassessment_record.recalc_note}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <ShieldAlert className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-medium text-slate-600 text-sm">Select an outcome risk to view explainability evidence.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reassessment Modal */}
      {showReassessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Conduct Risk Reassessment</h3>
              </div>
              <button
                onClick={() => setShowReassessModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Reassessment Score (0 - 100%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={reassessScore}
                  onChange={e => setReassessScore(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-sm font-bold"
                />
                <span className="text-[11px] text-slate-400">
                  Scores &ge; 80% automatically resolve the risk. Scores 60-79% lower severity to monitoring.
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Evaluator / Coach Name</label>
                <input
                  type="text"
                  value={reassessEvaluator}
                  onChange={e => setReassessEvaluator(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Assessment Evaluation Notes</label>
                <textarea
                  rows={3}
                  value={reassessNotes}
                  onChange={e => setReassessNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReassessModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReassessment}
                disabled={submittingReassess}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
              >
                {submittingReassess ? 'Recalculating...' : 'Submit & Recalculate Risk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Intervention Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">Decline Suggested Intervention</h3>
            <p className="text-xs text-slate-500">
              Please document the reason for declining this intervention. This will be recorded on the trainee passport audit timeline.
            </p>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700">Decline Reason</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectIntervention}
                disabled={submittingAction}
                className="px-5 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutcomeRisks;
