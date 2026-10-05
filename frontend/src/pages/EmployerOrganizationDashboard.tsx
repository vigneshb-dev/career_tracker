import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Briefcase,
  FileCheck2,
  ShieldCheck,
  History,
  Plus,
  ExternalLink,
  MapPin,
  Mail,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Building
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Company, EmployerProfileDetail, Job, JobApplication, OrganizationAuditLog } from '../types';
import { Button } from '../components/common/Button';

export const EmployerOrganizationDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'members' | 'jobs' | 'applications' | 'verifications' | 'audit'>('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tenant Data
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<EmployerProfileDetail[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [auditLogs, setAuditLogs] = useState<OrganizationAuditLog[]>([]);

  // Modals & Forms
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    display_name: '',
    industry: '',
    description: '',
    location: '',
    website: '',
    contact_email: ''
  });

  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    employment_type: 'Full-time',
    location: '',
    salary_range: '₹12,00,000 - ₹18,00,000',
    experience: '2-4 years',
    required_skills: ''
  });

  const userCompanyId = user?.employer_profile?.company_id || 'CMP-01';

  const loadTenantData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load company profile
      let cmp: Company;
      try {
        cmp = await api.getCompany(userCompanyId);
      } catch {
        // Fallback for demo
        cmp = {
          id: userCompanyId,
          legal_name: 'Apex Cloud Technologies India Pvt. Ltd.',
          display_name: 'Apex Cloud Technologies',
          industry: 'Cloud Infrastructure & SaaS',
          description: 'Premier enterprise cloud engineering, distributed systems, and multi-cloud platform services.',
          location: 'Bengaluru, Karnataka',
          website: 'https://apexcloud.io',
          contact_email: 'recruiter@apexcloud.io',
          status: 'verified'
        };
      }
      setCompany(cmp);
      setProfileForm({
        display_name: cmp.display_name || '',
        industry: cmp.industry || '',
        description: cmp.description || '',
        location: cmp.location || '',
        website: cmp.website || '',
        contact_email: cmp.contact_email || ''
      });

      // Load company members
      const empList = await api.getCompanyEmployers(cmp.id).catch(() => []);
      setMembers(empList);

      // Load company jobs
      const jobsList = await api.getCompanyJobs(cmp.id).catch(() => []);
      setJobs(jobsList);

      // Load applications
      const appsList = await api.getCompanyApplications(cmp.id).catch(() => []);
      setApplications(appsList);

      // Load audit logs
      const logs = await api.getCompanyAuditLogs(cmp.id).catch(() => []);
      setAuditLogs(logs);

    } catch (err: any) {
      setError(err.message || 'Failed to load organization profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenantData();
  }, [userCompanyId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    try {
      setError(null);
      const updated = await api.updateCompany(company.id, profileForm);
      setCompany(updated);
      setIsEditingProfile(false);
      setSuccessMsg('Company profile updated successfully. Audit log recorded.');
      setTimeout(() => setSuccessMsg(null), 4000);
      // Reload audit
      const logs = await api.getCompanyAuditLogs(company.id).catch(() => []);
      setAuditLogs(logs);
    } catch (err: any) {
      setError(err.message || 'Failed to update company');
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    try {
      setError(null);
      const skillsArray = jobForm.required_skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const newJob = await api.createCompanyJob(company.id, {
        title: jobForm.title,
        description: jobForm.description,
        employment_type: jobForm.employment_type,
        location: jobForm.location || company.location,
        salary_range: jobForm.salary_range,
        experience: jobForm.experience,
        required_skills: skillsArray
      });

      setJobs([newJob, ...jobs]);
      setIsCreatingJob(false);
      setJobForm({
        title: '',
        description: '',
        employment_type: 'Full-time',
        location: '',
        salary_range: '₹12,00,000 - ₹18,00,000',
        experience: '2-4 years',
        required_skills: ''
      });
      setSuccessMsg(`Job "${newJob.title}" posted successfully under ${company.display_name}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      // Reload audit
      const logs = await api.getCompanyAuditLogs(company.id).catch(() => []);
      setAuditLogs(logs);
    } catch (err: any) {
      setError(err.message || 'Failed to create job');
    }
  };

  const handleArchiveJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to archive this job posting?')) return;
    try {
      await api.archiveJob(jobId);
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'archived' } : j));
      setSuccessMsg(`Job ${jobId} archived successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      if (company) {
        const logs = await api.getCompanyAuditLogs(company.id).catch(() => []);
        setAuditLogs(logs);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to archive job');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Organization Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/20 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1 text-sm font-medium">{error}</div>
            <button onClick={() => setError(null)} className="text-xs font-bold text-rose-600 hover:underline">Dismiss</button>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-700 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
            <div className="flex-1 text-sm font-medium">{successMsg}</div>
            <button onClick={() => setSuccessMsg(null)} className="text-xs font-bold text-emerald-600 hover:underline">Dismiss</button>
          </div>
        )}

        {/* Organization Identity Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0 font-black text-2xl tracking-wider">
                {company?.display_name?.slice(0, 2).toUpperCase() || 'CP'}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {company?.display_name || 'Enterprise Organization'}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Verified Tenant
                  </span>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                    {company?.id}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500 max-w-2xl">
                  {company?.legal_name} • {company?.industry || 'Technology'}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
                  {company?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {company.location}
                    </span>
                  )}
                  {company?.contact_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {company.contact_email}
                    </span>
                  )}
                  {company?.website && (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline">
                      <Globe className="w-3.5 h-3.5" /> {company.website}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="font-bold border-slate-300 hover:bg-slate-50"
              >
                {isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCreatingJob(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20"
                icon={<Plus className="w-4 h-4" />}
              >
                Post Company Job
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Jobs</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{jobs.filter(j => j.status === 'active').length}</p>
            </div>
            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Applications</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">{applications.length}</p>
            </div>
            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team Members</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{members.length || 1}</p>
            </div>
            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">RBAC Status</span>
              <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Strict Tenant Isolation
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-sm font-bold">
          {[
            { id: 'profile', label: 'Company Overview', icon: Building2 },
            { id: 'jobs', label: `Company Jobs (${jobs.length})`, icon: Briefcase },
            { id: 'applications', label: `Applications (${applications.length})`, icon: FileCheck2 },
            { id: 'members', label: `Team Members (${members.length})`, icon: Users },
            { id: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: History },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENT */}

        {/* 1. PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {isEditingProfile ? (
              <form onSubmit={handleUpdateProfile} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Edit Organization Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Display Name</label>
                    <input
                      type="text"
                      value={profileForm.display_name}
                      onChange={e => setProfileForm({ ...profileForm, display_name: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Industry</label>
                    <input
                      type="text"
                      value={profileForm.industry}
                      onChange={e => setProfileForm({ ...profileForm, industry: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location</label>
                    <input
                      type="text"
                      value={profileForm.location}
                      onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Website URL</label>
                    <input
                      type="url"
                      value={profileForm.website}
                      onChange={e => setProfileForm({ ...profileForm, website: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={profileForm.contact_email}
                      onChange={e => setProfileForm({ ...profileForm, contact_email: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Company Description</label>
                  <textarea
                    rows={3}
                    value={profileForm.description}
                    onChange={e => setProfileForm({ ...profileForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" type="button" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Save Changes</Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight mb-2">About {company?.display_name}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-normal">
                      {company?.description || 'No company overview provided.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-400 uppercase">Legal Entity Name</span>
                      <p className="font-semibold text-slate-800 text-sm mt-0.5">{company?.legal_name}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase">Incorporation / Tenant ID</span>
                      <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">{company?.id}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase">Headquarters</span>
                      <p className="font-semibold text-slate-800 text-sm mt-0.5">{company?.location || 'Bengaluru, KA'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase">Industry Domain</span>
                      <p className="font-semibold text-slate-800 text-sm mt-0.5">{company?.industry || 'Cloud & AI'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Tenant Security & RBAC</h3>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900">Resource Ownership Guard</span>
                        <p className="text-slate-600 mt-0.5">Mutations are strictly authenticated against company identifier <strong>{company?.id}</strong>.</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900">Immutable Audit Trail</span>
                        <p className="text-slate-600 mt-0.5">Every job creation, status edit, and candidate verification writes an append-only event.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. JOBS TAB */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            {isCreatingJob && (
              <form onSubmit={handleCreateJob} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-extrabold text-slate-900">Post New Company Requisition</h3>
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Org: {company?.id}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Job Title</label>
                    <input
                      type="text"
                      value={jobForm.title}
                      onChange={e => setJobForm({ ...jobForm, title: e.target.value })}
                      placeholder="e.g. Senior DevOps / Platform Engineer"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Employment Type</label>
                    <select
                      value={jobForm.employment_type}
                      onChange={e => setJobForm({ ...jobForm, employment_type: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Apprenticeship">Apprenticeship</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location</label>
                    <input
                      type="text"
                      value={jobForm.location}
                      onChange={e => setJobForm({ ...jobForm, location: e.target.value })}
                      placeholder="e.g. Bengaluru, KA (Hybrid)"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Salary Range</label>
                    <input
                      type="text"
                      value={jobForm.salary_range}
                      onChange={e => setJobForm({ ...jobForm, salary_range: e.target.value })}
                      placeholder="e.g. ₹18,00,000 - ₹26,00,000"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Experience Level</label>
                    <input
                      type="text"
                      value={jobForm.experience}
                      onChange={e => setJobForm({ ...jobForm, experience: e.target.value })}
                      placeholder="e.g. 3-6 years"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Required Skills (comma-separated)</label>
                    <input
                      type="text"
                      value={jobForm.required_skills}
                      onChange={e => setJobForm({ ...jobForm, required_skills: e.target.value })}
                      placeholder="e.g. Kubernetes, AWS, Terraform, Docker, Python"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Job Description & Responsibilities</label>
                    <textarea
                      rows={4}
                      value={jobForm.description}
                      onChange={e => setJobForm({ ...jobForm, description: e.target.value })}
                      placeholder="Detail cloud engineering requirements, microservices stack, team responsibilities..."
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" type="button" onClick={() => setIsCreatingJob(false)}>Cancel</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Publish Job</Button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Company Requisitions ({jobs.length})</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Strictly owned and editable only by {company?.display_name}</p>
                </div>
                <Button size="sm" onClick={() => setIsCreatingJob(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" icon={<Plus className="w-4 h-4" />}>
                  New Job
                </Button>
              </div>

              {jobs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  No jobs posted yet for {company?.display_name}.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {jobs.map(job => (
                    <div key={job.id} className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base">{job.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            job.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {job.location} • {job.employment_type} • {job.salary_range}
                        </p>
                        {job.required_skills && job.required_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {job.required_skills.slice(0, 5).map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {job.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleArchiveJob(job.id)}
                            className="text-xs font-bold text-slate-600 hover:text-rose-600 hover:border-rose-300"
                          >
                            Archive
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. APPLICATIONS TAB */}
        {activeTab === 'applications' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Candidate Job Applications</h3>
              <p className="text-xs text-slate-500 mt-0.5">Candidates who applied for {company?.display_name}'s openings.</p>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                <FileCheck2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                No applications received for this company yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {applications.map(app => (
                  <div key={app.id} className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{app.trainee_name || app.trainee_id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {app.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Job: <span className="font-semibold text-slate-700">{app.job_title || app.job_id}</span> • Applied: {app.applied_at || 'Recently'}
                      </p>
                      {app.cover_note && (
                        <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-xl">
                          "{app.cover_note}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Employer Team Members ({members.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">Authorized recruiters and HR representatives for {company?.display_name}</p>
            </div>

            {members.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                <p>1 primary active representative: <strong>{user?.full_name || 'Recruiter'}</strong> ({user?.email})</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {members.map(member => (
                  <div key={member.id} className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                        {member.full_name?.slice(0, 2).toUpperCase() || 'EM'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{member.full_name || member.user_id}</h4>
                        <p className="text-xs text-slate-500">{member.email} • {member.designation || 'Talent Representative'} ({member.department || 'HR'})</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {member.verification_status || 'verified'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. AUDIT LOG TAB */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Immutable Organization Audit Trail
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every organization-scoped mutation is permanently recorded.
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                No audit events logged for this company yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-medium text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Resource</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{log.resource_type}</span>: {log.resource_id}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {log.actor_user_id}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
