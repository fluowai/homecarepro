import React from 'react';
import { 
  Users, 
  Calendar, 
  UserCheck, 
  ShieldAlert, 
  ArrowUpRight, 
  Clock, 
  Activity, 
  ClipboardCheck, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useHomeCareStore } from '../store';
import AITriageWidget from './AITriageWidget';

interface DashboardViewProps {
  setView: (view: string) => void;
  searchQuery: string;
}

export default function DashboardView({ setView, searchQuery }: DashboardViewProps) {
  const { patients, professionals, visits, activeTenantId, leads, getCalculatedAlerts } = useHomeCareStore();

  // Filter based on active unit (Tenant)
  const tenantPatients = patients.filter(p => p.tenantId === activeTenantId);
  const tenantProfessionals = professionals.filter(p => p.tenantId === activeTenantId);
  const tenantVisits = visits.filter(v => v.tenantId === activeTenantId);
  const tenantLeads = leads.filter(l => l.tenantId === activeTenantId);

  // Today's date string
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculations
  const activePatientsCount = tenantPatients.filter(p => p.status === 'active').length;
  const todayVisits = tenantVisits.filter(v => v.date === todayStr);
  const completedVisitsTodayCount = todayVisits.filter(v => v.status === 'concluida').length;
  const inProgressVisitsCount = todayVisits.filter(v => v.status === 'em_andamento').length;
  
  const activeProfessionalsCount = tenantProfessionals.filter(p => p.status === 'active' || p.status === 'busy').length;

  // Smart clinical risk alerts (simulated or direct analytical checks)
  const riskAlerts: { id: string; patient: string; severity: string; reason: string }[] = [];
  
  // 1. Check patients with no visits in current data
  tenantPatients.forEach(p => {
    const patVisits = tenantVisits.filter(v => v.patientId === p.id);
    if (patVisits.length === 0) {
      riskAlerts.push({
        id: `alert-1-${p.id}`,
        patient: p.name,
        severity: 'alto',
        reason: 'Paciente cadastrado sem nenhuma visita clínica programada.'
      });
    }
  });

  // 2. Traqueostomizados com alergias críticas
  tenantPatients.forEach(p => {
    if (p.diagnostic.toLowerCase().includes('traqueosto') && p.allergies.includes('Látex')) {
      riskAlerts.push({
        id: `alert-2-${p.id}`,
        patient: p.name,
        severity: 'moderado',
        reason: 'Paciente traqueostomizado(a) com alergia gravíssima a LÁTEX. Verificar materiais de proteção utilizados.'
      });
    }
  });

  // 3. Append dynamic calculated alerts (Low stock, missing visits, expired drugs)
  if (getCalculatedAlerts) {
    const calculatedAlerts = getCalculatedAlerts();
    calculatedAlerts.forEach(a => {
      riskAlerts.push({
        id: a.id,
        patient: a.title,
        severity: a.severity === 'critical' ? 'alto' : 'moderado',
        reason: a.description
      });
    });
  }

  // Render stats data cards
  const stats = [
    { 
      label: 'Pacientes Ativos', 
      value: activePatientsCount, 
      desc: 'Em acompanhamento domiciliar', 
      icon: Users, 
      color: 'bg-blue-500 text-blue-500', 
      bgColor: 'bg-blue-50' 
    },
    { 
      label: 'Visitas Hoje', 
      value: todayVisits.length, 
      desc: `${completedVisitsTodayCount} concluídas • ${inProgressVisitsCount} em andamento`, 
      icon: Calendar, 
      color: 'bg-emerald-500 text-emerald-500', 
      bgColor: 'bg-emerald-50' 
    },
    { 
      label: 'Profissionais em Campo', 
      value: activeProfessionalsCount, 
      desc: `Total de ${tenantProfessionals.length} cadastrados`, 
      icon: UserCheck, 
      color: 'bg-amber-500 text-amber-500', 
      bgColor: 'bg-amber-50' 
    },
    { 
      label: 'Alertas Inteligentes', 
      value: riskAlerts.length, 
      desc: 'Detectados automaticamente pela IA', 
      icon: ShieldAlert, 
      color: 'bg-rose-500 text-rose-500', 
      bgColor: 'bg-rose-50' 
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Intro and quick actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Painel Operacional Geral</h2>
          <p className="text-gray-500 text-sm mt-1">Status em tempo real das atividades operacionais e reabilitação de campo.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => setView('checkin')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Clock className="w-4 h-4" />
            <span>Check-in Rápido</span>
          </button>
          <button
            onClick={() => setView('patients')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-lg transition-all"
          >
            <span>Novo Paciente</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <span className="text-sm text-gray-500 font-medium">Pacientes Ativos</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">{activePatientsCount}</span>
            <span className="text-xs text-green-600 font-bold px-1.5 py-0.5 bg-green-50 rounded-md">+4.5%</span>
          </div>
          <span className="text-gray-400 text-xs mt-2">Em acompanhamento domiciliar</span>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <span className="text-sm text-gray-500 font-medium">Visitas de Hoje</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">{todayVisits.length}</span>
            <span className="text-xs text-blue-600 font-medium px-1.5 py-0.5 bg-blue-50 rounded-md">
              {completedVisitsTodayCount} concluídas
            </span>
          </div>
          <span className="text-gray-400 text-xs mt-2">{inProgressVisitsCount} em andamento campo</span>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <span className="text-sm text-gray-500 font-medium">Em Campo</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-green-600">{activeProfessionalsCount}</span>
            <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded-md">
              de {tenantProfessionals.length} profissionais
            </span>
          </div>
          <span className="text-gray-400 text-xs mt-2">Profissionais ativos no momento</span>
        </div>

        {/* Card 4 (Solid clean accent to highlight Alerts) */}
        <div 
          onClick={() => setView('alerts')}
          className="bg-blue-600 p-6 rounded-2xl shadow-sm border border-blue-700 flex flex-col text-white cursor-pointer hover:bg-blue-700/90 transition-all active:scale-95"
        >
          <span className="text-sm text-blue-100 font-medium">Alertas Pendentes</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold">{riskAlerts.length.toString().padStart(2, '0')}</span>
            <span className="text-xs text-blue-200 font-medium px-1.5 py-0.5 bg-blue-700/55 rounded-md">
              Ação requerida
            </span>
          </div>
          <span className="text-blue-100 text-xs mt-2">Detectados automaticamente</span>
        </div>
      </div>

      {/* AI Triage Component */}
      <AITriageWidget setView={setView} />

      {/* Main Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Operations & Specialty Graphs */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Operations performance SVG Graph */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Evolução Mensal de Visitas</h3>
                <p className="text-gray-400 text-xs">Total de atendimentos concluídos nos últimos 6 meses</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-gray-600">Presencial</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-gray-600">Reabilitação</span>
                </div>
              </div>
            </div>

            {/* Custom Responsive SVG Chart */}
            <div className="h-60 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
                {/* Horizontal grid lines */}
                <line x1="40" y1="40" x2="580" y2="40" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1="90" x2="580" y2="90" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1="140" x2="580" y2="140" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1="190" x2="580" y2="190" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4 4" />

                {/* Shaded Area underneath the line */}
                <path
                  d="M 60 200 L 140 130 L 240 160 L 340 100 L 440 70 L 540 50 L 540 200 Z"
                  fill="url(#blue-gradient)"
                  opacity="0.12"
                />

                {/* Shaded Area for emerald line */}
                <path
                  d="M 60 210 L 140 180 L 240 150 L 340 120 L 440 110 L 540 80 L 540 200 Z"
                  fill="url(#emerald-gradient)"
                  opacity="0.08"
                />

                {/* SVG Gradients */}
                <defs>
                  <linearGradient id="blue-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#FFFFFF" />
                  </linearGradient>
                  <linearGradient id="emerald-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#FFFFFF" />
                  </linearGradient>
                </defs>

                {/* Primary Trend Line (Blue) */}
                <path
                  d="M 60 200 Q 140 130 240 160 T 340 100 T 440 70 T 540 50"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Secondary Trend Line (Emerald) */}
                <path
                  d="M 60 210 Q 140 180 240 150 T 340 120 T 440 110 T 540 80"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Interactive Dots */}
                <circle cx="60" cy="200" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="140" cy="130" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="240" cy="160" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="340" cy="100" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="440" cy="70" r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="540" cy="50" r="5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2.5" />

                {/* X Axis Labels */}
                <text x="60" y="225" fill="#9CA3AF" fontSize="10" textAnchor="middle" fontWeight="bold">Jan</text>
                <text x="140" y="225" fill="#9CA3AF" fontSize="10" textAnchor="middle" fontWeight="bold">Fev</text>
                <text x="240" y="225" fill="#9CA3AF" fontSize="10" textAnchor="middle" fontWeight="bold">Mar</text>
                <text x="340" y="225" fill="#9CA3AF" fontSize="10" textAnchor="middle" fontWeight="bold">Abr</text>
                <text x="440" y="225" fill="#9CA3AF" fontSize="10" textAnchor="middle" fontWeight="bold">Mai</text>
                <text x="540" y="225" fill="#9CA3AF" fontSize="10" textAnchor="middle" fontWeight="bold">Jun</text>
              </svg>
            </div>
          </div>

          {/* Specialty grid distributions */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-800 text-base">Alocação de Especialidades</h3>
              <p className="text-gray-400 text-xs mb-4">Equipe multidisciplinar em operação ativa</p>
              
              <div className="space-y-3">
                {[
                  { name: 'Enfermagem', count: tenantProfessionals.filter(p => p.specialty === 'Enfermeiro' || p.specialty === 'Técnico de Enfermagem').length, pct: '50%', color: 'bg-blue-600' },
                  { name: 'Fisioterapia', count: tenantProfessionals.filter(p => p.specialty === 'Fisioterapeuta').length, pct: '30%', color: 'bg-emerald-500' },
                  { name: 'Medicina', count: tenantProfessionals.filter(p => p.specialty === 'Médico').length, pct: '15%', color: 'bg-indigo-600' },
                  { name: 'Outros', count: 1, pct: '5%', color: 'bg-purple-500' },
                ].map((spec, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                      <span>{spec.name}</span>
                      <span>{spec.count} profissionais ({spec.pct})</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className={`${spec.color} h-full`} style={{ width: spec.pct }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-l border-gray-100 pl-0 md:pl-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Atividade Financeira</h3>
                <p className="text-gray-400 text-xs mb-4">Faturamento estimado das escalas em andamento</p>
                
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/60">
                  <span className="text-xs text-gray-400 font-medium">Faturamento Estimado das Escalas</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-800">
                      R$ {tenantVisits.reduce((acc, curr) => acc + curr.value, 0).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      +12.4% <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-1">Comparado ao mesmo período do mês anterior</span>
                </div>
              </div>

              <button 
                onClick={() => setView('finance')}
                className="w-full py-2.5 bg-gray-50 text-gray-600 hover:bg-gray-100 font-semibold text-xs rounded-lg transition-colors border border-gray-200 flex items-center justify-center gap-1 mt-4"
              >
                <span>Acessar Conciliação Financeira</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Right Side: Smart Alerts AI & Quick Visit Feed */}
        <div className="space-y-8">
          {/* AI Insight (Clean minimalist light gradient style) */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="text-indigo-800 font-bold text-sm uppercase tracking-wider">Resumo Inteligente</h3>
            </div>
            <p className="text-sm text-indigo-700 leading-relaxed">
              &quot;Francisco Souza apresentou melhora na saturação. Sugerimos antecipar a fisioterapia respiratória de amanhã para o período da manhã.&quot;
            </p>
            <button className="mt-4 w-full bg-white text-indigo-600 text-xs font-bold py-2 rounded-lg border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
              Aplicar sugestão
            </button>
          </div>

          {/* Smart Alerts Tray */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-800">Alertas Clínicos Ativos</h3>
                <span className="text-[10px] text-gray-400 font-semibold tracking-wide uppercase">Vigilância IA</span>
              </div>
            </div>

            {riskAlerts.length > 0 ? (
              <div className="space-y-3">
                {riskAlerts.map((alert, i) => (
                  <div key={i} className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-800 truncate max-w-[160px]">{alert.patient}</span>
                      <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                        alert.severity === 'alto' 
                          ? 'bg-red-50 text-red-600 border border-red-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        Risco {alert.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">{alert.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 text-xs">
                Nenhum sinal de risco crítico detectado pela triagem clínica.
              </div>
            )}
          </div>

          {/* Today's Visitas Queue */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[340px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-base">Escala de Hoje ({todayVisits.length})</h3>
              <button 
                onClick={() => setView('schedules')}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                Ver tudo
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {todayVisits.length > 0 ? (
                todayVisits.map((visit) => {
                  const pat = patients.find(p => p.id === visit.patientId);
                  const prof = professionals.find(p => p.id === visit.professionalId);
                  
                  return (
                    <div key={visit.id} className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors flex justify-between items-center bg-white">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-gray-800 truncate block">
                            {pat?.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 truncate block">
                          Profissional: {prof?.name || 'Não alocado'} • <strong className="text-blue-600 font-medium">{prof?.specialty}</strong>
                        </span>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 font-medium">
                          <Clock className="w-3 h-3" />
                          <span>{visit.timeStart} - {visit.timeEnd}</span>
                        </div>
                      </div>
                      <div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          visit.status === 'concluida' 
                            ? 'bg-green-50 text-green-700 border border-green-100' 
                            : visit.status === 'em_andamento'
                            ? 'bg-blue-50 text-blue-700 animate-pulse'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {visit.status === 'concluida' && 'Concluída'}
                          {visit.status === 'em_andamento' && 'Em Campo'}
                          {visit.status === 'agendada' && 'Pendente'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <ClipboardCheck className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-xs text-gray-400">Nenhuma visita programada para hoje.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
