import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { Company } from '../../lib/authApi';

interface DeleteCompanyModalProps {
  company: Company;
  deleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (confirmationName: string) => Promise<void>;
}

export const DeleteCompanyModal: React.FC<DeleteCompanyModalProps> = ({
  company,
  deleting,
  error,
  onCancel,
  onConfirm,
}) => {
  const [confirmation, setConfirmation] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = confirmation.trim() === company.name;

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleting, onCancel]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!matches || deleting) return;
    await onConfirm(confirmation.trim());
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => {
      if (event.currentTarget === event.target && !deleting) onCancel();
    }}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="delete-company-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-rose-50 p-2.5 text-rose-600"><AlertTriangle className="h-5 w-5" /></span>
            <div>
              <h3 id="delete-company-title" className="text-lg font-black text-slate-900">Delete {company.name}?</h3>
              <p className="mt-1 text-sm text-slate-500">This permanently removes the company and all of its tenant data.</p>
            </div>
          </div>
          <button type="button" disabled={deleting} onClick={onCancel} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40" aria-label="Close delete dialog"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <strong>Cannot be undone.</strong> Users, attendance, tasks, requests, documents, notices, assets, invitations, and related records for this company will be deleted.
          </div>

          {error && <div className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-700">{error}</div>}

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-700">Type <span className="select-all text-rose-600">{company.name}</span> to confirm</span>
            <input
              ref={inputRef}
              value={confirmation}
              disabled={deleting}
              onChange={event => setConfirmation(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-4 ${matches ? 'border-emerald-400 focus:ring-emerald-100' : 'border-slate-200 focus:border-rose-400 focus:ring-rose-100'}`}
              placeholder={company.name}
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" disabled={deleting} onClick={onCancel} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40">Cancel</button>
          <button type="submit" disabled={!matches || deleting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-45">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? 'Deleting company...' : 'Permanently delete'}
          </button>
        </div>
      </form>
    </div>
  );
};
