import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Fingerprint,
  Loader2,
  RefreshCcw,
} from 'lucide-react';
import {
  listAttendanceRangeApi,
  attendanceOverviewRangeApi,
  type AttendanceRecordApi,
} from '../../lib/authApi';
import { LeaveRecordsSheet } from './LeaveRecordsSheet';
import {
  bsMonthDays,
  bsMonthIsoRange,
  bsMonthKeyLabel,
  bsMonthKeyLabelNepali,
  currentBsMonthKey,
  shiftBsMonth,
  type BsMonthKey,
} from '../../lib/nepaliDate';

type Role = 'admin' | 'hr_manager' | 'team_member';
type Tab = 'summary' | 'monthly' | 'leave';

type StatusCode = 'P' | 'HD' | 'L' | 'LT' | 'A' | 'OFF' | '—';

const statusCode = (status?: string): StatusCode => {
  const value = (status || '').toLowerCase();
  if (value.includes('present')) return 'P';
  if (value.includes('half')) return 'HD';
  if (value.includes('leave')) return 'L';
  if (value.includes('late')) return 'LT';
  if (value.includes('holiday') || value.includes('weekend')) return 'OFF';
  if (value.includes('absent')) return 'A';
  return '—';
};

const codeClass = (code: StatusCode): string => ({
  P: 'bg-emerald-100 text-emerald-700',
  HD: 'bg-amber-100 text-amber-700',
  L: 'bg-blue-100 text-blue-700',
  LT: 'bg-orange-100 text-orange-700',
  A: 'bg-rose-100 text-rose-700',
  OFF: 'bg-slate-100 text-slate-500',
  '—': 'text-slate-300',
}[code]);

interface MonthlyRow {
  employeeId: string;
  name: string;
  /** Keyed by BS day number. */
  days: Record<number, { record?: AttendanceRecordApi; code: StatusCode; isSaturday: boolean }>;
  present: number;
  half: number;
  leave: number;
  absent: number;
  late: number;
}

