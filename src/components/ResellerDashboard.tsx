import React, { useState } from 'react';
import { Building2, Users, CreditCard, ChevronRight, Search, Plus } from 'lucide-react';
import { useHomeCareStore } from '../store';

export function ResellerDashboard() {
  const { profile } = useHomeCareStore();
  
  // Mock data
  const [tenants] = useState([
    { id: '1', name: 'Clínica Bem Estar', plan: 'Pro', usersCount: 15, status: 'active' },
    { id: '2', name: 'HomeCare Vida', plan: 'Starter', usersCount: 5, status: 'active' },
    { id: '3', name: 'Saúde em Casa', plan: 'Enterprise', usersCount: 42, status: 'inactive' },
  ]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel da Revenda</h1>
          <p className="text-gray-500 mt-1">Gerencie suas clínicas e faturamento</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition">
          <Plus className="w-5 h-5" /> Nova Clínica
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Total de Clínicas</p>
            <h3 className="text-2xl font-bold text-gray-900">{tenants.length}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Usuários Ativos</p>
            <h3 className="text-2xl font-bold text-gray-900">{tenants.reduce((acc, t) => acc + t.usersCount, 0)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium">Faturamento (MRR)</p>
            <h3 className="text-2xl font-bold text-gray-900">R$ 14.500</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">Clínicas Gerenciadas</h2>
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Buscar clínica..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none w-64" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-sm text-gray-500">
                <th className="p-4 font-medium">Nome da Clínica</th>
                <th className="p-4 font-medium">Plano Atual</th>
                <th className="p-4 font-medium">Usuários</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(tenant => (
                <tr key={tenant.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition group">
                  <td className="p-4">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                       <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                          {tenant.name.substring(0,2).toUpperCase()}
                       </div>
                       {tenant.name}
                    </div>
                  </td>
                  <td className="p-4">
                     <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {tenant.plan}
                     </span>
                  </td>
                  <td className="p-4 text-gray-600">{tenant.usersCount} ativos</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {tenant.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center justify-end gap-1 w-full opacity-0 group-hover:opacity-100 transition">
                      Acessar <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
