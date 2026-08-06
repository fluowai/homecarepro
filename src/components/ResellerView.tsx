import React, { useState } from 'react';
import { Building, Users, CreditCard, Activity, Search, Plus, Shield, Settings, Palette, CheckCircle } from 'lucide-react';
import { useHomeCareStore } from '../store';
import { WhitelabelConfig } from './WhitelabelConfig';

export default function ResellerView() {
  const { tenants, activeTenantId } = useHomeCareStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'clinics' | 'whitelabel'>('clinics');

  // Super Admin panel sees its own tenant info and its child clinics
  const myReseller = tenants.find(t => t.id === activeTenantId);
  const myClinics = tenants.filter(t => t.parentId === activeTenantId);

  const stats = [
    { label: 'Clínicas Clientes', value: myClinics.length, icon: Building, color: 'bg-indigo-500', bgColor: 'bg-indigo-50' },
    { label: 'Pacientes Ativos (Rede)', value: 124, icon: Users, color: 'bg-green-500', bgColor: 'bg-green-50' },
    { label: 'Faturamento Mensal', value: 'R$ 15.2K', icon: CreditCard, color: 'bg-emerald-500', bgColor: 'bg-emerald-50' },
    { label: 'Visitas Hoje (Rede)', value: 45, icon: Activity, color: 'bg-blue-500', bgColor: 'bg-blue-50' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Painel da Revenda - {myReseller?.name || 'Carregando...'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">Gerencie suas clínicas clientes e configurações de Whitelabel.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm">
          <Plus className="w-4 h-4" />
          <span>Nova Clínica</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color.replace('bg-', 'text-')}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 flex items-center">
          <button 
            className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'clinics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('clinics')}
          >
            Clínicas Clientes
          </button>
          <button 
            className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'whitelabel' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('whitelabel')}
          >
            Configuração Whitelabel
          </button>
        </div>

        {activeTab === 'clinics' && (
          <div>
            <div className="p-4 border-b border-gray-100 flex justify-end">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar clínica..." 
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">ID / Nome da Clínica</th>
                    <th className="p-4">Plano</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right pr-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myClinics.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-lg shadow-sm border border-gray-200">
                            {tenant.logo || '🏥'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{tenant.name}</div>
                            <div className="text-xs text-gray-500">CNPJ: {tenant.cnpj}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium text-gray-700">{tenant.plan}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${tenant.status === 'blocked' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          <span className="text-sm text-gray-600 capitalize">{tenant.status || 'ativo'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <button className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                          <Settings className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {myClinics.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        Nenhuma clínica vinculada encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'whitelabel' && (
          <div className="p-6">
            <WhitelabelConfig />
          </div>
        )}
      </div>
    </div>
  );
}
