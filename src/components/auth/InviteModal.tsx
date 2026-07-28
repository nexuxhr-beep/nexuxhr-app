import React, { useState } from 'react';
import { useHR } from '../../context/HRContext';
import { UserRole } from '../../types';
import { Logo } from '../common/Logo';
import {
  X,
  UserPlus,
  Send,
  Copy,
  Check,
} from 'lucide-react';

interface InviteModalProps {
  onClose: () => void;
}

/**
 * Post-login modal for Admin / HR / Superadmin to invite new team members.
 * (Login and signup now live on the dedicated LoginPage.)
 */
export const InviteModal: React.FC<InviteModalProps> = ({ onClose }) => {
  const { invitations, createInvitation } = useHR();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('team_member');
  const [lastCreatedInviteCode, setLastCreatedInviteCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [sending, setSending] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    setInviteError('');
    try {
      const inv = await createInvitation(inviteEmail, inviteRole);
      setLastCreatedInviteCode(inv.code);
      setInviteEmail('');
    } catch (err: any) {
      setInviteError(err.message || 'Could not send the invitation.');
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-modal max-w-lg w-full p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6 my-8 border border-slate-900/10">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-900/10 pb-4">
          <Logo size="md" showSubtitle={false} />
          <button onClick={onClose} className="p-2 rounded-xl glass-card text-slate-500 hover:text-slate-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-400" /> Invite a Team Member
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Sends an invitation email with a signup link directly to the new hire, with an auto-assigned Employee ID.
          </p>
        </div>

        {inviteError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">{inviteError}</div>
        )}

        <form onSubmit={handleGenerateInvite} className="glass-card p-4 rounded-xl border border-slate-900/10 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Target Email *</label>
              <input
                type="email"
                required
                placeholder="new.hire@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Assign Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 rounded-xl glass-input text-slate-900"
              >
                <option value="team_member">Team Member (Employee)</option>
                <option value="hr_manager">HR Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-2 rounded-xl glass-btn-primary text-white font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Send className="w-4 h-4" /> {sending ? 'Sending invite email...' : 'Send Invite Email & Bind Employee ID'}
          </button>
        </form>

        {lastCreatedInviteCode && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-500/40 text-emerald-700 flex items-center justify-between">
            <div>
              <div className="font-bold text-xs">Invitation Generated!</div>
              <div className="font-mono text-[11px] text-emerald-700 mt-0.5">Code: {lastCreatedInviteCode}</div>
            </div>
            <button
              onClick={() => copyToClipboard(lastCreatedInviteCode)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1 text-xs shadow-md transition-colors hover:bg-emerald-500"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        )}

        <div className="space-y-2">
          <h5 className="font-bold text-slate-600 text-xs">Pending Invitations ({invitations.length})</h5>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {invitations.length === 0 && (
              <p className="text-[11px] text-slate-500 italic">No invitations sent yet.</p>
            )}
            {invitations.map(inv => (
              <div key={inv.id} className="p-2.5 rounded-lg glass-card flex items-center justify-between text-[11px]">
                <div>
                  <div className="font-bold text-slate-800">{inv.email}</div>
                  <div className="text-slate-500">Emp ID: <span className="font-mono text-indigo-700">{inv.employeeId}</span> | Role: {inv.role}</div>
                </div>
                <span className="font-mono bg-indigo-50 border border-indigo-500/30 px-2 py-0.5 rounded text-indigo-700 font-bold">{inv.code}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
