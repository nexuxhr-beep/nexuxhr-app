import React, { useEffect, useState } from 'react';
import { Cake, Gift } from 'lucide-react';
import { listUpcomingBirthdaysApi, type UpcomingBirthday } from '../../lib/authApi';
import { adToBs, formatBsNepali } from '../../lib/nepaliDate';

interface UpcomingBirthdaysProps {
  /** How far ahead to look. Default 60 days. */
  withinDays?: number;
  /** How many to show before collapsing into "+N more". Default 5. */
  limit?: number;
}

const relativeLabel = (daysUntil: number): string => {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `in ${daysUntil} days`;
};

/**
 * "Whose birthday is next" card, shown on every role's home dashboard.
 *
 * The endpoint returns no birth year and no age, so nothing sensitive is on the
 * wire even though a team member can call it. If the request fails the card
 * removes itself rather than showing an error — it is decorative and must never
 * break the dashboard around it.
 */
export const UpcomingBirthdays: React.FC<UpcomingBirthdaysProps> = ({
  withinDays = 60,
  limit = 5,
}) => {
  const [birthdays, setBirthdays] = useState<UpcomingBirthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await listUpcomingBirthdaysApi(withinDays);
        if (active) setBirthdays(response.birthdays || []);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [withinDays]);

  if (failed) return null;

  const shown = birthdays.slice(0, limit);
  const extra = birthdays.length - shown.length;

  return (
    <div className="glass-card rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
          <Cake className="h-4 w-4 text-pink-500" /> Upcoming Birthdays
        </h3>
        {birthdays.length > 0 && (
          <span className="rounded-lg bg-pink-50 px-2 py-0.5 text-[10px] font-bold text-pink-700">
            next {withinDays} days
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 space-y-2.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
                <div className="h-2 w-1/4 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="mt-6 flex flex-col items-center gap-2 py-4 text-center text-xs text-slate-400">
          <Gift className="h-6 w-6 text-slate-300" />
          No birthdays in the next {withinDays} days.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {shown.map(person => {
            const isToday = person.daysUntil === 0;
            return (
              <li
                key={person.userId}
                className={`flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${
                  isToday ? 'bg-pink-50 ring-1 ring-pink-200' : 'hover:bg-slate-50'
                }`}
              >
                {person.profilePhoto ? (
                  <img
                    src={person.profilePhoto}
                    alt={person.name}
                    className="h-9 w-9 shrink-0 rounded-xl border border-white object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-black text-indigo-700">
                    {(person.name || '?').trim().charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-slate-800">
                    {person.name}
                    {isToday && <span className="ml-1.5">🎂</span>}
                  </div>
                  <div className="nx-nepali truncate text-[10px] text-slate-500">
                    {formatBsNepali(adToBs(person.nextDateIso))}
                    <span className="ml-1.5 text-slate-400">
                      {new Date(`${person.nextDateIso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                    isToday
                      ? 'bg-pink-600 text-white'
                      : person.daysUntil <= 7
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {relativeLabel(person.daysUntil)}
                </span>
              </li>
            );
          })}

          {extra > 0 && (
            <li className="pt-1 text-center text-[10px] font-bold text-slate-400">
              +{extra} more in the next {withinDays} days
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
