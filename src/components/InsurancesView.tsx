import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  ShieldAlert, 
  Building2,
  Phone,
  Mail,
  User,
  Trash2,
  X
} from 'lucide-react';
import { useHomeCareStore } from '../store';

export default function InsurancesView() {
  const { 
    insurances, 
    activeTenantId, 
    addInsurance, 
    deleteInsurance 
  } = useHomeCareStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');

  // Filter insurances
  const tenantInsurances = insurances.filter(i => i.tenantId === activeTenantId);
  const filteredInsurances = tenantInsurances.filter(i => 
    i.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
    (i.contactPerson && i.contactPerson.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const handleCreateInsurance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert("Por favor, preencha o nome e o telefone do convênio.");
      return;
    }

    addInsurance({
      name,
      phone,
      email,
      contactPerson
    });

    setName('');
    setPhone('');
    setEmail('');
    setContactPerson('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Convênios e Planos de Saúde</h2>
          <p className="text-slate-500 text-sm mt-1">Gerenciamento de operadoras de saúde e contatos de autorização.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-600 text-white font-semibold text-sm rounded-lg transition-all shadow-md shadow-green-100"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Convênio</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-full sm:w-96 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar convênio por nome ou contato..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredInsurances.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInsurances.map((ins) => (
            <div
              key={ins.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-green-200 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{ins.name}</h3>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full uppercase mt-1 inline-block">
                        Operadora
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body details */}
                <div className="mt-5 space-y-2 text-xs text-slate-500 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ins.phone}</span>
                  </div>
                  {ins.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-[200px]">{ins.email}</span>
                    </div>
                  )}
                  {ins.contactPerson && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Contato: <strong className="text-slate-700">{ins.contactPerson}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom stats and delete */}
              <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-700">Ativo</span>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Remover o convênio ${ins.name}?`)) {
                      deleteInsurance(ins.id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                  title="Remover Convênio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
          <Building2 className="w-12 h-12 text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">Nenhum Convênio Encontrado</h3>
          <p className="text-xs max-w-sm mt-1">Refine seus termos de busca ou cadastre uma nova operadora.</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-800">Cadastrar Convênio</h3>
                <p className="text-slate-400 text-xs mt-0.5">Adicione uma nova operadora de saúde ao sistema.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInsurance} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nome da Operadora *</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bradesco Saúde" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-green-600" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telefone de Contato *</label>
                  <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0800 000 0000" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-green-600" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">E-mail de Autorizações</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="autorizacao@convenio.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Pessoa de Contato (Opcional)</label>
                  <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Nome do Analista" className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none" />
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
