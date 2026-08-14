import React, { useState } from 'react';
import { 
  Star, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Sliders, 
  Users, 
  Activity, 
  TrendingUp, 
  PhoneCall, 
  Smartphone,
  Check,
  AlertCircle
} from 'lucide-react';
import { useHomeCareStore } from '../store';
import { SurveyResponse } from '../types';

export default function SatisfactionView() {
  const { 
    surveys, 
    surveyConfig, 
    updateSurveyConfig, 
    respondToSurvey,
    patients,
    professionals,
    activeTenantId 
  } = useHomeCareStore();

  const [activeTab, setActiveTab] = useState<'reports' | 'config' | 'simulator'>('reports');
  const [editingTemplate, setEditingTemplate] = useState(surveyConfig.messageTemplate);
  const [editingChannel, setEditingChannel] = useState(surveyConfig.channel);
  const [editingAuto, setEditingAuto] = useState(surveyConfig.autoSend);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Simulator state
  const [selectedSimSurveyId, setSelectedSimSurveyId] = useState('');
  const [simRating, setSimRating] = useState<number>(5);
  const [simHoverRating, setSimHoverRating] = useState<number | null>(null);
  const [simComment, setSimComment] = useState('');
  const [simSuccess, setSimSuccess] = useState(false);

  const tenantSurveys = surveys.filter(s => s.tenantId === activeTenantId);
  const completedSurveys = tenantSurveys.filter(s => s.rating > 0);
  const pendingSurveys = tenantSurveys.filter(s => s.rating === 0);

  // Calculate statistics
  const totalSent = tenantSurveys.length;
  const totalResponded = completedSurveys.length;
  const responseRate = totalSent > 0 ? Math.round((totalResponded / totalSent) * 100) : 0;
  
  const averageRating = totalResponded > 0 
    ? (completedSurveys.reduce((sum, s) => sum + s.rating, 0) / totalResponded).toFixed(1) 
    : '0.0';

  // CSAT (Customer Satisfaction Score) = % of 4 and 5 stars
  const highRatings = completedSurveys.filter(s => s.rating >= 4).length;
  const csatScore = totalResponded > 0 ? Math.round((highRatings / totalResponded) * 100) : 0;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateSurveyConfig({
      channel: editingChannel,
      autoSend: editingAuto,
      messageTemplate: editingTemplate
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSimulateResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSimSurveyId) return;

    respondToSurvey(selectedSimSurveyId, simRating, simComment);
    setSimSuccess(true);
    setTimeout(() => {
      setSimSuccess(false);
      setSelectedSimSurveyId('');
      setSimComment('');
      setSimRating(5);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Pesquisas de Satisfação & Ouvidoria</h2>
          <p className="text-slate-500 text-sm mt-1">
            Métricas de satisfação assistencial, envio pós-visita automático e ferramentas de auditoria clínica de qualidade (CSAT).
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0 scroll-smooth">
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'reports' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Relatório Geral
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'config' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Configurar Envio
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
              activeTab === 'simulator' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-ping"></span>
            <span>Registrar Resposta</span>
          </button>
        </div>
      </div>

      {activeTab === 'reports' && (
        <>
          {/* Key Indicators Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Média Geral (CSAT)</span>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{averageRating} / 5.0</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Índice CSAT</span>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{csatScore}%</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pesquisas Enviadas</span>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalSent}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Taxa de Resposta</span>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{responseRate}% ({totalResponded})</p>
              </div>
            </div>
          </div>

          {/* Feedback Log List */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Histórico de Avaliações Recebidas</h3>
              <span className="text-[11px] text-slate-400 font-semibold">{completedSurveys.length} feedbacks registrados</span>
            </div>

            <div className="divide-y divide-slate-100">
              {completedSurveys.length > 0 ? (
                completedSurveys.map((s) => {
                  const patient = patients.find(p => p.id === s.patientId);
                  const professional = professionals.find(p => p.id === s.professionalId);
                  
                  return (
                    <div key={s.id} className="p-6 hover:bg-slate-50/40 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-xs">
                            {patient?.name.charAt(0) || 'P'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block">{patient?.name || 'Paciente'}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Atendimento feito por <strong className="text-slate-600 font-semibold">{professional?.name || 'Profissional'}</strong> • {s.date}
                            </span>
                          </div>
                        </div>

                        {/* Rating stars & channel */}
                        <div className="flex items-center gap-3 self-start sm:self-center">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-4 h-4 ${
                                  star <= s.rating 
                                    ? 'fill-amber-400 text-amber-400' 
                                    : 'text-slate-200'
                                }`} 
                              />
                            ))}
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            s.channel === 'whatsapp' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-green-50 text-green-700 border border-green-100'
                          }`}>
                            {s.channel}
                          </span>
                        </div>
                      </div>

                      {s.comment && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-slate-600 italic text-xs leading-relaxed">
                            "{s.comment}"
                          </p>
                        </div>
                      )}

                      {s.respondedAt && (
                        <span className="text-[9px] text-slate-400 block text-right font-medium">
                          Respondido em: {new Date(s.respondedAt).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <Star className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-xs font-semibold">Nenhuma resposta de pesquisa cadastrada ainda.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Conclua visitas no applet de check-in para gerar novas pesquisas de satisfação!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Settings form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Configurações de Disparo</h3>
              <p className="text-slate-500 text-xs mt-1">Configure as regras de envio automático pós-atendimento.</p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-5">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="font-bold text-slate-800 text-xs block">Disparo Automatizado</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Enviar link automaticamente ao realizar checkout.</span>
                </div>
                <input
                  type="checkbox"
                  checked={editingAuto}
                  onChange={(e) => setEditingAuto(e.target.checked)}
                  className="w-4 h-4 rounded text-green-600 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Canal Principal de Envio</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingChannel('whatsapp')}
                    className={`p-3.5 rounded-xl border flex items-center justify-center gap-2.5 transition-all text-xs font-bold ${
                      editingChannel === 'whatsapp'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <span>WhatsApp Business</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingChannel('sms')}
                    className={`p-3.5 rounded-xl border flex items-center justify-center gap-2.5 transition-all text-xs font-bold ${
                      editingChannel === 'sms'
                        ? 'border-green-600 bg-green-50/50 text-green-800'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <span>SMS Corporativo</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Template de Mensagem</label>
                <textarea
                  rows={5}
                  value={editingTemplate}
                  onChange={(e) => setEditingTemplate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-3 text-slate-700 font-mono focus:outline-none focus:border-green-600 leading-relaxed"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Variáveis:</span>
                  <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-mono font-bold">{"{professional_name}"}</span>
                  <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-mono font-bold">{"{survey_link}"}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow-md shadow-green-100"
                >
                  Salvar Configurações
                </button>
              </div>
            </form>
          </div>

          {/* Right column: live mobile mockup preview */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-3">Prévia no Dispositivo Móvel</span>
            
            {/* Simulated Phone Screen */}
            <div className="w-full max-w-[260px] bg-white border-[6px] border-slate-800 rounded-[32px] h-[450px] shadow-xl overflow-hidden flex flex-col text-left font-sans">
              <div className="bg-slate-800 text-[10px] text-white/80 py-1 px-4 text-center select-none font-bold">
                12:45 • LTE
              </div>
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center gap-2">
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center font-bold text-white text-[9px]">
                  H
                </div>
                <div>
                  <span className="font-bold text-[10px] text-slate-800 block">HomeCare Pro</span>
                  <span className="text-[8px] text-emerald-500 font-medium block">Online</span>
                </div>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-100">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200/50 shadow-sm max-w-[85%] space-y-1.5">
                  <p className="text-[10px] text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                    {editingTemplate
                      .replace('{professional_name}', 'Dr. Carlos Santos')
                      .replace('{survey_link}', 'https://homecare.pro/survey/srv-demo')
                    }
                  </p>
                  <span className="text-[8px] text-slate-400 block text-right">12:45 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Simulator Form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Registrar Resposta (Entrada Manual)</h3>
              <p className="text-slate-500 text-xs mt-1">Registre a resposta de satisfação de um atendimento ainda aguardando retorno do paciente.</p>
            </div>

            {pendingSurveys.length > 0 ? (
              <form onSubmit={handleSimulateResponse} className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Escolha a Pesquisa Pendente</label>
                  <select
                    required
                    value={selectedSimSurveyId}
                    onChange={(e) => setSelectedSimSurveyId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs py-2.5 px-3 text-slate-700 font-semibold focus:outline-none"
                  >
                    <option value="">-- Selecione um atendimento aguardando resposta --</option>
                    {pendingSurveys.map(s => {
                      const pat = patients.find(p => p.id === s.patientId);
                      const prof = professionals.find(p => p.id === s.professionalId);
                      return (
                        <option key={s.id} value={s.id}>
                          Para: {pat?.name} • Profissional: {prof?.name} ({s.channel.toUpperCase()})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Nota de Satisfação (Estrelas)</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSimRating(star)}
                        onMouseEnter={() => setSimHoverRating(star)}
                        onMouseLeave={() => setSimHoverRating(null)}
                        className="p-1 text-slate-300 hover:scale-110 transition-transform"
                      >
                        <Star 
                          className={`w-9 h-9 ${
                            star <= (simHoverRating !== null ? simHoverRating : simRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-sm font-bold text-slate-600 ml-3">
                      {simRating === 5 ? 'Excelente! (5)' :
                       simRating === 4 ? 'Muito Bom (4)' :
                       simRating === 3 ? 'Regular (3)' :
                       simRating === 2 ? 'Ruim (2)' : 'Péssimo (1)'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Comentário ou Sugestão (Opcional)</label>
                  <textarea
                    rows={4}
                    value={simComment}
                    onChange={(e) => setSimComment(e.target.value)}
                    placeholder="Ex: O profissional foi muito carinhoso, pontual e explicou todos os procedimentos com paciência."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-3 text-slate-700 focus:outline-none focus:border-green-600"
                  />
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-green-600 hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow-md shadow-green-100 flex items-center gap-1.5"
                  >
                    <span>Enviar Resposta</span>
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-xs font-bold">Nenhuma pesquisa de satisfação pendente encontrada!</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                  Vá na guia de <strong>Check-in de Visitas</strong>, selecione um atendimento, realize o Check-in e depois execute o <strong>Check-out</strong> para disparar uma nova pesquisa.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar Info Card */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-slate-600 space-y-4 text-xs leading-relaxed">
            <h4 className="font-bold text-slate-800 text-sm">Como funciona o fluxo?</h4>
            <ol className="list-decimal pl-4 space-y-2 text-slate-500 font-medium">
              <li>O profissional realiza o check-out na residência do paciente.</li>
              <li>O sistema detecta que o atendimento foi concluído com sucesso.</li>
              <li>Caso o envio esteja ativado, o sistema gera um identificador único de pesquisa e insere no histórico.</li>
              <li>Uma mensagem de WhatsApp ou SMS é encaminhada ao paciente com o link da pesquisa.</li>
              <li>Você pode registrar a avaliação do paciente manualmente nesta guia, se necessário.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Success alert overlays */}
      {(saveSuccess || simSuccess) && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl shadow-lg flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-bold">
              {saveSuccess ? 'Configurações atualizadas com sucesso!' : 'Resposta registrada com sucesso!'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
