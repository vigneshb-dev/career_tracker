import React, { useState } from 'react';
import {
  GraduationCap,
  Layers,
  Award,
  Briefcase,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Course, Competency, CompetencySkill, Occupation } from '../../types';
import { Badge } from '../common/Badge';

interface CompetencyPathwayFlowProps {
  courses: Course[];
  competencies: Competency[];
  skills: CompetencySkill[];
  occupations: Occupation[];
  selectedDomain: string;
  onSelectSkill: (skill: CompetencySkill) => void;
}

export const CompetencyPathwayFlow: React.FC<CompetencyPathwayFlowProps> = ({
  courses,
  competencies,
  skills,
  occupations,
  selectedDomain,
  onSelectSkill,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedOccId, setSelectedOccId] = useState<string | null>(null);

  // Compute connected highlights
  const isCourseConnected = (c: Course) => {
    if (!selectedCompId && !selectedSkillId && !selectedOccId) return true;
    if (selectedCompId) return (c.competency_ids || []).includes(selectedCompId);
    if (selectedSkillId) {
      // Find comps with this skill
      const compIds = competencies
        .filter((cmp) => (cmp.skill_ids || []).includes(selectedSkillId))
        .map((cmp) => cmp.id);
      return (c.competency_ids || []).some((id) => compIds.includes(id));
    }
    if (selectedOccId) {
      const occ = occupations.find((o) => o.id === selectedOccId);
      if (!occ) return true;
      const compIds = occ.competency_ids || [];
      return (c.competency_ids || []).some((id) => compIds.includes(id));
    }
    return true;
  };

  const isCompConnected = (cmp: Competency) => {
    if (!selectedCourseId && !selectedSkillId && !selectedOccId) return true;
    if (selectedCourseId) return (cmp.course_ids || []).includes(selectedCourseId);
    if (selectedSkillId) return (cmp.skill_ids || []).includes(selectedSkillId);
    if (selectedOccId) {
      const occ = occupations.find((o) => o.id === selectedOccId);
      return occ ? (occ.competency_ids || []).includes(cmp.id) : true;
    }
    return true;
  };

  const isSkillConnected = (s: CompetencySkill) => {
    if (!selectedCourseId && !selectedCompId && !selectedOccId) return true;
    if (selectedCourseId) {
      const course = courses.find((c) => c.id === selectedCourseId);
      if (!course) return true;
      return (s.related_competency_ids || []).some((id) =>
        (course.competency_ids || []).includes(id)
      );
    }
    if (selectedCompId) {
      return (s.related_competency_ids || []).includes(selectedCompId);
    }
    if (selectedOccId) {
      const occ = occupations.find((o) => o.id === selectedOccId);
      return occ ? (occ.required_skill_ids || []).includes(s.id) : true;
    }
    return true;
  };

  const isOccConnected = (occ: Occupation) => {
    if (!selectedCourseId && !selectedCompId && !selectedSkillId) return true;
    if (selectedSkillId) return (occ.required_skill_ids || []).includes(selectedSkillId);
    if (selectedCompId) return (occ.competency_ids || []).includes(selectedCompId);
    if (selectedCourseId) {
      const course = courses.find((c) => c.id === selectedCourseId);
      if (!course) return true;
      return (occ.competency_ids || []).some((id) =>
        (course.competency_ids || []).includes(id)
      );
    }
    return true;
  };

  const clearSelection = () => {
    setSelectedCourseId(null);
    setSelectedCompId(null);
    setSelectedSkillId(null);
    setSelectedOccId(null);
  };

  const hasFilter =
    selectedCourseId !== null ||
    selectedCompId !== null ||
    selectedSkillId !== null ||
    selectedOccId !== null;

  return (
    <div className="space-y-4">
      {/* Visualizer Header */}
      <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Competency Pipeline: Course → Competency → Skill → Occupation
            </h3>
            <p className="text-slate-500">
              Interactive 4-tier linkage showing how accredited courses develop verified competencies that map into high-wage jobs. Click any node to trace relationships.
            </p>
          </div>
        </div>

        {hasFilter && (
          <button
            onClick={clearSelection}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shrink-0 self-start sm:self-auto"
          >
            Clear Pathway Focus
          </button>
        )}
      </div>

      {/* 4-Column Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {/* ========================================================
            COLUMN 1: COURSES
            ======================================================== */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-brand-600" />
              1. Training Courses
            </span>
            <Badge variant="brand" size="sm">
              {courses.length}
            </Badge>
          </div>

          <div className="space-y-2.5">
            {courses.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl">
                No courses in this domain.
              </div>
            ) : (
              courses.map((crs) => {
                const isSelected = selectedCourseId === crs.id;
                const isConnected = isCourseConnected(crs);

                return (
                  <div
                    key={crs.id}
                    onClick={() => {
                      setSelectedCourseId(isSelected ? null : crs.id);
                      setSelectedCompId(null);
                      setSelectedSkillId(null);
                      setSelectedOccId(null);
                    }}
                    className={`p-3.5 rounded-xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-brand-500 text-white border-brand-600 shadow-md ring-2 ring-brand-300'
                        : isConnected
                        ? 'bg-white hover:border-brand-300 border-slate-200 shadow-sm text-slate-800'
                        : 'bg-white/50 border-slate-100 opacity-40 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-brand-600 text-brand-100'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {crs.code}
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          isSelected ? 'text-brand-100' : 'text-slate-400'
                        }`}
                      >
                        {crs.duration_weeks} wks
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-extrabold leading-snug tracking-tight ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {crs.title}
                    </h4>

                    <span
                      className={`text-[11px] block mt-1 line-clamp-1 ${
                        isSelected ? 'text-brand-100' : 'text-slate-500'
                      }`}
                    >
                      {crs.provider}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================
            COLUMN 2: COMPETENCIES
            ======================================================== */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              2. Competencies
            </span>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {competencies.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {competencies.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl">
                No competencies in this domain.
              </div>
            ) : (
              competencies.map((cmp) => {
                const isSelected = selectedCompId === cmp.id;
                const isConnected = isCompConnected(cmp);

                return (
                  <div
                    key={cmp.id}
                    onClick={() => {
                      setSelectedCompId(isSelected ? null : cmp.id);
                      setSelectedCourseId(null);
                      setSelectedSkillId(null);
                      setSelectedOccId(null);
                    }}
                    className={`p-3.5 rounded-xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300'
                        : isConnected
                        ? 'bg-white hover:border-indigo-300 border-slate-200 shadow-sm text-slate-800'
                        : 'bg-white/50 border-slate-100 opacity-40 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-indigo-700 text-indigo-100'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {cmp.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          isSelected ? 'text-indigo-200' : 'text-slate-400'
                        }`}
                      >
                        {(cmp.skill_ids || []).length} Skills
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-extrabold leading-snug tracking-tight ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {cmp.title}
                    </h4>

                    <p
                      className={`text-[11px] mt-1.5 line-clamp-2 leading-relaxed ${
                        isSelected ? 'text-indigo-100' : 'text-slate-500'
                      }`}
                    >
                      {cmp.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================
            COLUMN 3: SKILLS (HARD / SOFT)
            ======================================================== */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              3. Discrete Skills
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {skills.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {skills.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl">
                No skills in this domain.
              </div>
            ) : (
              skills.map((s) => {
                const isSelected = selectedSkillId === s.id;
                const isConnected = isSkillConnected(s);

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSkillId(isSelected ? null : s.id);
                      setSelectedCourseId(null);
                      setSelectedCompId(null);
                      setSelectedOccId(null);
                    }}
                    className={`p-3.5 rounded-xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                        : isConnected
                        ? 'bg-white hover:border-emerald-300 border-slate-200 shadow-sm text-slate-800'
                        : 'bg-white/50 border-slate-100 opacity-40 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-emerald-700 text-emerald-100'
                            : s.category === 'hard'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {s.category.toUpperCase()}
                      </span>

                      <span
                        className={`text-[10px] font-bold ${
                          isSelected ? 'text-emerald-100' : 'text-emerald-600'
                        }`}
                      >
                        {s.demand_score || s.demandScore || 85}% Demand
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-extrabold leading-snug tracking-tight ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {s.name}
                    </h4>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold ${
                          isSelected ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        Levels 0–5 defined
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSkill(s);
                        }}
                        className={`text-[10px] font-bold underline flex items-center gap-0.5 ${
                          isSelected
                            ? 'text-white hover:text-emerald-100'
                            : 'text-brand-600 hover:text-brand-700'
                        }`}
                      >
                        Rubric <ChevronRight className="w-3 h-3 inline" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================
            COLUMN 4: OCCUPATIONS (JOBS)
            ======================================================== */}
        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-violet-600" />
              4. Target Occupations
            </span>
            <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
              {occupations.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {occupations.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl">
                No occupations in this domain.
              </div>
            ) : (
              occupations.map((occ) => {
                const isSelected = selectedOccId === occ.id;
                const isConnected = isOccConnected(occ);

                return (
                  <div
                    key={occ.id}
                    onClick={() => {
                      setSelectedOccId(isSelected ? null : occ.id);
                      setSelectedCourseId(null);
                      setSelectedCompId(null);
                      setSelectedSkillId(null);
                    }}
                    className={`p-3.5 rounded-xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-violet-700 text-white border-violet-800 shadow-md ring-2 ring-violet-300'
                        : isConnected
                        ? 'bg-white hover:border-violet-300 border-slate-200 shadow-sm text-slate-800'
                        : 'bg-white/50 border-slate-100 opacity-40 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-violet-800 text-violet-100'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        SOC: {occ.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          isSelected ? 'text-violet-200' : 'text-slate-400'
                        }`}
                      >
                        {occ.career_band}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-extrabold leading-snug tracking-tight ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {occ.title}
                    </h4>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span
                        className={`font-extrabold flex items-center ${
                          isSelected ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500 -mr-0.5" />
                        {occ.median_salary}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          isSelected ? 'text-emerald-200' : 'text-emerald-600'
                        }`}
                      >
                        {occ.demand_outlook.split('(')[0]}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
