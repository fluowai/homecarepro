/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Loader2, Heart } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import MobileNav from './components/MobileNav';
import AuthView from './components/AuthView';
import InviteAcceptView from './components/InviteAcceptView';
import { supabase } from './lib/supabase';
import { useHomeCareStore } from './store';

const DashboardView = lazy(() => import('./components/DashboardView'));
const PatientsView = lazy(() => import('./components/PatientsView'));
const SchedulesView = lazy(() => import('./components/SchedulesView'));
const ProfessionalsView = lazy(() => import('./components/ProfessionalsView'));
const InsurancesView = lazy(() => import('./components/InsurancesView'));
const CheckInView = lazy(() => import('./components/CheckInView'));
const CommunicationView = lazy(() => import('./components/CommunicationView'));
const FinanceView = lazy(() => import('./components/FinanceView'));
const CrmView = lazy(() => import('./components/CrmView'));
const MedicinesView = lazy(() => import('./components/MedicinesView'));
const SatisfactionView = lazy(() => import('./components/SatisfactionView'));
const AlertsView = lazy(() => import('./components/AlertsView'));
const ContractsView = lazy(() => import('./components/ContractsView'));
const SystemAdminView = lazy(() => import('./components/SystemAdminView'));
const ResellerView = lazy(() => import('./components/ResellerView'));
const FamilyDashboardView = lazy(() => import('./components/FamilyDashboardView'));
const CoopFinanceView = lazy(() => import('./components/CoopFinanceView'));
const AssembliesView = lazy(() => import('./components/AssembliesView'));
const TenantUserManager = lazy(() => import('./components/TenantUserManager').then(m => ({ default: m.default || m.TenantUserManager })));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-indigo-50 flex flex-col items-center justify-center gap-4">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl shadow-lg shadow-green-600/20">
        <Heart className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-xl font-semibold text-slate-900">HomeCare Pro</h1>
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando sistema...
      </div>
    </div>
  );
}

function ViewLoader() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando...
      </div>
    </div>
  );
}

export default function App() {
  const [currentView, setView] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const init = useHomeCareStore((s) => s.init);
  const isLoading = useHomeCareStore((s) => s.isLoading);
  const isAuthenticated = useHomeCareStore((s) => s.isAuthenticated);
  const tenants = useHomeCareStore((s) => s.tenants);
  const activeTenantId = useHomeCareStore((s) => s.activeTenantId);
  const currentUserRole = useHomeCareStore((s) => s.currentUserRole);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (currentUserRole === 'mega_admin' && currentView === 'dashboard') {
      setView('mega_overview');
    } else if (currentUserRole === 'super_admin' && currentView === 'dashboard') {
      setView('super_overview');
    }
  }, [currentUserRole, currentView]);

  const inviteToken = new URLSearchParams(window.location.search).get('invite');

  if (inviteToken) {
    return <InviteAcceptView token={inviteToken} />;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  const handleSetView = (view: string) => {
    setView(view);
    setIsSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        if (currentUserRole === 'patient') {
          return <FamilyDashboardView />;
        }
        return <DashboardView setView={handleSetView} searchQuery={searchQuery} />;
      case 'patients':
        return <PatientsView searchQuery={searchQuery} />;
      case 'schedules':
        return <SchedulesView />;
      case 'professionals':
        return <ProfessionalsView />;
      case 'insurances':
        return <InsurancesView />;
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
      case 'contracts':
        return <ContractsView />;
      case 'coop_finance':
        return <CoopFinanceView />;
      case 'assemblies':
        return <AssembliesView />;
      case 'users':
        return <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto"><TenantUserManager /></div>;
      case 'mega_overview':
      case 'mega_network':
      case 'mega_plans':
      case 'mega_domains':
      case 'mega_support':
      case 'mega_users':
      case 'mega_team':
        return <SystemAdminView activeSection={currentView.replace('mega_', '')} onExit={handleSetView} />;
      case 'super_overview':
      case 'super_clinics':
      case 'super_plans':
      case 'super_domains':
      case 'super_users':
      case 'super_whitelabel':
      case 'super_support':
        return <ResellerView activeSection={currentView.replace('super_', '')} onExit={handleSetView} />;
      default:
        return <DashboardView setView={handleSetView} searchQuery={searchQuery} />;
    }
  };

  const activeTenant = tenants.find(t => t.id === activeTenantId);
  const whitelabelTenant = activeTenant?.parentId ? tenants.find(t => t.id === activeTenant.parentId) : activeTenant;
  const primaryColor = whitelabelTenant?.primaryColor;
  const secondaryColor = whitelabelTenant?.secondaryColor;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans antialiased text-gray-900">
      {(primaryColor || secondaryColor) && (
        <style>
          {`
            :root {
              ${primaryColor ? `--color-green-500: ${primaryColor}; --color-green-600: ${primaryColor}; --color-green-700: ${primaryColor};` : ''}
              ${secondaryColor ? `--color-indigo-500: ${secondaryColor}; --color-indigo-600: ${secondaryColor}; --color-indigo-700: ${secondaryColor};` : ''}
            }
          `}
        </style>
      )}

      <Sidebar
        currentView={currentView}
        setView={handleSetView}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-[280px] flex flex-col min-h-screen pb-16 lg:pb-0">
        <Topbar
          onSearch={setSearchQuery}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Suspense fallback={<ViewLoader />}>
            {renderActiveView()}
          </Suspense>
        </main>

        <MobileNav
          currentView={currentView}
          setView={handleSetView}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
      </div>
    </div>
  );
}
