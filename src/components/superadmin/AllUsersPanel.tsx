import React, { useMemo, useState } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { UserRole } from '../../types';

const PAGE_SIZE = 8;

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Company Admin',
  hr_manager: 'HR Manager',
  operation_manager: 'Operation Manager',
  accountant: 'Accountant',
  team_member: 'Team Member',
};

const roleBadgeClass: Record<UserRole, string> = {
  superadmin: 'bg-violet-100 text-violet-700',
  admin: 'bg-blue-100 text-blue-700',
  hr_manager: 'bg-emerald-100 text-emerald-700',
  operation_manager: 'bg-cyan-100 text-cyan-700',
  accountant: 'bg-amber-100 text-amber-700',
  team_member: 'bg-slate-100 text-slate-700',
};

export const AllUsersPanel: React.FC = () => {
  const { users, toggleUserActiveStatus, refreshPhase2Data, currentUser } = useHR();
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [changingUserId, setChangingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const companyNames = useMemo(
    () => Array.from(new Set(users.map(user => user.companyName).filter(Boolean) as string[])).sort(),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(user => {
      const matchesSearch = !term || [
        user.name,
        user.email,
        user.companyName || '',
        user.employeeCode || '',
        ROLE_LABELS[user.role],
      ].some(value => value.toLowerCase().includes(term));
      const matchesCompany = companyFilter === 'all' || user.companyName === companyFilter;
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (user.isActive ? 'active' : 'inactive') === statusFilter;
      return matchesSearch && matchesCompany && matchesRole && matchesStatus;
    });
  }, [companyFilter, roleFilter, search, statusFilter, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const companyCount = new Set(users.map(user => user.companyId).filter(Boolean)).size;

  const changeFilter = (callback: () => void) => {
    callback();
    setPage(1);
  };

  const handleStatusChange = async (userId: string) => {
    setChangingUserId(userId);
    setError('');
    try {
      await toggleUserActiveStatus(userId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update the user status.');
    } finally {
      setChangingUserId(null);
    }
  };

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, className: 'text-violet-600 bg-violet-50' },
    { label: 'Active Users', value: users.filter(user => user.isActive).length, icon: UserCheck, className: 'text-emerald-600 bg-emerald-50' },
    { label: 'Inactive Users', value: users.filter(user => !user.isActive).length, icon: UserX, className: 'text-rose-600 bg-rose-50' },
    { label: 'Total Companies', value: companyCount, icon: Building2, className: 'text-blue-600 bg-blue-50' },
  ];

  return (
    <section className="space-y-5">
      <div className="nx-surface rounded-2xl p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><Users className="h-6 w-6" /></div>
            <div>
              <h3 className="text-xl font-black text-slate-900">All Users</h3>
              <p className="text-sm text-slate-500">View and manage accounts across every NexuxHR company.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, className }) => (
              <div key={label} className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-900">{value}</p></div>
                  <span className={`rounded-lg p-2 ${className}`}><Icon className="h-5 w-5" /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_190px_170px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={event => changeFilter(() => setSearch(event.target.value))}
              placeholder="Search name, email, company or code..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <select value={companyFilter} onChange={event => changeFilter(() => setCompanyFilter(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400">
            <option value="all">All Companies</option>
            {companyNames.map(company => <option key={company} value={company}>{company}</option>)}
          </select>

          <select value={roleFilter} onChange={event => changeFilter(() => setRoleFilter(event.target.value as 'all' | UserRole))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400">
            <option value="all">All Roles</option>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
          </select>

          <select value={statusFilter} onChange={event => changeFilter(() => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive'))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button type="button" onClick={() => void refreshPhase2Data()} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105">
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[1100px] w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Login Password</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleUsers.map(user => {
                const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U';
                const isSelf = user.id === currentUser.id;
                return (
                  <tr key={user.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">{initials}</span>
                        <div><p className="font-bold text-slate-800">{user.name || user.email.split('@')[0]}</p><p className="text-[10px] text-slate-400">{user.employeeCode || `UID-${user.id}`}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span title="Passwords are one-way hashed and cannot be viewed." className="inline-flex items-center gap-2 text-slate-500">
                        <LockKeyhole className="h-3.5 w-3.5" /> ••••••••
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.companyName || (user.role === 'superadmin' ? 'NexuxHR Platform' : 'Not assigned')}</td>
                    <td className="px-4 py-3"><span className={`rounded-md px-2 py-1 font-bold ${roleBadgeClass[user.role]}`}>{ROLE_LABELS[user.role]}</span></td>
                    <td className="px-4 py-3"><span className={`rounded-md px-2 py-1 font-bold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3 text-slate-500">{user.createdAt || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={isSelf || changingUserId === user.id}
                        onClick={() => void handleStatusChange(user.id)}
                        title={isSelf ? 'You cannot change your own status.' : undefined}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {changingUserId === user.id ? 'Saving...' : user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {visibleUsers.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">No users match the selected filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {filteredUsers.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1} to {Math.min(safePage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} users
          </span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span className="rounded-lg bg-violet-600 px-3 py-2 font-bold text-white">{safePage}</span>
            <span>of {totalPages}</span>
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Login passwords are securely hashed by the server. They can be reset, but the original password cannot and should not be displayed—even to a superadmin.
        </p>
      </div>
    </section>
  );
};
