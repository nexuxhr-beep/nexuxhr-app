import React, { useMemo, useState } from 'react';
import { resolveRenewalDays } from '../common/AssetRenewalCell';
import { useHR } from '../../context/HRContext';
import { PhotoUploader } from '../common/PhotoUploader';
import { SignaturePad } from '../common/SignaturePad';
import {
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  HardDrive,
  Laptop,
  PackageCheck,
  Save,
  Smartphone,
  UserRound,
  X,
} from 'lucide-react';

interface AddAssetModalProps { onClose: () => void; }
type AssetType = 'mobile' | 'laptop' | 'pc';

const MOBILE_ACCESSORIES = ['Charger', 'Earphone', 'Case', 'Screen Protector'];
const COMPUTER_ACCESSORIES = ['Charger', 'Mouse', 'Mousepad', 'Keyboard', 'Cooling Pad'];
const ACKNOWLEDGEMENT_TEXT = [
  'Will take reasonable care of the issued device and accessories.',
  'Will only use the device for authorized work purposes.',
  'Will comply with all IT, cybersecurity, company, and data protection policies.',
  'Will immediately report any loss, theft, or damage.',
  'Will return the device upon termination, role change, or when requested.',
];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="mb-1.5 block text-[11px] font-extrabold text-slate-600">{label}</span>
    {children}
  </label>
);

