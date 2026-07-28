import React, { useState } from 'react';
import { useHR } from '../../context/HRContext';
import { KanbanTaskBoard } from '../common/KanbanTaskBoard';
import { ReportGeneratorModal } from '../common/ReportGeneratorModal';
import { DocumentUploader } from '../common/DocumentUploader';
import { UserProfile } from '../../types';
import {
  Clock,
  CalendarCheck,
  CheckCircle2,
  Users,
  FileBadge,
  Megaphone,
  HardDrive,
  User,
  Plus,
  Trash2,
  FileText,
  Save,
  Building2,
  UserPlus
} from 'lucide-react';

interface HRManagerDashboardProps {
  activeTab: string;
}

export const HRManagerDashboard: React.FC<HRManagerDashboardProps> = ({ activeTab }) => {
  const {
    currentUser,
    users,
    attendanceRecords,
    leaveRequests,
    notices,
    assets,
    addAttendanceRecord,
    addNotice,
    deleteNotice,
    addAsset,
    addOrUpdateEmployee,
    updateCurrentUserProfile
  } = useHR();

  const [showReportModal, setShowReportModal] = useState(false);

  // Employee Detail Entry State
  const [empName, setEmpName] = useState('');
  const [empCode, setEmpCode] = useState('NX-009');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [dob, setDob] = useState('1997-08-12');
  const [citizenshipPan, setCitizenshipPan] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [docState, setDocState] = useState<any>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Attendance Entry State
  const [attEmpId, setAttEmpId] = useState(users[0]?.employeeId || users[0]?.id);
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attStatus, setAttStatus] = useState<any>('Present');

  // Notice Form State
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);
  const todayCheckIns = attendanceRecords.filter(a => a.date === todayStr && (a.status === 'Present' || a.status === 'Late'));
  const todayCheckOuts = attendanceRecords.filter(a => a.date === todayStr && a.checkOut);

  const handleSaveEmployeeDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;

    const newEmp: UserProfile = {
      id: `usr-${Date.now()}`,
      email: `${empName.toLowerCase().replace(/\s+/g, '.')}@nexuxhr.com`,
      name: empName,
      role: 'team_member',
      employeeId: `EMP-2026-00${users.length + 1}`,
      employeeCode: empCode,
      designation: designation || 'Operations Associate',
      department,
      dob,
      citizenshipPan,
      emergencyPhone,
      guardianPhone,
      isActive: true,
      createdAt: todayStr,
      documents: docState
    };

    addOrUpdateEmployee(newEmp);
    setSavedSuccess(true);
    setEmpName('');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const target = users.find(u => u.employeeId === attEmpId || u.id === attEmpId);
    addAttendanceRecord({
      employeeId: attEmpId,
      employeeName: target ? target.name : 'Employee',
      date: attDate,
      month: thisMonthStr,
      checkIn: '09:00:00',
      checkOut: '17:30:00',
      status: attStatus,
      workHours: 8.5
    });
    alert('Attendance entered for this month!');
  };

  const handleAddNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim()) return;
    addNotice({
      title: noticeTitle,
      content: noticeContent,
      postedBy: currentUser.id,
      postedByName: `${currentUser.name} (HR Manager)`,
      priority: 'Important',
      targetRole: 'All'
    });
    setNoticeTitle('');
    setNoticeContent('');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HOME DASHBOARD */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
                HR Manager Control Console
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">Human Resources Operations</h2>
              <p className="text-sm text-slate-600">Employee onboarding, attendance logs, verification documents, and appraisals</p>
            </div>
            <button
              onClick={() => setShowReportModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors text-xs shadow-lg flex items-center gap-2"
            >
              <FileBadge className="w-4 h-4" /> Download HR Reports
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">Today Check-Ins</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">{todayCheckIns.length} Checked In</div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">Today Check-Outs</div>
                <div className="text-2xl font-black text-blue-400 mt-1">{todayCheckOuts.length} Completed</div>
              </div>
              <Clock className="w-6 h-6 text-blue-400" />
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">Registered Employees</div>
                <div className="text-2xl font-black text-indigo-400 mt-1">{users.length} Staff</div>
              </div>
              <Users className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
        </div>
      )}

      {/* 2. MY TASKS & KANBAN TAB */}
      {activeTab === 'tasks' && <KanbanTaskBoard />}

      {/* 3. ATTENDANCE ENTRY (THIS MONTH ONLY) TAB */}
      {activeTab === 'attendance_entry' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-400" /> Attendance Entry (This Month Only: {thisMonthStr})
          </h3>

          <form onSubmit={handleAddAttendance} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-100/60 p-4 rounded-xl border border-slate-200/60 text-xs">
            <div>
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
              <label className="block text-slate-600 font-semibold mb-1">Date (This Month)</label>
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
              </select>
            </div>

            <div className="flex items-end">
              <button type="submit" className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors">
                Record Monthly Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. LEAVE RECORDS TAB */}
      {activeTab === 'leave_records' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" /> Company Leave Records Log
          </h3>
          <div className="space-y-3">
            {leaveRequests.map(l => (
              <div key={l.id} className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{l.employeeName} ({l.leaveType})</div>
                  <div className="text-[11px] text-slate-500">{l.startDate} to {l.endDate} — Reason: {l.reason}</div>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-700">
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ENTRY UPCOMING NOTICES TAB */}
      {activeTab === 'notices' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-400" /> Entry Upcoming Company Notice
          </h3>

          <form onSubmit={handleAddNotice} className="space-y-3 text-xs bg-slate-100/60 p-4 rounded-xl border border-slate-200/60">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Notice Title *</label>
              <input
                type="text"
                required
                value={noticeTitle}
                onChange={e => setNoticeTitle(e.target.value)}
                placeholder="e.g. Employee Wellness Program"
                className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Notice Description</label>
              <textarea
                rows={3}
                required
                value={noticeContent}
                onChange={e => setNoticeContent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
              />
            </div>

            <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold">
              Broadcast Notice
            </button>
          </form>
        </div>
      )}

      {/* 6. ASSETS REGISTER TAB */}
      {activeTab === 'assets' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-400" /> Assets Register Log
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assets.map(a => (
              <div key={a.id} className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 space-y-1 text-xs">
                <div className="font-mono text-indigo-400 font-bold">{a.assetCode}</div>
                <div className="font-bold text-slate-900 text-sm">{a.name}</div>
                <div className="text-slate-500">Status: {a.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. ENTRY EMPLOYEE DETAILS TAB (SPECIALIZED PHOTO & DOC UPLOAD) */}
      {activeTab === 'hr_employee_entry' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" /> Entry Employee Details & Document Verification
              </h3>
              <p className="text-xs text-slate-500">
                Register employee details with Photo, Academic photo, Citizenship photo, and PAN/NID photos
              </p>
            </div>
            {savedSuccess && (
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-700 text-xs font-bold border border-emerald-500/30">
                ✓ Employee Recorded!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveEmployeeDetails} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Employee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suman Pokhrel"
                  value={empName}
                  onChange={e => setEmpName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Employee Code</label>
                <input
                  type="text"
                  value={empCode}
                  onChange={e => setEmpCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="HR Specialist"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Citizenship & PAN</label>
                <input
                  type="text"
                  value={citizenshipPan}
                  onChange={e => setCitizenshipPan(e.target.value)}
                  placeholder="PAN-98124"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Emergency Contact Phone</label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={e => setEmergencyPhone(e.target.value)}
                  placeholder="+1 555-0199"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>
            </div>

            {/* Specialized Document Uploader */}
            <DocumentUploader
              documents={docState}
              onChange={docs => setDocState(docs)}
            />

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors text-xs shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Employee Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. REPORT DOWNLOAD TAB */}
      {activeTab === 'reports' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center space-y-4">
          <FileBadge className="w-12 h-12 text-indigo-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Generate Official HR Documents & Reports</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Generate employment contracts, salary increase letters, and performance reports with printable format.
          </p>
          <button
            onClick={() => setShowReportModal(true)}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors text-xs shadow-lg"
          >
            Open Report Generator
          </button>
        </div>
      )}

      {/* 9. MY PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900">HR Manager Profile</h3>
          <p className="text-xs text-slate-600">Logged in as {currentUser.name} ({currentUser.email})</p>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && <ReportGeneratorModal onClose={() => setShowReportModal(false)} />}

    </div>
  );
};
