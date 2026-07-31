import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  listPendingUrgentNoticesApi,
  acknowledgeNoticeApi,
  type PendingUrgentNotice,
} from '../../lib/authApi';
import { adToBs, formatBsNepali } from '../../lib/nepaliDate';

interface UrgentNoticeModalProps {
  /** Re-check whenever this changes — the active tab, for example. */
  refreshKey?: string;
}

/**
 * Blocking modal for urgent notices.
 *
 * Deliberately NOT dismissible by backdrop click or Escape: the point of an
 * urgent notice is that the person confirms they read it. Acknowledgement is
 * recorded server-side, so it never reappears for that user after being read.
 * Several pending notices are queued rather than stacked.
 */
export const UrgentNoticeModal: React.FC<UrgentNoticeModalProps> = ({ refreshKey }) => {
  const [queue, setQueue] = useState<PendingUrgentNotice[]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await listPendingUrgentNoticesApi();
      setQueue(response.notices || []);
      setIndex(0);
    } catch {
      // Silent: a failed poll must not interrupt whatever the user is doing.
      setQueue([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const current = queue[index];

  // Keep focus inside the modal and swallow Escape while it is open.
  useEffect(() => {
    if (!current) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); }
    };
    document.addEventListener('keydown', onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [current]);

  if (!current) return null;

  const acknowledge = async () => {
    setBusy(true); setError('');
    try {
      await acknowledgeNoticeApi(current.id);
      if (index + 1 < queue.length) setIndex(index + 1);
      else setQueue([]);
    } catch (err: any) {
      setError(err?.message || 'Could not record your acknowledgement. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="urgent-notice-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-rose-200 bg-rose-50 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-700">
              Urgent Notice
            </p>
            <h2 id="urgent-notice-title" className="mt-0.5 text-base font-black leading-tight text-slate-900">
              {current.title}
            </h2>
          </div>
          {queue.length > 1 && (
            <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-rose-700">
              {index + 1} of {queue.length}
            </span>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {current.content}
          </p>
        </div>

        <div className="border-t border-slate-200 px-5 py-3 text-[11px] text-slate-500">
          Posted by <span className="font-bold text-slate-700">{current.postedByName}</span>
          <span className="nx-nepali ml-1.5">
            &middot; {formatBsNepali(adToBs(String(current.createdAt).slice(0, 10)))}
          </span>
        </div>

        {error && (
          <div className="border-t border-rose-200 bg-rose-50 px-5 py-2.5 text-xs text-rose-800">
            {error}
          </div>
        )}

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={acknowledge}
            className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            I have read this notice
          </button>
        </div>
      </div>
    </div>
  );
};
