import React, { useMemo, useState } from 'react';
import { Briefcase, Edit3, Plus, Search, X } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { Contract } from '../../types';

const today = new Date().toISOString().slice(0, 10);

type ContractDraft = {
  id?: string;
  employeeId: string;
  officeJoinDate: string;
  contractDate: string;
  contractExpireDate: string;
  contractType: Contract['contractType'];
  status: Contract['status'];
  remark: string;
};

const emptyDraft: ContractDraft = {
  employeeId: '',
  officeJoinDate: '',
  contractDate: today,
  contractExpireDate: '',
  contractType: 'Full-Time',
  status: 'Active',
  remark: '',
};

const statusClass = (status: Contract['status']) => {
  if (status === 'Active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Pending Renewal') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'Expired') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

export const ContractOverviewPanel: React.FC = () => {
  const { contracts, users, saveContractAction, employeeProfiles } = useHR();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<ContractDraft | null>(null);

  /**
   * Prefill Office Join Date from the employee's stored profile.
   * A manual edit is preserved: the prefill only overwrites the field when it is
   * empty or still holds the previously selected employee's join date.
   */
  const selectEmployee = (employeeId: string) => {
    setDraft(current => {
      const previousJoinDate = employeeProfiles.find(p => p.userId === current.employeeId)?.joiningDate || '';
      const nextJoinDate = employeeProfiles.find(p => p.userId === employeeId)?.joiningDate || '';
      const untouched = current.officeJoinDate === '' || current.officeJoinDate === previousJoinDate;
      return {
        ...current,
        employeeId,
        officeJoinDate: untouched ? nextJoinDate : current.officeJoinDate,
      };
    });
  };
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const employees = users.filter(user => user.role !== 'superadmin' && user.isActive);
  const filtered = useMemo(() => contracts.filter(contract => {
    const term = search.trim().toLowerCase();
    return !term || [contract.employeeName, contract.employeeCode, contract.department, contract.designation, contract.status]
      .filter(Boolean).some(value => String(value).toLowerCase().includes(term));
  }), [contracts, search]);

  const editContract = (contract: Contract) => setDraft({
    id: contract.id,
    employeeId: contract.employeeId,
    officeJoinDate: contract.officeJoinDate || '',
    contractDate: contract.contractDate,
    contractExpireDate: contract.contractExpireDate,
    contractType: contract.contractType,
    status: contract.status,
    remark: contract.remark || '',
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      await saveContractAction(draft);
      setDraft(null);
    } catch (err: any) {
      setError(err?.message || 'Could not save contract.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-600" /> Contract Overview</h3>
          <p className="text-xs text-slate-500 mt-1">Track join date, contract timeline, renewal days, working duration and remarks.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <label className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contracts…" className="pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none" /></label>
          <button onClick={() => setDraft({ ...emptyDraft, employeeId: employees[0]?.id || '' })} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add Contract</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1250px] text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
            <tr>
              <th className="p-3 text-left">Employee ID</th>
              <th className="p-3 text-left">Employee Name</th>
              <th className="p-3 text-left">Office Join Date</th>
              <th className="p-3 text-left">Contract Date</th>
              <th className="p-3 text-left">Contract Expire Date</th>
              <th className="p-3 text-left">Timeline</th>
              <th className="p-3 text-left">Days for New Contract</th>
              <th className="p-3 text-left">Working Duration</th>
              <th className="p-3 text-left">Remark</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(contract => (
              <tr key={contract.id} className="hover:bg-slate-50/60">
                <td className="p-3 font-mono font-bold text-slate-700">{contract.employeeCode || contract.employeeId}</td>
                <td className="p-3"><div className="font-bold text-slate-900">{contract.employeeName}</div><div className="text-[10px] text-slate-500">{contract.designation || 'No job title'} · {contract.contractType}</div></td>
                <td className="p-3">{contract.officeJoinDate || '—'}</td>
                <td className="p-3">{contract.contractDate}</td>
                <td className="p-3">{contract.contractExpireDate}</td>
                <td className="p-3">
                  <div className="w-32 h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${contract.status === 'Expired' ? 'bg-red-500' : contract.status === 'Pending Renewal' ? 'bg-amber-500' : 'bg-indigo-600'}`} style={{ width: `${Math.max(0, Math.min(100, contract.progressPercent))}%` }} /></div>
                  <div className="text-[10px] text-slate-500 mt-1">{contract.progressPercent}% elapsed</div>
                </td>
                <td className="p-3"><div className={`inline-flex px-2 py-1 rounded-lg border font-bold ${statusClass(contract.status)}`}>{contract.daysForNewContract < 0 ? `${Math.abs(contract.daysForNewContract)} days overdue` : `${contract.daysForNewContract} days`}</div></td>
                <td className="p-3 font-semibold text-slate-700">{contract.workingDuration}</td>
                <td className="p-3 max-w-[210px]"><div className="truncate text-slate-600" title={contract.remark}>{contract.remark || '—'}</div></td>
                <td className="p-3 text-right"><button onClick={() => editContract(contract)} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold inline-flex items-center gap-1"><Edit3 className="w-3.5 h-3.5" /> Edit</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={10} className="p-10 text-center text-slate-500">No contracts found. Add a real employee contract to begin tracking renewals.</td></tr>}
          </tbody>
        </table>
      </div>

      {draft && (
        <div className="fixed inset-0 z-[75] bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0"><div><h3 className="font-black text-slate-900">{draft.id ? 'Edit Contract' : 'Add Employment Contract'}</h3><p className="text-[11px] text-slate-500">Contract changes automatically sync to the employee profile.</p></div><button onClick={() => setDraft(null)} className="p-2 rounded-xl bg-slate-100 text-slate-600"><X className="w-4 h-4" /></button></div>
            <form onSubmit={save} className="overflow-y-auto p-5 space-y-4 text-xs">
              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">{error}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label><span className="block font-bold text-slate-600 mb-1.5">Employee *</span><select value={draft.employeeId} onChange={e => selectEmployee(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="">Select employee</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name} ({employee.employeeCode || employee.id})</option>)}</select></label>
                <label><span className="block font-bold text-slate-600 mb-1.5">Contract Type</span><select value={draft.contractType} onChange={e => setDraft({ ...draft, contractType: e.target.value as Contract['contractType'] })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white">{['Full-Time','Part-Time','Probation','Consultant','Fixed-Term','Internship'].map(type => <option key={type}>{type}</option>)}</select></label>
                <label><span className="block font-bold text-slate-600 mb-1.5">Office Join Date</span><input type="date" value={draft.officeJoinDate} onChange={e => setDraft({ ...draft, officeJoinDate: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200" />{draft.employeeId && !draft.officeJoinDate && <span className="mt-1 block text-[10px] text-amber-600">No join date on this employee&rsquo;s profile.</span>}</label>
                <label><span className="block font-bold text-slate-600 mb-1.5">Contract Date *</span><input type="date" value={draft.contractDate} onChange={e => setDraft({ ...draft, contractDate: e.target.value })} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200" /></label>
                <label><span className="block font-bold text-slate-600 mb-1.5">Contract Expire Date *</span><input type="date" value={draft.contractExpireDate} onChange={e => setDraft({ ...draft, contractExpireDate: e.target.value })} required className="w-full px-3 py-2.5 rounded-xl border border-slate-200" /></label>
                <label><span className="block font-bold text-slate-600 mb-1.5">Status</span><select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as Contract['status'] })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white">{['Active','Pending Renewal','Expired','Terminated'].map(status => <option key={status}>{status}</option>)}</select></label>
              </div>
              <label className="block"><span className="block font-bold text-slate-600 mb-1.5">Remark</span><textarea value={draft.remark} onChange={e => setDraft({ ...draft, remark: e.target.value })} rows={4} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 resize-y" placeholder="Renewal note, employment condition or contract remark…" /></label>
              <div className="flex justify-end pt-3 border-t border-slate-200"><button disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-black disabled:opacity-60">{saving ? 'Saving…' : 'Save Contract'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
