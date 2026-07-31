import React, { useState, useEffect } from 'react';
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

const MainAppContent: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { activeRole } = useHR();
  const [activeTab, setActiveTab] = useState('home');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Reset active tab to default 'home' (or 'orgs' for superadmin) whenever activeRole changes
  useEffect(() => {
    if (activeRole === 'superadmin') {
      setActiveTab('orgs');
    } else {
      setActiveTab('home');
    }
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-200 selection:text-indigo-900">
      
      {/* Top Header Navigation */}
      <Header onOpenInviteModal={() => setShowInviteModal(true)} onLogout={onLogout} />

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        
        {/* Left Responsive Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Dynamic Main Dashboard View Area */}
        <main id="nexuxhr-main-content" className="flex-1 p-6 overflow-x-hidden min-w-0">
          {renderActiveDashboard()}
        </main>

      </div>

      <footer className="app-footer"><span>NexuxHR</span></footer>
      {/* Invite Team Member Modal */}
      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} />
      )}

      {/* Urgent notices block the screen until acknowledged, on any tab. */}
      <UrgentNoticeModal refreshKey={activeTab} />

    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  /** Undefined until the session is validated. False sends the user to onboarding. */
  const [setupComplete, setSetupComplete] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const validate = async () => {
      if (!hasSession()) {
        if (active) { setIsAuthenticated(false); setCheckingSession(false); }
        return;
      }
      try {
        const session = await getCurrentUser();
        if (active) {
          setIsAuthenticated(true);
          // Superadmin has no employee profile, so onboarding never applies.
          const role = session.user?.role;
          setSetupComplete(role === 'superadmin' ? true : session.user?.profileSetupComplete !== false);
        }
      } catch {
        await logoutUser().catch(() => undefined);
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setCheckingSession(false);
      }
    };
    void validate();
    return () => { active = false; };
  }, []);

  if (checkingSession) {
    return <div className="session-check-screen"><div className="session-check-spinner" /><p>Checking secure session…</p></div>;
  }

  const handleLogout = () => {
    void logoutUser();
    setIsAuthenticated(false);
    setSetupComplete(undefined);
  };

  const handleAuthenticated = async () => {
    setIsAuthenticated(true);
    try {
      const session = await getCurrentUser();
      const role = session.user?.role;
      setSetupComplete(role === 'superadmin' ? true : session.user?.profileSetupComplete !== false);
    } catch {
      // If the check fails, let them in rather than trapping them in onboarding.
      setSetupComplete(true);
    }
  };

  return (
    <HRProvider>
      {!isAuthenticated ? (
        <LoginPage onAuthenticated={() => { void handleAuthenticated(); }} />
      ) : setupComplete === false ? (
        <ProfileSetupWizard
          onComplete={() => setSetupComplete(true)}
          onLogout={handleLogout}
        />
      ) : (
        <MainAppContent onLogout={handleLogout} />
      )}
    </HRProvider>
  );
}
