import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 border border-brand-100 shadow-inner">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">404 - Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
        The workforce intelligence view or candidate record you requested does not exist or may have been relocated.
      </p>

      <div className="flex items-center gap-3 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Go Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/dashboard')}
          icon={<Home className="w-4 h-4" />}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};
