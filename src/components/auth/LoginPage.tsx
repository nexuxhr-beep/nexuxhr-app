import React, { useMemo, useState } from 'react';
import { Mail, Lock, LogIn, ShieldCheck } from 'lucide-react';
import { useHR } from '../../context/HRContext';
import { UserRole } from '../../types';
import {
  AuthUser,
  completeSignup,
  requestPasswordReset,
  resetPassword,
  sendLoginOtp,
  sendSignupOtp,
  verifyLoginOtp,
} from '../../lib/authApi';
import { Logo } from '../common/Logo';

interface LoginPageProps { onAuthenticated: () => void; }
type LoginStep = 'credentials' | 'otp';
type SignupStep = 1 | 2 | 3;

export const LoginPage: React.FC<LoginPageProps> = ({ onAuthenticated }) => {
  const { hydrateSessionFromServer } = useHR();
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const resetTokenFromUrl = query.get('token') || '';
  const resetEmailFromUrl = query.get('email') || '';
  const inviteCodeFromUrl = query.get('invite') || '';

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(inviteCodeFromUrl ? 'signup' : 'login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [loginEmail, setLoginEmail] = useState(resetEmailFromUrl);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [signupEmail, setSignupEmail] = useState(resetEmailFromUrl && inviteCodeFromUrl ? resetEmailFromUrl : '');
  const [invitationCode, setInvitationCode] = useState(inviteCodeFromUrl);
  const [signupOtp, setSignupOtp] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Engineering');

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
    });
    onAuthenticated();
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); resetAlerts(); setLoading(true);
    try {
      const result = await sendLoginOtp(loginEmail.trim(), loginPassword);
      setChallengeId(result.challengeId);
      setLoginStep('otp');
      setMessage(result.message || `A 6-digit code was sent to ${loginEmail.trim()}.`);
    } catch (err: any) { setError(err.message || 'Invalid email or password.'); }
    finally { setLoading(false); }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault(); resetAlerts(); setLoading(true);
    try {
      const result = await verifyLoginOtp(loginEmail.trim(), loginOtp, challengeId);
      resolveSession(result.user);
    } catch (err: any) { setError(err.message || 'OTP verification failed.'); }
    finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    resetAlerts();
    if (!loginEmail.trim()) { setError('Enter your email address first.'); return; }
    setLoading(true);
    try { const result = await requestPasswordReset(loginEmail.trim()); setMessage(result.message); }
    catch (err: any) { setError(err.message || 'Could not send reset email.'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); resetAlerts(); setLoading(true);
    try {
      const result = await resetPassword(resetEmailFromUrl, resetTokenFromUrl, newPassword);
      window.history.replaceState({}, '', window.location.pathname);
      setMessage(result.message);
      setLoginEmail(resetEmailFromUrl);
    } catch (err: any) { setError(err.message || 'Password reset failed.'); }
    finally { setLoading(false); }
  };

  const handleSendSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault(); resetAlerts(); setLoading(true);
    try {
      const result = await sendSignupOtp(signupEmail.trim(), invitationCode.trim() || undefined, empName || undefined);
      setSignupStep(2); setMessage(result.message);
    } catch (err: any) { setError(err.message || 'Could not send verification code.'); }
    finally { setLoading(false); }
  };

  const handleSignupVerify = (e: React.FormEvent) => {
    e.preventDefault(); resetAlerts();
    if (!/^\d{6}$/.test(signupOtp)) { setError('Enter the 6-digit code from your email.'); return; }
    if (signupPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSignupStep(3);
  };

  const handleFinalizeSignup = async (e: React.FormEvent) => {
    e.preventDefault(); resetAlerts(); setLoading(true);
    try {
      const result = await completeSignup({
        email: signupEmail.trim(), password: signupPassword, otp: signupOtp,
        invitationCode: invitationCode.trim() || undefined,
        profile: { name: empName, employeeCode: empCode, designation, department },
      });
      resolveSession(result.user);
    } catch (err: any) { setError(err.message || 'Account creation failed.'); }
    finally { setLoading(false); }
  };

  return <div className="min-h-screen flex bg-slate-50">
    <div className="hidden lg:flex lg:w-[45%] p-12 border-r border-slate-200 flex-col justify-between auth-aurora">
      <Logo size="lg" />
      <div className="max-w-md"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-5"><ShieldCheck className="w-4 h-4" /> Secure authentication</div><h1 className="text-4xl font-black text-slate-900 leading-tight">One secure workspace for your whole team.</h1><p className="mt-4 text-slate-600">Email/password authentication, email OTP, invitations and password reset powered by your NexuxHR cPanel, PHP, MySQL and mail server.</p></div>
      <p className="text-xs text-slate-500">© {new Date().getFullYear()} NexuxHR</p>
    </div>
    <div className="flex-1 flex items-center justify-center p-5"><div className="w-full max-w-md glass-modal rounded-2xl border border-slate-200 shadow-xl p-7">
      <div className="lg:hidden flex justify-center mb-6"><Logo size="md" /></div>
      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      {message && <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{message}</div>}

      {resetTokenFromUrl ? <form onSubmit={handleResetPassword} className="space-y-4"><h2 className="text-2xl font-black">Set a new password</h2><p className="text-sm text-slate-500">Resetting password for {resetEmailFromUrl}</p><Field icon={<Lock className="w-4 h-4" />} type="password" placeholder="New password (minimum 8 characters)" value={newPassword} onChange={setNewPassword} /><Primary loading={loading} label="Update Password" /></form> : <>
        <div className="flex p-1.5 rounded-xl bg-slate-100 mb-6 text-sm font-bold"><button onClick={() => { setActiveTab('login'); resetAlerts(); }} className={`flex-1 py-2 rounded-lg ${activeTab === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Sign In</button><button onClick={() => { setActiveTab('signup'); resetAlerts(); }} className={`flex-1 py-2 rounded-lg ${activeTab === 'signup' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Create Account</button></div>
        {activeTab === 'login' && loginStep === 'credentials' && <form onSubmit={handleEmailSignIn} className="space-y-4"><div><h2 className="text-2xl font-black">Welcome back</h2><p className="text-sm text-slate-500 mt-1">Password पछि email OTP verify हुन्छ।</p></div><Field icon={<Mail className="w-4 h-4" />} type="email" placeholder="you@nexuxhr.com" value={loginEmail} onChange={setLoginEmail} /><Field icon={<Lock className="w-4 h-4" />} type="password" placeholder="Password" value={loginPassword} onChange={setLoginPassword} /><button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-indigo-600">Forgot password?</button><Primary loading={loading} label="Continue & Send OTP" icon={<LogIn className="w-4 h-4" />} /></form>}
        {activeTab === 'login' && loginStep === 'otp' && <form onSubmit={handleVerifyLoginOtp} className="space-y-4"><div><h2 className="text-2xl font-black">Verify login</h2><p className="text-sm text-slate-500 mt-1">Check the inbox of {loginEmail}.</p></div><input autoFocus inputMode="numeric" maxLength={6} value={loginOtp} onChange={e => setLoginOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full py-3 text-center text-2xl tracking-[.4em] rounded-xl border border-slate-300" /><Primary loading={loading} label="Verify & Sign In" icon={<ShieldCheck className="w-4 h-4" />} /><button type="button" onClick={() => { setLoginStep('credentials'); resetAlerts(); }} className="w-full text-xs font-bold text-slate-500">Back to password</button></form>}
        {activeTab === 'signup' && <div className="space-y-4"><div><h2 className="text-2xl font-black">Create account</h2><p className="text-sm text-slate-500 mt-1">Step {signupStep} of 3</p></div>{signupStep === 1 && <form onSubmit={handleSendSignupOtp} className="space-y-3"><Field icon={<Mail className="w-4 h-4" />} type="email" placeholder="employee@company.com" value={signupEmail} onChange={setSignupEmail} /><input value={invitationCode} onChange={e => setInvitationCode(e.target.value)} placeholder="Invitation code (optional)" className="w-full px-3 py-2.5 rounded-xl border border-slate-300" /><Primary loading={loading} label="Send Email OTP" /></form>}{signupStep === 2 && <form onSubmit={handleSignupVerify} className="space-y-3"><input inputMode="numeric" maxLength={6} value={signupOtp} onChange={e => setSignupOtp(e.target.value.replace(/\D/g, ''))} placeholder="6-digit OTP" className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-center tracking-widest" /><Field icon={<Lock className="w-4 h-4" />} type="password" placeholder="Password (minimum 8 characters)" value={signupPassword} onChange={setSignupPassword} /><Primary loading={false} label="Continue to Profile" /></form>}{signupStep === 3 && <form onSubmit={handleFinalizeSignup} className="space-y-3"><input required value={empName} onChange={e => setEmpName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2.5 rounded-xl border border-slate-300" /><input required value={empCode} onChange={e => setEmpCode(e.target.value)} placeholder="Employee code" className="w-full px-3 py-2.5 rounded-xl border border-slate-300" /><input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Designation" className="w-full px-3 py-2.5 rounded-xl border border-slate-300" /><input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department" className="w-full px-3 py-2.5 rounded-xl border border-slate-300" /><Primary loading={loading} label="Create NexuxHR Account" /></form>}</div>}
      </>}
    </div></div>
  </div>;
};

const Field = ({ icon, type, placeholder, value, onChange }: { icon: React.ReactNode; type: string; placeholder: string; value: string; onChange: (v: string) => void }) => <div className="relative"><span className="absolute left-3 top-3 text-slate-400">{icon}</span><input required type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300" /></div>;
const Primary = ({ loading, label, icon }: { loading: boolean; label: string; icon?: React.ReactNode }) => <button disabled={loading} type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60">{icon}{loading ? 'Please wait...' : label}</button>;
