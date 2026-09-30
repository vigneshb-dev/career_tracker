import React from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  BookOpen,
  Building2,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Calculator,
  UserCheck
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SkillGapBreakdownItem } from '../../types';

interface SkillGapExplanationModalProps {
  gap: SkillGapBreakdownItem | null;
  traineeName: string;
  targetRole: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SkillGapExplanationModal: React.FC<SkillGapExplanationModalProps> = ({
  gap,
  traineeName,
  targetRole,
  isOpen,
  onClose
}) => {
  if (!isOpen || !gap) return null;

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-navy-900 to-brand-900 text-white flex items-start justify-between">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-500/20 text-brand-200 border border-brand-400/30">
                AI Gap Diagnostic Protocol
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {targetRole}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {gap.skill_name}
            </h2>
            <p className="text-xs text-slate-300">
              Diagnostic audit explaining why this deficiency was detected for <strong className="text-white">{traineeName}</strong>.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(92vh-140px)] text-slate-800">
          
          {/* Top Status & Tier Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Classification:</span>
              <Badge variant={getGapTypeBadgeVariant(gap.gap_type)} size="md">
                {gap.gap_type_label}
              </Badge>
              <Badge variant={gap.category === 'hard' ? 'brand' : 'neutral'} size="sm">
                {gap.category.toUpperCase()} SKILL
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Priority Tier:</span>
              <Badge variant={getPriorityBadgeVariant(gap.priority_tier)} size="md">
                {gap.priority_label} (Score: {gap.priority_score}/100)
              </Badge>
            </div>
          </div>

          {/* 1. Skill Deficit Comparison (Required vs Current) */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calculator className="w-4 h-4 text-brand-600" />
              1. Proficiency Deficit Calculation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Required Benchmark</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-slate-900">{gap.required_proficiency.toFixed(1)}</span>
                  <span className="text-xs font-semibold text-slate-400">/ 5.0</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium block mt-1">
                  {gap.importance_label}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Demonstrated</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-2xl font-black ${gap.current_proficiency > 0 ? 'text-brand-600' : 'text-slate-400'}`}>
                    {gap.current_proficiency.toFixed(1)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">/ 5.0</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium block mt-1">
                  {gap.current_proficiency > 0 ? `${Math.round(gap.confidence * 100)}% verified certainty` : 'No evidence on file'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100">
                <span className="text-[10px] font-bold text-rose-600 uppercase block">Identified Gap</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-rose-700">-{gap.skill_gap.toFixed(1)}</span>
                  <span className="text-xs font-semibold text-rose-400">deficit</span>
                </div>
                <span className="text-[11px] text-rose-600 font-medium block mt-1">
                  Gap = Required - Current
                </span>
              </div>
            </div>

            {/* Visual Progress Gap Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Demonstrated: {gap.current_proficiency.toFixed(1)} / 5.0</span>
                <span>Required Target: {gap.required_proficiency.toFixed(1)} / 5.0</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden relative">
                {/* Current Demonstrated Bar */}
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-300"
                  style={{ width: `${(gap.current_proficiency / 5.0) * 100}%` }}
                />
                {/* Target Marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-slate-900 z-10"
                  style={{ left: `${(gap.required_proficiency / 5.0) * 100}%` }}
                  title="Target Requirement"
                />
              </div>
            </div>
          </div>

          {/* 2. Priority Formula Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              2. Deterministic Priority Formula Breakdown
            </h3>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-navy-900 text-white space-y-3 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                <span className="font-mono text-brand-300 font-bold">
                  Priority = Gap Severity × Skill Importance × Market Demand × Confidence
                </span>
                <span className="text-base font-black text-emerald-400">
                  {gap.priority_score} / 100
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Gap Severity</span>
                  <span className="font-extrabold text-white">{gap.gap_severity.toFixed(3)}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{gap.skill_gap} / 5.0</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Importance</span>
                  <span className="font-extrabold text-white">{gap.skill_importance.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{gap.importance_label}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Market Demand</span>
                  <span className="font-extrabold text-white">{(gap.market_demand * 100).toFixed(0)}%</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{gap.market_demand_score}% demand</span>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Confidence</span>
                  <span className="font-extrabold text-white">{(gap.confidence * 100).toFixed(0)}%</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Evaluation accuracy</span>
                </div>
              </div>

              {gap.formula_breakdown && (
                <p className="text-[11px] font-mono text-slate-300 pt-1">
                  Calculation: {gap.formula_breakdown.raw_product} → Normalized Score {gap.formula_breakdown.normalized_priority_score}/100
                </p>
              )}
            </div>
          </div>

          {/* 3. Narrative Explanation & Detection Reason */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-600" />
              3. Detection Reason & Institutional Classification
            </h3>

            <div className={`p-4 rounded-2xl border ${
              gap.gap_type === 'workplace_gap'
                ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                : gap.gap_type === 'curriculum_gap'
                ? 'bg-purple-50/60 border-purple-200 text-purple-950'
                : 'bg-brand-50/60 border-brand-200 text-brand-950'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {gap.gap_type === 'workplace_gap' && <Briefcase className="w-4 h-4 text-rose-600" />}
                {gap.gap_type === 'curriculum_gap' && <BookOpen className="w-4 h-4 text-purple-600" />}
                {gap.gap_type === 'learner_gap' && <Layers className="w-4 h-4 text-brand-600" />}
                <span className="text-xs font-black uppercase tracking-wider">
                  Why this is classified as a {gap.gap_type_label}:
                </span>
              </div>
              <p className="text-xs leading-relaxed font-medium">
                {gap.detected_reason}
              </p>

              {gap.employer_notes && (
                <div className="mt-3 p-3 rounded-xl bg-white/80 border border-rose-200 text-xs text-rose-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                    Recorded Employer / Supervisor Feedback:
                  </span>
                  <p className="italic">"{gap.employer_notes}"</p>
                </div>
              )}
            </div>
          </div>

          {/* 4. Actionable Remediation Pathway */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              4. Targeted Remediation Pathway
            </h3>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-950 block">
                  Prescribed Workforce Action
                </span>
                <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                  {gap.remediation_action}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Course Syllabus: <strong>{gap.course_title || 'Enrolled Curriculum'}</strong>
          </span>
          <Button onClick={onClose} variant="primary" size="sm">
            Close Explanation
          </Button>
        </div>

      </div>
    </div>
  );
};
