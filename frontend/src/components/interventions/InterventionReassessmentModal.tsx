import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Award,
  BookOpen,
  Code2,
  Users,
  Briefcase,
  HelpCircle,
  Calendar,
  Layers,
  TrendingUp,
  ShieldCheck,
  Target,
  ExternalLink,
  ChevronRight,
  Clock,
  Building2,
  Sliders,
  Check
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import {
  SkillGapBreakdownItem,
  InterventionRecommendation,
  TraineeInterventionItem,
  ReassessmentResult,
  InterventionType
} from '../../types';

interface InterventionReassessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  gap: SkillGapBreakdownItem | null;
  traineeId: string;
  traineeName: string;
  targetRoleId?: string;
  targetRoleTitle?: string;
  onReassessmentComplete?: (result: ReassessmentResult) => void;
}

type StepType = 'gap' | 'why' | 'action' | 'expected' | 'reassessment';

export const InterventionReassessmentModal: React.FC<InterventionReassessmentModalProps> = ({
  isOpen,
  onClose,
  gap,
  traineeId,
  traineeName,
  targetRoleId,
  targetRoleTitle,
  onReassessmentComplete,
}) => {
  // Stepper state
  const [activeStep, setActiveStep] = useState<StepType>('gap');

  // Recommendations state
  const [recommendations, setRecommendations] = useState<InterventionRecommendation[]>([]);
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionRecommendation | null>(null);
  const [activeTracking, setActiveTracking] = useState<TraineeInterventionItem | null>(null);
  const [isLoadingRecs, setIsLoadingRecs] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');

  // Tracking & Progress state
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState<boolean>(false);
  const [progressNotes, setProgressNotes] = useState<string>('');

  // Reassessment form state
  const [reassessedScore, setReassessedScore] = useState<number>(4.2);
  const [reviewerName, setReviewerName] = useState<string>('Workforce Evaluator / Senior Practitioner');
  const [evaluatorNotes, setEvaluatorNotes] = useState<string>('');
  const [artifactUrl, setArtifactUrl] = useState<string>('');
  const [isSubmittingReassessment, setIsSubmittingReassessment] = useState<boolean>(false);
  const [reassessmentResult, setReassessmentResult] = useState<ReassessmentResult | null>(null);

  // Load recommendations whenever modal opens or gap changes
  useEffect(() => {
    if (!isOpen || !gap || !traineeId) return;

    // Reset local states
    setActiveStep('gap');
    setReassessmentResult(null);
    setSelectedIntervention(null);
    setActiveTracking(null);
    setProgressPercent(0);

    const targetGapSkillName = gap.skill_name;
    const targetGapSkillId = gap.skill_id;

    async function fetchRecommendationsAndTracking() {
      setIsLoadingRecs(true);
      try {
        const [recs, existingTracks] = await Promise.all([
          api.getInterventionRecommendations(traineeId, targetGapSkillName, targetRoleId, 8),
          api.getTraineeInterventions(traineeId)
        ]);

        setRecommendations(recs);

        // Check if there is an active or completed intervention for this gap
        const currentTrack = existingTracks.find(
          t => t.gap_skill_id === targetGapSkillId || t.gap_skill_name.toLowerCase() === targetGapSkillName.toLowerCase()
        );

        if (currentTrack) {
          setActiveTracking(currentTrack);
          setProgressPercent(currentTrack.progress_percent || 0);

          // Find the corresponding recommendation object
          const matchingRec = recs.find(r => r.intervention_id === currentTrack.intervention_id);
          if (matchingRec) {
            setSelectedIntervention(matchingRec);
          }
        } else if (recs.length > 0) {
          setSelectedIntervention(recs[0]);
          setProgressPercent(0);
        }
      } catch (err) {
        console.error('Failed to load intervention recommendations', err);
      } finally {
        setIsLoadingRecs(false);
      }
    }

    fetchRecommendationsAndTracking();
  }, [isOpen, gap, traineeId, targetRoleId]);

  if (!isOpen || !gap) return null;

  // Type styling helper
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'apprenticeship':
        return 'brand';
      case 'mentorship':
        return 'purple';
      case 'practice_task':
        return 'brand';
      case 'project':
        return 'warning';

      case 'certification':
        return 'success';
      case 'course_module':
        return 'neutral';
      case 'interview_prep':
        return 'danger';
      case 'soft_skill_practice':
        return 'purple';
      default:
        return 'neutral';
    }
  };

  const getInterventionIcon = (type: string) => {
    switch (type) {
      case 'apprenticeship':
        return <Briefcase className="w-4 h-4 text-brand-600" />;
      case 'mentorship':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'practice_task':
        return <Code2 className="w-4 h-4 text-teal-600" />;
      case 'project':
        return <Layers className="w-4 h-4 text-amber-600" />;
      case 'certification':
        return <Award className="w-4 h-4 text-emerald-600" />;
      case 'course_module':
        return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'interview_prep':
        return <ShieldCheck className="w-4 h-4 text-rose-600" />;
      case 'soft_skill_practice':
        return <Sparkles className="w-4 h-4 text-violet-600" />;
      default:
        return <Target className="w-4 h-4 text-slate-600" />;
    }
  };

  // Step 3 Handler: Start Intervention
  const handleStartIntervention = async (rec: InterventionRecommendation) => {
    try {
      const tint = await api.startIntervention({
        trainee_id: traineeId,
        gap_skill_id: gap.skill_id,
        gap_skill_name: gap.skill_name,
        intervention_id: rec.intervention_id
      });
      setActiveTracking(tint);
      setSelectedIntervention(rec);
      setProgressPercent(tint.progress_percent || 15);
      setActiveStep('expected');
    } catch (err: any) {
      alert(err.message || 'Failed to start intervention');
    }
  };

  // Step 4 Handler: Update progress
  const handleUpdateProgress = async (newPct: number) => {
    if (!activeTracking) return;
    setIsUpdatingProgress(true);
    try {
      const updated = await api.updateInterventionProgress(activeTracking.id, {
        progress_percent: newPct,
        notes: progressNotes || undefined
      });
      setActiveTracking(updated);
      setProgressPercent(updated.progress_percent);
      if (updated.progress_percent >= 100) {
        // Automatically suggest moving to reassessment step
        setActiveStep('reassessment');
      }
    } catch (err: any) {
      console.error('Failed to update progress', err);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  // Step 5 Handler: Submit Reassessment
  const handleSubmitReassessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTracking) return;
    setIsSubmittingReassessment(true);
    try {
      const res = await api.submitInterventionReassessment(activeTracking.id, {
        reassessed_score: reassessedScore,
        reviewer_name: reviewerName,
        evaluator_notes: evaluatorNotes || 'Reassessment completed and verified against competency benchmark.',
        artifact_url: artifactUrl || undefined
      });
      setReassessmentResult(res);
      if (onReassessmentComplete) {
        onReassessmentComplete(res);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit reassessment');
    } finally {
      setIsSubmittingReassessment(false);
    }
  };

  const stepsList: { key: StepType; label: string; sub: string }[] = [
    { key: 'gap', label: '1. Skill Gap', sub: 'Deficit Diagnosis' },
    { key: 'why', label: '2. Why It Matters', sub: 'Workforce Impact' },
    { key: 'action', label: '3. Recommended Action', sub: 'Catalogue Match' },
    { key: 'expected', label: '4. Expected Skill Level', sub: 'Track Progress' },
    { key: 'reassessment', label: '5. Reassessment', sub: 'Score Verification' },
  ];

  // Filter recommendations
  const filteredRecs = recommendations.filter(r => {
    if (filterType === 'all') return true;
    return r.type === filterType;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-navy-900 to-brand-900 text-white flex items-start justify-between">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-500/20 text-brand-200 border border-brand-400/30">
                Personalized Gap-to-Intervention Engine
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Candidate: <strong className="text-white">{traineeName}</strong>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {gap.skill_name}
            </h2>
            <p className="text-xs text-slate-300">
              Closed-Loop Remediation Workflow • Semantic matching via Sentence Transformers
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Navigation */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between overflow-x-auto gap-2">
          {stepsList.map((step, idx) => {
            const isActive = activeStep === step.key;
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(step.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isActive ? 'bg-white text-brand-700' : 'bg-slate-200 text-slate-700'
                }`}>
                  {idx + 1}
                </span>
                <div className="text-left">
                  <span className="block leading-tight">{step.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ========================================================
              STEP 1: SKILL GAP
             ======================================================== */}
          {activeStep === 'gap' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{gap.skill_name}</span>
                    <Badge variant={gap.category === 'hard' ? 'brand' : 'neutral'} size="sm">
                      {gap.category.toUpperCase()} SKILL
                    </Badge>
                    <Badge variant={gap.gap_type === 'workplace_gap' ? 'danger' : gap.gap_type === 'curriculum_gap' ? 'purple' : 'brand'} size="sm">
                      {gap.gap_type_label}
                    </Badge>
                  </div>

                  <Badge variant={gap.priority_tier === 'critical' ? 'danger' : gap.priority_tier === 'moderate' ? 'warning' : 'success'} size="sm">
                    {gap.priority_label}
                  </Badge>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {gap.detected_reason}
                </p>
              </div>

              {/* Metric Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Required Target</span>
                  <span className="text-xl font-black text-slate-900">{gap.required_proficiency.toFixed(1)} / 5.0</span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Target Benchmark</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Demonstrated</span>
                  <span className="text-xl font-black text-brand-600">{gap.current_proficiency.toFixed(1)} / 5.0</span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Current Candidate Level</span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Deficit</span>
                  <span className="text-xl font-black text-rose-700">-{gap.skill_gap.toFixed(1)}</span>
                  <span className="text-[10px] text-rose-600 font-medium block mt-0.5">Remediation Distance</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Priority Score</span>
                  <span className="text-xl font-black text-amber-800">{gap.priority_score}/100</span>
                  <span className="text-[10px] text-amber-700 font-medium block mt-0.5">Weighted Urgency</span>
                </div>
              </div>

              {/* Diagnosis Context */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-brand-600" />
                  Target Role Context
                </h4>
                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    Target Occupation: <strong className="text-slate-900">{targetRoleTitle || 'Full-Stack Software Engineer'}</strong>
                  </p>
                  <p>
                    Classification Rationale:{' '}
                    {gap.gap_type === 'workplace_gap' && (
                      <span className="text-rose-700 font-semibold">
                        Employer evaluations reported production staging and practical troubleshooting friction despite passing initial tests.
                      </span>
                    )}
                    {gap.gap_type === 'curriculum_gap' && (
                      <span className="text-purple-700 font-semibold">
                        This skill is absent from the trainee's enrolled curriculum and must be supplemented externally.
                      </span>
                    )}
                    {gap.gap_type === 'learner_gap' && (
                      <span className="text-blue-700 font-semibold">
                        Taught in the syllabus but requires additional deliberate practice to achieve autonomous competency.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Next step button */}
              <div className="flex justify-end pt-2">
                <Button onClick={() => setActiveStep('why')} variant="primary" size="md">
                  Why It Matters
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 2: WHY IT MATTERS
             ======================================================== */}
          {activeStep === 'why' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-brand-700 font-bold text-xs uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4" />
                  Labor Market & Occupational Relevancy
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Why remediating "{gap.skill_name}" is essential for placement
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {selectedIntervention?.why_it_matters ||
                    `In modern high-velocity engineering environments, ${gap.skill_name} is considered a non-negotiable gateway competency. Closing this gap protects candidate placement rates and long-term wage trajectory.`}
                </p>
              </div>

              {/* Market Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm">
                    {selectedIntervention?.market_demand_alignment || 94}%
                  </div>
                  <h4 className="text-xs font-black text-slate-900">Market Demand Index</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Consistently appears in over 85% of verified live job requisitions across regional tech employers.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-sm">
                    L{gap.required_proficiency.toFixed(0)}
                  </div>
                  <h4 className="text-xs font-black text-slate-900">Production Autonomy</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Employers require junior talent to troubleshoot staging errors without blocking senior staff members.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-sm">
                    +22%
                  </div>
                  <h4 className="text-xs font-black text-slate-900">Wage & Placement Premium</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Candidates with verified competency evidence convert to full-time roles 3.2x faster upon completion.
                  </p>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button onClick={() => setActiveStep('gap')} variant="outline" size="md">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Skill Gap
                </Button>
                <Button onClick={() => setActiveStep('action')} variant="primary" size="md">
                  Explore Recommended Actions
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: RECOMMENDED ACTION
             ======================================================== */}
          {activeStep === 'action' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Type Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'All Interventions' },
                  { id: 'course_module', label: 'Course/Module' },
                  { id: 'practice_task', label: 'Practice Task' },
                  { id: 'project', label: 'Project' },
                  { id: 'certification', label: 'Certification' },
                  { id: 'mentorship', label: 'Mentorship' },
                  { id: 'apprenticeship', label: 'Apprenticeship' },
                  { id: 'interview_prep', label: 'Interview Prep' },
                  { id: 'soft_skill_practice', label: 'Soft Skill' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                      filterType === tab.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Active Loading */}
              {isLoadingRecs ? (
                <div className="py-12 text-center space-y-2">
                  <Sparkles className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-600">
                    Running Sentence Transformers semantic matching across Intervention Catalogue...
                  </p>
                </div>
              ) : filteredRecs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">No interventions found for this filter</h4>
                  <p className="text-xs text-slate-500">Try selecting "All Interventions" to view all available resources.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRecs.map((rec) => {
                    const isSelected = selectedIntervention?.intervention_id === rec.intervention_id;
                    const isAlreadyStarted = activeTracking?.intervention_id === rec.intervention_id;

                    return (
                      <div
                        key={rec.intervention_id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-brand-50/20 border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                                {getInterventionIcon(rec.type)}
                                {rec.title}
                              </span>
                              <Badge variant={getTypeBadgeVariant(rec.type)} size="sm">
                                {rec.type_label}
                              </Badge>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {rec.recommendation_score}% AI Match
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                              {rec.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-semibold pt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                Effort: <strong>{rec.estimated_effort}</strong>
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                Platform: <strong>{rec.provider_or_platform}</strong>
                              </span>
                              <span className="flex items-center gap-1 text-brand-700">
                                <Target className="w-3.5 h-3.5 text-brand-600" />
                                Target Outcome: <strong>Level {rec.expected_skill_level} / 5.0</strong>
                              </span>
                            </div>

                            {/* Learning outcomes preview */}
                            {rec.learning_outcomes && rec.learning_outcomes.length > 0 && (
                              <div className="pt-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Target Learning Outcomes:
                                </span>
                                <ul className="space-y-1">
                                  {rec.learning_outcomes.slice(0, 2).map((lo, lIdx) => (
                                    <li key={lIdx} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                                      <span>{lo}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0">
                            {isAlreadyStarted ? (
                              <Button
                                onClick={() => {
                                  setSelectedIntervention(rec);
                                  setActiveStep('expected');
                                }}
                                variant="primary"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <Play className="w-3.5 h-3.5 mr-1 fill-white" />
                                In Progress ({activeTracking?.progress_percent}%)
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleStartIntervention(rec)}
                                variant="primary"
                                size="sm"
                                className="bg-brand-600 hover:bg-brand-700 text-white"
                              >
                                <Play className="w-3.5 h-3.5 mr-1" />
                                Start Intervention
                              </Button>
                            )}

                            <span className="text-[10px] text-slate-400 font-medium">
                              Semantic Sim: {rec.semantic_similarity}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button onClick={() => setActiveStep('why')} variant="outline" size="md">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Why It Matters
                </Button>
                {activeTracking && (
                  <Button onClick={() => setActiveStep('expected')} variant="primary" size="md">
                    Track Active Progress
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 4: EXPECTED SKILL LEVEL & TRACK PROGRESS
             ======================================================== */}
          {activeStep === 'expected' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Level Progression Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-700 block">
                    Target Competency Benchmark
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    Progressing from Level {gap.current_proficiency.toFixed(1)} to Level {gap.required_proficiency.toFixed(1)}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Enrolled Resource:{' '}
                    <strong>{selectedIntervention?.title || activeTracking?.intervention_title || 'Workforce Action Track'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Baseline</span>
                    <span className="text-sm font-black text-slate-700">{gap.current_proficiency.toFixed(1)} / 5.0</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-brand-600" />
                  <div className="text-center px-3 py-1.5 rounded-xl bg-brand-600 text-white shadow-xs">
                    <span className="text-[10px] font-bold text-brand-200 uppercase block">Expected</span>
                    <span className="text-sm font-black text-white">{gap.required_proficiency.toFixed(1)} / 5.0</span>
                  </div>
                </div>
              </div>

              {/* Real-time Progress Tracking Card */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-card space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-brand-600" />
                      Live Intervention Progress Tracker
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      Status:{' '}
                      <strong className={progressPercent >= 100 ? 'text-emerald-600' : 'text-brand-600'}>
                        {progressPercent >= 100 ? 'Completed • Ready for Reassessment' : 'In Progress'}
                      </strong>
                    </span>
                  </div>

                  <span className="text-2xl font-black text-brand-700">{progressPercent}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      progressPercent >= 100
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-brand-600 to-indigo-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Milestone quick-select buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      onClick={() => handleUpdateProgress(pct)}
                      disabled={isUpdatingProgress}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        progressPercent === pct
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Set {pct}% {pct === 100 && '• Complete'}
                    </button>
                  ))}
                </div>

                {/* Learning Outcomes Checklist */}
                {selectedIntervention?.learning_outcomes && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                      Target Learning Checkpoints:
                    </span>
                    <div className="space-y-2">
                      {selectedIntervention.learning_outcomes.map((lo, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-medium">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 ${progressPercent >= ((idx + 1) * 33) ? 'text-emerald-500' : 'text-slate-300'}`} />
                          <span>{lo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button onClick={() => setActiveStep('action')} variant="outline" size="md">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Recommended Action
                </Button>
                <Button
                  onClick={() => setActiveStep('reassessment')}
                  variant="primary"
                  size="md"
                  className={progressPercent >= 100 ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  Proceed to Reassessment
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 5: REASSESSMENT & UPDATE COMPETENCY SCORE
             ======================================================== */}
          {activeStep === 'reassessment' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Success Result View if already reassessed */}
              {reassessmentResult ? (
                <div className="p-6 rounded-3xl bg-emerald-50/70 border border-emerald-200 space-y-5 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-emerald-900">
                      Competency Reassessment Confirmed!
                    </h3>
                    <p className="text-xs text-emerald-800 max-w-md mx-auto font-medium">
                      {reassessmentResult.message}
                    </p>
                  </div>

                  {/* Before vs After Score Comparison */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto pt-2">
                    <div className="p-3 rounded-2xl bg-white border border-emerald-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Baseline Level</span>
                      <span className="text-base font-black text-slate-700">{reassessmentResult.baseline_proficiency.toFixed(1)} / 5.0</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase block">Reassessed</span>
                      <span className="text-base font-black text-emerald-700">{reassessmentResult.reassessed_score.toFixed(1)} / 5.0</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-emerald-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Gap Closure</span>
                      <span className="text-base font-black text-emerald-700">
                        {reassessmentResult.gap_closed ? 'Deficit Resolved' : 'Reduced'}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-emerald-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Match Score</span>
                      <span className="text-base font-black text-brand-700">
                        {reassessmentResult.updated_match_score || 88}%
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center gap-3">
                    <Button onClick={onClose} variant="primary" size="md" className="bg-emerald-700 hover:bg-emerald-800">
                      Done & Return to Dashboard
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitReassessment} className="space-y-6">
                  {/* Rubric Criteria Box */}
                  <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
                      <Award className="w-4 h-4" />
                      Standardized Reassessment Rubric
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                      {selectedIntervention?.reassessment_rubric?.criteria ||
                        'Verified practical demonstration, passing score >= 4.0/5.0, and supervisor/evaluator endorsement.'}
                    </p>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-4">
                    {/* Score Slider */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Reassessed Competency Score (0.0 to 5.0)
                        </label>
                        <span className="text-lg font-black text-brand-700">{reassessedScore.toFixed(1)} / 5.0</span>
                      </div>

                      <input
                        type="range"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={reassessedScore}
                        onChange={(e) => setReassessedScore(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                      />

                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>1.0 Novice</span>
                        <span>2.0 Basic</span>
                        <span>3.0 Competent</span>
                        <span>4.0 Proficient</span>
                        <span>5.0 Expert</span>
                      </div>
                    </div>

                    {/* Reviewer / Evaluator Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Assessing Evaluator / Senior Practitioner
                      </label>
                      <input
                        type="text"
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        placeholder="e.g. Lead SRE / Workforce Evaluator"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-brand-500"
                        required
                      />
                    </div>

                    {/* Evaluator Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Evaluator Observation Notes & Evidence Rationale
                      </label>
                      <textarea
                        value={evaluatorNotes}
                        onChange={(e) => setEvaluatorNotes(e.target.value)}
                        placeholder="Candidate successfully configured container volume permissions, passed multi-service healthcheck verification without senior intervention."
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-brand-500"
                        required
                      />
                    </div>

                    {/* Artifact URL (Optional) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Verification Artifact URL (GitHub PR / Certificate / Portfolio Link)
                      </label>
                      <input
                        type="url"
                        value={artifactUrl}
                        onChange={(e) => setArtifactUrl(e.target.value)}
                        placeholder="https://github.com/organization/repo/pull/42"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  {/* Submission CTA */}
                  <div className="flex items-center justify-between pt-2">
                    <Button onClick={() => setActiveStep('expected')} variant="outline" size="md">
                      <ArrowLeft className="w-4 h-4 mr-1.5" />
                      Back to Progress
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      disabled={isSubmittingReassessment || !activeTracking}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isSubmittingReassessment ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-1.5 animate-spin" />
                          Recalculating Trainee Score...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Submit Reassessment & Update Score
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
