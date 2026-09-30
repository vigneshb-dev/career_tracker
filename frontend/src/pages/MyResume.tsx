import React, { useState, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Award,
  Sparkles,
  ArrowRight,
  Download,
  RefreshCw,
  Briefcase,
  GraduationCap,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  BookOpen,
  Info,
  Check,
  X,
  Target
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ResumeAnalysisResult, ExtractedSkillItem } from '../types';

export const MyResume: React.FC = () => {
  const { user } = useAuth();
  const traineeId = user?.trainee_id || 'TRN-2024-001';

  const [resumeInfo, setResumeInfo] = useState<{
    has_resume: boolean;
    filename?: string | null;
    resume_url?: string | null;
    extracted_skills: string[];
    analysis?: ResumeAnalysisResult | null;
  }>({
    has_resume: false,
    extracted_skills: [],
    analysis: null
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Filter & Search states
  const [skillSearch, setSkillSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'skills' | 'metadata' | 'matching'>('skills');
  const [showCompletenessBreakdown, setShowCompletenessBreakdown] = useState(false);

  useEffect(() => {
    loadResumeData();
  }, [traineeId]);

  const loadResumeData = async () => {
    try {
      const data = await api.getResumeInfo(traineeId);
      // If full analysis was not included in resume endpoint, fetch latest analysis record
      if (!data.analysis && data.has_resume) {
        const latest = await api.getLatestResumeAnalysis(traineeId);
        if (latest.has_analysis && latest.analysis) {
          data.analysis = latest.analysis;
        }
      }
      setResumeInfo(data);
    } catch {
      // Fallback
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMsg(null);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      setErrorMsg('Please select a resume file (PDF, DOCX, TXT) to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.uploadResume(traineeId, selectedFile);
      setSuccessMsg('Resume uploaded & analyzed in real time! Verified competencies are synchronized with your SkillTrace passport.');
      
      const newAnalysis: ResumeAnalysisResult = {
        analysis_id: res.analysis_id || `RA-${Date.now()}`,
        trainee_id: traineeId,
        filename: res.filename,
        file_url: res.resume_url,
        file_type: res.filename.split('.').pop()?.toLowerCase() || 'pdf',
        analyzed_at: new Date().toISOString(),
        extracted_metadata: res.extracted_metadata || {
          job_titles: [],
          years_of_experience: 0,
          education: [],
          certifications: [],
          projects: [],
          work_experience: [],
          technical_skills_raw: [],
          soft_skills_raw: [],
          tools_technologies_raw: [],
          domains_industries: [],
          contact_info: {}
        },
        skills_profile: res.skills_profile || [],
        skills_count: res.skills_profile ? res.skills_profile.length : res.extracted_skills.length,
        completeness_score: res.completeness_score ?? 85,
        completeness_label: res.completeness_label || 'System-Generated Section & Evidence Completeness Indicator (Not an objective employability score)',
        completeness_breakdown: res.completeness_breakdown || {} as any,
        job_matches: res.job_matches || [],
        skill_gaps: res.skill_gaps || [],
        recommendations: res.recommendations || []
      };

      setResumeInfo({
        has_resume: true,
        filename: res.filename,
        resume_url: res.resume_url,
        extracted_skills: res.extracted_skills,
        analysis: newAnalysis
      });
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload and analyze resume.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const analysis = await api.reanalyzeResume(traineeId);
      setSuccessMsg('Resume re-analyzed! Competencies, job matches, and career gaps have been freshly computed.');
      setResumeInfo(prev => ({
        ...prev,
        extracted_skills: analysis.skills_profile.map(s => s.canonical_name),
        analysis: analysis
      }));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to re-analyze resume.');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const analysis = resumeInfo.analysis;
  const skillsProfile: ExtractedSkillItem[] = analysis?.skills_profile || [];
  const metadata = analysis?.extracted_metadata;

  // Filter skills
  const categories = ['all', ...Array.from(new Set(skillsProfile.map(s => s.category).filter(Boolean)))];
  const filteredSkills = skillsProfile.filter(s => {
    const matchesSearch = s.canonical_name.toLowerCase().includes(skillSearch.toLowerCase()) ||
                          s.evidence_snippet?.toLowerCase().includes(skillSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 font-sans pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-brand-50 text-brand-700 uppercase tracking-wider border border-brand-200/60">
              AI Workforce Intelligence
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              spaCy + Sentence Transformers + pgvector
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Real-Time AI Resume Analyzer
          </h1>
          <p className="text-sm text-slate-500 font-normal mt-1 max-w-2xl">
            Upload your technical resume in PDF or DOCX format. Our NLP engine parses semantic entities, normalizes terms into canonical competencies, computes your section completeness score, and links directly to verified passport evidence.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {resumeInfo.has_resume && (
            <Button
              onClick={handleReanalyze}
              isLoading={isReanalyzing}
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${isReanalyzing ? 'animate-spin' : ''}`} />}
            >
              Re-analyze Resume
            </Button>
          )}
          <Button
            onClick={loadResumeData}
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload & Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Upload Zone */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {resumeInfo.has_resume ? 'Upload Newer Version / Re-analyze' : 'Upload Resume Document'}
                </h2>
                <span className="text-xs text-slate-400 font-normal">Supports PDF, DOCX, TXT files up to 10MB</span>
              </div>
            </div>
            {resumeInfo.has_resume && (
              <span className="px-2.5 py-1 bg-brand-50 text-brand-700 border border-brand-200/60 rounded-full text-xs font-bold">
                Active Resume Available
              </span>
            )}
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-7 text-center transition-all ${
              isDragOver
                ? 'border-brand-500 bg-brand-50/60'
                : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <input
              type="file"
              id="resume-file-input"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-3 text-brand-600">
              <FileText className="w-6 h-6" />
            </div>

            <label
              htmlFor="resume-file-input"
              className="text-sm font-extrabold text-brand-600 hover:text-brand-700 cursor-pointer hover:underline block mb-1"
            >
              Click to choose PDF or DOCX file
            </label>
            <span className="text-xs text-slate-400 block mb-3">or drag and drop your document here</span>

            {selectedFile ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-brand-100/70 text-brand-800 rounded-xl text-xs font-bold border border-brand-200">
                <FileCheck className="w-4 h-4 text-brand-600 shrink-0" />
                <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                <span className="text-brand-600">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-400 mt-2">
                <span>✓ spaCy Entity Parsing</span>
                <span>✓ Alias Normalization</span>
                <span>✓ pgvector Embeddings</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleUploadAndAnalyze}
              isLoading={isUploading}
              disabled={!selectedFile}
              variant="primary"
              className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold justify-center shadow-md shadow-brand-500/20"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {isUploading ? 'Analyzing NLP Entities...' : 'Upload & Analyze Resume'}
            </Button>

            {resumeInfo.has_resume && (
              <Button
                onClick={handleReanalyze}
                isLoading={isReanalyzing}
                variant="outline"
                className="py-3 font-bold border-slate-200 hover:bg-slate-50"
                icon={<RefreshCw className={`w-4 h-4 ${isReanalyzing ? 'animate-spin' : ''}`} />}
              >
                Re-analyze
              </Button>
            )}
          </div>
        </div>

        {/* System Completeness Indicator & Resume Summary */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Resume Completeness Score</h2>
                  <span className="text-xs text-slate-400 font-normal">Section & evidence presence indicator</span>
                </div>
              </div>
              {analysis && (
                <button
                  onClick={() => setShowCompletenessBreakdown(!showCompletenessBreakdown)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1"
                >
                  {showCompletenessBreakdown ? 'Hide Breakdown' : 'View Breakdown'}
                  {showCompletenessBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {resumeInfo.has_resume ? (
              <div className="mt-4 space-y-4">
                {/* Active file badge */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 block truncate max-w-[220px]">
                        {resumeInfo.filename}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block">
                        {analysis?.analyzed_at ? `Analyzed ${new Date(analysis.analyzed_at).toLocaleDateString()}` : 'Indexed in Competency DB'}
                      </span>
                    </div>
                  </div>
                  {resumeInfo.resume_url && (
                    <a
                      href={resumeInfo.resume_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-slate-500 hover:text-brand-600 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-slate-200 text-xs font-bold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>View</span>
                    </a>
                  )}
                </div>

                {/* Completeness Gauge Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50/50 via-slate-50 to-indigo-50/30 border border-brand-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Completeness Indicator
                    </span>
                    <span className="text-2xl font-black text-brand-600">
                      {analysis?.completeness_score ?? 85}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-2.5">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${analysis?.completeness_score ?? 85}%` }}
                    />
                  </div>

                  {/* Important Disclaimer Notice */}
                  <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-slate-100">
                    <Info className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-700">System-Generated Indicator:</strong> This score reflects the presence of relevant sections and project evidence detected by our NLP engine. It is an internal structure guide, not an objective employability score.
                    </span>
                  </div>
                </div>

                {/* Optional Breakdown Drawer */}
                {showCompletenessBreakdown && analysis?.completeness_breakdown && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <span className="font-extrabold text-slate-700 block mb-1">Section Completeness Breakdown:</span>
                    {Object.entries(analysis.completeness_breakdown).map(([key, item]: [string, any]) => (
                      <div key={key} className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0">
                        <div className="flex items-center gap-2">
                          {item.status === 'present' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span className="font-semibold text-slate-700">{item.label}</span>
                        </div>
                        <span className="font-bold text-slate-600">{item.score}/{item.max} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No Resume Analyzed Yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Upload your resume to calculate your completeness score and extract verified competencies into your trainee record.
                </p>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          {analysis && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className="p-2 rounded-xl bg-slate-50">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Skills Detected</span>
                <span className="text-base font-black text-slate-800">{skillsProfile.length}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Experience</span>
                <span className="text-base font-black text-slate-800">{metadata?.years_of_experience ?? 1}+ yrs</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Job Matches</span>
                <span className="text-base font-black text-brand-600">{analysis.job_matches?.length ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Analysis Results Tabs */}
      {analysis && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('skills')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                  activeTab === 'skills'
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Resume Skill Profile ({skillsProfile.length})
              </button>

              <button
                onClick={() => setActiveTab('metadata')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                  activeTab === 'metadata'
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Extracted Career Metadata
              </button>

              <button
                onClick={() => setActiveTab('matching')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                  activeTab === 'matching'
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                Job Matching & Gaps ({analysis.job_matches?.length ?? 0})
              </button>
            </div>

            <span className="text-xs text-slate-400 font-semibold">
              Analysis ID: <code className="text-slate-600 font-mono">{analysis.analysis_id}</code>
            </span>
          </div>

          {/* TAB 1: Resume Skill Profile */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              
              {/* Category Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                        selectedCategory === cat
                          ? 'bg-brand-50 text-brand-700 border border-brand-200'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search skills or evidence..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Skills Profile Cards Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSkills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-brand-300 transition-all hover:shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">{skill.canonical_name}</h4>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-brand-50 text-brand-700 border border-brand-200/60 uppercase">
                            {skill.category || 'Technical'}
                          </span>
                        </div>
                        {skill.source_term && skill.source_term.toLowerCase() !== skill.canonical_name.toLowerCase() && (
                          <span className="text-[11px] text-slate-400 italic block mt-0.5">
                            Normalized from "{skill.source_term}"
                          </span>
                        )}
                      </div>

                      {/* Estimated Proficiency Badge (0-5) */}
                      <div className="text-right shrink-0">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs font-black">
                          <span>{skill.estimated_proficiency.toFixed(1)}</span>
                          <span className="text-amber-500 text-[10px]">/ 5.0</span>
                        </div>
                        <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                          Proficiency
                        </span>
                      </div>
                    </div>

                    {/* Evidence snippet */}
                    {skill.evidence_snippet && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 italic leading-relaxed">
                        "{skill.evidence_snippet}"
                      </div>
                    )}

                    {/* Meta Footer: Confidence & Competency Link */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-500">Confidence:</span>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden inline-block align-middle">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.round(skill.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-600">{Math.round(skill.confidence * 100)}%</span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-brand-600 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Linked to DB #{skill.skill_id}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredSkills.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No skills matched your search criteria.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Extracted Career Metadata */}
          {activeTab === 'metadata' && metadata && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Job Titles & Experience */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-brand-600" />
                  <h3 className="font-extrabold text-sm text-slate-900">Experience & Job Titles</h3>
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Detected Job Titles</span>
                  {metadata.job_titles && metadata.job_titles.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.job_titles.map((title, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg">
                          {title}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">None detected</span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Total Estimated Experience</span>
                  <span className="text-sm font-extrabold text-slate-800">
                    {metadata.years_of_experience ? `${metadata.years_of_experience} Years` : 'Early Career / Trainee'}
                  </span>
                </div>

                {metadata.work_experience && metadata.work_experience.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <span className="text-xs text-slate-400 font-bold uppercase block">Experience Snippets</span>
                    {metadata.work_experience.map((exp, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>{exp.title || 'Role'}</span>
                          <span className="text-slate-400 text-[11px]">{exp.duration || ''}</span>
                        </div>
                        {exp.organization && <span className="text-[11px] text-brand-600 font-semibold block">{exp.organization}</span>}
                        {exp.description && <p className="text-[11px] text-slate-600">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Education & Certifications */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-brand-600" />
                  <h3 className="font-extrabold text-sm text-slate-900">Education & Certifications</h3>
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Education Credentials</span>
                  {metadata.education && metadata.education.length > 0 ? (
                    <div className="space-y-2">
                      {metadata.education.map((edu, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
                          <div className="font-bold text-slate-800">{edu.degree || 'Degree Program'}</div>
                          <div className="text-[11px] text-slate-500">{edu.institution || ''} {edu.year ? `(${edu.year})` : ''}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No formal degree listed</span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Certifications & Accreditations</span>
                  {metadata.certifications && metadata.certifications.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.certifications.map((cert, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {cert}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No certifications detected</span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Domains & Industries</span>
                  {metadata.domains_industries && metadata.domains_industries.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.domains_industries.map((dom, i) => (
                        <span key={i} className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-md">
                          {dom}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Software Engineering & Tech</span>
                  )}
                </div>
              </div>

              {/* Projects & Practical Evidence */}
              {metadata.projects && metadata.projects.length > 0 && (
                <div className="md:col-span-2 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-600" />
                    <h3 className="font-extrabold text-sm text-slate-900">Extracted Projects & Technical Artifacts</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {metadata.projects.map((proj, i) => (
                      <div key={i} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
                        <span className="font-extrabold text-slate-900 block">{proj.title || `Project #${i + 1}`}</span>
                        {proj.description && <p className="text-slate-600 text-[11px] leading-relaxed">{proj.description}</p>}
                        {proj.metrics && proj.metrics.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {proj.metrics.map((m, mi) => (
                              <span key={mi} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: Job Matching, Gaps & Recommendations */}
          {activeTab === 'matching' && (
            <div className="space-y-6">
              
              {/* Job Matches */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Top Target Job Matches ({analysis.job_matches?.length ?? 0})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Calculated by comparing normalized resume competencies against our employer jobs catalog.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.job_matches?.map((job) => (
                    <div
                      key={job.job_id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-brand-300 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">{job.title}</h4>
                          <span className="text-xs font-semibold text-slate-500 block">
                            {job.company} • {job.location}
                          </span>
                        </div>

                        <div className="px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-xl text-center shrink-0">
                          <span className="text-sm font-black text-brand-700">{job.match_percentage}%</span>
                          <span className="block text-[9px] font-bold uppercase text-brand-500">Match</span>
                        </div>
                      </div>

                      {/* Matched skills */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Matched Skills ({job.matched_skills?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {job.matched_skills?.map((s, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-md text-[10px] font-bold">
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Missing skills (Gaps) */}
                      {job.missing_skills && job.missing_skills.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-rose-500 uppercase block mb-1">
                            Missing Skills ({job.missing_skills.length})
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {job.missing_skills.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-md text-[10px] font-bold">
                                ✗ {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Interventions & Upskilling */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-brand-600" />
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Recommended Upskilling Courses & Interventions
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.recommendations.map((rec) => (
                      <div key={rec.course_id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-extrabold text-xs text-slate-900 block">{rec.title}</span>
                            <span className="text-[11px] text-slate-400">{rec.provider} • {rec.duration_weeks} Weeks</span>
                          </div>
                          {rec.enrollment_url && (
                            <a
                              href={rec.enrollment_url}
                              className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                            >
                              <span>Enroll</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rec.skills_covered?.map((sc, sci) => (
                            <span key={sci} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                              {sc}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
};
