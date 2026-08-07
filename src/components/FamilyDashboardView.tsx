import React, { useState } from 'react';
import { Calendar, Activity, Pill, MessageCircle, Clock, CheckCircle2, ChevronRight, Phone } from 'lucide-react';
import { useHomeCareStore } from '../store';

export default function FamilyDashboardView() {
  const { patients, visits, activeTenantId, currentUserRole } = useHomeCareStore();
  const todayStr = new Date().toISOString().split('T')[0];
  
  // In a real scenario, the backend would filter by the logged-in patient's ID.
  // For demo, we just pick the first patient.
  const myPatient = patients.find(p => p.tenantId === activeTenantId) || patients[0];
  const myVisits = visits.filter(v => v.patientId === myPatient?.id && v.tenantId === activeTenantId);
  const todayVisit = myVisits.find(v => v.date === todayStr);

  if (!myPatient) {
    return <div className="p-8 text-center text-gray-500">Nenhum dado encontrado para sua conta.</div>;
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-lg mx-auto">
      {/* Header Profile */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <HeartbeatIcon className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <img src={myPatient.avatar} alt={myPatient.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400" />
          <div>
            <h2 className="text-xl font-bold leading-tight">{myPatient.name}</h2>
            <p className="text-indigo-200 text-sm">{myPatient.diagnostic}</p>
          </div>
        </div>
      </div>

      {/* Today's Status */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" /> Atendimento de Hoje
        </h3>
        
        {todayVisit ? (
          <div className="flex flex-col gap-4">
            <div className={`p-4 rounded-2xl flex items-center justify-between ${todayVisit.status === 'concluida' ? 'bg-green-50 border border-green-100' : todayVisit.status === 'em_andamento' ? 'bg-indigo-50 border border-indigo-100' : 'bg-orange-50 border border-orange-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${todayVisit.status === 'concluida' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {todayVisit.status === 'concluida' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {todayVisit.status === 'concluida' ? 'Visita Finalizada' : todayVisit.status === 'em_andamento' ? 'Profissional no Local' : 'Agendado para hoje'}
                  </p>
                  <p className="text-xs text-gray-500">{todayVisit.timeStart} às {todayVisit.timeEnd}</p>
                </div>
              </div>
            </div>
            
            {todayVisit.report && (
              <div className="bg-gray-50 p-4 rounded-2xl text-sm text-gray-700 border border-gray-100">
                <span className="font-bold block mb-1">Relatório da visita:</span>
                {todayVisit.report}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">
            Nenhuma visita agendada para hoje.
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors active:scale-95">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
            <Pill className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-gray-700">Medicamentos</span>
        </button>
        <button className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors active:scale-95">
          <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
            <Phone className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-gray-700">Emergência</span>
        </button>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-pink-500" /> Histórico Recente
        </h3>
        <div className="space-y-4">
          {myPatient.timeline.slice(-3).reverse().map(event => (
            <div key={event.id} className="flex gap-4 relative">
              <div className="w-2 bg-gray-100 absolute top-2 bottom-0 left-4 -ml-1 z-0 rounded-full" />
              <div className="relative z-10 w-8 h-8 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="pb-4">
                <p className="text-xs font-semibold text-gray-400 mb-1">{event.date}</p>
                <p className="text-sm font-bold text-gray-900">{event.title}</p>
                <p className="text-sm text-gray-600 mt-1">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeartbeatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
