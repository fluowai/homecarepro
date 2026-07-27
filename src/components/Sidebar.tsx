import React from 'react';
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
  X
} from 'lucide-react';
import { useHomeCareStore } from '../store';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentView, setView, isOpen, onClose }: SidebarProps) {
  const { tenants, activeTenantId, setActiveTenant } = useHomeCareStore();
  const activeTenant = tenants.find(t => t.id === activeTenantId) || tenants[0];

  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: Activity },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'schedules', label: 'Escalas & Agenda', icon: Calendar },
    { id: 'professionals', label: 'Profissionais', icon: UserSquare2 },
    { id: 'checkin', label: 'Check-in de Visitas', icon: MapPin },
    { id: 'medicines', label: 'Estoque de Medicamentos', icon: Pill },
    { id: 'satisfaction', label: 'Pesquisas de Satisfação', icon: Star },
    { id: 'alerts', label: 'Configurar Alertas', icon: Bell },
    { id: 'communication', label: 'Comunicação', icon: MessageSquare },
    { id: 'finance', label: 'Financeiro', icon: DollarSign },
    { id: 'crm', label: 'CRM de Vendas', icon: TrendingUp },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside 
        id="sidebar-container" 
        className={`w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-800">HomeCare Pro</span>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

      {/* Tenant Switcher */}
      <div className="p-4 mx-4 my-2 bg-gray-100/80 rounded-xl">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-2 px-1">
          Multi-Tenant
        </label>
        <div className="relative">
          <select
            value={activeTenantId}
            onChange={(e) => setActiveTenant(e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer appearance-none font-medium"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.logo} {t.name.split(' ')[2] || t.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 px-1 flex items-center justify-between text-[11px] text-gray-500">
          <span>CNPJ: {activeTenant.cnpj}</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold text-[9px] uppercase tracking-wider">
            {activeTenant.plan}
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-2 mt-auto">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span>API de WhatsApp Ativa</span>
      </div>
    </aside>
    </>
  );
}
