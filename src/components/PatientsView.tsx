import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  ChevronRight, 
  FileText, 
  Clock, 
  MapPin, 
  Activity, 
  HeartHandshake, 
  Sparkles, 
  X, 
  Paperclip, 
  PlusCircle, 
  AlertTriangle,
  FileCheck2,
  Trash2,
  ArrowLeft,
  Users,
  Pill,
  Package,
  Loader2,
  Camera
} from 'lucide-react';
import { useHomeCareStore } from '../store';
import { Patient } from '../types';
import { uploadFileToMinio } from '../lib/upload';
import { toast } from 'sonner';

interface PatientsViewProps {
  searchQuery: string;
}

type TabType = 'info' | 'clinical' | 'inventory' | 'files' | 'timeline' | 'ai';

export default function PatientsView({ searchQuery }: PatientsViewProps) {
  const { 
    patients, 
    activeTenantId, 
    addPatient, 
    updatePatient, 
    deletePatient, 
    addPatientFile, 
    addTimelineEvent,
    generateAiSummary,
    insurances,
    currentUserRole
  } = useHomeCareStore();

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // AI loading and output
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [gender, setGender] = useState<'M'|'F'|'O'>('F');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [planType, setPlanType] = useState('Particular');
  const [insuranceId, setInsuranceId] = useState('');
  const [monthlyPackageValue, setMonthlyPackageValue] = useState<number | ''>('');
  const [padScope, setPadScope] = useState('');
  const [contractDuration, setContractDuration] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [medicationsText, setMedicationsText] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [zipCode, setZipCode] = useState('');

  // Manual event adding
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<'clinical' | 'visit' | 'system' | 'billing'>('clinical');
  const [eventDesc, setEventDesc] = useState('');
  const [eventVitals, setEventVitals] = useState({ pa: '', fc: '', temp: '', sat: '', pain: '' });

  // File uploading
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const isManager = ['mega_admin', 'super_admin', 'admin', 'operator'].includes(currentUserRole);

  // Filter patients
  const tenantPatients = patients.filter(p => p.tenantId === activeTenantId);
  const filteredPatients = tenantPatients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.diagnostic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.cpf.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !birthDate || !diagnostic) {
      toast.error("Por favor, preencha pelo menos Nome, Data de Nascimento e Diagnóstico.");
      return;
    }
    
    if (!zipCode || !street || !number || !city || !state) {
      toast.error("Para garantir a validação de Check-in, o endereço completo do paciente é obrigatório.");
      return;
    }

    addPatient({
      name,
      birthDate,
      cpf,
      gender,
      phone,
      email,
      status: 'active',
      planType,
      insuranceId,
      monthlyPackageValue: Number(monthlyPackageValue) || undefined,
      padScope,
      contractDuration,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=059669`,
      diagnostic,
      allergies: allergiesText.split(',').map(s => s.trim()).filter(Boolean),
      medications: medicationsText.split(',').map(s => s.trim()).filter(Boolean),
      files: [],
      timeline: [],
      address: {
        street,
        number,
        city,
        state,
        zipCode
      }
    });

    // Reset Form & Close
    setName('');
    setBirthDate('');
    setCpf('');
    setGender('F');
    setPhone('');
    setEmail('');
    setPlanType('Particular');
    setInsuranceId('');
    setMonthlyPackageValue('');
    setPadScope('');
    setContractDuration('');
    setDiagnostic('');
    setAllergiesText('');
    setMedicationsText('');
    setStreet('');
    setNumber('');
    setCity('');
    setZipCode('');
    setShowAddModal(false);
  };

  const handleTriggerAiSummary = async (pId: string) => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      await generateAiSummary(pId);
    } catch (err: any) {
      setAiError("Não foi possível gerar o resumo. Verifique a chave de API.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddTimeline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !eventTitle || !eventDesc) return;

    addTimelineEvent(selectedPatientId, {
      title: eventTitle,
      description: eventDesc,
      type: eventType,
      author: 'Admin',
      vitals: eventType === 'clinical' && (eventVitals.pa || eventVitals.fc || eventVitals.temp || eventVitals.sat || eventVitals.pain) ? {
        pa: eventVitals.pa || undefined,
        fc: eventVitals.fc || undefined,
        temp: eventVitals.temp || undefined,
        sat: eventVitals.sat || undefined,
        pain: eventVitals.pain ? Number(eventVitals.pain) : undefined
      } : undefined
    });

    setEventTitle('');
    setEventDesc('');
    setEventVitals({ pa: '', fc: '', temp: '', sat: '', pain: '' });
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !pendingFile) return;

    setIsUploading(true);
    try {
      const url = await uploadFileToMinio(pendingFile);
      addPatientFile(
        selectedPatientId,
        pendingFile.name,
        `${(pendingFile.size / (1024 * 1024)).toFixed(1)} MB`,
        pendingFile.type || 'application/octet-stream',
        url
      );
      setPendingFile(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Falha ao enviar arquivo. Verifique sua conexão e tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPatientId) return;

    setIsUploadingAvatar(true);
    try {
      const url = await uploadFileToMinio(file);
      updatePatient(selectedPatientId, { avatar: url });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Falha ao enviar foto. Verifique sua conexão e tente novamente.');
    } finally {
      setIsUploadingAvatar(false);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Detail View Mode */}
      {selectedPatient ? (
        <div className="animate-fade-in space-y-6">
          {/* Detail Header / Nav back */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={() => setSelectedPatientId(null)}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Lista de Pacientes</span>
            </button>
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                selectedPatient.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                ● Paciente {selectedPatient.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
              <button
                onClick={() => {
                  if (confirm("Tem certeza que deseja desativar este paciente?")) {
                    updatePatient(selectedPatient.id, { status: selectedPatient.status === 'active' ? 'inactive' : 'active' });
                  }
                }}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors"
              >
                Alterar Status
              </button>
              {currentUserRole === 'admin' && (
                <button
                  onClick={() => {
                    if (confirm("Deseja deletar permanentemente este prontuário?")) {
                      deletePatient(selectedPatient.id);
                      setSelectedPatientId(null);
                    }
                  }}
                  className="p-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir Prontuário"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Profile Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative group">
              <img
                src={selectedPatient.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedPatient.name)}&backgroundColor=059669`}
                alt={selectedPatient.name}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm transition-opacity group-hover:opacity-70"
                referrerPolicy="no-referrer"
              />
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {isUploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
              </label>
            </div>
            <div className="flex-1 text-center md:text-left min-w-0">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">{selectedPatient.name}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1.5 text-xs text-slate-500">
                <span>CPF: {selectedPatient.cpf}</span>
                <span>•</span>
                <span>Data de Nascimento: {selectedPatient.birthDate}</span>
                
                {isManager && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 font-semibold uppercase text-[10px] tracking-wide">
                      {selectedPatient.insuranceId ? (insurances.find(i => i.id === selectedPatient.insuranceId)?.name || selectedPatient.planType) : selectedPatient.planType}
                    </span>
                    {selectedPatient.monthlyPackageValue && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 font-bold">Pacote: R$ {selectedPatient.monthlyPackageValue}</span>
                      </>
                    )}
                    {selectedPatient.contractDuration && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-600 font-semibold">Contrato: {selectedPatient.contractDuration}</span>
                      </>
                    )}
                  </>
                )}
              </div>
              <p className="text-slate-600 text-xs font-medium mt-3 bg-slate-50 border border-slate-100 p-2.5 rounded-lg inline-block text-left w-full">
                <strong className="text-slate-700 block">Diagnóstico de Admissão:</strong>
                {selectedPatient.diagnostic}
              </p>
              {selectedPatient.padScope && (
                <p className="text-slate-600 text-xs font-medium mt-2 bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg inline-block text-left w-full">
                  <strong className="text-slate-700 block">PAD (Plano de Atenção Domiciliar):</strong>
                  {selectedPatient.padScope}
                </p>
              )}
            </div>
          </div>

          {/* Tabs Navigator */}
          <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0 scroll-smooth">
            {[
              { id: 'info', label: 'Contato', icon: MapPin },
              { id: 'clinical', label: 'Clínico', icon: Activity },
              { id: 'inventory', label: 'Farmácia Domiciliar', icon: Pill },
              { id: 'files', label: 'Anexos', icon: Paperclip },
              { id: 'timeline', label: 'Histórico', icon: Clock },
              { id: 'ai', label: 'Copilot AI', icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-[11px] font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-green-600 text-green-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-green-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[300px]">
            {/* 1. INFO TAB */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Informações Pessoais & Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Telefone Residencial / Celular</span>
                    <p className="text-slate-700 text-sm font-medium">{selectedPatient.phone || 'Não informado'}</p>
                  </div>
                  <div className="space-y-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">E-mail para Faturamento / Convênio</span>
                    <p className="text-slate-700 text-sm font-medium">{selectedPatient.email || 'Não informado'}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-4">Endereço do Atendimento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Logradouro</span>
                      <p className="text-slate-700 text-sm font-medium">{selectedPatient.address.street}, Nº {selectedPatient.address.number}</p>
                    </div>
                    <div className="space-y-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cidade / Estado / CEP</span>
                      <p className="text-slate-700 text-sm font-medium">{selectedPatient.address.city} - {selectedPatient.address.state} • CEP {selectedPatient.address.zipCode}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CLINICAL TAB */}
            {activeTab === 'clinical' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Alergias Clínicas & Restrições</span>
                  </h3>
                  {selectedPatient.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedPatient.allergies.map((allergy, index) => (
                        <span key={index} className="px-3 py-1 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-lg">
                          ⚠️ {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs mt-2">Nenhuma alergia relatada pelo médico assistente.</p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-3">Farmácia Domiciliar (Uso Contínuo)</h3>
                  {selectedPatient.medications.length > 0 ? (
                    <ul className="space-y-2.5">
                      {selectedPatient.medications.map((med, index) => (
                        <li key={index} className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700 text-xs font-medium">
                          <span className="w-2 h-2 rounded-full bg-green-600 mt-1.5" />
                          <span>{med}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 text-xs">Nenhum medicamento de uso contínuo cadastrado.</p>
                  )}
                </div>
              </div>
            )}

            {/* NEW: INVENTORY TAB */}
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Maleta do Paciente (Estoque Domiciliar)</h3>
                  <span className="text-xs text-slate-400">Materiais e Medicamentos na residência</span>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Posologia</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qtd. Domicílio</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPatient.inventory && selectedPatient.inventory.length > 0 ? (
                        selectedPatient.inventory.map((item) => (
                          <tr key={item.medicineId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 text-xs font-semibold text-slate-800">{item.medicineName}</td>
                            <td className="py-3 px-4 text-xs text-slate-500">{item.dosage}</td>
                            <td className="py-3 px-4 text-xs font-bold text-slate-700">{item.quantity} un</td>
                            <td className="py-3 px-4">
                              {item.quantity < 5 ? (
                                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                                  <AlertTriangle className="w-3 h-3" /> Reposição Urgente
                                </span>
                              ) : item.quantity < 15 ? (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                                  <Package className="w-3 h-3" /> Nível Baixo
                                </span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Estoque OK</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            Nenhum item alocado na maleta do paciente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. FILES TAB */}
            {activeTab === 'files' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Prontuário de Anexos do Paciente</h3>
                  <span className="text-xs text-slate-400">Laudos, receitas e exames</span>
                </div>

                {/* Upload Form */}
                <form onSubmit={handleFileUpload} className="flex gap-2.5 p-4 bg-slate-50 border border-slate-200/60 rounded-xl max-w-lg">
                  <label className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-500 cursor-pointer hover:border-green-400 transition-colors overflow-hidden">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{pendingFile ? pendingFile.name : 'Selecione um arquivo (laudo, receita, exame)...'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={!pendingFile || isUploading}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{isUploading ? 'Enviando...' : 'Anexar'}</span>
                  </button>
                </form>

                {/* File list */}
                <div className="space-y-2.5 max-w-2xl">
                  {selectedPatient.files.length > 0 ? (
                    selectedPatient.files.map((file) => (
                      <div key={file.id} className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-8 h-8 text-green-600 bg-green-50 p-1.5 rounded-lg shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-slate-800 block truncate">{file.name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{file.uploadedAt} • {file.size}</span>
                          </div>
                        </div>
                        <a
                          href={file.url || '#'}
                          download={file.name}
                          onClick={(e) => { if (!file.url) e.preventDefault(); }}
                          className={`text-xs font-semibold ${file.url ? 'text-green-600 hover:underline' : 'text-slate-300 cursor-not-allowed'}`}
                        >
                          {file.url ? 'Baixar' : 'Sem arquivo'}
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                      <FileCheck2 className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs">Nenhum documento anexado ao prontuário.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  {/* Timeline listing */}
                  <div className="flex-1 space-y-6 relative border-l-2 border-slate-100 pl-6 ml-3">
                    {selectedPatient.timeline.map((item) => (
                      <div key={item.id} className="relative group">
                        {/* Bullet circle */}
                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ring-4 ${
                          item.type === 'clinical' ? 'bg-indigo-500 ring-indigo-50' :
                          item.type === 'visit' ? 'bg-green-600 ring-green-50' :
                          item.type === 'billing' ? 'bg-amber-500 ring-amber-50' : 'bg-slate-400 ring-slate-50'
                        }`} />
                        
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">{item.date}</span>
                          <h4 className="font-bold text-xs text-slate-800 mt-1">{item.title}</h4>
                          {item.vitals && (
                            <div className="flex flex-wrap gap-2 mt-2 mb-1">
                              {item.vitals.pa && <span className="text-[10px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded border border-red-100">PA: {item.vitals.pa}</span>}
                              {item.vitals.fc && <span className="text-[10px] bg-orange-50 text-orange-700 font-bold px-1.5 py-0.5 rounded border border-orange-100">FC: {item.vitals.fc}</span>}
                              {item.vitals.temp && <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded border border-amber-100">T: {item.vitals.temp}°C</span>}
                              {item.vitals.sat && <span className="text-[10px] bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded border border-green-100">SatO2: {item.vitals.sat}%</span>}
                              {item.vitals.pain !== undefined && <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-100">Dor: {item.vitals.pain}/10</span>}
                            </div>
                          )}
                          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/50">{item.description}</p>
                          {item.photos && item.photos.length > 0 && (
                            <div className="mt-2 flex gap-2 overflow-x-auto">
                              {item.photos.map((photo, idx) => (
                                <img key={idx} src={photo} alt={`Anexo ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200 shadow-sm" referrerPolicy="no-referrer" />
                              ))}
                            </div>
                          )}
                          <span className="text-[9px] text-slate-400 font-semibold block mt-1.5">Registrado por: {item.author}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Event Form */}
                  <div className="w-full md:w-80 bg-slate-50/70 p-5 rounded-2xl border border-slate-200/60">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3">Lançar Evento Manual</h4>
                    <form onSubmit={handleAddTimeline} className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Título do Evento</label>
                        <input
                          type="text"
                          required
                          value={eventTitle}
                          onChange={(e) => setEventTitle(e.target.value)}
                          placeholder="Ex: Mudança de sonda"
                          className="w-full bg-white border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Categoria</label>
                        <select
                          value={eventType}
                          onChange={(e) => setEventType(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 text-xs rounded-lg px-2 py-2 text-slate-700 focus:outline-none"
                        >
                          <option value="clinical">Clínico</option>
                          <option value="visit">Atendimento</option>
                          <option value="billing">Insumos & Faturamento</option>
                          <option value="system">Sistema</option>
                        </select>
                      </div>

                      {eventType === 'clinical' && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Sinais Vitais (Opcional)</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="PA (ex: 120/80)" value={eventVitals.pa} onChange={e => setEventVitals({...eventVitals, pa: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-[10px] rounded px-2 py-1.5 focus:outline-none" />
                            <input type="text" placeholder="FC (ex: 78)" value={eventVitals.fc} onChange={e => setEventVitals({...eventVitals, fc: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-[10px] rounded px-2 py-1.5 focus:outline-none" />
                            <input type="text" placeholder="Temp (°C)" value={eventVitals.temp} onChange={e => setEventVitals({...eventVitals, temp: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-[10px] rounded px-2 py-1.5 focus:outline-none" />
                            <input type="text" placeholder="Sat O2 (%)" value={eventVitals.sat} onChange={e => setEventVitals({...eventVitals, sat: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-[10px] rounded px-2 py-1.5 focus:outline-none" />
                            <input type="number" min="0" max="10" placeholder="Escala Dor (0-10)" value={eventVitals.pain} onChange={e => setEventVitals({...eventVitals, pain: e.target.value})} className="w-full col-span-2 bg-slate-50 border border-slate-200 text-[10px] rounded px-2 py-1.5 focus:outline-none" />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Detalhes do Evento</label>
                        <textarea
                          required
                          rows={3}
                          value={eventDesc}
                          onChange={(e) => setEventDesc(e.target.value)}
                          placeholder="Escreva as observações técnicas..."
                          className="w-full bg-white border border-slate-200 text-xs rounded-lg px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Publicar Evento</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* 5. AI TAB */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Copilot Clínico IA</h3>
                    <p className="text-slate-400 text-xs">Síntese e auditoria inteligente de prontuário baseados no histórico clínico</p>
                  </div>
                  <button
                    onClick={() => handleTriggerAiSummary(selectedPatient.id)}
                    disabled={isAiLoading}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-indigo-600 hover:from-green-600 hover:to-indigo-700 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-white animate-pulse" />
                    <span>{isAiLoading ? 'Analisando Histórico...' : 'Gerar Resumo por IA'}</span>
                  </button>
                </div>

                {isAiLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                    <p className="text-slate-700 font-semibold text-xs">O Copilot IA está lendo o prontuário domiciliar...</p>
                    <p className="text-slate-400 text-[10px] mt-1">Isso levará apenas alguns segundos.</p>
                  </div>
                ) : aiError ? (
                  <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl">
                    {aiError}
                  </div>
                ) : selectedPatient.summaryAi ? (
                  <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl relative">
                    <span className="absolute top-4 right-4 text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      ⚡ IA Atualizada
                    </span>
                    <div className="prose prose-xs max-w-none text-slate-700 text-xs leading-relaxed space-y-4 whitespace-pre-line">
                      {selectedPatient.summaryAi}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                    <Sparkles className="w-10 h-10 text-indigo-400/40 mb-3" />
                    <h4 className="font-bold text-xs text-slate-700">Resumo de IA Não Gerado</h4>
                    <p className="text-[11px] max-w-xs mt-1">Clique no botão superior para consolidar um resumo executivo completo do diagnóstico, alergias, medicações e riscos clínicos.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List Mode View */
        <div className="animate-fade-in space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Pacientes Domiciliares</h2>
              <p className="text-slate-500 text-sm mt-1">Lista unificada de prontuários, planos terapêuticos e monitoramento domiciliar.</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-600 text-white font-semibold text-sm rounded-lg transition-all shadow-md shadow-green-100"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Paciente</span>
            </button>
          </div>

          {/* Filtering row */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm justify-between">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos ({tenantPatients.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Ativos ({tenantPatients.filter(p => p.status === 'active').length})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === 'inactive' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Inativos ({tenantPatients.filter(p => p.status === 'inactive').length})
              </button>
            </div>
            <span className="text-xs text-slate-400 font-semibold">Exibindo {filteredPatients.length} pacientes</span>
          </div>

          {/* Patients Grid */}
          {filteredPatients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => {
                    setSelectedPatientId(patient.id);
                    setActiveTab('info');
                  }}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-green-300 hover:shadow-md transition-all p-5 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={patient.avatar}
                          alt={patient.name}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-100"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs text-slate-800 hover:text-green-600 transition-colors truncate w-[140px] md:w-[160px]">
                            {patient.name}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-semibold">{patient.birthDate}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                        patient.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {patient.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-4 font-semibold line-clamp-2 leading-relaxed bg-slate-50/50 p-2 rounded border border-slate-100">
                      Diagnosis: {patient.diagnostic}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {patient.allergies.slice(0, 2).map((al, idx) => (
                        <span key={idx} className="text-[9px] bg-rose-50 text-rose-700 font-semibold px-1.5 py-0.5 rounded">
                          ⚠️ {al}
                        </span>
                      ))}
                      {patient.allergies.length > 2 && (
                        <span className="text-[9px] bg-rose-50 text-rose-700 font-semibold px-1.5 py-0.5 rounded">
                          +{patient.allergies.length - 2}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="truncate max-w-[140px] text-slate-600">
                      📍 {patient.address.city}, {patient.address.state}
                    </span>
                    <span className="text-green-600 font-bold hover:underline flex items-center">
                      Visualizar Prontuário <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-sm">Nenhum Paciente Encontrado</h3>
              <p className="text-xs max-w-sm mt-1">Não encontramos resultados correspondentes na unidade selecionada.</p>
            </div>
          )}

          {/* Add Patient Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-30 p-4">
              <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl animate-scale-up">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-800">Abertura de Prontuário Domiciliar</h3>
                    <p className="text-slate-400 text-xs">Preencha os dados do paciente para integrá-lo ao sistema.</p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreatePatient} className="p-6 space-y-6">
                  {/* Seção 1: Dados Pessoais */}
                  <div>
                    <h4 className="font-bold text-xs text-green-600 uppercase tracking-wider mb-4 border-b pb-1 border-slate-100">1. Identificação Básica</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome Completo *</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ex: Dona Francisca Ribeiro"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none focus:border-green-600"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Data de Nascimento *</label>
                        <input
                          type="date"
                          required
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-2 py-2 text-slate-700 focus:outline-none focus:border-green-600"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sexo *</label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-2 py-2 text-slate-700 focus:outline-none"
                        >
                          <option value="F">Feminino</option>
                          <option value="M">Masculino</option>
                          <option value="O">Outro</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">CPF</label>
                        <input
                          type="text"
                          value={cpf}
                          onChange={(e) => setCpf(e.target.value)}
                          placeholder="000.000.000-00"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none focus:border-green-600"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Celular / WhatsApp</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(11) 98888-8888"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">E-mail</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 2: Quadro Clínico */}
                  <div>
                    <h4 className="font-bold text-xs text-green-600 uppercase tracking-wider mb-4 border-b pb-1 border-slate-100">2. Admissão Clínica</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Diagnóstico Geral *</label>
                        <input
                          type="text"
                          required
                          value={diagnostic}
                          onChange={(e) => setDiagnostic(e.target.value)}
                          placeholder="Ex: Alzheimer Moderado, Hipertensão, AVC prévio"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Convênio / Plano de Saúde</label>
                        <select
                          value={insuranceId}
                          onChange={(e) => {
                            setInsuranceId(e.target.value);
                            if (!e.target.value) setPlanType('Particular');
                            else {
                              const ins = insurances.find(i => i.id === e.target.value);
                              if (ins) setPlanType(ins.name);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-2 py-2 text-slate-700 focus:outline-none"
                        >
                          <option value="">Particular</option>
                          {insurances.map(ins => (
                            <option key={ins.id} value={ins.id}>{ins.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor Mensal (R$)</label>
                        <input
                          type="number"
                          value={monthlyPackageValue}
                          onChange={(e) => setMonthlyPackageValue(e.target.value ? Number(e.target.value) : '')}
                          placeholder="Ex: 5000"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tempo de Contrato</label>
                        <input
                          type="text"
                          value={contractDuration}
                          onChange={(e) => setContractDuration(e.target.value)}
                          placeholder="Ex: 12 meses"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Descrição do PAD (Plano de Atenção Domiciliar)</label>
                        <input
                          type="text"
                          value={padScope}
                          onChange={(e) => setPadScope(e.target.value)}
                          placeholder="Ex: Fisio 3x semana, Fono 2x semana, Téc Enfermagem 12h diurnas"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Alergias (separadas por vírgula)</label>
                        <input
                          type="text"
                          value={allergiesText}
                          onChange={(e) => setAllergiesText(e.target.value)}
                          placeholder="Penicilina, Látex, Dipirona"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Medicamentos de uso contínuo (separados por vírgula)</label>
                        <textarea
                          rows={2}
                          value={medicationsText}
                          onChange={(e) => setMedicationsText(e.target.value)}
                          placeholder="Losartana 50mg (Manhã), Aricept 10mg (Noite)"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 3: Endereço */}
                  <div>
                    <h4 className="font-bold text-xs text-green-600 uppercase tracking-wider mb-4 border-b pb-1 border-slate-100">3. Endereço e Logística</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Rua / Logradouro</label>
                        <input
                          type="text"
                          required
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          placeholder="Rua das Acácias"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Número</label>
                        <input
                          type="text"
                          required
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          placeholder="123"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">CEP</label>
                        <input
                          type="text"
                          required
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          placeholder="01000-000"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cidade</label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="São Paulo"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Estado</label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          placeholder="SP"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 text-slate-700 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6 flex justify-end gap-3">
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
                      Criar Prontuário
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
