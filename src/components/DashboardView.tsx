import React from 'react';
import { 
  Users, 
  Calendar, 
  UserCheck, 
  ShieldAlert, 
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

  // Clinical risk alerts calculated from real data
  const riskAlerts: { id: string; patient: string; severity: string; reason: string }[] = [];

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

  tenantPatients.forEach(p => {
    if (p.diagnostic.toLowerCase().includes('traqueosto') && p.allergies.includes('Látex')) {
      riskAlerts.push({
        id: `alert-2-${p.id}`,
        patient: p.name,
        severity: 'moderado',
        reason: 'Paciente traqueostomizado(a) com alergia a LÁTEX. Verificar materiais de proteção utilizados.'
      });
    }
  });

  tenantProfessionals.forEach(p => {
    const expiredDocs = p.documents?.filter(d => d.status === 'expired') || [];
    const pendingDocs = p.documents?.filter(d => d.status === 'pending') || [];

    if (expiredDocs.length > 0) {
      riskAlerts.push({
        id: `alert-doc-exp-${p.id}`,
        patient: `Equipe: ${p.name}`,
        severity: 'alto',
        reason: `Documento Vencido: ${expiredDocs.map(d => d.name).join(', ')}. Regularize imediatamente para não bloquear escalas.`
      });
    }
    if (pendingDocs.length > 0) {
      riskAlerts.push({
        id: `alert-doc-pend-${p.id}`,
        patient: `Equipe: ${p.name}`,
        severity: 'moderado',
        reason: `Documentação Pendente: ${pendingDocs.map(d => d.name).join(', ')}. Aguardando envio ou validação.`
      });
    }
  });

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

  // Monthly evolution of concluded visits (last 6 months) - real data
  const months = (() => {
    const now = new Date();
    const list: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const count = tenantVisits.filter(v => {
        if (v.status !== 'concluida') return false;
        const vd = new Date(v.date);
        return vd.getMonth() === d.getMonth() && vd.getFullYear() === d.getFullYear();
      }).length;
      list.push({ label: d.toLocaleDateString('pt-BR', { month: 'short' }), count });
    }
    return list;
  })();
  const maxMonthly = Math.max(1, ...months.map(m => m.count));
  const chartW = 500;
  const chartH = 190;
  const barW = 52;
  const gap = (chartW - barW * months.length) / (months.length + 1);

  // Specialty distribution - real counts
  const specialtyGroups: { name: string; filter: (s: string) => boolean; color: string }[] = [
    { name: 'Enfermagem', filter: (s) => ['Enfermeiro', 'Técnico de Enfermagem', 'Tecnico de Enfermagem'].includes(s), color: 'bg-green-600' },
    { name: 'Fisioterapia', filter: (s) => s === 'Fisioterapeuta', color: 'bg-emerald-500' },
    { name: 'Medicina', filter: (s) => ['Médico', 'Medico'].includes(s), color: 'bg-indigo-600' },
    { name: 'Outros', filter: (s) => !['Enfermeiro', 'Técnico de Enfermagem', 'Tecnico de Enfermagem', 'Fisioterapeuta', 'Médico', 'Medico'].includes(s), color: 'bg-purple-500' },
  ];
  const specialtyStats = specialtyGroups.map(g => {
    const count = tenantProfessionals.filter(p => g.filter(p.specialty)).length;
    const pct = tenantProfessionals.length > 0 ? Math.round((count / tenantProfessionals.length) * 100) : 0;
    return { name: g.name, count, pct, color: g.color };
  });

  // Financial comparison (this month vs previous month) - real data
  const now = new Date();
  const thisMonthValue = tenantVisits.filter(v => {
    if (v.status !== 'concluida') return false;
    const vd = new Date(v.date);
    return vd.getMonth() === now.getMonth() && vd.getFullYear() === now.getFullYear();
  }).reduce((s, v) => s + v.value, 0);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthValue = tenantVisits.filter(v => {
    if (v.status !== 'concluida') return false;
    const vd = new Date(v.date);
    return vd.getMonth() === prevMonthDate.getMonth() && vd.getFullYear() === prevMonthDate.getFullYear();
  }).reduce((s, v) => s + v.value, 0);
  const monthlyDelta = prevMonthValue > 0 ? ((thisMonthValue - prevMonthValue) / prevMonthValue) * 100 : null;

  // Operational insight computed from real data
  const insight = (() => {
    if (riskAlerts.length > 0) {
      const top = riskAlerts[0];
      return `${riskAlerts.length} alerta(s) clínico(s) ativo(s) no momento. O mais relevante: ${top.reason}`;
    }
    if (todayVisits.length === 0) {
      return 'Nenhuma visita programada para hoje. Considere revisar a escala de profissionais.';
    }
    return `Operação com ${todayVisits.length} visita(s) hoje e ${activeProfessionalsCount} profissional(is) em campo. Nenhum alerta clínico crítico ativo.`;
  })();

  const stats = [
    { 
      label: 'Pacientes Ativos', 
      value: activePatientsCount, 
      desc: 'Em acompanhamento domiciliar', 
      icon: Users, 
      color: 'bg-green-600 text-green-600', 
      bgColor: 'bg-green-50' 
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
      desc: 'Calculados a partir dos dados do sistema', 
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
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Painel Operacional Geral</h2>
          <p className="text-gray-500 text-sm mt-1">Status em tempo real das atividades operacionais e reabilitação de campo.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => setView('checkin')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 font-semibold text-sm rounded-xl hover:bg-green-100 transition-colors shadow-sm"
          >
            <Clock className="w-4 h-4" />
            <span>Check-in Rápido</span>
          </button>
          <button
            onClick={() => setView('patients')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
          >
            <span>Novo Paciente</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-soft border border-gray-200 flex flex-col h-full hover:-translate-y-1 transition-transform duration-300 group cursor-default">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-gray-500 tracking-wide">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-gray-900 tracking-tight">{stat.value.toString().padStart(2, '0')}</span>
            </div>
            <span className="text-xs font-medium text-gray-400 mt-auto pt-4">{stat.desc}</span>
          </div>
        ))}
      </div>

      {/* AI Triage Component */}
      <AITriageWidget setView={setView} />

      {/* Main Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Operations & Specialty Graphs */}
        <div className="lg:col-span-2 space-y-8">

          {/* Operations performance graph - real monthly data */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Evolução Mensal de Visitas</h3>
                <p className="text-gray-400 text-xs">Visitas concluídas nos últimos 6 meses</p>
              </div>
              <div className="text-xs font-semibold text-gray-600">
                {months.reduce((s, m) => s + m.count, 0)} atendimentos no período
              </div>
            </div>

            <div className="h-60 w-full relative">
              <svg className="w-full h-full" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                {/* Horizontal grid lines */}
                {[0, 1, 2, 3].map(i => (
                  <line key={i} x1="20" y1={30 + i * 40} x2={chartW - 10} y2={30 + i * 40} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4 4" />
                ))}

                {/* Bars */}
                {months.map((m, i) => {
                  const x = gap + i * (barW + gap);
                  const barH = Math.max(4, (m.count / maxMonthly) * 150);
                  const y = chartH - 25 - barH;
                  return (
                    <g key={i}>
                      <rect x={x} y={y} width={barW} height={barH} rx="6" fill={i === months.length - 1 ? '#16A34A' : '#2563EB'} opacity={i === months.length - 1 ? 1 : 0.55} />
                      <text x={x + barW / 2} y={y - 6} fill="#374151" fontSize="11" textAnchor="middle" fontWeight="bold">{m.count}</text>
                      <text x={x + barW / 2} y={chartH - 8} fill="#9CA3AF" fontSize="10" textAnchor="middle" fontWeight="bold">{m.label}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Specialty grid distributions */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-800 text-base">Alocação de Especialidades</h3>
              <p className="text-gray-400 text-xs mb-4">Equipe multidisciplinar em operação ativa</p>

              <div className="space-y-3">
                {specialtyStats.map((spec, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                      <span>{spec.name}</span>
                      <span>{spec.count} profissionais ({spec.pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className={`${spec.color} h-full`} style={{ width: `${spec.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-l border-gray-100 pl-0 md:pl-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Atividade Financeira</h3>
                <p className="text-gray-400 text-xs mb-4">Faturamento das visitas concluídas</p>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/60">
                  <span className="text-xs text-gray-400 font-medium">Faturamento no mês atual</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-800">
                      R$ {thisMonthValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {monthlyDelta !== null && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                        monthlyDelta >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                      }`}>
                        {monthlyDelta >= 0 ? '+' : ''}{monthlyDelta.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    {monthlyDelta !== null
                      ? 'Comparado às visitas concluídas no mês anterior'
                      : 'Sem visitas concluídas no mês anterior para comparação'}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setView('finance')}
                className="w-full py-2.5 bg-gray-50 text-gray-600 hover:bg-gray-100 font-semibold text-xs rounded-lg transition-colors border border-gray-200 flex items-center justify-center gap-1 mt-4"
              >
                <span>Acessar Painel Financeiro</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Right Side: Smart Alerts AI & Quick Visit Feed */}
        <div className="space-y-8">
          {/* Operational Insight (computed from real data) */}
          <div className="bg-gradient-to-br from-indigo-50 to-green-50 border border-indigo-100 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="text-indigo-800 font-bold text-sm uppercase tracking-wider">Resumo Operacional</h3>
            </div>
            <p className="text-sm text-indigo-700 leading-relaxed">
              {insight}
            </p>
            <button
              onClick={() => setView('alerts')}
              className="mt-4 w-full bg-white text-indigo-600 text-xs font-bold py-2 rounded-lg border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
            >
              Ver alertas e detalhes
            </button>
          </div>

          {/* Smart Alerts Tray */}
          <div className="bg-[#FEFCE8] p-6 rounded-2xl border border-[#FDE68A] shadow-soft cursor-pointer hover:shadow-md transition-shadow" onClick={() => setView('alerts')}>
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-sm text-gray-900">Alertas Clínicos Ativos</h3>
                <span className="text-xs text-gray-600">{riskAlerts.length.toString().padStart(2, '0')} pendentes • {riskAlerts.filter(a => a.severity === 'alto').length.toString().padStart(2, '0')} críticos</span>
              </div>
            </div>

            {riskAlerts.length > 0 ? (
              <div className="space-y-3 mt-4">
                {riskAlerts.slice(0, 3).map((alert, i) => (
                  <div key={i} className="flex items-stretch bg-white border border-amber-100 rounded-xl overflow-hidden shadow-sm hover:-translate-y-0.5 transition-transform">
                    <div className={`w-1.5 flex-shrink-0 ${alert.severity === 'alto' ? 'bg-red-500' : 'bg-amber-400'}`} />
                    <div className="p-3">
                      <span className="font-bold text-xs text-gray-900 truncate block">{alert.patient}</span>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{alert.reason}</p>
                    </div>
                  </div>
                ))}
                <button className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 mt-4">
                  Ver detalhes <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-500 text-xs">
                Nenhum alerta crítico ativo.
              </div>
            )}
          </div>

          {/* Today's Visitas Queue */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[340px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-base">Escala de Hoje ({todayVisits.length})</h3>
              <button 
                onClick={() => setView('schedules')}
                className="text-xs text-green-600 font-semibold hover:underline"
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
                          Profissional: {prof?.name || 'Não alocado'} • <strong className="text-green-600 font-medium">{prof?.specialty}</strong>
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
                            ? 'bg-green-50 text-green-700 animate-pulse'
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
