import React, { useEffect, useMemo, useState } from 'react';
import { useHR } from '../../context/HRContext';
import { AssetDetail } from '../../lib/authApi';
import { resolveRenewalDays } from '../common/AssetRenewalCell';
import {
  CalendarClock,
  CheckCircle2,
  Edit3,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

interface AssetDetailModalProps {
  assetId: string;
  onClose: () => void;
}

type Status = 'active' | 'returned' | 'lost' | 'damaged';

type EditState = {
  modelName: string;
  imei1: string;
  imei2: string;
  deviceType: string;
  brandModel: string;
  processor: string;
  deviceId: string;
  operatingSystem: string;
  issuedDate: string;
  returnDate: string;
  renewalIntervalDays: string;
  purpose: string;
  accessories: string;
  status: Status;
};

const emptyEditState: EditState = {
  modelName: '', imei1: '', imei2: '', deviceType: '', brandModel: '', processor: '', deviceId: '', operatingSystem: '',
  issuedDate: '', returnDate: '', renewalIntervalDays: '', purpose: '', accessories: '', status: 'active',
};

const Row = ({ label, value }: { label: string; value?: React.ReactNode }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="break-words text-right font-bold text-slate-900">{value}</span>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text', min, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; readOnly?: boolean }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-extrabold text-slate-600">{label}</span>
    <input
      type={type}
      min={min}
      value={value}
      readOnly={readOnly}
      onChange={event => onChange(event.target.value)}
      className={`glass-input w-full rounded-xl px-3 py-2.5 text-xs ${readOnly ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''}`}
    />
  </label>
);

const datePlusDays = (date: string, days?: number | null) => {
  if (!date || !days) return null;
  const result = new Date(`${date}T00:00:00`);
  result.setDate(result.getDate() + days);
  return result;
};

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ assetId, onClose }) => {
  const { activeRole, getAssetDetailAction, updateAsset } = useHR();
  const canEdit = activeRole === 'admin' || activeRole === 'hr_manager';
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [edit, setEdit] = useState<EditState>(emptyEditState);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const applyAsset = (detail: AssetDetail) => {
    setAsset(detail);
    setEdit({
      modelName: detail.modelName || '',
      imei1: detail.imei1 || '',
      imei2: detail.imei2 || '',
      deviceType: detail.deviceType || '',
      brandModel: detail.brandModel || '',
      processor: detail.processor || '',
      deviceId: detail.deviceId || '',
      operatingSystem: detail.operatingSystem || '',
      issuedDate: detail.issuedDate || '',
      returnDate: detail.returnDate || '',
      renewalIntervalDays: detail.renewalIntervalDays ? String(detail.renewalIntervalDays) : '',
      purpose: detail.purpose || '',
      accessories: detail.accessories || '',
      status: detail.status,
    });
  };

  const loadAsset = async () => {
    setLoading(true);
    setError('');
    try {
      const detail = await getAssetDetailAction(assetId);
      applyAsset(detail);
    } catch (err: any) {
      setError(err.message || 'Could not load asset details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAsset();
    // The asset id is the only trigger required for this modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  // Renew-after is derived from the dates, never typed.
  const editDerivedRenewalDays = useMemo(
    () => resolveRenewalDays(edit.issuedDate || null, edit.returnDate || null, null),
    [edit.issuedDate, edit.returnDate],
  );
  const viewRenewalDays = useMemo(
    () => resolveRenewalDays(asset?.issuedDate || null, asset?.returnDate || null, asset?.renewalIntervalDays ?? null),
    [asset],
  );

  const renewalInfo = useMemo(() => {
    if (!asset || viewRenewalDays === null) return null;
    const start = new Date(`${asset.issuedDate}T00:00:00`).getTime();
    const dueDate = datePlusDays(asset.issuedDate, viewRenewalDays);
    if (!dueDate || Number.isNaN(start)) return null;
    const end = dueDate.getTime();
    const now = Date.now();
    const progress = Math.max(0, Math.min(100, ((now - start) / Math.max(1, end - start)) * 100));
    const daysRemaining = Math.ceil((end - now) / 86400000);
    return { dueDate, progress, daysRemaining };
  }, [asset, viewRenewalDays]);

  const setField = <K extends keyof EditState>(field: K, value: EditState[K]) => setEdit(previous => ({ ...previous, [field]: value }));

  const handleSave = async () => {
    if (!asset) return;
    setError('');
    setSuccess('');
    if (!edit.issuedDate) {
      setError('Issued date is required.');
      return;
    }
    setSaving(true);
    try {
      await updateAsset({
        assetId: asset.id,
        modelName: edit.modelName.trim(),
        imei1: edit.imei1.trim(),
        imei2: edit.imei2.trim(),
        deviceType: edit.deviceType.trim(),
        brandModel: edit.brandModel.trim(),
        processor: edit.processor.trim(),
        deviceId: edit.deviceId.trim(),
        operatingSystem: edit.operatingSystem.trim(),
        issuedDate: edit.issuedDate,
        returnDate: edit.returnDate || undefined,
        renewalIntervalDays: editDerivedRenewalDays !== null ? editDerivedRenewalDays : undefined,
        purpose: edit.purpose.trim(),
        accessories: edit.accessories.trim(),
        status: edit.status,
      });
      const refreshed = await getAssetDetailAction(assetId);
      applyAsset(refreshed);
      setEditing(false);
      setSuccess('Asset details updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Could not update asset.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="asset-modal-overlay" role="dialog" aria-modal="true" aria-label="Asset details">
      <div className="asset-modal-shell max-w-3xl">
        <header className="asset-modal-header flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900 sm:text-lg">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><HardDrive className="h-5 w-5" /></span>
              Asset details
            </h2>
            <p className="mt-1 pl-11 text-[11px] text-slate-500">View the complete device record, acknowledgement, photos and signature.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {asset && canEdit && !editing && (
              <button type="button" onClick={() => { setEditing(true); setSuccess(''); }} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100">
                <Edit3 className="h-4 w-4" /> Edit
              </button>
            )}
            <button type="button" onClick={onClose} className="asset-modal-close" aria-label="Close asset details"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="asset-modal-body space-y-4 text-xs">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 font-semibold text-red-700">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-semibold text-emerald-700">{success}</div>}

          {loading && <div className="flex items-center justify-center gap-2 py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /> Loading asset…</div>}

          {asset && !loading && (
            <>
              <section className="asset-section">
                <h3 className="asset-section-title"><UserRound className="h-4 w-4 text-indigo-500" /> Assignment</h3>
                <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                  <Row label="Employee" value={asset.assignedToName} />
                  <Row label="Designation" value={asset.assignedToDesignation} />
                  <Row label="Email" value={<span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{asset.assignedToEmail}</span>} />
                  <Row label="Registered" value={new Date(asset.createdAt).toLocaleString()} />
                </div>
              </section>

              {editing ? (
                <>
                  <section className="asset-section">
                    <h3 className="asset-section-title"><HardDrive className="h-4 w-4 text-indigo-500" /> Edit device information</h3>
                    {asset.assetType === 'mobile' ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Input label="Model name" value={edit.modelName} onChange={value => setField('modelName', value)} />
                        <Input label="IMEI 1" value={edit.imei1} onChange={value => setField('imei1', value)} />
                        <Input label="IMEI 2" value={edit.imei2} onChange={value => setField('imei2', value)} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Input label="Device type" value={edit.deviceType} onChange={value => setField('deviceType', value)} />
                        <Input label="Brand / model" value={edit.brandModel} onChange={value => setField('brandModel', value)} />
                        <Input label="Processor" value={edit.processor} onChange={value => setField('processor', value)} />
                        <Input label="Device ID" value={edit.deviceId} onChange={value => setField('deviceId', value)} />
                        <Input label="Operating system" value={edit.operatingSystem} onChange={value => setField('operatingSystem', value)} />
                      </div>
                    )}
                  </section>

                  <section className="asset-section">
                    <h3 className="asset-section-title"><CalendarClock className="h-4 w-4 text-indigo-500" /> Edit issuance</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Input label="Issued date *" type="date" value={edit.issuedDate} onChange={value => setField('issuedDate', value)} />
                      <Input label="Return date" type="date" min={edit.issuedDate || undefined} value={edit.returnDate} onChange={value => setField('returnDate', value)} />
                      <Input label="Renew after (days)" value={editDerivedRenewalDays !== null ? `${editDerivedRenewalDays} days` : 'Set issue and return dates'} readOnly onChange={() => undefined} />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Input label="Purpose" value={edit.purpose} onChange={value => setField('purpose', value)} />
                      <Input label="Accessories" value={edit.accessories} onChange={value => setField('accessories', value)} />
                    </div>
                    <label className="mt-3 block">
                      <span className="mb-1 block text-[11px] font-extrabold text-slate-600">Asset status</span>
                      <select value={edit.status} onChange={event => setField('status', event.target.value as Status)} className="asset-status-select">
                        <option value="active">Active</option>
                        <option value="returned">Returned</option>
                        <option value="lost">Lost</option>
                        <option value="damaged">Damaged</option>
                      </select>
                    </label>
                  </section>
                </>
              ) : (
                <>
                  <section className="asset-section">
                    <h3 className="asset-section-title"><HardDrive className="h-4 w-4 text-indigo-500" /> Device</h3>
                    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                      <Row label="Asset type" value={<span className="capitalize">{asset.assetType}</span>} />
                      <Row label="Status" value={<span className={`rounded-full px-2 py-1 text-[10px] font-black capitalize ${asset.status === 'active' ? 'bg-emerald-100 text-emerald-700' : asset.status === 'returned' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'}`}>{asset.status}</span>} />
                      <Row label="Model name" value={asset.modelName} />
                      <Row label="IMEI 1" value={asset.imei1} />
                      <Row label="IMEI 2" value={asset.imei2} />
                      <Row label="Device type" value={asset.deviceType} />
                      <Row label="Brand / model" value={asset.brandModel} />
                      <Row label="Processor" value={asset.processor} />
                      <Row label="Device ID" value={asset.deviceId} />
                      <Row label="Operating system" value={asset.operatingSystem} />
                    </div>
                  </section>

                  <section className="asset-section">
                    <h3 className="asset-section-title"><CalendarClock className="h-4 w-4 text-indigo-500" /> Issuance & renewal</h3>
                    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                      <Row label="Issued date" value={asset.issuedDate} />
                      <Row label="Return date" value={asset.returnDate} />
                      <Row label="Renews every" value={viewRenewalDays !== null ? `${viewRenewalDays} days` : undefined} />
                      <Row label="Purpose" value={asset.purpose} />
                      <Row label="Accessories" value={asset.accessories} />
                      <Row label="Acknowledged" value={<span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Yes</span>} />
                    </div>
                    {renewalInfo && (
                      <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3 font-bold text-slate-700">
                          <span>Renewal progress</span>
                          <span className={renewalInfo.daysRemaining < 0 ? 'text-red-600' : 'text-indigo-700'}>
                            {renewalInfo.daysRemaining < 0 ? `${Math.abs(renewalInfo.daysRemaining)} days overdue` : `${renewalInfo.daysRemaining} days remaining`}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-indigo-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500" style={{ width: `${renewalInfo.progress}%` }} /></div>
                        <p className="mt-2 text-[10px] text-slate-500">Next review: {renewalInfo.dueDate.toLocaleDateString()}</p>
                      </div>
                    )}
                  </section>

                  {asset.photos.length > 0 && (
                    <section className="asset-section">
                      <h3 className="asset-section-title"><ImageIcon className="h-4 w-4 text-indigo-500" /> Photos</h3>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {asset.photos.map(photo => (
                          <a key={photo.id} href={photo.data} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                            <img src={photo.data} alt={`${photo.type} evidence`} className="h-24 w-full object-cover transition group-hover:scale-105" />
                            <span className="block px-2 py-1 text-center text-[10px] font-bold capitalize text-slate-500">{photo.type}</span>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {asset.signatureData && (
                    <section className="asset-section">
                      <h3 className="asset-section-title"><ShieldCheck className="h-4 w-4 text-indigo-500" /> Employee signature</h3>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><img src={asset.signatureData} alt="Employee signature" className="h-24 max-w-full object-contain" /></div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {asset && editing && (
          <footer className="asset-modal-footer flex items-center justify-end gap-2">
            <button type="button" onClick={() => { applyAsset(asset); setEditing(false); setError(''); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="button" disabled={saving} onClick={handleSave} className="glass-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save changes'}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};
