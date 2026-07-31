import { AttendanceManagementPanel } from '../common/AttendanceManagementPanel';
import { DocumentGeneratorPanel } from '../common/DocumentGeneratorPanel';
import React, { useEffect, useState } from 'react';
import { useHR } from '../../context/HRContext';
import { RequestManagementPanel } from '../common/RequestManagementPanel';
import { EmployeeDirectoryPanel } from '../common/EmployeeDirectoryPanel';
import { AuditLogPanel } from '../common/AuditLogPanel';
import { EmployeeProfileForm } from '../common/EmployeeProfileForm';
import { AddAssetModal } from '../admin/AddAssetModal';
import { AssetDetailModal } from '../admin/AssetDetailModal';
import { AssetRenewalCell } from '../common/AssetRenewalCell';
import { UpcomingBirthdays } from '../common/UpcomingBirthdays';
import { AttendanceInsights } from '../common/AttendanceInsights';
import { UserProfile } from '../../types';
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  HardDrive,
  Megaphone,
  User,
  Users
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


  // Employee Detail Entry State
  const [empName, setEmpName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [dob, setDob] = useState('');
  const [citizenshipPan, setCitizenshipPan] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [docState, setDocState] = useState<any>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Attendance Entry State
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
      employeeId: empCode || undefined,
      employeeCode: empCode,
      designation: designation || undefined,
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

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = attendanceEmployees.find(user => user.id === attEmpId);
    if (!target) {
      alert('Please select an active employee.');
      return;
    }

    try {
      await addAttendanceRecord({
        employeeId: target.id,
        employeeName: target.name,
        date: attDate,
        month: attDate.substring(0, 7),
        checkIn: attCheckIn || undefined,
        checkOut: attCheckOut || undefined,
        status: attStatus
      });
      alert('Attendance saved successfully.');
    } catch (error: any) {
      alert(error?.message || 'Could not save attendance.');
    }
  };

  const [noticeError, setNoticeError] = useState('');
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [viewingAssetId, setViewingAssetId] = useState<string | null>(null);
  /** Urgent notices force a blocking popup on every other user's screen. */
  const publishNotice = async (priority: 'Normal' | 'Urgent') => {
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      setNoticeError('Title and content are both required.');
      return;
    }
    setNoticeError('');
    try {
      await addNotice({
        title: noticeTitle,
        content: noticeContent,
        priority,
      });
      setNoticeTitle('');
      setNoticeContent('');
    } catch (err: any) {
      setNoticeError(err.message || 'Could not post notice.');
    }
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

          {/* Top 5 absent / present for the current Nepali month */}
          <AttendanceInsights />

          {/* Upcoming birthdays */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <UpcomingBirthdays />
          </div>
        </div>
      )}

      {/* 2. MY TASK TAB */}

      {activeTab === 'requests' && <RequestManagementPanel />}

      {/* 3. ATTENDANCE ENTRY (THIS MONTH ONLY) TAB */}
      {activeTab === 'attendance_entry' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-400" /> Attendance Entry (This Month Only: {thisMonthStr})
          </h3>

          <form onSubmit={handleAddAttendance} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-slate-100/60 p-4 rounded-xl border border-slate-200/60 text-xs">
            <div>
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

          {noticeError && <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{noticeError}</div>}
          <form onSubmit={e => { e.preventDefault(); void publishNotice('Normal'); }} className="space-y-3 text-xs bg-slate-100/60 p-4 rounded-xl border border-slate-200/60">
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

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => publishNotice('Normal')} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors">
                Publish Notice
              </button>
              <button type="button" onClick={() => publishNotice('Urgent')} title="Shows a blocking popup on every employee's screen until they acknowledge it" className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Publish as Urgent Notice
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. ASSETS REGISTER TAB */}
      {activeTab === 'assets' && (
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
                {assets.map(a => (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pr-3 font-semibold text-slate-900">{a.assignedToName}</td>
                    <td className="py-2.5 pr-3 capitalize text-slate-600">{a.assetType}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{a.modelName || a.brandModel || a.deviceId || '—'}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{a.issuedDate}</td>
                    <td className="py-2.5 pr-3"><AssetRenewalCell issuedDate={a.issuedDate} returnDate={a.returnDate} renewalIntervalDays={a.renewalIntervalDays} /></td>
                    <td className="py-2.5 pr-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.status === 'active' ? 'bg-emerald-500/20 text-emerald-700'
                        : a.status === 'returned' ? 'bg-slate-400/20 text-slate-600'
                        : 'bg-red-500/20 text-red-700'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <button
                        onClick={() => setViewingAssetId(String(a.id))}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-bold transition-colors"
                      >
                        View More
                      </button>
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
      )}
      {showAddAssetModal && <AddAssetModal onClose={() => setShowAddAssetModal(false)} />}
      {viewingAssetId && <AssetDetailModal assetId={viewingAssetId} onClose={() => setViewingAssetId(null)} />}

      {/* 7. EMPLOYEE PROFILE MANAGEMENT TAB */}
      {activeTab === 'hr_employee_entry' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200">
          <EmployeeDirectoryPanel showAccountControls={false} />
        </div>
      )}

      {/* 8. REPORT DOWNLOAD TAB */}
      {activeTab === 'documents' && <DocumentGeneratorPanel />}

      {activeTab === 'audit_logs' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200"><AuditLogPanel /></div>
      )}

      {/* 9. MY PROFILE TAB */}
      {activeTab === 'attendance_management' && <AttendanceManagementPanel role="hr_manager" />}

      {activeTab === 'profile' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 space-y-5">
          <div className="border-b border-slate-200 pb-4"><h3 className="text-lg font-bold text-slate-900">My HR Profile</h3><p className="text-xs text-slate-500 mt-1">Manage your own synced employee and contact record.</p></div>
          <EmployeeProfileForm />
        </div>
      )}

      {/* Report Modal */}

    </div>
  );
};
