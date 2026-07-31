import { AttendanceManagementPanel } from '../common/AttendanceManagementPanel';
import React, { useState } from 'react';
import { useHR } from '../../context/HRContext';
import { adToBs, formatBsNepali } from '../../lib/nepaliDate';
import { UpcomingBirthdays } from '../common/UpcomingBirthdays';
import { EmployeeRequestsPanel } from '../common/EmployeeRequestsPanel';
import { EmployeeProfileForm } from '../common/EmployeeProfileForm';
import { AssetDetailModal } from '../admin/AssetDetailModal';
import { AddAssetModal } from '../admin/AddAssetModal';
import {
  BadgeCheck,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  Fingerprint,
  HardDrive,
  Megaphone,
  Plus,
  TrendingUp,
  User
} from 'lucide-react';

interface EmployeeDashboardProps {
  activeTab: string;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ activeTab }) => {
  const {
    currentUser,
    attendanceRecords,
    leaveRequests,
    employeeRequests,
    tasks,
    notices,
    assets,
    salarySlips,
    submitLeaveRequest,
    updateCurrentUserProfile
  } = useHR();

  // Leave Form
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<any>('Casual Leave');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Payslip Modal
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  // Profile Form state
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileDesignation, setProfileDesignation] = useState(currentUser.designation || '');
  const [profileDob, setProfileDob] = useState(currentUser.dob || '');
  const [citizenshipPan, setCitizenshipPan] = useState(currentUser.citizenshipPan || '');
  const [emergencyPhone, setEmergencyPhone] = useState(currentUser.emergencyPhone || '');
  const [guardianPhone, setGuardianPhone] = useState(currentUser.guardianPhone || '');
  const [bankName, setBankName] = useState(currentUser.bankDetails?.bankName || '');
  const [accountNum, setAccountNum] = useState(currentUser.bankDetails?.accountNumber || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Check today's attendance status
  const todayStr = new Date().toISOString().split('T')[0];
  const myTodayAtt = attendanceRecords.find(
    a => (a.employeeId === currentUser.employeeId || a.employeeId === currentUser.id) && a.date === todayStr
  );

  const myMonthRecords = attendanceRecords.filter(
    a => (a.employeeId === currentUser.employeeId || a.employeeId === currentUser.id)
  );

  const totalPresent = myMonthRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const totalAbsent = myMonthRecords.filter(r => r.status === 'Absent').length;

  const [leaveError, setLeaveError] = useState('');
  const [viewingAssetId, setViewingAssetId] = useState<string | null>(null);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveError('');
    try {
      await submitLeaveRequest({
        leaveType,
        startDate: leaveStartDate || todayStr,
        endDate: leaveEndDate || todayStr,
        days: 2,
        reason: leaveReason,
      });
      setShowLeaveModal(false);
      setLeaveReason('');
    } catch (err: any) {
      setLeaveError(err.message || 'Could not submit leave request.');
    }
  };



  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile({
      name: profileName,
      designation: profileDesignation,
      dob: profileDob,
      citizenshipPan,
      emergencyPhone,
      guardianPhone,
      bankDetails: {
        bankName,
        accountNumber: accountNum,
        accountHolder: profileName
      }
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HOME TAB */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          {/* Welcome hero — attendance comes from the biometric device, not this app */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 p-6 shadow-xl">
            <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-indigo-100/50 blur-3xl" />

            <div className="relative flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4 text-center lg:text-left">
                {currentUser.photoUrl ? (
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.name}
                    className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white bg-indigo-600 text-2xl font-black text-white shadow-md">
                    {(currentUser.name || '?').trim().charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="space-y-1.5">
                  <h2 className="text-2xl font-black leading-tight text-slate-900">
                    Welcome back, {(currentUser.name || '').split(' ')[0]}
                  </h2>
                  <p className="text-sm text-slate-600">
                    {currentUser.designation || 'Designation not assigned'}
                    <span className="mx-1.5 text-slate-300">|</span>
                    {currentUser.companyName || 'Company not assigned'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5 lg:justify-start">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white/80 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {currentUser.employeeCode || 'Code not assigned'}
                    </span>
                    <span className="nx-nepali text-[11px] text-slate-500">
                      {formatBsNepali(adToBs(new Date()))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Today's status — read only, sourced from the door device */}
              <div className="w-full shrink-0 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm sm:w-auto">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Today&apos;s Status
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <CheckCircle2 className={`h-5 w-5 ${myTodayAtt ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className="text-lg font-black text-slate-900">
                    {myTodayAtt ? myTodayAtt.status : 'No punch yet'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 border-t border-slate-200 pt-2 font-mono text-[11px] text-slate-500">
                  <span>In: <span className="font-bold text-slate-700">{myTodayAtt?.checkIn || '—'}</span></span>
                  <span>Out: <span className="font-bold text-slate-700">{myTodayAtt?.checkOut || '—'}</span></span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Fingerprint className="h-3 w-3" /> Recorded by the office biometric device
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">My Attendance (This Month)</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{totalPresent} Days Present</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">{totalAbsent} Absences Recorded</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">My Leave Requests</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {employeeRequests.filter(r => r.status === 'Pending').length} Pending
                </div>
                <div className="text-[10px] text-indigo-400 mt-0.5">{employeeRequests.length} total submitted</div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">My Task</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {tasks.filter(t => t.assignedTo === currentUser.employeeId || t.assignedTo === currentUser.id).length} Tasks
                </div>
                <div className="text-[10px] text-amber-400 mt-0.5">Assigned by Admin/HR</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">Assigned Hardware</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {assets.filter(a => String(a.assignedToUserId) === currentUser.id).length} Items
                </div>
                <div className="text-[10px] text-purple-400 mt-0.5">Devices &amp; equipment</div>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <HardDrive className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Upcoming birthdays */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <UpcomingBirthdays />
          </div>

          {/* Upcoming Events & Present Graphs Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Present Monthly Graph Preview */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" /> Monthly Attendance Summary & Hours
                </h3>
                <span className="text-xs text-slate-500 font-mono">{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
              </div>

              <div className="space-y-3 pt-2">
                {myMonthRecords.map(rec => (
                  <div key={rec.id} className="p-3 rounded-xl bg-slate-100/60 border border-slate-200/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                      <div>
                        <div className="font-bold text-slate-800">{rec.date}</div>
                        <div className="text-[10px] text-slate-500">Check In: {rec.checkIn || 'N/A'} | Check Out: {rec.checkOut || 'Active'}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700">
                      {rec.status}{rec.workHours != null ? ` (${rec.workHours} hrs)` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Company Events */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" /> Upcoming Events
              </h3>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-xs text-slate-500">No upcoming events yet.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. MY TASKS (KANBAN) TAB */}

      {/* 3. MY ATTENDANCE TAB */}
      {activeTab === 'my_attendance' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-indigo-400" /> My Attendance Log (This Month)
              </h3>
              <p className="text-xs text-slate-500">Detailed records of check-ins, check-outs, work hours, and status</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 text-xs font-bold">
                Present: {totalPresent} Days
              </span>
              <span className="px-3 py-1 rounded-xl bg-red-500/20 text-red-700 border border-red-500/30 text-xs font-bold">
                Absent: {totalAbsent} Days
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Check In Time</th>
                  <th className="p-3">Check Out Time</th>
                  <th className="p-3">Work Hours</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {myMonthRecords.map(r => (
                  <tr key={r.id} className="hover:bg-slate-100/40 transition-colors">
                    <td className="p-3 font-bold text-slate-800">{r.date}</td>
                    <td className="p-3 font-mono">{r.checkIn || '—'}</td>
                    <td className="p-3 font-mono">{r.checkOut || '—'}</td>
                    <td className="p-3 font-mono">{r.workHours ? `${r.workHours} hrs` : 'Active'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'Present' ? 'bg-emerald-500/20 text-emerald-700' :
                        r.status === 'Late' ? 'bg-amber-500/20 text-amber-700' : 'bg-red-500/20 text-red-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{r.notes || 'Normal Record'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. REQUESTS & FAQS TAB */}
      {activeTab === 'requests' && <EmployeeRequestsPanel />}
      {/* 5. UPCOMING NOTICES TAB */}
      {activeTab === 'notices' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-400" /> Upcoming Company Notices
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices.map(notice => (
              <div key={notice.id} className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{notice.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-700">
                    {notice.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{notice.content}</p>
                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span>Posted by: {notice.postedByName}</span>
                  <span>Date: {notice.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ASSETS REGISTER TAB */}
      {activeTab === 'assets' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-indigo-400" /> My Assets Register
              </h3>
              <p className="mt-1 text-xs text-slate-500">Register the device issued to you. After submission, Admin or HR can review and edit the record.</p>
            </div>
            <button
              onClick={() => setShowAddAssetModal(true)}
              className="glass-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white"
            >
              <Plus className="h-4 w-4" /> Register My Asset
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets
              .filter(a => String(a.assignedToUserId) === currentUser.id)
              .map(asset => (
                <div key={asset.id} className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-indigo-400 font-bold capitalize">{asset.assetType}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      asset.status === 'active' ? 'bg-emerald-500/20 text-emerald-700'
                      : asset.status === 'returned' ? 'bg-slate-400/20 text-slate-600'
                      : 'bg-red-500/20 text-red-700'
                    }`}>
                      {asset.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{asset.modelName || asset.brandModel || 'Device'}</h4>
                  <p className="text-xs text-slate-500">Issued: {asset.issuedDate}</p>
                  <button
                    onClick={() => setViewingAssetId(String(asset.id))}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    View More →
                  </button>
                </div>
              ))}
            {assets.filter(a => String(a.assignedToUserId) === currentUser.id).length === 0 && (
              <p className="text-xs text-slate-500 italic">No assets assigned to you yet.</p>
            )}
          </div>
        </div>
      )}
      {showAddAssetModal && <AddAssetModal onClose={() => setShowAddAssetModal(false)} />}
      {viewingAssetId && <AssetDetailModal assetId={viewingAssetId} onClose={() => setViewingAssetId(null)} />}

      {/* 7. MY PROFILE TAB */}
      {activeTab === 'attendance_management' && <AttendanceManagementPanel role="team_member" />}

      {activeTab === 'profile' && (
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" /> My Employee Profile & Documents
            </h3>
            <p className="text-xs text-slate-500 mt-1">Complete your personal, organisational, bank, government ID, emergency and document records. Admin and HR can review or edit the same synced profile.</p>
          </div>
          <EmployeeProfileForm />
        </div>
      )}

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-modal border border-slate-900/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Submit New Leave Request</h3>
            {leaveError && <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{leaveError}</div>}
            <form onSubmit={handleLeaveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={e => setLeaveType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900"
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Annual Leave">Annual Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={e => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={e => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Reason</label>
                <textarea
                  rows={3}
                  required
                  value={leaveReason}
                  onChange={e => setLeaveReason(e.target.value)}
                  placeholder="Provide reason for leave..."
                  className="w-full px-3 py-2 rounded-xl glass-input text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Slip Viewer Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-indigo-900">Official Payslip Statement</h3>
                <p className="text-xs text-slate-500">Period: {selectedPayslip.month}</p>
              </div>
              <button onClick={() => setSelectedPayslip(null)} className="font-bold text-slate-500">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span>Employee Name:</span><strong>{currentUser.name}</strong></div>
              <div className="flex justify-between"><span>Employee ID:</span><strong>{currentUser.employeeId || currentUser.id}</strong></div>
              <div className="flex justify-between"><span>Basic Salary:</span><span>${selectedPayslip.basicSalary.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Allowances:</span><span>+${selectedPayslip.allowances.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Deductions:</span><span>-${selectedPayslip.deductions.toLocaleString()}</span></div>
              <div className="flex justify-between pt-2 border-t font-bold text-sm text-emerald-700">
                <span>Net Pay Amount:</span><span>${selectedPayslip.netPay.toLocaleString()} USD</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs">
                Print Payslip
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
