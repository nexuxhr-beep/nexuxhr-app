import React, { useMemo, useState } from 'react';
import { useHR } from '../../context/HRContext';
import { EmployeeRequestStatus, EmployeeRequestType } from '../../types';
import {
  CalendarDays,
  Clock3,
  FileQuestion,
  FileText,
  HelpCircle,
  Loader2,
  Plus,
  Receipt,
  Send
} from 'lucide-react';

const requestTypes: EmployeeRequestType[] = [
  'Leave',
  'Salary Slip',
  'Appointment',
  'Attendance Correction',
  'Asset Issue / Repair',
  'Employment Letter',
  'Document Request',
  'Work From Home',
  'Reimbursement',
  'Other',
];

const statusClass: Record<EmployeeRequestStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

export const EmployeeRequestsPanel: React.FC = () => {
  const { currentUser, employeeRequests, submitEmployeeRequest } = useHR();
  const [requestType, setRequestType] = useState<EmployeeRequestType>('Leave');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'All' | EmployeeRequestStatus>('All');

  const myRequests = useMemo(() => employeeRequests.filter(request => {
    const isMine = request.employeeId === currentUser.id || request.employeeId === currentUser.employeeId;
    return isMine && (filter === 'All' || request.status === filter);
  }), [currentUser.employeeId, currentUser.id, employeeRequests, filter]);

  const needsDateRange = requestType === 'Leave' || requestType === 'Work From Home';
  const needsSingleDate = requestType === 'Appointment' || requestType === 'Attendance Correction';
  const needsAmount = requestType === 'Reimbursement';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (needsDateRange && startDate && endDate && endDate < startDate) {
      setError('End date cannot be earlier than the start date.');
      return;
    }
    if (needsAmount && (!amount || !Number.isFinite(Number(amount)) || Number(amount) < 0)) {
      setError('Enter a valid reimbursement amount.');
      return;
    }

    setSubmitting(true);
    try {
      await submitEmployeeRequest({
        requestType,
        subject: subject.trim(),
        description: description.trim(),
        startDate: (needsDateRange || needsSingleDate) ? startDate : undefined,
        endDate: needsDateRange ? endDate : undefined,
        amount: needsAmount && amount ? Number(amount) : undefined,
      });
      setSubject('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setAmount('');
      setMessage('Request submitted successfully. Admin and HR can now review it.');
    } catch (err: any) {
      setError(err.message || 'Request could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><HelpCircle className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Requests & FAQs</h2>
            <p className="mt-1 text-xs text-slate-500">Submit any employee request from one place. Admin and HR receive the same live request.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-900">Create New Request</h3>
          </div>
          {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">{message}</div>}
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">{error}</div>}

          <form onSubmit={submit} className="space-y-4 text-xs">
            <div>
              <label className="mb-1 block font-bold text-slate-700">Request type *</label>
              <select value={requestType} onChange={event => setRequestType(event.target.value as EmployeeRequestType)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-400">
                {requestTypes.map(type => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-bold text-slate-700">Subject *</label>
              <input required value={subject} onChange={event => setSubject(event.target.value)} placeholder="Write a short request title" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-400" />
            </div>
            {(needsDateRange || needsSingleDate) && (
              <div className={`grid grid-cols-1 gap-3 ${needsDateRange ? 'sm:grid-cols-2' : ''}`}>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">{needsDateRange ? 'Start date' : 'Request date'} *</label>
                  <input required type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-400" />
                </div>
                {needsDateRange && <div>
                  <label className="mb-1 block font-bold text-slate-700">End date *</label>
                  <input required type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-400" />
                </div>}
              </div>
            )}
            {needsAmount && <div>
              <label className="mb-1 block font-bold text-slate-700">Reimbursement amount *</label>
              <input required min="0" step="0.01" type="number" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-400" />
            </div>}
            <div>
              <label className="mb-1 block font-bold text-slate-700">Details *</label>
              <textarea required rows={5} value={description} onChange={event => setDescription(event.target.value)} placeholder="Explain what you need, why, and any relevant details" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-400" />
            </div>
            <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white hover:bg-indigo-500 disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Request
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-indigo-600" /><h3 className="text-sm font-black text-slate-900">My Request History</h3></div>
            <select value={filter} onChange={event => setFilter(event.target.value as typeof filter)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700">
              <option>All</option><option>Pending</option><option>Accepted</option><option>Rejected</option>
            </select>
          </div>

          <div className="max-h-[610px] space-y-3 overflow-y-auto pr-1">
            {myRequests.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
                <FileQuestion className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-xs font-bold text-slate-600">No requests found</p>
                <p className="mt-1 text-[11px] text-slate-400">New requests will appear here after submission.</p>
              </div>
            ) : myRequests.map(request => (
              <article key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wide text-indigo-600">{request.requestType}</div>
                    <h4 className="mt-1 text-sm font-black text-slate-900">{request.subject}</h4>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass[request.status]}`}>{request.status}</span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{request.description}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> {request.submittedAt}</span>
                  {request.startDate && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {request.startDate}{request.endDate ? ` to ${request.endDate}` : ''}</span>}
                  {request.amount != null && <span className="flex items-center gap-1"><Receipt className="h-3 w-3" /> Amount: {request.amount.toLocaleString()}</span>}
                </div>
                {request.reviewComment && <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 p-2.5 text-[11px] text-indigo-800">
                  <strong>{request.reviewedByName || 'Admin/HR'}:</strong> {request.reviewComment}
                </div>}
              </article>
            ))}
          </div>
        </section>
      </div>

    </div>
  );
};
