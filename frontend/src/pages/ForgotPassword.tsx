import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, ArrowRight, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    setIsLoading(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setSuccessMsg(res.message);
      if (res.demo_otp) {
        setDemoOtp(res.demo_otp);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch password recovery code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-10 text-center">
        
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/25">
          <KeyRound className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
          Forgot Password?
        </h2>
        <p className="text-xs text-slate-500 font-medium mb-6">
          Enter your registered email address and we'll dispatch a secure 6-digit recovery code.
        </p>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-left space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>

            {demoOtp && (
              <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Simulated OTP Code:</span>
                  <span className="font-mono text-base font-black text-brand-700 tracking-wider">{demoOtp}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}&demo_otp=${demoOtp}`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  Proceed to Reset
                </Button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Work / Trainee Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full py-3 mt-2 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white justify-center shadow-md shadow-brand-500/20"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Send Recovery Code
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
          Remember your password?{' '}
          <Link to="/login" className="font-extrabold text-brand-600 hover:underline">
            Back to Sign In
          </Link>
        </div>

      </div>
    </div>
  );
};
