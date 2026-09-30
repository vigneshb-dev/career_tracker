import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, isLoading, user, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
        <span className="text-sm font-bold text-slate-600 font-sans tracking-tight">
          Verifying security credentials...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
            Access Restricted
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6 font-normal">
            Your current account role is <span className="font-extrabold text-brand-600 uppercase">{role}</span>.
            This section requires one of the following permissions:
          </p>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {allowedRoles.map((r) => (
              <span
                key={r}
                className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 uppercase border border-slate-200"
              >
                {r}
              </span>
            ))}
          </div>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="w-full justify-center"
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back to Safe Zone
          </Button>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
