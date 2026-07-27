import React, { useState } from 'react';
import { Search, Bell, Sparkles, User, LogOut, CheckCircle2, ShieldAlert, Menu, X } from 'lucide-react';
import { useHomeCareStore } from '../store';

interface TopbarProps {
  onSearch: (query: string) => void;
  onMenuClick?: () => void;
}

export default function Topbar({ onSearch, onMenuClick }: TopbarProps) {
  const { patients, activeTenantId } = useHomeCareStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // Get active tenant patients
  const tenantPatients = patients.filter(p => p.tenantId === activeTenantId);

  // Generate some high-value clinical notifications / smart alerts
  const notifications = [
    {
      id: 'n-1',
      title: 'Check-in de Visita Efetuado',
      desc: 'Carlos Santos iniciou atendimento com Seu Geraldo.',
      type: 'success',
      time: 'Há 5 min'
    },
    {
      id: 'n-2',
      title: 'Alerta Inteligente de IA',
      desc: 'Ana Júlia está sem visitas registradas nos últimos 5 dias.',
      type: 'warning',
      time: 'Há 1 hora'
    },
    {
      id: 'n-3',
      title: 'Mensagem do WhatsApp não lida',
      desc: 'Filha da Dona Francisca enviou pergunta sobre a escala.',
      type: 'info',
      time: 'Há 2 horas'
    }
  ];

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 z-10 shadow-sm sticky top-0 w-full">
      {/* Mobile Menu Toggle */}
      <button 
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-blue-600 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Global Search */}
      <div className={`flex-1 max-w-md ml-2 lg:ml-0 ${isSearchExpanded ? 'fixed inset-0 bg-white z-50 p-4 flex items-center' : ''}`}>
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Pesquisar..."
            onFocus={() => setIsSearchExpanded(true)}
            onBlur={() => setTimeout(() => setIsSearchExpanded(false), 200)}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-800"
          />
          {isSearchExpanded && (
            <button 
              className="absolute right-3 top-1/2 -translate-y-1/2 lg:hidden text-gray-400"
              onClick={() => setIsSearchExpanded(false)}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right Tools */}
      <div className="flex items-center gap-4">
        {/* Smart AI Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium text-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          <span>Servidor de IA Online</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors relative"
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-2">
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-800">Alertas & Notificações</span>
                <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">3 Pendentes</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-gray-50 transition-colors flex gap-2.5">
                    <div className="mt-0.5 flex-shrink-0">
                      {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {n.type === 'warning' && <ShieldAlert className="w-4 h-4 text-amber-500" />}
                      {n.type === 'info' && <Bell className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-xs text-gray-800">{n.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
                      <span className="text-[10px] text-gray-400 block mt-1">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-gray-200 mx-2"></div>

        {/* User Info / Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-gray-800 leading-none">Dra. Helena Martins</p>
            <p className="text-xs text-gray-500 mt-1">Coordenadora Clínica</p>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120" 
            className="w-10 h-10 rounded-full border border-gray-200 object-cover" 
            alt="Avatar"
          />
        </div>
      </div>
    </header>
  );
}
