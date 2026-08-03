import React, { useEffect, useState } from 'react';
import { HRProvider, useHR } from './context/HRContext';
import { getCurrentUser, hasSession, logoutUser } from './lib/authApi';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './components/auth/LoginPage';
import { InviteModal } from './components/auth/InviteModal';
import { UrgentNoticeModal } from './components/common/UrgentNoticeModal';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { HRManagerDashboard } from './components/hr/HRManagerDashboard';
import { SuperadminDashboard } from './components/superadmin/SuperadminDashboard';
import { OperationManagerDashboard, AccountantDashboard } from './components/roles/RoleDashboards';
import { ProfileSetupWizard } from './components/auth/ProfileSetupWizard';
import { UserRole } from './types';

const MainAppContent: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { activeRole } = useHR();
  const [activeTab, setActiveTab] = useState('home');
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    setActiveTab(activeRole === 'superadmin' ? 'orgs' : 'home');
  }, [activeRole]);

  const renderActiveDashboard = () => {
    switch (activeRole) {
      case 'superadmin':
        return <SuperadminDashboard activeTab={activeTab} />;
      case 'admin':
        return <AdminDashboard activeTab={activeTab} />;
      case 'hr_manager':
        return <HRManagerDashboard activeTab={activeTab} />;
      case 'operation_manager':
        return <OperationManagerDashboard activeTab={activeTab} />;
      case 'accountant':
        return <AccountantDashboard activeTab={activeTab} />;
      case 'team_member':
      default:
        return <EmployeeDashboard activeTab={activeTab} />;
    }
  };

  return (
    <div className="nx-app-shell min-h-screen text-slate-900 flex flex-col font-sans selection:bg-indigo-200 selection:text-indigo-900">
      <Header onOpenInviteModal={() => setShowInviteModal(true)} onLogout={onLogout} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main id="nexuxhr-main-content" className="nx-page-enter flex-1 p-6 overflow-x-hidden min-w-0">
          {renderActiveDashboard()}
        </main>
      </div>

      <footer className="app-footer"><span>NexuxHR</span></footer>

      {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} />}
      <UrgentNoticeModal refreshKey={activeTab} />
    </div>
  );
};

/**
 * Runs inside HRProvider so a restored server session also hydrates the real
 * current user. Previously App only set `isAuthenticated=true`, leaving the
 * context on the anonymous/dummy team-member profile.
 */
const AppController: React.FC = () => {
  const { hydrateSessionFromServer, clearSession } = useHR();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [setupComplete, setSetupComplete] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let active = true;

    const validate = async () => {
      const params = new URLSearchParams(window.location.search);
      const isDedicatedAuthLink =
        params.has('invite') ||
        (params.has('token') && params.has('email')) ||
        params.get('fresh') === '1' ||
        params.get('login') === '1';

      // Invitation/password-reset links must never open inside somebody else's
      // remembered session. Marketing-site CTAs can use ?login=1 for a fresh login.
      if (isDedicatedAuthLink) {
        if (hasSession()) await logoutUser().catch(() => undefined);
        clearSession();
        if (active) {
          setIsAuthenticated(false);
          setSetupComplete(undefined);
          setCheckingSession(false);
        }
        return;
      }

      if (!hasSession()) {
        clearSession();
        if (active) {
          setIsAuthenticated(false);
          setSetupComplete(undefined);
          setCheckingSession(false);
        }
        return;
      }

      try {
        const session = await getCurrentUser();
        hydrateSessionFromServer({ ...session.user, role: session.user.role as UserRole });
        if (active) {
          setIsAuthenticated(true);
          setSetupComplete(
            session.user.role === 'superadmin'
              ? true
              : session.user.profileSetupComplete !== false,
          );
        }
      } catch {
        await logoutUser().catch(() => undefined);
        clearSession();
        if (active) {
          setIsAuthenticated(false);
          setSetupComplete(undefined);
        }
      } finally {
        if (active) setCheckingSession(false);
      }
    };

    void validate();
    return () => { active = false; };
  // This boot validation intentionally runs once; context state is hydrated inside it.
  }, []);

  const handleLogout = () => {
    void logoutUser().finally(() => {
      clearSession();
      setIsAuthenticated(false);
      setSetupComplete(undefined);
    });
  };

  const handleAuthenticated = async () => {
    setCheckingSession(true);
    try {
      const session = await getCurrentUser();
      hydrateSessionFromServer({ ...session.user, role: session.user.role as UserRole });
      setIsAuthenticated(true);
      setSetupComplete(
        session.user.role === 'superadmin'
          ? true
          : session.user.profileSetupComplete !== false,
      );
    } catch {
      await logoutUser().catch(() => undefined);
      clearSession();
      setIsAuthenticated(false);
      setSetupComplete(undefined);
    } finally {
      setCheckingSession(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="session-check-screen">
        <div className="session-check-spinner" />
        <p>Checking secure session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onAuthenticated={() => { void handleAuthenticated(); }} />;
  }

  if (setupComplete === false) {
    return (
      <ProfileSetupWizard
        onComplete={() => setSetupComplete(true)}
        onLogout={handleLogout}
      />
    );
  }

  return <MainAppContent onLogout={handleLogout} />;
};

export default function App() {
  return (
    <HRProvider>
      <AppController />
    </HRProvider>
  );
}
