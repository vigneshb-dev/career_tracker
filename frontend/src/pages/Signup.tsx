import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  UserPlus,
  ArrowRight,
  GraduationCap,
  Compass,
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [selectedRole, setSelectedRole] = useState<'TRAINEE' | 'COACH' | 'EMPLOYER'>('TRAINEE');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Role-specific fields
  const [program, setProgram] = useState('Full Stack Cloud & AI Engineering');
  const [education, setEducation] = useState('B.Tech / B.E. in Computer Science');
  const [location, setLocation] = useState('Bengaluru, KA');
  
  const [coachTitle, setCoachTitle] = useState('Senior Workforce Career Coach');
  const [organization, setOrganization] = useState('National Skill Development Ecosystem');
  const [specialization, setSpecialization] = useState('Software, Cloud & AI Systems');

  const [companyName, setCompanyName] = useState('');
  const [designation, setDesignation] = useState('Talent Acquisition Partner');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify and try again.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await signup({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        role: selectedRole,
        phone: phone.trim() || undefined,
        program: selectedRole === 'TRAINEE' ? program : undefined,
        education: selectedRole === 'TRAINEE' ? education : undefined,
        location: selectedRole === 'TRAINEE' ? location : undefined,
        title: selectedRole === 'COACH' ? coachTitle : undefined,
        organization: selectedRole === 'COACH' ? organization : undefined,
        specialization: selectedRole === 'COACH' ? specialization : undefined,
        company_name: selectedRole === 'EMPLOYER' ? companyName : undefined,
        designation: selectedRole === 'EMPLOYER' ? designation : undefined,
      });

      // Redirect to OTP verification with email and optional demo OTP
      const queryParams = new URLSearchParams({
        email: email.trim().toLowerCase(),
        ...(res.demo_otp ? { demo_otp: res.demo_otp } : {}),
      });
      navigate(`/verify-otp?${queryParams.toString()}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Left Side: Brand & Self-Service Value Prop */}
        <div className="lg:col-span-5 bg-gradient-to-br from-brand-600 via-brand-700 to-navy-900 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight">
                SKILL<span className="text-brand-300">TRACE</span>
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-brand-500/30 text-brand-200 border border-brand-400/30 mb-4">
              <UserPlus className="w-3.5 h-3.5" />
              Self-Service Registration
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
              Create Your Workforce Profile
            </h2>
            <p className="mt-3 text-sm text-brand-100 leading-relaxed font-normal">
              Join the verified talent ecosystem. Independently track your skills, upload resumes, receive career coaching, and connect with employer partners.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-brand-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white font-bold">Independent Trainee Registration</strong>
                  <span>Build your permanent outcome passport and upload resumes directly.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-brand-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white font-bold">Coach Evaluation Workspace</strong>
                  <span>Manage assigned candidate cohorts and conduct verified skill rubrics.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-brand-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white font-bold">Employer Talent Pipeline</strong>
                  <span>Verify work placements and match with pre-screened technical graduates.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 mt-8 border-t border-white/15">
            <div className="flex items-center gap-2 text-xs text-amber-200 bg-amber-950/40 p-3 rounded-xl border border-amber-500/20">
              <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Admin access is restricted to protected system provisioning.</span>
            </div>
          </div>

          {/* Ambient Glow */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-brand-400/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Right Side: Signup Form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Get Started</h3>
            <p className="text-sm text-slate-500 mt-1">Select your account role to configure your portal</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              {
                role: 'TRAINEE' as const,
                title: 'Trainee',
                desc: 'Workforce Learner',
                icon: GraduationCap,
              },
              {
                role: 'COACH' as const,
                title: 'Career Coach',
                desc: 'Mentor & Evaluator',
                icon: Compass,
              },
              {
                role: 'EMPLOYER' as const,
                title: 'Employer',
                desc: 'Hiring Partner',
                icon: Building2,
              },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = selectedRole === item.role;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => setSelectedRole(item.role)}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/50 shadow-sm ring-2 ring-brand-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
                    isSelected ? 'bg-brand-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="font-extrabold text-xs text-slate-900">{item.title}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{item.desc}</div>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* Role-Specific Contextual Fields */}
            {selectedRole === 'TRAINEE' && (
              <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-3 animate-in fade-in duration-150">
                <div className="text-xs font-extrabold text-brand-900 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
                  Trainee Learning Track
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Training Track</label>
                    <input
                      type="text"
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Highest Qualification</label>
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {selectedRole === 'COACH' && (
              <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-3 animate-in fade-in duration-150">
                <div className="text-xs font-extrabold text-brand-900 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-brand-600" />
                  Career Coaching Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Professional Title</label>
                    <input
                      type="text"
                      value={coachTitle}
                      onChange={(e) => setCoachTitle(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Organization / Institute</label>
                    <input
                      type="text"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Domain Specialization</label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {selectedRole === 'EMPLOYER' && (
              <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-3 animate-in fade-in duration-150">
                <div className="text-xs font-extrabold text-brand-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-brand-600" />
                  Employer Partnership Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Company / Entity Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Cloud Solutions"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Your Role / Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full py-3 mt-4 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white justify-center shadow-md shadow-brand-500/20"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Registration & Verify
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-extrabold text-brand-600 hover:underline">
              Sign In to Console
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
