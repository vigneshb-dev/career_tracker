import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  Plus,
  Menu,
  CheckCircle2,
  AlertTriangle,
  User,
  Settings,
  LogOut,
  ChevronDown,
  FileText,
  Compass,
  Building2,
  UserPlus
} from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';

interface TopNavProps {
  onOpenMobileMenu: () => void;
  onOpenAddTraineeModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenMobileMenu,
  onOpenAddTraineeModal,
}) => {
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();
  const userRole = (role || 'ADMIN').toUpperCase();

  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/trainees?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const notifications = [
    {
      id: 1,
      title: 'Karthik Venkataraman requires at-risk follow-up',
      time: '15m ago',
      type: 'warning',
      unread: true,
    },
    {
      id: 2,
      title: 'Priya Sharma graduated - Outcome verified',
      time: '1h ago',
      type: 'success',
      unread: true,
    },
    {
      id: 3,
      title: 'Vanguard Healthcare Networks India verified 3 trainees',
      time: '3h ago',
      type: 'success',
      unread: false,
    },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-20 bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm font-sans">
      {/* Left: Mobile Menu Trigger & Global Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search competencies, trainees, employers... (Press Enter)"
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400 font-medium"
          />
        </form>
      </div>

      {/* Right: Actions, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Role-Specific Quick Actions */}
        {userRole === 'ADMIN' && (
          <Button
            onClick={onOpenAddTraineeModal}
            size="sm"
            className="hidden sm:inline-flex bg-brand-500 hover:bg-brand-600 text-white font-bold"
            icon={<Plus className="w-4 h-4" />}
          >
            Provision Trainee
          </Button>
        )}

        {userRole === 'TRAINEE' && (
          <Button
            onClick={() => navigate('/my-resume')}
            size="sm"
            className="hidden sm:inline-flex bg-brand-500 hover:bg-brand-600 text-white font-bold"
            icon={<FileText className="w-4 h-4" />}
          >
            My Resume
          </Button>
        )}

        {userRole === 'COACH' && (
          <Button
            onClick={() => navigate('/skills')}
            size="sm"
            className="hidden sm:inline-flex bg-brand-500 hover:bg-brand-600 text-white font-bold"
            icon={<Compass className="w-4 h-4" />}
          >
            Evaluate Skills
          </Button>
        )}

        {userRole === 'EMPLOYER' && (
          <Button
            onClick={() => navigate('/employers')}
            size="sm"
            className="hidden sm:inline-flex bg-brand-500 hover:bg-brand-600 text-white font-bold"
            icon={<Building2 className="w-4 h-4" />}
          >
            Verify Candidates
          </Button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">Notifications</span>
                <span className="text-[11px] font-bold text-brand-600 hover:underline cursor-pointer">
                  Mark all read
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`px-4 py-3 hover:bg-slate-50 flex items-start gap-3 cursor-pointer transition-colors ${
                      item.unread ? 'bg-brand-50/20' : ''
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 leading-snug">{item.title}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 pt-2 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    navigate('/follow-ups');
                    setNotificationsOpen(false);
                  }}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                >
                  View All Operational Tasks
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
              {getInitials(user?.full_name)}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">
                {user?.full_name || 'Workforce User'}
              </span>
              <span className="text-[10px] font-extrabold text-brand-600 uppercase">
                {userRole}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.full_name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-extrabold bg-brand-50 text-brand-700 uppercase border border-brand-200">
                  Role: {userRole}
                </span>
              </div>
              <div className="py-1">
                {userRole === 'TRAINEE' && user?.trainee_id && (
                  <button
                    onClick={() => {
                      navigate(`/trainees/${user.trainee_id}`);
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    My Outcome Passport
                  </button>
                )}
                {userRole === 'TRAINEE' && (
                  <button
                    onClick={() => {
                      navigate('/my-resume');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    Manage Resume
                  </button>
                )}
                {userRole === 'ADMIN' && (
                  <button
                    onClick={() => {
                      navigate('/analytics');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Platform Intelligence
                  </button>
                )}
              </div>
              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
