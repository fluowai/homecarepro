import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  UserCheck, 
  Star, 
  Mail, 
  Phone, 
  Award, 
  X,
  Trash2,
  Users,
  FileText,
  Upload,
  MapPin,
  Key,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useHomeCareStore } from '../store';
import { ProfessionalStatus, ProfessionalSpecialty } from '../types';
import { uploadFileToMinio } from '../lib/upload';

export default function ProfessionalsView() {
  const { 
    professionals, 
    activeTenantId, 
    addProfessional, 
    updateProfessional, 
    deleteProfessional,
    currentUserRole
  } = useHomeCareStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'busy' | 'offline'>('all');

  // Form states
  const [modalTab, setModalTab] = useState<'personal' | 'professional' | 'address' | 'docs'>('personal');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('F');
  const [specialty, setSpecialty] = useState<ProfessionalSpecialty>('Enfermeiro');
  const [registration, setRegistration] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [zipCode, setZipCode] = useState('');
  const [docsUploaded, setDocsUploaded] = useState<string[]>([]);
  const [docsFiles, setDocsFiles] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [credentialNotice, setCredentialNotice] = useState('');

  // Filter professionals
  const tenantProfessionals = professionals.filter(p => p.tenantId === activeTenantId);
  const filteredProfessionals = tenantProfessionals.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          p.registration.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          p.specialty.toLowerCase().includes(searchFilter.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateProfessional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !registration) {
      alert("Por favor, preencha o nome e o registro profissional (COREN/CRM/CREFITO).");
      return;
    }

    addProfessional({
      name,
      cpf,
      gender,
      specialty,
      registration,
      status: 'active',
      email,
      phone,
      avatar: gender === 'M' 
        ? 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=120' 
        : 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120',
      rating: 5.0,
      address: { street, number, city, state, zipCode },
      documents: docsUploaded.map(d => ({ type: 'document', name: d, url: docsFiles[d] || '' }))
    });

    setName('');
    setCpf('');
    setRegistration('');
    setEmail('');
    setPhone('');
    setStreet('');
    setNumber('');
    setCity('');
    setZipCode('');
    setDocsUploaded([]);
    setDocsFiles({});
    setCredentialNotice('');
    setModalTab('personal');
    setShowAddModal(false);
  };

  const handleUploadDoc = async (docName: string, file: File) => {
    setIsUploading(docName);
    try {
      const url = await uploadFileToMinio(file);
      setDocsFiles(prev => ({ ...prev, [docName]: url }));
      setDocsUploaded(prev => prev.includes(docName) ? prev : [...prev, docName]);
    } catch (error) {
      console.error('Error uploading doc:', error);
      alert('Falha ao enviar documento. Tente novamente.');
    } finally {
      setIsUploading(null);
    }
  };

  const handleSendCredentials = () => {
    if (!email) {
      setCredentialNotice('Informe o e-mail do profissional para gerar o login.');
      return;
    }
    setCredentialNotice(`Credenciais de acesso enviadas para ${email}.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Corpo Clínico & Profissionais</h2>
          <p className="text-slate-500 text-sm mt-1">Gerenciamento de credenciais, especialidades e escala de disponibilidade da equipe domiciliar.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-600 text-white font-semibold text-sm rounded-lg transition-all shadow-md shadow-green-100"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Profissional</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-full sm:w-80 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, especialidade ou conselho..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg overflow-x-auto scrollbar-hide max-w-full sm:max-w-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-[11px] font-semibold rounded transition-all whitespace-nowrap ${
              statusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Todos ({tenantProfessionals.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 text-[11px] font-semibold rounded transition-all whitespace-nowrap ${
              statusFilter === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ativos ({tenantProfessionals.filter(p => p.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('busy')}
            className={`px-3 py-1 text-[11px] font-semibold rounded transition-all whitespace-nowrap ${
              statusFilter === 'busy' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ocupados ({tenantProfessionals.filter(p => p.status === 'busy').length})
          </button>
          <button
            onClick={() => setStatusFilter('offline')}
            className={`px-3 py-1 text-[11px] font-semibold rounded transition-all whitespace-nowrap ${
              statusFilter === 'offline' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Offline ({tenantProfessionals.filter(p => p.status === 'offline').length})
          </button>
        </div>
      </div>

      {/* Grid */}
      {filteredProfessionals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfessionals.map((prof) => (
            <div
              key={prof.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-green-200 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={prof.avatar}
                      alt={prof.name}
                      className="w-12 h-12 rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="font-bold text-slate-800 text-xs truncate max-w-[140px]">{prof.name}</h3>
                      <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full uppercase mt-1 inline-block">
                        {prof.specialty}
                      </span>
                      {prof.documents.some(d => d.status === 'expired') && (
                        <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full uppercase mt-1 inline-flex items-center gap-1 ml-1">
                          <AlertTriangle className="w-3 h-3" />
                          Doc Vencido
                        </span>
                      )}
                      {prof.documents.some(d => d.status === 'pending') && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase mt-1 inline-flex items-center gap-1 ml-1">
                          <AlertTriangle className="w-3 h-3" />
                          Pendência
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Picker */}
                  <select
                    value={prof.status}
                    onChange={(e) => updateProfessional(prof.id, { status: e.target.value as ProfessionalStatus })}
                    className={`text-[9px] font-bold uppercase py-1 px-1.5 rounded-lg focus:outline-none cursor-pointer ${
                      prof.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      prof.status === 'busy' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <option value="active">Disponível</option>
                    <option value="busy">Ocupado</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>

                {/* Body details */}
                <div className="mt-5 space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-slate-400" />
                    <span>Registro: <strong className="text-slate-700">{prof.registration}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{prof.phone || 'Não informado'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate max-w-[200px]">{prof.email}</span>
                  </div>
                </div>
              </div>

              {/* Bottom stats and delete */}
              <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-slate-700">{prof.rating.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400">(Avaliador)</span>
                </div>

                {currentUserRole === 'admin' && (
                  <button
                    onClick={() => {
                      if (confirm(`Remover o cadastro de ${prof.name}?`)) {
                        deleteProfessional(prof.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                    title="Remover Profissional"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
          <Users className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">Nenhum Profissional Encontrado</h3>
          <p className="text-xs max-w-sm mt-1">Refine seus termos de busca ou mude os filtros de status acima.</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-800">Credenciamento de Profissional</h3>
                <p className="text-slate-400 text-xs mt-0.5">Registre o profissional clínico em sua base operacional.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-slate-100 px-6">
              {[
                { id: 'personal', label: 'Dados Pessoais', icon: UserCheck },
                { id: 'professional', label: 'Profissional', icon: Award },
                { id: 'address', label: 'Endereço', icon: MapPin },
                { id: 'docs', label: 'Documentos', icon: FileText },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold border-b-2 transition-colors ${
                      modalTab === tab.id ? 'border-green-600 text-green-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <form onSubmit={handleCreateProfessional} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {modalTab === 'personal' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome Completo *</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Dra. Mariana Costa" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-green-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">CPF *</label>
                      <input type="text" required value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-green-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Sexo *</label>
                      <select value={gender} onChange={(e) => setGender(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-2 text-slate-700 focus:outline-none">
                        <option value="F">Feminino</option>
                        <option value="M">Masculino</option>
                        <option value="O">Outro</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telefone / WhatsApp</label>
                      <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 98888-8888" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">E-mail Corporativo</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@homecarepro.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'professional' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Especialidade Clínica *</label>
                    <select value={specialty} onChange={(e) => setSpecialty(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-2 text-slate-700 focus:outline-none">
                      <option value="Enfermeiro">Enfermeiro (Enfermagem Geral)</option>
                      <option value="Técnico de Enfermagem">Técnico de Enfermagem</option>
                      <option value="Auxiliar de Enfermagem">Auxiliar de Enfermagem</option>
                      <option value="Fisioterapeuta">Fisioterapeuta (Motora / Respiratória)</option>
                      <option value="Fonoaudiólogo">Fonoaudiólogo</option>
                      <option value="Médico">Médico (Geriatra / Assistente)</option>
                      <option value="Nutricionista">Nutricionista</option>
                      <option value="Psicólogo">Psicólogo</option>
                      <option value="Terapeuta Ocupacional">Terapeuta Ocupacional</option>
                      <option value="Assistente Social">Assistente Social</option>
                      <option value="Cuidador de Idosos">Cuidador de Idosos</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Inscrição Conselho de Classe (Ex: COREN, CRM, CRP) *</label>
                    <input type="text" required value={registration} onChange={(e) => setRegistration(e.target.value)} placeholder="COREN-SP 123.456" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none" />
                  </div>
                </div>
              )}

              {modalTab === 'address' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Logradouro / Rua</label>
                      <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rua das Flores" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Número</label>
                      <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="123" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cidade</label>
                      <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Estado</label>
                      <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="SP" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">CEP</label>
                    <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="00000-000" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none" />
                  </div>
                </div>
              )}

              {modalTab === 'docs' && (
                <div className="space-y-4 animate-fade-in">
                  <p className="text-xs text-slate-500 mb-2">Faça o upload dos documentos obrigatórios para compor o prontuário do profissional.</p>
                  
                  {['Foto do RG / CNH', 'Foto da Carteirinha (Conselho)', 'Currículo (Opcional)', 'Comprovante de Endereço', 'Foto do Carimbo + Assinatura'].map(doc => (
                    <div key={doc} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700">{doc}</span>
                      </div>
                      {docsUploaded.includes(doc) ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Anexado
                        </span>
                      ) : isUploading === doc ? (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md flex items-center gap-1 cursor-not-allowed">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Enviando...
                        </span>
                      ) : (
                        <label className="text-[10px] font-bold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer">
                          <Upload className="w-3 h-3" />
                          Anexar
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadDoc(doc, file);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  ))}

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    {credentialNotice && (
                      <p className="mb-3 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{credentialNotice}</p>
                    )}
                    <button type="button" onClick={handleSendCredentials} className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors">
                      <Key className="w-4 h-4" />
                      Gerar Login e Senha para o App
                    </button>
                  </div>
                </div>
              )}

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
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
