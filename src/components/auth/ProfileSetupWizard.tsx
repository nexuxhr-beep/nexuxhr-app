import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  LogOut,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { completeProfileSetupApi } from '../../lib/authApi';
import { EmployeeDocument, EmployeeProfileDetails } from '../../types';
import { Logo } from '../common/Logo';

interface ProfileSetupWizardProps {
  onComplete: () => void;
  onLogout: () => void;
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-indigo-400';

const Field: React.FC<{
  label: string;
  value?: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}> = ({ label, value, onChange, type = 'text', required, options, placeholder }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-bold text-slate-600">
      {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
    </span>
    {options ? (
      <select value={value || ''} onChange={e => onChange(e.target.value)} className={inputClass}>
        <option value="">Select…</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    ) : (
      <input
        type={type}
        value={value || ''}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={inputClass}
      />
    )}
  </label>
);

const TextArea: React.FC<{ label: string; value?: string; onChange: (v: string) => void; required?: boolean }> =
  ({ label, value, onChange, required }) => (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold text-slate-600">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} className={`${inputClass} min-h-20`} />
    </label>
  );

interface StepDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  /** Field keys that must be filled before Next is enabled. */
  requires: (keyof EmployeeProfileDetails)[];
}

const STEPS: StepDefinition[] = [
  {
    id: 'employment',
    title: 'Employee and organisational details',
    description: 'Who you are and where you sit in the company.',
    icon: <User className="h-4 w-4" />,
    requires: ['employeeName'],
  },
  {
    id: 'contact',
    title: 'Online and address details',
    description: 'How we reach you and where you live.',
    icon: <Building2 className="h-4 w-4" />,
    requires: ['phoneNumber', 'permanentAddress'],
  },
  {
    id: 'family',
    title: 'Parents and emergency contact',
    description: 'Who to call if something happens at work.',
    icon: <Users className="h-4 w-4" />,
    requires: ['fatherName', 'motherName', 'emergencyContactName', 'emergencyPhone'],
  },
  {
    id: 'identification',
    title: 'Government identification',
    description: 'Only your citizenship number is needed now.',
    icon: <ShieldCheck className="h-4 w-4" />,
    requires: ['citizenshipNumber'],
  },
  {
    id: 'documents',
    title: 'Employee documents',
    description: 'Upload your citizenship and academic qualification.',
    icon: <FileText className="h-4 w-4" />,
    requires: [],
  },
  {
    id: 'contract',
    title: 'Contract dates',
    description: 'When your contract starts and expires.',
    icon: <FileText className="h-4 w-4" />,
    requires: ['contractDate', 'contractExpireDate'],
  },
];

/**
 * Post-OTP onboarding.
 *
 * Split exactly as the correction document specifies: the six steps below are
 * mandatory, while banking details, PAN, NID and profile picture are shown at
 * the end as "you can add these later" and remain editable from My Profile.
 *
 * The server re-validates every mandatory field in `complete_profile_setup`, so
 * a client that skips a step is rejected rather than silently marked complete.
 */
export const ProfileSetupWizard: React.FC<ProfileSetupWizardProps> = ({ onComplete, onLogout }) => {
  const { currentUser, getEmployeeProfileAction, saveEmployeeProfileAction } = useHR();

  const [profile, setProfile] = useState<EmployeeProfileDetails | null>(null);
  const [newDocuments, setNewDocuments] = useState<EmployeeDocument[]>([]);
  const [documentType, setDocumentType] = useState<EmployeeDocument['documentType']>('citizenship');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const loaded = await getEmployeeProfileAction();
        if (active) setProfile(loaded);
      } catch {
        if (active) {
          // No profile row yet — start from the session details.
          setProfile({
            userId: currentUser.id,
            employeeName: currentUser.name || '',
            emailAddress: currentUser.email || '',
            role: currentUser.role,
            employeeCode: currentUser.employeeCode,
            profileCompletion: 0,
            documents: [],
          } as EmployeeProfileDetails);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = <K extends keyof EmployeeProfileDetails>(key: K, value: EmployeeProfileDetails[K]) =>
    setProfile(current => (current ? { ...current, [key]: value } : current));

  const allDocuments = useMemo(
    () => [...(profile?.documents || []), ...newDocuments],
    [profile?.documents, newDocuments],
  );

  const hasCitizenshipDoc = allDocuments.some(d => d.documentType === 'citizenship');
  const hasQualificationDoc = allDocuments.some(d => d.documentType === 'qualification');

  const current = STEPS[step];
  const isDocumentStep = current.id === 'documents';

  const stepComplete = useMemo(() => {
    if (!profile) return false;
    if (isDocumentStep) return hasCitizenshipDoc && hasQualificationDoc;
    return current.requires.every(key => String(profile[key] ?? '').trim() !== '');
  }, [profile, current, isDocumentStep, hasCitizenshipDoc, hasQualificationDoc]);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Each document must be under 5 MB.'); return; }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read the file.'));
        reader.readAsDataURL(file);
      });
      setNewDocuments(prev => [...prev, {
        documentType,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        data,
      }]);
      setError('');
    } catch (err: any) {
      setError(err?.message || 'The document could not be read.');
    } finally {
      event.target.value = '';
    }
  };

  /** Save progress so a half-finished wizard is not lost on refresh. */
  const persist = async () => {
    if (!profile) return;
    await saveEmployeeProfileAction(profile, newDocuments);
    setNewDocuments([]);
  };

  const next = async () => {
    setError(''); setSaving(true);
    try {
      await persist();
      if (step + 1 < STEPS.length) setStep(step + 1);
    } catch (err: any) {
      setError(err?.message || 'Your details could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    setError(''); setSaving(true);
    try {
      await persist();
      await completeProfileSetupApi();
      onComplete();
    } catch (err: any) {
      setError(err?.message || 'Setup could not be completed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your profile…
        </div>
      </div>
    );
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <Logo size="md" />
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">Setup my profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome, {currentUser.name}. A few details are needed before you can use NexuxHR.
            Everything else can be added later from My Profile.
          </p>
        </div>

        {/* Stepper */}
        <ol className="mb-6 flex flex-wrap gap-2">
          {STEPS.map((item, index) => {
            const done = index < step;
            const active = index === step;
            return (
              <li key={item.id} className="flex-1">
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                  active ? 'border-indigo-300 bg-indigo-50'
                    : done ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-white'
                }`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                    active ? 'bg-indigo-600 text-white'
                      : done ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {done ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className={`hidden text-[10px] font-bold sm:block ${active ? 'text-indigo-800' : 'text-slate-500'}`}>
                    {item.title.split(' ')[0]}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              {current.icon}
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900">{current.title}</h2>
              <p className="text-xs text-slate-500">{current.description}</p>
            </div>
            <span className="ml-auto shrink-0 text-[10px] font-bold text-slate-400">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800">
              {error}
            </div>
          )}

          {current.id === 'employment' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Employee Name" value={profile.employeeName} onChange={v => update('employeeName', v)} required />
              <Field label="Employee Code" value={profile.employeeCode} onChange={v => update('employeeCode', v)} />
              <Field label="Job Title" value={profile.jobTitle} onChange={v => update('jobTitle', v)} />
              <Field label="Department" value={profile.department} onChange={v => update('department', v)} />
              <Field label="Joining Date" type="date" value={profile.joiningDate} onChange={v => update('joiningDate', v)} />
              <Field label="Date of Birth" type="date" value={profile.dateOfBirth} onChange={v => update('dateOfBirth', v)} />
              <Field label="Gender" value={profile.gender} onChange={v => update('gender', v as EmployeeProfileDetails['gender'])}
                options={['Male', 'Female', 'Other', 'Prefer not to say']} />
              <Field label="Marital Status" value={profile.maritalStatus} onChange={v => update('maritalStatus', v as EmployeeProfileDetails['maritalStatus'])}
                options={['Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say']} />
              <Field label="Highest Qualification" value={profile.highestQualification} onChange={v => update('highestQualification', v)} />
            </div>
          )}

          {current.id === 'contact' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone Number" value={profile.phoneNumber} onChange={v => update('phoneNumber', v)} required />
              <Field label="Email Address" type="email" value={profile.emailAddress} onChange={v => update('emailAddress', v)} required />
              <TextArea label="Permanent Address" value={profile.permanentAddress} onChange={v => update('permanentAddress', v)} required />
              <TextArea label="Temporary Address" value={profile.temporaryAddress} onChange={v => update('temporaryAddress', v)} />
            </div>
          )}

          {current.id === 'family' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Father Full Name" value={profile.fatherName} onChange={v => update('fatherName', v)} required />
              <Field label="Mother Full Name" value={profile.motherName} onChange={v => update('motherName', v)} required />
              <Field label="Emergency Contact Name" value={profile.emergencyContactName} onChange={v => update('emergencyContactName', v)} required />
              <Field label="Relationship" value={profile.emergencyRelationship} onChange={v => update('emergencyRelationship', v)} />
              <Field label="Emergency Phone" value={profile.emergencyPhone} onChange={v => update('emergencyPhone', v)} required />
              <TextArea label="Emergency Contact Address" value={profile.emergencyAddress} onChange={v => update('emergencyAddress', v)} />
            </div>
          )}

          {current.id === 'identification' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Citizenship Number" value={profile.citizenshipNumber} onChange={v => update('citizenshipNumber', v)} required />
              </div>
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-[11px] text-slate-500">
                PAN number and NID card are not needed now — you can add them later from My Profile.
              </p>
            </div>
          )}

          {current.id === 'documents' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['citizenship', 'Citizenship', hasCitizenshipDoc],
                  ['qualification', 'Academic qualification', hasQualificationDoc],
                ].map(([type, label, done]) => (
                  <div key={type as string} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold ${
                    done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
                  }`}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-4 w-4 rounded-full border-2 border-slate-300" />}
                    {label as string}{done ? ' uploaded' : ' required'}
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-600">Document type</label>
                  <select value={documentType} onChange={e => setDocumentType(e.target.value as EmployeeDocument['documentType'])} className={inputClass}>
                    <option value="citizenship">Citizenship</option>
                    <option value="qualification">Academic qualification</option>
                  </select>
                  <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-center hover:bg-indigo-50">
                    <Upload className="h-5 w-5 text-indigo-600" />
                    <span className="mt-2 text-xs font-bold text-indigo-700">Choose document</span>
                    <span className="mt-1 text-[10px] text-slate-500">Max 5 MB</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFile} />
                  </label>
                </div>

                <div className="space-y-2">
                  {allDocuments.length === 0 && (
                    <div className="flex min-h-24 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs text-slate-500">
                      No documents uploaded yet.
                    </div>
                  )}
                  {newDocuments.map((doc, index) => (
                    <div key={`${doc.fileName}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-emerald-800">{doc.fileName}</div>
                        <div className="text-[10px] text-emerald-700">{doc.documentType} · ready to upload</div>
                      </div>
                      <button type="button" onClick={() => setNewDocuments(prev => prev.filter((_, i) => i !== index))}
                        className="rounded-lg bg-white p-1.5 text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {(profile.documents || []).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-slate-800">{doc.fileName}</div>
                        <div className="text-[10px] text-slate-500">{doc.documentType} · saved</div>
                      </div>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {current.id === 'contract' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Contract Date" type="date" value={profile.contractDate} onChange={v => update('contractDate', v)} required />
                <Field label="Contract Expire Date" type="date" value={profile.contractExpireDate} onChange={v => update('contractExpireDate', v)} required />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-black text-slate-800">You can add these later</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  Not required now. Add them any time from My Profile once you are inside.
                </p>
                <ul className="mt-3 grid gap-1.5 text-[11px] text-slate-600 sm:grid-cols-2">
                  {[
                    'Bank account number, account name, bank and branch',
                    'PAN number',
                    'NID card',
                    'Profile picture',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={step === 0 || saving}
              onClick={() => { setStep(step - 1); setError(''); }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>

            {!stepComplete && (
              <span className="hidden text-[10px] text-amber-600 sm:block">
                {isDocumentStep
                  ? 'Upload both documents to continue'
                  : 'Fill the required fields to continue'}
              </span>
            )}

            <button
              type="button"
              disabled={!stepComplete || saving}
              onClick={isLastStep ? finish : next}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {isLastStep ? 'Finish setup' : 'Save and continue'}
              {!isLastStep && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Your progress is saved at every step — you can close this and come back.
        </p>
      </div>
    </div>
  );
};
