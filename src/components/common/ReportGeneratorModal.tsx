import React, { useState } from 'react';
import { useHR } from '../../context/HRContext';
import { UserProfile } from '../../types';
import {
  FileText,
  Printer,
  Download,
  TrendingUp,
  Award,
  Briefcase,
  X,
  CheckCircle2,
  Building2,
  FileBadge
} from 'lucide-react';

interface ReportGeneratorModalProps {
  onClose: () => void;
  preselectedEmployee?: UserProfile;
}

export const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({ onClose, preselectedEmployee }) => {
  const { users, currentUser } = useHR();
  const [reportType, setReportType] = useState<'contract' | 'salary_increase' | 'performance_increase'>('contract');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    preselectedEmployee ? (preselectedEmployee.employeeId || preselectedEmployee.id) : (users[0]?.employeeId || users[0]?.id || currentUser.id)
  );

  // Report fields
  const [jobTitle, setJobTitle] = useState('Senior Software Engineer');
  const [salaryAmount, setSalaryAmount] = useState('85,000');
  const [incrementPercentage, setIncrementPercentage] = useState('15%');
  const [performanceRating, setPerformanceRating] = useState('Exceeds Expectations (4.8/5)');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPreview, setShowPreview] = useState(false);

  const targetEmp = users.find(u => u.employeeId === selectedEmpId || u.id === selectedEmpId) || currentUser;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-modal border border-slate-900/10 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileBadge className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">HR Official Report Generator</h3>
              <p className="text-xs text-slate-500">Generate contracts, salary increase letters, and performance reports</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!showPreview ? (
          /* Generator Options Form */
          <div className="space-y-5 text-xs">
            {/* Select Report Type */}
            <div>
              <label className="block text-slate-600 font-bold mb-2">Select Document Type *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setReportType('contract')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                    reportType === 'contract'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors'
                  }`}
                >
                  <Briefcase className="w-5 h-5 text-indigo-400" />
                  <div>
                    <div className="text-xs">Employment Contract</div>
                    <div className="text-[10px] text-slate-500 font-normal">Official hiring agreement</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setReportType('salary_increase')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                    reportType === 'salary_increase'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors'
                  }`}
                >
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-xs">Salary Increase Letter</div>
                    <div className="text-[10px] text-slate-500 font-normal">Compensation revision</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setReportType('performance_increase')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                    reportType === 'performance_increase'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors'
                  }`}
                >
                  <Award className="w-5 h-5 text-purple-400" />
                  <div>
                    <div className="text-xs">Performance Certificate</div>
                    <div className="text-[10px] text-slate-500 font-normal">Review & appraisal notice</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Select Target Employee */}
            <div>
              <label className="block text-slate-600 font-bold mb-1">Target Employee *</label>
              <select
                value={selectedEmpId}
                onChange={e => setSelectedEmpId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.employeeId || u.id}>
                    {u.name} — {u.employeeId || 'EMP-000'} ({u.designation || u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Report Specific Details */}
            <div className="grid grid-cols-2 gap-4 bg-white/60 p-4 rounded-xl border border-slate-200/60">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Designation / Role Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Effective Date</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800"
                />
              </div>

              {reportType === 'salary_increase' && (
                <>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">New Monthly Base Salary ($)</label>
                    <input
                      type="text"
                      value={salaryAmount}
                      onChange={e => setSalaryAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Increment Rate (%)</label>
                    <input
                      type="text"
                      value={incrementPercentage}
                      onChange={e => setIncrementPercentage(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800"
                    />
                  </div>
                </>
              )}

              {reportType === 'performance_increase' && (
                <div className="col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1">Performance Evaluation Rating</label>
                  <input
                    type="text"
                    value={performanceRating}
                    onChange={e => setPerformanceRating(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg flex items-center gap-2 transition-colors"
              >
                <FileText className="w-4 h-4" /> Generate Document Preview
              </button>
            </div>
          </div>
        ) : (
          /* Document Preview Canvas */
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-xs text-indigo-400 font-semibold">Document Ready for Printing / Export</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs hover:bg-slate-200 transition-colors"
                >
                  Edit Inputs
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div id="printable-document" className="bg-white text-slate-900 p-8 rounded-xl shadow-xl space-y-6 text-sm font-serif">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 font-sans">NEXUX<span className="text-indigo-600">HR</span></h1>
                  <p className="text-xs text-slate-600 font-sans">Smart HR Management for Modern Teams</p>
                  <p className="text-[11px] text-slate-500 font-sans">Support & Admin: support@nexuxhr.com</p>
                </div>
                <div className="text-right font-sans text-xs text-slate-600">
                  <div className="font-bold text-slate-900">{currentUser.companyName || 'Acme Software Solutions'}</div>
                  <div>Ref #: NXR-{Math.floor(100000 + Math.random() * 900000)}</div>
                  <div>Date: {effectiveDate}</div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center font-sans">
                <h2 className="text-xl font-bold uppercase tracking-wide text-slate-900">
                  {reportType === 'contract' && 'Official Employment Agreement'}
                  {reportType === 'salary_increase' && 'Notice of Compensation Revision'}
                  {reportType === 'performance_increase' && 'Certificate of Performance Excellence'}
                </h2>
                <div className="w-16 h-1 bg-indigo-600 mx-auto mt-2 rounded-full"></div>
              </div>

              {/* Body Content */}
              <div className="space-y-4 leading-relaxed text-slate-800">
                <p>
                  This official document is issued to <strong>{targetEmp.name}</strong> (Employee ID: <strong>{targetEmp.employeeId || 'EMP-2026-003'}</strong>), currently serving in the designation of <strong>{jobTitle}</strong>.
                </p>

                {reportType === 'contract' && (
                  <div className="space-y-3">
                    <p>
                      <strong>1. Position & Duties:</strong> The Employee shall perform all responsibilities associated with the role of {jobTitle} within the {targetEmp.department || 'Engineering'} department with professionalism and commitment.
                    </p>
                    <p>
                      <strong>2. Compensation:</strong> The Employee will receive a gross monthly salary of <strong>${salaryAmount} USD</strong>, payable on the last business day of each calendar month via direct bank transfer.
                    </p>
                    <p>
                      <strong>3. Effective Date:</strong> This contract takes effect on <strong>{effectiveDate}</strong> and remains binding under standard company policies and labor regulations.
                    </p>
                  </div>
                )}

                {reportType === 'salary_increase' && (
                  <div className="space-y-3">
                    <p>
                      We are pleased to inform you that following your outstanding performance and valuable contributions to the team, executive management has approved a salary increment of <strong>{incrementPercentage}</strong>.
                    </p>
                    <p>
                      Your revised monthly base salary will be <strong>${salaryAmount} USD</strong>, effective from <strong>{effectiveDate}</strong>. All standard benefits, allowances, and leave entitlements remain active as per company terms.
                    </p>
                  </div>
                )}

                {reportType === 'performance_increase' && (
                  <div className="space-y-3">
                    <p>
                      This certificate recognizes <strong>{targetEmp.name}</strong> for demonstrating remarkable dedication, work ethic, and leadership during the recent evaluation cycle.
                    </p>
                    <p>
                      Overall Performance Rating Achieved: <strong>{performanceRating}</strong>.
                    </p>
                    <p>
                      Management extends sincere appreciation for your exemplary efforts in advancing our company goals.
                    </p>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-2 gap-8 font-sans text-xs text-slate-700">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">{currentUser.name}</p>
                  <p className="text-slate-500">Authorized Signatory — HR Administration</p>
                  <p className="text-slate-500 text-[10px]">NexuxHR Smart Management Portal</p>
                </div>
                <div className="border-t border-slate-400 pt-2 text-right">
                  <p className="font-bold text-slate-900">{targetEmp.name}</p>
                  <p className="text-slate-500">Employee Acknowledgment</p>
                  <p className="text-slate-500 text-[10px]">ID: {targetEmp.employeeId || 'EMP-2026-003'}</p>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
