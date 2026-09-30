import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, CheckCircle2, Lock, Mail } from 'lucide-react';
import { Button } from '../components/common/Button';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('director@skilltrace.gov');
  const [password, setPassword] = useState('demo123456');
  const [role, setRole] = useState<'admin' | 'coach' | 'employer'>('admin');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      localStorage.setItem('skilltrace_auth', JSON.stringify({ email, role, token: 'token-active' }));
      setIsLoading(false);
      navigate('/dashboard');
    }, 600);
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
              Continuous outcome tracking, competency verification, and semantic employer matching for public and private training ecosystems.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-brand-300 shrink-0" />
                <span>30/60/90-Day Longitudinal Retention Audits</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-brand-300 shrink-0" />
                <span>Automated Skill Gap & Remediation Maps</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/90">
                <CheckCircle2 className="w-4 h-4 text-brand-300 shrink-0" />
                <span>pgvector Semantic Talent Search Ready</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/15 text-[11px] text-brand-200">
            Enterprise Prototype • Built with React, FastAPI & PostgreSQL
          </div>

          {/* Background Ambient Glow */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-brand-400/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Right Side: Login Form */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h3>
            <p className="text-sm text-slate-500 mt-1">Sign in to access the workforce management console</p>
          </div>

          {/* Role Pill Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            {(['admin', 'coach', 'employer'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  if (r === 'admin') setEmail('director@skilltrace.gov');
                  if (r === 'coach') setEmail('coach.sarah@skilltrace.org');
                  if (r === 'employer') setEmail('recruiter@apexcloud.io');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                  role === r
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === 'admin' ? 'Director' : r === 'coach' ? 'Career Coach' : 'Employer'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email
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
              <span className="text-brand-600 font-bold hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full py-3 mt-2 text-sm font-bold"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Console
            </Button>
          </form>

          <div className="mt-6 p-3 rounded-xl bg-brand-50/60 border border-brand-100 text-xs text-slate-600 flex items-center justify-between">
            <span>Demo Mode Active</span>
            <span className="font-bold text-brand-700">Pre-authenticated</span>
          </div>
        </div>

      </div>
    </div>
  );
};
