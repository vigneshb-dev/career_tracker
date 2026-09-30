import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Award,
  Zap,
  Tag,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { SkillNormalizationResult, CompetencySkill } from '../../types';
import { api } from '../../services/api';

interface SkillNormalizationSandboxProps {
  onInspectSkill: (skill: CompetencySkill) => void;
}

export const SkillNormalizationSandbox: React.FC<SkillNormalizationSandboxProps> = ({
  onInspectSkill,
}) => {
  const [searchTerm, setSearchTerm] = useState('Python Programming');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SkillNormalizationResult | null>({
    query: 'Python Programming',
    canonical_skill_id: 'sk-6',
    canonical_name: 'Python',
    matched_alias: 'python programming',
    confidence: 1.0,
    category: 'hard',
    domain: 'Software Development',
  });

  const sampleTerms = [
    'Python Programming',
    'Python Development',
    'Py',
    'Conduit Bending',
    'EMT Bending',
    'Taking Vital Signs',
    'Patient Vitals',
    'G-Code Programming',
    'GA4 Event Tracking',
    'POS Cashiering',
    'Inventory Management',
  ];

  const handleNormalize = async (termToSearch: string) => {
    if (!termToSearch.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.normalizeSkill(termToSearch.trim());
      setResult(res);
    } catch (err) {
      console.error('Normalization error', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSampleClick = (term: string) => {
    setSearchTerm(term);
    handleNormalize(term);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-card space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-brand-50 text-brand-600">
              <Zap className="w-4 h-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-brand-600">
              Rule-Based & Fuzzy Entity Disambiguation
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Skill Normalization Engine
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Maps raw resume phrases, syllabus terms, and job posting variations (e.g.,{' '}
            <span className="font-semibold text-slate-700">"Python Programming"</span>,{' '}
            <span className="font-semibold text-slate-700">"Python Development"</span>, and{' '}
            <span className="font-semibold text-slate-700">"Py"</span>) to a standardized canonical competency node.
          </p>
        </div>
      </div>

      {/* Interactive Input Bar */}
      <div className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNormalize(searchTerm);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter variant term (e.g., Python Development, conduit bending, taking vital signs)..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSearching ? 'Normalizing...' : 'Normalize Term'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Sample Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-slate-400 font-bold text-[11px] mr-1">
            Try Sample Variations:
          </span>
          {sampleTerms.map((term) => (
            <button
              key={term}
              onClick={() => handleSampleClick(term)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                searchTerm.toLowerCase() === term.toLowerCase()
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Normalization Resolution Results Card */}
      {result && (
        <div className="pt-2">
          {result.canonical_name ? (
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-brand-50/50 via-white to-slate-50 border border-brand-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Canonical Skill Resolution
                    </span>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      {result.canonical_name}
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {result.canonical_skill_id}
                      </span>
                    </h4>
                  </div>
                </div>

                {/* Confidence Badge */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Normalization Confidence
                    </span>
                    <span className="font-extrabold text-emerald-600 text-base">
                      {Math.round(result.confidence * 100)}% Match
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-700 bg-emerald-50">
                    {Math.round(result.confidence * 100)}%
                  </div>
                </div>
              </div>

              {/* Resolution Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white border border-slate-100 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Input Term
                  </span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block truncate">
                    "{result.query}"
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-100 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Matched Alias Pattern
                  </span>
                  <span className="font-bold text-brand-600 text-sm mt-0.5 block truncate">
                    {result.matched_alias || 'Exact canonical match'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-100 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Category & Domain
                  </span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block truncate">
                    {result.category?.toUpperCase()} • {result.domain}
                  </span>
                </div>
              </div>

              {/* Action Bar */}
              {result.skill_details && (
                <div className="pt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {result.skill_details.description}
                  </p>
                  <button
                    onClick={() => onInspectSkill(result.skill_details!)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 ml-4"
                  >
                    View 0–5 Rubric & Jobs
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong>No direct canonical mapping found for "{result.query}".</strong>
                <p className="text-amber-800 mt-0.5">
                  Try one of the suggested sample terms above, or enter another variation.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
