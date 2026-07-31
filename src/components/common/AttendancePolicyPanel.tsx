import React, { useState } from 'react';
import { Lock, Save, Settings2 } from 'lucide-react';
import { lockAttendanceMonthApi, saveAttendancePolicyApi } from '../../lib/authApi';
import { BiometricImportPanel } from './BiometricImportPanel';
import { bsMonthKeyLabel, currentBsMonthKey } from '../../lib/nepaliDate';

export const AttendancePolicyPanel: React.FC = () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [requiredHours, setRequiredHours] = useState(8);
  const [halfDayHours, setHalfDayHours] = useState(4);
  const [sandwichLeave, setSandwichLeave] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async (fn: () => Promise<any>) => {
    setBusy(true); setMessage('');
    try {
      const response = await fn();
      setMessage(response.message || 'Settings saved successfully.');
    } catch (err: any) {
      setMessage(err?.message || 'Settings could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes nxSettingsIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .nx-settings{animation:nxSettingsIn .28s ease both}
      `}</style>

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Attendance Settings</h1>
        <p className="text-sm text-slate-500">
          Manage company attendance rules, monthly locks, and biometric device imports.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="nx-settings glass-card rounded-2xl p-5">
          <h3 className="flex items-center gap-2 font-extrabold">
            <Settings2 className="h-5 w-5" /> Attendance Policy
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">
              Required hours
              <input
                type="number" min="1" max="24" value={requiredHours}
                onChange={e => setRequiredHours(Number(e.target.value))}
                className="input-field mt-2 w-full"
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Half-day threshold
              <input
                type="number" min="1" max="24" value={halfDayHours}
                onChange={e => setHalfDayHours(Number(e.target.value))}
                className="input-field mt-2 w-full"
              />
            </label>
          </div>

          <label className="mt-4 flex items-center justify-between rounded-xl border p-4">
            <span>
              <span className="block font-bold text-slate-800">Sandwich leave</span>
              <span className="text-xs text-slate-500">
                Count Saturday when leave is taken on both Friday and Sunday.
              </span>
            </span>
            <input
              type="checkbox" checked={sandwichLeave}
              onChange={e => setSandwichLeave(e.target.checked)}
              className="h-5 w-5"
            />
          </label>

          <div className="mt-4 space-y-1 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p>Working days: Sunday to Friday</p>
            <p>Saturday: weekly holiday, counted as present</p>
            <p>Attendance source: biometric device only</p>
            <p>Overtime: Disabled</p>
            <p>Calendar display: Bikram Sambat</p>
          </div>

          <button
            disabled={busy}
            onClick={() => run(() => saveAttendancePolicyApi({ requiredHours, halfDayHours, sandwichLeave }))}
            className="btn-primary mt-5 flex items-center gap-2"
          >
            <Save className="h-4 w-4" /> Save Policy
          </button>
        </div>

        <div className="nx-settings glass-card rounded-2xl p-5">
          <h3 className="flex items-center gap-2 font-extrabold">
            <Lock className="h-5 w-5" /> Attendance Lock
          </h3>
          <p className="mt-3 text-sm text-slate-500">
            Lock the current month after attendance review. Locked attendance cannot be
            changed through normal editing.
          </p>
          <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Current month: <span className="font-bold">{bsMonthKeyLabel(currentBsMonthKey())}</span>
            <span className="ml-1 text-slate-400">({currentMonth})</span>
          </p>
          <button
            disabled={busy}
            onClick={() => run(() => lockAttendanceMonthApi(currentMonth))}
            className="btn-secondary mt-5"
          >
            Lock Current Month
          </button>
        </div>
      </div>

      {/* Biometric import lives here rather than as its own sidebar tab. */}
      <BiometricImportPanel />
    </div>
  );
};
