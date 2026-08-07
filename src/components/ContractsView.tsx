import React, { useState } from 'react';
import { FileText, Plus, Search, FileSignature, CheckCircle2, AlertCircle, Eye, Download } from 'lucide-react';
import { useHomeCareStore } from '../store';

export default function ContractsView() {
  const { patients, activeTenantId } = useHomeCareStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock contracts data
  const tenantPatients = patients.filter(p => p.tenantId === activeTenantId);
  
  const contracts = tenantPatients.map((p, index) => ({
    id: `cont-${p.id}`,
    patientName: p.name,
    title: `Contrato de Prestação de Serviços - ${p.planType}`,
    status: index % 4 === 0 ? 'draft' : index % 3 === 0 ? 'pending_signature' : index % 5 === 0 ? 'terminated' : 'active',
    startDate: '2023-10-01',
    endDate: '2024-10-01',
    value: p.monthlyPackageValue || (index * 1500 + 2000)
  }));

  const filteredContracts = contracts.filter(c => c.patientName.toLowerCase().includes(searchQuery.toLowerCase()));

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active': return { label: 'Vigente', color: 'bg-green-50 text-green-700 border-green-200' };
      case 'pending_signature': return { label: 'Aguardando Assinatura', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'draft': return { label: 'Rascunho', color: 'bg-gray-50 text-gray-700 border-gray-200' };
      case 'terminated': return { label: 'Encerrado', color: 'bg-red-50 text-red-700 border-red-200' };
      default: return { label: status, color: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Gestão de Contratos</h2>
          <p className="text-gray-500 text-sm mt-1">Gerencie os contratos de prestação de serviços com pacientes e convênios.</p>
        </div>
        <button
          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-lg transition-all shadow-md shadow-green-100"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Contrato</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por paciente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg text-sm pl-9 pr-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-4 px-6">Contrato / Paciente</th>
                <th className="py-4 px-6">Vigência</th>
                <th className="py-4 px-6">Valor Mensal</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredContracts.map((c) => {
                const status = getStatusInfo(c.status);
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <FileSignature className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 block">{c.patientName}</span>
                          <span className="text-xs text-gray-500 block mt-0.5">{c.title}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      <span className="block">{c.startDate} a</span>
                      <span className="block font-medium">{c.endDate}</span>
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-900">
                      R$ {c.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Visualizar">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
