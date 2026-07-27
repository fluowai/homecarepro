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
  Users
} from 'lucide-react';
import { useHomeCareStore } from '../store';
import { ProfessionalStatus } from '../types';

export default function ProfessionalsView() {
  const { 
    professionals, 
    activeTenantId, 
    addProfessional, 
    updateProfessional, 
    deleteProfessional 
  } = useHomeCareStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'busy' | 'offline'>('all');

  // Form states
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState<'Enfermeiro' | 'Técnico de Enfermagem' | 'Fisioterapeuta' | 'Fonoaudiólogo' | 'Médico' | 'Nutricionista'>('Enfermeiro');
  const [registration, setRegistration] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

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
      specialty,
      registration,
      status: 'active',
      email,
      phone,
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120',
      rating: 5.0
    });

    setName('');
    setRegistration('');
    setEmail('');
    setPhone('');
    setShowAddModal(false);
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
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm rounded-lg transition-all shadow-md shadow-blue-100"
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
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between"
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
                      <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase mt-1 inline-block">
                        {prof.specialty}
                      </span>
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

            <form onSubmit={handleCreateProfessional} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Dra. Mariana Costa"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Especialidade Clínica *</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-2 text-slate-700 focus:outline-none"
                >
                  <option value="Enfermeiro">Enfermeiro (Enfermagem Geral)</option>
                  <option value="Técnico de Enfermagem">Técnico de Enfermagem</option>
                  <option value="Fisioterapeuta">Fisioterapeuta (Motora / Respiratória)</option>
                  <option value="Médico">Médico (Geriatra / Assistente)</option>
                  <option value="Fonoaudiólogo">Fonoaudiólogo</option>
                  <option value="Nutricionista">Nutricionista</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Inscrição Conselho de Classe (Ex: COREN-SP 123456) *</label>
                <input
                  type="text"
                  required
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                  placeholder="COREN-SP 123.456"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none"
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@homecarepro.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none"
                  />
                </div>
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
                  className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-lg shadow-md transition-all"
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
