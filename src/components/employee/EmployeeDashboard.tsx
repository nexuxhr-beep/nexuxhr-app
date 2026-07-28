import React, { useState } from 'react';
import { useHR } from '../../context/HRContext';
import { KanbanTaskBoard } from '../common/KanbanTaskBoard';
import { DocumentUploader } from '../common/DocumentUploader';
import {
  Clock,
  LogIn,
  LogOut,
  CalendarCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Megaphone,
  HardDrive,
  User,
  HelpCircle,
  DollarSign,
  Plus,
  TrendingUp,
  Download,
  Building2,
  Save,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface EmployeeDashboardProps {
  activeTab: string;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ activeTab }) => {
  const {
    currentUser,
    attendanceRecords,
    leaveRequests,
    tasks,
    notices,
    assets,
    salarySlips,
    faqs,
    checkInCurrentEmployee,
    checkOutCurrentEmployee,
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

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitLeaveRequest({
      employeeId: currentUser.employeeId || currentUser.id,
      employeeName: currentUser.name,
      designation: currentUser.designation || 'Team Member',
      leaveType,
      startDate: leaveStartDate || todayStr,
      endDate: leaveEndDate || todayStr,
      days: 2,
      reason: leaveReason,
    });
    setShowLeaveModal(false);
    setLeaveReason('');
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
          {/* Welcome & Time Check In/Out Hero Widget */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-indigo-50 border border-slate-200 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-700 border border-indigo-500/30">
                Employee Code: {currentUser.employeeCode || 'NX-003'} | ID: {currentUser.employeeId || 'EMP-2026-003'}
              </span>
              <h2 className="text-2xl font-black text-slate-900">Welcome Back, {currentUser.name}!</h2>
              <p className="text-sm text-slate-600">
                {currentUser.designation || 'Senior Team Member'} — {currentUser.companyName || 'Acme Software Solutions'}
              </p>
            </div>

            {/* Check in / Check out Action Box */}
            <div className="bg-slate-100/90 border border-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-lg shrink-0">
              <div className="text-center pr-4 border-r border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">Today's Status</div>
                <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {myTodayAtt ? myTodayAtt.status : 'Not Checked In'}
                </div>
                {myTodayAtt?.checkIn && (
                  <div className="text-[10px] text-slate-500 mt-0.5">In: {myTodayAtt.checkIn}</div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!myTodayAtt?.checkIn ? (
                  <button
                    onClick={() => checkInCurrentEmployee('Checked in via Dashboard')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors text-xs shadow-md flex items-center gap-2 transition-all"
                  >
                    <LogIn className="w-4 h-4" /> Check In
                  </button>
                ) : (
                  <button
                    onClick={checkOutCurrentEmployee}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition-colors font-bold text-xs shadow-md flex items-center gap-2 transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Check Out
                  </button>
                )}
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
                <div className="text-xs text-slate-500 font-medium">Leave Balance</div>
                <div className="text-xl font-bold text-slate-900 mt-1">14 Days Left</div>
                <div className="text-[10px] text-indigo-400 mt-0.5">Annual + Casual Pool</div>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">My Open Tasks</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {tasks.filter(t => t.assignedTo === currentUser.employeeId || t.assignedTo === currentUser.id).length} Tasks
                </div>
                <div className="text-[10px] text-amber-400 mt-0.5">Kanban Board Ready</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
              <div>
                <div className="text-xs text-slate-500 font-medium">Assigned Hardware</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {assets.filter(a => a.assignedTo === currentUser.employeeId || a.assignedTo === currentUser.id).length} Items
                </div>
                <div className="text-[10px] text-purple-400 mt-0.5">Laptop & Peripherals</div>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <HardDrive className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Upcoming Events & Present Graphs Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Present Monthly Graph Preview */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-400" /> Monthly Attendance Summary & Hours
                </h3>
                <span className="text-xs text-slate-500 font-mono">July 2026</span>
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
                      {rec.status} ({rec.workHours || 8} hrs)
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
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-500/30 text-xs space-y-1">
                  <div className="font-bold text-indigo-700">Company Mid-Year Townhall</div>
                  <div className="text-[11px] text-slate-600">July 30, 2026 • 3:00 PM EST</div>
                  <div className="text-[10px] text-slate-500">Q4 roadmap presentation & Q&A session.</div>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs space-y-1">
                  <div className="font-bold text-purple-700">Quarterly Performance Reviews</div>
                  <div className="text-[11px] text-slate-600">August 05, 2026</div>
                  <div className="text-[10px] text-slate-500">Self-evaluations submission deadline.</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. MY TASKS (KANBAN) TAB */}
      {activeTab === 'tasks' && <KanbanTaskBoard />}

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
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" /> Employee Requests & FAQs
              </h3>
              <p className="text-xs text-slate-500">Submit leave requests, request official salary slips, or search HR FAQs</p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors text-xs shadow-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Request Leave
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* My Leave Requests Tracker */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" /> My Leave Requests History
              </h4>

              <div className="space-y-3">
                {leaveRequests
                  .filter(l => l.employeeId === currentUser.employeeId || l.employeeId === currentUser.id)
                  .map(req => (
                    <div key={req.id} className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{req.leaveType} ({req.days} Days)</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-700' :
                          req.status === 'Pending' ? 'bg-amber-500/20 text-amber-700' : 'bg-red-500/20 text-red-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {req.startDate} to {req.endDate}
                      </div>
                      <p className="text-slate-600 text-[11px]">Reason: {req.reason}</p>
                      {req.reviewComment && (
                        <div className="text-[10px] text-indigo-700 italic pt-1 border-t border-slate-200/60">
                          HR Comment: {req.reviewComment} ({req.reviewedBy})
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Salary Slips Downloads */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Salary Slip Request & Download
              </h4>

              <div className="space-y-3">
                {salarySlips.map(slip => (
                  <div key={slip.id} className="p-3.5 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{slip.month} Payslip</div>
                      <div className="text-[11px] text-emerald-400 font-mono font-bold">Net Pay: ${slip.netPay.toLocaleString()} USD</div>
                      <div className="text-[10px] text-slate-500">Issued: {slip.issuedDate}</div>
                    </div>
                    <button
                      onClick={() => setSelectedPayslip(slip)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors text-[11px] flex items-center gap-1.5 shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" /> View Payslip
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* FAQs Accordion */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Frequently Asked Questions (FAQs)</h4>
            <div className="space-y-3">
              {faqs.map(faq => (
                <div key={faq.id} className="p-3.5 rounded-xl bg-slate-100/60 border border-slate-200/60 text-xs space-y-1">
                  <div className="font-bold text-indigo-700">{faq.question}</div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-400" /> My Assigned Assets Register
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets
              .filter(a => a.assignedTo === currentUser.employeeId || a.assignedTo === currentUser.id)
              .map(asset => (
                <div key={asset.id} className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-indigo-400 font-bold">{asset.assetCode}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-700">
                      {asset.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{asset.name}</h4>
                  <p className="text-xs text-slate-500">Category: {asset.category}</p>
                  {asset.serialNumber && <p className="text-[10px] font-mono text-slate-500">S/N: {asset.serialNumber}</p>}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 7. MY PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" /> My Employee Profile & Documents
              </h3>
              <p className="text-xs text-slate-500">Update personal details, emergency contacts, and upload official photos</p>
            </div>
            {savedSuccess && (
              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-700 text-xs font-bold border border-emerald-500/30">
                ✓ Profile Saved Successfully!
              </span>
            )}
          </div>

          <form onSubmit={handleProfileSave} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Full Employee Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Designation</label>
                <input
                  type="text"
                  value={profileDesignation}
                  onChange={e => setProfileDesignation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={profileDob}
                  onChange={e => setProfileDob(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Citizenship & PAN (Optional)</label>
                <input
                  type="text"
                  value={citizenshipPan}
                  onChange={e => setCitizenshipPan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Emergency Phone Number</label>
                <input
                  type="text"
                  value={emergencyPhone}
                  onChange={e => setEmergencyPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Guardian Phone Number</label>
                <input
                  type="text"
                  value={guardianPhone}
                  onChange={e => setGuardianPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>
            </div>

            {/* Document Uploader */}
            <DocumentUploader
              documents={currentUser.documents}
              onChange={docs => updateCurrentUserProfile({ documents: docs })}
            />

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors text-xs shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Profile Updates
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-modal border border-slate-900/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Submit New Leave Request</h3>
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
              <div className="flex justify-between"><span>Employee ID:</span><strong>{currentUser.employeeId || 'EMP-2026-003'}</strong></div>
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
