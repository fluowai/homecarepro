import React, { useState } from 'react';
import { Camera, MapPin, CheckCircle, Wallet, Clock, User, ChevronRight } from 'lucide-react';
import { useHomeCareStore } from '../store';
import { toast } from 'sonner';
import { uploadFileToMinio } from '../lib/upload';

export function ProfessionalApp() {
  const { profile } = useHomeCareStore();
  const [activeTab, setActiveTab] = useState<'agenda' | 'finance'>('agenda');
  
  // Mock data for UI demonstration
  const [visits, setVisits] = useState([
    { id: '1', patientName: 'Maria Silva', time: '08:00 - 12:00', status: 'pending', location: 'Rua das Flores, 123' },
    { id: '2', patientName: 'João Souza', time: '14:00 - 18:00', status: 'approved', location: 'Av. Paulista, 1000' }
  ]);
  
  const [balance, setBalance] = useState({ available: 850.00, pending: 200.00 });
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null);

  const handleCheckIn = async (visitId: string) => {
    setIsCheckingIn(visitId);
    
    // Simulate getting location
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada no seu navegador.');
      setIsCheckingIn(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        // Here we would normally trigger a camera capture UI, then upload.
        // For demonstration, we simulate the camera capture success.
        toast.success('Localização capturada. Iniciando câmera...');
        
        // Simulating the check-in completion after 2s
        setTimeout(() => {
          setVisits(visits.map(v => v.id === visitId ? { ...v, status: 'waiting_approval' } : v));
          toast.success('Check-in realizado com sucesso! Aguardando aprovação da gestão.');
          setIsCheckingIn(null);
        }, 2000);
      },
      (error) => {
        toast.error('Erro ao capturar localização: ' + error.message);
        setIsCheckingIn(null);
      }
    );
  };

  const requestWithdrawal = () => {
    if (balance.available <= 0) {
      toast.error('Saldo insuficiente para saque.');
      return;
    }
    toast.success('Solicitação de saque enviada para a gestão!');
    setBalance({ ...balance, available: 0 });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20 md:pb-0">
      <div className="bg-green-600 text-white p-6 shadow-md rounded-b-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Olá, {profile?.full_name?.split(' ')[0] || 'Profissional'}</h1>
            <p className="text-green-100">Bem-vindo(a) ao seu plantão</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/40">
             {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
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
          Minha Agenda
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
            {visits.map(visit => (
              <div key={visit.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{visit.patientName}</h3>
                    <div className="flex items-center text-gray-500 text-sm mt-1 gap-1">
                      <Clock className="w-4 h-4" /> {visit.time}
                    </div>
                    <div className="flex items-center text-gray-500 text-sm mt-1 gap-1">
                      <MapPin className="w-4 h-4" /> {visit.location}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    visit.status === 'approved' ? 'bg-green-100 text-green-700' :
                    visit.status === 'waiting_approval' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {visit.status === 'approved' ? 'Aprovado' : visit.status === 'waiting_approval' ? 'Em Análise' : 'Agendado'}
                  </span>
                </div>
                
                {visit.status === 'pending' && (
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
            ))}
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-6 mt-2">
            <div className="bg-gradient-to-br from-green-600 to-emerald-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
              
              <p className="text-green-100 font-medium mb-1">Saldo Disponível</p>
              <h2 className="text-4xl font-black mb-6">
                R$ {balance.available.toFixed(2).replace('.', ',')}
              </h2>
              
              <div className="flex justify-between items-center border-t border-white/20 pt-4">
                <div>
                  <p className="text-green-200 text-sm">Lançamentos Futuros</p>
                  <p className="font-bold">R$ {balance.pending.toFixed(2).replace('.', ',')}</p>
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
               <h3 className="font-bold text-gray-800 mb-4">Histórico de Saques</h3>
               <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center text-gray-500 py-10 shadow-sm">
                  Nenhum saque realizado recentemente.
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
