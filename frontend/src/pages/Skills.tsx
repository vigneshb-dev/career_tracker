import React, { useState, useEffect } from 'react';
import {
  Award,
  Search,
  TrendingUp,
  Users,
  Briefcase,
  Sparkles,
  CheckCircle2,
  Layers,
  ArrowRight,
  Zap,
  Tag,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { SearchInput } from '../components/common/SearchInput';
import { LoadingState } from '../components/common/LoadingState';
import { api } from '../services/api';
import {
  CompetencySkill,
  Course,
  Competency,
  Occupation,
  DomainSummary,
} from '../types';
import { SkillDetailModal } from '../components/skills/SkillDetailModal';
import { CompetencyPathwayFlow } from '../components/skills/CompetencyPathwayFlow';
import { SkillNormalizationSandbox } from '../components/skills/SkillNormalizationSandbox';

export const Skills: React.FC = () => {
  const [skills, setSkills] = useState<CompetencySkill[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [domains, setDomains] = useState<DomainSummary[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'matrix' | 'pathway' | 'normalize'>('matrix');

  // Modal State
  const [selectedSkillForModal, setSelectedSkillForModal] = useState<CompetencySkill | null>(null);

  const availableDomains = [
    'Software Development',
    'Data Analytics',
    'Digital Marketing',
    'Electrician',
    'Healthcare',
    'Retail',
    'Manufacturing',
  ];

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [skillsData, coursesData, compsData, occsData, domainsData] = await Promise.all([
          api.getCompetencySkills(),
          api.getCourses(),
          api.getCompetencies(),
          api.getOccupations(),
          api.getCompetencyDomains(),
        ]);
        setSkills(skillsData);
        setCourses(coursesData);
        setCompetencies(compsData);
        setOccupations(occsData);
        setDomains(domainsData);
      } catch (err) {
        console.error('Failed to load competency intelligence dataset', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter skills
  const filteredSkills = skills.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
      (s.aliases && s.aliases.some((al) => al.toLowerCase().includes(search.toLowerCase())));
    const matchesDomain = domainFilter === 'all' || s.domain === domainFilter;
    const matchesCat = categoryFilter === 'all' || s.category === categoryFilter;
    return matchesSearch && matchesDomain && matchesCat;
  });

  // Filter courses, competencies, occupations for current domain
  const currentCourses = courses.filter(
    (c) => domainFilter === 'all' || c.domain === domainFilter
  );
  const currentCompetencies = competencies.filter(
    (cmp) => domainFilter === 'all' || cmp.domain === domainFilter
  );
  const currentOccupations = occupations.filter(
    (occ) => domainFilter === 'all' || occ.domain === domainFilter
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-xl bg-brand-50 text-brand-600">
              <Compass className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-brand-600">
              Workforce Intelligence Architecture
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Competency Intelligence & Skills Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Standardized ontology connecting <strong className="text-slate-700">Course → Competency → Skill → Occupation</strong> across 7 core workforce domains with 0–5 proficiency levels and canonical term normalization.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center p-1 bg-white rounded-2xl border border-slate-200 shadow-sm self-start lg:self-auto">
          <button
            onClick={() => setViewMode('matrix')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'matrix'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Skills Taxonomy
          </button>
          <button
            onClick={() => setViewMode('pathway')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'pathway'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Pipeline Flow (4-Tier)
          </button>
          <button
            onClick={() => setViewMode('normalize')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'normalize'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Normalization Sandbox
          </button>
        </div>
      </div>

      {/* 7 Domains Filter Tabs Bar */}
      <div className="p-2 bg-white rounded-2xl border border-slate-100 shadow-card flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-2">
        <button
          onClick={() => setDomainFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
            domainFilter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          All 7 Domains ({skills.length})
        </button>

        {availableDomains.map((dom) => {
          const isSelected = domainFilter === dom;
          return (
            <button
              key={dom}
              onClick={() => setDomainFilter(dom)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
              }`}
            >
              <span>{dom}</span>
            </button>
          );
        })}
      </div>

      {/* VIEW MODE 1: SKILLS TAXONOMY MATRIX */}
      {viewMode === 'matrix' && (
        <div className="space-y-6">
          {/* Search & Category Filter Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-card flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-80">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search skills, aliases, tools (e.g. Python, conduit)..."
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Filter:
              </span>
              {[
                { id: 'all', label: 'All Categories' },
                { id: 'hard', label: 'Hard / Technical' },
                { id: 'soft', label: 'Soft / Behavioral' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    categoryFilter === cat.id
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Skills Grid */}
          {isLoading ? (
            <LoadingState message="Loading ontology matrix..." />
          ) : filteredSkills.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-black text-slate-800 text-base">No matching skills found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting your search keywords or switching domain filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSkills.map((skill) => (
                <div
                  key={skill.id}
                  onClick={() => setSelectedSkillForModal(skill)}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between cursor-pointer group hover:border-brand-300"
                >
                  <div>
                    {/* Category & Trajectory Badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            skill.category === 'hard'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {skill.category.toUpperCase()} SKILL
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {skill.domain}
                        </span>
                      </div>

                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {skill.growth_trend || skill.growthTrend || '+15% YoY'}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 tracking-tight group-hover:text-brand-600 transition-colors">
                      {skill.name}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                      {skill.description}
                    </p>

                    {/* Normalized Aliases Preview */}
                    {skill.aliases && skill.aliases.length > 0 && (
                      <div className="mt-3 flex items-center gap-1 flex-wrap text-[10px] text-slate-500">
                        <span className="font-bold text-slate-400">Aliases:</span>
                        {skill.aliases.slice(0, 3).map((al, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-50 border border-slate-200/80 px-1.5 py-0.5 rounded text-slate-600"
                          >
                            {al}
                          </span>
                        ))}
                        {skill.aliases.length > 3 && (
                          <span className="font-bold text-slate-400">
                            +{skill.aliases.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                    {/* Market Demand Meter */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-slate-600">Market Demand Index</span>
                        <span className="text-brand-600">
                          {skill.demand_score || skill.demandScore || 85}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-brand-500 h-full rounded-full"
                          style={{
                            width: `${skill.demand_score || skill.demandScore || 85}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                        Levels 0–5 Rubric Defined
                      </span>

                      <span className="text-xs font-black text-brand-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                        Inspect
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: 4-TIER PIPELINE FLOW */}
      {viewMode === 'pathway' && (
        <CompetencyPathwayFlow
          courses={currentCourses}
          competencies={currentCompetencies}
          skills={filteredSkills}
          occupations={currentOccupations}
          selectedDomain={domainFilter}
          onSelectSkill={(s) => setSelectedSkillForModal(s)}
        />
      )}

      {/* VIEW MODE 3: NORMALIZATION SANDBOX */}
      {viewMode === 'normalize' && (
        <SkillNormalizationSandbox
          onInspectSkill={(s) => setSelectedSkillForModal(s)}
        />
      )}

      {/* Skill Detail Modal */}
      <SkillDetailModal
        skill={selectedSkillForModal}
        isOpen={selectedSkillForModal !== null}
        onClose={() => setSelectedSkillForModal(null)}
        allCompetencies={competencies}
        allCourses={courses}
        allOccupations={occupations}
      />
    </div>
  );
};
