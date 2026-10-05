import React, { useState, useEffect } from 'react';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  BookOpen,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Search,
  ChevronRight,
  Info,
  Award,
  HelpCircle,
  FileQuestion,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { skillIntelligenceApi, outcomeIntelligenceApi, api } from '../services/api';
import {
  TraineeSkillGapResponse,
  TraineeSkillGapItem,
  FollowUpGenerationResponse,
  FollowUpAnswerItem
} from '../types';

export const TraineeSkillGapDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const isTrainee = role === 'TRAINEE';

  // State
  const defaultId = user?.trainee_id || 'TRN-2024-001';
  const [traineeId, setTraineeId] = useState<string>(defaultId);
  const [inputTraineeId, setInputTraineeId] = useState<string>(defaultId);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [data, setData] = useState<TraineeSkillGapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync traineeId when auth loads user profile
  useEffect(() => {
    if (user?.trainee_id && user.trainee_id !== traineeId) {
      setTraineeId(user.trainee_id);
      setInputTraineeId(user.trainee_id);
    }
  }, [user?.trainee_id]);

  // Dynamic Follow-Up Questionnaire State
  const [showFollowUp, setShowFollowUp] = useState<boolean>(false);
  const [followUpLoading, setFollowUpLoading] = useState<boolean>(false);
  const [followUpData, setFollowUpData] = useState<FollowUpGenerationResponse | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [followUpNotes, setFollowUpNotes] = useState<Record<string, string>>({});
  const [submittingAnswers, setSubmittingAnswers] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  const loadTraineeGaps = async (id: string, jobId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = jobId ? { target_job_id: jobId } : undefined;
      const res = await skillIntelligenceApi.getTraineeSkillIntelligence(id, params);
      setData(res);
      if (!jobId && res.target_job_id) {
        setSelectedJobId(res.target_job_id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load trainee skill gap profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (traineeId) {
      loadTraineeGaps(traineeId, selectedJobId || undefined);
    }
  }, [traineeId, selectedJobId]);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedJobId(val);
    loadTraineeGaps(traineeId, val || undefined);
  };

  const handleSelectTrainee = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputTraineeId.trim()) {
      setTraineeId(inputTraineeId.trim());
      setSelectedJobId('');
    }
  };

  // Generate Follow-up questions
  const handleOpenFollowUp = async () => {
    setShowFollowUp(true);
    setFollowUpLoading(true);
    setSubmissionSuccess(null);
    try {
      const qRes = await outcomeIntelligenceApi.generateFollowUpQuestions(traineeId, 'UNEMPLOYED');
      setFollowUpData(qRes);
      // init answer map
      const initial: Record<string, string> = {};
      qRes.questions.forEach((q: any) => {
        initial[q.id] = q.options && q.options.length > 0 ? q.options[0] : '';
      });
      setFollowUpAnswers(initial);
    } catch (err: any) {
      console.error(err);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleSubmitFollowUp = async () => {
    if (!followUpData) return;
    setSubmittingAnswers(true);
    try {
      const answerList: FollowUpAnswerItem[] = followUpData.questions.map((q) => ({
        question_id: q.id,
        question_text: q.question_text,
        answer_value: followUpAnswers[q.id] || 'Not specified',
        details: followUpNotes[q.id] || ''
      }));

      await outcomeIntelligenceApi.submitFollowUpResponse({
        trainee_id: traineeId,
        employment_status: followUpData.employment_status,
        answers: answerList
      });

      setSubmissionSuccess('Follow-up responses logged to Trainee Digital Passport & Outcome Intelligence audit.');
      setTimeout(() => setShowFollowUp(false), 2200);
    } catch (err: any) {
      alert('Error submitting follow-up: ' + err?.message);
    } finally {
      setSubmittingAnswers(false);
    }
  };

  const getStatusIcon = (flag: string) => {
    if (flag === 'VALID') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    }
    if (flag === 'WARNING') {
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
    return <XCircle className="w-4 h-4 text-rose-600" />;
  };

  const getStatusBadge = (gapCategory: string) => {
    switch (gapCategory) {
      case 'NO_GAP':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">NO GAP</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">LOW</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">MEDIUM</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">HIGH</span>;
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">CRITICAL</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">UNKNOWN</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold tracking-wide text-teal-700 uppercase">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Trainee Skill Gap Diagnostic
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Personalized Skill vs Job Requirements Gap
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              Comparison between skills acquired in training, assessed proficiencies, and actual job benchmark expectations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenFollowUp}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition shadow-xs cursor-pointer"
            >
              <FileQuestion className="w-4 h-4" />
              Outcome Follow-Up Survey
            </button>
          </div>
        </div>

        {/* Association disclaimer */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-teal-600" />
            <span>Labels: <strong>ESTIMATION / DETECTED ASSOCIATION</strong>. No guarantee of employment is implied.</span>
          </div>
          <span className="font-mono text-teal-700 font-semibold">PRIVACY: PSEUDONYMOUS ANALYTICS</span>
        </div>
      </div>

      {/* Trainee Switcher (For demo and admin use) */}
      {!isTrainee && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase">
            <UserCheck className="w-4 h-4 text-teal-600" /> Diagnostic Trainee Profile
          </div>
          <form onSubmit={handleSelectTrainee} className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              value={inputTraineeId}
              onChange={(e) => setInputTraineeId(e.target.value)}
              placeholder="e.g. TRN-SCALE-0001"
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 font-mono"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition shadow-xs cursor-pointer"
            >
              Load Trainee
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-slate-500 text-sm">Evaluating assessed proficiencies against job requirement benchmarks...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
          <div className="flex items-center gap-2 font-bold mb-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" /> Trainee Evaluation Error
          </div>
          <p className="text-sm">{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Profile Overview Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-teal-700 font-bold">{data.trainee_id}</span>
                  {data.target_domain && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      {data.target_domain}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">{data.trainee_name}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <p>
                    Enrolled Program: <span className="text-slate-800 font-semibold">{data.course_title || 'Vocational Training'}</span>
                  </p>
                  <p>
                    Active Benchmark: <span className="text-teal-700 font-bold">{data.target_job_title}</span>
                  </p>
                </div>
              </div>

              {/* Target Role Selector & Relevance Score */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {/* Role Switcher Dropdown */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Evaluate Against Target Role:
                  </label>
                  <select
                    value={selectedJobId || (data.target_job_id || '')}
                    onChange={handleRoleChange}
                    className="w-full bg-white border border-slate-200 text-xs font-semibold text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500 shadow-xs"
                  >
                    {data.available_roles && data.available_roles.length > 0 ? (
                      data.available_roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.domain})
                        </option>
                      ))
                    ) : (
                      <option value="">{data.target_job_title || 'Current Role'}</option>
                    )}
                  </select>
                </div>

                {/* Employment Relevance Score */}
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-4">
                  <div className="space-y-0.5">
                    <div className="text-[11px] text-emerald-800 uppercase font-bold tracking-wider">Employment Relevance</div>
                    <div className="text-2xl font-black text-emerald-700">{data.employment_relevance_score}%</div>
                    <div className="text-[10px] text-emerald-600">Relevance to target job benchmark</div>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 flex items-center justify-center font-bold text-xs text-emerald-800 bg-white shadow-xs">
                    {Math.round(data.employment_relevance_score)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Comparison: Current vs Required Skills */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CURRENT SKILLS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-600" /> Current Skills (Assessed & Training)
                  </h3>
                  <p className="text-xs text-slate-500">Proficiency verified through assessments and curriculum</p>
                </div>
                <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-semibold border border-slate-200">
                  {(data.current_skills_summary || []).length} Skills
                </span>
              </div>

              <div className="space-y-3">
                {(data.current_skills_summary || []).map((sk) => (
                  <div key={sk.skill_id} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2 hover:bg-slate-50 transition">
                    <div className="flex justify-between items-center text-xs">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {sk.skill_name}
                        <span className="text-[10px] text-slate-500 font-mono">({sk.category})</span>
                      </div>
                      <span className="font-mono text-teal-700 font-bold">
                        Level {sk.current_level.toFixed(1)} / 5.0
                      </span>
                    </div>

                    {/* Visual Proficiency Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-teal-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (sk.current_level / 5.0) * 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between pt-0.5">
                      <span>Source: {sk.source}</span>
                      <span className="font-medium text-slate-500">Verified Assessed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REQUIRED JOB SKILLS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" /> Required Job Skills Match
                  </h3>
                  <p className="text-xs text-slate-500">Target role benchmarks with detected alignment</p>
                </div>
                <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-semibold border border-slate-200">
                  {(data.required_skills_summary || []).length} Requirements
                </span>
              </div>

              <div className="space-y-3">
                {(data.required_skills_summary || []).map((sk) => (
                  <div
                    key={sk.skill_id}
                    className={`p-3.5 rounded-xl border transition space-y-1.5 ${
                      sk.status_flag === 'VALID'
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : sk.status_flag === 'WARNING'
                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        {getStatusIcon(sk.status_flag)}
                        <span>{sk.skill_name}</span>
                        {getStatusBadge(sk.gap_category)}
                      </div>
                      <div className="font-mono text-xs text-slate-600 font-semibold">
                        Req: {sk.required_level.toFixed(1)} | Curr: {sk.current_level.toFixed(1)}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 leading-snug">
                      {sk.explanation || sk.flag_reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Suggested Learning Areas */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" /> Recommended Learning & Upskilling Focus
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Targeted curriculum recommendations to bridge detected gaps before upcoming interview cycles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {(data.suggested_learning_areas || []).map((area, idx) => {
                const areaText = typeof area === 'string'
                  ? area
                  : area.skill_name
                  ? `${area.skill_name}: ${area.suggested_action || ''} (${area.estimated_effort || ''})`
                  : JSON.stringify(area);

                return (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 hover:border-slate-300 transition">
                    <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" /> Module {idx + 1}
                    </div>
                    <div className="font-bold text-slate-900 text-sm leading-snug">{areaText}</div>
                    <p className="text-[11px] text-slate-500">
                      High demand among regional employers hiring for {data.target_job_title || 'this role'}.
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* DYNAMIC FOLLOW-UP QUESTION ENGINE MODAL */}
      {showFollowUp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase">
                  <FileQuestion className="w-3.5 h-3.5" /> State-Adaptive Follow-Up Engine
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Outcome & Retention Feedback Survey
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Questions automatically adapted for employment status: <strong className="text-indigo-600">{followUpData?.employment_status || 'CURRENT_STATUS'}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowFollowUp(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {submissionSuccess ? (
              <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="font-bold text-sm">Feedback Recorded</div>
                  <div className="text-xs text-emerald-700 mt-1">{submissionSuccess}</div>
                </div>
              </div>
            ) : followUpLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                <span className="text-xs text-slate-500">Generating adaptive questions...</span>
              </div>
            ) : followUpData ? (
              <div className="space-y-5">
                {followUpData.questions.map((q) => (
                  <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <label className="block text-sm font-semibold text-slate-900">
                      {q.question_text}
                    </label>

                    {q.options.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setFollowUpAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                              followUpAnswers[q.id] === opt
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-semibold ring-1 ring-indigo-500'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        rows={2}
                        value={followUpAnswers[q.id] || ''}
                        onChange={(e) => setFollowUpAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Provide details or constraints..."
                        className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    )}

                    <div>
                      <input
                        type="text"
                        placeholder="Optional additional notes or context..."
                        value={followUpNotes[q.id] || ''}
                        onChange={(e) => setFollowUpNotes((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowFollowUp(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitFollowUp}
                    disabled={submittingAnswers}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    {submittingAnswers ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Submit Follow-Up Responses'
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
