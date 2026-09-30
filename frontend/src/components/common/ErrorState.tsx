import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an unexpected error while loading this data. Please try again.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl border border-red-100 shadow-sm text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 mb-4 border border-red-100">
        <AlertCircle className="w-7 h-7 stroke-[1.75]" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1.5 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all duration-150"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
};
