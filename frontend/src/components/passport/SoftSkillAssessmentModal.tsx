import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  MessageSquare,
  Users,
  Target,
  Clock,
  Compass,
  ArrowRight,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import {
  SoftSkillScenarioData,
  SoftSkillScenarioCategory,
  TraineeRadarProfile
} from '../../types';

interface SoftSkillAssessmentModalProps {
  traineeId: string;
  traineeName: string;
  isOpen: boolean;
  onClose: () => void;
  onAssessmentComplete?: (updatedProfile: TraineeRadarProfile) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Communication: <MessageSquare className="w-4 h-4 text-brand-600" />,
  Teamwork: <Users className="w-4 h-4 text-emerald-600" />,
  'Problem Solving': <Target className="w-4 h-4 text-indigo-600" />,
  Adaptability: <Compass className="w-4 h-4 text-sky-600" />,
  'Time Management': <Clock className="w-4 h-4 text-amber-600" />
};

export const SoftSkillAssessmentModal: React.FC<SoftSkillAssessmentModalProps> = ({
  traineeId,
  traineeName,
  isOpen,
  onClose,
  onAssessmentComplete
}) => {
  const [data, setData] = useState<SoftSkillScenarioData | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<string>('Communication');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<TraineeRadarProfile | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);
    setSuccessResult(null);

    api.getSoftSkillScenarios()
      .then((res) => {
        if (res) {
          setData(res);
          if (res.categories && res.categories.length > 0) {
            setActiveCategory(res.categories[0]);
          }
        }
      })
      .catch((err) => {
        setError('Failed to load soft skill scenarios.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const allQuestions = data
    ? Object.values(data.scenarios).flatMap(s => s.questions)
    : [];

  const answeredCount = allQuestions.filter(q => !!selectedAnswers[q.id]).length;
  const isComplete = allQuestions.length > 0 && answeredCount === allQuestions.length;

  const handleSubmit = async () => {
    if (!data) return;
    setIsSubmitting(true);
    setError(null);

    const answersList = Object.entries(selectedAnswers).map(([qid, oid]) => ({
      question_id: qid,
      selected_option_id: oid
    }));

    try {
      const updated = await api.evaluateSoftSkills({
        trainee_id: traineeId,
        answers: answersList,
        reviewer_name: 'Workforce Behavioral Situational Judgement Engine'
      });

      setSuccessResult(updated);
      if (onAssessmentComplete) {
        onAssessmentComplete(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategoryData = data?.scenarios[activeCategory];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-teal-100 font-bold uppercase tracking-wider">
                  Behavioral Situational Judgement Assessment
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  Structured Rubrics
                </span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight">
                Soft-Skill Scoring Engine: {traineeName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Behavioral Objective Rubric Notice */}
        <div className="px-6 py-3 bg-emerald-50/80 border-b border-emerald-100 flex items-center gap-2.5 text-xs text-emerald-900">
          <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Workforce Psychometric Standard:</strong> Evaluates concrete observable workplace actions against standardized behavioral rubrics (Levels 1–5), avoiding subjective or ungrounded personality claims.
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              <p className="text-xs font-semibold">Loading standardized situational scenarios & rubrics...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          ) : successResult ? (
            <div className="p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">
                  Behavioral Assessment Successfully Scored!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Trainee skills have been updated using the Multi-Source Bayesian Corroboration formula. Evidence records and radar visualizations are refreshed.
                </p>
              </div>

              {/* Score snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto pt-2">
                {successResult.skills_matrix
                  .filter(s => s.category === 'soft')
                  .map((s, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                        {s.name}
                      </span>
                      <span className="text-lg font-black text-brand-600 mt-1 block">
                        {s.current_level.toFixed(1)} / 5
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700">
                        {Math.round(s.confidence * 100)}% Conf
                      </span>
                    </div>
                  ))}
              </div>

              <div className="pt-4">
                <Button variant="primary" onClick={onClose}>
                  Return to Trainee Profile
                </Button>
              </div>
            </div>
          ) : data ? (
            <div className="space-y-6">

              {/* Progress and Category Navigation Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  {data.categories.map((cat) => {
                    const catQuestions = data.scenarios[cat]?.questions || [];
                    const answeredInCat = catQuestions.filter(q => !!selectedAnswers[q.id]).length;
                    const catDone = catQuestions.length > 0 && answeredInCat === catQuestions.length;

                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
                          activeCategory === cat
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {CATEGORY_ICONS[cat]}
                        <span>{cat}</span>
                        {catDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs font-semibold text-slate-500 shrink-0">
                  Progress: <strong className="text-slate-900">{answeredCount}</strong> of <strong>{allQuestions.length}</strong> answered
                </div>
              </div>

              {/* Active Category Header */}
              {currentCategoryData && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Assessing Competency
                    </span>
                    <Badge variant="brand" size="sm">{currentCategoryData.canonical_name}</Badge>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {activeCategory} Situational Challenges
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentCategoryData.description}
                  </p>
                </div>
              )}

              {/* Questions for active category */}
              {currentCategoryData?.questions.map((q, qIndex) => (
                <div
                  key={q.id}
                  className="p-5 rounded-3xl bg-slate-50/80 border border-slate-200/80 space-y-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider block">
                      Scenario #{qIndex + 1}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 leading-relaxed">
                      {q.scenario}
                    </h4>
                  </div>

                  {/* Options */}
                  <div className="space-y-2.5">
                    {q.options.map((opt) => {
                      const isSelected = selectedAnswers[q.id] === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(q.id, opt.id)}
                          className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all duration-150 flex items-start gap-3 ${
                            isSelected
                              ? 'bg-brand-50/90 border-brand-500 shadow-sm ring-2 ring-brand-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => handleSelectOption(q.id, opt.id)}
                            className="mt-0.5 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800 leading-relaxed">
                                {opt.text}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 ${
                                opt.level >= 4 ? 'bg-emerald-100 text-emerald-800' : opt.level === 3 ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                Level {opt.level} Rubric
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 italic">
                              <strong>Observable Benchmark:</strong> {opt.rubric_rationale}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  {isComplete ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      All scenarios answered. Ready to run multi-source scoring!
                    </span>
                  ) : (
                    <span>Answer all scenarios across all 5 soft skills to compute final scores.</span>
                  )}
                </div>

                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!isComplete || isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Computing Behavioral Scores...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Submit & Score Profile
                    </>
                  )}
                </Button>
              </div>

            </div>
          ) : null}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

      </div>
    </div>
  );
};
