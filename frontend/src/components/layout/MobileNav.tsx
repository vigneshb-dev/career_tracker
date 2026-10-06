import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CalendarCheck,
  Menu,
  X,
  Award,
  GitCompare,
  TrendingUp,
  Building2,
  BarChart3,
  ShieldCheck,
  FileText,
  UserCheck,
  LogOut,
  Sliders,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDrawer: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose, onOpenDrawer }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const userRole = role?.toUpperCase();
  const effectiveTraineeId = user?.trainee_id || 'TRN-2024-001';
  const traineePassportPath = `/trainees/${effectiveTraineeId}`;

  // Role-tailored drawer items
  let drawerItems: { label: string; path: string; icon: any; badge?: number }[] = [];
  let primaryItems: { label: string; path: string; icon: any; badge?: number }[] = [];

  if (userRole === 'TRAINEE') {
    drawerItems = [
      { label: 'My Passport', path: traineePassportPath, icon: UserCheck },
      { label: 'What-If Simulator', path: '/career-simulator', icon: Sliders },
      { label: 'My Outcome Risks', path: '/outcome-risks', icon: ShieldAlert },
      { label: 'Resume & Extraction', path: '/my-resume', icon: FileText },
      { label: 'Skills & Badges', path: '/skills', icon: Award },
      { label: 'Skill Gaps & Goals', path: '/skill-gaps', icon: GitCompare },
      { label: 'Career Trajectories', path: '/career-path', icon: TrendingUp },
      { label: 'Jobs', path: '/jobs', icon: Briefcase },
    ];
    primaryItems = [
      { label: 'Passport', path: traineePassportPath, icon: UserCheck },
      { label: 'Simulator', path: '/career-simulator', icon: Sliders },
      { label: 'Risks', path: '/outcome-risks', icon: ShieldAlert },
      { label: 'Jobs', path: '/jobs', icon: Briefcase },
    ];
  } else if (userRole === 'COACH') {
    drawerItems = [
      { label: 'Trainees', path: '/trainees', icon: Users },
      { label: 'What-If Simulator', path: '/career-simulator', icon: Sliders },
      { label: 'Outcome Risk Engine', path: '/outcome-risks', icon: ShieldAlert },
      { label: 'Skill Assessments', path: '/skills', icon: Award },
      { label: 'Skill Gaps', path: '/skill-gaps', icon: GitCompare },
      { label: 'Career Trajectories', path: '/career-path', icon: TrendingUp },
      { label: 'Follow-ups', path: '/follow-ups', icon: CalendarCheck, badge: 4 },
      { label: 'Jobs', path: '/jobs', icon: Briefcase },
    ];
    primaryItems = [
      { label: 'Trainees', path: '/trainees', icon: Users },
      { label: 'Simulator', path: '/career-simulator', icon: Sliders },
      { label: 'Risks', path: '/outcome-risks', icon: ShieldAlert },
      { label: 'Follow-ups', path: '/follow-ups', icon: CalendarCheck, badge: 4 },
    ];
  } else if (userRole === 'EMPLOYER') {
    drawerItems = [
      { label: 'Verification Portal', path: '/employers', icon: Building2 },
      { label: 'Job Openings', path: '/jobs', icon: Briefcase },
    ];
    primaryItems = [
      { label: 'Portal', path: '/employers', icon: Building2 },
      { label: 'Jobs', path: '/jobs', icon: Briefcase },
    ];
  } else {
    // ADMIN
    drawerItems = [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'What-If Simulator', path: '/career-simulator', icon: Sliders },
      { label: 'Outcome Risk Engine', path: '/outcome-risks', icon: ShieldAlert },
      { label: 'Trainees Directory', path: '/trainees', icon: Users },
      { label: 'Skills & Competencies', path: '/skills', icon: Award },
      { label: 'Job Opportunities', path: '/jobs', icon: Briefcase },
      { label: 'Skill Gap Verification', path: '/skill-gaps', icon: GitCompare },
      { label: 'Career Trajectories', path: '/career-path', icon: TrendingUp },
      { label: 'Retention Follow-ups', path: '/follow-ups', icon: CalendarCheck, badge: 4 },
      { label: 'Employer Portal & Verification', path: '/employers', icon: Building2 },
      { label: 'Workforce Analytics (10D)', path: '/analytics', icon: BarChart3 },
    ];
    primaryItems = [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Trainees', path: '/trainees', icon: Users },
      { label: 'Jobs', path: '/jobs', icon: Briefcase },
      { label: 'Employers', path: '/employers', icon: Building2 },
    ];
  }

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Slide-Out Drawer Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex font-sans">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl z-10 flex flex-col p-6 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-md">
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="font-extrabold text-lg text-slate-900 tracking-tight block">
                    SKILL<span className="text-brand-600">TRACE</span>
                  </span>
                  <span className="text-[10px] font-extrabold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200/50 uppercase">
                    {userRole}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 space-y-1.5">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-sm transition-colors ${
                      isActive
                        ? 'bg-brand-500 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="truncate mr-2">
                <span className="text-xs font-bold text-slate-900 block truncate">{user?.full_name}</span>
                <span className="text-[10px] text-slate-500 truncate block">{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-lg font-sans">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
                isActive ? 'text-brand-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}

        {/* More / Menu Drawer Toggle */}
        <button
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center py-1 px-3 text-slate-500 hover:text-slate-800 rounded-xl transition-all"
        >
          <Menu className="w-5 h-5 stroke-[1.75]" />
          <span className="text-[10px] mt-1 tracking-tight">Menu</span>
        </button>
      </nav>
    </>
  );
};
