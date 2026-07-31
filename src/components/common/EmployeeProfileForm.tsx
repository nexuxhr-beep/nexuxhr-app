import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  Landmark,
  Loader2,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { EmployeeDocument, EmployeeProfileDetails } from '../../types';

interface EmployeeProfileFormProps {
  userId?: string;
  onSaved?: () => void;
  compact?: boolean;
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400';

const documentTypes: Array<{ value: EmployeeDocument['documentType']; label: string }> = [
  { value: 'employee_photo', label: 'Employee Photo' },
  { value: 'citizenship', label: 'Citizenship / Passport' },
  { value: 'pan', label: 'PAN / Tax ID' },
  { value: 'qualification', label: 'Qualification Certificate' },
  { value: 'contract', label: 'Employment Contract' },
  { value: 'other', label: 'Other Document' },
];

const Field: React.FC<{
  label: string;
  value?: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}> = ({ label, value = '', onChange, type = 'text', placeholder, required, options }) => (
  <label className="block">
    <span className="block text-[11px] font-bold text-slate-600 mb-1.5">{label}{required && <span className="text-red-500"> *</span>}</span>
    {options ? (
      <select value={value} onChange={e => onChange(e.target.value)} className={inputClass} required={required}>
        <option value="">Select option</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputClass} required={required} />
    )}
  </label>
);

const TextArea: React.FC<{ label: string; value?: string; onChange: (value: string) => void; placeholder?: string }> = ({ label, value = '', onChange, placeholder }) => (
  <label className="block">
    <span className="block text-[11px] font-bold text-slate-600 mb-1.5">{label}</span>
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={`${inputClass} resize-y`} />
  </label>
);

