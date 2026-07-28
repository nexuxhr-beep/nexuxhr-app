const API_BASE = (import.meta.env.VITE_AUTH_API_URL || 'https://nexuxhr.com/api').replace(/\/$/, '');
const TOKEN_KEY = 'nexuxhr_session_token';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
}

function token(): string | null { return localStorage.getItem(TOKEN_KEY); }

async function request<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`${API_BASE}/index.php?action=${encodeURIComponent(action)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({ message: 'Invalid server response.' }));
  if (!response.ok || data.success === false) throw new Error(data.message || 'Request failed.');
  return data as T;
}

export function hasSession(): boolean { return Boolean(token()); }
export function clearSessionToken(): void { localStorage.removeItem(TOKEN_KEY); }

export async function sendSignupOtp(email: string, invitationCode?: string, fullName?: string) {
  return request<{ success: true; message: string }>('send_signup_otp', { email, invitationCode, fullName });
}

export async function completeSignup(payload: {
  email: string;
  password: string;
  otp: string;
  invitationCode?: string;
  profile: { name: string; employeeCode: string; designation: string; department: string };
}) {
  const result = await request<{ success: true; token: string; user: AuthUser }>('complete_signup', payload);
  localStorage.setItem(TOKEN_KEY, result.token);
  return result;
}

export async function sendLoginOtp(email: string, password: string) {
  return request<{ success: true; message: string; challengeId: string }>('login', { email, password });
}

export async function verifyLoginOtp(email: string, otp: string, challengeId: string) {
  const result = await request<{ success: true; token: string; user: AuthUser }>('verify_login_otp', { email, otp, challengeId });
  localStorage.setItem(TOKEN_KEY, result.token);
  return result;
}

export async function requestPasswordReset(email: string) {
  return request<{ success: true; message: string }>('request_password_reset', { email });
}

export async function resetPassword(email: string, resetToken: string, newPassword: string) {
  return request<{ success: true; message: string }>('reset_password', { email, resetToken, newPassword });
}

export async function createInvitation(email: string, role: string) {
  return request<{ success: true; message: string; code: string }>('create_invitation', { email, role });
}

export interface DirectoryUser {
  id: number;
  email: string;
  fullName: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export async function listUsers() {
  return request<{ success: true; users: DirectoryUser[] }>('list_users');
}

export async function setUserStatus(userId: number, status: 'active' | 'inactive') {
  return request<{ success: true; message: string }>('set_user_status', { userId, status });
}

export async function getCurrentSession() {
  return request<{ success: true; user: AuthUser }>('me');
}

export async function logoutUser() {
  try { await request('logout'); } finally { clearSessionToken(); }
}
