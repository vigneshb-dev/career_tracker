import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Award,
  Briefcase,
  GitCompare,
  TrendingUp,
  CalendarCheck,
  Building2,
  BarChart3,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  followUpsCount?: number;
}

export const DesktopSidebar: React.FC<SidebarProps> = ({ followUpsCount = 4 }) => {
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Trainees Directory', path: '/trainees', icon: Users },
    { label: 'Skills & Competencies', path: '/skills', icon: Award },
    { label: 'Job Opportunities', path: '/jobs', icon: Briefcase },
    { label: 'Skill Gap Verification', path: '/skill-gaps', icon: GitCompare },
    { label: 'Career Trajectories', path: '/career-path', icon: TrendingUp },
    { label: 'Retention Follow-ups', path: '/follow-ups', icon: CalendarCheck, badge: followUpsCount > 0 ? followUpsCount : undefined, badgeVariant: 'danger' },
    { label: 'Employer Portal & Verification', path: '/employers', icon: Building2 },
    { label: 'Workforce Analytics (10D)', path: '/analytics', icon: BarChart3 },
  ];

  const handleLogout = () => {
    localStorage.removeItem('skilltrace_auth');
    navigate('/login');
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-slate-100 min-h-screen sticky top-0 shrink-0 z-30 shadow-sm">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-slate-100 gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              SKILL<span className="text-brand-600">TRACE</span>
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-brand-50 text-brand-700 rounded-md uppercase border border-brand-200/50">
              PRO
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">Workforce Intelligence OS</span>
        </div>
      </div>

      {/* Primary Navigation List */}
      <div className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5">
        <div className="px-3 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
          Intelligence Suite
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25'
                    : 'text-slate-600 hover:text-brand-600 hover:bg-brand-50/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                        isActive
                          ? 'bg-white text-brand-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* Semantic Search AI Readiness banner */}
        <div className="pt-6 px-1">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-brand-50 to-sky-50 border border-brand-100 text-slate-800">
            <div className="flex items-center gap-2 text-brand-700 font-extrabold text-xs mb-1">
              <Sparkles className="w-4 h-4 text-brand-500 animate-pulse" />
              <span>pgvector Enabled</span>
            </div>
            <p className="text-[12px] text-slate-600 leading-snug">
              Semantic embeddings ready for skill-to-job vector matching.
            </p>
          </div>
        </div>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 font-bold flex items-center justify-center shrink-0">
              DR
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">Director Reynolds</p>
              <p className="text-[10px] text-slate-500 truncate">Workforce Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
