import React, { useMemo, useState } from 'react';
import { Eye, Search, UserCheck, UserX, Users, X } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { EmployeeProfileForm } from './EmployeeProfileForm';

interface EmployeeDirectoryPanelProps {
  showAccountControls?: boolean;
}

export const EmployeeDirectoryPanel: React.FC<EmployeeDirectoryPanelProps> = ({ showAccountControls = true }) => {
  const { employeeProfiles, users, toggleUserActiveStatus } = useHR();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const rows = useMemo(() => employeeProfiles.filter(profile => {
    const user = users.find(item => item.id === profile.userId);
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [profile.employeeName, profile.employeeCode, profile.emailAddress, profile.department, profile.jobTitle]
      .filter(Boolean).some(value => String(value).toLowerCase().includes(term));
    const matchesStatus = status === 'all' || (status === 'active' ? user?.isActive !== false : user?.isActive === false);
    return matchesSearch && matchesStatus;
  }), [employeeProfiles, users, search, status]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" /> Employee Details</h3>
          <p className="text-xs text-slate-500 mt-1">View and edit complete employee, government ID, bank, address, emergency and document records.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <label className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…" className="pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-indigo-400" />
          </label>
          <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700">
            <option value="all">All accounts</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
            <tr>
              <th className="w-12 p-3" />
              <th className="text-left p-3">Employee</th>
              <th className="text-left p-3">Job / Department</th>
              <th className="text-left p-3">Phone / Email</th>
              <th className="text-left p-3">Contract Expiry</th>
              <th className="text-left p-3">Completion</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(profile => {
              const user = users.find(item => item.id === profile.userId);
              return (
                <tr key={profile.userId} className="hover:bg-slate-50/70">
                  <td className="p-3">
                    {profile.profilePhoto ? (
                      <img src={profile.profilePhoto} alt={profile.employeeName} className="h-9 w-9 rounded-xl border border-slate-200 object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-sm font-black text-indigo-700">
                        {(profile.employeeName || '?').trim().charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{profile.employeeName}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {profile.employeeCode && <span className="font-mono font-bold text-slate-600">{profile.employeeCode}</span>}
                      {profile.employeeCode && ' · '}
                      {user?.role || profile.role} · {user?.isActive === false ? 'Inactive' : 'Active'}
                    </div>
                  </td>
                  <td className="p-3"><div className="font-semibold text-slate-800">{profile.jobTitle || 'Not provided'}</div><div className="text-[10px] text-slate-500">{profile.department || 'Department not provided'}</div></td>
                  <td className="p-3"><div className="text-slate-700">{profile.phoneNumber || '—'}</div><div className="text-[10px] text-slate-500">{profile.emailAddress}</div></td>
                  <td className="p-3"><div className="font-semibold text-slate-800">{profile.contractExpireDate || 'Not set'}</div><div className="text-[10px] text-slate-500">{profile.documentCount || 0} document(s)</div></td>
                  <td className="p-3"><div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${profile.profileCompletion}%` }} /></div><div className="text-[10px] text-slate-500 mt-1">{profile.profileCompletion}%</div></td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setSelectedUserId(profile.userId)} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> View More</button>
                      {showAccountControls && user && (
                        <button onClick={() => toggleUserActiveStatus(user.id)} className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 ${user.isActive ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}{user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-slate-500">No employee records match the selected filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {selectedUserId && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-6xl max-h-[94vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div><h3 className="font-black text-slate-900">Employee Details — View and Edit</h3><p className="text-[11px] text-slate-500">All employee information and documents are synced to Admin and HR.</p></div>
              <button onClick={() => setSelectedUserId(null)} className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-5"><EmployeeProfileForm userId={selectedUserId} compact /></div>
          </div>
        </div>
      )}
    </div>
  );
};
