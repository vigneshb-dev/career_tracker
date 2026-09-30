import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Cpu,
  CheckCircle2,
  DollarSign,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Layers,
  Wrench,
  HeartHandshake,
  ArrowRight,
  TrendingUp,
  Save,
  Loader2
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import { JobAnalysisResult, Job } from '../../types';

interface JobAnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated?: (newJob: Job) => void;
}

const PRESET_DESCRIPTIONS = [
  {
    label: 'Python / Cloud Backend',
    title: 'Senior Backend Engineer',
    employer: 'CloudScale Infrastructure',
    location: 'Austin, TX (Hybrid)',
    text: `CloudScale Infrastructure is seeking a Senior Backend Engineer to develop high-throughput distributed microservices.
Requirements:
- 4+ years of professional backend engineering experience.
- Bachelor's degree in Computer Science or Software Engineering.
- Deep expertise in Python, FastAPI, Docker, and PostgreSQL.
- Strong knowledge of microservices architecture, REST APIs, and database query optimization.
- Hands-on familiarity with Linux and Git version control.
- Excellent technical communication, cross-functional collaboration, and critical problem solving.
Compensation: $120,000 - $145,000 / yr with full benefits.`
  },
  {
    label: 'Healthcare / EHR Clinical',
    title: 'Clinical Medical Assistant',
    employer: 'Austin Regional Health',
    location: 'Austin, TX (On-site)',
    text: `Austin Regional Health is hiring a full-time Clinical Medical Assistant for our ambulatory family care clinic.
Key Responsibilities:
- Record patient vitals, phlebotomy, and assist physicians during outpatient examinations.
- Document clinical encounters in Epic EHR and verify electronic patient records.
- Conduct patient intake and administer medications under clinical protocol supervision.
Qualifications:
- 1-3 years of outpatient clinical medical assistant experience.
- Certified Medical Assistant (CCMA or CMA) credential and current BLS/CPR certification.
- Proficient with Digital Multimeter diagnostic tools, medical records systems, and HIPAA compliance.
- Empathic patient communication and bedside de-escalation skills.
Compensation: $22.00 - $26.50 / hr.`
  },
  {
    label: 'Electrician / Industrial',
    title: 'Journeyman Industrial Electrician',
    employer: 'Titan Advanced Power',
    location: 'Dallas, TX (On-site)',
    text: `Titan Advanced Power has an opening for a licensed Journeyman Industrial Electrician to install and maintain commercial switchgear and 480V three-phase systems.
Requirements:
- Valid Journeyman Electrician License with 4+ years of hands-on industrial electrical experience.
- Expert blueprint reading, electrical conduit bending, and transformer wiring.
- Strict compliance with NEC 2023, OSHA 30 standards, and NFPA 70E electrical safety.
- Proficient using Digital Multimeters, megohmmeters, and hydraulic conduit benders.
- Jobsite safety, Lockout/Tagout (LOTO) protocols, and critical problem solving.
Pay Rate: $34.00 - $42.00 / hr.`
  }
];

