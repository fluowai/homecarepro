import React, { useState } from 'react';
import { useHomeCareStore } from '../store';
import {
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  Award,
  Shield,
  Star,
  ChevronDown
} from 'lucide-react';

export default function CoopFinanceView() {
  const { professionals, visits, activeTenantId } = useHomeCareStore();
  const [selectedProfId, setSelectedProfId] = useState<string>('');

  const tenantProfessionals = professionals.filter(p => p.tenantId === activeTenantId);
  const activeProf = selectedProfId ? tenantProfessionals.find(p => p.id === selectedProfId) : null;

  // Filtra as visitas do cooperado selecionado que estão concluídas no mês atual
  const now = new Date();
  const profVisits = visits.filter(v => 
    v.tenantId === activeTenantId && 
    v.professionalId === selectedProfId && 
    v.status === 'concluida' &&
    new Date(v.date).getMonth() === now.getMonth() &&
    new Date(v.date).getFullYear() === now.getFullYear()
  );

  // Score de Assiduidade real (0-100), derivado da produção do cooperado:
  // 70% conclusão das visitas agendadas + 30% registros de check-in
  const profAllVisits = visits.filter(v =>
    v.tenantId === activeTenantId &&
    v.professionalId === selectedProfId &&
    (v.status === 'agendada' || v.status === 'em_andamento' || v.status === 'concluida')
  );
  const totalScheduled = profAllVisits.length;
  const completedCount = profAllVisits.filter(v => v.status === 'concluida').length;
  const withCheckIn = profAllVisits.filter(v => v.checkInTime).length;
  const computedScore = totalScheduled === 0
    ? 0
    : Math.min(100, Math.round((completedCount / totalScheduled) * 70 + (withCheckIn / totalScheduled) * 30));
  const score = activeProf?.score ?? computedScore;
  const tier = score >= 90 ? 'Diamante' : score >= 75 ? 'Ouro' : score >= 50 ? 'Prata' : 'Bronze';

  const tierColors = {
    'Diamante': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    'Ouro': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Prata': 'bg-slate-200 text-slate-800 border-slate-300',
    'Bronze': 'bg-orange-100 text-orange-800 border-orange-200'
  };

  // Deduções estatutárias calculadas a partir da produção real do cooperado
  const totalBruto = profVisits.reduce((acc, v) => acc + (v.baseValue || v.value), 0);
  const taxaAdm = totalBruto * 0.15; // 15% taxa administrativa
  const fates = totalBruto * 0.05; // 5% Fundo de Assistência Técnica, Educacional e Social
  const quotaCapital = profVisits.length > 0 ? 50 : 0; // R$ 50 fixo (só se houver produção)
  const inss = totalBruto * 0.11; // 11% retenção INSS
  
  const totalLiquido = totalBruto - taxaAdm - fates - quotaCapital - inss;

  const handleDownloadExtract = () => {
    if (!activeProf) return;
    const content = [
      'EXTRATO DE REPASSE - COOPERATIVA',
      `Cooperado: ${activeProf.name} (${activeProf.registration || 'reg. não informado'})`,
      `Especialidade: ${activeProf.specialty}`,
      `Período: ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
      '',
      `Produção Bruta: R$ ${totalBruto.toFixed(2)} (${profVisits.length} plantões)`,
      `Taxa ADM (15%): - R$ ${taxaAdm.toFixed(2)}`,
      `FATES (5%): - R$ ${fates.toFixed(2)}`,
      `Quota-Capital: - R$ ${quotaCapital.toFixed(2)}`,
      `INSS (11%): - R$ ${inss.toFixed(2)}`,
      `Repasse Líquido: R$ ${totalLiquido.toFixed(2)}`,
      '',
      'Este é um extrato estimado gerado pelo sistema. O pagamento é processado pela tesouraria.',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extrato_${activeProf.name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Repasses e Extrato</h2>
          <p className="text-slate-500 text-sm mt-1">Gestão de produção, deduções estatutárias e gamificação do cooperado.</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedProfId}
            onChange={(e) => setSelectedProfId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg py-2 px-4 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none"
          >
            <option value="">Selecione um Cooperado...</option>
            {tenantProfessionals.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {activeProf && (
            <button onClick={handleDownloadExtract} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white font-semibold text-sm rounded-lg shadow-sm hover:bg-slate-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>Baixar Extrato</span>
            </button>
          )}
        </div>
      </div>

      {activeProf ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel Esquerdo: Resumo Financeiro & Gamificação */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Gamificação Profile */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center text-center">
              <div className="relative">
                <img src={activeProf.avatar} alt={activeProf.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
                <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-full border-2 border-white shadow-sm ${tierColors[tier]}`}>
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <h3 className="font-bold text-lg text-slate-800 mt-4">{activeProf.name}</h3>
              <p className="text-sm text-slate-500">{activeProf.specialty}</p>
              
              <div className="mt-4 flex flex-col gap-2 w-full">
                <div className={`py-1.5 px-3 rounded-lg text-sm font-bold border ${tierColors[tier]} flex items-center justify-center gap-2`}>
                  <Star className="w-4 h-4" />
                  Cooperado Nível {tier}
                </div>
                <div className="text-xs text-slate-400 font-medium mt-2">
                  Score de Assiduidade: <span className="text-slate-700 font-bold text-sm">{score}/100</span>
                </div>
                {tier === 'Diamante' || tier === 'Ouro' ? (
                  <p className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 p-2 rounded-lg mt-1">
                    Benefício ativo: Acesso antecipado ao Mural de Plantões (+12h).
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg mt-1">
                    Complete mais plantões sem faltas para subir de nível.
                  </p>
                )}
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              
              <h3 className="text-emerald-100 font-semibold text-sm mb-1 relative z-10">Repasse Líquido Estimado</h3>
              <div className="text-3xl font-bold tracking-tight mb-6 relative z-10">
                R$ {totalLiquido > 0 ? totalLiquido.toFixed(2) : '0.00'}
              </div>
              
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-center text-sm border-b border-white/20 pb-2">
                  <span className="text-emerald-50">Produção Bruta</span>
                  <span className="font-bold">R$ {totalBruto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/20 pb-2">
                  <span className="text-emerald-50 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Taxa ADM (15%)</span>
                  <span className="font-bold text-red-200">- R$ {taxaAdm.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/20 pb-2">
                  <span className="text-emerald-50 flex items-center gap-1"><Shield className="w-3 h-3"/> FATES (5%)</span>
                  <span className="font-bold text-red-200">- R$ {fates.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/20 pb-2">
                  <span className="text-emerald-50 flex items-center gap-1"><Shield className="w-3 h-3"/> Quota-Capital</span>
                  <span className="font-bold text-red-200">- R$ {quotaCapital.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-emerald-50">INSS Retido (11%)</span>
                  <span className="font-bold text-red-200">- R$ {inss.toFixed(2)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Painel Direito: Lista de Produção */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm">Detalhamento de Produção (Plantões Realizados)</h3>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Mês Atual
                </div>
              </div>
              
              <div className="overflow-y-auto flex-1 p-6">
                {profVisits.length > 0 ? (
                  <div className="space-y-4">
                    {profVisits.map(visit => (
                      <div key={visit.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">Plantão Concluído</p>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                              <span>Data: {visit.date}</span>
                              <span>•</span>
                              <span>{visit.timeStart} - {visit.timeEnd}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">R$ {(visit.baseValue || visit.value).toFixed(2)}</p>
                          <p className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">Aguardando repasse</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                    <DollarSign className="w-12 h-12 text-slate-200 mb-3" />
                    <p className="font-semibold text-sm">Nenhuma produção registrada.</p>
                    <p className="text-xs mt-1">Este cooperado não possui plantões concluídos neste período.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <TrendingUp className="w-16 h-16 text-slate-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Selecione um Cooperado</h3>
          <p className="text-slate-500 text-sm mt-2 max-w-sm">
            Escolha um profissional na lista acima para visualizar seu extrato, deduções estatutárias e score de gamificação.
          </p>
        </div>
      )}
    </div>
  );
}
