import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  UserCheck,
  AlertCircle,
  GraduationCap,
  Compass,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@skilltrace.gov');
  const [password, setPassword] = useState('Admin@123456');
  const [activeRolePill, setActiveRolePill] = useState<'admin' | 'coach' | 'employer' | 'trainee'>('admin');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleRolePillClick = (role: 'admin' | 'coach' | 'employer' | 'trainee') => {
    setActiveRolePill(role);
    setErrorMsg(null);
    if (role === 'admin') {
      setEmail('admin@skilltrace.gov');
      setPassword('Admin@123456');
    } else if (role === 'coach') {
      setEmail('coach.sarah@skilltrace.org');
      setPassword('Coach@123456');
    } else if (role === 'employer') {
      setEmail('recruiter@apexcloud.io');
      setPassword('Employer@123456');
    } else if (role === 'trainee') {
      setEmail('priya.sharma@example.com');
      setPassword('Trainee@123456');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await login(email.trim().toLowerCase(), password);
      if (res.requires_verification) {
        navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
        return;
      }

      // Navigate to destination or role-tailored view
      if (res.user.role === 'TRAINEE' && res.user.trainee_id) {
        navigate(`/trainees/${res.user.trainee_id}`);
      } else {
        navigate(from === '/login' ? '/dashboard' : from);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Left Side: Brand & Value Prop */}
        <div className="md:col-span-5 bg-gradient-to-br from-brand-600 via-brand-700 to-navy-900 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight">
                SKILL<span className="text-brand-300">TRACE</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
              Post-Training Trajectory & Workforce Intelligence
            </h2>
            <p className="mt-3 text-sm text-brand-100 leading-relaxed font-normal">
              Continuous outcome tracking, multi-source competency verification, and semantic employer matching for public and private training ecosystems.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-brand-300 shrink-0" />
                <span>Multi-Role RBAC: Trainee, Coach, Employer, Admin</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-brand-300 shrink-0" />
                <span>Self-Service Trainee Passports & Resume Ingestion</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-brand-300 shrink-0" />
                <span>JWT Authentication & Redis-Backed Session Security</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/15 text-[11px] text-brand-200">
            Enterprise Security • FastAPI, PostgreSQL & JWT RBAC
          </div>

          {/* Background Ambient Glow */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-brand-400/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Right Side: Login Form */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h3>
            <p className="text-sm text-slate-500 mt-1">Sign in with your role credentials to access your console</p>
          </div>

          {/* Quick-fill Role Selector Pills */}
          <div className="mb-6">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Quick Demo Role Switcher</span>
              <span className="text-[10px] text-brand-600 font-semibold">1-Click Auto Fill</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {[
                { id: 'admin', label: 'Admin', icon: ShieldAlert },
                { id: 'coach', label: 'Coach', icon: Compass },
                { id: 'employer', label: 'Employer', icon: Building2 },
                { id: 'trainee', label: 'Trainee', icon: GraduationCap },
              ].map((pill) => {
                const Icon = pill.icon;
                const isActive = activeRolePill === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => handleRolePillClick(pill.id as any)}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'bg-white text-brand-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{pill.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work / Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                <input type="checkbox" defaultChecked className="rounded text-brand-600 focus:ring-brand-500" />
                <span>Keep me signed in</span>
              </label>
              <Link to="/forgot-password" className="text-brand-600 font-bold hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full py-3 mt-2 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white justify-center shadow-md shadow-brand-500/20"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Console
            </Button>
          </form>

          {/* Self-service registration banner */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-500">Need a new account? </span>
            <Link
              to="/signup"
              className="text-xs font-extrabold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
            >
              Self-Register as Trainee, Coach or Employer
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};
