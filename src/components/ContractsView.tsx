import React, { useState } from 'react';
import { FileText, Plus, Search, FileSignature, CheckCircle2, AlertCircle, Eye, Download, X } from 'lucide-react';
import { useHomeCareStore } from '../store';
import { Contract } from '../types';

export default function ContractsView() {
  const { patients, contracts, activeTenantId, addContract, updateContract, deleteContract } = useHomeCareStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [viewing, setViewing] = useState<Contract | null>(null);

  // New contract form state
  const [formPatientId, setFormPatientId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formStatus, setFormStatus] = useState<Contract['status']>('draft');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formValue, setFormValue] = useState('');

  const tenantPatients = patients.filter(p => p.tenantId === activeTenantId);
  const tenantContracts = contracts.filter(c => c.tenantId === activeTenantId);

  const filteredContracts = tenantContracts.filter(c => {
    const patient = patients.find(p => p.id === c.patientId);
    return (patient?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active': return { label: 'Vigente', color: 'bg-green-50 text-green-700 border-green-200' };
      case 'pending_signature': return { label: 'Aguardando Assinatura', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'draft': return { label: 'Rascunho', color: 'bg-gray-50 text-gray-700 border-gray-200' };
      case 'terminated': return { label: 'Encerrado', color: 'bg-red-50 text-red-700 border-red-200' };
      default: return { label: status, color: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatientId) return;
    const patient = tenantPatients.find(p => p.id === formPatientId);
    addContract({
      patientId: formPatientId,
      title: formTitle || `Contrato de Prestação de Serviços - ${patient?.planType || ''}`,
      status: formStatus,
      startDate: formStart || undefined,
      endDate: formEnd || undefined,
      value: formValue ? Number(formValue) : undefined,
    });
    setShowNewModal(false);
    setFormPatientId('');
    setFormTitle('');
    setFormStatus('draft');
    setFormStart('');
    setFormEnd('');
    setFormValue('');
  };

  const handleDownloadContract = (c: Contract) => {
    const patient = patients.find(p => p.id === c.patientId);
    const content = [
      'EXTRATO DO CONTRATO - HomeCare Pro',
      '===================================',
      `Paciente: ${patient?.name || c.patientId}`,
      `Título: ${c.title}`,
      `Vigência: ${c.startDate || '—'} a ${c.endDate || '—'}`,
      `Valor Mensal: R$ ${(c.value ?? 0).toFixed(2)}`,
      `Status: ${getStatusInfo(c.status).label}`,
      '',
      'Este arquivo é um extrato de resumo do contrato. O documento oficial',
      'em PDF com cláusulas e assinatura é gerado e assinado por meio da',
      'integração de assinatura eletrônica (a ser configurada).',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrato_contrato_${(patient?.name || c.patientId).replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Gestão de Contratos</h2>
          <p className="text-gray-500 text-sm mt-1">Gerencie os contratos de prestação de serviços com pacientes e convênios.</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
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
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-400 text-sm">
                    Nenhum contrato cadastrado.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => {
                  const status = getStatusInfo(c.status);
                  const patient = patients.find(p => p.id === c.patientId);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <FileSignature className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">{patient?.name || c.patientId}</span>
                            <span className="text-xs text-gray-500 block mt-0.5">{c.title}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        <span className="block">{c.startDate || '—'} a</span>
                        <span className="block font-medium">{c.endDate || '—'}</span>
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-900">
                        R$ {(c.value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setViewing(c)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Visualizar">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDownloadContract(c)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Download">
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (c.status === 'active') {
                                updateContract(c.id, { status: 'terminated' });
                              } else {
                                deleteContract(c.id);
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={c.status === 'active' ? 'Encerrar contrato' : 'Excluir contrato'}
                          >
                            {c.status === 'active' ? <AlertCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract View Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-800">Detalhes do Contrato</h3>
              <button
                onClick={() => setViewing(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Paciente</span>
                <span className="font-bold text-slate-800">{patients.find(p => p.id === viewing.patientId)?.name || viewing.patientId}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Título</span>
                <span className="text-slate-700">{viewing.title}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Início</span>
                  <span className="text-slate-700">{viewing.startDate || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fim</span>
                  <span className="text-slate-700">{viewing.endDate || '—'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor Mensal</span>
                  <span className="font-bold text-slate-800">R$ {(viewing.value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</span>
                  <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusInfo(viewing.status).color}`}>
                    {getStatusInfo(viewing.status).label}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-100">
                O documento oficial em PDF com cláusulas e assinatura eletrônica é gerado pela integração de assinatura (a ser configurada).
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => { handleDownloadContract(viewing); setViewing(null); }}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"
              >
                Baixar extrato
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
