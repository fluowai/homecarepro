import React from 'react';
import { Activity, Users, MapPin, Bell, Menu } from 'lucide-react';

interface MobileNavProps {
  currentView: string;
  setView: (view: string) => void;
  onMenuClick: () => void;
}

export default function MobileNav({ currentView, setView, onMenuClick }: MobileNavProps) {
  const items = [
    { id: 'dashboard', label: 'Painel', icon: Activity },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'checkin', label: 'Check-in', icon: MapPin },
    { id: 'alerts', label: 'Alertas', icon: Bell },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 flex items-center justify-around px-2 z-30 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'fill-blue-50' : ''}`} />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
            {isActive && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600" />}
          </button>
        );
      })}
      
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center gap-1 w-full h-full text-gray-400"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] font-medium leading-none">Mais</span>
      </button>
    </nav>
  );
}
