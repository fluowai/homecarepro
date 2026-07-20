/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardView from './components/DashboardView';
import PatientsView from './components/PatientsView';
import SchedulesView from './components/SchedulesView';
import ProfessionalsView from './components/ProfessionalsView';
import CheckInView from './components/CheckInView';
import CommunicationView from './components/CommunicationView';
import FinanceView from './components/FinanceView';
import CrmView from './components/CrmView';
import MedicinesView from './components/MedicinesView';
import SatisfactionView from './components/SatisfactionView';
import AlertsView from './components/AlertsView';

export default function App() {
  const [currentView, setView] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView setView={setView} searchQuery={searchQuery} />;
      case 'patients':
        return <PatientsView searchQuery={searchQuery} />;
      case 'schedules':
        return <SchedulesView />;
      case 'professionals':
        return <ProfessionalsView />;
      case 'checkin':
        return <CheckInView />;
      case 'medicines':
        return <MedicinesView />;
      case 'satisfaction':
        return <SatisfactionView />;
      case 'alerts':
        return <AlertsView />;
      case 'communication':
        return <CommunicationView />;
      case 'finance':
        return <FinanceView />;
      case 'crm':
        return <CrmView />;
      default:
        return <DashboardView setView={setView} searchQuery={searchQuery} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased text-slate-800">
      {/* SaaS Navigation Sidebar */}
      <Sidebar currentView={currentView} setView={setView} />

      {/* Main Panel Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Topbar with Search & Notification Panel */}
        <Topbar onSearch={setSearchQuery} />

        {/* Dynamic View container */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

