import React, { useState } from 'react';
import { 
  MapPin, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Activity, 
  ArrowRight,
  Heart,
  Thermometer,
  Wifi,
  WifiOff,
  RefreshCw,
  X,
  Navigation,
  Lock,
  Unlock,
  User,
  Camera,
  Pill,
  Trash2,
  Loader2
} from 'lucide-react';
import { useHomeCareStore } from '../store';
import { uploadFileToMinio } from '../lib/upload';

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
    consumePatientInventory,
    isOffline,
    offlineSyncQueue,
    offlineLogs,
    setOfflineMode,
    syncOfflineData,
    clearOfflineQueue
  } = useHomeCareStore();

  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [isJourneyOpen, setIsJourneyOpen] = useState(false);
  
  // Bedside input states
  const [pa, setPa] = useState('');
  const [fc, setFc] = useState('');
  const [temp, setTemp] = useState('');
  const [sat, setSat] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [generatedReport, setGeneratedReport] = useState('');
  
  // Medication tracking states
  const [selectedMedId, setSelectedMedId] = useState('');
  const [medQty, setMedQty] = useState(1);
  const [usedMeds, setUsedMeds] = useState<{ id: string; name: string; qty: number; isControlled: boolean; controlClass?: string }[]>([]);
  
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pendingMedToAdd, setPendingMedToAdd] = useState<{ id: string; name: string; qty: number; isControlled: boolean; controlClass?: string } | null>(null);
  
  // AI loader
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Photo states
  const [inPhotoPreview, setInPhotoPreview] = useState<string | null>(null);
  const [outPhotoPreview, setOutPhotoPreview] = useState<string | null>(null);
  const [inPhotoFile, setInPhotoFile] = useState<File | null>(null);
  const [outPhotoFile, setOutPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Filters for today's visits
  const todayStr = new Date().toISOString().split('T')[0];
  const tenantVisits = visits.filter(v => v.tenantId === activeTenantId && v.date === todayStr);

  const pendingVisits = tenantVisits.filter(v => v.status === 'agendada');
  const activeOrDoneVisits = tenantVisits.filter(v => v.status === 'em_andamento' || v.status === 'concluida');

  const selectedVisit = visits.find(v => v.id === selectedVisitId);
  const patient = selectedVisit ? patients.find(p => p.id === selectedVisit.patientId) : null;
  const professional = selectedVisit ? professionals.find(p => p.id === selectedVisit.professionalId) : null;

  const openJourney = (visitId: string) => {
    setSelectedVisitId(visitId);
    setRawNotes('');
    setGeneratedReport('');
    setIsJourneyOpen(true);
  };

  const closeJourney = () => {
    setIsJourneyOpen(false);
    setTimeout(() => {
      setSelectedVisitId('');
      setInPhotoPreview(null);
      setOutPhotoPreview(null);
      setInPhotoFile(null);
      setOutPhotoFile(null);
    }, 300);
  };

  const getCurrentPosition = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  };

  const handleCheckIn = async () => {
    if (!selectedVisitId) return;
    if (!inPhotoPreview || !inPhotoFile) {
      alert("A foto do local (check-in) é obrigatória para validar sua presença.");
      return;
    }
    const coords = await getCurrentPosition();
    if (!coords) {
      alert("Não foi possível obter a localização GPS. Verifique as permissões de localização do navegador.");
      return;
    }
    const locationStr = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)} (Confirmado via GPS)`;
    
    let photoUrl = inPhotoPreview;
    if (!isOffline) {
      try {
        setIsUploadingPhoto(true);
        photoUrl = await uploadFileToMinio(inPhotoFile);
      } catch (err: any) {
        alert(`Erro no upload da foto: ${err.message}. O registro usará a foto localmente.`);
      } finally {
        setIsUploadingPhoto(false);
      }
    }

    checkInVisit(selectedVisitId, locationStr, coords, photoUrl);
  };

  const handleAddMed = () => {
    if (!selectedMedId) return;
    const med = medicines.find(m => m.id === selectedMedId);
    if (!med) return;

    const medToAdd = { id: med.id, name: med.name, qty: medQty, isControlled: !!med.isControlled, controlClass: med.controlClass };
    
    if (med.isControlled) {
      setPendingMedToAdd(medToAdd);
      setShowPinModal(true);
    } else {
      setUsedMeds([...usedMeds, medToAdd]);
      setSelectedMedId('');
      setMedQty(1);
    }
  };

  const handleConfirmPin = () => {
    if (pin !== '1234') {
      alert("PIN inválido. Tente '1234'.");
      return;
    }
    if (pendingMedToAdd) {
      setUsedMeds([...usedMeds, pendingMedToAdd]);
      setPendingMedToAdd(null);
    }
    setShowPinModal(false);
    setPin('');
    setSelectedMedId('');
    setMedQty(1);
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

  const handleCheckOut = async () => {
    if (!selectedVisitId) return;

    if (!pa || !fc || !temp || !sat) {
      alert("Para profissionais de saúde, é obrigatório o preenchimento de todos os sinais vitais antes do check-out.");
      return;
    }
    
    if (!outPhotoPreview || !outPhotoFile) {
      alert("A foto de check-out é obrigatória para atestar a finalização.");
      return;
    }

    // Deduct medicines used
    usedMeds.forEach(item => {
      consumeMedicine(item.id, item.qty);
      const visit = visits.find(v => v.id === selectedVisitId);
      if (visit) {
        consumePatientInventory(visit.patientId, item.id, item.qty);
      }
    });

    const coords = await getCurrentPosition();
    if (!coords) {
      alert("Não foi possível obter a localização GPS no check-out. Verifique as permissões de localização do navegador.");
      return;
    }
    const locationStr = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)} (Confirmado via GPS)`;
    
    let medsReport = "";
    if (usedMeds.length > 0) {
      medsReport = "\n\n[Medicamentos Utilizados e Baixados do Estoque]:\n" + usedMeds.map(item => `- ${item.name}: ${item.qty} un`).join("\n");
    }

    const finalReport = (generatedReport || `Evolução Clínica Simplificada:\nSinais Vitais: PA ${pa} mmHg | FC ${fc} bpm | Temp ${temp}°C | Sat O2 ${sat}%.\nNotas: ${rawNotes}`) + medsReport;
    
    let photoUrl = outPhotoPreview;
    if (!isOffline) {
      try {
        setIsUploadingPhoto(true);
        photoUrl = await uploadFileToMinio(outPhotoFile);
      } catch (err: any) {
        alert(`Erro no upload da foto: ${err.message}. O registro usará a foto localmente.`);
      } finally {
        setIsUploadingPhoto(false);
      }
    }
    
    checkOutVisit(selectedVisitId, locationStr, finalReport, { pa, fc, temp, sat }, rawNotes, usedMeds, coords, photoUrl);
    
    // Clear bedside states
    setRawNotes('');
    setGeneratedReport('');
    setUsedMeds([]);
    setSelectedMedId('');
    
    // Automatically close journey modal after a short delay
    setTimeout(() => {
      closeJourney();
    }, 1500);
  };

  React.useEffect(() => {
    const handleOnline = () => setOfflineMode(false);
    const handleOffline = () => setOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) setOfflineMode(true);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOfflineMode]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, type: 'in' | 'out') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'in') setInPhotoFile(file);
      else setOutPhotoFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'in') setInPhotoPreview(reader.result as string);
        else setOutPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Painel de Campo (Check-ins & Rotas)</h2>
        <p className="text-gray-500 text-sm mt-1">Torre de controle visual: acompanhe a localização e o status dos profissionais de saúde em atendimento domiciliar.</p>
      </div>

      {/* Gerenciador Offline */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isOffline 
          ? 'bg-amber-50/70 border-amber-200 shadow-sm' 
          : 'bg-white border-gray-200 shadow-soft'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${isOffline ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
              {isOffline ? <WifiOff className="w-5 h-5 animate-pulse" /> : <Wifi className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Status de Conexão Móvel</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                  isOffline ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-green-100 text-green-800'
                }`}>
                  ● {isOffline ? 'Offline' : 'Online'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 sm:line-clamp-none">
                {isOffline ? 'Sem conexão. Os registros ficam na fila local e serão sincronizados automaticamente.' : 'Sincronização em tempo real de prontuários ativos.'}
              </p>
              {offlineSyncQueue.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-800 font-bold bg-amber-100/50 border border-amber-200/60 px-2 py-0.5 rounded-lg w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  <span>{offlineSyncQueue.length} aguardando sincronização</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-t lg:border-t-0 border-gray-200 lg:border-none pt-3 lg:pt-0">
            <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
              <span className="text-[9px] font-bold text-gray-500 uppercase">Forçar Modo Offline:</span>
              <button
                type="button"
                onClick={() => setOfflineMode(!isOffline)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isOffline ? 'bg-amber-400' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isOffline ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {offlineSyncQueue.length > 0 && (
              <div className="flex items-center gap-2">
                {!isOffline ? (
                  <button onClick={() => syncOfflineData()} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] rounded-xl shadow-md transition-all flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin" /><span>Sincronizar</span>
                  </button>
                ) : (
                  <span className="text-[9px] text-amber-700 font-semibold italic bg-amber-50 px-2 py-1 rounded">Reconecte para sincronizar</span>
                )}
                <button onClick={() => clearOfflineQueue()} className="px-3 py-1.5 bg-white hover:bg-red-50 hover:text-red-600 text-gray-500 font-bold text-[10px] rounded-xl border border-gray-200 transition-all">Limpar</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAPA DE MONITORAMENTO */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-soft overflow-hidden relative">
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur px-3 py-2 rounded-xl border border-gray-200 shadow-sm text-xs font-bold text-gray-700 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-green-600" /> Monitoramento GPS em Tempo Real
        </div>
        
        {/* Fundo SVG/Grid imitando mapa */}
        <div className="h-72 w-full bg-[#f8fafc] relative flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(#16A34A 2px, transparent 2px)', backgroundSize: '30px 30px' }} />
          
          {tenantVisits.map((v, i) => {
            const top = 15 + ((i * 37) % 70) + "%";
            const left = 10 + ((i * 41) % 80) + "%";
            const isPending = v.status === 'agendada';
            const isOngoing = v.status === 'em_andamento';
            const isDone = v.status === 'concluida';
            
            const prof = professionals.find(p => p.id === v.professionalId);

            return (
              <div 
                key={v.id} 
                className="absolute flex flex-col items-center cursor-pointer transition-transform hover:scale-110 group z-20" 
                style={{ top, left }} 
                onClick={() => openJourney(v.id)}
              >
                <div className="relative">
                  <div className={`p-1.5 rounded-full shadow-md text-white ${isPending ? 'bg-amber-400' : isDone ? 'bg-gray-400' : 'bg-green-600'} border-2 border-white relative z-10`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  {isOngoing && <span className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75 z-0" />}
                </div>
                {/* Tooltip on hover map pin */}
                <div className="absolute top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 shadow-lg px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-800 whitespace-nowrap z-30 pointer-events-none">
                  {prof?.name}
                  <span className="block text-gray-500 font-normal">{isPending ? 'Aguardando Chegada' : isOngoing ? 'Em Atendimento' : 'Concluído'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LISTAS DUAL COLUMN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Coluna: PENDENTES */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-soft">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <h3 className="font-bold text-gray-900 text-lg">Check-ins Pendentes ({pendingVisits.length})</h3>
          </div>
          
          <div className="space-y-3">
            {pendingVisits.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">Nenhuma visita pendente.</div>
            ) : (
              pendingVisits.map(v => {
                const pat = patients.find(p => p.id === v.patientId);
                const prof = professionals.find(p => p.id === v.professionalId);
                return (
                  <div 
                    key={v.id} 
                    onClick={() => openJourney(v.id)}
                    className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl cursor-pointer transition-all active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 border border-amber-200">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-gray-900 block">{pat?.name}</span>
                        <span className="text-xs text-gray-500 font-medium">{prof?.name} ({prof?.specialty})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md">AGUARDANDO</span>
                      <span className="text-xs text-gray-400 block mt-1">{v.timeStart}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna: REALIZADOS / ANDAMENTO */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-soft">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <h3 className="font-bold text-gray-900 text-lg">Em Andamento & Concluídos ({activeOrDoneVisits.length})</h3>
          </div>
          
          <div className="space-y-3">
            {activeOrDoneVisits.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">Nenhum atendimento iniciado.</div>
            ) : (
              activeOrDoneVisits.map(v => {
                const pat = patients.find(p => p.id === v.patientId);
                const prof = professionals.find(p => p.id === v.professionalId);
                const isOngoing = v.status === 'em_andamento';
                return (
                  <div 
                    key={v.id} 
                    onClick={() => openJourney(v.id)}
                    className="flex items-center justify-between p-3.5 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm rounded-xl cursor-pointer transition-all active:scale-[0.98] group relative overflow-hidden"
                  >
                    {isOngoing && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />}
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${isOngoing ? 'bg-green-100 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {isOngoing ? <Activity className="w-5 h-5 animate-pulse" /> : <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-gray-900 block">{pat?.name}</span>
                        <span className="text-xs text-gray-500 font-medium">{prof?.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {isOngoing ? (
                        <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-md">EM CAMPO</span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">CONCLUÍDO</span>
                      )}
                      <span className="text-[10px] text-gray-400 block mt-1">Início: {v.checkInTime}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* SIMULATION MODAL (Jornada Guiada) */}
      {isJourneyOpen && selectedVisit && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[95vh] overflow-y-auto shadow-2xl relative flex flex-col">
            
            <button 
              onClick={closeJourney} 
              className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="p-8 pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">Jornada do Profissional</h2>
              <p className="text-gray-500 text-sm mt-1">Preencha as etapas exigidas para registrar o atendimento no prontuário.</p>
            </div>

            <div className="p-8 pt-6 flex-1 space-y-8">
              
              {/* STEP 1: CHECK-IN */}
              <div className={`p-6 rounded-2xl border-2 transition-all duration-500 ${
                selectedVisit.status === 'agendada' 
                  ? 'border-amber-400 bg-amber-50/30 ring-4 ring-amber-100' 
                  : 'border-green-500 bg-green-50/20 opacity-80'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      selectedVisit.status === 'agendada' ? 'bg-amber-400 text-white shadow-md' : 'bg-green-500 text-white'
                    }`}>
                      {selectedVisit.status === 'agendada' ? <MapPin className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-gray-900">Passo 1: Confirmação de Chegada</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Validação GPS obrigatória no domicílio do paciente.</p>
                    </div>
                  </div>
                  {selectedVisit.status === 'agendada' ? (
                    <div className="flex flex-col gap-3">
                      {!inPhotoPreview ? (
                        <label className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 flex items-center justify-center gap-2 transition-all">
                          <Camera className="w-4 h-4" /> Tirar Foto (Local)
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoCapture(e, 'in')} />
                        </label>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <img src={inPhotoPreview} alt="Check-in" className="w-24 h-24 object-cover rounded-xl border border-gray-300 shadow-sm" />
                          <button onClick={() => setInPhotoPreview(null)} className="text-[10px] text-red-500 font-bold underline">Refazer Foto</button>
                        </div>
                      )}
                      
                      <button 
                        onClick={handleCheckIn} 
                        disabled={isUploadingPhoto}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                      >
                        {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />} 
                        {isUploadingPhoto ? 'Enviando Foto...' : 'Bater Ponto (GPS)'}
                      </button>
                    </div>
                  ) : (
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1.5 text-green-700 font-bold text-sm bg-green-100 px-4 py-2 rounded-xl">
                          <CheckCircle2 className="w-5 h-5"/> Check-in Realizado
                        </div>
                        {selectedVisit.checkInPhoto && (
                          <img src={selectedVisit.checkInPhoto} alt="Check-in" className="w-12 h-12 object-cover rounded-lg border border-green-200" />
                        )}
                        <span className="text-[10px] text-gray-400 font-medium">{selectedVisit.checkInTime}</span>
                      </div>
                  )}
                </div>
              </div>

              {/* STEP 2: EVOLUÇÃO E SINAIS VITAIS */}
              <div className={`p-6 rounded-2xl border-2 transition-all duration-500 relative overflow-hidden ${
                selectedVisit.status === 'agendada' 
                  ? 'border-gray-200 bg-gray-50' 
                  : selectedVisit.status === 'em_andamento'
                    ? 'border-green-500 bg-white ring-4 ring-green-100'
                    : 'border-green-500 bg-green-50/20 opacity-80'
              }`}>
                {/* Bloqueio Visual */}
                {selectedVisit.status === 'agendada' && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-gray-500">
                    <Lock className="w-8 h-8 mb-2" />
                    <span className="font-bold text-sm">Bloqueado</span>
                    <span className="text-xs">Faça o check-in primeiro para liberar o prontuário.</span>
                  </div>
                )}

                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    selectedVisit.status === 'agendada' ? 'bg-gray-200 text-gray-400' : selectedVisit.status === 'concluida' ? 'bg-green-500 text-white' : 'bg-green-600 text-white shadow-md'
                  }`}>
                    {selectedVisit.status === 'agendada' ? <Lock className="w-6 h-6" /> : selectedVisit.status === 'concluida' ? <CheckCircle2 className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-gray-900">Passo 2: Evolução Médica</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Sinais vitais, anotações e inteligência artificial.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Bedside Vital Signs Input */}
                  <div>
                    <h5 className="font-bold text-xs text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-green-500" /> Sinais Vitais (Obrigatórios)
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Pressão (PA)</label>
                        <div className="flex items-center gap-1"><input type="text" value={pa} onChange={(e) => setPa(e.target.value)} disabled={selectedVisit.status !== 'em_andamento'} className="bg-transparent font-bold text-sm text-gray-900 w-14 outline-none" /><span className="text-[10px] text-gray-400">mmHg</span></div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Freq. (FC)</label>
                        <div className="flex items-center gap-1"><Heart className="w-4 h-4 text-rose-500 fill-rose-500" /><input type="text" value={fc} onChange={(e) => setFc(e.target.value)} disabled={selectedVisit.status !== 'em_andamento'} className="bg-transparent font-bold text-sm text-gray-900 w-10 outline-none" /><span className="text-[10px] text-gray-400">bpm</span></div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Temp.</label>
                        <div className="flex items-center gap-1"><Thermometer className="w-4 h-4 text-amber-500" /><input type="text" value={temp} onChange={(e) => setTemp(e.target.value)} disabled={selectedVisit.status !== 'em_andamento'} className="bg-transparent font-bold text-sm text-gray-900 w-10 outline-none" /><span className="text-[10px] text-gray-400">°C</span></div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Sat. O2</label>
                        <div className="flex items-center gap-1"><input type="text" value={sat} onChange={(e) => setSat(e.target.value)} disabled={selectedVisit.status !== 'em_andamento'} className="bg-transparent font-bold text-sm text-gray-900 w-10 outline-none" /><span className="text-[10px] text-gray-400">% O2</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Bedside raw notes */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">Evolução Bruta</label>
                    <textarea required rows={3} placeholder="Descreva os achados clínicos e a conduta..." value={rawNotes} onChange={(e) => setRawNotes(e.target.value)} disabled={selectedVisit.status !== 'em_andamento'} className="w-full bg-white border border-gray-200 rounded-xl text-xs p-3 text-gray-800 outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600" />
                  </div>

                  {/* Administração de Medicamentos */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-blue-500" /> Medicamentos Utilizados
                    </label>
                    <div className="flex gap-2">
                      <select 
                        value={selectedMedId} 
                        onChange={(e) => setSelectedMedId(e.target.value)}
                        disabled={selectedVisit.status !== 'em_andamento'}
                        className="flex-1 bg-white border border-gray-200 rounded-xl text-xs p-3 text-gray-800 outline-none"
                      >
                        <option value="">Selecione um medicamento...</option>
                        {medicines.filter(m => m.tenantId === activeTenantId && m.quantity > 0).map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.quantity} em estoque) {m.isControlled ? `- CONTROLADO (${m.controlClass})` : ''}</option>
                        ))}
                      </select>
                      <input 
                        type="number" 
                        min="1" 
                        value={medQty} 
                        onChange={(e) => setMedQty(parseInt(e.target.value) || 1)}
                        disabled={selectedVisit.status !== 'em_andamento'}
                        className="w-16 bg-white border border-gray-200 rounded-xl text-xs p-3 text-center text-gray-800 outline-none"
                      />
                      <button 
                        type="button"
                        onClick={handleAddMed}
                        disabled={selectedVisit.status !== 'em_andamento' || !selectedMedId}
                        className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                    {usedMeds.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {usedMeds.map((um, idx) => (
                          <li key={idx} className="text-xs bg-gray-50 border border-gray-200 p-2 rounded-lg flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-gray-700">{um.name}</span>
                              {um.isControlled && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] uppercase font-bold">Autenticado</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500">{um.qty} un</span>
                              {selectedVisit.status === 'em_andamento' && (
                                <button onClick={() => setUsedMeds(usedMeds.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* AI generation button & Output */}
                  {selectedVisit.status === 'em_andamento' && (
                    <div className="border-t border-gray-100 pt-4 space-y-4">
                      <button type="button" onClick={handleGenerateAiReport} disabled={isAiLoading || !rawNotes} className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        <Sparkles className="w-4 h-4 fill-white animate-pulse" /> {isAiLoading ? 'Formatando Prontuário...' : 'Corrigir e Formatar com IA'}
                      </button>

                      {isAiLoading && (
                        <div className="p-4 flex justify-center"><div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" /></div>
                      )}

                      {generatedReport && (
                        <div className="p-5 bg-green-50 border border-green-200 rounded-2xl animate-fade-in">
                          <h4 className="font-bold text-xs text-green-800 flex items-center gap-1 mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-green-600 fill-green-600" /> Prontuário Pronto
                          </h4>
                          <textarea rows={5} value={generatedReport} onChange={(e) => setGeneratedReport(e.target.value)} className="w-full bg-white border border-green-200 rounded-xl text-xs p-4 text-gray-700 font-mono outline-none focus:border-green-500" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mostra relatório se concluído */}
                  {selectedVisit.status === 'concluida' && selectedVisit.report && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-600 whitespace-pre-wrap font-mono">
                      {selectedVisit.report}
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 3: CHECK-OUT */}
              <div className={`p-6 rounded-2xl border-2 transition-all duration-500 relative overflow-hidden ${
                selectedVisit.status !== 'em_andamento' && selectedVisit.status !== 'concluida'
                  ? 'border-gray-200 bg-gray-50' 
                  : selectedVisit.status === 'concluida'
                    ? 'border-gray-300 bg-gray-100 opacity-80'
                    : 'border-green-600 bg-white ring-4 ring-green-100 shadow-lg'
              }`}>
                {/* Bloqueio Visual */}
                {(selectedVisit.status === 'agendada') && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20" />
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                      selectedVisit.status === 'concluida' ? 'bg-gray-400 text-white' : 'bg-gray-800 text-white shadow-md'
                    }`}>
                      {selectedVisit.status === 'concluida' ? <CheckCircle2 className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-gray-900">Passo 3: Finalização</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Obrigatório vitais preenchidos.</p>
                    </div>
                  </div>
                  
                  {selectedVisit.status === 'em_andamento' ? (
                    <div className="flex flex-col gap-3">
                      {!outPhotoPreview ? (
                        <label className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 flex items-center justify-center gap-2 transition-all">
                          <Camera className="w-4 h-4" /> Tirar Foto (Saída)
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoCapture(e, 'out')} />
                        </label>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <img src={outPhotoPreview} alt="Check-out" className="w-24 h-24 object-cover rounded-xl border border-gray-300 shadow-sm" />
                          <button onClick={() => setOutPhotoPreview(null)} className="text-[10px] text-red-500 font-bold underline">Refazer Foto</button>
                        </div>
                      )}
                      
                      <button 
                        onClick={handleCheckOut} 
                        disabled={isUploadingPhoto}
                        className="px-6 py-3 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                      >
                        {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assinar e Sair'} 
                        {!isUploadingPhoto && <ArrowRight className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : selectedVisit.status === 'concluida' ? (
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5 text-gray-600 font-bold text-sm bg-gray-200 px-4 py-2 rounded-xl">
                        <CheckCircle2 className="w-5 h-5"/> Check-out Salvo
                      </div>
                      {selectedVisit.checkOutPhoto && (
                        <img src={selectedVisit.checkOutPhoto} alt="Check-out" className="w-12 h-12 object-cover rounded-lg border border-gray-300" />
                      )}
                      <span className="text-[10px] text-gray-400 font-medium">{selectedVisit.checkOutTime}</span>
                    </div>
                  ) : null}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="p-6 text-center border-b border-gray-100 bg-red-50">
              <Lock className="w-12 h-12 text-red-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-red-800">Medicamento Controlado</h3>
              <p className="text-xs text-red-600 mt-1">Este medicamento exige autenticação dupla (Portaria 344/98).</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 font-semibold mb-4 text-center">
                Autentique-se para administrar:<br/>
                <span className="text-gray-900 font-bold">{pendingMedToAdd?.name}</span> ({pendingMedToAdd?.qty} un)
              </p>
              <input
                type="password"
                placeholder="Insira seu PIN numérico"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full text-center tracking-[0.5em] font-mono text-xl bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 mb-4"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowPinModal(false); setPendingMedToAdd(null); setPin(''); }} 
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmPin} 
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-colors"
                >
                  Assinar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Oficiais (Apenas informativo no rodapé agora) */}
      <div className="mt-8 bg-gray-900 text-white rounded-2xl p-4 font-mono text-[10px] space-y-1.5 h-32 overflow-y-auto shadow-inner">
        <span className="text-gray-400 block mb-2">// Telemetria do Aplicativo de Campo (Sistema)</span>
        {offlineLogs.slice(-6).map((log, i) => {
          let colorClass = "text-gray-300";
          if (log.includes("[SISTEMA]")) colorClass = "text-cyan-400";
          else if (log.includes("[OFFLINE]")) colorClass = "text-amber-400";
          else if (log.includes("[SYNC]")) colorClass = "text-emerald-400";
          else if (log.includes("✓")) colorClass = "text-green-400 font-semibold";
          return <p key={i} className={colorClass}>► {log}</p>;
        })}
      </div>
      
    </div>
  );
}
