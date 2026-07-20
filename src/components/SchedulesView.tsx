import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Sparkles, 
  Clock, 
  User, 
  MapPin, 
  X, 
  ClipboardList, 
  CheckCircle, 
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useHomeCareStore } from '../store';
import { VisitStatus } from '../types';

export default function SchedulesView() {
  const { 
    patients, 
    professionals, 
    visits, 
    activeTenantId, 
    addVisit, 
    updateVisit, 
    deleteVisit,
    suggestScheduleAi
  } = useHomeCareStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterProfessionalId, setFilterProfessionalId] = useState<string>('all');
  
  // AI states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Form states
  const [patientId, setPatientId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('10:00');
  const [value, setValue] = useState(150);

  // Filters
  const tenantPatients = patients.filter(p => p.tenantId === activeTenantId && p.status === 'active');
  const tenantProfessionals = professionals.filter(p => p.tenantId === activeTenantId);
  const tenantVisits = visits.filter(v => v.tenantId === activeTenantId);

  // Filter visits by date and optional professional filter
  const filteredVisits = tenantVisits.filter(v => {
    const matchesDate = v.date === selectedDate;
    const matchesProf = filterProfessionalId === 'all' ? true : v.professionalId === filterProfessionalId;
    return matchesDate && matchesProf;
  });

  // Simple day shifting helpers
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleCreateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !professionalId) {
      alert("Por favor, selecione um paciente e um profissional.");
      return;
    }

    addVisit({
      patientId,
      professionalId,
      date: selectedDate,
      timeStart,
      timeEnd,
      status: 'agendada',
      value: Number(value)
    });

    setPatientId('');
    setProfessionalId('');
    setShowAddModal(false);
  };

  const handleOptimizeEscalasAi = async () => {
    setIsAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);
    try {
      const suggestion = await suggestScheduleAi();
      setAiSuggestion(suggestion);
    } catch (err) {
      setAiError("Não foi possível otimizar as escalas. Verifique as credenciais.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Escalas e Agendamentos Clínicos</h2>
          <p className="text-slate-500 text-sm mt-1">Planejador diário de visitas domiciliares, rotas de profissionais e conciliação.</p>
        </div>
        <button
          onClick={() => {
            if (tenantPatients.length === 0 || tenantProfessionals.length === 0) {
              alert("Por favor, certifique-se de possuir pacientes e profissionais cadastrados.");
              return;
            }
            setPatientId(tenantPatients[0]?.id || '');
            setProfessionalId(tenantProfessionals[0]?.id || '');
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm rounded-lg transition-all shadow-md shadow-blue-100"
        >
          <Plus className="w-4 h-4" />
          <span>Agendar Visita</span>
        </button>
      </div>

      {/* Grid of Calendar & Visits vs AI Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Calendar control & active schedules list */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Day Navigator */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <CalendarIcon className="w-4 h-4 text-blue-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none outline-none font-bold text-slate-700 text-xs w-28"
                />
              </div>

              <button
                onClick={() => shiftDate(1)}
                className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-xs text-blue-600 hover:underline font-semibold ml-2"
              >
                Hoje
              </button>
            </div>

            {/* Filter by Professional */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterProfessionalId}
                onChange={(e) => setFilterProfessionalId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-700 focus:outline-none"
              >
                <option value="all">Filtrar por Profissional (Todos)</option>
                {tenantProfessionals.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Visits List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Escalas Ativas no Dia</h3>
              <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full font-bold">
                {filteredVisits.length} Atendimentos
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredVisits.length > 0 ? (
                filteredVisits.map((visit) => {
                  const pat = patients.find(p => p.id === visit.patientId);
                  const prof = professionals.find(p => p.id === visit.professionalId);

                  return (
                    <div key={visit.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Patient, Doctor and hour info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={pat?.avatar}
                            alt={pat?.name}
                            className="w-10 h-10 rounded-xl object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-bold text-xs text-slate-800 block">{pat?.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Diagnóstico: {pat?.diagnostic}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 pl-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Profissional: <strong className="text-slate-700">{prof?.name}</strong> ({prof?.specialty})</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Horário: {visit.timeStart} - {visit.timeEnd}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[220px]">Endereço: {pat?.address.street}, {pat?.address.number}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status control and Delete */}
                      <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-semibold mb-1">Custo Assistencial</span>
                          <span className="text-sm font-bold text-slate-700 block">R$ {visit.value.toFixed(2)}</span>
                        </div>
                        
                        <select
                          value={visit.status}
                          onChange={(e) => updateVisit(visit.id, { status: e.target.value as VisitStatus })}
                          className={`text-xs rounded-lg font-semibold py-1.5 px-3 border focus:outline-none ${
                            visit.status === 'concluida' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            visit.status === 'em_andamento' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' :
                            visit.status === 'cancelada' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="agendada">Agendada</option>
                          <option value="em_andamento">Em Campo</option>
                          <option value="concluida">Concluída</option>
                          <option value="cancelada">Cancelada</option>
                        </select>

                        <button
                          onClick={() => {
                            if (confirm("Deseja remover este atendimento da escala?")) {
                              deleteVisit(visit.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-slate-100"
                          title="Remover Atendimento"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400">
                  <ClipboardList className="w-12 h-12 text-slate-300 mb-3" />
                  <h4 className="font-bold text-slate-700 text-sm">Nenhuma Visita Agendada</h4>
                  <p className="text-xs max-w-xs mt-1">Não existem visitas marcadas na escala clínica para esta data.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Smart AI Scale Optimizer */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-4 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-300">
                <Sparkles className="w-5 h-5 fill-indigo-300 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Organizador Logístico AI</h3>
                <span className="text-[10px] text-indigo-300 font-medium tracking-wide uppercase">Otimizador de Rotas</span>
              </div>
            </div>

            <p className="text-xs text-indigo-200 leading-relaxed mb-6">
              Nossa inteligência artificial analisa a geolocalização dos pacientes, especialidades técnicas requeridas e a disponibilidade dos profissionais em campo para otimizar os trajetos de atendimento, gerando economia de combustível e reduzindo fadiga da equipe.
            </p>

            <button
              onClick={handleOptimizeEscalasAi}
              disabled={isAiLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/45 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 fill-white" />
              <span>{isAiLoading ? 'Agrupando Escalas...' : 'Otimizar Escalas por IA'}</span>
            </button>

            {isAiLoading && (
              <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-white rounded-full animate-spin" />
                <span className="text-xs text-indigo-200 font-semibold animate-pulse">Agrupando rotas e compatibilidades de diagnósticos...</span>
              </div>
            )}

            {aiError && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {aiSuggestion && (
              <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                <h4 className="font-bold text-xs text-white flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Proposta de Escala Estruturada</span>
                </h4>
                <div className="text-indigo-100 text-xs leading-relaxed whitespace-pre-line bg-indigo-950/40 p-3 rounded-lg border border-indigo-500/10 max-h-72 overflow-y-auto">
                  {aiSuggestion}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Visit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-800">Alocação de Visita Assistencial</h3>
                <p className="text-slate-400 text-xs mt-0.5">Defina paciente, profissional e período do atendimento.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Paciente *</label>
                <select
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  {tenantPatients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.planType})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Profissional Assistencial *</label>
                <select
                  required
                  value={professionalId}
                  onChange={(e) => setProfessionalId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  {tenantProfessionals.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hora de Início *</label>
                  <input
                    type="time"
                    required
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hora de Término *</label>
                  <input
                    type="time"
                    required
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Valor do Atendimento (R$) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 text-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-5 flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-lg shadow-md transition-all"
                >
                  Agendar na Escala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
