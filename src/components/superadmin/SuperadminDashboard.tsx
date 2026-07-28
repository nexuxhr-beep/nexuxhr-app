import React, { useState } from 'react';
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
  Users
} from 'lucide-react';

interface SuperadminDashboardProps {
  activeTab: string;
}

export const SuperadminDashboard: React.FC<SuperadminDashboardProps> = ({ activeTab }) => {
  const {
    organizations,
    auditLogs,
    addOrganization,
    updateOrganizationStatus,
    updateOrganizationPlan
  } = useHR();

  // New Organization Form
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCode, setNewOrgCode] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState<Organization['plan']>('Growth');

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    addOrganization({
      name: newOrgName,
      code: newOrgCode || newOrgName.substring(0, 4).toUpperCase(),
      plan: newOrgPlan,
      billingCycle: 'Monthly',
      activeEmployeesCount: 1,
      maxEmployees: newOrgPlan === 'Enterprise' ? 200 : newOrgPlan === 'Growth' ? 50 : 15,
      status: 'Active',
      renewalDate: '2027-01-01',
      contactEmail: newOrgEmail || 'contact@org.com'
    });

    setNewOrgName('');
    setNewOrgCode('');
    setNewOrgEmail('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-white border border-purple-200 flex items-center justify-between">
        <div>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-700 border border-purple-500/30">
            Superadmin Control Plane
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-2">NexuxHR Global Multi-Tenant Management</h2>
          <p className="text-sm text-slate-600">Oversee all customer organizations, tier subscriptions, and system audit logs</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-700 font-bold text-xs flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-purple-400" /> Superadmin Granted
          </span>
        </div>
      </div>

      {/* 1. ORGANIZATIONS TAB */}
      {activeTab === 'orgs' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" /> Provision New Company / Organization
            </h3>

            <form onSubmit={handleCreateOrg} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-100/60 p-4 rounded-xl border border-slate-200/60 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Apex Global Innovations"
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Company Code</label>
                <input
                  type="text"
                  placeholder="APEX"
                  value={newOrgCode}
                  onChange={e => setNewOrgCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Subscription Plan</label>
                <select
                  value={newOrgPlan}
                  onChange={e => setNewOrgPlan(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-900"
                >
                  <option value="Starter">Starter (Up to 15 seats)</option>
                  <option value="Growth">Growth (Up to 50 seats)</option>
                  <option value="Enterprise">Enterprise (Up to 200 seats)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button type="submit" className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors">
                  Provision Organization
                </button>
              </div>
            </form>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Registered Companies & Status ({organizations.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizations.map(org => (
                <div key={org.id} className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 space-y-3 text-xs transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-purple-400 font-bold">{org.code}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      org.status === 'Active' ? 'bg-emerald-500/20 text-emerald-700' : 'bg-amber-500/20 text-amber-700'
                    }`}>
                      {org.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{org.name}</h4>
                    <p className="text-slate-500 font-mono mt-0.5">{org.contactEmail}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Plan: <strong>{org.plan}</strong></span>
                    <span className="text-slate-500">{org.activeEmployeesCount} / {org.maxEmployees} Seats</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {org.status === 'Active' ? (
                      <button
                        onClick={() => updateOrganizationStatus(org.id, 'Suspended')}
                        className="w-full py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-500/30 hover:bg-red-900 font-bold transition-colors"
                      >
                        Suspend Access
                      </button>
                    ) : (
                      <button
                        onClick={() => updateOrganizationStatus(org.id, 'Active')}
                        className="w-full py-1.5 rounded-lg bg-emerald-950/80 text-emerald-700 border border-emerald-500/30 hover:bg-emerald-900 font-bold transition-colors"
                      >
                        Reactivate Access
                      </button>
                    )}
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
                  <th className="p-3 text-emerald-400 font-bold">HR Manager</th>
                  <th className="p-3 text-amber-400 font-bold">Team Member</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                <tr className="hover:bg-slate-100/40 transition-colors">
                  <td className="p-3 font-sans font-bold text-slate-900">Organization & Subscriptions</td>
                  <td className="p-3 text-emerald-400">Full Control</td>
                  <td className="p-3 text-slate-500">Denied</td>
                  <td className="p-3 text-slate-500">Denied</td>
                  <td className="p-3 text-slate-500">Denied</td>
                </tr>
                <tr className="hover:bg-slate-100/40 transition-colors">
                  <td className="p-3 font-sans font-bold text-slate-900">Employee Invitation Links & Pos Mgmt</td>
                  <td className="p-3 text-emerald-400">Allowed</td>
                  <td className="p-3 text-emerald-400">Full Control</td>
                  <td className="p-3 text-emerald-400">Entry Only</td>
                  <td className="p-3 text-slate-500">Denied</td>
                </tr>
                <tr className="hover:bg-slate-100/40 transition-colors">
                  <td className="p-3 font-sans font-bold text-slate-900">Leave Approvals & Rejections</td>
                  <td className="p-3 text-emerald-400">Allowed</td>
                  <td className="p-3 text-emerald-400">Full Control</td>
                  <td className="p-3 text-emerald-400">Full Control</td>
                  <td className="p-3 text-slate-500">Submit Request</td>
                </tr>
                <tr className="hover:bg-slate-100/40 transition-colors">
                  <td className="p-3 font-sans font-bold text-slate-900">Report Generation (Contracts/Salary)</td>
                  <td className="p-3 text-emerald-400">Allowed</td>
                  <td className="p-3 text-emerald-400">Full Control</td>
                  <td className="p-3 text-emerald-400">Full Control</td>
                  <td className="p-3 text-slate-500">View Own Slip</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. AUDIT LOGS TAB */}
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

    </div>
  );
};