const Section: React.FC<{ icon: React.ReactNode; title: string; description: string; children: React.ReactNode }> = ({ icon, title, description, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <h4 className="text-sm font-black text-slate-900">{title}</h4>
        <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
    {children}
  </section>
);

export const EmployeeProfileForm: React.FC<EmployeeProfileFormProps> = ({ userId, onSaved, compact = false }) => {
  const {
    currentUser,
    getEmployeeProfileAction,
    saveEmployeeProfileAction,
    deleteEmployeeDocumentAction,
  } = useHR();

  const targetUserId = userId || currentUser.id;
  const [profile, setProfile] = useState<EmployeeProfileDetails | null>(null);
  const [newDocuments, setNewDocuments] = useState<EmployeeDocument[]>([]);
  const [documentType, setDocumentType] = useState<EmployeeDocument['documentType']>('employee_photo');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const loaded = await getEmployeeProfileAction(targetUserId);
      setProfile(loaded);
      setProfilePhoto(loaded.profilePhoto || '');
      setNewDocuments([]);
    } catch (err: any) {
      setError(err?.message || 'Could not load employee profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadProfile(); }, [targetUserId]);

  const completion = useMemo(() => profile?.profileCompletion || 0, [profile?.profileCompletion]);

  const update = <K extends keyof EmployeeProfileDetails>(key: K, value: EmployeeProfileDetails[K]) => {
    setProfile(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const handleProfilePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Profile photo must be JPG, PNG or WEBP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile photo must be 2 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      setProfilePhoto(data);
      setProfile(prev => prev ? { ...prev, profilePhoto: data } : prev);
      setError('');
    };
    reader.onerror = () => setError('Could not read the profile photo.');
    reader.readAsDataURL(file);
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setError('Only JPG, PNG, WEBP and PDF documents are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Each document must be 5 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewDocuments(prev => [...prev, {
        documentType,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        data: String(reader.result),
      }]);
      setError('');
    };
    reader.onerror = () => setError('Could not read the selected document.');
    reader.readAsDataURL(file);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await saveEmployeeProfileAction(profile, newDocuments);
      setSuccess('Employee profile and documents saved successfully.');
      await loadProfile();
      onSaved?.();
    } catch (err: any) {
      setError(err?.message || 'Could not save employee profile.');
    } finally {
      setSaving(false);
    }
  };

  const removeStoredDocument = async (documentId?: string) => {
    if (!documentId || !window.confirm('Delete this employee document?')) return;
    try {
      await deleteEmployeeDocumentAction(documentId, targetUserId);
      await loadProfile();
    } catch (err: any) {
      setError(err?.message || 'Could not delete document.');
    }
  };

  if (loading) return <div className="py-16 flex items-center justify-center text-slate-500 text-sm"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading employee profile…</div>;
  if (!profile) return <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error || 'Employee profile is unavailable.'}</div>;

  return (
    <form onSubmit={handleSave} className={compact ? 'space-y-4' : 'space-y-6'}>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <label className="profile-photo-picker" title="Change profile photo">
            {profilePhoto ? <img src={profilePhoto} alt={profile.employeeName} /> : <span>{(profile.employeeName || '?').charAt(0).toUpperCase()}</span>}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleProfilePhoto} />
            <span className="profile-photo-badge"><Upload className="w-3 h-3" /></span>
          </label>
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-900 truncate">{profile.employeeName}</h3>
            <p className="text-xs text-slate-500 truncate">{profile.emailAddress} · {profile.employeeCode || 'Employee code not assigned'}</p>
          </div>
        </div>
        <div className="sm:w-56">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1.5"><span>Profile completion</span><span>{completion}%</span></div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.max(0, Math.min(100, completion))}%` }} /></div>
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
      {success && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /> {success}</div>}

      <Section icon={<User className="w-4 h-4" />} title="Employee and organisational details" description="Core employment information shown in the employee directory.">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Field label="Employee Code" value={profile.employeeCode} onChange={value => update('employeeCode', value)} />
          <Field label="Employee Name" value={profile.employeeName} onChange={value => update('employeeName', value)} required />
          <Field label="Job Title" value={profile.jobTitle} onChange={value => update('jobTitle', value)} />
          <Field label="Joining Date" type="date" value={profile.joiningDate} onChange={value => update('joiningDate', value)} />
          <Field label="Department" value={profile.department} onChange={value => update('department', value)} />
          <Field label="Gender" value={profile.gender} onChange={value => update('gender', value as EmployeeProfileDetails['gender'])} options={['Male', 'Female', 'Other', 'Prefer not to say']} />
          <Field label="Marital Status" value={profile.maritalStatus} onChange={value => update('maritalStatus', value as EmployeeProfileDetails['maritalStatus'])} options={['Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say']} />
          <Field label="Highest Qualification" value={profile.highestQualification} onChange={value => update('highestQualification', value)} />
          <Field label="Date of Birth" type="date" value={profile.dateOfBirth} onChange={value => update('dateOfBirth', value)} />
        </div>
      </Section>

      <Section icon={<Building2 className="w-4 h-4" />} title="Online and address details" description="Contact and current residential information.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Phone Number" value={profile.phoneNumber} onChange={value => update('phoneNumber', value)} />
          <Field label="Email Address" type="email" value={profile.emailAddress} onChange={value => update('emailAddress', value)} required />
          <TextArea label="Permanent Address" value={profile.permanentAddress} onChange={value => update('permanentAddress', value)} />
          <TextArea label="Temporary Address" value={profile.temporaryAddress} onChange={value => update('temporaryAddress', value)} />
        </div>
      </Section>

      <Section icon={<Users className="w-4 h-4" />} title="Parents and emergency contact" description="Family names and the person to contact during an emergency.">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Field label="Father Full Name" value={profile.fatherName} onChange={value => update('fatherName', value)} />
          <Field label="Mother Full Name" value={profile.motherName} onChange={value => update('motherName', value)} />
          <Field label="Emergency Contact Name" value={profile.emergencyContactName} onChange={value => update('emergencyContactName', value)} />
          <Field label="Relationship" value={profile.emergencyRelationship} onChange={value => update('emergencyRelationship', value)} />
          <Field label="Emergency Phone" value={profile.emergencyPhone} onChange={value => update('emergencyPhone', value)} />
          <div className="md:col-span-2 xl:col-span-3"><TextArea label="Emergency Contact Address" value={profile.emergencyAddress} onChange={value => update('emergencyAddress', value)} /></div>
        </div>
      </Section>

      <Section icon={<ShieldCheck className="w-4 h-4" />} title="Government identifications" description="Official identification numbers used for HR verification.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Citizenship Number" value={profile.citizenshipNumber} onChange={value => update('citizenshipNumber', value)} />
          <Field label="PAN Number" value={profile.panNumber} onChange={value => update('panNumber', value)} />
          <Field label="NID Card Number" value={profile.nidNumber} onChange={value => update('nidNumber', value)} />
        </div>
      </Section>

      <Section icon={<Landmark className="w-4 h-4" />} title="Banking and contract information" description="Payroll account and current employment contract dates.">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Field label="Bank Account Number" value={profile.bankAccountNumber} onChange={value => update('bankAccountNumber', value)} />
          <Field label="Bank Account Name" value={profile.bankAccountName} onChange={value => update('bankAccountName', value)} />
          <Field label="Bank Name" value={profile.bankNameBranch} onChange={value => update('bankNameBranch', value)} />
          <Field label="Branch" value={profile.bankBranch} onChange={value => update('bankBranch', value)} />
          <Field label="Contract Date" type="date" value={profile.contractDate} onChange={value => update('contractDate', value)} />
          <Field label="Contract Expire Date" type="date" value={profile.contractExpireDate} onChange={value => update('contractExpireDate', value)} />
        </div>
      </Section>

      <Section icon={<FileText className="w-4 h-4" />} title="Employee documents" description="JPG, PNG, WEBP or PDF. Maximum 5 MB per file.">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
          <div className="space-y-3">
            <label className="block text-[11px] font-bold text-slate-600">Document Type</label>
            <select value={documentType} onChange={e => setDocumentType(e.target.value as EmployeeDocument['documentType'])} className={inputClass}>
              {documentTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <label className="min-h-28 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 flex flex-col items-center justify-center cursor-pointer text-center p-4">
              <Upload className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-700 mt-2">Choose document</span>
              <span className="text-[10px] text-slate-500 mt-1">Maximum 5 MB</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFile} />
            </label>
          </div>
          <div className="space-y-2">
            {[...(profile.documents || []), ...newDocuments].length === 0 && <div className="h-full min-h-28 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs text-slate-500">No documents uploaded yet.</div>}
            {(profile.documents || []).map(doc => (
              <div key={doc.id} className="rounded-xl bg-white border border-slate-200 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{doc.fileName}</div>
                  <div className="text-[10px] text-slate-500">{documentTypes.find(type => type.value === doc.documentType)?.label} · {(doc.fileSize / 1024).toFixed(1)} KB</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {doc.data && <a href={doc.data} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold">View</a>}
                  <button type="button" onClick={() => removeStoredDocument(doc.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
            {newDocuments.map((doc, index) => (
              <div key={`${doc.fileName}-${index}`} className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="text-xs font-bold text-emerald-800 truncate">{doc.fileName}</div><div className="text-[10px] text-emerald-700">Ready to upload</div></div>
                <button type="button" onClick={() => setNewDocuments(prev => prev.filter((_, itemIndex) => itemIndex !== index))} className="p-1.5 rounded-lg bg-white text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur p-3 flex justify-end shadow-lg">
        <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-black flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Employee Profile
        </button>
      </div>
    </form>
  );
};
