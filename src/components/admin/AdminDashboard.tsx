import React, { useState } from 'react';
import { useHR } from '../../context/HRContext';
import { KanbanTaskBoard } from '../common/KanbanTaskBoard';
import { ReportGeneratorModal } from '../common/ReportGeneratorModal';
import { DocumentUploader } from '../common/DocumentUploader';
import { UserProfile, UserRole } from '../../types';
import {
  Clock,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Users,
  UserPlus,
  FileBadge,
  Megaphone,
  HardDrive,
  Briefcase,
  User,
  Plus,
  Trash2,
  Check,
  X,
  TrendingUp,
  FileText,
  Building2,
  ShieldAlert,
  Send,
  Save,
  UserCheck,
  UserX
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
    addContract,
    createInvitation,
    toggleUserActiveStatus,
    updateCurrentUserProfile
  } = useHR();

  // Modal & Form States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportEmpTarget, setReportEmpTarget] = useState<UserProfile | undefined>();

  // Notice Form State
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newNoticePriority, setNewNoticePriority] = useState<'Normal' | 'Important' | 'Urgent'>('Important');

  // Asset Form State
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState<any>('Laptop');
  const [newAssetSerial, setNewAssetSerial] = useState('');

  // Attendance Entry Form
  const [attEmpId, setAttEmpId] = useState(users[0]?.employeeId || users[0]?.id);
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attStatus, setAttStatus] = useState<any>('Present');
  const [attCheckIn, setAttCheckIn] = useState('09:00:00');
  const [attCheckOut, setAttCheckOut] = useState('17:30:00');

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

  const handleAddNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim()) return;
    addNotice({
      title: newNoticeTitle,
      content: newNoticeContent,
      postedBy: currentUser.id,
      postedByName: `${currentUser.name} (Admin)`,
      priority: newNoticePriority,
      targetRole: 'All'
    });
    setNewNoticeTitle('');
    setNewNoticeContent('');
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim()) return;
    addAsset({
      assetCode: `AST-${Math.floor(100 + Math.random() * 900)}`,
      name: newAssetName,
      category: newAssetCategory,
      status: 'Available',
      purchaseDate: todayStr,
      serialNumber: newAssetSerial || 'SN-GEN-001'
    });
    setNewAssetName('');
    setNewAssetSerial('');
  };

  const handleManualAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find(u => u.employeeId === attEmpId || u.id === attEmpId);
    addAttendanceRecord({
      employeeId: attEmpId,
      employeeName: targetUser ? targetUser.name : 'Employee',
      date: attDate,
      month: attDate.substring(0, 7),
      checkIn: attCheckIn,
      checkOut: attCheckOut,
      status: attStatus,
      workHours: 8.5
    });
    alert('Attendance record added successfully!');
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
              <h2 className="text-2xl font-black text-slate-900 mt-2">Acme Software Solutions Admin Panel</h2>
              <p className="text-sm text-slate-600">Monitored check-ins, leaves, contract compliance, and employee position control</p>
            </div>
            <button
              onClick={() => {
                setReportEmpTarget(undefined);
                setShowReportModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors text-xs shadow-lg flex items-center gap-2 shrink-0"
            >
              <FileBadge className="w-4 h-4" /> Generate Official HR Report
            </button>
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

      {/* 2. MY TASKS & KANBAN TAB */}
      {activeTab === 'tasks' && <KanbanTaskBoard />}

      {/* 3. ATTENDANCE ENTRY (MONTH WISE) TAB */}
      {activeTab === 'attendance_entry' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-indigo-400" /> Month-Wise Attendance Entry & Correction
            </h3>

            <form onSubmit={handleManualAttendance} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-100/60 p-4 rounded-xl border border-slate-200/60 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Employee</label>
                <select
                  value={attEmpId}
                  onChange={e => setAttEmpId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.employeeId || u.id}>
                      {u.name} ({u.employeeId || 'NX-001'})
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
                  type="text"
                  value={attCheckIn}
                  onChange={e => setAttCheckIn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900 font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors"
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

            <form onSubmit={handleAddNotice} className="space-y-3 text-xs bg-slate-100/60 p-4 rounded-xl border border-slate-200/60">
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
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Priority</label>
                  <select
                    value={newNoticePriority}
                    onChange={e => setNewNoticePriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Urgent">Urgent</option>
                  </select>
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

              <div className="flex justify-end">
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors">
                  Publish Notice
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
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-400" /> Register & Assign Assets
            </h3>

            <form onSubmit={handleAddAsset} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-100/60 p-4 rounded-xl border border-slate-200/60 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="MacBook Pro 14 M3"
                  value={newAssetName}
                  onChange={e => setNewAssetName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Category</label>
                <select
                  value={newAssetCategory}
                  onChange={e => setNewAssetCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Access Card">Access Card</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Serial Number</label>
                <input
                  type="text"
                  placeholder="SN-0921"
                  value={newAssetSerial}
                  onChange={e => setNewAssetSerial(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                />
              </div>

              <div className="flex items-end">
                <button type="submit" className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors">
                  Register Asset
                </button>
              </div>
            </form>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Asset Inventory Log</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map(asset => (
                <div key={asset.id} className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-indigo-400 font-bold">{asset.assetCode}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700">
                      {asset.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{asset.name}</h4>
                  <div className="text-slate-500">Assigned To: {asset.assignedToName || 'Unassigned'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. EMPLOYEE DETAILS & ACTIVE/PASSIVE TAB */}
      {activeTab === 'employees' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> Employee Directory & Account Controls
              </h3>
              <p className="text-xs text-slate-500">Manage active vs passive employees and account activation</p>
            </div>
          </div>

          <div className="space-y-4">
            {users.filter(u => u.role !== 'superadmin').map(emp => (
              <div key={emp.id} className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  {emp.photoUrl ? (
                    <img
                      src={emp.photoUrl}
                      alt={emp.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-slate-200 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                      {(emp.name || '?').trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      {emp.name}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        emp.isActive ? 'bg-emerald-500/20 text-emerald-700' : 'bg-red-500/20 text-red-700'
                      }`}>
                        {emp.isActive ? 'Active Employee' : 'Passive / Deactivated'}
                      </span>
                    </div>
                    <div className="text-slate-500 font-mono">
                      {emp.employeeId || 'EMP-000'} | Code: {emp.employeeCode || 'NX-000'} | Role: {emp.role}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleUserActiveStatus(emp.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-md flex items-center gap-1 ${
                      emp.isActive ? 'bg-amber-600 hover:bg-amber-500 text-white transition-colors' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {emp.isActive ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                    <span>{emp.isActive ? 'Deactivate Account' : 'Reactivate Account'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
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
        </div>
      )}

      {/* 9. CONTRACT OVERVIEW TAB */}
      {activeTab === 'contracts' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" /> Employment Contracts Overview
          </h3>
          <div className="space-y-3">
            {contracts.map(cnt => (
              <div key={cnt.id} className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{cnt.employeeName}</div>
                  <div className="text-slate-500 font-mono">{cnt.contractCode} | {cnt.type} | Salary: ${cnt.salaryMonthly}/mo</div>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700">
                  {cnt.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. REPORT GENERATOR TAB */}
      {activeTab === 'reports' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 text-center">
          <FileBadge className="w-12 h-12 text-indigo-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Generate Official HR Documents</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Generate printable contracts, salary increase letters, and performance appraisal certificates for any employee.
          </p>
          <button
            onClick={() => setShowReportModal(true)}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors text-xs shadow-lg"
          >
            Launch Report Generator
          </button>
        </div>
      )}

      {/* 11. MY PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Admin Profile Settings</h3>
          <p className="text-xs text-slate-600">Logged in as {currentUser.name} ({currentUser.email})</p>
        </div>
      )}

      {/* Report Generator Modal */}
      {showReportModal && (
        <ReportGeneratorModal
          onClose={() => setShowReportModal(false)}
          preselectedEmployee={reportEmpTarget}
        />
      )}

    </div>
  );
};
