import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronDown
} from 'lucide-react';
import { Button } from '../common/Button';

interface TopNavProps {
  onOpenMobileMenu: () => void;
  onOpenAddTraineeModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenMobileMenu,
  onOpenAddTraineeModal,
}) => {
  const navigate = useNavigate();
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
      title: 'Devon Harper requires at-risk follow-up',
      time: '15m ago',
      type: 'warning',
      unread: true,
    },
    {
      id: 2,
      title: 'Elena Rostova 90-day verification verified',
      time: '2h ago',
      type: 'success',
      unread: true,
    },
    {
      id: 3,
      title: 'New employer partnership: Vanguard Health',
      time: '1d ago',
      type: 'info',
      unread: false,
    },
  ];

  return (
    <header className="sticky top-0 z-20 h-20 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Open mobile menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trainees, skill clusters, employer partners... (Press Enter)"
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400 font-medium"
          />
        </form>
      </div>

      {/* Right: Actions, Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Action */}
        <Button
          onClick={onOpenAddTraineeModal}
          size="sm"
          className="hidden sm:inline-flex bg-brand-500 hover:bg-brand-600 text-white"
          icon={<Plus className="w-4 h-4" />}
        >
          Add Trainee
        </Button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
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
                  className="text-xs font-bold text-brand-600 hover:text-brand-700"
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
            className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              DR
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight">Director Reynolds</span>
              <span className="text-[10px] font-medium text-slate-400">Admin</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">Director Reynolds</p>
                <p className="text-[11px] text-slate-500 truncate">reynolds@workforce.gov</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/analytics');
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Account & Organization
                </button>
                <button
                  onClick={() => {
                    navigate('/dashboard');
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Platform Settings
                </button>
              </div>
              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={() => {
                    localStorage.removeItem('skilltrace_auth');
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
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
