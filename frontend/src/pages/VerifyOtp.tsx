import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, KeyRound, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export const VerifyOtp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyOtp, resendOtp, user } = useAuth();

  const emailParam = searchParams.get('email') || user?.email || '';
  const initialDemoOtp = searchParams.get('demo_otp') || '';

  const [email, setEmail] = useState(emailParam);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [demoOtp, setDemoOtp] = useState<string | null>(initialDemoOtp || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // If demo OTP was provided in URL, prefill for rapid developer testing
    if (initialDemoOtp && initialDemoOtp.length === 6) {
      setOtpDigits(initialDemoOtp.split(''));
    }
  }, [initialDemoOtp]);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto advance focus
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      setOtpDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyOtp(email, fullOtp);
      setSuccessMsg('Account successfully verified! Redirecting to workspace...');
      setTimeout(() => {
        if (res.user.role === 'TRAINEE' && res.user.trainee_id) {
          navigate(`/trainees/${res.user.trainee_id}`);
        } else {
          navigate('/dashboard');
        }
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setErrorMsg(null);
    try {
      const res = await resendOtp(email);
      setSuccessMsg(res.message);
      if (res.demo_otp) {
        setDemoOtp(res.demo_otp);
        setOtpDigits(res.demo_otp.split(''));
      }
      setResendCooldown(30);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification code.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-10 text-center">
        
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-500/25">
          <KeyRound className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
          Verify Your Email
        </h2>
        <p className="text-xs text-slate-500 font-medium mb-6">
          We sent a 6-digit confirmation code to{' '}
          <strong className="text-slate-800 font-bold">{email || 'your email'}</strong>
        </p>

        {/* Demo Simulation Alert */}
        {demoOtp && (
          <div className="mb-6 p-3.5 bg-brand-50 rounded-2xl border border-brand-200 text-left text-xs text-brand-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
              <div>
                <span className="font-extrabold block text-brand-800">Simulated Email OTP:</span>
                <span className="font-mono text-sm tracking-widest font-black text-brand-700">{demoOtp}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOtpDigits(demoOtp.split(''))}
              className="text-[11px] font-bold text-brand-700 bg-white px-2.5 py-1 rounded-lg border border-brand-300 hover:bg-brand-50 transition-colors"
            >
              Auto-fill
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2.5 sm:gap-3" onPaste={handlePaste}>
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-extrabold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all font-mono"
              />
            ))}
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full py-3 text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white justify-center shadow-md shadow-brand-500/20"
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Verify & Access Console
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            disabled={resendCooldown > 0}
            onClick={handleResend}
            className={`flex items-center gap-1 font-bold ${
              resendCooldown > 0
                ? 'text-slate-400 cursor-not-allowed'
                : 'text-brand-600 hover:underline cursor-pointer'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}</span>
          </button>

          <Link to="/login" className="text-slate-600 hover:text-slate-900 font-bold hover:underline">
            Back to Sign In
          </Link>
        </div>

      </div>
    </div>
  );
};
