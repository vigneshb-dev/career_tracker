import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Users,
  BookOpen,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  RefreshCw,
  MapPin,
  Mail,
  Globe,
  ShieldCheck,
  History,
  Star,
  FileCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TrainingInstitute, CoachProfileDetail, CourseDetail, Enrollment, OrganizationAuditLog } from '../types';
import { Button } from '../components/common/Button';

export const CoachInstituteDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'courses' | 'trainees' | 'assessments' | 'faculty' | 'audit'>('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tenant Data
  const [institute, setInstitute] = useState<TrainingInstitute | null>(null);
  const [coaches, setCoaches] = useState<CoachProfileDetail[]>([]);
  const [courses, setCourses] = useState<CourseDetail[]>([]);
  const [trainees, setTrainees] = useState<Enrollment[]>([]);
  const [auditLogs, setAuditLogs] = useState<OrganizationAuditLog[]>([]);

  // Modals & Forms
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    location: '',
    website: '',
    contact_email: ''
  });

  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: 'Cloud Computing',
    duration: '12 Weeks',
    mode: 'Hybrid',
    eligibility: 'Intermediate programming fundamentals',
    capacity: 30
  });

  // Assessment Form State
  const [assessForm, setAssessForm] = useState({
    course_id: '',
    trainee_id: '',
    skill_name: 'Kubernetes Orchestration',
    score: 4.5,
    notes: ''
  });

  // Completion Form State
  const [completeForm, setCompleteForm] = useState({
    course_id: '',
    trainee_id: '',
    grade_or_result: 'Passed - Certified Honors',
    notes: 'Exemplary project performance and capstone defense.'
  });

  const userInstituteId = user?.coach_profile?.training_institute_id || 'INST-01';

  const loadInstituteData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load institute profile
      let inst: TrainingInstitute;
      try {
        inst = await api.getTrainingInstitute(userInstituteId);
      } catch {
        inst = {
          id: userInstituteId,
          name: 'National Institute of Cloud & AI',
          description: 'Premier government and ecosystem training center for cloud, data & artificial intelligence workforce excellence.',
          location: 'Bengaluru, Karnataka',
          website: 'https://nica.skilltrace.gov.in',
          contact_email: 'director@nica.skilltrace.gov.in',
          status: 'accredited'
        };
      }
      setInstitute(inst);
      setProfileForm({
        name: inst.name || '',
        description: inst.description || '',
        location: inst.location || '',
        website: inst.website || '',
        contact_email: inst.contact_email || ''
      });

      // Load coaches
      const coachList = await api.getInstituteCoaches(inst.id).catch(() => []);
      setCoaches(coachList);

      // Load institute courses
      const courseList = await api.getInstituteCourses(inst.id).catch(() => []);
      setCourses(courseList);
      if (courseList.length > 0) {
        setAssessForm(prev => ({ ...prev, course_id: courseList[0].id }));
        setCompleteForm(prev => ({ ...prev, course_id: courseList[0].id }));
      }

      // Load enrolled trainees
      const enrollList = await api.getInstituteTrainees(inst.id).catch(() => []);
      setTrainees(enrollList);
      if (enrollList.length > 0) {
        setAssessForm(prev => ({ ...prev, trainee_id: enrollList[0].trainee_id }));
        setCompleteForm(prev => ({ ...prev, trainee_id: enrollList[0].trainee_id }));
      }

      // Load audit logs
      const logs = await api.getInstituteAuditLogs(inst.id).catch(() => []);
      setAuditLogs(logs);

    } catch (err: any) {
      setError(err.message || 'Failed to load training institute profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstituteData();
  }, [userInstituteId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institute) return;
    try {
      setError(null);
      const updated = await api.updateTrainingInstitute(institute.id, profileForm);
      setInstitute(updated);
      setIsEditingProfile(false);
      setSuccessMsg('Institute profile updated successfully. Audit log recorded.');
      setTimeout(() => setSuccessMsg(null), 4000);
      const logs = await api.getInstituteAuditLogs(institute.id).catch(() => []);
      setAuditLogs(logs);
    } catch (err: any) {
      setError(err.message || 'Failed to update institute');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institute) return;
    try {
      setError(null);
      const newCourse = await api.createInstituteCourse(institute.id, courseForm);
      setCourses([newCourse, ...courses]);
      setIsCreatingCourse(false);
      setCourseForm({
        title: '',
        description: '',
        category: 'Cloud Computing',
        duration: '12 Weeks',
        mode: 'Hybrid',
        eligibility: 'Intermediate programming fundamentals',
        capacity: 30
      });
      setSuccessMsg(`Course "${newCourse.title}" created successfully under ${institute.name}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      const logs = await api.getInstituteAuditLogs(institute.id).catch(() => []);
      setAuditLogs(logs);
    } catch (err: any) {
      setError(err.message || 'Failed to create course');
    }
  };

  const handleAssessTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessForm.course_id || !assessForm.trainee_id) {
      setError('Please select both a course and an enrolled candidate.');
      return;
    }
    try {
      setError(null);
      const res = await api.assessTraineeInCourse(assessForm.course_id, {
        trainee_id: assessForm.trainee_id,
        skill_name: assessForm.skill_name,
        score: Number(assessForm.score),
        notes: assessForm.notes || undefined
      });
      setSuccessMsg(`Assessment recorded: ${res.message}`);
      setTimeout(() => setSuccessMsg(null), 4000);
      if (institute) {
        const logs = await api.getInstituteAuditLogs(institute.id).catch(() => []);
        setAuditLogs(logs);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit candidate assessment');
    }
  };

  const handleCompleteCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeForm.course_id || !completeForm.trainee_id) {
      setError('Please select course and candidate to certify.');
      return;
    }
    try {
      setError(null);
      await api.completeCourseForTrainee(completeForm.course_id, {
        trainee_id: completeForm.trainee_id,
        grade_or_result: completeForm.grade_or_result,
        notes: completeForm.notes
      });
      setSuccessMsg(`Course completion and credential certification awarded to ${completeForm.trainee_id}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      // Refresh enrollments
      if (institute) {
        const enrollList = await api.getInstituteTrainees(institute.id).catch(() => []);
        setTrainees(enrollList);
        const logs = await api.getInstituteAuditLogs(institute.id).catch(() => []);
        setAuditLogs(logs);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to record course completion');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading Training Institute Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-sky-50/20 py-8 px-4 sm:px-6 lg:px-8 font-sans">
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

        {/* Institute Identity Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0 font-black text-2xl tracking-wider">
                <GraduationCap className="w-9 h-9" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {institute?.name || 'Training Institute'}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                    Accredited Training Institute
                  </span>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold border border-slate-200">
                    {institute?.id}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500 max-w-2xl">
                  {institute?.description || 'Premier workforce training institute.'}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
                  {institute?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {institute.location}
                    </span>
                  )}
                  {institute?.contact_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {institute.contact_email}
                    </span>
                  )}
                  {institute?.website && (
                    <a href={institute.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-600 hover:underline">
                      <Globe className="w-3.5 h-3.5" /> {institute.website}
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
                onClick={() => setIsCreatingCourse(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-600/20"
                icon={<Plus className="w-4 h-4" />}
              >
                Add Institute Course
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Courses</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{courses.length}</p>
            </div>
            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Trainees</span>
              <p className="text-2xl font-black text-sky-600 mt-1">{trainees.length}</p>
            </div>
            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty Coaches</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{coaches.length || 1}</p>
            </div>
            <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Coach Isolation</span>
              <p className="text-sm font-bold text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Institute-Scoped RBAC
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-sm font-bold">
          {[
            { id: 'profile', label: 'Institute Overview', icon: GraduationCap },
            { id: 'courses', label: `Courses (${courses.length})`, icon: BookOpen },
            { id: 'trainees', label: `Enrolled Trainees (${trainees.length})`, icon: Users },
            { id: 'assessments', label: 'Assessments & Completion', icon: Award },
            { id: 'faculty', label: `Faculty Coaches (${coaches.length})`, icon: Users },
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
                    ? 'border-sky-600 text-sky-600 bg-sky-50/30 rounded-t-xl'
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
                <h3 className="text-lg font-bold text-slate-900 mb-2">Edit Institute Profile</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Institute Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location</label>
                    <input
                      type="text"
                      value={profileForm.location}
                      onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Website URL</label>
                    <input
                      type="url"
                      value={profileForm.website}
                      onChange={e => setProfileForm({ ...profileForm, website: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={profileForm.contact_email}
                      onChange={e => setProfileForm({ ...profileForm, contact_email: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description & Accreditation</label>
                  <textarea
                    rows={3}
                    value={profileForm.description}
                    onChange={e => setProfileForm({ ...profileForm, description: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" type="button" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                  <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold">Save Changes</Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight mb-2">About {institute?.name}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-normal">
                      {institute?.description || 'No institute description provided.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-400 uppercase">Institute ID</span>
                      <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">{institute?.id}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase">Campus / Regional Center</span>
                      <p className="font-semibold text-slate-800 text-sm mt-0.5">{institute?.location || 'Bengaluru, KA'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase">Accreditation</span>
                      <p className="font-semibold text-emerald-700 text-sm mt-0.5">Government & Industry Certified</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 uppercase">Total Offerings</span>
                      <p className="font-semibold text-slate-800 text-sm mt-0.5">{courses.length} Approved Programs</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Coach Governance & Boundaries</h3>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900">Institute-Scoped Authority</span>
                        <p className="text-slate-600 mt-0.5">Coaches can only assess candidates enrolled in their own institute's approved courses.</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900">Cross-Tenant Protection</span>
                        <p className="text-slate-600 mt-0.5">Attempts to evaluate trainees of other institutes are strictly blocked at the backend with 403 Forbidden.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. COURSES TAB */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            {isCreatingCourse && (
              <form onSubmit={handleCreateCourse} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-extrabold text-slate-900">Create New Institute Course</h3>
                  <span className="text-xs font-mono font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                    Institute: {institute?.id}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Title</label>
                    <input
                      type="text"
                      value={courseForm.title}
                      onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                      placeholder="e.g. Advanced Cloud Orchestration & Kubernetes"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category / Domain</label>
                    <input
                      type="text"
                      value={courseForm.category}
                      onChange={e => setCourseForm({ ...courseForm, category: e.target.value })}
                      placeholder="e.g. Cloud Computing / DevOps"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Duration</label>
                    <input
                      type="text"
                      value={courseForm.duration}
                      onChange={e => setCourseForm({ ...courseForm, duration: e.target.value })}
                      placeholder="e.g. 12 Weeks (480 Hours)"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mode</label>
                    <select
                      value={courseForm.mode}
                      onChange={e => setCourseForm({ ...courseForm, mode: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    >
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-Campus">On-Campus</option>
                      <option value="Online Synchronous">Online Synchronous</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Student Capacity</label>
                    <input
                      type="number"
                      value={courseForm.capacity}
                      onChange={e => setCourseForm({ ...courseForm, capacity: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Eligibility Criteria</label>
                    <input
                      type="text"
                      value={courseForm.eligibility}
                      onChange={e => setCourseForm({ ...courseForm, eligibility: e.target.value })}
                      placeholder="e.g. Graduate in computer science, STEM or equivalent diploma"
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Curriculum Summary</label>
                    <textarea
                      rows={3}
                      value={courseForm.description}
                      onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                      placeholder="Detail curriculum modules, practical capstone requirements, laboratory facilities..."
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" type="button" onClick={() => setIsCreatingCourse(false)}>Cancel</Button>
                  <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold">Create Course</Button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Institute Courses ({courses.length})</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Approved programs managed by {institute?.name}</p>
                </div>
                <Button size="sm" onClick={() => setIsCreatingCourse(true)} className="bg-sky-600 hover:bg-sky-700 text-white font-bold" icon={<Plus className="w-4 h-4" />}>
                  New Course
                </Button>
              </div>

              {courses.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  No courses added for this institute yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {courses.map(crs => (
                    <div key={crs.id} className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base">{crs.title}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {crs.status || 'Active'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {crs.category || crs.domain} • {crs.duration} • {crs.mode} • Capacity: {crs.capacity || 30}
                        </p>
                        <p className="text-xs text-slate-600 font-normal line-clamp-2 max-w-2xl">
                          {crs.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs text-slate-400 font-semibold">{crs.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. ENROLLED TRAINEES TAB */}
        {activeTab === 'trainees' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Enrolled Trainees Roster</h3>
              <p className="text-xs text-slate-500 mt-0.5">Candidates actively studying or graduated under {institute?.name}</p>
            </div>

            {trainees.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                No active enrollments found for this institute.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {trainees.map(enr => (
                  <div key={enr.id} className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{enr.trainee_name || enr.trainee_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          enr.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}>
                          {enr.status}
                        </span>
                        {enr.grade_or_result && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {enr.grade_or_result}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Course: <span className="font-semibold text-slate-700">{enr.course_title || enr.course_id}</span> • Enrolled: {enr.enrolled_at ? new Date(enr.enrolled_at).toLocaleDateString() : 'Recently'}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-36 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-sky-600 h-2 rounded-full"
                            style={{ width: `${enr.progress_percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{enr.progress_percent}% Progress</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. ASSESSMENTS TAB */}
        {activeTab === 'assessments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assessment Evaluation Form */}
            <form onSubmit={handleAssessTrainee} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">Assess Enrolled Candidate</h3>
                <p className="text-xs text-slate-500 mt-0.5">Strictly limited to trainees enrolled in this institute's courses.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Course</label>
                <select
                  value={assessForm.course_id}
                  onChange={e => setAssessForm({ ...assessForm, course_id: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  required
                >
                  <option value="">Select Institute Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title} ({c.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Candidate</label>
                <select
                  value={assessForm.trainee_id}
                  onChange={e => setAssessForm({ ...assessForm, trainee_id: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  required
                >
                  <option value="">Select Enrolled Trainee</option>
                  {trainees.map(t => (
                    <option key={t.id} value={t.trainee_id}>
                      {t.trainee_name || t.trainee_id} ({t.course_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Skill to Evaluate</label>
                <input
                  type="text"
                  value={assessForm.skill_name}
                  onChange={e => setAssessForm({ ...assessForm, skill_name: e.target.value })}
                  placeholder="e.g. Kubernetes Orchestration / Microservices"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Proficiency Score: {assessForm.score} / 5.0
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={assessForm.score}
                  onChange={e => setAssessForm({ ...assessForm, score: Number(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Coach Evaluator Feedback</label>
                <textarea
                  rows={3}
                  value={assessForm.notes}
                  onChange={e => setAssessForm({ ...assessForm, notes: e.target.value })}
                  placeholder="Candidate demonstrates high code quality, automated test discipline..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md shadow-sky-600/20">
                Submit Verified Assessment
              </Button>
            </form>

            {/* Course Completion Form */}
            <form onSubmit={handleCompleteCourse} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-900">Award Course Certification</h3>
                <p className="text-xs text-slate-500 mt-0.5">Certifies final completion of course requirements.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Course</label>
                <select
                  value={completeForm.course_id}
                  onChange={e => setCompleteForm({ ...completeForm, course_id: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  required
                >
                  <option value="">Select Institute Course</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Candidate</label>
                <select
                  value={completeForm.trainee_id}
                  onChange={e => setCompleteForm({ ...completeForm, trainee_id: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                  required
                >
                  <option value="">Select Trainee</option>
                  {trainees.map(t => (
                    <option key={t.id} value={t.trainee_id}>
                      {t.trainee_name || t.trainee_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Graduation Result / Distinction</label>
                <select
                  value={completeForm.grade_or_result}
                  onChange={e => setCompleteForm({ ...completeForm, grade_or_result: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                >
                  <option value="Passed - Certified Honors">Passed - Certified Honors</option>
                  <option value="Passed - First Class">Passed - First Class</option>
                  <option value="Completed with Distinction">Completed with Distinction</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Faculty Verification Notes</label>
                <textarea
                  rows={3}
                  value={completeForm.notes}
                  onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })}
                  placeholder="Capstone defense score: 95/100, attendance: 98%..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20" icon={<Award className="w-4 h-4" />}>
                Certify & Record Completion
              </Button>
            </form>
          </div>
        )}

        {/* 5. FACULTY TAB */}
        {activeTab === 'faculty' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Institute Faculty Coaches ({coaches.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">Accredited coaches representing {institute?.name}</p>
            </div>

            {coaches.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                <p>Primary active coach: <strong>{user?.full_name || 'Coach Sarah Jenkins'}</strong> ({user?.email})</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {coaches.map(coach => (
                  <div key={coach.id} className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                        {coach.full_name?.slice(0, 2).toUpperCase() || 'FC'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{coach.full_name || coach.user_id}</h4>
                        <p className="text-xs text-slate-500">{coach.email} • {coach.designation || 'Master Coach'} ({coach.specialization || 'Cloud & DevOps'})</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {coach.verification_status || 'verified'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. AUDIT LOG TAB */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <History className="w-4 h-4 text-sky-600" />
                Immutable Training Institute Audit Trail
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every institute-scoped mutation, assessment, and credential is permanently recorded.
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                No audit events recorded for this institute yet.
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
                          <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
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
