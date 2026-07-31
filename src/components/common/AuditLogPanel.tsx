import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Search } from 'lucide-react';
import { useHR } from '../../context/HRContext';

export const AuditLogPanel: React.FC = () => {
  const { auditLogs } = useHR();
  const [search, setSearch] = useState('');
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return auditLogs.filter(log => !term || [log.action, log.doneByName, log.role, log.details, log.entityType]
      .filter(Boolean).some(value => String(value).toLowerCase().includes(term)));
  }, [auditLogs, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Company Audit Logs</h3><p className="text-xs text-slate-500 mt-1">Profile, document and contract changes recorded from the real database.</p></div>
        <label className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs…" className="pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none" /></label>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[850px] text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="p-3 text-left">Time</th><th className="p-3 text-left">Action</th><th className="p-3 text-left">Performed By</th><th className="p-3 text-left">Role</th><th className="p-3 text-left">Details</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(log => <tr key={log.id} className="hover:bg-slate-50"><td className="p-3 whitespace-nowrap text-slate-500">{new Date(log.timestamp).toLocaleString()}</td><td className="p-3 font-bold text-slate-900">{log.action}</td><td className="p-3 text-slate-700">{log.doneByName}</td><td className="p-3"><span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold">{log.role}</span></td><td className="p-3 text-slate-600">{log.details}</td></tr>)}
            {rows.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-500">No audit records found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
