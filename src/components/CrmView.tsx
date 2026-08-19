import React, { useState } from 'react';
import { 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Smartphone, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Trash2, 
  Calendar,
  Layers,
  ArrowRight,
  Mic,
  Volume2
} from 'lucide-react';
import { toast } from 'sonner';
import { useHomeCareStore } from '../store';
import { LeadStatus, CRMLead } from '../types';
import AudioDictationModal from './AudioDictationModal';

export default function CrmView() {
  const { leads, activeTenantId, addLead, updateLead, deleteLead } = useHomeCareStore();
  const [showAddModal, setShowAddModal] = useState(false);
  // Audio dictation states
  const [showDictationModal, setShowDictationModal] = useState(false);
  const [activeDictationLead, setActiveDictationLead] = useState<CRMLead | null>(null);
  const [isDictatingForNewLeadForm, setIsDictatingForNewLeadForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('WhatsApp');
  const [estimatedValue, setEstimatedValue] = useState(5000);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<LeadStatus>('lead');

  // Tenant filtered leads
  const tenantLeads = leads.filter(l => l.tenantId === activeTenantId);

  const columns: { id: LeadStatus; label: string; color: string; border: string }[] = [
    { id: 'lead', label: 'Lead / Contato Inicial', color: 'bg-green-600', border: 'border-green-100' },
    { id: 'avaliacao', label: 'Avaliação Técnica', color: 'bg-amber-500', border: 'border-amber-100' },
    { id: 'proposta', label: 'Proposta Comercial', color: 'bg-indigo-500', border: 'border-indigo-100' },
    { id: 'fechado', label: 'Contrato Fechado', color: 'bg-emerald-500', border: 'border-emerald-100' }
  ];

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Por favor, preencha o nome do Lead.");
      return;
    }

    addLead({
      name,
      phone,
      email,
      status,
      source,
      estimatedValue: Number(estimatedValue),
      lastInteraction: notes,
      notes
    });

    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setEstimatedValue(5000);
    setStatus('lead');
    setShowAddModal(false);
  };

  const shiftLeadStage = (leadId: string, currentStatus: LeadStatus, direction: 'next' | 'prev') => {
    const statusOrder: LeadStatus[] = ['lead', 'avaliacao', 'proposta', 'fechado'];
    const idx = statusOrder.indexOf(currentStatus);

    if (direction === 'next' && idx < statusOrder.length - 1) {
      const nextStatus = statusOrder[idx + 1];
      updateLead(leadId, { status: nextStatus });
      if (nextStatus === 'fechado') {
        const lead = tenantLeads.find(l => l.id === leadId);
        if (lead) closeLeadAsContract(lead);
      }
    } else if (direction === 'prev' && idx > 0) {
      updateLead(leadId, { status: statusOrder[idx - 1] });
    }
  };

  const closeLeadAsContract = (lead: CRMLead) => {
    const store = useHomeCareStore.getState();
    const existing = store.patients.find(p =>
      p.tenantId === activeTenantId && p.email?.trim().toLowerCase() === lead.email?.trim().toLowerCase()
    );
    let patientId = existing?.id;

    if (!patientId) {
      store.addPatient({
        name: lead.name,
        birthDate: '',
        cpf: '',
        phone: lead.phone,
        email: lead.email,
        status: 'active',
        planType: 'Mensal',
        avatar: '',
        diagnostic: 'Aguardando avaliação técnica',
        allergies: [],
        medications: [],
        files: [],
        timeline: [],
        address: { street: '', number: '', city: '', state: '', zipCode: '' },
      });
      const created = useHomeCareStore.getState().patients.find(p =>
        p.tenantId === activeTenantId && p.email?.trim().toLowerCase() === lead.email?.trim().toLowerCase()
      );
      patientId = created?.id;
    }

    if (!patientId) {
      toast.error('Não foi possível criar o paciente vinculado a este lead.');
      return;
    }

    store.addContract({
      patientId,
      title: `Contrato de Prestação de Serviços - ${lead.name}`,
      status: 'active',
      value: lead.estimatedValue,
      startDate: new Date().toISOString().split('T')[0],
    });
    toast.success(`Contrato criado para ${lead.name}. Gerencie-o no módulo de Contratos.`);
  };

  const handleOpenDictationForLead = (lead: CRMLead) => {
    setActiveDictationLead(lead);
    setIsDictatingForNewLeadForm(false);
    setShowDictationModal(true);
  };

  const handleOpenDictationForNewForm = () => {
    setActiveDictationLead(null);
    setIsDictatingForNewLeadForm(true);
    setShowDictationModal(true);
  };

  const handleTranscriptionComplete = (transcribedText: string) => {
    if (isDictatingForNewLeadForm) {
      setNotes(prev => prev ? `${prev}\n${transcribedText}` : transcribedText);
    } else if (activeDictationLead) {
      const formattedEntry = `[Ditado IA ${new Date().toLocaleDateString('pt-BR')}] ${transcribedText}`;
      const updatedNotes = activeDictationLead.notes 
        ? `${activeDictationLead.notes}\n${formattedEntry}` 
        : formattedEntry;

      updateLead(activeDictationLead.id, {
        lastInteraction: transcribedText,
        notes: updatedNotes
      });
    }
  };

  // Compute column balances
  const getColSum = (colId: LeadStatus) => {
    return tenantLeads
      .filter(l => l.status === colId)
      .reduce((sum, current) => sum + current.estimatedValue, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">CRM de Admissão & Vendas</h2>
          <p className="text-slate-500 text-sm mt-1">Funil comercial de captação de pacientes, agendamentos de orçamentos e auditoria de convênios.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-600 text-white font-semibold text-sm rounded-lg transition-all shadow-md shadow-green-100"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Oportunidade</span>
        </button>
      </div>

      {/* Voice Note Quick Bar Banner */}
      <div className="bg-gradient-to-r from-green-50 to-indigo-50 border border-green-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-600 text-white rounded-xl shadow-md shadow-green-200 shrink-0">
            <Mic className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-800">Ditado Rápido de Evolução & Anotações de Pacientes (IA)</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Capture notas por voz via microfone. O Gemini transcreve, pontua e salva nos registros do CRM.</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenDictationForNewForm()}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Ditar Nota Geral</span>
        </button>
      </div>

      {/* Kanban Pipeline Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {columns.map((col) => {
          const colLeads = tenantLeads.filter(l => l.status === col.id);
          const totalEst = getColSum(col.id);

          return (
            <div key={col.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 min-h-[480px] flex flex-col">
              {/* Column Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wide">{col.label}</h3>
                </div>
                <span className="text-[10px] bg-slate-200/60 px-2 py-0.5 rounded-full text-slate-600 font-bold">
                  {colLeads.length}
                </span>
              </div>

              {/* Total Estimated Cash on column */}
              <div className="mb-4 bg-white px-3 py-2 rounded-xl border border-slate-100 text-slate-700 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Previsão Comercial</span>
                <span className="text-xs font-bold text-slate-800">R$ {totalEst.toLocaleString('pt-BR')}</span>
              </div>

              {/* Card stack */}
              <div className="space-y-3.5 flex-1 overflow-y-auto">
                {colLeads.length > 0 ? (
                  colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white p-4.5 rounded-xl border border-slate-100 hover:border-green-300 hover:shadow-sm transition-all space-y-3 relative group"
                    >
                      {/* Card identification */}
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-xs text-slate-800 leading-snug truncate max-w-[150px]" title={lead.name}>
                            {lead.name}
                          </h4>
                          <span className="text-[9px] bg-slate-50 text-slate-400 font-semibold uppercase tracking-wider">
                            {lead.source}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Criado em: {lead.createdAt}</span>
                      </div>

                      {/* Notes/Last interaction */}
                      <p className="text-[10.5px] text-slate-500 leading-relaxed font-medium line-clamp-3 bg-slate-50 p-2 rounded-lg border border-slate-100/40">
                        {lead.lastInteraction || 'Nenhuma nota informada.'}
                      </p>

                      {/* Cash estimate & progression */}
                      <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-1 text-xs">
                        <div className="flex items-center text-slate-800 font-bold">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          <span>R$ {lead.estimatedValue.toLocaleString('pt-BR')}</span>
                        </div>

                        {/* Progression & Dictation Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenDictationForLead(lead)}
                            className="p-1 text-green-600 hover:bg-green-50 border border-green-200/80 rounded transition-colors mr-1 flex items-center gap-1 text-[10px] font-bold"
                            title="Ditar nota de evolução por áudio com IA"
                          >
                            <Mic className="w-3.5 h-3.5 text-green-600" />
                            <span className="hidden xl:inline">Ditar</span>
                          </button>

                          <button
                            onClick={() => {
                              if (confirm("Deseja remover esta oportunidade do funil?")) {
                                deleteLead(lead.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors mr-1"
                            title="Remover Oportunidade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {col.id !== 'lead' && (
                            <button
                              onClick={() => shiftLeadStage(lead.id, lead.status, 'prev')}
                              className="p-1 hover:bg-slate-50 text-slate-500 border border-slate-200 rounded"
                              title="Voltar Etapa"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          
                          {col.id !== 'fechado' && (
                            <button
                              onClick={() => shiftLeadStage(lead.id, lead.status, 'next')}
                              className="p-1 hover:bg-slate-50 text-slate-500 border border-slate-200 rounded"
                              title="Avançar Etapa"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full border border-dashed border-slate-200/60 rounded-xl py-12 flex flex-col items-center justify-center text-center text-slate-400 px-3">
                    <Layers className="w-8 h-8 text-slate-300 mb-1.5" />
                    <span className="text-[10px]">Sem leads nesta etapa</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-800">Novo Contato / Oportunidade</h3>
                <p className="text-slate-400 text-xs mt-0.5">Adicione os detalhes do lead comercial de home care.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome do Contato (Ex: Amanda - Pai Luiz) *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Amanda Oliveira"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-green-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telefone Celular</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98888-8888"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="amanda@exemplo.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Canal de Captação</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-2 text-slate-700 focus:outline-none"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Indicação Médica">Indicação Médica</option>
                    <option value="Busca Orgânica">Busca Orgânica</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Etapa Inicial</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LeadStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-2 text-slate-700 focus:outline-none"
                  >
                    <option value="lead">Lead</option>
                    <option value="avaliacao">Avaliação Técnica</option>
                    <option value="proposta">Proposta Comercial</option>
                    <option value="fechado">Fechado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor Estimado do Contrato Mensal (R$) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Observações da última interação</label>
                  <button
                    type="button"
                    onClick={handleOpenDictationForNewForm}
                    className="text-[11px] text-green-600 hover:text-green-800 font-bold flex items-center gap-1 bg-green-50 border border-green-100 px-2.5 py-0.5 rounded-lg transition-colors"
                  >
                    <Mic className="w-3.5 h-3.5 text-green-600" />
                    <span>Ditar com Voz (IA)</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Filha entrou em contato solicitando orçamento para cuidadores de idosos 12h..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none"
                />
              </div>

              <div className="border-t border-slate-100 pt-5 flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 hover:bg-green-600 text-white font-bold text-xs rounded-lg shadow-md transition-all"
                >
                  Criar Negócio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audio Dictation & AI Transcription Modal */}
      <AudioDictationModal
        isOpen={showDictationModal}
        onClose={() => setShowDictationModal(false)}
        leadName={activeDictationLead ? activeDictationLead.name : (name || 'Oportunidade Comercial')}
        onTranscriptionComplete={handleTranscriptionComplete}
      />
    </div>
  );
}