export const AttendanceManagementPanel: React.FC<{ role: Role }> = ({ role }) => {
  const [monthKey, setMonthKey] = useState<BsMonthKey>(currentBsMonthKey());
  const [tab, setTab] = useState<Tab>('summary');
  const [records, setRecords] = useState<AttendanceRecordApi[]>([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const isManager = role === 'admin' || role === 'hr_manager';
  const canBrowseMonths = role === 'admin';
  const thisMonth = currentBsMonthKey();

  // A BS month straddles two AD months, so everything is fetched by ISO range.
  const { startIso, endIso } = useMemo(() => bsMonthIsoRange(monthKey), [monthKey]);
  const monthDays = useMemo(() => {
    const [year, month] = monthKey.split('-').map(Number);
    return bsMonthDays(year, month);
  }, [monthKey]);

  const load = async () => {
    setBusy(true); setMessage('');
    try {
      const [attendance, overview] = await Promise.all([
        listAttendanceRangeApi(startIso, endIso),
        attendanceOverviewRangeApi(startIso, endIso),
      ]);
      setRecords(attendance.attendance || []);
      const totals = overview.summary || ({} as typeof summary);
      setSummary({
        present: totals.present ?? 0,
        absent: totals.absent ?? 0,
        late: totals.late ?? 0,
        halfDay: totals.halfDay ?? 0,
        onLeave: totals.onLeave ?? 0,
      });
    } catch (err: any) {
      setMessage(err?.message || 'Attendance data could not be loaded.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, [startIso, endIso]);

  const cards: [string, number][] = [
    ['Present', summary.present],
    ['Absent', summary.absent],
    ['Late', summary.late],
    ['Half Day', summary.halfDay],
    ['On Leave', summary.onLeave],
  ];

  /**
   * Build the grid. Saturday is the weekly office holiday: everyone counts as
   * present whether or not the device recorded a punch.
   */
  const monthly = useMemo<MonthlyRow[]>(() => {
    const byIso = new Map<string, Map<string, AttendanceRecordApi>>();
    const employees = new Map<string, string>();

    records.forEach(record => {
      const iso = String(record.date).slice(0, 10);
      const employeeId = String(record.employeeId ?? record.employeeName);
      employees.set(employeeId, record.employeeName);
      if (!byIso.has(iso)) byIso.set(iso, new Map());
      byIso.get(iso)!.set(employeeId, record);
    });

    return [...employees.entries()]
      .map(([employeeId, name]) => {
        const row: MonthlyRow = {
          employeeId, name, days: {},
          present: 0, half: 0, leave: 0, absent: 0, late: 0,
        };

        monthDays.forEach(day => {
          const record = byIso.get(day.iso)?.get(employeeId);
          const code: StatusCode = day.isSaturday ? 'P' : statusCode(record?.status);
          row.days[day.bsDay] = { record, code, isSaturday: day.isSaturday };

          if (code === 'P') row.present += 1;
          else if (code === 'HD') row.half += 1;
          else if (code === 'L') row.leave += 1;
          else if (code === 'A') row.absent += 1;
          else if (code === 'LT') row.late += 1;
        });

        return row;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [records, monthDays]);

  const tabLabels: Record<Tab, string> = {
    summary: 'Summary',
    monthly: 'Monthly Attendance',
    leave: 'Leave Record',
  };
  const visibleTabs: Tab[] = isManager ? ['summary', 'monthly', 'leave'] : ['summary', 'monthly'];

  return (
    <div className="attendance-shell space-y-5">
      <style>{`
        @keyframes nxFadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes nxScaleIn{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:scale(1)}}
        .attendance-shell>*{animation:nxFadeUp .28s ease both}
        .nx-card{animation:nxScaleIn .3s ease both;transition:transform .2s ease,box-shadow .2s ease}
        .nx-card:hover{transform:translateY(-2px);box-shadow:0 16px 38px rgba(30,41,59,.09)}
        .nx-table-row{transition:background-color .16s ease}
        .nx-table-row:hover{background:#f8fafc}
        /* Saturday is the weekly holiday — the whole column is tinted. */
        .nx-sat{background:#fef2f2}
        .nx-sat-head{background:#fee2e2;color:#b91c1c}
        .nx-table-row:hover .nx-sat{background:#fee2e2}
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {role === 'team_member' ? 'My Attendance' : 'Attendance Management'}
          </h1>
          <p className="text-sm text-slate-500">
            <span className="nx-nepali">{bsMonthKeyLabelNepali(monthKey)}</span>
            {' · '}Sunday to Friday{' · '}Saturday holiday{' · '}8 required hours
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canBrowseMonths && (
            <>
              <button
                type="button"
                onClick={() => setMonthKey(key => shiftBsMonth(key, -1))}
                className="btn-secondary p-2"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-40 rounded-xl border bg-white px-3 py-2 text-center">
                <div className="text-sm font-bold text-slate-700">{bsMonthKeyLabel(monthKey)}</div>
                <div className="text-[10px] text-slate-400">{startIso} → {endIso}</div>
              </div>
              <button
                type="button"
                disabled={monthKey >= thisMonth}
                onClick={() => setMonthKey(key => shiftBsMonth(key, 1))}
                className="btn-secondary p-2 disabled:opacity-40"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          <button type="button" onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCcw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map(value => (
          <button
            type="button"
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              tab === value
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'border bg-white text-slate-600 hover:-translate-y-0.5'
            }`}
          >
            {tabLabels[value]}
          </button>
        ))}
      </div>

      {/* ---------------- Summary ---------------- */}
      {tab === 'summary' && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {cards.map(([label, value]) => (
              <div key={label} className="nx-card glass-card rounded-2xl p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </div>
            ))}
          </div>

          <div className="nx-card glass-card rounded-2xl p-5">
            <h3 className="flex items-center gap-2 font-extrabold">
              <Fingerprint className="h-5 w-5" /> Attendance source
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Attendance is recorded by the biometric device at the office entrance —
              nobody checks in or out from this app. Saturday is the weekly holiday and
              is counted as present for everyone.
            </p>
            {role === 'admin' && (
              <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                To load new punches, open <span className="font-bold">Attendance Settings</span> and
                drop the device&rsquo;s exported Excel or CSV file into the Biometric Attendance Import box.
              </p>
            )}
          </div>
        </>
      )}

      {/* ---------------- Monthly grid ---------------- */}
      {tab === 'monthly' && (
        <div className="nx-card glass-card overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
            <div>
              <h3 className="font-extrabold">Monthly Attendance Sheet</h3>
              <p className="mt-1 text-xs text-slate-500">
                {bsMonthKeyLabel(monthKey)} &middot; day numbers are Bikram Sambat
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold">
              {([['P', 'Present'], ['HD', 'Half Day'], ['L', 'Leave'], ['A', 'Absent'], ['LT', 'Late']] as [StatusCode, string][])
                .map(([code, label]) => (
                  <span key={code} className="flex items-center gap-1.5 text-slate-500">
                    <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 ${codeClass(code)}`}>{code}</span>
                    {label}
                  </span>
                ))}
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="nx-sat-head inline-block h-5 w-5 rounded" /> Saturday holiday
              </span>
            </div>
          </div>

          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full min-w-max text-xs">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-100 text-slate-700">
                  <th className="sticky left-0 z-30 min-w-44 bg-slate-100 p-3 text-left">Employee</th>
                  {monthDays.map(day => (
                    <th
                      key={day.bsDay}
                      title={`${day.iso} · ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.weekday]}`}
                      className={`min-w-10 p-2 text-center ${day.isSaturday ? 'nx-sat-head' : ''}`}
                    >
                      <div>{day.bsDay}</div>
                      <div className="text-[9px] font-normal opacity-60">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'][day.weekday]}
                      </div>
                    </th>
                  ))}
                  <th className="p-2">P</th>
                  <th className="p-2">HD</th>
                  <th className="p-2">L</th>
                  <th className="p-2">A</th>
                  <th className="p-2">LT</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map(row => (
                  <tr key={row.employeeId} className="nx-table-row border-t">
                    <td className="sticky left-0 z-10 bg-white p-3 font-bold text-slate-800">{row.name}</td>
                    {monthDays.map(day => {
                      const cell = row.days[day.bsDay];
                      const record = cell?.record;
                      const code = cell?.code ?? '—';
                      return (
                        <td
                          key={day.bsDay}
                          title={
                            day.isSaturday
                              ? `${day.iso} · Saturday holiday — counted present`
                              : record
                                ? `${day.iso} · ${record.checkIn || '—'} to ${record.checkOut || '—'} · ${record.workHours ?? '—'} hours`
                                : day.iso
                          }
                          className={`p-1 text-center ${day.isSaturday ? 'nx-sat' : ''}`}
                        >
                          <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1 font-bold ${codeClass(code)}`}>
                            {code}
                          </span>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-bold">{row.present}</td>
                    <td className="p-2 text-center font-bold">{row.half}</td>
                    <td className="p-2 text-center font-bold">{row.leave}</td>
                    <td className="p-2 text-center font-bold">{row.absent}</td>
                    <td className="p-2 text-center font-bold">{row.late}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!monthly.length && !busy && (
              <p className="p-10 text-center text-slate-500">
                No attendance records for {bsMonthKeyLabel(monthKey)}.
                {role === 'admin' && ' Import the biometric export from Attendance Settings.'}
              </p>
            )}
            {busy && !monthly.length && (
              <p className="flex items-center justify-center gap-2 p-10 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading attendance…
              </p>
            )}
          </div>
        </div>
      )}

      {/* ---------------- Leave record ---------------- */}
      {tab === 'leave' && isManager && (
        <div className="nx-card">
          <LeaveRecordsSheet
            startIso={startIso}
            endIso={endIso}
            monthLabel={bsMonthKeyLabel(monthKey)}
            canEdit={isManager}
          />
        </div>
      )}
    </div>
  );
};
