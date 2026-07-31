import { AttendanceManagementPanel } from '../common/AttendanceManagementPanel';
import { AttendancePolicyPanel } from '../common/AttendancePolicyPanel';
import { DocumentGeneratorPanel } from '../common/DocumentGeneratorPanel';
import React, { useEffect, useState } from 'react';
import { useHR } from '../../context/HRContext';
import { RequestManagementPanel } from '../common/RequestManagementPanel';
import { EmployeeDirectoryPanel } from '../common/EmployeeDirectoryPanel';
import { ContractOverviewPanel } from '../common/ContractOverviewPanel';
import { AuditLogPanel } from '../common/AuditLogPanel';
import { EmployeeProfileForm } from '../common/EmployeeProfileForm';
import { AddAssetModal } from './AddAssetModal';
import { AssetDetailModal } from './AssetDetailModal';
import { AssetRenewalCell } from '../common/AssetRenewalCell';
import { UpcomingBirthdays } from '../common/UpcomingBirthdays';
import { AttendanceInsights } from '../common/AttendanceInsights';
import { OfficeExpensesPanel } from '../common/OfficeExpensesPanel';
import { UserProfile, UserRole } from '../../types';
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  HardDrive,
  Megaphone,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  Users,
  X
} from 'lucide-react';

interface AdminDashboardProps {
  activeTab: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab }) => {
  const {
    currentUser,
    users,
    attendanceRecords,
    leaveRequests,
    notices,
    assets,
    contracts,
    addAttendanceRecord,
    reviewLeaveRequest,
    addNotice,
    deleteNotice,
    addAsset,
    updateAssetStatus,
    createInvitation,
    invitations,
    deleteInvitationAction,
    toggleUserActiveStatus,
    updateCurrentUserProfile
  } = useHR();

  // Modal & Form States

  // Notice Form State
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [newNoticeContent, setNewNoticeContent] = useState('');


  // Asset Form State
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [viewingAssetId, setViewingAssetId] = useState<string | null>(null);

  // Attendance Entry Form
  const [attEmpId, setAttEmpId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attStatus, setAttStatus] = useState<any>('Present');
  const [attCheckIn, setAttCheckIn] = useState('');
  const [attCheckOut, setAttCheckOut] = useState('');

  const attendanceEmployees = users.filter(user => user.role !== 'superadmin' && user.isActive);

  useEffect(() => {
    if (!attEmpId && attendanceEmployees.length > 0) {
      setAttEmpId(attendanceEmployees[0].id);
    }
  }, [attEmpId, attendanceEmployees]);

  // Leave Review Comment
  const [reviewComment, setReviewComment] = useState('');

  // Invitation Generator State
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState<UserRole>('team_member');
  const [generatedLinkInfo, setGeneratedLinkInfo] = useState<string | null>(null);

  // Stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckIns = attendanceRecords.filter(a => a.date === todayStr && (a.status === 'Present' || a.status === 'Late'));
  const todayCheckOuts = attendanceRecords.filter(a => a.date === todayStr && a.checkOut);
  const activeEmployees = users.filter(u => u.isActive && u.role !== 'superadmin');
  const passiveEmployees = users.filter(u => !u.isActive && u.role !== 'superadmin');
  const onLeaveToday = leaveRequests.filter(l => l.status === 'Approved' && todayStr >= l.startDate && todayStr <= l.endDate);
  const presentRatePct = activeEmployees.length > 0 ? Math.round((todayCheckIns.length / activeEmployees.length) * 100) : 0;
  const onLeaveRatePct = activeEmployees.length > 0 ? Math.round((onLeaveToday.length / activeEmployees.length) * 100) : 0;

  const [noticeError, setNoticeError] = useState('');
  /** Urgent notices force a blocking popup on every other user's screen. */
  const publishNotice = async (priority: 'Normal' | 'Urgent') => {
    if (!newNoticeTitle.trim() || !newNoticeContent.trim()) {
      setNoticeError('Title and content are both required.');
      return;
    }
    setNoticeError('');
    try {
      await addNotice({
        title: newNoticeTitle,
        content: newNoticeContent,
        priority,
      });
      setNewNoticeTitle('');
      setNewNoticeContent('');
    } catch (err: any) {
      setNoticeError(err.message || 'Could not post notice.');
    }
  };

  const handleManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = attendanceEmployees.find(user => user.id === attEmpId);
    if (!targetUser) {
      alert('Please select an active employee.');
      return;
    }

    try {
      await addAttendanceRecord({
        employeeId: targetUser.id,
        employeeName: targetUser.name,
        date: attDate,
        month: attDate.substring(0, 7),
        checkIn: attCheckIn || undefined,
        checkOut: attCheckOut || undefined,
        status: attStatus
      });
      alert('Attendance record saved successfully.');
    } catch (error: any) {
      alert(error?.message || 'Could not save attendance.');
    }
  };

  const handleCreatePositionInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invEmail.trim()) return;
    try {
      const inv = await createInvitation(invEmail, invRole);
      setGeneratedLinkInfo(`Invitation emailed to ${invEmail}! Auto EmpID: ${inv.employeeId} | Code: ${inv.code}`);
      setInvEmail('');
    } catch (err: any) {
      setGeneratedLinkInfo(err.message || 'Could not send the invitation.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HOME DASHBOARD */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 via-white to-blue-50 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-700 border border-blue-500/30">
                Admin Operations Console
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">{currentUser.companyName || 'Company'} Admin Panel</h2>
              <p className="text-sm text-slate-600">Biometric attendance, leaves, contract compliance, and employee position control</p>
            </div>
          </div>

          {/* Key Today Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">Today Check-Ins</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">{todayCheckIns.length} Checked In</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Active Employees</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">Today Check-Outs</div>
                <div className="text-2xl font-black text-blue-400 mt-1">{todayCheckOuts.length} Completed</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Logged hours</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">Active Workforce</div>
                <div className="text-2xl font-black text-indigo-400 mt-1">{activeEmployees.length} Active</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{passiveEmployees.length} Deactivated</div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">Pending Leave Reviews</div>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {leaveRequests.filter(l => l.status === 'Pending').length} Pending
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Requires Approval</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Top 5 absent / present for the current Nepali month */}
          <AttendanceInsights />

          {/* Upcoming birthdays */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <UpcomingBirthdays />
          </div>

          {/* Today's Check-ins Feed & Absence Graph */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Today's Live Attendance Feed
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {attendanceRecords.filter(a => a.date === todayStr).length === 0 ? (
                  <p className="text-slate-500 italic text-center py-6 text-xs">No check-ins recorded yet today.</p>
                ) : (
                  attendanceRecords.filter(a => a.date === todayStr).map(att => (
                  <div key={att.id} className="p-3 rounded-xl bg-slate-100/60 border border-slate-200/60 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{att.employeeName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">In: {att.checkIn || '—'} | Out: {att.checkOut || 'Active'}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      att.status === 'Present' ? 'bg-emerald-500/20 text-emerald-700' : 'bg-red-500/20 text-red-700'
                    }`}>
                      {att.status}
                    </span>
                  </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" /> Attendance & Leave Distribution
              </h3>
              <div className="p-4 rounded-xl bg-slate-100/40 border border-slate-200/60 space-y-3 text-xs">
                {activeEmployees.length === 0 ? (
                  <p className="text-slate-500 italic text-center py-2">No active employees yet — invite your team to see live stats here.</p>
                ) : (
                  <>
                    <div className="flex justify-between font-bold text-slate-600">
                      <span>Present Rate Today</span>
                      <span className="text-emerald-600">{presentRatePct}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${presentRatePct}%` }}></div>
                    </div>

                    <div className="flex justify-between font-bold text-slate-600 pt-2">
                      <span>On Leave / Approved Absence</span>
                      <span className="text-amber-600">{onLeaveRatePct}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${onLeaveRatePct}%` }}></div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MY TASK TAB */}

      {activeTab === 'requests' && <RequestManagementPanel />}

      {/* 3. ATTENDANCE ENTRY (MONTH WISE) TAB */}
      {activeTab === 'attendance_entry' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-indigo-400" /> Month-Wise Attendance Entry & Correction
            </h3>

            <form onSubmit={handleManualAttendance} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 bg-slate-100/60 p-4 rounded-xl border border-slate-200/60 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Employee</label>
                <select
                  value={attEmpId}
                  onChange={e => setAttEmpId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                >
                  <option value="" disabled>Select employee</option>
                  {attendanceEmployees.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.employeeCode || user.employeeId || `#${user.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Date</label>
                <input
                  type="date"
                  value={attDate}
                  onChange={e => setAttDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Status</label>
                <select
                  value={attStatus}
                  onChange={e => setAttStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Check In</label>
                <input
                  type="time"
                  value={attCheckIn}
                  onChange={e => setAttCheckIn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Check Out</label>
                <input
                  type="time"
                  value={attCheckOut}
                  onChange={e => setAttCheckOut(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900 font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!attEmpId || !attDate}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Month-Wise Attendance Logs</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">In / Out</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {attendanceRecords.map(a => (
                    <tr key={a.id} className="hover:bg-slate-100/40 transition-colors">
                      <td className="p-3 font-bold text-slate-800">{a.employeeName}</td>
                      <td className="p-3">{a.date}</td>
                      <td className="p-3 font-mono text-[11px]">{a.checkIn || '—'} / {a.checkOut || '—'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-700">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. LEAVE RECORD & REVIEW TAB */}
      {activeTab === 'leave_records' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> Employee Leave Review & Record Log
              </h3>
              <p className="text-xs text-slate-500">Review pending leave requests, approve or reject with comments</p>
            </div>
          </div>

          <div className="space-y-4">
            {leaveRequests.map(req => (
              <div key={req.id} className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{req.employeeName}</span>
                    <span className="text-[11px] text-slate-500">({req.designation})</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      req.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-700' :
                      req.status === 'Pending' ? 'bg-amber-500/20 text-amber-700' : 'bg-red-500/20 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    <strong>{req.leaveType}</strong> ({req.days} days): {req.startDate} to {req.endDate}
                  </p>
                  <p className="text-slate-500 italic">" Reason: {req.reason} "</p>
                  {req.reviewComment && (
                    <div className="text-[10px] text-indigo-700">HR Comment: {req.reviewComment}</div>
                  )}
                </div>

                {req.status === 'Pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => reviewLeaveRequest(req.id, 'Approved', 'Approved by Admin')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors flex items-center gap-1 shadow-md"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => reviewLeaveRequest(req.id, 'Rejected', 'Rejected by Admin due to team schedule')}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors flex items-center gap-1 shadow-md"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. UPCOMING NOTICES ENTRY TAB */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-indigo-400" /> Broadcast Company Notice
            </h3>

            {noticeError && <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{noticeError}</div>}
            <form onSubmit={e => { e.preventDefault(); void publishNotice('Normal'); }} className="space-y-3 text-xs bg-slate-100/60 p-4 rounded-xl border border-slate-200/60">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">Notice Title *</label>
                  <input
                    type="text"
                    required
                    value={newNoticeTitle}
                    onChange={e => setNewNoticeTitle(e.target.value)}
                    placeholder="e.g. Mandatory Health Policy Update"
                    className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                  />
                </div>

              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Notice Content *</label>
                <textarea
                  rows={3}
                  required
                  value={newNoticeContent}
                  onChange={e => setNewNoticeContent(e.target.value)}
                  placeholder="Detailed announcement text..."
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => publishNotice('Normal')} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors">
                  Publish Notice
                </button>
                <button type="button" onClick={() => publishNotice('Urgent')} title="Shows a blocking popup on every employee's screen until they acknowledge it" className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Publish as Urgent Notice
                </button>
              </div>
            </form>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
            <h4 className="text-sm font-bold text-slate-800">Active Company Notices</h4>
            <div className="space-y-3">
              {notices.map(n => (
                <div key={n.id} className="p-3.5 rounded-xl bg-slate-100/60 border border-slate-200/60 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{n.title}</div>
                    <p className="text-slate-500 mt-0.5">{n.content}</p>
                  </div>
                  <button onClick={() => deleteNotice(n.id)} className="text-slate-500 hover:text-red-400 p-2 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. ASSETS REGISTER TAB */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-indigo-400" /> Assets Register
              </h3>
              <button
                onClick={() => setShowAddAssetModal(true)}
                className="px-4 py-2 rounded-xl glass-btn-primary text-white font-bold text-xs shadow-md"
              >
                + Add Asset
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2 pr-3 font-semibold">Employee</th>
                    <th className="py-2 pr-3 font-semibold">Type</th>
                    <th className="py-2 pr-3 font-semibold">Model / Device ID</th>
                    <th className="py-2 pr-3 font-semibold">Issued Date</th>
                    <th className="py-2 pr-3 font-semibold">Renewal</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2 pr-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => (
                    <tr key={asset.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">{asset.assignedToName}</td>
                      <td className="py-2.5 pr-3 capitalize text-slate-600">{asset.assetType}</td>
                      <td className="py-2.5 pr-3 text-slate-600">{asset.modelName || asset.brandModel || asset.deviceId || '—'}</td>
                      <td className="py-2.5 pr-3 text-slate-600">{asset.issuedDate}</td>
                      <td className="py-2.5 pr-3"><AssetRenewalCell issuedDate={asset.issuedDate} returnDate={asset.returnDate} renewalIntervalDays={asset.renewalIntervalDays} /></td>
                      <td className="py-2.5 pr-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          asset.status === 'active' ? 'bg-emerald-500/20 text-emerald-700'
                          : asset.status === 'returned' ? 'bg-slate-400/20 text-slate-600'
                          : 'bg-red-500/20 text-red-700'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingAssetId(String(asset.id))}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-bold transition-colors"
                          >
                            View More
                          </button>
                          {asset.status === 'active' && (
                            <button
                              onClick={() => updateAssetStatus(String(asset.id), 'returned')}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 font-bold transition-colors"
                            >
                              Mark Returned
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {assets.length === 0 && (
                    <tr><td colSpan={7} className="py-6 text-center text-slate-400 italic">No assets registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAddAssetModal && <AddAssetModal onClose={() => setShowAddAssetModal(false)} />}
      {viewingAssetId && <AssetDetailModal assetId={viewingAssetId} onClose={() => setViewingAssetId(null)} />}

      {/* 7. EMPLOYEE DETAILS & ACTIVE/PASSIVE TAB */}
      {activeTab === 'employees' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200">
          <EmployeeDirectoryPanel showAccountControls />
        </div>
      )}

      {/* 8. POSITION MANAGEMENT & INVITATIONS TAB */}
      {activeTab === 'positions' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" /> Position Management & Invitation Links
              </h3>
              <p className="text-xs text-slate-500">Generate invitation links for Employee or HR positions with auto-assigned Employee IDs</p>
            </div>
          </div>

          <form onSubmit={handleCreatePositionInvite} className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target Email *</label>
                <input
                  type="email"
                  required
                  placeholder="candidate@company.com"
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Position Role</label>
                <select
                  value={invRole}
                  onChange={e => setInvRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                >
                  <option value="team_member">Team Member (Employee Link)</option>
                  <option value="hr_manager">HR Manager (HR Link)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors">
              Generate Invitation Link
            </button>
          </form>

          {generatedLinkInfo && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-500/40 text-emerald-700 font-mono text-xs">
              {generatedLinkInfo}
            </div>
          )}

          <div className="pt-2">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Sent Invitations ({invitations.length})</h4>
            <div className="space-y-2">
              {invitations.length === 0 && (
                <p className="text-xs text-slate-500 italic">No invitations sent yet.</p>
              )}
              {invitations.map(inv => (
                <div key={inv.id} className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{inv.email}</div>
                    <div className="text-slate-500 font-mono mt-0.5">
                      Role: {inv.role === 'hr_manager' ? 'HR Manager' : 'Team Member'} · Sent: {inv.createdAt}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inv.status === 'Accepted' ? 'bg-emerald-500/20 text-emerald-700'
                      : inv.status === 'Expired' ? 'bg-slate-400/20 text-slate-600'
                      : 'bg-amber-500/20 text-amber-700'
                    }`}>
                      {inv.status}
                    </span>
                    {inv.status !== 'Accepted' && (
                      <button
                        type="button"
                        onClick={async (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!window.confirm(`Delete the pending invitation for ${inv.email}?`)) return;
                          await deleteInvitationAction(inv.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-bold transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              To re-send an invitation to the same email, delete the old one here, then generate a new link above.
            </p>
          </div>
        </div>
      )}

      {/* 9. CONTRACT OVERVIEW TAB */}
      {activeTab === 'contracts' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200">
          <ContractOverviewPanel />
        </div>
      )}

      {/* 10. REPORT GENERATOR TAB */}
      {activeTab === 'documents' && <DocumentGeneratorPanel />}

      {activeTab === 'audit_logs' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200"><AuditLogPanel /></div>
      )}

      {/* 11. MY PROFILE TAB */}
      {activeTab === 'attendance_management' && <AttendanceManagementPanel role="admin" />}
      {activeTab === 'attendance_settings' && <AttendancePolicyPanel />}
      {activeTab === 'office_expenses' && <OfficeExpensesPanel canEdit />}

      {activeTab === 'profile' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 space-y-5">
          <div className="border-b border-slate-200 pb-4"><h3 className="text-lg font-bold text-slate-900">My Admin Profile</h3><p className="text-xs text-slate-500 mt-1">Manage your own synced employee and contact record.</p></div>
          <EmployeeProfileForm />
        </div>
      )}

    </div>
  );
};
