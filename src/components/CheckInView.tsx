import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Smartphone, 
  Activity, 
  AlertTriangle, 
  ArrowRight,
  ClipboardList,
  Heart,
  Thermometer,
  Eye,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { useHomeCareStore } from '../store';

export default function CheckInView() {
  const { 
    patients, 
    professionals, 
    visits, 
    activeTenantId, 
    checkInVisit, 
    checkOutVisit,
    generateVisitReportAi,
    medicines,
    consumeMedicine,
    isOffline,
    offlineSyncQueue,
    offlineLogs,
    setOfflineMode,
    syncOfflineData,
    clearOfflineQueue
  } = useHomeCareStore();

  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  
  // Bedside input states
  const [pa, setPa] = useState('120/80');
  const [fc, setFc] = useState('78');
  const [temp, setTemp] = useState('36.5');
  const [sat, setSat] = useState('98');
  const [rawNotes, setRawNotes] = useState('');
  const [generatedReport, setGeneratedReport] = useState('');
  
  // Medication tracking states
  const [selectedMedId, setSelectedMedId] = useState('');
  const [medQty, setMedQty] = useState(1);
  const [usedMeds, setUsedMeds] = useState<{ id: string; name: string; qty: number }[]>([]);
  
  // AI loader
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Filters for today's visits
  const todayStr = new Date().toISOString().split('T')[0];
  const tenantVisits = visits.filter(v => v.tenantId === activeTenantId && v.date === todayStr);

  // Auto-select first visit if none is selected
  React.useEffect(() => {
    if (!selectedVisitId && tenantVisits.length > 0) {
      setSelectedVisitId(tenantVisits[0].id);
    }
  }, [tenantVisits, selectedVisitId]);

  const selectedVisit = visits.find(v => v.id === selectedVisitId);
  const patient = selectedVisit ? patients.find(p => p.id === selectedVisit.patientId) : null;
  const professional = selectedVisit ? professionals.find(p => p.id === selectedVisit.professionalId) : null;

  const handleCheckIn = () => {
    if (!selectedVisitId) return;
    // Simulate finding GPS coords (São Paulo standard range or similar)
    const mockLat = (-23.55 + Math.random() * 0.02).toFixed(4);
    const mockLng = (-46.63 + Math.random() * 0.02).toFixed(4);
    const locationStr = `${mockLat},${mockLng} (Confirmado via GPS Integrado)`;
    
    checkInVisit(selectedVisitId, locationStr);
  };

  const handleGenerateAiReport = async () => {
    if (!selectedVisitId || !rawNotes) {
      alert("Por favor, digite algumas anotações brutas antes de pedir a evolução à IA.");
      return;
    }
    
    setIsAiLoading(true);
    setAiError(null);

    if (isOffline) {
      setTimeout(() => {
        const localReport = `EVOLUÇÃO CLÍNICA DE ENFERMAGEM (RASCUNHO OFFLINE)

[Sinais Vitais]:
- Pressão Arterial: ${pa} mmHg
- Frequência Cardíaca: ${fc} bpm
- Temperatura Corporal: ${temp}°C
- Saturação de O2: ${sat}%

[Relato Clínico Adicional]:
${rawNotes}

[Aviso]: Este prontuário foi estruturado em modo offline e está armazenado localmente no dispositivo. A evolução científica completa será enriquecida e revisada por Inteligência Artificial (Gemini) de forma automática assim que a conexão de internet for restabelecida e os dados sincronizados.`;
        setGeneratedReport(localReport);
        setIsAiLoading(false);
      }, 800);
      return;
    }

    try {
      const report = await generateVisitReportAi(
        selectedVisitId,
        rawNotes,
        { pa, fc, temp, sat }
      );
      setGeneratedReport(report);
    } catch (err) {
      setAiError("Não foi possível acionar o gerador de relatórios de IA. Usando evolução simplificada.");
      setGeneratedReport(`EVOLUÇÃO CLÍNICA DE ENFERMAGEM\n\nSinais Vitais: PA ${pa}, FC ${fc} bpm, Temp ${temp}°C, Sat ${sat}%.\n\nEvolução: ${rawNotes}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCheckOut = () => {
    if (!selectedVisitId) return;

    // Deduct medicines used
    usedMeds.forEach(item => {
      consumeMedicine(item.id, item.qty);
    });

    const mockLat = (-23.55 + Math.random() * 0.02).toFixed(4);
    const mockLng = (-46.63 + Math.random() * 0.02).toFixed(4);
    const locationStr = `${mockLat},${mockLng} (Confirmado via GPS Integrado)`;
    
    let medsReport = "";
    if (usedMeds.length > 0) {
      medsReport = "\n\n[Medicamentos Utilizados e Baixados do Estoque]:\n" + usedMeds.map(item => `- ${item.name}: ${item.qty} un`).join("\n");
    }

    const finalReport = (generatedReport || `Evolução Clínica Simplificada:\nSinais Vitais: PA ${pa} mmHg | FC ${fc} bpm | Temp ${temp}°C | Sat O2 ${sat}%.\nNotas: ${rawNotes}`) + medsReport;
    
    checkOutVisit(selectedVisitId, locationStr, finalReport, { pa, fc, temp, sat }, rawNotes, usedMeds);
    
    // Clear bedside states
    setRawNotes('');
    setGeneratedReport('');
    setUsedMeds([]);
    setSelectedMedId('');
  };

  React.useEffect(() => {
    const handleOnline = () => {
      setOfflineMode(false);
    };
    const handleOffline = () => {
      setOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount
    if (!navigator.onLine) {
      setOfflineMode(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOfflineMode]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Check-in de Visitas (Aplicativo de Campo)</h2>
        <p className="text-slate-500 text-sm mt-1">Simulador operacional para profissionais de saúde efetuarem check-in, check-out e evoluções clínicas por IA na residência.</p>
      </div>

      {/* Gerenciador Offline & Painel de Sincronização */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isOffline 
          ? 'bg-amber-50/70 border-amber-200 shadow-sm' 
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl mt-0.5 ${isOffline ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {isOffline ? (
                <WifiOff className="w-5 h-5 animate-pulse" />
              ) : (
                <Wifi className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Gerenciador de Estado de Conexão
                </h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                  isOffline ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  ● {isOffline ? 'Offline (Sem Conexão)' : 'Online (Conectado)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isOffline 
                  ? 'Você está preenchendo check-ins de campo no modo offline. Seus registros estão seguros localmente e serão enviados assim que restabelecer conexão.' 
                  : 'Seu dispositivo possui internet ativa. Os check-ins e evoluções clínicas são transmitidos em tempo real para os prontuários dos pacientes.'
                }
              </p>
              {offlineSyncQueue.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-800 font-bold bg-amber-100/50 border border-amber-200/60 px-2.5 py-1 rounded-lg w-fit">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>{offlineSyncQueue.length} {offlineSyncQueue.length === 1 ? 'registro aguardando sincronização' : 'registros aguardando sincronização'}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Simulation Toggle Switch */}
            <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Simular Sem Conexão (Offline):</span>
              <button
                type="button"
                onClick={() => setOfflineMode(!isOffline)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isOffline ? 'bg-amber-400' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isOffline ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Sync now button */}
            {offlineSyncQueue.length > 0 && (
              <div className="flex items-center gap-2">
                {!isOffline ? (
                  <button
                    type="button"
                    onClick={() => syncOfflineData()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sincronizar Agora</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-amber-700 font-semibold italic bg-amber-50 px-2 py-1 rounded">
                    Reconecte para sincronizar
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => clearOfflineQueue()}
                  className="px-3 py-2 bg-white hover:bg-red-50 hover:text-red-600 text-slate-500 font-bold text-xs rounded-xl border border-slate-200 transition-all"
                >
                  Limpar Fila
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle: Simulation Interface */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            
            {/* Visit selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Escolha o seu Atendimento de Hoje</label>
              <select
                value={selectedVisitId}
                onChange={(e) => {
                  setSelectedVisitId(e.target.value);
                  setRawNotes('');
                  setGeneratedReport('');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs py-2.5 px-3 text-slate-700 font-semibold focus:outline-none"
              >
                {tenantVisits.length > 0 ? (
                  tenantVisits.map(v => {
                    const p = patients.find(pat => pat.id === v.patientId);
                    const pr = professionals.find(pro => pro.id === v.professionalId);
                    return (
                      <option key={v.id} value={v.id}>
                        {v.timeStart} - {p?.name} | {pr?.name} ({v.status.toUpperCase()})
                      </option>
                    );
                  })
                ) : (
                  <option value="">Nenhum atendimento na escala de hoje.</option>
                )}
              </select>
            </div>

            {selectedVisit ? (
              <div className="space-y-6 border-t border-slate-100 pt-6">
                
                {/* Visit summary mini-card */}
                <div className="p-4 bg-slate-50/75 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Paciente</span>
                    <span className="text-xs font-bold text-slate-800 block">{patient?.name}</span>
                    <span className="text-[10px] text-slate-500 block">Idade: {patient ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : 0} anos</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Profissional Alocado</span>
                    <span className="text-xs font-bold text-slate-800 block">{professional?.name}</span>
                    <span className="text-[10px] text-slate-500 block">{professional?.specialty} • {professional?.registration}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Status Operacional</span>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                      selectedVisit.status === 'concluida' ? 'bg-emerald-50 text-emerald-700' :
                      selectedVisit.status === 'em_andamento' ? 'bg-blue-50 text-blue-700 animate-pulse' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {selectedVisit.status === 'concluida' ? 'Concluído' :
                       selectedVisit.status === 'em_andamento' ? 'Atendimento em Andamento' :
                       'Aguardando Check-in'}
                    </span>
                  </div>
                </div>

                {/* 1. STATE: AGENDADA (Needs checkin) */}
                {selectedVisit.status === 'agendada' && (
                  <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-4 max-w-md mx-auto">
                    <MapPin className="w-12 h-12 text-blue-500 bg-blue-50 p-3 rounded-2xl mx-auto" />
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Você está na residência do paciente?</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Clique no botão para bater o ponto georreferenciado e abrir a ficha de evolução clínica.</p>
                    </div>
                    <button
                      onClick={handleCheckIn}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-100 transition-all hover:scale-[1.01]"
                    >
                      Efetuar Check-In Domiciliar
                    </button>
                  </div>
                )}

                {/* 2. STATE: EM_ANDAMENTO (Filing vitals & clinical report with IA) */}
                {selectedVisit.status === 'em_andamento' && (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Timestamp log */}
                    <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold bg-blue-50 p-3 rounded-xl border border-blue-100 w-fit">
                      <Clock className="w-4 h-4" />
                      <span>Check-in realizado às {selectedVisit.checkInTime} • {selectedVisit.checkInLocation?.split('(')[0]}</span>
                    </div>

                    {/* Bedside Vital Signs Input */}
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span>Sinais Vitais (Triagem Beira-Leito)</span>
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Pressão Art. (PA)</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={pa}
                              onChange={(e) => setPa(e.target.value)}
                              className="bg-transparent font-bold text-xs text-slate-800 border-none outline-none w-14"
                            />
                            <span className="text-[10px] text-slate-400">mmHg</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Freq. Cardíaca (FC)</label>
                          <div className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                            <input
                              type="text"
                              value={fc}
                              onChange={(e) => setFc(e.target.value)}
                              className="bg-transparent font-bold text-xs text-slate-800 border-none outline-none w-10"
                            />
                            <span className="text-[10px] text-slate-400">bpm</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Temperatura</label>
                          <div className="flex items-center gap-1">
                            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                            <input
                              type="text"
                              value={temp}
                              onChange={(e) => setTemp(e.target.value)}
                              className="bg-transparent font-bold text-xs text-slate-800 border-none outline-none w-10"
                            />
                            <span className="text-[10px] text-slate-400">°C</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
                          <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Saturação O2</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={sat}
                              onChange={(e) => setSat(e.target.value)}
                              className="bg-transparent font-bold text-xs text-slate-800 border-none outline-none w-10"
                            />
                            <span className="text-[10px] text-slate-400">% O2</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bedside raw notes */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Anotações rápidas de enfermagem / conduta</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Ex: Paciente calmo, higienizado, aceitou refeição. Realizada mudança de decúbito, curativo limpo e sem secreções. Administrados os medicamentos de rotina conforme receita médica..."
                        value={rawNotes}
                        onChange={(e) => setRawNotes(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-3 text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Medication Deduction Section */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Medicamentos Administrados (Baixa no Estoque)</span>
                        <span className="text-[9px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-bold">Baixa Automática</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <select
                          value={selectedMedId}
                          onChange={(e) => setSelectedMedId(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 text-slate-700 focus:outline-none"
                        >
                          <option value="">-- Selecione o medicamento administrado --</option>
                          {medicines.filter(m => m.tenantId === activeTenantId).map(m => (
                            <option key={m.id} value={m.id} disabled={m.quantity <= 0}>
                              {m.name} ({m.dosage}) - Disp: {m.quantity} un
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={medQty}
                          onChange={(e) => setMedQty(parseInt(e.target.value) || 1)}
                          className="w-14 bg-white border border-slate-200 rounded-lg text-center text-xs font-semibold py-1.5"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedMedId) return;
                            const med = medicines.find(m => m.id === selectedMedId);
                            if (med) {
                              if (med.quantity < medQty) {
                                alert("Erro: Quantidade selecionada maior do que o saldo em estoque!");
                                return;
                              }
                              // Check if already in usedMeds
                              const existingIndex = usedMeds.findIndex(u => u.id === selectedMedId);
                              if (existingIndex > -1) {
                                const newQty = usedMeds[existingIndex].qty + medQty;
                                if (med.quantity < newQty) {
                                  alert("Erro: Quantidade acumulada ultrapassa o estoque!");
                                  return;
                                }
                                const updated = [...usedMeds];
                                updated[existingIndex].qty = newQty;
                                setUsedMeds(updated);
                              } else {
                                setUsedMeds([...usedMeds, { id: med.id, name: `${med.name} (${med.dosage})`, qty: medQty }]);
                              }
                              setSelectedMedId('');
                              setMedQty(1);
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-all"
                        >
                          Adicionar
                        </button>
                      </div>

                      {usedMeds.length > 0 && (
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Selecionados para baixa:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {usedMeds.map((item, index) => (
                              <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-600">
                                <span>{item.name} x{item.qty}</span>
                                <button
                                  type="button"
                                  onClick={() => setUsedMeds(usedMeds.filter((_, idx) => idx !== index))}
                                  className="text-slate-400 hover:text-red-500 font-bold ml-1"
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI generation button & loader */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={handleGenerateAiReport}
                        disabled={isAiLoading || !rawNotes}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 fill-white animate-pulse" />
                        <span>{isAiLoading ? 'Redigindo Prontuário...' : 'Gerar Evolução Científica com IA'}</span>
                      </button>

                      <button
                        onClick={handleCheckOut}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1"
                      >
                        <span>Efetuar Check-Out (Salvar)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isAiLoading && (
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center">
                        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
                        <span className="text-xs text-slate-700 font-semibold">O Copilot IA está traduzindo termos técnicos em evolução de enfermagem formal...</span>
                      </div>
                    )}

                    {aiError && (
                      <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg">
                        {aiError}
                      </div>
                    )}

                    {/* AI Output container */}
                    {generatedReport && (
                      <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3 animate-fade-in">
                        <h4 className="font-bold text-xs text-indigo-800 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500" />
                          <span>Evolução Multidisciplinar Estruturada por IA</span>
                        </h4>
                        <textarea
                          rows={6}
                          value={generatedReport}
                          onChange={(e) => setGeneratedReport(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl text-xs p-4 text-slate-700 leading-relaxed font-mono focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400 block font-medium">Nota: Você pode revisar e editar livremente o prontuário estruturado pela inteligência artificial antes de salvar.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. STATE: CONCLUIDA (Summary of completed visit) */}
                {selectedVisit.status === 'concluida' && (
                  <div className="space-y-6 animate-fade-in bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 w-fit">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Atendimento Concluído com Sucesso</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                      <div>
                        <strong>Início (Check-In):</strong> {selectedVisit.checkInTime} ({selectedVisit.checkInLocation?.split('(')[0]})
                      </div>
                      <div>
                        <strong>Término (Check-Out):</strong> {selectedVisit.checkOutTime} ({selectedVisit.checkOutLocation?.split('(')[0]})
                      </div>
                    </div>

                    <div className="border-t border-slate-200/60 pt-4 space-y-2">
                      <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Evolução Clínico-Assistencial Gravada:</h5>
                      <div className="p-4 bg-white rounded-2xl border border-slate-100 text-slate-700 text-xs leading-relaxed whitespace-pre-line font-mono max-h-60 overflow-y-auto">
                        {selectedVisit.report}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Selecione uma visita ativa de hoje para carregar a simulação de campo.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Operational guidelines (Smartphone Frame Simulation) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 relative">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-slate-800 text-sm">Visualizador de Campo</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Esta aba simula a experiência do aplicativo de campo do profissional. Ao realizar ações à esquerda, o prontuário domiciliar do paciente é atualizado instantaneamente no banco de dados.
            </p>

            <div className="bg-slate-900 text-white rounded-2xl p-4 font-mono text-[10px] space-y-1.5 min-h-[220px] max-h-96 overflow-y-auto shadow-inner">
              <span className="text-slate-400 block mb-2">// Logs de Telemetria e Sincronização</span>
              {offlineLogs.map((log, i) => {
                let colorClass = "text-slate-300";
                if (log.includes("[SISTEMA]")) colorClass = "text-cyan-400";
                else if (log.includes("[OFFLINE]")) colorClass = "text-amber-400";
                else if (log.includes("[SYNC]")) colorClass = "text-emerald-400";
                else if (log.includes("✓")) colorClass = "text-green-400 font-semibold";
                else if (log.includes("❌")) colorClass = "text-rose-400 font-semibold";
                return (
                  <p key={i} className={colorClass}>
                    ► {log}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
