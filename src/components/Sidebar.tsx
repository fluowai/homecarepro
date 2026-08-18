import React, { useState } from 'react';
import { 
  Activity, 
  Users, 
  Calendar, 
  UserSquare2, 
  MapPin, 
  MessageSquare, 
  DollarSign, 
  TrendingUp,
  Building2,
  Heart,
  Pill,
  Star,
  Bell,
  X,
  Shield,
  FileText,
  LineChart,
  PieChart,
  Settings,
  Plug,
  Lock,
  ChevronDown,
  ChevronRight,
  Server,
  FileSignature
} from 'lucide-react';
import { useHomeCareStore } from '../store';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentView, setView, isOpen, onClose }: SidebarProps) {
  const { tenants, activeTenantId, setActiveTenant, currentUserRole } = useHomeCareStore();
  const activeTenant = tenants.find(t => t.id === activeTenantId) || tenants[0];
  
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'system_admin': true,
    'reseller': true
  });

  const toggleMenu = (id: string) => {
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const roleLabels: Record<string, string> = {
    mega_admin: 'Mega Admin (Dono)',
    super_admin: 'Super Admin (Revenda)',
    admin: 'Administrador (Clínica)',
    auditor: 'Auditor (Leitura/Alertas)',
    professional: 'Profissional (Operação)',
    patient: 'Paciente/Familiar',
    viewer: 'Visualizador',
    system_support: 'Suporte (Sistema)',
    operator: 'Operador',
  };

  interface MenuItem {
    id: string;
    label: string;
    icon: typeof Activity;
    roles: string[];
    subItems?: { id: string; label: string }[];
  }

  const menuGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: 'OPERAÇÃO',
      items: [
        { id: 'dashboard', label: 'Painel Geral', icon: Activity, roles: ['admin', 'auditor', 'professional'] },
        { id: 'patients', label: 'Pacientes', icon: Users, roles: ['admin', 'auditor', 'professional'] },
        { id: 'schedules', label: 'Agenda', icon: Calendar, roles: ['admin', 'auditor', 'professional'] },
        { id: 'checkin', label: 'Check-ins', icon: MapPin, roles: ['admin', 'professional'] },
        { id: 'professionals', label: 'Profissionais', icon: UserSquare2, roles: ['admin', 'auditor'] },
      ]
    },
    {
      title: 'CLÍNICO',
      items: [
        { id: 'records', label: 'Prontuários', icon: FileText, roles: ['admin', 'auditor', 'professional'] },
        { id: 'medicines', label: 'Medicamentos', icon: Pill, roles: ['admin', 'auditor', 'professional'] },
        { id: 'insurances', label: 'Convênios', icon: Building2, roles: ['admin'] },
        { id: 'alerts', label: 'Alertas', icon: Bell, roles: ['admin', 'auditor'] },
        { id: 'satisfaction', label: 'Pesquisas', icon: Star, roles: ['admin', 'auditor'] },
      ]
    },
    {
      title: 'COMERCIAL',
      items: [
        { id: 'crm', label: 'CRM', icon: TrendingUp, roles: ['admin'] },
        { id: 'contracts', label: 'Contratos', icon: FileSignature, roles: ['admin'] },
        { id: 'finance', label: 'Financeiro / NF-e', icon: DollarSign, roles: ['admin'] },
        { id: 'reports', label: 'Relatórios', icon: LineChart, roles: ['admin', 'auditor'] },
      ]
    },
    {
      title: 'INTELIGÊNCIA',
      items: [
        { id: 'ai', label: 'IA Clínica', icon: Heart, roles: ['admin', 'auditor', 'professional', 'super_admin'] },
        { id: 'analytics', label: 'Analytics', icon: PieChart, roles: ['admin', 'super_admin'] },
      ]
    },
    {
      title: 'SAAS MULTI-NÍVEL',
      items: [
        { 
          id: 'system_admin', 
          label: 'Painel Mega Admin', 
          icon: Server, 
          roles: ['mega_admin'],
          subItems: [
            { id: 'mega_overview', label: 'Visão Geral' },
            { id: 'mega_network', label: 'Cadastro & Rede' },
            { id: 'mega_plans', label: 'Planos' },
            { id: 'mega_domains', label: 'Validação de Domínios' },
            { id: 'mega_support', label: 'Suporte' },
            { id: 'mega_users', label: 'Usuários Globais' },
            { id: 'mega_team', label: 'Time Interno' }
          ]
        },
        { 
          id: 'reseller', 
          label: 'Painel Super Admin', 
          icon: Building2, 
          roles: ['super_admin'],
          subItems: [
            { id: 'super_overview', label: 'Visão Geral' },
            { id: 'super_clinics', label: 'Cadastro & Clínicas' },
            { id: 'super_plans', label: 'Planos' },
            { id: 'super_domains', label: 'Validação de Domínios' },
            { id: 'super_users', label: 'Usuários e Equipe' },
            { id: 'super_whitelabel', label: 'Configuração Whitelabel' },
            { id: 'super_support', label: 'Suporte' }
          ]
        },
      ]
    },
    {
      title: 'COOPERATIVA',
      items: activeTenant?.tenantType === 'cooperativa' ? [
        { id: 'coop_finance', label: 'Repasses e Gamificação', icon: TrendingUp, roles: ['admin', 'professional'] },
        { id: 'assemblies', label: 'Módulo Societário', icon: Users, roles: ['admin', 'professional'] },
      ] : []
    },
    {
      title: 'ADMINISTRAÇÃO',
      items: [
        { id: 'users', label: 'Usuários', icon: Users, roles: ['admin'] },
        { id: 'permissions', label: 'Permissões', icon: Lock, roles: ['admin'] },
        { id: 'integrations', label: 'Integrações', icon: Plug, roles: ['admin'] },
        { id: 'settings', label: 'Configurações', icon: Settings, roles: ['admin'] },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside 
        id="sidebar-container" 
        className={`w-[280px] bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center shadow-soft shadow-green-600/20">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">HomeCare Pro</span>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Multi-Tenant Premium Selector */}
        <div className="px-4 mb-4">
          <button className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 hover:border-green-300 hover:shadow-soft rounded-2xl transition-all group">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-lg shadow-sm">
                {activeTenant?.logo || '🏢'}
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate leading-none mb-1.5">{activeTenant?.name || 'Sistema'}</p>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 font-bold text-[9px] uppercase tracking-wider">
                    {activeTenant?.plan || 'PRO'}
                  </span>
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar">
          {menuGroups.map((group, groupIdx) => {
            const filteredItems = group.items.filter(item => item.roles.includes(currentUserRole));
            
            if (filteredItems.length === 0) return null;

            return (
              <div key={groupIdx} className="mb-6 last:mb-0">
                <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">
                  {group.title}
                </h4>
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isExpanded = expandedMenus[item.id];
                    const isParentActive = currentView === item.id || (hasSubItems && item.subItems.some(sub => sub.id === currentView));
                    
                    if (hasSubItems) {
                      return (
                        <div key={item.id} className="space-y-1">
                          <button
                            onClick={() => toggleMenu(item.id)}
                            className={`w-full flex items-center justify-between px-3 h-12 rounded-xl font-medium text-sm transition-all duration-200 ${
                              isParentActive
                                ? 'bg-green-50/50 text-green-800 shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${
                                isParentActive ? 'text-green-600' : 'text-gray-400'
                              }`} />
                              <span className="truncate">{item.label}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {isExpanded && (
                            <div className="pl-11 pr-2 py-1 space-y-1">
                              {item.subItems.map((subItem: any) => (
                                <button
                                  key={subItem.id}
                                  onClick={() => setView(subItem.id)}
                                  className={`w-full flex items-center gap-3 px-3 h-10 rounded-lg font-medium text-[13px] transition-all duration-200 ${
                                    currentView === subItem.id
                                      ? 'bg-green-50 text-green-700 font-bold shadow-sm'
                                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                  }`}
                                >
                                  <span className="truncate">{subItem.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setView(item.id)}
                        className={`w-full flex items-center gap-3 px-3 h-12 rounded-xl font-medium text-sm transition-all duration-200 ${
                          isActive
                            ? 'bg-green-50 text-green-700 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${
                          isActive ? 'text-green-600' : 'text-gray-400'
                        }`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                {groupIdx < menuGroups.length - 1 && (
                  <div className="h-px bg-gray-100 mt-6 mx-2" />
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer info & Current Role */}
        <div className="mt-auto border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5 mb-2 px-1">
              <Shield className="w-3 h-3 text-green-600" /> Nível de Acesso
            </label>
            <p className="px-2 text-sm font-medium text-gray-700">
              {roleLabels[currentUserRole] || currentUserRole}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
