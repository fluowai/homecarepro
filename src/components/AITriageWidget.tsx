import React, { useState } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  Stethoscope, 
  Send, 
  Copy, 
  Check, 
  RotateCcw, 
  ArrowRight, 
  Activity, 
  Heart, 
  FileText, 
  Zap,
  UserCheck,
  User,
  AlertCircle
} from 'lucide-react';
import { useHomeCareStore } from '../store';
import { TriageResult } from '../types';

interface AITriageWidgetProps {
  setView: (view: string) => void;
}

const PRESET_SCENARIOS = [
  {
    title: '🚨 Desconforto Respiratório',
    description: 'Paciente idoso de 84 anos com queda repentina de saturação O2 (82%), dispneia aos mínimos esforços e secreção abundante em traqueostomia.',
    age: 84,
    condition: 'DPOC / Traqueostomizado'
  },
  {
    title: '🩺 Obstrução de Sonda (SNE)',
    description: 'Sonda nasoenteral (SNE) desposicionada e obstruída há 6 horas, com refluxo de dieta enteral e leve distensão abdominal.',
    age: 78,
    condition: 'Alzheimer avançado / Dieta Enteral'
  },
  {
    title: '🧠 Reabilitação Pós-AVC',
    description: 'Paciente de 71 anos em fase subaguda de AVC isquêmico com hemiparesia à direita, necessitando treino de marcha e fortalecimento.',
    age: 71,
    condition: 'Pós-AVC / Sequela Motora'
  },
  {
    title: '👄 Disfagia & Engasgos',
    description: 'Dificuldade acentuada para engolir alimentos e líquidos, com tosse persistente e engasgos frequentes durante as refeições.',
    age: 69,
    condition: 'Parkinson / Disfagia'
  },
  {
    title: '🩹 Curativo Complexo',
    description: 'Lesão por pressão Grau III em região sacra com exsudato purulento, hiperemia perilesional e necessidade de desbridamento.',
    age: 82,
    condition: 'Acamado / Lesão Sacra'
  }
];

