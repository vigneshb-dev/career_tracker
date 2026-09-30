import React, { useState } from 'react';
import {
  X,
  Award,
  TrendingUp,
  Briefcase,
  Layers,
  GraduationCap,
  CheckCircle2,
  Tag,
  BookOpen,
  IndianRupee,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { CompetencySkill, Course, Competency, Occupation } from '../../types';
import { Badge } from '../common/Badge';

interface SkillDetailModalProps {
  skill: CompetencySkill | null;
  isOpen: boolean;
  onClose: () => void;
  allCompetencies?: Competency[];
  allCourses?: Course[];
  allOccupations?: Occupation[];
}

export const SkillDetailModal: React.FC<SkillDetailModalProps> = ({
  skill,
  isOpen,
  onClose,
  allCompetencies = [],
  allCourses = [],
  allOccupations = [],
}) => {
  const [activeTab, setActiveTab] = useState<'rubric' | 'occupations' | 'competencies'>('rubric');

  if (!isOpen || !skill) return null;

  // Find related objects
  const relatedComps = allCompetencies.filter((c) =>
    (skill.related_competency_ids || []).includes(c.id)
  );

  const relatedOccs = allOccupations.filter((o) =>
    (skill.related_occupation_ids || []).includes(o.id)
  );

  const relatedCourseIds = new Set<string>();
  relatedComps.forEach((c) => (c.course_ids || []).forEach((id) => relatedCourseIds.add(id)));
  const relatedCoursesList = allCourses.filter((crs) => relatedCourseIds.has(crs.id));

  const proficiencyLevels = skill.proficiency_levels || {};
  const levelsList = [0, 1, 2, 3, 4, 5].map((lvl) => {
    const data = proficiencyLevels[String(lvl)] || {
      level: lvl,
      title: `Level ${lvl}`,
      description: 'Standard proficiency performance criteria.',
      rubric: [],
    };
    return data;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header Bar */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                {skill.domain}
              </span>
              <span
                className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  skill.category === 'hard'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {skill.category.toUpperCase()} SKILL
              </span>
              {skill.code && (
                <span className="text-xs font-mono text-slate-400">
                  {skill.code}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              {skill.name}
              {skill.canonical_name && skill.canonical_name !== skill.name && (
                <span className="text-sm font-normal text-slate-300">
                  (Canonical: {skill.canonical_name})
                </span>
              )}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              {skill.description}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Demand Score</span>
              <span className="font-extrabold text-brand-600 text-sm">
                {skill.demand_score || skill.demandScore || 85}% Market Pull
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block uppercase">YoY Trajectory</span>
              <span className="font-extrabold text-emerald-600 text-sm flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {skill.growth_trend || skill.growthTrend || '+15% YoY'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Proficient Candidates</span>
              <span className="font-extrabold text-slate-800 text-sm">
                {skill.trainees_proficient || skill.traineesProficient || 0} Trainees
              </span>
            </div>
          </div>

          {/* Aliases Pill Group */}
          {skill.aliases && skill.aliases.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Aliases:
              </span>
              {skill.aliases.slice(0, 4).map((al, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[11px] font-medium"
                >
                  {al}
                </span>
              ))}
              {skill.aliases.length > 4 && (
                <span className="text-[10px] text-slate-400 font-bold">
                  +{skill.aliases.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tabs Bar */}
        <div className="px-6 border-b border-slate-100 flex items-center gap-2 bg-white">
          <button
            onClick={() => setActiveTab('rubric')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'rubric'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Proficiency Levels (0–5 Rubric)
          </button>
          <button
            onClick={() => setActiveTab('occupations')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'occupations'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Related Occupations ({relatedOccs.length})
          </button>
          <button
            onClick={() => setActiveTab('competencies')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'competencies'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Curriculum & Courses ({relatedComps.length})
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: PROFICIENCY LEVELS 0-5 */}
          {activeTab === 'rubric' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-brand-50 border border-brand-100 text-xs text-brand-900 leading-relaxed flex items-center gap-2">
                <Award className="w-4 h-4 text-brand-600 shrink-0" />
                <span>
                  <strong>Standardized 0–5 Competency Rubric:</strong> Used by evaluators and employers to audit trainee skill progression and verify on-the-job mastery.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {levelsList.map((lvl) => {
                  const levelNum = lvl.level;
                  const levelBadgeColors: Record<number, string> = {
                    0: 'bg-slate-100 text-slate-700 border-slate-200',
                    1: 'bg-blue-50 text-blue-700 border-blue-200',
                    2: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    3: 'bg-brand-50 text-brand-700 border-brand-200',
                    4: 'bg-violet-50 text-violet-700 border-violet-200',
                    5: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  };

                  return (
                    <div
                      key={levelNum}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-brand-200 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                              levelBadgeColors[levelNum] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            Level {levelNum}: {lvl.title}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            Rubric Tier {levelNum}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-3">
                          {lvl.description}
                        </p>
                      </div>

                      {lvl.rubric && lvl.rubric.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 space-y-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            Observable Assessment Criteria:
                          </span>
                          <ul className="space-y-1">
                            {lvl.rubric.map((item: string, rIdx: number) => (
                              <li
                                key={rIdx}
                                className="text-xs text-slate-700 flex items-start gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: RELATED OCCUPATIONS */}
          {activeTab === 'occupations' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Industry occupations where <strong className="text-slate-800">{skill.name}</strong> is a core required competency, mapped to U.S. O*NET/SOC career standards.
              </p>

              {relatedOccs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No specific occupation mappings defined for this skill.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relatedOccs.map((occ) => (
                    <div
                      key={occ.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-brand-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[11px] font-mono font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                            SOC: {occ.code}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {occ.career_band}
                          </span>
                        </div>

                        <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                          {occ.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {occ.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Median Salary</span>
                          <span className="font-extrabold text-slate-900 text-sm flex items-center gap-0.5">
                            <IndianRupee className="w-3.5 h-3.5 text-emerald-600 -mr-0.5" />
                            {occ.median_salary}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Demand Outlook</span>
                          <span className="font-bold text-emerald-600 text-xs">
                            {occ.demand_outlook}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CURRICULUM & COURSES */}
          {activeTab === 'competencies' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Competency modules and foundational training courses that teach or certify <strong className="text-slate-800">{skill.name}</strong>.
              </p>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Target Competencies
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {relatedComps.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {comp.code}
                          </span>
                          <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                            {comp.domain}
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-900">
                          {comp.title}
                        </h5>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {comp.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {relatedCoursesList.length > 0 && (
                  <>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 pt-3">
                      Feeder Training Courses
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {relatedCoursesList.map((crs) => (
                        <div
                          key={crs.id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-slate-500 font-bold">
                              {crs.code} • {crs.duration_weeks} Weeks
                            </span>
                            <h5 className="text-sm font-bold text-slate-900">
                              {crs.title}
                            </h5>
                            <span className="text-xs text-slate-500 block">
                              Provider: {crs.provider}
                            </span>
                          </div>
                          <Badge variant="brand" size="sm">
                            Curriculum Pathway
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Ontology Node: <strong className="font-mono text-slate-600">{skill.id}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
