import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { DashboardPage } from './pages/DashboardPage';
import { JobOpeningsPage } from './pages/JobOpeningsPage';
import { CandidatesKanbanPage } from './pages/CandidatesKanbanPage';
import { AllCandidatesPage } from './pages/AllCandidatesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const MainContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm font-bold">
        Loading TalentMetrics Analytics...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Recruitment Analytics Dashboard';
      case 'jobs': return 'Job Openings & Requisitions';
      case 'candidates': return 'Candidates Pipeline Kanban';
      case 'all-candidates': return 'All Candidates Directory & Google Sheet Sync';
      case 'reports': return 'Reports & Sourcing ROI';
      case 'settings': return 'System Settings & User Roles';
      default: return 'HR Recruitment Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors duration-200">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar 
          title={getTitle()} 
          onRefresh={() => setRefreshKey(prev => prev + 1)} 
        />
        <main className="flex-1 overflow-y-auto" key={refreshKey}>
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'jobs' && <JobOpeningsPage />}
          {activeTab === 'candidates' && <CandidatesKanbanPage />}
          {activeTab === 'all-candidates' && <AllCandidatesPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
