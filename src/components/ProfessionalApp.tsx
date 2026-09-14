import React, { useState } from 'react';
import { Camera, MapPin, CheckCircle, Wallet, Clock, User, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useHomeCareStore } from '../store';
import { toast } from 'sonner';
import { uploadFileToMinio } from '../lib/upload';
import { findCurrentProfessional, getAssignedPatientIds } from '../lib/professionalContext';

export function ProfessionalApp() {
  const { 
    profile, 
    user, 
    professionals, 
    patients, 
    visits, 
    contracts, 
    activeTenantId,
    checkInVisit 
  } = useHomeCareStore();

  const [activeTab, setActiveTab] = useState<'agenda' | 'finance'>('agenda');
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null);

  const currentProfessional = findCurrentProfessional(professionals, user, profile);
  const assignedPatientIds = getAssignedPatientIds(currentProfessional, visits, contracts);

  // Today string
  const todayStr = new Date().toISOString().split('T')[0];

  // Professional's visits for today
  const profTodayVisits = visits.filter(v => {
    if (v.tenantId !== activeTenantId || v.date !== todayStr) return false;
    const isMyProf = currentProfessional ? v.professionalId === currentProfessional.id : false;
    const isMyPatient = assignedPatientIds ? assignedPatientIds.has(v.patientId) : false;
    return isMyProf || isMyPatient;
  });

  // Financial calculations
  const allProfVisits = visits.filter(v => {
    if (v.tenantId !== activeTenantId) return false;
    return currentProfessional ? v.professionalId === currentProfessional.id : false;
  });

  const availableBalance = allProfVisits
    .filter(v => v.status === 'concluida')
    .reduce((sum, v) => sum + (v.baseValue ?? v.value ?? 0), 0);

  const pendingBalance = allProfVisits
    .filter(v => v.status === 'agendada' || v.status === 'em_andamento')
    .reduce((sum, v) => sum + (v.baseValue ?? v.value ?? 0), 0);

  const handleCheckIn = async (visitId: string) => {
    setIsCheckingIn(visitId);
    
    if (!navigator.geolocation) {
      checkInVisit(visitId, 'Localização manual');
      toast.success('Check-in realizado!');
      setIsCheckingIn(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        checkInVisit(visitId, `Coord: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`, coords);
        toast.success('Check-in realizado com sucesso!');
        setIsCheckingIn(null);
      },
      (error) => {
        checkInVisit(visitId, 'Check-in (sem GPS)');
        toast.success('Check-in registrado!');
        setIsCheckingIn(null);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const requestWithdrawal = () => {
    if (availableBalance <= 0) {
      toast.error('Saldo insuficiente para saque.');
      return;
    }
    toast.success('Solicitação de saque enviada para a gestão!');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20 md:pb-0">
      <div className="bg-green-600 text-white p-6 shadow-md rounded-b-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Olá, {profile?.full_name?.split(' ')[0] || currentProfessional?.name?.split(' ')[0] || 'Profissional'}</h1>
            <p className="text-green-100">Bem-vindo(a) ao seu plantão</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/40">
             {profile?.avatar_url || currentProfessional?.avatar ? (
                <img src={profile?.avatar_url || currentProfessional?.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
             ) : (
                <User className="w-6 h-6 text-white" />
             )}
          </div>
        </div>
      </div>

      <div className="flex p-4 gap-2">
        <button 
          onClick={() => setActiveTab('agenda')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${activeTab === 'agenda' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Minha Agenda ({profTodayVisits.length})
        </button>
        <button 
          onClick={() => setActiveTab('finance')}
          className={`flex-1 py-3 rounded-xl font-medium transition-colors ${activeTab === 'finance' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          Financeiro
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Plantões de Hoje</h2>
            {profTodayVisits.length > 0 ? (
              profTodayVisits.map(visit => {
                const patient = patients.find(p => p.id === visit.patientId);
                const addressStr = patient?.address ? `${patient.address.street}, ${patient.address.number} - ${patient.address.city}` : 'Endereço residencial';

                return (
                  <div key={visit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{patient?.name || 'Paciente'}</h3>
                        <div className="flex items-center text-gray-500 text-sm mt-1 gap-1">
                          <Clock className="w-4 h-4" /> {visit.timeStart} - {visit.timeEnd}
                        </div>
                        <div className="flex items-center text-gray-500 text-sm mt-1 gap-1">
                          <MapPin className="w-4 h-4" /> {addressStr}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        visit.status === 'concluida' ? 'bg-green-100 text-green-700' :
                        visit.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {visit.status === 'concluida' ? 'Concluído' : visit.status === 'em_andamento' ? 'Em Andamento' : 'Agendado'}
                      </span>
                    </div>
                    
                    {visit.status === 'agendada' && (
                      <button 
                        onClick={() => handleCheckIn(visit.id)}
                        disabled={isCheckingIn === visit.id}
                        className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                      >
                        {isCheckingIn === visit.id ? (
                          'Iniciando...'
                        ) : (
                          <>
                            <Camera className="w-5 h-5" /> Fazer Check-in
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
                <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-600">Nenhum plantão agendado para hoje.</p>
                <p className="text-xs text-gray-400 mt-1">Apenas os pacientes e plantões atribuídos a você serão listados aqui.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-6 mt-2">
            <div className="bg-gradient-to-br from-green-600 to-emerald-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
              
              <p className="text-green-100 font-medium mb-1">Saldo Disponível</p>
              <h2 className="text-4xl font-black mb-6">
                R$ {availableBalance.toFixed(2).replace('.', ',')}
              </h2>
              
              <div className="flex justify-between items-center border-t border-white/20 pt-4">
                <div>
                  <p className="text-green-200 text-sm">Lançamentos Futuros</p>
                  <p className="font-bold">R$ {pendingBalance.toFixed(2).replace('.', ',')}</p>
                </div>
                <button 
                  onClick={requestWithdrawal}
                  className="px-5 py-2 bg-white text-green-700 rounded-full font-bold shadow hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Wallet className="w-4 h-4" /> Sacar
                </button>
              </div>
            </div>
            
            <div>
               <h3 className="font-bold text-gray-800 mb-4">Histórico de Plantões Realizados</h3>
               <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm divide-y divide-gray-100">
                  {allProfVisits.filter(v => v.status === 'concluida').length > 0 ? (
                    allProfVisits.filter(v => v.status === 'concluida').slice(0, 10).map(v => {
                      const patient = patients.find(p => p.id === v.patientId);
                      return (
                        <div key={v.id} className="py-3 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{patient?.name || 'Paciente'}</p>
                            <p className="text-xs text-gray-400">{v.date} • {v.timeStart} - {v.timeEnd}</p>
                          </div>
                          <span className="font-bold text-green-700 text-sm">R$ {(v.baseValue ?? v.value ?? 0).toFixed(2).replace('.', ',')}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-gray-400 py-8 text-xs">
                      Nenhum plantão concluído registrado ainda.
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
