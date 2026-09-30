import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  HeartHandshake,
  Wrench,
  CheckCircle2,
  Building2,
  MapPin,
  DollarSign,
  Cpu,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { api } from '../../services/api';
import { Job, JobSkillsBreakdown } from '../../types';

interface JobSkillsModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

export const JobSkillsModal: React.FC<JobSkillsModalProps> = ({ job, isOpen, onClose }) => {
  const [breakdown, setBreakdown] = useState<JobSkillsBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!job || !isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    api.getJobSkills(job.id)
      .then((data) => {
        if (isMounted) setBreakdown(data);
      })
      .catch((err) => {
        console.error('Failed to load skills breakdown', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [job, isOpen]);

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-400 font-bold uppercase tracking-wider">
                  AI Skill Intelligence
                </span>
                {job.domain && (
                  <Badge variant="brand" size="sm">{job.domain}</Badge>
                )}
              </div>
              <h2 className="text-lg font-bold tracking-tight text-white line-clamp-1">
                {job.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Requisition Subheader */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {job.employerName || job.employer_name}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {job.location}
            </span>
          </div>
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            {job.salaryRange || job.salary_range}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {job.mapped_occupation_title && (
            <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider block">
                  Mapped Canonical Occupation
                </span>
                <span className="text-sm font-bold text-brand-950">
                  {job.mapped_occupation_title}
                </span>
              </div>
              <Badge variant="brand" size="sm">
                Aligned Requisition
              </Badge>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              <p className="text-xs font-semibold">Retrieving extracted skills & confidence scores...</p>
            </div>
          ) : breakdown ? (
            <div className="space-y-6">

              {/* Total extracted badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  NLP Extracted Entities & Taxonomy Normalization
                </span>
                <Badge variant="success" size="sm">
                  {breakdown.total_extracted} Total Skills
                </Badge>
              </div>

              {/* Hard Skills */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Hard Skills & Technical Competencies ({breakdown.hard_skills.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {breakdown.hard_skills.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {s.canonical_name || s.raw_text}
                        </div>
                        {s.raw_text && s.raw_text !== s.canonical_name && (
                          <div className="text-[10px] text-slate-400 truncate">
                            Mentioned as: "{s.raw_text}"
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[11px] font-extrabold border border-brand-200 shrink-0">
                        {Math.round(s.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                  {breakdown.hard_skills.length === 0 && (
                    <div className="text-xs text-slate-400 italic">No hard skills recorded.</div>
                  )}
                </div>
              </div>

              {/* Soft Skills */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Soft Skills & Behavioral Attributes ({breakdown.soft_skills.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {breakdown.soft_skills.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 shadow-xs flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <div className="text-xs font-bold text-emerald-950 truncate">
                          {s.canonical_name || s.raw_text}
                        </div>
                        {s.raw_text && s.raw_text !== s.canonical_name && (
                          <div className="text-[10px] text-emerald-700/60 truncate">
                            Mentioned as: "{s.raw_text}"
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-200 shrink-0">
                        {Math.round(s.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                  {breakdown.soft_skills.length === 0 && (
                    <div className="text-xs text-slate-400 italic">No soft skills recorded.</div>
                  )}
                </div>
              </div>

              {/* Tools & Technologies */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Tools & Technologies ({breakdown.tools_and_tech.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {breakdown.tools_and_tech.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 shadow-xs flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <div className="text-xs font-bold text-indigo-950 truncate">
                          {s.canonical_name || s.raw_text}
                        </div>
                        {s.raw_text && s.raw_text !== s.canonical_name && (
                          <div className="text-[10px] text-indigo-700/60 truncate">
                            Tool token: "{s.raw_text}"
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-extrabold border border-indigo-200 shrink-0">
                        {Math.round(s.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                  {breakdown.tools_and_tech.length === 0 && (
                    <div className="text-xs text-slate-400 italic">No tools recorded.</div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <p className="text-xs text-slate-600 font-semibold">
                No normalized skill records found in the database for this job.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                {(job.requiredSkills || job.required_skills || []).map((sk, idx) => (
                  <Badge key={idx} variant="neutral" size="sm">
                    {sk}
                  </Badge>
                ))}
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
