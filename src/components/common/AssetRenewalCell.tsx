import React from 'react';

interface AssetRenewalCellProps {
  issuedDate: string;
  /** Expected return date. When present it drives the interval. */
  returnDate?: string | null;
  /** Legacy stored value, used only when no return date is set. */
  renewalIntervalDays?: number | null;
}

/** Whole days between two ISO dates. */
export const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round(
    (new Date(`${toIso}T00:00:00`).getTime() - new Date(`${fromIso}T00:00:00`).getTime()) / 86400000,
  );

/**
 * Renew-after interval, auto-calculated as expectedReturnDate - issuedDate.
 * Assets created before this change may have a stored interval but no return
 * date, so that value is kept as a fallback rather than showing "Not set".
 */
export const resolveRenewalDays = (
  issuedDate?: string | null,
  returnDate?: string | null,
  storedDays?: number | null,
): number | null => {
  if (issuedDate && returnDate) {
    const days = daysBetween(issuedDate, returnDate);
    return Number.isFinite(days) ? days : null;
  }
  return storedDays ?? null;
};

export const AssetRenewalCell: React.FC<AssetRenewalCellProps> = ({
  issuedDate,
  returnDate,
  renewalIntervalDays,
}) => {
  const intervalDays = resolveRenewalDays(issuedDate, returnDate, renewalIntervalDays);
  if (!issuedDate || intervalDays === null) return <span className="text-slate-400">Not set</span>;

  const start = new Date(`${issuedDate}T00:00:00`).getTime();
  const due = new Date(`${issuedDate}T00:00:00`);
  due.setDate(due.getDate() + intervalDays);
  const end = due.getTime();
  const now = Date.now();
  const progress = Math.max(0, Math.min(100, ((now - start) / Math.max(1, end - start)) * 100));
  const daysRemaining = Math.ceil((end - now) / 86400000);

  return (
    <div className="min-w-[120px] space-y-1">
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
        <span className="text-slate-500">{due.toLocaleDateString()}</span>
        <span className={daysRemaining < 0 ? 'text-red-600' : daysRemaining <= 30 ? 'text-amber-600' : 'text-indigo-600'}>
          {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`}
        </span>
      </div>
      <div className="asset-renewal-track"><div className="asset-renewal-fill" style={{ width: `${progress}%` }} /></div>
      <div className="text-[9px] text-slate-400">renew after {intervalDays}d</div>
    </div>
  );
};
