import React, { useEffect, useState } from 'react';
import { useHR } from '../../context/HRContext';
import { UserRole } from '../../types';
import { Logo } from '../common/Logo';
import { adToBs, formatBsNepali, formatNepaliTime, nepaliWeekday } from '../../lib/nepaliDate';
import {
  Bell,
  Building2,
  CheckCheck,
  Clock,
  LogOut,
  ShieldCheck,
  User,
  UserCheck,
  Users,
} from 'lucide-react';

interface HeaderProps {
  onOpenInviteModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenInviteModal, onLogout }) => {
  const {
    currentUser,
    activeRole,
    notifications,
    unreadNotificationCount,
    setNotificationRead,
    markAllNotificationsRead,
  } = useHR();
  const [time, setTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleNotifications = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening && unreadNotificationCount > 0) {
      try { await markAllNotificationsRead(); } catch { /* dropdown still opens */ }
    }
  };

  const roleBadges: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
    superadmin: { label: 'Superadmin', icon: <ShieldCheck className="h-4 w-4" />, color: 'border-purple-200 bg-purple-50 text-purple-700' },
    admin: { label: 'Admin', icon: <Building2 className="h-4 w-4" />, color: 'border-blue-200 bg-blue-50 text-blue-700' },
    hr_manager: { label: 'HR Manager', icon: <Users className="h-4 w-4" />, color: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    operation_manager: { label: 'Operation Manager', icon: <Users className="h-4 w-4" />, color: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
    accountant: { label: 'Accountant', icon: <Users className="h-4 w-4" />, color: 'border-rose-200 bg-rose-50 text-rose-700' },
    team_member: { label: 'Team Member', icon: <UserCheck className="h-4 w-4" />, color: 'border-amber-200 bg-amber-50 text-amber-700' },
  };

  const currentRoleBadge = roleBadges[activeRole];

  return (
    <header id="nexuxhr-app-header" className="glass-header app-header-modern z-20 text-slate-900">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo size="md" />

        <div className="glass-card hidden items-center gap-3 rounded-xl border border-slate-900/10 px-4 py-1.5 md:flex">
          <Clock className="h-4 w-4 shrink-0 text-indigo-500" />
          <div className="nx-nepali-datetime leading-tight">
            <div className="text-[13px] font-semibold text-slate-800">
              {formatBsNepali(adToBs(time))}
            </div>
            <div className="text-[11px] text-slate-500">
              {nepaliWeekday(time)} &middot; {formatNepaliTime(time)}
            </div>
          </div>
          <div className="ml-1 hidden border-l border-slate-900/10 pl-3 text-[10px] leading-tight text-slate-400 lg:block">
            <div>{time.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`hidden items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold sm:flex ${currentRoleBadge.color}`}>
            {currentRoleBadge.icon}{currentRoleBadge.label}
          </div>

          <div className="relative">
            <button
              id="notifications-button"
              onClick={toggleNotifications}
              className="glass-card relative rounded-xl p-2 text-slate-500 transition hover:text-slate-900"
              aria-label="Open notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-black text-white">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[390px]">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Notifications</h4>
                    <p className="text-[10px] text-slate-500">Opening this panel marks current items as read.</p>
                  </div>
                  <CheckCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="max-h-[420px] overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">No notifications yet.</div>
                  ) : notifications.slice(0, 20).map(notification => (
                    <div key={notification.id} className={`mb-2 rounded-xl border p-3 ${notification.isRead ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-black text-slate-900">{notification.title}</div>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{notification.message}</p>
                          <p className="mt-2 text-[9px] text-slate-400">{notification.createdAt}</p>
                        </div>
                        <button
                          onClick={() => setNotificationRead(notification.id, !notification.isRead)}
                          className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-bold text-slate-600 hover:bg-slate-50"
                        >
                          {notification.isRead ? 'Mark unread' : 'Mark read'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(activeRole === 'admin' || activeRole === 'hr_manager') && (
            <button id="invite-team-btn" onClick={onOpenInviteModal} className="glass-btn-primary hidden items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium text-white shadow-md sm:flex">
              <User className="h-3.5 w-3.5" /> Invite Team
            </button>
          )}

          <div className="flex items-center gap-2 border-l border-slate-900/10 pl-2">
            {currentUser.photoUrl ? (
              <img src={currentUser.photoUrl} alt={currentUser.name} className="h-9 w-9 rounded-xl border border-indigo-500/30 object-cover" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-100 text-sm font-bold text-indigo-700">
                {(currentUser.name || '?').trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden text-left xl:block">
              <div className="max-w-[120px] truncate text-xs font-bold text-slate-800">{currentUser.name}</div>
              <div className="text-[10px] capitalize text-slate-500">{currentUser.designation || currentUser.role.replace('_', ' ')}</div>
            </div>
          </div>

          <button id="sign-out-btn" onClick={onLogout} title="Sign out" className="glass-card rounded-xl p-2 text-slate-600 transition hover:text-red-700">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