export const AddAssetModal: React.FC<AddAssetModalProps> = ({ onClose }) => {
  const { users, currentUser, activeRole, addAsset } = useHR();
  const isEmployeeSelfEntry = activeRole === 'team_member';
  const companyUsers = useMemo(
    () => users.filter(user => user.role !== 'superadmin' && user.isActive),
    [users],
  );

  const [assignedToUserId, setAssignedToUserId] = useState(isEmployeeSelfEntry ? currentUser.id : '');
  const [assetType, setAssetType] = useState<AssetType>('mobile');
  const [modelName, setModelName] = useState('');
  const [imei1, setImei1] = useState('');
  const [imei2, setImei2] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [processor, setProcessor] = useState('');
  const [deviceIdField, setDeviceIdField] = useState('');
  const [operatingSystem, setOperatingSystem] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [returnDate, setReturnDate] = useState('');

  // Renew-after is calculated, never typed: expected return date - issue date.
  const derivedRenewalDays = useMemo(
    () => resolveRenewalDays(issuedDate || null, returnDate || null, null),
    [issuedDate, returnDate],
  );

  const [purpose, setPurpose] = useState('');
  const [imeiPhotos, setImeiPhotos] = useState<string[]>([]);
  const [devicePhotos, setDevicePhotos] = useState<string[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const [otherAccessory, setOtherAccessory] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const accessoryOptions = assetType === 'mobile' ? MOBILE_ACCESSORIES : COMPUTER_ACCESSORIES;
  const employeeName = isEmployeeSelfEntry
    ? currentUser.name
    : companyUsers.find(user => user.id === assignedToUserId)?.name || '';

  const changeAssetType = (nextType: AssetType) => {
    setAssetType(nextType);
    setSelectedAccessories([]);
    setOtherAccessory('');
  };

  const toggleAccessory = (name: string) => {
    setSelectedAccessories(previous => previous.includes(name)
      ? previous.filter(accessory => accessory !== name)
      : [...previous, name]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const numericUserId = Number(assignedToUserId);
    if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
      setError(isEmployeeSelfEntry ? 'Your employee account could not be identified. Please sign in again.' : 'Select an employee.');
      return;
    }
    if (assetType === 'mobile' && (!modelName.trim() || !imei1.trim())) {
      setError('Model Name and IMEI 1 are required for a mobile device.');
      return;
    }
    if (assetType !== 'mobile' && (!brandModel.trim() || !deviceIdField.trim())) {
      setError('Brand / Model and Device ID are required for a laptop or PC.');
      return;
    }
    if (!issuedDate) {
      setError('Issued date is required.');
      return;
    }
    if (!acknowledged) {
      setError('Please accept the asset acknowledgement.');
      return;
    }
    if (!signature) {
      setError('Please draw the employee signature.');
      return;
    }

    const accessories = [
      ...selectedAccessories,
      otherAccessory.trim() ? `Other: ${otherAccessory.trim()}` : '',
    ].filter(Boolean).join(', ');

    setSaving(true);
    try {
      await addAsset({
        assignedToUserId: numericUserId,
        assetType,
        modelName: assetType === 'mobile' ? modelName.trim() : undefined,
        imei1: assetType === 'mobile' ? imei1.trim() : undefined,
        imei2: assetType === 'mobile' ? imei2.trim() : undefined,
        deviceType: assetType !== 'mobile' ? (deviceType.trim() || (assetType === 'pc' ? 'Desktop PC' : 'Laptop')) : undefined,
        brandModel: assetType !== 'mobile' ? brandModel.trim() : undefined,
        processor: assetType !== 'mobile' ? processor.trim() : undefined,
        deviceId: assetType !== 'mobile' ? deviceIdField.trim() : undefined,
        operatingSystem: assetType !== 'mobile' ? operatingSystem.trim() : undefined,
        issuedDate,
        returnDate: returnDate || undefined,
        renewalIntervalDays: derivedRenewalDays !== null ? derivedRenewalDays : undefined,
        purpose: purpose.trim(),
        accessories,
        acknowledged,
        signatureData: signature,
        photos: [
          ...imeiPhotos.map(data => ({ type: 'imei' as const, data })),
          ...devicePhotos.map(data => ({ type: 'device' as const, data })),
        ],
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Could not register the asset.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="asset-modal-overlay" role="dialog" aria-modal="true" aria-label="Register asset">
      <div className="asset-modal-shell">
        <header className="asset-modal-header flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-900 sm:text-lg">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><HardDrive className="h-5 w-5" /></span>
              {isEmployeeSelfEntry ? 'Register My Asset' : 'Register & Issue Asset'}
            </h2>
            <p className="mt-1 pl-11 text-[11px] text-slate-500">
              {isEmployeeSelfEntry ? 'Enter the device issued to you. Admin and HR can review or edit it after submission.' : 'Record a company device, acknowledgement, photos and signature.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="asset-modal-close shrink-0" aria-label="Close asset form"><X className="h-5 w-5" /></button>
        </header>

        <form id="asset-register-form" onSubmit={handleSubmit} className="contents">
          <div className="asset-modal-body space-y-4 text-xs">
            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 font-semibold text-red-700">{error}</div>}

            <section className="asset-section">
              <h3 className="asset-section-title"><UserRound className="h-4 w-4 text-indigo-500" /> Employee & asset type</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Employee *">
                  {isEmployeeSelfEntry ? (
                    <div className="asset-readonly-user"><UserRound className="h-4 w-4 text-indigo-500" /><span>{employeeName || currentUser.email}</span></div>
                  ) : (
                    <select required value={assignedToUserId} onChange={e => setAssignedToUserId(e.target.value)} className="glass-input w-full rounded-xl px-3 py-2.5 text-slate-900">
                      <option value="">Select employee…</option>
                      {companyUsers.map(user => <option key={user.id} value={user.id}>{user.name}{user.designation ? ` — ${user.designation}` : ''}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="Asset type *">
                  <select value={assetType} onChange={e => changeAssetType(e.target.value as AssetType)} className="glass-input w-full rounded-xl px-3 py-2.5 text-slate-900">
                    <option value="mobile">Mobile</option>
                    <option value="laptop">Laptop</option>
                    <option value="pc">PC / Desktop</option>
                  </select>
                </Field>
              </div>
            </section>

            <section className="asset-section">
              <h3 className="asset-section-title">
                {assetType === 'mobile' ? <Smartphone className="h-4 w-4 text-indigo-500" /> : <Laptop className="h-4 w-4 text-indigo-500" />}
                {assetType === 'mobile' ? 'Mobile details' : 'Computer details'}
              </h3>
              {assetType === 'mobile' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Model name *"><input required value={modelName} onChange={e => setModelName(e.target.value)} placeholder="e.g. iPhone 15" className="glass-input w-full rounded-xl px-3 py-2.5" /></Field>
                  <Field label="IMEI 1 *"><input required value={imei1} onChange={e => setImei1(e.target.value)} inputMode="numeric" placeholder="Primary IMEI" className="glass-input w-full rounded-xl px-3 py-2.5" /></Field>
                  <Field label="IMEI 2"><input value={imei2} onChange={e => setImei2(e.target.value)} inputMode="numeric" placeholder="Optional" className="glass-input w-full rounded-xl px-3 py-2.5" /></Field>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Device type"><input value={deviceType} onChange={e => setDeviceType(e.target.value)} placeholder={assetType === 'pc' ? 'Desktop PC' : 'Laptop'} className="glass-input w-full rounded-xl px-3 py-2.5" /></Field>
                  <Field label="Brand / model *"><input required value={brandModel} onChange={e => setBrandModel(e.target.value)} placeholder="e.g. Dell Latitude 5440" className="glass-input w-full rounded-xl px-3 py-2.5" /></Field>
                  <Field label="Processor"><input value={processor} onChange={e => setProcessor(e.target.value)} placeholder="e.g. Intel Core i5" className="glass-input w-full rounded-xl px-3 py-2.5" /></Field>
                  <Field label="Device ID *"><input required value={deviceIdField} onChange={e => setDeviceIdField(e.target.value)} placeholder="Serial / service tag" className="glass-input w-full rounded-xl px-3 py-2.5" /></Field>
                  <Field label="Operating system"><input value={operatingSystem} onChange={e => setOperatingSystem(e.target.value)} placeholder="e.g. Windows 11 Pro" className="glass-input w-full rounded-xl px-3 py-2.5" /></Field>
                </div>
              )}
            </section>

            <section className="asset-section">
              <h3 className="asset-section-title"><CalendarDays className="h-4 w-4 text-indigo-500" /> Issuance & renewal</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Issued date *"><input required type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className="glass-input w-full rounded-xl px-3 py-2.5" /></Field>
                <Field label="Expected return date"><input type="date" min={issuedDate || undefined} value={returnDate} onChange={e => setReturnDate(e.target.value)} className="glass-input w-full rounded-xl px-3 py-2.5" /></Field>
                <Field label="Renew after (days)"><input type="text" readOnly value={derivedRenewalDays !== null ? `${derivedRenewalDays} days` : 'Set issue and return dates'} title="Calculated from the issue and expected return dates" className="glass-input w-full cursor-not-allowed rounded-xl bg-slate-50 px-3 py-2.5 text-slate-500" /></Field>
              </div>
              <div className="mt-3"><Field label="Purpose of using"><input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Describe the approved work purpose" className="glass-input w-full rounded-xl px-3 py-2.5" /></Field></div>
            </section>

            <section className="asset-section">
              <h3 className="asset-section-title"><Camera className="h-4 w-4 text-indigo-500" /> Photos</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {assetType === 'mobile' && <PhotoUploader label="Photo of IMEI (multiple allowed)" photos={imeiPhotos} onChange={setImeiPhotos} multiple />}
                <PhotoUploader label="Photo of device (multiple allowed)" photos={devicePhotos} onChange={setDevicePhotos} multiple />
              </div>
            </section>

            <section className="asset-section">
              <h3 className="asset-section-title"><PackageCheck className="h-4 w-4 text-indigo-500" /> Accessories issued</h3>
              <div className="mb-3 flex flex-wrap gap-2">
                {accessoryOptions.map(option => (
                  <label key={option} className={`cursor-pointer rounded-lg border px-3 py-1.5 font-bold transition ${selectedAccessories.includes(option) ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'}`}>
                    <input type="checkbox" className="sr-only" checked={selectedAccessories.includes(option)} onChange={() => toggleAccessory(option)} />{option}
                  </label>
                ))}
              </div>
              <input value={otherAccessory} onChange={e => setOtherAccessory(e.target.value)} placeholder="Other accessory (specify)" className="glass-input w-full rounded-xl px-3 py-2.5" />
            </section>

            <section className="asset-section bg-indigo-50/40">
              <h3 className="asset-section-title"><CheckCircle2 className="h-4 w-4 text-indigo-500" /> Employee acknowledgement</h3>
              <p className="mb-2 text-slate-600">I acknowledge that I:</p>
              <ul className="space-y-1.5 text-slate-600">
                {ACKNOWLEDGEMENT_TEXT.map(line => <li key={line} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />{line}</li>)}
              </ul>
              <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-xl border border-indigo-100 bg-white p-3 font-bold text-slate-800">
                <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="mt-0.5" />
                <span>I accept the acknowledgement above.</span>
              </label>
            </section>

            <section className="asset-section">
              <h3 className="asset-section-title">Employee signature *</h3>
              <SignaturePad onChange={setSignature} />
            </section>
          </div>

          <footer className="asset-modal-footer flex items-center justify-between gap-3">
            <p className="hidden text-[11px] text-slate-500 sm:block">After submission, only Admin or HR can edit the asset record.</p>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="glass-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-60">
                <Save className="h-4 w-4" />{saving ? 'Registering…' : 'Register asset'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};
