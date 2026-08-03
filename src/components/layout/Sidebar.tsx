import React from 'react';
import { useHR } from '../../context/HRContext';
import {
  LayoutDashboard,
  CalendarCheck,
  Settings,
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
  CalendarOff,
  FileSignature,
  Wallet,
  Sparkles,
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
          { id: 'all_users', label: 'All Users', icon: <Users className="w-4 h-4" /> },
          { id: 'audit_logs', label: 'System Audit Logs', icon: <FileSpreadsheet className="w-4 h-4" /> },
        ];

      case 'admin':
        return [
          { id: 'home', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'attendance_management', label: 'Attendance Management', icon: <CalendarCheck className="w-4 h-4" /> },
          { id: 'attendance_settings', label: 'Attendance Settings', icon: <Settings className="w-4 h-4" /> },
          { id: 'office_expenses', label: 'Office Expenses', icon: <Wallet className="w-4 h-4" /> },
          { id: 'requests', label: 'Employee Requests', icon: <CalendarOff className="w-4 h-4" /> },
          { id: 'notices', label: 'Upcoming Notices', icon: <Megaphone className="w-4 h-4" /> },
          { id: 'assets', label: 'Assets Register', icon: <HardDrive className="w-4 h-4" /> },
          { id: 'employees', label: 'Employee Details', icon: <Users className="w-4 h-4" /> },
          { id: 'positions', label: 'Position & Invites', icon: <UserPlus className="w-4 h-4" /> },
          { id: 'contracts', label: 'Contract Overview', icon: <Briefcase className="w-4 h-4" /> },
          { id: 'documents', label: 'HR Documents', icon: <FileSignature className="w-4 h-4" /> },
          { id: 'audit_logs', label: 'Audit Logs', icon: <FileSpreadsheet className="w-4 h-4" /> },
          { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
        ];

      case 'hr_manager':
        return [
          { id: 'home', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'attendance_management', label: 'Attendance Management', icon: <CalendarCheck className="w-4 h-4" /> },
          { id: 'requests', label: 'Employee Requests', icon: <CalendarOff className="w-4 h-4" /> },
          { id: 'notices', label: 'Entry Upcoming Notices', icon: <Megaphone className="w-4 h-4" /> },
          { id: 'assets', label: 'Assets Register', icon: <HardDrive className="w-4 h-4" /> },
          { id: 'hr_employee_entry', label: 'Employee Profiles', icon: <Users className="w-4 h-4" /> },
          { id: 'documents', label: 'HR Documents', icon: <FileSignature className="w-4 h-4" /> },
          { id: 'audit_logs', label: 'Audit Logs', icon: <FileSpreadsheet className="w-4 h-4" /> },
          { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
        ];

      // Operation manager: assets register + office expenses only, as specified.
      case 'operation_manager':
        return [
          { id: 'home', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'assets', label: 'Assets Register', icon: <HardDrive className="w-4 h-4" /> },
          { id: 'office_expenses', label: 'Office Expenses', icon: <Wallet className="w-4 h-4" /> },
          { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
        ];

      // Accountant: menu kept minimal until the scope is confirmed.
      case 'accountant':
        return [
          { id: 'home', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'office_expenses', label: 'Office Expenses', icon: <Wallet className="w-4 h-4" /> },
          { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
        ];

      case 'team_member':
      default:
        return [
          { id: 'home', label: 'Home Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
          { id: 'attendance_management', label: 'My Attendance', icon: <CalendarCheck className="w-4 h-4" /> },
          { id: 'requests', label: 'Leave Request', icon: <CalendarOff className="w-4 h-4" /> },
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
            {activeRole.replace(/_/g, ' ')}
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
        <span>NexuxHR Platform</span>
      </div>
    </aside>
  );
};
