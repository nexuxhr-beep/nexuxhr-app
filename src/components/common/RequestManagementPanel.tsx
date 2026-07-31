import React, { useMemo, useState } from 'react';
import { useHR } from '../../context/HRContext';
import { EmployeeRequestStatus, EmployeeRequestType } from '../../types';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Filter,
  Loader2,
  MessageSquareText,
  Search,
  User,
  XCircle,
} from 'lucide-react';

const statuses: EmployeeRequestStatus[] = ['Pending', 'Accepted', 'Rejected'];

const statusClass: Record<EmployeeRequestStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

export const RequestManagementPanel: React.FC = () => {
  const { employeeRequests, reviewEmployeeRequest } = useHR();
  const [statusFilter, setStatusFilter] = useState<'All' | EmployeeRequestStatus>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | EmployeeRequestType>('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<EmployeeRequestStatus>('Accepted');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const requestTypes = useMemo(() => Array.from(new Set(employeeRequests.map(request => request.requestType))), [employeeRequests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employeeRequests.filter(request => {
      const matchesStatus = statusFilter === 'All' || request.status === statusFilter;
      const matchesType = typeFilter === 'All' || request.requestType === typeFilter;
      const matchesSearch = !q
        || request.employeeName.toLowerCase().includes(q)
        || request.subject.toLowerCase().includes(q)
        || request.description.toLowerCase().includes(q)
        || (request.employeeCode || '').toLowerCase().includes(q);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [employeeRequests, search, statusFilter, typeFilter]);

  const selected = employeeRequests.find(request => request.id === selectedId) || null;

  const openReview = (requestId: string, status: EmployeeRequestStatus) => {
    setSelectedId(requestId);
    setNextStatus(status);
    setComment('');
    setError('');
  };

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError('');
    try {
      await reviewEmployeeRequest(selected.id, nextStatus, comment.trim());
      setSelectedId(null);
      setComment('');
    } catch (err: any) {
      setError(err.message || 'Request could not be updated.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-indigo-600" /><h2 className="text-lg font-black text-slate-900">Employee Requests</h2></div>
            <p className="mt-1 text-xs text-slate-500">Admin and HR share the same live request queue and review history.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-black">
            {statuses.map(status => <span key={status} className={`rounded-full border px-2.5 py-1 ${statusClass[status]}`}>{status}: {employeeRequests.filter(request => request.status === status).length}</span>)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_210px]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search employee, code, subject or details" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-400" />
          </div>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
            <option>All</option>{statuses.map(status => <option key={status}>{status}</option>)}
          </select>
          <select value={typeFilter} onChange={event => setTypeFilter(event.target.value as typeof typeFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
            <option>All</option>{requestTypes.map(type => <option key={type}>{type}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last comment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filtered.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No requests match the selected filters.</td></tr> : filtered.map(request => (
                <tr key={request.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-black text-slate-900">{request.employeeName}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{request.employeeCode || `User #${request.employeeId}`}{request.designation ? ` • ${request.designation}` : ''}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-indigo-700">{request.requestType}</td>
                  <td className="max-w-[260px] px-4 py-3">
                    <div className="font-bold text-slate-800">{request.subject}</div>
                    <div className="mt-1 line-clamp-2 text-[10px] text-slate-500">{request.description}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{request.submittedAt}</td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass[request.status]}`}>{request.status}</span></td>
                  <td className="max-w-[220px] px-4 py-3 text-[10px] text-slate-500">{request.reviewComment || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openReview(request.id, 'Accepted')} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">Accept</button>
                      <button onClick={() => openReview(request.id, 'Rejected')} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-700">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-indigo-600" /><h3 className="text-base font-black text-slate-900">Review Request</h3></div>
              <p className="mt-1 text-xs text-slate-500">{selected.employeeName} • {selected.requestType}</p>
            </div>
            <form onSubmit={submitReview} className="space-y-4 p-5 text-xs">
              {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-black text-slate-900">{selected.subject}</div>
                <p className="mt-2 leading-relaxed text-slate-600">{selected.description}</p>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">New status</label>
                <select value={nextStatus} onChange={event => setNextStatus(event.target.value as EmployeeRequestStatus)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-400">
                  {statuses.map(status => <option key={status}>{status}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-slate-700">Comment to employee</label>
                <textarea rows={4} value={comment} onChange={event => setComment(event.target.value)} placeholder="Explain the decision or next step" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-400" />
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setSelectedId(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600">Cancel</button>
                <button disabled={submitting} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white disabled:opacity-60">{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Save Review</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
