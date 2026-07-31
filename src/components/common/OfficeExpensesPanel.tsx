import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import {
  listOfficeExpensesApi,
  saveOfficeExpenseApi,
  deleteOfficeExpenseApi,
  officeExpenseStoresApi,
  getOfficeExpensePhotosApi,
  EXPENSE_BILL_TYPES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_PURCHASE_GROUPS,
  type OfficeExpense,
  type ExpenseBillType,
  type ExpensePaymentMethod,
  type ExpensePurchaseGroup,
} from '../../lib/authApi';
import {
  adToBs,
  bsMonthIsoRange,
  bsMonthKeyForIso,
  bsMonthKeyLabel,
  currentBsMonthKey,
  dateToIso,
  formatBs,
  recentBsMonthKeys,
  shiftBsMonth,
  type BsMonthKey,
} from '../../lib/nepaliDate';

type Tab = 'this_month' | 'past_month' | 'filter';

interface OfficeExpensesPanelProps {
  /** Accountant is read-only until that role's scope is confirmed. */
  canEdit?: boolean;
}

const GROUP_COLORS: Record<ExpensePurchaseGroup, string> = {
  Kitchen: 'bg-orange-500',
  Entertainment: 'bg-purple-500',
  Stationaries: 'bg-blue-500',
  Electronic: 'bg-cyan-500',
  Operation: 'bg-emerald-500',
  Other: 'bg-slate-400',
};

const GROUP_CHIPS: Record<ExpensePurchaseGroup, string> = {
  Kitchen: 'bg-orange-50 text-orange-700 border-orange-200',
  Entertainment: 'bg-purple-50 text-purple-700 border-purple-200',
  Stationaries: 'bg-blue-50 text-blue-700 border-blue-200',
  Electronic: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Operation: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Other: 'bg-slate-100 text-slate-600 border-slate-200',
};

