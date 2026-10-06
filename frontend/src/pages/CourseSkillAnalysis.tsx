import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Info
} from 'lucide-react';
import { skillIntelligenceApi } from '../services/api';
import { CourseSkillAnalysisResponse } from '../types';

export const CourseSkillAnalysis: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [data, setData] = useState<CourseSkillAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeCourseId = courseId || 'CRS-CLOUD-01';

  const loadCourseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await skillIntelligenceApi.getCourseSkillAnalysis(activeCourseId);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load course skill analysis', err);
      setError(err?.message || 'Failed to analyze course syllabus coverage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourseData();
  }, [activeCourseId]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 space-y-6 font-sans">
      {/* Back button & Header */}
      <div>
        <Link
          to="/admin/skill-intelligence"
          className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Skill Intelligence Dashboard
        </Link>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/80 border border-purple-100 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100/80 border border-purple-200 text-xs font-semibold tracking-wide text-purple-700 uppercase">
                <BookOpen className="w-3.5 h-3.5 text-purple-600" /> Curriculum & Demand Diagnostics
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {data ? data.course_title : 'Course Skill Coverage Analysis'}
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                Aggregated curriculum coverage rate vs real-world employer demand, missing prerequisites, and outcome associations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadCourseData}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium transition shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Analysis
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span>Coverage Formula: <code className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono text-[11px]">(taughtSkillsMatched / totalDemandedSkills) * 100</code></span>
            </div>
            <span className="font-mono text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60 self-start sm:self-auto">
              COURSE ID: {activeCourseId}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Auditing course modules against domain employer requirements...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
          <div className="flex items-center gap-2 font-bold mb-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" /> Course Diagnostic Error
          </div>
          <p className="text-sm">{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Training Coverage Rate</span>
              <div className="text-3xl font-black text-indigo-600 mt-2">
                {data.training_coverage_rate}%
              </div>
              <div className="text-xs text-slate-500 mt-1">Course modules vs job demand</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Average Trainee Gap</span>
              <div className="text-3xl font-black text-amber-600 mt-2">
                {data.average_skill_gap.toFixed(2)} pts
              </div>
              <div className="text-xs text-slate-500 mt-1">Scale: 0.0 - 5.0 gap severity</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Enrolled Trainees</span>
              <div className="text-3xl font-black text-slate-900 mt-2">
                {data.total_enrolled_trainees}
              </div>
              <div className="text-xs text-slate-500 mt-1">Sample size: n = {data.sample_size}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Curriculum Deficits</span>
              <div className="text-3xl font-black text-rose-600 mt-2">
                {data.high_demand_low_coverage_skills.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">High-demand / low-coverage skills</div>
            </div>
          </div>

          {/* HIGH-DEMAND / LOW-COVERAGE vs GOOD COVERAGE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* HIGH-DEMAND / LOW-COVERAGE */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" /> High-Demand / Low-Coverage Skills
                  </h3>
                  <p className="text-xs text-slate-500">
                    Skills frequently demanded by employers but missing or under-taught in this course
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  ACTION REQUIRED
                </span>
              </div>

              <div className="space-y-3">
                {data.high_demand_low_coverage_skills.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center font-medium">No critical curriculum gaps identified.</p>
                ) : (
                  data.high_demand_low_coverage_skills.map((sk) => (
                    <div key={sk.skill_id} className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/80 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900 text-sm">{sk.skill_name}</span>
                        <span className="font-mono text-rose-700 font-bold">
                          Job Demand: {sk.job_demand_frequency} postings
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {sk.employment_association}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-rose-200/60 font-medium">
                        <span>Covered in Syllabus: <strong className="text-rose-600 font-bold">NO</strong></span>
                        <span>Avg Trainee Gap: {sk.average_gap.toFixed(2)} pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* GOOD COVERAGE SKILLS */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Well-Covered Curriculum Skills
                  </h3>
                  <p className="text-xs text-slate-500">
                    Syllabus competencies aligned with employer demand and high trainee proficiency
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  STRONG ALIGNMENT
                </span>
              </div>

              <div className="space-y-3">
                {data.good_coverage_skills.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center font-medium">No well-covered skills evaluated.</p>
                ) : (
                  data.good_coverage_skills.map((sk) => (
                    <div key={sk.skill_id} className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900 text-sm">{sk.skill_name}</span>
                        <span className="font-mono text-emerald-700 font-bold">
                          Proficiency: Level {sk.proficiency_taught.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        {sk.employment_association}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-emerald-200/60 font-medium">
                        <span>Covered in Syllabus: <strong className="text-emerald-600 font-bold">YES</strong></span>
                        <span>Avg Trainee Gap: {sk.average_gap.toFixed(2)} pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* SUGGESTED CURRICULUM ADDITIONS & EMERGING SKILLS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Suggested Curriculum Additions */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" /> Suggested Curriculum Additions
              </h3>
              <p className="text-xs text-slate-500">
                Actionable module additions derived from actual regional employer vacancies
              </p>

              <div className="space-y-2.5 pt-2">
                {data.suggested_curriculum_additions.map((addition, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{addition}</span>
                    <span className="text-[10px] text-indigo-700 font-bold uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Recommendation
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emerging Skills Detected */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Emerging Skills Detected in Domain
              </h3>
              <p className="text-xs text-slate-500">
                Fast-growing requirements appearing in &gt;25% of latest quarter job postings
              </p>

              <div className="space-y-2.5 pt-2">
                {data.emerging_skills_detected.map((skill, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{skill}</span>
                    <span className="text-[10px] text-emerald-700 font-bold uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      EMERGING_SKILL
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
