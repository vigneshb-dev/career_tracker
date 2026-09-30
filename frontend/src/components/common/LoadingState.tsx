import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
  minHeight?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading intelligence data...',
  subtext = 'Fetching the latest trainee records and metrics',
  minHeight = 'min-h-[280px]',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-100 shadow-sm ${minHeight}`}>
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-12 h-12 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" />
        <Loader2 className="w-5 h-5 text-brand-600 absolute animate-pulse" />
      </div>
      <p className="text-base font-semibold text-slate-800 tracking-tight">{message}</p>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  );
};
