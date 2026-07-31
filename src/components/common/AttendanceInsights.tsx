import React, { useEffect, useMemo, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { listAttendanceRangeApi, type AttendanceRecordApi } from '../../lib/authApi';
import {
  bsMonthDays,
  bsMonthIsoRange,
  bsMonthKeyLabel,
  currentBsMonthKey,
  parseBsMonthKey,
  type BsMonthKey,
} from '../../lib/nepaliDate';

interface AttendanceInsightsProps {
  /** Defaults to the current BS month. */
  monthKey?: BsMonthKey;
  /** How many employees per chart. Default 5. */
  topN?: number;
}

interface Tally {
  employeeId: string;
  name: string;
  present: number;
  absent: number;
}

/**
 * Top 5 absent and top 5 present for a Bikram Sambat month.
 *
 * Counting matches the Phase 2 monthly grid exactly, so the numbers here and the
 * P / A columns on the sheet always agree:
 *   Present = 'Present' status + every Saturday (the weekly holiday)
 *   Absent  = 'Absent' only — Half Day, Late and On Leave are not absences
 *
 * Bars are plain divs. Adding a charting library for two bar lists would cost
 * far more bundle weight than it is worth.
 */
export const AttendanceInsights: React.FC<AttendanceInsightsProps> = ({
  monthKey = currentBsMonthKey(),
  topN = 5,
}) => {
  const [records, setRecords] = useState<AttendanceRecordApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const { startIso, endIso } = useMemo(() => bsMonthIsoRange(monthKey), [monthKey]);

  const saturdayCount = useMemo(() => {
    const { year, month } = parseBsMonthKey(monthKey);
    return bsMonthDays(year, month).filter(day => day.isSaturday).length;
  }, [monthKey]);

  useEffect(() => {
    let active = true;
    setLoading(true); setFailed(false);
    (async () => {
      try {
        const response = await listAttendanceRangeApi(startIso, endIso);
        if (active) setRecords(response.attendance || []);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [startIso, endIso]);

  const tallies = useMemo<Tally[]>(() => {
    const map = new Map<string, Tally>();

    records.forEach(record => {
      const employeeId = String(record.employeeId ?? record.employeeName);
      if (!map.has(employeeId)) {
        map.set(employeeId, { employeeId, name: record.employeeName, present: 0, absent: 0 });
      }
      const tally = map.get(employeeId)!;
      const status = (record.status || '').toLowerCase();

      // Saturdays are added in bulk below, so a stray Saturday row is not double counted.
      const iso = String(record.date).slice(0, 10);
      const isSaturday = new Date(`${iso}T00:00:00`).getDay() === 6;
      if (isSaturday) return;

      if (status.includes('present')) tally.present += 1;
      else if (status.includes('absent')) tally.absent += 1;
    });

    // Every employee is present on the weekly holiday.
    map.forEach(tally => { tally.present += saturdayCount; });

    return [...map.values()];
  }, [records, saturdayCount]);

  const topAbsent = useMemo(
    () => tallies
      .filter(t => t.absent > 0)
      .sort((a, b) => b.absent - a.absent || a.name.localeCompare(b.name))
      .slice(0, topN),
    [tallies, topN],
  );

  const topPresent = useMemo(
    () => tallies
      .filter(t => t.present > 0)
      .sort((a, b) => b.present - a.present || a.name.localeCompare(b.name))
      .slice(0, topN),
    [tallies, topN],
  );

  if (failed) return null;

  const renderChart = (
    title: string,
    icon: React.ReactNode,
    rows: Tally[],
    valueOf: (row: Tally) => number,
    barClass: string,
    emptyText: string,
  ) => {
    const max = Math.max(1, ...rows.map(valueOf));

    return (
      <div className="glass-card rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
            {icon} {title}
          </h3>
          <span className="text-[10px] font-bold text-slate-400">{bsMonthKeyLabel(monthKey)}</span>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-6 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-8 pb-4 text-center text-xs text-slate-400">{emptyText}</p>
        ) : (
          <ol className="mt-4 space-y-2.5">
            {rows.map((row, index) => {
              const value = valueOf(row);
              return (
                <li key={row.employeeId} className="flex items-center gap-2.5">
                  <span className="w-4 shrink-0 text-[10px] font-black text-slate-400">
                    {index + 1}
                  </span>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-600">
                    {(row.name || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-bold text-slate-800">{row.name}</div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${barClass}`}
                        style={{ width: `${Math.max(6, (value / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-black text-slate-900">
                    {value}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {renderChart(
        `Top ${topN} Absent This Month`,
        <TrendingDown className="h-4 w-4 text-rose-500" />,
        topAbsent,
        row => row.absent,
        'bg-rose-500',
        'No absences recorded this month.',
      )}
      {renderChart(
        `Top ${topN} Present This Month`,
        <TrendingUp className="h-4 w-4 text-emerald-500" />,
        topPresent,
        row => row.present,
        'bg-emerald-500',
        'No attendance recorded this month yet.',
      )}
    </div>
  );
};
