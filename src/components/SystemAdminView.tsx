import React, { useState } from 'react';
import { Building2, Users, CreditCard, Activity, Search, Filter, Plus, Shield, Settings, Server } from 'lucide-react';
import { useHomeCareStore } from '../store';

export default function SystemAdminView() {
  const { tenants } = useHomeCareStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Mega admin panel sees all tenants. 
  // Let's filter out the system tenant and group them by reseller vs clinic
  const resellers = tenants.filter(t => t.id !== 'system' && !t.parentId);
  const clinics = tenants.filter(t => t.parentId != null);

  const stats = [
    { label: 'Revendas Ativas', value: resellers.length, icon: Building2, color: 'bg-indigo-500', bgColor: 'bg-indigo-50' },
    { label: 'Clínicas/Clientes', value: clinics.length + resellers.length, icon: Users, color: 'bg-green-500', bgColor: 'bg-green-50' },
    { label: 'Receita Global Estimada', value: 'R$ 45.2K', icon: CreditCard, color: 'bg-emerald-500', bgColor: 'bg-emerald-50' },
    { label: 'Status do Sistema', value: '100% Online', icon: Activity, color: 'bg-blue-500', bgColor: 'bg-blue-50' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Mega Admin - Gestão do Sistema
          </h2>
          <p className="text-gray-500 text-sm mt-1">Visão global de revendas, clientes whitelabel e faturamento.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm">
          <Plus className="w-4 h-4" />
          <span>Nova Revenda</span>
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
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-400" />
            Rede de Revendas e Clientes
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar tenant..." 
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4 pl-6">ID / Nome da Instância</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Plano</th>
                <th className="p-4">Status</th>
                <th className="p-4">Domínio / Cor Primária</th>
                <th className="p-4 text-right pr-6">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.filter(t => t.id !== 'system' && t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-lg shadow-sm border border-gray-200">
                        {tenant.logo || '🏢'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{tenant.name}</div>
                        <div className="text-xs text-gray-500">ID: {tenant.id} • CNPJ: {tenant.cnpj}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${!tenant.parentId ? 'bg-indigo-50 text-indigo-700' : 'bg-green-50 text-green-700'}`}>
                      {!tenant.parentId ? 'Revenda' : 'Clínica Cliente'}
                    </span>
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
                  <td className="p-4">
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {tenant.customDomain || 'Padrão'}
                      {tenant.primaryColor && (
                        <span className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: tenant.primaryColor }} title={tenant.primaryColor} />
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right pr-6">
                    <button className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 1 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Nenhuma instância localizada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
