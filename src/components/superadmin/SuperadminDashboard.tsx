import React, { useState } from 'react';
import { Company } from '../../lib/authApi';
import { AllUsersPanel } from './AllUsersPanel';
import { DeleteCompanyModal } from './DeleteCompanyModal';
import { useHR } from '../../context/HRContext';
import { Organization } from '../../types';
import {
  Building2,
  Receipt,
  ShieldAlert,
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  XCircle,
  TrendingUp,
  CreditCard,
  Crown,
  Users,
  Trash2
} from 'lucide-react';

interface SuperadminDashboardProps {
  activeTab: string;
}

export const SuperadminDashboard: React.FC<SuperadminDashboardProps> = ({ activeTab }) => {
  const {
    organizations,
    auditLogs,
    updateOrganizationPlan,
    companies,
    createCompanyAndInviteAdmin,
    setCompanyStatus,
    deleteCompany
  } = useHR();

  // Real company + admin invite
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyAdminEmail, setNewCompanyAdminEmail] = useState('');
  const [companySending, setCompanySending] = useState(false);
  const [companyError, setCompanyError] = useState('');
  const [companyMessage, setCompanyMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleCreateCompanyInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !newCompanyAdminEmail.trim()) return;
    setCompanySending(true);
    setCompanyError('');
    setCompanyMessage('');
    try {
      await createCompanyAndInviteAdmin(newCompanyName.trim(), newCompanyAdminEmail.trim());
      setCompanyMessage(`"${newCompanyName.trim()}" created — an invitation email was sent to ${newCompanyAdminEmail.trim()}.`);
      setNewCompanyName('');
      setNewCompanyAdminEmail('');
    } catch (err: any) {
      setCompanyError(err.message || 'Could not create the company.');
    } finally {
      setCompanySending(false);
    }
  };

  const openDeleteCompany = (company: Company) => {
    setDeleteError('');
    setDeleteTarget(company);
  };

  const handleDeleteCompany = async (confirmationName: string) => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError('');
    setCompanyError('');
    setCompanyMessage('');
    try {
      await deleteCompany(deleteTarget.id, confirmationName);
      setCompanyMessage(`${deleteTarget.name} was permanently deleted.`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete the company.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="nx-surface nx-page-enter flex items-center justify-between rounded-2xl p-6">
        <div>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-700 border border-purple-500/30">
            Superadmin Control Plane
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-2">NexuxHR Global Multi-Tenant Management</h2>
          <p className="text-sm text-slate-600">Oversee all customer organizations, tier subscriptions, and system audit logs</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
            <Crown className="w-4 h-4 text-purple-400" /> Superadmin Granted
          </span>
        </div>
      </div>

      {/* 1. ORGANIZATIONS TAB */}
      {activeTab === 'orgs' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" /> Create Company & Invite its Admin
            </h3>
            <p className="text-xs text-slate-500">
              Creates the company and emails the owner an invitation link. They set their own password — you never see it.
            </p>

            {companyError && <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{companyError}</div>}
            {companyMessage && <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">{companyMessage}</div>}

            <form onSubmit={handleCreateCompanyInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-100/60 p-4 rounded-xl border border-slate-200/60 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Apex Global Innovations"
                  value={newCompanyName}
                  onChange={e => setNewCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Owner / Admin Email *</label>
                <input
                  type="email"
                  required
                  placeholder="owner@company.com"
                  value={newCompanyAdminEmail}
                  onChange={e => setNewCompanyAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                />
              </div>

              <div className="flex items-end">
                <button disabled={companySending} type="submit" className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors disabled:opacity-60">
                  {companySending ? 'Sending invite...' : 'Create & Invite Admin'}
                </button>
              </div>
            </form>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Companies ({companies.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.length === 0 && (
                <p className="text-xs text-slate-500 italic">No companies created yet.</p>
              )}
              {companies.map(co => (
                <div key={co.id} className="nx-company-card space-y-3 rounded-xl p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-purple-400 font-bold">{co.code}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      co.status === 'active' ? 'bg-emerald-500/20 text-emerald-700' : 'bg-amber-500/20 text-amber-700'
                    }`}>
                      {co.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{co.name}</h4>
                    <p className="text-slate-500 font-mono mt-0.5">
                      {co.adminEmail ? co.adminEmail : 'Admin invite pending'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Admin: <strong>{co.adminName || 'Not signed up yet'}</strong></span>
                    <span className="text-slate-500">{co.employeeCount} employees</span>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <button
                      onClick={() => setCompanyStatus(co.id, co.status === 'active' ? 'suspended' : 'active')}
                      className={`rounded-lg border px-3 py-2 font-bold transition ${
                        co.status === 'active'
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {co.status === 'active' ? 'Suspend access' : 'Reactivate access'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteCompany(co)}
                      className="nx-icon-button text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                      title={`Delete ${co.name}`}
                      aria-label={`Delete ${co.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. SUBSCRIPTIONS & BILLING TAB */}
      {activeTab === 'subscriptions' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-400" /> Subscription & Tier Management
              </h3>
              <p className="text-xs text-slate-500">Upgrade or downgrade company subscription tiers</p>
            </div>
          </div>

          <div className="space-y-3">
            {organizations.map(org => (
              <div key={org.id} className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{org.name}</div>
                  <div className="text-slate-500 font-mono">Current Plan: {org.plan} | Cycle: {org.billingCycle} | Renewal: {org.renewalDate}</div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={org.plan}
                    onChange={e => updateOrganizationPlan(org.id, e.target.value as any)}
                    className="px-3 py-1.5 rounded-lg glass-input text-slate-900 font-semibold"
                  >
                    <option value="Starter">Starter ($49/mo)</option>
                    <option value="Growth">Growth ($149/mo)</option>
                    <option value="Enterprise">Enterprise ($399/mo)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. ROLES & PERMISSIONS MATRIX TAB */}
      {activeTab === 'roles_permissions' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-400" /> Role-Based Access Control (RBAC) Matrix
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Feature Module</th>
                  <th className="p-3 text-purple-400 font-bold">Superadmin</th>
                  <th className="p-3 text-blue-400 font-bold">Admin</th>
                  <th className="p-3 text-emerald-600 font-bold">HR Manager</th>
                  <th className="p-3 text-cyan-600 font-bold">Operation Manager</th>
                  <th className="p-3 text-amber-600 font-bold">Team Member</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                <tr className="hover:bg-slate-100/40 transition-colors">
                  <td className="p-3 font-sans font-bold text-slate-900">Organization & Subscriptions</td>
                  <td className="p-3 text-emerald-400">Full Control</td>
                  <td className="p-3 text-slate-500">Denied</td>
                  <td className="p-3 text-slate-500">Denied</td>
                  <td className="p-3 text-slate-500">Denied</td>
                  <td className="p-3 text-slate-500">Denied</td>
                </tr>
                <tr className="hover:bg-slate-100/40 transition-colors">
                  <td className="p-3 font-sans font-bold text-slate-900">Employee Invitation Links & Pos Mgmt</td>
                  <td className="p-3 text-emerald-400">Allowed</td>
                  <td className="p-3 text-emerald-400">Full Control</td>
                  <td className="p-3 text-emerald-600">Entry Only</td>
                  <td className="p-3 text-slate-500">Denied</td>
                  <td className="p-3 text-slate-500">Denied</td>
                </tr>
                <tr className="hover:bg-slate-100/40 transition-colors">
                  <td className="p-3 font-sans font-bold text-slate-900">Leave Approvals & Rejections</td>
                  <td className="p-3 text-emerald-400">Allowed</td>
                  <td className="p-3 text-emerald-400">Full Control</td>
                  <td className="p-3 text-emerald-600">Full Control</td>
                  <td className="p-3 text-slate-500">View own only</td>
                  <td className="p-3 text-slate-500">Submit Request</td>
                </tr>
                <tr className="hover:bg-slate-100/40 transition-colors">
                  <td className="p-3 font-sans font-bold text-slate-900">Report Generation (Contracts/Salary)</td>
                  <td className="p-3 text-emerald-400">Allowed</td>
                  <td className="p-3 text-emerald-400">Full Control</td>
                  <td className="p-3 text-emerald-600">Full Control</td>
                  <td className="p-3 text-slate-500">Denied</td>
                  <td className="p-3 text-slate-500">View own documents</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* 4. ALL USERS TAB */}
      {activeTab === 'all_users' && <AllUsersPanel />}

      {/* 5. AUDIT LOGS TAB */}
      {activeTab === 'audit_logs' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-purple-400" /> System Global Audit Trail Logs
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-100/60 border border-slate-200/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{log.action}</div>
                  <p className="text-slate-500 text-[11px] mt-0.5">{log.details}</p>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-500">
                  <div>{log.doneByName}</div>
                  <div>{log.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteCompanyModal
          company={deleteTarget}
          deleting={deleteBusy}
          error={deleteError}
          onCancel={() => { if (!deleteBusy) setDeleteTarget(null); }}
          onConfirm={handleDeleteCompany}
        />
      )}

    </div>
  );
};