/** Nepali rupee formatting with thousands separators. */
const money = (value: number): string =>
  `Rs ${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const emptyDraft = () => ({
  id: 0,
  expenseDate: dateToIso(new Date()),
  storeName: '',
  billType: 'Local bill' as ExpenseBillType,
  items: '',
  amount: '',
  qty: '1',
  paymentMethod: 'Cash' as ExpensePaymentMethod,
  billReceived: 'No' as 'Yes' | 'No',
  purchaseGroup: 'Kitchen' as ExpensePurchaseGroup,
  purchaseGroupOther: '',
  billPhoto: null as { fileName: string; mimeType: string; data: string } | null,
});

/**
 * Office Expenses — entered by the operation manager.
 *
 * All grouping is by Bikram Sambat month. Because a BS month straddles two AD
 * months, the panel asks the API for the AD range that covers the BS month
 * rather than a 'YYYY-MM' key.
 */
export const OfficeExpensesPanel: React.FC<OfficeExpensesPanelProps> = ({ canEdit = true }) => {
  const [tab, setTab] = useState<Tab>('this_month');
  const [monthKey, setMonthKey] = useState<BsMonthKey>(currentBsMonthKey());
  const [expenses, setExpenses] = useState<OfficeExpense[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const thisMonth = currentBsMonthKey();

  // Which BS month each tab is looking at.
  const activeMonth: BsMonthKey =
    tab === 'this_month' ? thisMonth :
    tab === 'past_month' ? shiftBsMonth(thisMonth, -1) :
    monthKey;

  // The filter tab charts the last five months, so it needs a wider fetch.
  const chartMonths = useMemo(() => recentBsMonthKeys(5, activeMonth), [activeMonth]);
  const fetchRange = useMemo(() => {
    if (tab !== 'filter') return bsMonthIsoRange(activeMonth);
    const oldest = chartMonths[chartMonths.length - 1];
    return {
      startIso: bsMonthIsoRange(oldest).startIso,
      endIso: bsMonthIsoRange(activeMonth).endIso,
    };
  }, [tab, activeMonth, chartMonths]);

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const response = await listOfficeExpensesApi(fetchRange.startIso, fetchRange.endIso);
      setExpenses(response.expenses || []);
    } catch (err: any) {
      setError(err?.message || 'Expenses could not be loaded.');
    } finally {
      setBusy(false);
    }
  }, [fetchRange.startIso, fetchRange.endIso]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    officeExpenseStoresApi()
      .then(response => setStores(response.stores || []))
      .catch(() => setStores([]));
  }, [expenses.length]);

  /** Rows belonging to one BS month. */
  const rowsForMonth = useCallback(
    (key: BsMonthKey) => expenses.filter(e => bsMonthKeyForIso(e.expenseDate) === key),
    [expenses],
  );

  const visibleRows = useMemo(() => rowsForMonth(activeMonth), [rowsForMonth, activeMonth]);

  const draftNet = (Number(draft.amount) || 0) * (Number(draft.qty) || 0);

  const handlePhoto = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setError('Bill photo must be under 5 MB.'); return; }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.readAsDataURL(file);
    });
    setDraft(current => ({ ...current, billPhoto: { fileName: file.name, mimeType: file.type, data } }));
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.storeName.trim()) { setError('Store name is required.'); return; }
    if (draft.purchaseGroup === 'Other' && !draft.purchaseGroupOther.trim()) {
      setError('Please describe the "Other" purchase group.'); return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await saveOfficeExpenseApi({
        id: draft.id || undefined,
        expenseDate: draft.expenseDate,
        storeName: draft.storeName.trim(),
        billType: draft.billType,
        items: draft.items || undefined,
        amount: Number(draft.amount) || 0,
        qty: Number(draft.qty) || 0,
        paymentMethod: draft.paymentMethod,
        billReceived: draft.billReceived,
        purchaseGroup: draft.purchaseGroup,
        purchaseGroupOther: draft.purchaseGroup === 'Other' ? draft.purchaseGroupOther.trim() : undefined,
        billPhoto: draft.billPhoto,
      });
      setMessage(response.message || 'Expense saved.');
      setDraft(emptyDraft());
      setShowForm(false);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err: any) {
      setError(err?.message || 'The expense could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (expense: OfficeExpense) => {
    setDraft({
      id: expense.id,
      expenseDate: expense.expenseDate,
      storeName: expense.storeName,
      billType: expense.billType,
      items: expense.items || '',
      amount: String(expense.amount),
      qty: String(expense.qty),
      paymentMethod: expense.paymentMethod,
      billReceived: expense.billReceived,
      purchaseGroup: expense.purchaseGroup,
      purchaseGroupOther: expense.purchaseGroupOther || '',
      billPhoto: null,
    });
    setShowForm(true); setError('');
  };

  const remove = async (id: number) => {
    setBusy(true); setError('');
    try {
      await deleteOfficeExpenseApi(id);
      setMessage('Expense deleted.');
      await load();
    } catch (err: any) {
      setError(err?.message || 'The expense could not be deleted.');
    } finally {
      setBusy(false);
    }
  };

  const openPhoto = async (expenseId: number) => {
    try {
      const response = await getOfficeExpensePhotosApi(expenseId);
      const first = response.photos?.[0];
      if (first) setViewingPhoto(first.data);
      else setError('No bill photo attached to this entry.');
    } catch (err: any) {
      setError(err?.message || 'The bill photo could not be loaded.');
    }
  };

  /* ---------------- Aggregations for the filter tab ---------------- */

  const groupTotals = useMemo(() => {
    const totals = Object.fromEntries(
      EXPENSE_PURCHASE_GROUPS.map(g => [g, 0]),
    ) as Record<ExpensePurchaseGroup, number>;
    visibleRows.forEach(row => { totals[row.purchaseGroup] += row.netAmount; });
    return totals;
  }, [visibleRows]);

  const monthTotal = useMemo(
    () => visibleRows.reduce((sum, row) => sum + row.netAmount, 0),
    [visibleRows],
  );

  const monthlyTrend = useMemo(
    () => [...chartMonths].reverse().map(key => ({
      key,
      label: bsMonthKeyLabel(key),
      total: rowsForMonth(key).reduce((sum, row) => sum + row.netAmount, 0),
    })),
    [chartMonths, rowsForMonth],
  );

  const trendMax = Math.max(1, ...monthlyTrend.map(m => m.total));
  // Iterate the known constant rather than Object.values: a Record keyed by a
  // string-literal union has no index signature, so Object.values widens to unknown[].
  const groupMax = Math.max(1, ...EXPENSE_PURCHASE_GROUPS.map(group => groupTotals[group]));

  /* ---------------- Render ---------------- */

  const tabLabels: Record<Tab, string> = {
    this_month: 'This Month Bills',
    past_month: 'Past Month Expenses',
    filter: 'Expenses Filter',
  };

  const renderTable = (rows: OfficeExpense[], editable: boolean) => (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-left text-slate-700">
              <th className="p-3 font-bold">Date</th>
              <th className="p-3 font-bold">Store Name</th>
              <th className="p-3 font-bold">Bill Type</th>
              <th className="p-3 font-bold">Items</th>
              <th className="p-3 text-right font-bold">Amount</th>
              <th className="p-3 text-right font-bold">Qty</th>
              <th className="p-3 text-right font-bold">Net Amount</th>
              <th className="p-3 font-bold">Payment</th>
              <th className="p-3 text-center font-bold">Bill</th>
              <th className="p-3 font-bold">Purchase Group</th>
              <th className="p-3 text-center font-bold">Photo</th>
              {editable && <th className="p-3" />}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="nx-table-row border-b border-slate-100 last:border-0">
                <td className="p-3 whitespace-nowrap">
                  <div className="font-bold text-slate-800">{formatBs(adToBs(row.expenseDate))}</div>
                  <div className="text-[10px] text-slate-400">{row.expenseDate}</div>
                </td>
                <td className="p-3 font-bold text-slate-800">{row.storeName}</td>
                <td className="p-3 text-slate-600">{row.billType}</td>
                <td className="p-3 max-w-48 truncate text-slate-600" title={row.items || ''}>{row.items || '—'}</td>
                <td className="p-3 text-right text-slate-600">{money(row.amount)}</td>
                <td className="p-3 text-right text-slate-600">{row.qty}</td>
                <td className="p-3 text-right font-black text-slate-900">{money(row.netAmount)}</td>
                <td className="p-3 text-slate-600">{row.paymentMethod}</td>
                <td className="p-3 text-center">
                  <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                    row.billReceived === 'Yes'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}>{row.billReceived}</span>
                </td>
                <td className="p-3">
                  <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold ${GROUP_CHIPS[row.purchaseGroup]}`}>
                    {row.purchaseGroup === 'Other' && row.purchaseGroupOther
                      ? `Other — ${row.purchaseGroupOther}`
                      : row.purchaseGroup}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {row.photoCount > 0 ? (
                    <button type="button" onClick={() => openPhoto(row.id)} className="text-indigo-600 hover:text-indigo-800" aria-label="View bill photo">
                      <ImageIcon className="h-4 w-4" />
                    </button>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                {editable && (
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => startEdit(row)} className="text-[11px] font-bold text-indigo-600 hover:underline">Edit</button>
                      <button type="button" onClick={() => remove(row.id)} className="text-rose-600 hover:text-rose-800" aria-label="Delete expense">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-black text-slate-900">
                <td className="p-3" colSpan={6}>Total — {rows.length} bill(s)</td>
                <td className="p-3 text-right">{money(rows.reduce((sum, r) => sum + r.netAmount, 0))}</td>
                <td className="p-3" colSpan={editable ? 5 : 4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {!rows.length && !busy && (
        <p className="p-10 text-center text-sm text-slate-500">No expenses recorded for {bsMonthKeyLabel(activeMonth)}.</p>
      )}
      {busy && !rows.length && (
        <p className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading expenses…
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <style>{`
        .nx-table-row{transition:background-color .16s ease}
        .nx-table-row:hover{background:#f8fafc}
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <Wallet className="h-6 w-6" /> Office Expenses
          </h1>
          <p className="text-sm text-slate-500">
            {bsMonthKeyLabel(activeMonth)} &middot; grouped by Nepali month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="btn-secondary flex items-center gap-2 text-xs">
            <RefreshCcw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {canEdit && tab === 'this_month' && (
            <button
              type="button"
              onClick={() => { setDraft(emptyDraft()); setShowForm(v => !v); setError(''); }}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              {showForm ? <><X className="h-3.5 w-3.5" /> Close</> : <><Plus className="h-3.5 w-3.5" /> Add Bill</>}
            </button>
          )}
        </div>
      </div>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {(['this_month', 'past_month', 'filter'] as Tab[]).map(value => (
          <button
            type="button"
            key={value}
            onClick={() => { setTab(value); setShowForm(false); }}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              tab === value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'border bg-white text-slate-600 hover:-translate-y-0.5'
            }`}
          >
            {tabLabels[value]}
          </button>
        ))}
      </div>

      {/* ---------------- Entry form ---------------- */}
      {showForm && canEdit && tab === 'this_month' && (
        <form onSubmit={submit} className="glass-card rounded-2xl border border-indigo-200 p-5">
          <h4 className="text-sm font-black text-slate-900">{draft.id ? 'Edit bill' : 'New bill'}</h4>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold text-slate-700">
              Date
              <input type="date" required value={draft.expenseDate}
                onChange={e => setDraft({ ...draft, expenseDate: e.target.value })}
                className="input-field mt-1.5 w-full" />
              <span className="nx-nepali mt-1 block text-[10px] text-slate-400">
                {draft.expenseDate ? formatBs(adToBs(draft.expenseDate)) : ''}
              </span>
            </label>

            <label className="text-xs font-bold text-slate-700">
              Store Name
              <input type="text" required list="nx-store-names" value={draft.storeName}
                onChange={e => setDraft({ ...draft, storeName: e.target.value })}
                placeholder="Start typing…" className="input-field mt-1.5 w-full" />
              <datalist id="nx-store-names">
                {stores.map(store => <option key={store} value={store} />)}
              </datalist>
            </label>

            <label className="text-xs font-bold text-slate-700">
              Bill Type
              <select value={draft.billType}
                onChange={e => setDraft({ ...draft, billType: e.target.value as ExpenseBillType })}
                className="input-field mt-1.5 w-full">
                {EXPENSE_BILL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>

            <label className="text-xs font-bold text-slate-700">
              Payment Method
              <select value={draft.paymentMethod}
                onChange={e => setDraft({ ...draft, paymentMethod: e.target.value as ExpensePaymentMethod })}
                className="input-field mt-1.5 w-full">
                {EXPENSE_PAYMENT_METHODS.map(method => <option key={method} value={method}>{method}</option>)}
              </select>
            </label>

            <label className="text-xs font-bold text-slate-700">
              Amount
              <input type="number" min="0" step="0.01" required value={draft.amount}
                onChange={e => setDraft({ ...draft, amount: e.target.value })}
                className="input-field mt-1.5 w-full" />
            </label>

            <label className="text-xs font-bold text-slate-700">
              Qty
              <input type="number" min="0" step="0.01" required value={draft.qty}
                onChange={e => setDraft({ ...draft, qty: e.target.value })}
                className="input-field mt-1.5 w-full" />
            </label>

            <label className="text-xs font-bold text-slate-700">
              Net Amount
              <input type="text" readOnly value={money(draftNet)}
                title="Calculated as amount × quantity"
                className="input-field mt-1.5 w-full cursor-not-allowed bg-slate-50 text-slate-500" />
            </label>

            <label className="text-xs font-bold text-slate-700">
              Bill Received
              <select value={draft.billReceived}
                onChange={e => setDraft({ ...draft, billReceived: e.target.value as 'Yes' | 'No' })}
                className="input-field mt-1.5 w-full">
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </label>

            <label className="text-xs font-bold text-slate-700">
              Purchase Group
              <select value={draft.purchaseGroup}
                onChange={e => setDraft({ ...draft, purchaseGroup: e.target.value as ExpensePurchaseGroup })}
                className="input-field mt-1.5 w-full">
                {EXPENSE_PURCHASE_GROUPS.map(group => <option key={group} value={group}>{group}</option>)}
              </select>
            </label>

            {draft.purchaseGroup === 'Other' && (
              <label className="text-xs font-bold text-slate-700">
                Mention other
                <input type="text" required value={draft.purchaseGroupOther}
                  onChange={e => setDraft({ ...draft, purchaseGroupOther: e.target.value })}
                  placeholder="Describe the group" className="input-field mt-1.5 w-full" />
              </label>
            )}

            <label className="text-xs font-bold text-slate-700 sm:col-span-2">
              Items
              <input type="text" value={draft.items}
                onChange={e => setDraft({ ...draft, items: e.target.value })}
                placeholder="What was purchased" className="input-field mt-1.5 w-full" />
            </label>

            <label className="text-xs font-bold text-slate-700 sm:col-span-2">
              Insert Bill (photo)
              <div className="mt-1.5 flex items-center gap-2">
                <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-3 py-2.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50">
                  <Upload className="h-3.5 w-3.5" />
                  {draft.billPhoto ? draft.billPhoto.fileName : 'Attach bill photo (max 5 MB)'}
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) void handlePhoto(f); }} />
                </label>
                {draft.billPhoto && (
                  <button type="button" onClick={() => { setDraft({ ...draft, billPhoto: null }); if (fileRef.current) fileRef.current.value = ''; }}
                    className="rounded-lg bg-rose-50 p-2 text-rose-600" aria-label="Remove photo">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-indigo-50 px-4 py-3">
            <div className="text-xs text-indigo-900">
              <span className="font-bold">Net Amount:</span>{' '}
              <span className="text-lg font-black">{money(draftNet)}</span>
              <span className="ml-2 text-indigo-700">(amount &times; qty)</span>
            </div>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-xs disabled:opacity-50">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {draft.id ? 'Update bill' : 'Save bill'}
            </button>
          </div>
        </form>
      )}

      {/* ---------------- Tables ---------------- */}
      {tab === 'this_month' && renderTable(visibleRows, canEdit)}
      {tab === 'past_month' && renderTable(visibleRows, false)}

      {/* ---------------- Filter + charts ---------------- */}
      {tab === 'filter' && (
        <div className="space-y-4">
          <div className="glass-card flex flex-wrap items-end gap-3 rounded-2xl p-5">
            <label className="text-xs font-bold text-slate-700">
              Choose Nepali month
              <select value={monthKey} onChange={e => setMonthKey(e.target.value)} className="input-field mt-1.5 min-w-48">
                {recentBsMonthKeys(24, thisMonth).map(key => (
                  <option key={key} value={key}>{bsMonthKeyLabel(key)}</option>
                ))}
              </select>
            </label>
            <div className="rounded-xl bg-slate-50 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total expenses</p>
              <p className="text-2xl font-black text-slate-900">{money(monthTotal)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Bills</p>
              <p className="text-2xl font-black text-slate-900">{visibleRows.length}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* By purchase group */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-black text-slate-900">By purchase group</h3>
              <p className="text-[10px] text-slate-400">{bsMonthKeyLabel(activeMonth)}</p>
              <ul className="mt-4 space-y-3">
                {EXPENSE_PURCHASE_GROUPS.map(group => (
                  <li key={group}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">{group}</span>
                      <span className="font-black text-slate-900">{money(groupTotals[group])}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full transition-all ${GROUP_COLORS[group]}`}
                        style={{ width: `${(groupTotals[group] / groupMax) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Last 5 Nepali months */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-black text-slate-900">Last 5 months</h3>
              <p className="text-[10px] text-slate-400">Total expenses per Nepali month</p>
              <div className="mt-6 flex h-48 items-end justify-between gap-3">
                {monthlyTrend.map(month => (
                  <div key={month.key} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] font-black text-slate-700">
                      {month.total > 0 ? Math.round(month.total).toLocaleString('en-IN') : '—'}
                    </span>
                    <div
                      className={`w-full rounded-t-lg transition-all ${month.key === activeMonth ? 'bg-indigo-600' : 'bg-indigo-300'}`}
                      style={{ height: `${Math.max(3, (month.total / trendMax) * 100)}%` }}
                      title={`${month.label}: ${money(month.total)}`}
                    />
                    <span className="text-center text-[9px] leading-tight text-slate-500">
                      {month.label.split(' ')[1]}
                      <br />
                      {month.label.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {renderTable(visibleRows, false)}
        </div>
      )}

      {/* ---------------- Photo viewer ---------------- */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setViewingPhoto(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h4 className="text-sm font-black text-slate-900">Bill photo</h4>
              <button type="button" onClick={() => setViewingPhoto(null)} className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[76vh] overflow-auto p-4">
              {viewingPhoto.startsWith('data:application/pdf')
                ? <iframe src={viewingPhoto} title="Bill" className="h-[70vh] w-full rounded-xl border border-slate-200" />
                : <img src={viewingPhoto} alt="Bill" className="mx-auto max-w-full rounded-xl" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