export const JobAnalyzeModal: React.FC<JobAnalyzeModalProps> = ({ isOpen, onClose, onJobCreated }) => {
  const [title, setTitle] = useState('');
  const [employer, setEmployer] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<JobAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_DESCRIPTIONS[0]) => {
    setTitle(preset.title);
    setEmployer(preset.employer);
    setLocation(preset.location);
    setDescription(preset.text);
    setResult(null);
    setError(null);
    setSaveSuccess(false);
  };

  const handleAnalyze = async () => {
    if (!description.trim()) {
      setError('Please enter a job description to analyze.');
      return;
    }
    setError(null);
    setIsAnalyzing(true);
    setSaveSuccess(false);

    try {
      const data = await api.analyzeJob({
        description,
        title: title.trim() || undefined,
        employer_name: employer.trim() || undefined,
        location: location.trim() || undefined,
      });
      setResult(data);
      if (data.location && !location) setLocation(data.location);
    } catch (err: any) {
      setError(err.message || 'Failed to process job description.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToPlatform = async () => {
    if (!result) return;
    setIsSaving(true);
    setError(null);

    try {
      const created = await api.createJob({
        title: title || result.title || 'Analyzed Job Requisition',
        employer_name: employer || 'SkillTrace Partner Employer',
        location: location || result.location || 'Remote',
        salary_range: result.salary || 'Competitive',
        description: description,
        domain: result.domain,
        mapped_occupation_id: result.mapped_occupation?.id,
        mapped_occupation_title: result.mapped_occupation?.title,
        experience_level: result.experience_requirements,
        education_level: result.education_requirements,
        required_skills: [
          ...result.extracted_hard_skills.map(s => s.canonical_name || s.raw_text),
          ...result.extracted_tools.map(s => s.canonical_name || s.raw_text)
        ]
      });

      setSaveSuccess(true);
      if (onJobCreated) {
        onJobCreated(created);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save job to platform.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-brand-600 via-brand-500 to-sky-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">AI Job Intelligence Engine</h2>
              <p className="text-xs text-brand-100">
                NLP Extraction → Taxonomy Normalization → Occupation Mapping (pgvector)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Load Realistic Synthetic Job Preset:
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_DESCRIPTIONS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Job Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Full-Stack Developer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Employer Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Apex Health Systems"
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Location (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Seattle, WA (Hybrid)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Description Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Job Description (Unstructured Text)
              </label>
              <span className="text-[11px] text-slate-400">
                {description.length} characters
              </span>
            </div>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste raw job description text here... spaCy & Sentence Transformers will extract hard skills, soft skills, tools, requirements, and map to ontology occupations."
              className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-sans"
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Analyze Action Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Powered by spaCy NLP, Sentence-Transformers & pgvector embeddings
            </div>
            <Button
              variant="primary"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !description.trim()}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Neural Extraction...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extract & Map Skills
                </>
              )}
            </Button>
          </div>

          {/* Pipeline Results Section */}
          {result && (
            <div className="space-y-5 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Pipeline Step Header */}
              <div className="bg-brand-50/70 p-4 rounded-2xl border border-brand-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-900">
                  <span className="px-2 py-0.5 rounded-md bg-brand-600 text-white text-[10px]">STEP 1</span> Skill Extraction
                  <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
                  <span className="px-2 py-0.5 rounded-md bg-brand-600 text-white text-[10px]">STEP 2</span> Normalization
                  <ArrowRight className="w-3.5 h-3.5 text-brand-400" />
                  <span className="px-2 py-0.5 rounded-md bg-brand-600 text-white text-[10px]">STEP 3</span> Occupation Mapping
                </div>
                <Badge variant="success" size="sm">
                  {result.extracted_hard_skills.length + result.extracted_soft_skills.length + result.extracted_tools.length} Skills Extracted
                </Badge>
              </div>

              {/* Mapped Occupation & Domain */}
              {result.mapped_occupation && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mapped Canonical Occupation</span>
                      <Badge variant="brand" size="sm">{result.mapped_occupation.code}</Badge>
                      <Badge variant="neutral" size="sm">{result.domain || result.mapped_occupation.domain}</Badge>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {result.mapped_occupation.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>Band: <strong className="text-slate-700">{result.mapped_occupation.career_band}</strong></span>
                      <span>Median Salary: <strong className="text-slate-700">{result.mapped_occupation.median_salary}</strong></span>
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {result.mapped_occupation.demand_outlook}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-brand-600">
                      {result.mapped_occupation.match_score}%
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      Semantic Alignment
                    </div>
                  </div>
                </div>
              )}

              {/* Requirements Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Salary Detected
                  </div>
                  <div className="text-xs font-extrabold text-slate-800">
                    {result.salary || 'Market Competitive'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-1">
                    <MapPin className="w-3.5 h-3.5 text-sky-600" />
                    Location
                  </div>
                  <div className="text-xs font-extrabold text-slate-800 truncate">
                    {result.location || location || 'Not Specified'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-1">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    Experience Requirement
                  </div>
                  <div className="text-xs font-extrabold text-slate-800 truncate" title={result.experience_requirements || 'Standard'}>
                    {result.experience_requirements || 'Not Specified'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-1">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                    Education Requirement
                  </div>
                  <div className="text-xs font-extrabold text-slate-800 truncate" title={result.education_requirements || 'Standard'}>
                    {result.education_requirements || 'Not Specified'}
                  </div>
                </div>
              </div>

              {/* Extracted Skills Breakdown */}
              <div className="space-y-4">

                {/* Hard Skills */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-brand-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Extracted Hard Skills & Competencies ({result.extracted_hard_skills.length})
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.extracted_hard_skills.length > 0 ? (
                      result.extracted_hard_skills.map((skill, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-white border border-brand-200 text-xs font-semibold text-brand-900 shadow-xs flex items-center gap-2"
                        >
                          <span>{skill.canonical_name || skill.raw_text}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-brand-100 text-brand-700 text-[10px] font-bold">
                            {Math.round(skill.confidence * 100)}% Conf
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No hard skills detected</span>
                    )}
                  </div>
                </div>

                {/* Soft Skills */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Extracted Soft Skills & Behavioral Attributes ({result.extracted_soft_skills.length})
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.extracted_soft_skills.length > 0 ? (
                      result.extracted_soft_skills.map((skill, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs font-semibold text-emerald-900 shadow-xs flex items-center gap-2"
                        >
                          <span>{skill.canonical_name || skill.raw_text}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            {Math.round(skill.confidence * 100)}% Conf
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No soft skills detected</span>
                    )}
                  </div>
                </div>

                {/* Tools & Technologies */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Extracted Tools & Technologies ({result.extracted_tools.length})
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.extracted_tools.length > 0 ? (
                      result.extracted_tools.map((tool, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs font-semibold text-indigo-900 shadow-xs flex items-center gap-2"
                        >
                          <span>{tool.canonical_name || tool.raw_text}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                            {Math.round(tool.confidence * 100)}% Conf
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No tools detected</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Save Ingest Action */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  {saveSuccess ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Job successfully saved to database with 384-d pgvector embedding!
                    </span>
                  ) : (
                    <span>Store this job with extracted skills and vector embeddings in PostgreSQL.</span>
                  )}
                </div>
                <Button
                  variant="primary"
                  onClick={handleSaveToPlatform}
                  disabled={isSaving || saveSuccess}
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving to Database...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save & Ingest Job
                    </>
                  )}
                </Button>
              </div>

            </div>
          )}

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
