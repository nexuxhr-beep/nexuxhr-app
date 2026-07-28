import React from 'react';
import { useHR } from '../../context/HRContext';
import {
  LayoutDashboard,
  CheckSquare,
  CalendarCheck,
  FileText,
  Megaphone,
  HardDrive,
  User,
  Users,
  Building2,
  Receipt,
  FileSpreadsheet,
  Briefcase,
  ShieldAlert,
  UserPlus,
  HelpCircle,
  FileBadge,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { activeRole, currentUser } = useHR();

  // Define tab navigation lists per role
  const getNavItems = () => {
    switch (activeRole) {
      case 'superadmin':
        return [
          { id: 'orgs', label: 'Organizations & Clients', icon: <Building2 className="w-4 h-4" /> },
          { id: 'subscriptions', label: 'Subscriptions & Billing', icon: <Receipt className="w-4 h-4" /> },
          { id: 'roles_permissions', label: 'Role & Permission Matrix', icon: <ShieldAlert className="w-4 h-4" /> },
          { id: 'audit_logs', label: 'System Audit Logs', icon: <FileSpreadsheet className="w-4 h-4" /> },
        ];

      case 'admin':
        return [
          { id: 'home', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'tasks', label: 'My Tasks & Kanban', icon: <CheckSquare className="w-4 h-4" /> },
          { id: 'attendance_entry', label: 'Attendance Entry', icon: <CalendarCheck className="w-4 h-4" /> },
          { id: 'leave_records', label: 'Leave Review & Records', icon: <FileText className="w-4 h-4" /> },
          { id: 'notices', label: 'Upcoming Notices', icon: <Megaphone className="w-4 h-4" /> },
          { id: 'assets', label: 'Assets Register', icon: <HardDrive className="w-4 h-4" /> },
          { id: 'employees', label: 'Employee Details', icon: <Users className="w-4 h-4" /> },
          { id: 'positions', label: 'Position & Invites', icon: <UserPlus className="w-4 h-4" /> },
          { id: 'contracts', label: 'Contract Overview', icon: <Briefcase className="w-4 h-4" /> },
          { id: 'reports', label: 'Report Generator', icon: <FileBadge className="w-4 h-4" /> },
          { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
        ];

      case 'hr_manager':
        return [
          { id: 'home', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'tasks', label: 'My Tasks & Kanban', icon: <CheckSquare className="w-4 h-4" /> },
          { id: 'attendance_entry', label: 'Attendance (This Month)', icon: <CalendarCheck className="w-4 h-4" /> },
          { id: 'leave_records', label: 'Leave Records', icon: <FileText className="w-4 h-4" /> },
          { id: 'notices', label: 'Entry Upcoming Notices', icon: <Megaphone className="w-4 h-4" /> },
          { id: 'assets', label: 'Assets Register', icon: <HardDrive className="w-4 h-4" /> },
          { id: 'hr_employee_entry', label: 'Entry Employee Details', icon: <Users className="w-4 h-4" /> },
          { id: 'reports', label: 'Report Download', icon: <FileBadge className="w-4 h-4" /> },
          { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
        ];

      case 'team_member':
      default:
        return [
          { id: 'home', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'tasks', label: 'My Tasks & Kanban', icon: <CheckSquare className="w-4 h-4" /> },
          { id: 'my_attendance', label: 'My Attendance', icon: <CalendarCheck className="w-4 h-4" /> },
          { id: 'requests', label: 'Requests & FAQs', icon: <HelpCircle className="w-4 h-4" /> },
          { id: 'notices', label: 'Upcoming Notices', icon: <Megaphone className="w-4 h-4" /> },
          { id: 'assets', label: 'Assets Register', icon: <HardDrive className="w-4 h-4" /> },
          { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside id="nexuxhr-sidebar" className="w-64 glass-sidebar flex flex-col justify-between p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div>
        {/* Role Header Badge */}
        <div className="mb-6 p-3.5 rounded-2xl glass-card border border-slate-900/10">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Current Role</div>
          <div className="text-sm font-extrabold text-indigo-400 capitalize mt-0.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            {activeRole.replace('_', ' ')}
          </div>
          <div className="text-xs text-slate-600 font-medium truncate mt-1">
            {currentUser.companyName || 'NexuxHR Organization'}
          </div>
        </div>

        {/* Nav Items */}
        <nav className="space-y-1.5">
          <div className="px-3 pb-2 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Navigation Modules
          </div>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  isActive
                    ? 'glass-btn-primary text-white font-bold shadow-lg'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Box */}
      <div className="pt-4 border-t border-slate-900/10 text-[11px] text-slate-500">
        <div className="flex items-center justify-between">
          <span>NexuxHR Platform</span>
          <span className="text-emerald-400 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync
          </span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          Firebase Auth & Local Persistence Active
        </p>
      </div>
    </aside>
  );
};
