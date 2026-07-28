import React, { useState, useEffect } from 'react';
import { HRProvider, useHR } from './context/HRContext';
import { hasSession, logoutUser } from './lib/authApi';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './components/auth/LoginPage';
import { InviteModal } from './components/auth/InviteModal';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { HRManagerDashboard } from './components/hr/HRManagerDashboard';
import { SuperadminDashboard } from './components/superadmin/SuperadminDashboard';

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

      {/* Invite Team Member Modal */}
      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} />
      )}

    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasSession());

  return (
    <HRProvider>
      {isAuthenticated ? (
        <MainAppContent onLogout={() => { void logoutUser(); setIsAuthenticated(false); }} />
      ) : (
        <LoginPage onAuthenticated={() => setIsAuthenticated(true)} />
      )}
    </HRProvider>
  );
}
