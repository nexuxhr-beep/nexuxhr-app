import React, { useState, useEffect } from 'react';
import { useHR } from '../../context/HRContext';
import { UserRole } from '../../types';
import { Logo } from '../common/Logo';
import {
  ShieldCheck,
  Building2,
  Users,
  UserCheck,
  Bell,
  Clock,
  LogOut,
  User
} from 'lucide-react';

interface HeaderProps {
  onOpenInviteModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenInviteModal, onLogout }) => {
  const { currentUser, activeRole, notices } = useHR();
  const [time, setTime] = useState(new Date());
  const [showNoticesDropdown, setShowNoticesDropdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const roleBadges: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
    superadmin: { label: 'Superadmin', icon: <ShieldCheck className="w-4 h-4" />, color: 'bg-purple-50 text-purple-700 border border-purple-500/30' },
    admin: { label: 'Admin', icon: <Building2 className="w-4 h-4" />, color: 'bg-blue-50 text-blue-700 border border-blue-500/30' },
    hr_manager: { label: 'HR Manager', icon: <Users className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-700 border border-emerald-500/30' },
    team_member: { label: 'Team Member', icon: <UserCheck className="w-4 h-4" />, color: 'bg-amber-50 text-amber-700 border border-amber-500/30' },
  };

  const currentRoleBadge = roleBadges[activeRole];

  return (
    <header id="nexuxhr-app-header" className="sticky top-0 z-30 glass-header text-slate-900 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Slogan */}
        <Logo size="md" />

        {/* Center Search / Clock */}
        <div className="hidden md:flex items-center gap-6 glass-card px-4 py-1.5 rounded-xl border border-slate-900/10">
          <div className="flex items-center gap-2 text-slate-600 font-mono text-xs">
            <Clock className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span className="text-xs text-slate-500">| {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          
          {/* Current Role Badge (read-only — role comes from real sign-in, not a switch) */}
          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${currentRoleBadge.color}`}>
            {currentRoleBadge.icon}
            {currentRoleBadge.label}
          </div>

          {/* Notices Bell */}
          <div className="relative">
            <button
              id="notifications-button"
              onClick={() => setShowNoticesDropdown(!showNoticesDropdown)}
              className="p-2 rounded-xl glass-card text-slate-500 hover:text-slate-900 relative transition-all"
            >
              <Bell className="w-4 h-4" />
              {notices.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {notices.length}
                </span>
              )}
            </button>

            {showNoticesDropdown && (
              <div className="absolute right-0 mt-2 w-80 glass-modal rounded-xl shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-900/10 mb-2">
                  <h4 className="text-xs font-bold text-slate-800">Announcements ({notices.length})</h4>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {notices.slice(0, 4).map(notice => (
                    <div key={notice.id} className="p-2.5 rounded-lg bg-white/60 border border-slate-900/10 text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>{notice.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          notice.priority === 'Urgent' ? 'bg-red-500/20 text-red-700' : 'bg-indigo-500/20 text-indigo-700'
                        }`}>
                          {notice.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{notice.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Invite Team Trigger — hidden for team members, who can't invite */}
          {activeRole !== 'team_member' && (
            <button
              id="invite-team-btn"
              onClick={onOpenInviteModal}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl glass-btn-primary text-white font-medium text-xs shadow-md transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>Invite Team</span>
            </button>
          )}

          {/* Current User Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-900/10">
            {currentUser.photoUrl ? (
              <img
                src={currentUser.photoUrl}
                alt={currentUser.name}
                className="w-9 h-9 rounded-xl object-cover border border-indigo-500/40 shadow-inner"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-500/30 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                {(currentUser.name || '?').trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500 capitalize">{currentUser.designation || currentUser.role.replace('_', ' ')}</div>
            </div>
          </div>

          {/* Sign Out */}
          <button
            id="sign-out-btn"
            onClick={onLogout}
            title="Sign out"
            className="p-2 rounded-xl glass-card text-slate-600 hover:text-red-700 hover:border-red-500/30 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
};
