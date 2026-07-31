import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { UserRole } from '../../types';
import {
  AuthUser,
  completeSignup,
  loginWithPassword,
  requestPasswordReset,
  resetPassword,
  sendSignupOtp,
} from '../../lib/authApi';
import { Logo } from '../common/Logo';

interface LoginPageProps { onAuthenticated: () => void; }
type SignupStep = 1 | 2 | 3;

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Customer Support', 'IT', 'Legal', 'Other'];
const DESIGNATIONS = ['Manager', 'Team Lead', 'Senior Executive', 'Executive', 'Associate', 'Intern', 'Director', 'Coordinator', 'Specialist', 'Other'];

const STEP_LABELS = ['Verify email', 'Secure account', 'Complete profile'];

export const LoginPage: React.FC<LoginPageProps> = ({ onAuthenticated }) => {
  const { hydrateSessionFromServer } = useHR();
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const resetTokenFromUrl = query.get('token') || '';
  const resetEmailFromUrl = query.get('email') || '';
  const inviteCodeFromUrl = query.get('invite') || '';

  const showInviteFlow = Boolean(inviteCodeFromUrl);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loginEmail, setLoginEmail] = useState(resetEmailFromUrl);
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [resetComplete, setResetComplete] = useState(false);

  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [signupEmail, setSignupEmail] = useState(resetEmailFromUrl && inviteCodeFromUrl ? resetEmailFromUrl : '');
  const [invitationCode] = useState(inviteCodeFromUrl);
  const [signupOtp, setSignupOtp] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [designation, setDesignation] = useState(DESIGNATIONS[0]);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);

  const resetAlerts = () => { setError(''); setMessage(''); };

  const resolveSession = (authUser: AuthUser) => {
    hydrateSessionFromServer({
      id: authUser.id,
      email: authUser.email,
      fullName: authUser.fullName,
      role: authUser.role as UserRole,
      employeeCode: authUser.employeeCode,
      designation: authUser.designation,
      department: authUser.department,
      companyId: authUser.companyId,
      companyName: authUser.companyName,
    });
    onAuthenticated();
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAlerts();
    setLoading(true);
    try {
      const result = await loginWithPassword(loginEmail.trim(), loginPassword, rememberMe);
      resolveSession(result.user);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    resetAlerts();
    if (!loginEmail.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setLoading(true);
    try {
      const result = await requestPasswordReset(loginEmail.trim());
      setMessage(result.message);
    } catch (err: any) {
      setError(err.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAlerts();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const result = await resetPassword(resetEmailFromUrl, resetTokenFromUrl, newPassword);
      window.history.replaceState({}, '', window.location.pathname);
      setMessage(result.message);
      setLoginEmail(resetEmailFromUrl);
      setResetComplete(true);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAlerts();
    setLoading(true);
    try {
      const result = await sendSignupOtp(signupEmail.trim(), invitationCode.trim(), undefined);
      setSignupStep(2);
      setMessage(result.message);
    } catch (err: any) {
      setError(err.message || 'Could not send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupVerify = (e: React.FormEvent) => {
    e.preventDefault();
    resetAlerts();
    if (!/^\d{6}$/.test(signupOtp)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSignupStep(3);
  };

  const handleFinalizeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAlerts();
    setLoading(true);
    try {
      const result = await completeSignup({
        email: signupEmail.trim(),
        password: signupPassword,
        otp: signupOtp,
        invitationCode: invitationCode.trim(),
        profile: { name: empName.trim(), employeeCode: empCode.trim(), designation, department },
      });
      resolveSession(result.user);
    } catch (err: any) {
      setError(err.message || 'Account creation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page-shell">
      <section className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-logo-card"><Logo size="lg" /></div>

          <div className="auth-brand-copy">
            <span className="auth-kicker"><Sparkles className="w-4 h-4" /> Modern HR operations</span>
            <h1>Everything your people need, in one secure workspace.</h1>
            <p>Manage employees, assets, leave, attendance and company workflows without scattered files or manual follow-up.</p>

            <div className="auth-benefits">
              {[
                'Secure employee records and workflows',
                'Company-isolated data and permissions',
                'Fast HR, asset and attendance operations',
              ].map(item => (
                <div key={item}><span><Check className="w-3.5 h-3.5" /></span>{item}</div>
              ))}
            </div>
          </div>

          <p className="auth-copyright">© {new Date().getFullYear()} NexuxHR. Secure workforce management.</p>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-mobile-logo"><Logo size="md" /></div>
        <div className="auth-form-card">
          {error && <div role="alert" className="auth-alert auth-alert-error">{error}</div>}
          {message && <div role="status" className="auth-alert auth-alert-success">{message}</div>}

          {resetTokenFromUrl && !resetComplete ? (
            <form onSubmit={handleResetPassword} className="auth-form-stack" autoComplete="off">
              <FormHeading icon={<KeyRound />} title="Set a new password" description={`Create a new password for ${resetEmailFromUrl}.`} />
              <LabeledField label="New password" icon={<LockKeyhole />} type="password" autoComplete="new-password" placeholder="Minimum 8 characters" value={newPassword} onChange={setNewPassword} />
              <Primary loading={loading} label="Update password" icon={<ArrowRight className="w-4 h-4" />} />
            </form>
          ) : showInviteFlow ? (
            <div className="auth-form-stack">
              <FormHeading icon={<ShieldCheck />} title="Accept your invitation" description="Verify your email once, create your password, then complete your profile." />
              <SignupProgress step={signupStep} />

              {signupStep === 1 && (
                <form onSubmit={handleSendSignupOtp} className="auth-form-stack auth-step-enter" autoComplete="off">
                  <LabeledField
                    label="Invited email address"
                    icon={<Mail />}
                    type="email"
                    autoComplete="username"
                    placeholder="employee@company.com"
                    value={signupEmail}
                    onChange={setSignupEmail}
                    readOnly={Boolean(resetEmailFromUrl)}
                  />
                  
                  <Primary loading={loading} label="Send email OTP" icon={<ArrowRight className="w-4 h-4" />} />
                </form>
              )}

              {signupStep === 2 && (
                <form onSubmit={handleSignupVerify} className="auth-form-stack auth-step-enter" autoComplete="off">
                  <LabeledField label="6-digit verification code" icon={<KeyRound />} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Enter OTP" value={signupOtp} onChange={v => setSignupOtp(v.replace(/\D/g, '').slice(0, 6))} />
                  <LabeledField label="Create your password" icon={<LockKeyhole />} type="password" autoComplete="new-password" placeholder="Minimum 8 characters" value={signupPassword} onChange={setSignupPassword} />
                  <Primary loading={false} label="Continue to profile" icon={<ArrowRight className="w-4 h-4" />} />
                </form>
              )}

              {signupStep === 3 && (
                <form onSubmit={handleFinalizeSignup} className="auth-form-stack auth-step-enter" autoComplete="off">
                  <LabeledField label="Full name" icon={<UserRound />} type="text" autoComplete="name" placeholder="Your full name" value={empName} onChange={setEmpName} />
                  <LabeledField label="Employee code" icon={<BriefcaseBusiness />} type="text" autoComplete="off" placeholder="Provided by your company" value={empCode} onChange={setEmpCode} />
                  <div className="auth-two-column">
                    <LabeledSelect label="Designation" icon={<BriefcaseBusiness />} value={designation} onChange={setDesignation} options={DESIGNATIONS} />
                    <LabeledSelect label="Department" icon={<Building2 />} value={department} onChange={setDepartment} options={DEPARTMENTS} />
                  </div>
                  <Primary loading={loading} label="Create NexuxHR account" icon={<ArrowRight className="w-4 h-4" />} />
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleEmailSignIn} className="auth-form-stack" autoComplete="off">
              <FormHeading icon={<LogIn />} title="Welcome back" description="Sign in to your NexuxHR workspace with your email and password." />
              <LabeledField label="Work email" icon={<Mail />} type="email" autoComplete="username" placeholder="you@company.com" value={loginEmail} onChange={setLoginEmail} />
              <LabeledField label="Password" icon={<LockKeyhole />} type="password" autoComplete="current-password" placeholder="Enter your password" value={loginPassword} onChange={setLoginPassword} />
              <div className="auth-form-meta">
                <label className="auth-remember">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                  <span>Remember me</span>
                </label>
                <button type="button" disabled={loading} onClick={handleForgotPassword}>Forgot password?</button>
              </div>
              <Primary loading={loading} label="Sign in securely" icon={<LogIn className="w-4 h-4" />} />
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

const FormHeading = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="auth-heading">
    <div className="auth-heading-icon">{icon}</div>
    <div><h2>{title}</h2><p>{description}</p></div>
  </div>
);

const SignupProgress = ({ step }: { step: SignupStep }) => (
  <div className="auth-progress" aria-label={`Step ${step} of 3`}>
    {STEP_LABELS.map((label, index) => {
      const number = index + 1;
      const completed = number < step;
      const active = number === step;
      return (
        <React.Fragment key={label}>
          <div className={`auth-progress-item ${active ? 'is-active' : ''} ${completed ? 'is-complete' : ''}`}>
            <span>{completed ? <Check className="w-3.5 h-3.5" /> : number}</span>
            <small>{label}</small>
          </div>
          {index < STEP_LABELS.length - 1 && <div className={`auth-progress-line ${number < step ? 'is-complete' : ''}`} />}
        </React.Fragment>
      );
    })}
  </div>
);

const LabeledField = ({
  label, icon, type, placeholder, value, onChange, autoComplete, inputMode, maxLength, required = true, readOnly = false,
}: {
  label: string;
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  inputMode?: 'numeric' | 'text';
  maxLength?: number;
  required?: boolean;
  readOnly?: boolean;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  return (
    <label className="auth-field">
      <span className="auth-field-label">{label}</span>
      <span className="auth-input-wrap">
        <span className="auth-input-icon">{icon}</span>
        <input
          required={required}
          readOnly={readOnly}
          type={isPassword && showPassword ? 'text' : type}
          inputMode={inputMode}
          maxLength={maxLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={readOnly ? 'is-readonly' : ''}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPassword(v => !v)} className="auth-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        )}
      </span>
    </label>
  );
};

const LabeledSelect = ({ label, icon, value, onChange, options }: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) => (
  <label className="auth-field">
    <span className="auth-field-label">{label}</span>
    <span className="auth-input-wrap">
      <span className="auth-input-icon">{icon}</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </span>
  </label>
);

const Primary = ({ loading, label, icon }: { loading: boolean; label: string; icon?: React.ReactNode }) => (
  <button disabled={loading} type="submit" className="auth-primary-button">
    <span>{loading ? 'Please wait…' : label}</span>{!loading && icon}
  </button>
);