export default function AITriageWidget({ setView }: AITriageWidgetProps) {
  const { analyzeTriageAi } = useHomeCareStore();

  const [inputDescription, setInputDescription] = useState('');
  const [patientAge, setPatientAge] = useState<number | undefined>(undefined);
  const [mainCondition, setMainCondition] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});

  const handleAnalyze = async (descToUse?: string, ageToUse?: number, condToUse?: string) => {
    const desc = descToUse !== undefined ? descToUse : inputDescription;
    const age = ageToUse !== undefined ? ageToUse : patientAge;
    const cond = condToUse !== undefined ? condToUse : mainCondition;

    if (!desc.trim()) return;

    setLoading(true);
    setCheckedActions({});
    try {
      const res = await analyzeTriageAi(desc, age, cond);
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setInputDescription(preset.description);
    setPatientAge(preset.age);
    setMainCondition(preset.condition);
    handleAnalyze(preset.description, preset.age, preset.condition);
  };

  const handleReset = () => {
    setInputDescription('');
    setPatientAge(undefined);
    setMainCondition('');
    setResult(null);
    setCheckedActions({});
  };

  const handleCopyResult = () => {
    if (!result) return;
    const text = `=== RELATÓRIO DE TRIAGEM DE ATENDIMENTO - IA ===\nNível de Urgência: ${result.urgency.toUpperCase()} (Score: ${result.urgencyScore}/10)\nEspecialidade Indicada: ${result.specialty}\nSLA Recomendado: ${result.responseTime}\n\nJustificativa Clínica:\n${result.clinicalRationale}\n\nAções Recomendadas:\n${result.recommendedActions.map(a => `- ${a}`).join('\n')}\n\nSolicitação Inicial:\n"${inputDescription}"`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Crítica':
        return {
          bg: 'bg-red-50 border-red-200 text-red-700',
          badgeBg: 'bg-red-600 text-white',
          icon: AlertTriangle,
          glow: 'ring-2 ring-red-500/20 animate-pulse',
          colorName: 'Crítica / Emergencial'
        };
      case 'Alta':
        return {
          bg: 'bg-orange-50 border-orange-200 text-orange-800',
          badgeBg: 'bg-orange-500 text-white',
          icon: ShieldAlert,
          glow: 'ring-1 ring-orange-400/20',
          colorName: 'Alta Prioridade'
        };
      case 'Média':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          badgeBg: 'bg-amber-500 text-white',
          icon: Clock,
          glow: '',
          colorName: 'Média (Programável)'
        };
      default:
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          badgeBg: 'bg-emerald-600 text-white',
          icon: CheckCircle2,
          glow: '',
          colorName: 'Baixa / Rotina'
        };
    }
  };

  const toggleActionCheck = (idx: number) => {
    setCheckedActions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-400 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg text-white tracking-tight">IA Triagem Domiciliar</h3>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-blue-500/30 text-blue-300 border border-blue-400/30 rounded-full tracking-wider">
                Protocolo Manchester
              </span>
            </div>
            <p className="text-slate-300 text-xs mt-0.5">
              Classificação inteligente de risco, SLA de atendimento e encaminhamento de especialidades.
            </p>
          </div>
        </div>

        {result && (
          <button
            onClick={handleReset}
            className="self-start sm:self-auto px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 border border-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nova Triagem</span>
          </button>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Preset Sample Selector */}
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
            Casos Frequentes para Teste Rápido:
          </label>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {PRESET_SCENARIOS.map((preset, i) => (
              <button
                key={i}
                onClick={() => handleSelectPreset(preset)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <span>{preset.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Textarea & Metadata */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Descrição da Queixa ou Solicitação de Atendimento <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {inputDescription.length} caracteres
              </span>
            </div>
            <textarea
              value={inputDescription}
              onChange={(e) => setInputDescription(e.target.value)}
              placeholder="Ex: Paciente relata falta de ar intensa desde hoje cedo, com batimento de asa de nariz e queda de saturação de O2 para 85%. Família solicita atendimento domiciliar urgente..."
              rows={3}
              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400 outline-none"
            />
          </div>

          {/* Optional context fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Idade do Paciente (Anos - Opcional)
              </label>
              <input
                type="number"
                value={patientAge || ''}
                onChange={(e) => setPatientAge(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ex: 82"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Diagnóstico ou Condição Prévia (Opcional)
              </label>
              <input
                type="text"
                value={mainCondition}
                onChange={(e) => setMainCondition(e.target.value)}
                placeholder="Ex: Traqueostomizado / Pós-AVC / Alzheimer"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Action trigger button */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              O motor de IA consulta protocolos de urgência médica e matriz de especialidades.
            </span>
            <button
              onClick={() => handleAnalyze()}
              disabled={loading || !inputDescription.trim()}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Processando Triagem Clínico-Analítica...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-white" />
                  <span>Classificar Urgência & Especialidade</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Render */}
        {result && (
          <div className="border-t border-slate-200 pt-6 space-y-5 animate-fade-in">
            {/* Urgency Badge Banner */}
            {(() => {
              const info = getUrgencyBadge(result.urgency);
              const UrgencyIcon = info.icon;

              return (
                <div className={`p-4 sm:p-5 rounded-2xl border ${info.bg} ${info.glow} transition-all`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${info.badgeBg} shrink-0 shadow-sm mt-0.5`}>
                        <UrgencyIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Classificação de Urgência
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${info.badgeBg}`}>
                            {result.urgency}
                          </span>
                        </div>
                        <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">
                          {info.colorName}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1">
                          Tempo limite recomendado (SLA): <strong className="text-slate-900 font-bold">{result.responseTime}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div className="bg-white/80 backdrop-blur border border-slate-200 p-3 rounded-xl min-w-[180px] shrink-0">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                        <span>Gravidade Estimada</span>
                        <span className="text-blue-600">{result.urgencyScore}/10</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            result.urgencyScore >= 8 
                              ? 'bg-red-600' 
                              : result.urgencyScore >= 6 
                              ? 'bg-orange-500' 
                              : result.urgencyScore >= 4 
                              ? 'bg-amber-500' 
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${result.urgencyScore * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Specialty & Rationale Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Specialty Recommended */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Especialidade Profissional
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 text-sm">{result.specialty}</h5>
                      <span className="text-[11px] text-blue-600 font-semibold">Profissional Indicado</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setView('schedules')}
                  className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <span>Agendar Atendimento</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Clinical Rationale */}
              <div className="md:col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Parecer Clínico & Raciocínio Diagnóstico
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium italic">
                    &quot;{result.clinicalRationale}&quot;
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Algoritmo de Priorização Home Care</span>
                  </span>
                  <button
                    onClick={handleCopyResult}
                    className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Parecer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Recommended Action Checklist */}
            {result.recommendedActions && result.recommendedActions.length > 0 && (
              <div className="bg-white border border-slate-200 p-4 rounded-xl">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Ações Imediatas Sugeridas de Triagem ({result.recommendedActions.length})</span>
                </h5>

                <div className="space-y-2">
                  {result.recommendedActions.map((action, idx) => {
                    const isChecked = !!checkedActions[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleActionCheck(idx)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center gap-3 ${
                          isChecked 
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 line-through' 
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="font-medium">{action}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
