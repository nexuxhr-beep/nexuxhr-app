import React, { useMemo, useState } from 'react';
import { HardDrive, LayoutDashboard, Plus, Wallet } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { OfficeExpensesPanel } from '../common/OfficeExpensesPanel';
import { UpcomingBirthdays } from '../common/UpcomingBirthdays';
import { EmployeeProfileForm } from '../common/EmployeeProfileForm';
import { AssetRenewalCell } from '../common/AssetRenewalCell';
import { AddAssetModal } from '../admin/AddAssetModal';
import { AssetDetailModal } from '../admin/AssetDetailModal';
import { adToBs, bsMonthIsoRange, bsMonthKeyLabel, currentBsMonthKey, BS_MONTHS_EN } from '../../lib/nepaliDate';

interface RoleDashboardProps {
  activeTab: string;
}

const statusChip: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  returned: 'bg-slate-100 text-slate-600 border-slate-200',
  lost: 'bg-rose-50 text-rose-700 border-rose-200',
  damaged: 'bg-amber-50 text-amber-700 border-amber-200',
};

/** Assets register — same data and logic as the admin register. */
const AssetsRegister: React.FC = () => {
  const { assets } = useHR();
  const [showAdd, setShowAdd] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <HardDrive className="h-5 w-5 text-indigo-600" /> Assets Register
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Devices issued to staff, with renewal tracked from the expected return date.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-500">
          <Plus className="h-4 w-4" /> Add Asset
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3 text-left">Assigned To</th>
              <th className="p-3 text-left">Device</th>
              <th className="p-3 text-left">Identifier</th>
              <th className="p-3 text-left">Issued</th>
              <th className="p-3 text-left">Renew After</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.map(asset => (
              <tr key={asset.id} className="hover:bg-slate-50/70">
                <td className="p-3">
                  <div className="font-bold text-slate-900">{asset.assignedToName}</div>
                  <div className="text-[10px] text-slate-500">{asset.assignedToDesignation || '—'}</div>
                </td>
                <td className="p-3">
                  <div className="font-semibold text-slate-800">{asset.brandModel || asset.modelName || asset.assetType}</div>
                  <div className="text-[10px] capitalize text-slate-500">{asset.assetType}</div>
                </td>
                <td className="p-3 font-mono text-[11px] text-slate-600">
                  {asset.imei1 || asset.deviceId || '—'}
                </td>
                <td className="p-3">
                  <div className="text-slate-700">{asset.issuedDate}</div>
                  <div className="text-[10px] text-slate-400">
                    {asset.issuedDate ? (() => { const bs = adToBs(asset.issuedDate); return `${bs.day} ${BS_MONTHS_EN[bs.month - 1]} ${bs.year}`; })() : ''}
                  </div>
                </td>
                <td className="p-3">
                  <AssetRenewalCell
                    issuedDate={asset.issuedDate}
                    returnDate={asset.returnDate}
                    renewalIntervalDays={asset.renewalIntervalDays}
                  />
                </td>
                <td className="p-3">
                  <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold capitalize ${statusChip[asset.status] || ''}`}>
                    {asset.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => setViewingId(String(asset.id))} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-700">
                    View More
                  </button>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-slate-500">No assets have been registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} />}
      {viewingId && <AssetDetailModal assetId={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
};

/** Shared home hero + this-month expense summary. */
const RoleHome: React.FC<{ title: string; subtitle: string; accent: string }> = ({ title, subtitle, accent }) => {
  const { currentUser } = useHR();
  const monthKey = currentBsMonthKey();
  const range = useMemo(() => bsMonthIsoRange(monthKey), [monthKey]);

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border border-slate-200 bg-gradient-to-r ${accent} p-6`}>
        <span className="rounded-full border border-slate-900/10 bg-white/70 px-3 py-1 text-[10px] font-bold text-slate-700">
          {title}
        </span>
        <h2 className="mt-2 text-2xl font-black text-slate-900">
          {currentUser.companyName || 'Company'}
        </h2>
        <p className="text-sm text-slate-600">{subtitle}</p>
        <p className="mt-2 text-xs text-slate-500">
          {bsMonthKeyLabel(monthKey)} &middot; {range.startIso} → {range.endIso}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <UpcomingBirthdays />
      </div>
    </div>
  );
};

/**
 * Operation Manager — assets register and office expenses only,
 * exactly as scoped in the correction document.
 */
export const OperationManagerDashboard: React.FC<RoleDashboardProps> = ({ activeTab }) => (
  <div className="space-y-6">
    {activeTab === 'home' && (
      <RoleHome
        title="Operation Manager Console"
        subtitle="Assets register and office expense entry."
        accent="from-cyan-50 via-white to-cyan-50"
      />
    )}

    {activeTab === 'assets' && <AssetsRegister />}

    {activeTab === 'office_expenses' && <OfficeExpensesPanel canEdit />}

    {activeTab === 'profile' && (
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-lg font-bold text-slate-900">My Profile</h3>
          <p className="mt-1 text-xs text-slate-500">Manage your own employee and contact record.</p>
        </div>
        <EmployeeProfileForm />
      </div>
    )}
  </div>
);

/**
 * Accountant — read-only view of office expenses.
 * Scope is intentionally minimal until it is confirmed.
 */
export const AccountantDashboard: React.FC<RoleDashboardProps> = ({ activeTab }) => (
  <div className="space-y-6">
    {activeTab === 'home' && (
      <RoleHome
        title="Accountant Console"
        subtitle="Office expense review. Entry is done by the operation manager."
        accent="from-rose-50 via-white to-rose-50"
      />
    )}

    {activeTab === 'office_expenses' && (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <Wallet className="h-4 w-4 shrink-0" />
          Read-only view. Bills are entered by the operation manager.
        </div>
        <OfficeExpensesPanel canEdit={false} />
      </div>
    )}

    {activeTab === 'profile' && (
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="text-lg font-bold text-slate-900">My Profile</h3>
          <p className="mt-1 text-xs text-slate-500">Manage your own employee and contact record.</p>
        </div>
        <EmployeeProfileForm />
      </div>
    )}

    {activeTab !== 'home' && activeTab !== 'office_expenses' && activeTab !== 'profile' && (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <LayoutDashboard className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">This module is not part of the accountant role yet.</p>
      </div>
    )}
  </div>
);
