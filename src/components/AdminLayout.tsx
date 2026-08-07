import React from 'react';
import { ArrowLeft, LogOut, Shield, X, ChevronDown } from 'lucide-react';
import { useHomeCareStore } from '../store';

export interface AdminMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface AdminMenuGroup {
  title: string;
  items: AdminMenuItem[];
}

interface AdminLayoutProps {
  brand: string;
  brandSubtitle: string;
  accent: 'indigo' | 'purple';
  title: string;
  subtitle: string;
  menuGroups: AdminMenuGroup[];
  active: string;
  onSelect: (id: string) => void;
  onExit: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const ACCENTS = {
  indigo: {
    activeBg: 'bg-indigo-50 text-indigo-700',
    activeIcon: 'text-indigo-600',
    button: 'bg-indigo-600 hover:bg-indigo-700',
    iconBg: 'bg-indigo-100 text-indigo-700',
    ring: 'focus:ring-indigo-500/20 focus:border-indigo-500',
    dot: 'bg-indigo-600',
  },
  purple: {
    activeBg: 'bg-purple-50 text-purple-700',
    activeIcon: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
    iconBg: 'bg-purple-100 text-purple-700',
    ring: 'focus:ring-purple-500/20 focus:border-purple-500',
    dot: 'bg-purple-600',
  },
} as const;

export function AdminLayout({
  brand,
  brandSubtitle,
  accent,
  title,
  subtitle,
  menuGroups,
  active,
  onSelect,
  onExit,
  actions,
  children,
}: AdminLayoutProps) {
  const { profile, signOut, currentUserRole } = useHomeCareStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const accentCfg = ACCENTS[accent];

  const roleLabels: Record<string, string> = {
    mega_admin: 'Mega Admin (Dono)',
    super_admin: 'Super Admin (Revenda)',
    admin: 'Administrador (Clínica)',
  };

  const selectView = (id: string) => {
    onSelect(id);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans antialiased text-gray-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Menu lateral exclusivo de gestão */}
      <aside
        className={`w-[280px] bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 ${accentCfg.iconBg} rounded-xl flex items-center justify-center shadow-soft`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-lg tracking-tight text-gray-900 leading-none">{brand}</p>
              <p className="text-[11px] text-gray-500 mt-1">{brandSubtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 mb-4">
          <div className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-2xl">
            <div className="w-10 h-10 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-lg shadow-sm">
              🏢
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate leading-none mb-1.5">Sistema HomeCare Pro</p>
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded-md ${accentCfg.activeBg} font-bold text-[9px] uppercase tracking-wider`}>
                  Gestão
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="mb-6 last:mb-0">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">
                {group.title}
              </h4>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => selectView(item.id)}
                      className={`w-full flex items-center gap-3 px-3 h-12 rounded-xl font-medium text-sm transition-all duration-200 ${
                        isActive
                          ? accentCfg.activeBg + ' shadow-sm'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${
                        isActive ? accentCfg.activeIcon : 'text-gray-400'
                      }`} />
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-600 text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {groupIdx < menuGroups.length - 1 && (
                <div className="h-px bg-gray-100 mt-6 mx-2" />
              )}
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-gray-100 p-4 space-y-3 bg-gray-50/50">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5 mb-2 px-1">
              <Shield className={`w-3 h-3 ${accentCfg.activeIcon}`} /> Nível de Acesso
            </label>
            <p className="px-2 text-sm font-medium text-gray-700">
              {roleLabels[currentUserRole] || currentUserRole}
            </p>
          </div>
          <button
            onClick={onExit}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao sistema
          </button>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Área de conteúdo (direita) */}
      <div className="flex-1 lg:pl-[280px] flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 lg:px-8 z-10 shadow-sm sticky top-0 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate">{title}</h1>
              <p className="text-xs text-gray-500 truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {actions}
            <div className="h-8 w-px bg-gray-200 hidden md:block" />
            <div className="hidden md:flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {profile?.full_name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="hidden lg:block text-right">
                <p className="text-sm font-semibold text-gray-800 leading-none">{profile?.full_name || 'Administrador'}</p>
                <p className="text-xs text-gray-500 mt-1">{brand}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function Menu({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
