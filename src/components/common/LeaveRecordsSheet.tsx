import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarOff,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  listLeaveRecordsApi,
  saveLeaveRecordApi,
  deleteLeaveRecordApi,
  type LeaveRecordApi,
} from '../../lib/authApi';
import { useHR } from '../../context/HRContext';
import { adToBs, dateToIso, formatBs } from '../../lib/nepaliDate';

export type LeaveType = 'Full Day' | 'Half Day' | 'Hourly';

/**
 * Days counted against an employee for one leave entry.
 *
 * NOTE: the correction document lists "full day = 0". That reads as a typo,
 * since a full-day leave counting as zero would leave the "No of Leave Taken"
 * column permanently at 0. Set 'Full Day' to 0 here if that was intended —
 * this constant is the single source of truth on the frontend, and
 * `leaveDayWeight()` in cpanel-api/index.php is its server-side twin.
 */
export const LEAVE_DAY_WEIGHTS: Record<LeaveType, number> = {
  'Full Day': 1,
  'Half Day': 0.5,
  Hourly: 0.25,
};

const LEAVE_TYPES: LeaveType[] = ['Full Day', 'Half Day', 'Hourly'];

const TYPE_STYLES: Record<LeaveType, string> = {
  'Full Day': 'bg-rose-50 text-rose-700 border-rose-200',
  'Half Day': 'bg-amber-50 text-amber-700 border-amber-200',
  Hourly: 'bg-blue-50 text-blue-700 border-blue-200',
};

const daysBetweenInclusive = (start: string, end: string): number => {
  if (!start || !end) return 1;
  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 1;
  return Math.round((to - from) / 86400000) + 1;
};

/** Full-day leave multiplies by the span; half-day and hourly are single entries. */
export const calcLeaveDays = (type: LeaveType, start: string, end: string): number => {
  const weight = LEAVE_DAY_WEIGHTS[type];
  if (type !== 'Full Day') return weight;
  return Math.round(weight * daysBetweenInclusive(start, end) * 100) / 100;
};

interface LeaveRecordsSheetProps {
  /** ISO window of the BS month currently shown by the parent panel. */
  startIso: string;
  endIso: string;
  monthLabel: string;
  /** Only admin and HR may add or delete rows. */
  canEdit: boolean;
}

const emptyDraft = () => ({
  id: 0,
  employeeId: '',
  recordDate: dateToIso(new Date()),
  leaveType: 'Full Day' as LeaveType,
  leaveStart: dateToIso(new Date()),
  leaveEnd: dateToIso(new Date()),
  reason: '',
  letterReceived: 'No' as 'Yes' | 'No',
});

