import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  Building2,
  IndianRupee,
  Search,
  Sparkles,
  Cpu,
  Layers,
  GraduationCap,
  TrendingUp,
  BrainCircuit,
  Filter,
  RefreshCw,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { SearchInput } from '../components/common/SearchInput';
import { LoadingState } from '../components/common/LoadingState';
import { JobAnalyzeModal } from '../components/jobs/JobAnalyzeModal';
import { JobSkillsModal } from '../components/jobs/JobSkillsModal';
import { api } from '../services/api';
import { Job } from '../types';

const DOMAINS = [
  'all',
  'Software Development',
  'Data Analytics',
  'Digital Marketing',
  'Electrician',
  'Healthcare',
  'Retail',
  'Manufacturing'
];

export const Jobs: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [workplaceFilter, setWorkplaceFilter] = useState('all');
  const [isSemanticMode, setIsSemanticMode] = useState(false);

  // Modals
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [selectedJobForSkills, setSelectedJobForSkills] = useState<Job | null>(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getJobs({
        domain: domainFilter !== 'all' ? domainFilter : undefined,
        workplace: workplaceFilter !== 'all' ? workplaceFilter : undefined,
        search: !isSemanticMode && search.trim() ? search.trim() : undefined,
        semantic_query: isSemanticMode && search.trim() ? search.trim() : undefined,
      });
      setJobs(data);
    } catch (err) {
      console.error('Failed to load jobs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [domainFilter, workplaceFilter]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchJobs();
  };

  const handleJobCreated = (newJob: Job) => {
    setJobs(prev => [newJob, ...prev]);
  };

  // Filter client-side if not doing semantic search
  const displayedJobs = jobs.filter((j) => {
    if (isSemanticMode) return true; // Server already ranked by cosine similarity
    if (!search.trim()) return true;

    const query = search.toLowerCase();
    const title = (j.title || '').toLowerCase();
    const employer = (j.employerName || j.employer_name || '').toLowerCase();
    const domain = (j.domain || '').toLowerCase();
    const occ = (j.mapped_occupation_title || '').toLowerCase();
    const skills = (j.requiredSkills || j.required_skills || []).map(s => s.toLowerCase());

    return (
      title.includes(query) ||
      employer.includes(query) ||
      domain.includes(query) ||
      occ.includes(query) ||
      skills.some(s => s.includes(query))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-brand-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold tracking-wide">
            <Cpu className="w-3.5 h-3.5 text-white animate-pulse" />
            AI Job Intelligence Engine Active
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
            Job Requisition & Skill Intelligence
          </h1>
          <p className="text-sm text-brand-100 leading-relaxed">
            Neural skill extraction via spaCy, taxonomy normalization to canonical ontology, and 384-dimensional pgvector semantic matching across 35+ verified industry requisitions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Button
            variant="secondary"
            onClick={() => setIsAnalyzeModalOpen(true)}
            className="bg-white text-brand-700 hover:bg-brand-50 font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 px-5 py-3 rounded-2xl"
          >
            <Sparkles className="w-4 h-4 text-brand-600" />
            Analyze Job Description (AI)
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Live Requisitions</span>
          <span className="text-2xl font-black text-slate-900 mt-0.5 block">{jobs.length}</span>
          <span className="text-[11px] font-semibold text-emerald-600">35+ Multi-industry</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Target Domains</span>
          <span className="text-2xl font-black text-brand-600 mt-0.5 block">7</span>
          <span className="text-[11px] font-semibold text-slate-500">Tech to Manufacturing</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Embedding Vector</span>
          <span className="text-2xl font-black text-indigo-600 mt-0.5 block">384-d</span>
          <span className="text-[11px] font-semibold text-slate-500">MiniLM-L6-v2 / pgvector</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-card">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">NLP Pipeline</span>
          <span className="text-2xl font-black text-sky-600 mt-0.5 block">spaCy</span>
          <span className="text-[11px] font-semibold text-slate-500">Confidence Scoring</span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-card space-y-4">
        
        {/* Search row with Semantic switch */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="w-full md:flex-1 flex items-center gap-2">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={
                  isSemanticMode
                    ? "Enter semantic query (e.g. 'high-throughput microservices engineer with docker & postgres')..."
                    : "Search by job title, employer, skill, or keyword..."
                }
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSearchSubmit()}
              className="shrink-0 font-bold"
            >
              <Search className="w-4 h-4 mr-1.5" />
              Search
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => {
                setIsSemanticMode(!isSemanticMode);
              }}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${
                isSemanticMode
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BrainCircuit className={`w-4 h-4 ${isSemanticMode ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>Semantic pgvector Search: {isSemanticMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Domain Chips */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Filter by Domain:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DOMAINS.map((domain) => (
              <button
                key={domain}
                onClick={() => setDomainFilter(domain)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  domainFilter === domain
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {domain === 'all' ? 'All Domains' : domain}
              </button>
            ))}
          </div>
        </div>

        {/* Workplace filter row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Workplace:</span>
            {['all', 'Remote', 'Hybrid', 'On-site'].map((type) => (
              <button
                key={type}
                onClick={() => setWorkplaceFilter(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  workplaceFilter === type
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {type === 'all' ? 'All Workplaces' : type}
              </button>
            ))}
          </div>

          <span className="text-slate-500 font-semibold">
            Showing <strong className="text-slate-900">{displayedJobs.length}</strong> requisitions
          </span>
        </div>

      </div>

      {/* Jobs Listing */}
      {isLoading ? (
        <LoadingState message="Querying Job Intelligence Engine & semantic embeddings..." />
      ) : displayedJobs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-card space-y-3">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No matching job requisitions found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria, domain filters, or use the AI Analyzer to ingest a new job description.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearch('');
              setDomainFilter('all');
              setWorkplaceFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              {/* Left Column: Details */}
              <div className="space-y-3 flex-1 min-w-0">
                
                {/* Badges line */}
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    {job.title}
                  </h3>
                  {job.domain && (
                    <Badge variant="brand" size="sm">
                      {job.domain}
                    </Badge>
                  )}
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                    {job.workplaceType || job.workplace_type || 'Hybrid'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    ID: {job.id}
                  </span>
                </div>

                {/* Sub-header info */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <Building2 className="w-3.5 h-3.5 text-brand-600" />
                    {job.employerName || job.employer_name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-700 font-extrabold">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                    {job.salaryRange || job.salary_range}
                  </span>
                </div>

                {/* Mapped Occupation & Requirements snippet */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  {job.mapped_occupation_title && (
                    <div className="px-3 py-1 rounded-xl bg-brand-50 border border-brand-200/70 text-brand-900 font-bold flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-brand-600" />
                      <span>Mapped Occupation: <strong>{job.mapped_occupation_title}</strong></span>
                    </div>
                  )}
                  {job.experience_level && (
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-medium">
                      Exp: {job.experience_level}
                    </span>
                  )}
                  {job.education_level && (
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-medium flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-slate-400" />
                      {job.education_level}
                    </span>
                  )}
                </div>

                {/* Description snippet */}
                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed line-clamp-2">
                  {job.description}
                </p>

                {/* Extracted Required Skills Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Normalized Skills:
                  </span>
                  {(job.requiredSkills || job.required_skills || []).slice(0, 6).map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200"
                    >
                      {skill}
                    </span>
                  ))}
                  {(job.requiredSkills || job.required_skills || []).length > 6 && (
                    <span className="text-[11px] font-bold text-slate-400">
                      +{(job.requiredSkills || job.required_skills || []).length - 6} more
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex sm:flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                <div className="text-left lg:text-right">
                  <span className="text-xs font-bold text-slate-800 block">
                    {job.openingsCount || job.openings_count || 1} Openings
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {job.applicantsCount || job.applicants_count || 0} Candidates Matched
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedJobForSkills(job)}
                    className="font-bold border-brand-200 text-brand-700 hover:bg-brand-50"
                  >
                    <Layers className="w-3.5 h-3.5 mr-1 text-brand-600" />
                    AI Skills
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      const firstSkill = (job.requiredSkills || job.required_skills || [])[0] || '';
                      navigate(`/skill-gaps`);
                    }}
                    className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Match Trainees
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Job Description Analysis Modal */}
      <JobAnalyzeModal
        isOpen={isAnalyzeModalOpen}
        onClose={() => setIsAnalyzeModalOpen(false)}
        onJobCreated={handleJobCreated}
      />

      {/* AI Skills Breakdown Modal */}
      <JobSkillsModal
        job={selectedJobForSkills}
        isOpen={!!selectedJobForSkills}
        onClose={() => setSelectedJobForSkills(null)}
      />

    </div>
  );
};
