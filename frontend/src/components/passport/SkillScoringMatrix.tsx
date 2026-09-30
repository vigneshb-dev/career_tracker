import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Calendar,
  UserCheck,
  FileCode,
  Award,
  Briefcase,
  GraduationCap,
  ClipboardCheck,
  ExternalLink,
  HelpCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  X
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SkillMatrixItem, TraineeSkillEvidenceItem, EvidenceSourceType } from '../../types';

interface SkillScoringMatrixProps {
  skills: SkillMatrixItem[];
  traineeName: string;
}

const SOURCE_ICONS: Record<EvidenceSourceType, React.ReactNode> = {
  practical_project: <FileCode className="w-3.5 h-3.5 text-brand-600" />,
  assessment: <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600" />,
  trainer_evaluation: <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />,
  certification: <Award className="w-3.5 h-3.5 text-amber-600" />,
  employer_feedback: <Briefcase className="w-3.5 h-3.5 text-sky-600" />
};

export const SkillScoringMatrix: React.FC<SkillScoringMatrixProps> = ({ skills, traineeName }) => {
  const [selectedSkillForAudit, setSelectedSkillForAudit] = useState<SkillMatrixItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'hard' | 'soft'>('all');
  const [search, setSearch] = useState('');

  const filteredSkills = skills.filter((item) => {
    const matchesCat = categoryFilter === 'all' || item.category.toLowerCase() === categoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getLevelLabel = (score: number) => {
    if (score >= 4.5) return 'Expert / Role Model';
    if (score >= 3.5) return 'Advanced / Autonomous';
    if (score >= 2.5) return 'Competent / Standard';
    if (score >= 1.5) return 'Developing';
    if (score > 0.0) return 'Novice';
    return 'Unobserved';
  };

  const getLevelColor = (score: number) => {
    if (score >= 4.0) return 'bg-emerald-500';
    if (score >= 3.0) return 'bg-brand-500';
    if (score >= 2.0) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  return (
    <div className="space-y-4">
      
      {/* Controls Bar */}
      <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 w-48 sm:w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category:</span>
          {(['all', 'hard', 'soft'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                categoryFilter === cat
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat === 'all' ? 'All' : cat === 'hard' ? 'Hard Skills' : 'Soft Skills'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table: Current Level | Target Level | Confidence | Evidence */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-4 px-6">Skill Competency</th>
                <th className="py-4 px-4 text-center">Current Level (0–5)</th>
                <th className="py-4 px-4 text-center">Target Level (0–5)</th>
                <th className="py-4 px-4 text-center">Confidence</th>
                <th className="py-4 px-4">Evidence Sources</th>
                <th className="py-4 px-6 text-right">Calculation Audit</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredSkills.map((item) => {
                const delta = (item.current_level - item.target_level).toFixed(1);
                const isAhead = Number(delta) >= 0;

                return (
                  <tr key={item.skill_id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Skill Info */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-slate-900 line-clamp-1">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            item.category === 'soft' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-brand-50 text-brand-700 border border-brand-200/60'
                          }`}>
                            {item.category}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {item.skill_id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Current Level (0-5) */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-black text-slate-900">
                            {item.current_level.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">/ 5.0</span>
                        </div>
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden mt-1 shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getLevelColor(item.current_level)}`}
                            style={{ width: `${(item.current_level / 5.0) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                          {getLevelLabel(item.current_level)}
                        </span>
                      </div>
                    </td>

                    {/* Target Level (0-5) */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-extrabold text-amber-600">
                            {item.target_level.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">/ 5.0</span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                          isAhead ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
                        }`}>
                          {isAhead ? `+${delta} Ahead` : `${delta} Gap`}
                        </span>
                      </div>
                    </td>

                    {/* Confidence */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <Badge variant="success" size="sm">
                          {Math.round(item.confidence * 100)}% Conf
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {item.evidence_count} stream{item.evidence_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>

                    {/* Evidence Sources */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.evidence.length > 0 ? (
                          item.evidence.map((ev, idx) => (
                            <span
                              key={idx}
                              title={`${ev.source_label || ev.evidence_source}: Score ${ev.score}/5.0 by ${ev.reviewer_source}`}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 flex items-center gap-1 text-[11px] font-semibold cursor-help transition-all"
                            >
                              {SOURCE_ICONS[ev.evidence_source as EvidenceSourceType] || <CheckCircle2 className="w-3 h-3 text-slate-500" />}
                              <span>{ev.score.toFixed(1)}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Pending evidence</span>
                        )}
                      </div>
                    </td>

                    {/* Calculation Audit Action */}
                    <td className="py-4 px-6 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSkillForAudit(item)}
                        className="font-bold border-brand-200 text-brand-700 hover:bg-brand-50"
                      >
                        <Info className="w-3.5 h-3.5 mr-1 text-brand-600" />
                        Explanation
                      </Button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auditable Calculation Breakdown Modal */}
      {selectedSkillForAudit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center shadow-inner">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-brand-400 font-bold uppercase tracking-wider">
                    Scoring Calculation Audit Trail
                  </span>
                  <h2 className="text-xl font-extrabold tracking-tight text-white">
                    {selectedSkillForAudit.name}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedSkillForAudit(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* High-level Scoring Banner */}
              <div className="p-5 rounded-2xl bg-brand-50/70 border border-brand-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-brand-700 uppercase tracking-wider block">
                    Fused Multi-Source Proficiency Score
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-brand-900">
                      {selectedSkillForAudit.current_level.toFixed(2)}
                    </span>
                    <span className="text-sm font-bold text-slate-500">out of 5.0</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-brand-200 text-brand-700 ml-2">
                      Target: {selectedSkillForAudit.target_level.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-2xl font-black text-emerald-600">
                    {Math.round(selectedSkillForAudit.confidence * 100)}%
                  </div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Corroborated Confidence
                  </div>
                </div>
              </div>

              {/* Multi-Source Evidence Fusion Breakdown */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-brand-600" />
                    Multi-Source Evidence Breakdown
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    selectedSkillForAudit.verification_status === 'verified'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    Status: {selectedSkillForAudit.verification_status || (selectedSkillForAudit.current_level > 0 ? 'Verified' : 'Detected')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Resume Evidence</div>
                    <div className="text-xs font-bold text-slate-800 mt-0.5">
                      {selectedSkillForAudit.sources_summary?.resume || (selectedSkillForAudit.sources_present?.includes('resume') ? 'Detected' : 'None')}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Assessment</div>
                    <div className="text-xs font-bold text-indigo-700 mt-0.5">
                      {selectedSkillForAudit.sources_summary?.assessment || (selectedSkillForAudit.sources_present?.includes('assessment') ? 'Verified' : 'None')}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Practical Project</div>
                    <div className="text-xs font-bold text-brand-700 mt-0.5">
                      {selectedSkillForAudit.sources_summary?.practical_project || (selectedSkillForAudit.sources_present?.includes('practical_project') ? 'Verified' : 'None')}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Coach Evaluation</div>
                    <div className="text-xs font-bold text-emerald-700 mt-0.5">
                      {selectedSkillForAudit.sources_summary?.trainer_evaluation || selectedSkillForAudit.sources_summary?.coach_evaluation || (selectedSkillForAudit.sources_present?.includes('trainer_evaluation') ? 'Verified' : 'None')}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Employer Feedback</div>
                    <div className="text-xs font-bold text-sky-700 mt-0.5">
                      {selectedSkillForAudit.sources_summary?.employer_feedback || (selectedSkillForAudit.sources_present?.includes('employer_feedback') ? 'Verified' : 'None')}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 text-white">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Final Skill Profile</div>
                    <div className="text-xs font-black text-brand-400 mt-0.5">
                      {selectedSkillForAudit.sources_summary?.final_skill_profile || `${selectedSkillForAudit.current_level.toFixed(1)}/5`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Exact Transparent Explanation String */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  Engine Calculation Rationale & Formula Narrative
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                  {selectedSkillForAudit.calculation_explanation || (
                    "Score computed using the Configurable Bayesian Fusion Model weighting Practical Project (30%), Assessment (25%), Trainer Evaluation (20%), Certification (15%), and Employer Feedback (10%) with recency time-decay adjustments."
                  )}
                </p>
              </div>

              {/* Mathematical Formula Specification Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-2">
                <span className="font-bold text-indigo-950 uppercase tracking-wider block text-[11px]">
                  Configurable Multi-Source Weighting Formula
                </span>
                <code className="block p-2.5 rounded-xl bg-white border border-indigo-200 text-indigo-900 font-mono text-[11px] leading-relaxed">
                  Proficiency Score = Σ(Weight_i × Confidence_i × RecencyFactor_i × Score_i) / Σ(Weight_i × Confidence_i × RecencyFactor_i)
                </code>
                <div className="text-[11px] text-indigo-800/80">
                  Recency Factor: 1.0 (≤90 days) • 0.95 (91–180 days) • 0.90 (181–365 days) • 0.80 (&gt;1 year).
                  Cross-source corroboration adds up to +12% confidence when 3+ independent sources confirm proficiency.
                </div>
              </div>

              {/* Evidence Records Breakdown Table */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Supporting Evidence Records ({selectedSkillForAudit.evidence.length})
                </span>

                <div className="space-y-3">
                  {selectedSkillForAudit.evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 hover:border-brand-300 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-slate-100">
                            {SOURCE_ICONS[ev.evidence_source as EvidenceSourceType]}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900">
                            {ev.source_label || ev.evidence_source.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            ID: {ev.id || `EV-${idx + 1}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Score: {ev.score.toFixed(1)} / 5.0
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {Math.round(ev.confidence * 100)}% Conf
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <div>
                          <strong className="text-slate-700">Reviewer / Source:</strong> {ev.reviewer_source}
                        </div>
                        <div>
                          <strong className="text-slate-700">Assessment Date:</strong> {ev.assessment_date}
                        </div>
                        <div>
                          <strong className="text-slate-700">Effective Weight:</strong> {ev.effective_weight ? `${(ev.effective_weight * 100).toFixed(1)}%` : 'Active'}
                        </div>
                      </div>

                      {ev.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                          "{ev.notes}"
                        </p>
                      )}

                      {ev.rubric_scores && ev.rubric_scores.rubric_title && (
                        <div className="flex items-center gap-2 text-[11px] text-brand-800 bg-brand-50/50 p-2 rounded-xl border border-brand-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                          <span>
                            <strong>Rubric Level {ev.rubric_scores.proficiency_level}:</strong> {ev.rubric_scores.rubric_title}
                          </span>
                        </div>
                      )}

                      {ev.artifact_url && (
                        <div className="text-[11px] text-slate-400">
                          Artifact: <a href={`https://${ev.artifact_url}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline font-mono">{ev.artifact_url}</a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <Button variant="outline" onClick={() => setSelectedSkillForAudit(null)}>
                Close Audit
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