export const LeaveRecordsSheet: React.FC<LeaveRecordsSheetProps> = ({
  startIso,
  endIso,
  monthLabel,
  canEdit,
}) => {
  const { users } = useHR();
  const [records, setRecords] = useState<LeaveRecordApi[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const activeEmployees = useMemo(
    () => users.filter(user => user.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  );

  const load = async () => {
    setBusy(true); setError('');
    try {
      const response = await listLeaveRecordsApi(startIso, endIso);
      setRecords(response.records || []);
    } catch (err: any) {
      setError(err?.message || 'Leave records could not be loaded.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, [startIso, endIso]);

  // Live preview of the side box while the form is open.
  const draftDays = calcLeaveDays(draft.leaveType, draft.leaveStart, draft.leaveEnd);

  const totals = useMemo(() => {
    const byType: Record<LeaveType, number> = { 'Full Day': 0, 'Half Day': 0, Hourly: 0 };
    let totalDays = 0;
    const employees = new Set<number>();
    let lettersMissing = 0;

    records.forEach(record => {
      byType[record.leaveType] = (byType[record.leaveType] || 0) + 1;
      totalDays += Number(record.leaveDays) || 0;
      employees.add(record.employeeId);
      if (record.letterReceived === 'No') lettersMissing += 1;
    });

    return {
      byType,
      totalDays: Math.round(totalDays * 100) / 100,
      employeeCount: employees.size,
      lettersMissing,
    };
  }, [records]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.employeeId) { setError('Please select an employee.'); return; }
    if (draft.leaveEnd < draft.leaveStart) { setError('Leave end cannot be before leave start.'); return; }

    setSaving(true); setError(''); setMessage('');
    try {
      const response = await saveLeaveRecordApi({
        id: draft.id || undefined,
        employeeId: Number(draft.employeeId),
        recordDate: draft.recordDate,
        leaveType: draft.leaveType,
        leaveStart: draft.leaveStart,
        leaveEnd: draft.leaveEnd,
        reason: draft.reason || undefined,
        letterReceived: draft.letterReceived,
      });
      setMessage(response.message || 'Leave record saved.');
      setDraft(emptyDraft());
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'The leave record could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (record: LeaveRecordApi) => {
    setDraft({
      id: record.id,
      employeeId: String(record.employeeId),
      recordDate: record.recordDate,
      leaveType: record.leaveType,
      leaveStart: record.leaveStart,
      leaveEnd: record.leaveEnd,
      reason: record.reason || '',
      letterReceived: record.letterReceived,
    });
    setShowForm(true);
    setError('');
  };

  const remove = async (id: number) => {
    setBusy(true); setError('');
    try {
      await deleteLeaveRecordApi(id);
      setMessage('Leave record deleted.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'The leave record could not be deleted.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-extrabold text-slate-900">
            <CalendarOff className="h-5 w-5" /> Leave Record
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {monthLabel} &middot; entered manually by HR from the leave letters received
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="btn-secondary flex items-center gap-2 text-xs">
            <RefreshCcw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => { setDraft(emptyDraft()); setShowForm(value => !value); setError(''); }}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              {showForm ? <><X className="h-3.5 w-3.5" /> Close</> : <><Plus className="h-3.5 w-3.5" /> Add Leave</>}
            </button>
          )}
        </div>
      </div>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-4">
        {/* ---------------- Sheet ---------------- */}
        <div className="lg:col-span-3 space-y-4">
          {showForm && canEdit && (
            <form onSubmit={submit} className="glass-card rounded-2xl border border-indigo-200 p-5">
              <h4 className="text-sm font-black text-slate-900">
                {draft.id ? 'Edit leave record' : 'New leave record'}
              </h4>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-bold text-slate-700">
                  Date
                  <input
                    type="date" required value={draft.recordDate}
                    onChange={e => setDraft({ ...draft, recordDate: e.target.value })}
                    className="input-field mt-1.5 w-full"
                  />
                </label>

                <label className="text-xs font-bold text-slate-700">
                  Employee Name
                  <select
                    required value={draft.employeeId}
                    onChange={e => setDraft({ ...draft, employeeId: e.target.value })}
                    className="input-field mt-1.5 w-full"
                  >
                    <option value="">— Select employee —</option>
                    {activeEmployees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}{employee.employeeCode ? ` (${employee.employeeCode})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-bold text-slate-700">
                  Type
                  <select
                    value={draft.leaveType}
                    onChange={e => setDraft({ ...draft, leaveType: e.target.value as LeaveType })}
                    className="input-field mt-1.5 w-full"
                  >
                    {LEAVE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-bold text-slate-700">
                  Leave Start
                  <input
                    type="date" required value={draft.leaveStart}
                    onChange={e => setDraft({ ...draft, leaveStart: e.target.value, leaveEnd: draft.leaveEnd < e.target.value ? e.target.value : draft.leaveEnd })}
                    className="input-field mt-1.5 w-full"
                  />
                </label>

                <label className="text-xs font-bold text-slate-700">
                  Leave Ends
                  <input
                    type="date" required min={draft.leaveStart} value={draft.leaveEnd}
                    onChange={e => setDraft({ ...draft, leaveEnd: e.target.value })}
                    className="input-field mt-1.5 w-full"
                  />
                </label>

                <label className="text-xs font-bold text-slate-700">
                  Letter Received
                  <select
                    value={draft.letterReceived}
                    onChange={e => setDraft({ ...draft, letterReceived: e.target.value as 'Yes' | 'No' })}
                    className="input-field mt-1.5 w-full"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </label>

                <label className="text-xs font-bold text-slate-700 sm:col-span-2 lg:col-span-3">
                  Reason for leave
                  <textarea
                    value={draft.reason}
                    onChange={e => setDraft({ ...draft, reason: e.target.value })}
                    placeholder="Why the leave was taken"
                    className="input-field mt-1.5 min-h-20 w-full"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-indigo-50 px-4 py-3">
                <div className="text-xs text-indigo-900">
                  <span className="font-bold">No of Leave Taken:</span>{' '}
                  <span className="text-lg font-black">{draftDays}</span>
                  <span className="ml-2 text-indigo-700">
                    ({draft.leaveType} &times; {draft.leaveType === 'Full Day'
                      ? `${daysBetweenInclusive(draft.leaveStart, draft.leaveEnd)} day span`
                      : 'single entry'})
                  </span>
                </div>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-xs disabled:opacity-50">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {draft.id ? 'Update record' : 'Save record'}
                </button>
              </div>
            </form>
          )}

          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-left text-slate-700">
                    <th className="p-3 font-bold">Date</th>
                    <th className="p-3 font-bold">Employee Name</th>
                    <th className="p-3 font-bold">Type</th>
                    <th className="p-3 font-bold">Leave Start</th>
                    <th className="p-3 font-bold">Leave Ends</th>
                    <th className="p-3 font-bold">Reason for leave</th>
                    <th className="p-3 text-center font-bold">Letter Received</th>
                    <th className="p-3 text-center font-bold">No of Leave Taken</th>
                    {canEdit && <th className="p-3" />}
                  </tr>
                </thead>
                <tbody>
                  {records.map(record => (
                    <tr key={record.id} className="nx-table-row border-b border-slate-100 last:border-0">
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{formatBs(adToBs(record.recordDate))}</div>
                        <div className="text-[10px] text-slate-400">{record.recordDate}</div>
                      </td>
                      <td className="p-3 font-bold text-slate-800">
                        {record.employeeName}
                        {record.employeeCode && <span className="ml-1 text-[10px] font-normal text-slate-400">({record.employeeCode})</span>}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${TYPE_STYLES[record.leaveType]}`}>
                          {record.leaveType}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600">{formatBs(adToBs(record.leaveStart))}</td>
                      <td className="p-3 whitespace-nowrap text-slate-600">{formatBs(adToBs(record.leaveEnd))}</td>
                      <td className="p-3 max-w-56 text-slate-600">{record.reason || '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                          record.letterReceived === 'Yes'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500'
                        }`}>
                          {record.letterReceived}
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm font-black text-slate-900">{record.leaveDays}</td>
                      {canEdit && (
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => startEdit(record)} className="text-[11px] font-bold text-indigo-600 hover:underline">
                              Edit
                            </button>
                            <button type="button" onClick={() => remove(record.id)} className="text-rose-600 hover:text-rose-800" aria-label="Delete leave record">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!records.length && !busy && (
              <p className="p-10 text-center text-sm text-slate-500">
                No leave has been recorded for {monthLabel}.
              </p>
            )}
            {busy && !records.length && (
              <p className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading leave records…
              </p>
            )}
          </div>
        </div>

        {/* ---------------- Side box ---------------- */}
        <aside className="glass-card h-fit rounded-2xl border border-slate-200 p-5">
          <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">Absent days this month</h4>
          <p className="mt-2 text-4xl font-black text-slate-900">{totals.totalDays}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Auto-calculated across {records.length} record(s) for {totals.employeeCount} employee(s).
          </p>

          <div className="mt-5 space-y-2 border-t border-slate-200 pt-4">
            {LEAVE_TYPES.map(type => (
              <div key={type} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${TYPE_STYLES[type]}`}>
                    {LEAVE_DAY_WEIGHTS[type]}
                  </span>
                  {type}
                </span>
                <span className="font-bold text-slate-800">{totals.byType[type] || 0}</span>
              </div>
            ))}
          </div>

          {totals.lettersMissing > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">
              {totals.lettersMissing} record(s) still have no leave letter received.
            </div>
          )}

          <p className="mt-4 border-t border-slate-200 pt-3 text-[10px] leading-relaxed text-slate-400">
            Full Day counts {LEAVE_DAY_WEIGHTS['Full Day']} per day of the span,
            Half Day {LEAVE_DAY_WEIGHTS['Half Day']}, Hourly {LEAVE_DAY_WEIGHTS.Hourly}.
          </p>
        </aside>
      </div>
    </div>
  );
};
