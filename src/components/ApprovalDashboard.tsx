import React, { useState } from 'react';
import { CheckCircle, XCircle, Search, Clock, MapPin, User, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export function ApprovalDashboard() {
  const [pendingVisits, setPendingVisits] = useState([
    { id: '1', professionalName: 'Ana Clara (Téc. Enf)', patientName: 'João Souza', time: '08:00 - 12:00', location: 'Av. Paulista, 1000', photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120', aiStatus: 'verified' },
    { id: '2', professionalName: 'Carlos Silva (Enfermeiro)', patientName: 'Maria Mendonça', time: '14:00 - 18:00', location: 'Rua Augusta, 500', photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=120', aiStatus: 'warning' }
  ]);

  const handleApprove = (id: string) => {
    setPendingVisits(pendingVisits.filter(v => v.id !== id));
    toast.success('Plantão aprovado! Valor liberado para o profissional.');
  };

  const handleReject = (id: string) => {
    setPendingVisits(pendingVisits.filter(v => v.id !== id));
    toast.error('Plantão rejeitado.');
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Aprovação de Plantões</h1>
          <p className="text-gray-500 mt-1">Valide os check-ins e libere os pagamentos</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">Aguardando Conferência</h2>
        </div>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingVisits.map(visit => (
            <div key={visit.id} className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="relative">
                  <img src={visit.photoUrl} alt="Checkin" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                  {visit.aiStatus === 'verified' && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1 rounded-full border-2 border-white" title="IA Verificada (Rosto compatível)">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                  {visit.aiStatus === 'warning' && (
                    <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-white p-1 rounded-full border-2 border-white" title="Alerta IA (Rosto não reconhecido ou suspeito)">
                      <XCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{visit.professionalName}</h3>
                  <p className="text-sm text-gray-500">Paciente: {visit.patientName}</p>
                  <div className="flex items-center text-xs text-gray-400 mt-2 gap-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {visit.time}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS Registrado</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-auto border-t border-gray-100 pt-4">
                <button 
                  onClick={() => handleReject(visit.id)}
                  className="flex-1 py-2 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition"
                >
                  Recusar
                </button>
                <button 
                  onClick={() => handleApprove(visit.id)}
                  className="flex-1 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
                >
                  Aprovar Plantão
                </button>
              </div>
            </div>
          ))}
          {pendingVisits.length === 0 && (
             <div className="col-span-full py-10 text-center text-gray-500">
               Nenhum plantão aguardando conferência.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
