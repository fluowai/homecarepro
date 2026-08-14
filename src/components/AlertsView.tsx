import React, { useState } from 'react';
import { 
  Bell, 
  Settings, 
  AlertTriangle, 
  Calendar, 
  Users, 
  ShieldAlert, 
  CheckCircle, 
  Sliders,
  Pill,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useHomeCareStore } from '../store';
import { ClinicalAlert } from '../types';

export default function AlertsView() {
  const { 
    alertConfig, 
    updateAlertConfig, 
    resolveAlert,
    getCalculatedAlerts
  } = useHomeCareStore();

  const [activeTab, setActiveTab] = useState<'alerts' | 'settings'>('alerts');
  const [filterType, setFilterType] = useState<'all' | 'no_visit' | 'low_stock' | 'expiry'>('all');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable settings states
  const [maxDays, setMaxDays] = useState(alertConfig?.maxDaysWithoutVisit || 7);
  const [expiryDays, setExpiryDays] = useState(alertConfig?.expiryWarningDays || 30);
  const [lowStockVal, setLowStockVal] = useState(alertConfig?.lowStockThreshold || 5);
  const [enableNotify, setEnableNotify] = useState(alertConfig?.enableSystemNotifications !== false);

  // Get alerts computed dynamically from the store (resolved alerts are persisted)
  const rawAlerts = getCalculatedAlerts();
  
  // Filter based on select tab type
  const filteredAlerts = rawAlerts.filter(a => {
    if (filterType === 'all') return true;
    return a.type === filterType;
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateAlertConfig({
      maxDaysWithoutVisit: maxDays,
      expiryWarningDays: expiryDays,
      lowStockThreshold: lowStockVal,
      enableSystemNotifications: enableNotify
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleResolveAlert = (id: string) => {
    resolveAlert(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Módulo de Alertas Inteligentes</h2>
          <p className="text-slate-500 text-sm mt-1">
            Central de monitoramento de risco assistencial. Notificações automáticas de ausência de cuidados e estoque crítico.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'alerts' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-green-600" />
            <span>Alertas Ativos ({rawAlerts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'settings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Parâmetros de Risco</span>
          </button>
        </div>
      </div>

      {activeTab === 'alerts' && (
        <>
          {/* Risk Dashboard Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Críticos / Alerta Geral</span>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {rawAlerts.filter(a => a.severity === 'critical').length}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Atenção Necessária</span>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {rawAlerts.filter(a => a.severity === 'warning').length}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pacientes Sem Visita</span>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {rawAlerts.filter(a => a.type === 'no_visit').length}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Farmácia Crítica</span>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {rawAlerts.filter(a => a.type === 'low_stock' || a.type === 'expiry').length}
                </p>
              </div>
            </div>
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Filtros:</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'all' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Todos ({rawAlerts.length})
            </button>
            <button
              onClick={() => setFilterType('no_visit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'no_visit' ? 'bg-rose-50 text-rose-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Sem Visita Recente ({rawAlerts.filter(a => a.type === 'no_visit').length})
            </button>
            <button
              onClick={() => setFilterType('low_stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'low_stock' ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Estoque Baixo ({rawAlerts.filter(a => a.type === 'low_stock').length})
            </button>
            <button
              onClick={() => setFilterType('expiry')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === 'expiry' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Vencimento de Medicamento ({rawAlerts.filter(a => a.type === 'expiry').length})
            </button>
          </div>

          {/* Alerts Grid */}
          <div className="space-y-4">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => {
                const isCritical = alert.severity === 'critical';
                
                return (
                  <div 
                    key={alert.id} 
                    className={`bg-white p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${
                      isCritical ? 'border-l-4 border-l-rose-500 border-slate-200' : 'border-l-4 border-l-amber-500 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isCritical ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        <AlertTriangle className="w-5.5 h-5.5" />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm">{alert.title}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            isCritical ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-amber-50 border border-amber-200 text-amber-700'
                          }`}>
                            {isCritical ? 'CRÍTICO' : 'Atenção'}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs leading-relaxed max-w-2xl">{alert.description}</p>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          Gerado em: {alert.date}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Resolver</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 shadow-sm">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-bold text-slate-800 text-sm">Parabéns! Nenhum alerta ativo no momento.</p>
                <p className="text-slate-400 text-xs mt-1">Todos os medicamentos e visitas estão em conformidade com as regras estabelecidas.</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Rules form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Configurar Thresholds de Alerta</h3>
              <p className="text-slate-500 text-xs mt-1">Personalize as margens de tolerância operacional para a equipe clínica de enfermagem.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Intervalo Limite Sem Visita (Dias)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={maxDays}
                    onChange={(e) => setMaxDays(parseInt(e.target.value) || 7)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-green-600/20"
                  />
                  <span className="text-[10px] text-slate-400 mt-1.5 block">Alerta se o paciente ficar mais de X dias sem visitas técnicas.</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Aviso Prévio de Vencimento (Dias)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-green-600/20"
                  />
                  <span className="text-[10px] text-slate-400 mt-1.5 block">Alertar sobre medicamentos vencendo nos próximos X dias.</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Alerta de Estoque Mínimo Padrão</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={lowStockVal}
                    onChange={(e) => setLowStockVal(parseInt(e.target.value) || 5)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-green-600/20"
                  />
                  <span className="text-[10px] text-slate-400 mt-1.5 block">Nível crítico mínimo padrão de estoque para farmácia central.</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Notificações por Email / Push</label>
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 mt-0.5">
                    <span className="font-semibold text-slate-600 text-xs">Enviar alertas urgentes</span>
                    <input
                      type="checkbox"
                      checked={enableNotify}
                      onChange={(e) => setEnableNotify(e.target.checked)}
                      className="w-4 h-4 rounded text-green-600 focus:ring-green-400"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-600 text-white rounded-xl text-xs font-bold shadow-md shadow-green-100"
                >
                  Atualizar Parâmetros
                </button>
              </div>
            </form>
          </div>

          {/* Quick explanations card */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-slate-600 space-y-4 text-xs leading-relaxed">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
              <span>Como funciona a IA e as Regras?</span>
            </h4>
            <p className="text-slate-500 font-medium">
              O sistema monitora em tempo real os cruzamentos operacionais. Toda vez que você altera os parâmetros acima, a lista de alertas é atualizada instantaneamente e recalcula:
            </p>
            <ul className="list-disc pl-4 space-y-2 text-slate-500 font-medium">
              <li>Qualquer medicamento abaixo do seu estoque mínimo.</li>
              <li>Visitas não concluídas e pacientes sem atendimento recorrente.</li>
              <li>Aproximação de vencimento de insumos e medicamentos perigosos.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Success notification banner */}
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl shadow-lg flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-bold">Parâmetros de risco atualizados com sucesso!</span>
          </div>
        </div>
      )}
    </div>
  );
}
