import React, { useState } from 'react';
import { useHomeCareStore } from '../store';
import {
  Users,
  FileText,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  Plus,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function AssembliesView() {
  const { assemblies, assemblyVotes, addAssembly, voteAssembly, professionals, activeTenantId } = useHomeCareStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [selectedProfId, setSelectedProfId] = useState('');

  const tenantAssemblies = assemblies.filter(a => a.tenantId === activeTenantId);
  const tenantProfessionals = professionals.filter(p => p.tenantId === activeTenantId);

  const handleCreateAssembly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      alert("Título e descrição são obrigatórios.");
      return;
    }

    addAssembly({
      title,
      description,
      status: 'active',
      date: new Date().toISOString().split('T')[0],
      documentUrl
    });

    setTitle('');
    setDescription('');
    setDocumentUrl('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Módulo Societário</h2>
          <p className="text-slate-500 text-sm mt-1">Gestão de assembleias, editais abertos e votações digitais dos cooperados.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Convocar Assembleia</span>
        </button>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-indigo-800">
          <Users className="w-5 h-5" />
          <span className="font-semibold text-sm">Simular Acesso de Cooperado:</span>
        </div>
        <select
          value={selectedProfId}
          onChange={(e) => setSelectedProfId(e.target.value)}
          className="bg-white border border-indigo-200 rounded-lg py-2 px-4 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none w-full sm:w-64"
        >
          <option value="">(Visão do Administrador)</option>
          {tenantProfessionals.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenantAssemblies.map(assembly => {
          const votes = assemblyVotes.filter(v => v.assemblyId === assembly.id);
          const approves = votes.filter(v => v.vote === 'approve').length;
          const rejects = votes.filter(v => v.vote === 'reject').length;
          const abstains = votes.filter(v => v.vote === 'abstain').length;

          const profVote = selectedProfId ? votes.find(v => v.professionalId === selectedProfId) : null;

          return (
            <div key={assembly.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">{assembly.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                    assembly.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                    assembly.status === 'completed' ? 'bg-slate-100 text-slate-600' : 
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {assembly.status === 'active' ? 'Em Votação' : assembly.status === 'completed' ? 'Encerrada' : 'Rascunho'}
                  </span>
                </div>
                
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                  {assembly.description}
                </p>

                {assembly.documentUrl && (
                  <a href={assembly.documentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-xs font-semibold mt-2">
                    <FileText className="w-4 h-4" />
                    Edital em PDF
                  </a>
                )}
              </div>

              {/* Votação / Resultado */}
              <div className="p-5 bg-slate-50">
                {!selectedProfId ? (
                  // Admin View: Results
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Parcial de Votos</h4>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                        <ThumbsUp className="w-4 h-4" /> {approves}
                      </div>
                      <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
                        <ThumbsDown className="w-4 h-4" /> {rejects}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                        <MinusCircle className="w-4 h-4" /> {abstains}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Cooperado View: Vote
                  <div>
                    {profVote ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-2 rounded-lg font-bold text-sm">
                        <CheckCircle className="w-5 h-5" />
                        Seu voto foi registrado ({profVote.vote === 'approve' ? 'Aprovado' : profVote.vote === 'reject' ? 'Rejeitado' : 'Abstenção'})
                      </div>
                    ) : assembly.status === 'active' ? (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-600 mb-2 text-center">Registrar o seu Voto</h4>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => voteAssembly(assembly.id, selectedProfId, 'approve')}
                            className="flex-1 flex justify-center items-center gap-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-2 rounded-lg font-bold text-xs transition-colors"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> Aprovar
                          </button>
                          <button 
                            onClick={() => voteAssembly(assembly.id, selectedProfId, 'reject')}
                            className="flex-1 flex justify-center items-center gap-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 py-2 rounded-lg font-bold text-xs transition-colors"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" /> Rejeitar
                          </button>
                          <button 
                            onClick={() => voteAssembly(assembly.id, selectedProfId, 'abstain')}
                            className="flex-1 flex justify-center items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 rounded-lg font-bold text-xs transition-colors"
                          >
                            <MinusCircle className="w-3.5 h-3.5" /> Abster
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 py-2 rounded-lg font-bold text-sm">
                        <AlertCircle className="w-5 h-5" />
                        Esta assembleia não está mais aberta.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {tenantAssemblies.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-200 rounded-2xl border-dashed">
            <Users className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-700 text-sm">Nenhuma Assembleia</h4>
            <p className="text-xs mt-1">Convoque a primeira assembleia digital clicando no botão acima.</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-800">Nova Assembleia</h3>
              </div>
            </div>

            <form onSubmit={handleCreateAssembly} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Título da Pauta *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Aprovação de Contas Trimestrais"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Descrição Detalhada *</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes sobre a votação..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 h-24 resize-none focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Link do Edital (PDF)</label>
                <input
                  type="url"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://exemplo.com/edital.pdf"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-indigo-600"
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-md transition-all"
                >
                  Publicar Assembleia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
