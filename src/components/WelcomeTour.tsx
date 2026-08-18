import React, { useState } from 'react';
import { Sparkles, LayoutDashboard, CalendarCheck, FileText, LifeBuoy, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';

interface WelcomeTourProps {
  onComplete: () => void;
  userName: string;
}

export default function WelcomeTour({ onComplete, userName }: WelcomeTourProps) {
  const [step, setStep] = useState(0);

  const tourSteps = [
    {
      title: 'Bem-vindo ao HomeCare Pro!',
      description: `Olá, ${userName.split(' ')[0]}! Preparamos um sistema completo para facilitar a gestão da sua unidade de atendimento domiciliar. Vamos fazer um rápido tour?`,
      icon: <Sparkles className="w-12 h-12 text-indigo-500" />,
      color: 'bg-indigo-50 text-indigo-700',
    },
    {
      title: 'Tudo no seu Menu Lateral',
      description: 'O menu esquerdo é o coração do sistema. Lá você encontrará as abas de Pacientes, Profissionais, Escalas de Visitas e Gestão Financeira. Tudo organizado para acesso rápido.',
      icon: <LayoutDashboard className="w-12 h-12 text-emerald-500" />,
      color: 'bg-emerald-50 text-emerald-700',
    },
    {
      title: 'Controle de Escalas e Plantões',
      description: 'Nossa inteligência ajuda você a sugerir escalas automaticamente, evitar conflitos de horários e registrar a evolução do paciente diretamente pelo celular do profissional.',
      icon: <CalendarCheck className="w-12 h-12 text-blue-500" />,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      title: 'Faturamento Simplificado',
      description: 'Gere relatórios de produção, faturas para operadoras de saúde e emita relatórios com um clique. Mais tempo para cuidar de quem importa.',
      icon: <FileText className="w-12 h-12 text-purple-500" />,
      color: 'bg-purple-50 text-purple-700',
    },
    {
      title: 'Precisa de Ajuda?',
      description: 'Se tiver dúvidas, nossa central de suporte está sempre disponível. Agora, você já pode começar a explorar sua nova plataforma de trabalho!',
      icon: <LifeBuoy className="w-12 h-12 text-orange-500" />,
      color: 'bg-orange-50 text-orange-700',
    }
  ];

  const currentStep = tourSteps[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all">
        
        {/* Progress Bar */}
        <div className="flex w-full h-1 bg-gray-100">
          {tourSteps.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-full flex-1 transition-all duration-300 ${idx <= step ? 'bg-indigo-600' : 'bg-transparent'}`} 
            />
          ))}
        </div>

        <div className="p-8 text-center flex-1 flex flex-col items-center justify-center min-h-[320px]">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-colors duration-500 ${currentStep.color}`}>
            {currentStep.icon}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{currentStep.title}</h2>
          <p className="text-gray-500 leading-relaxed text-sm max-w-sm mx-auto">
            {currentStep.description}
          </p>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors ${step === 0 ? 'invisible' : ''}`}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          
          <div className="flex gap-1.5">
            {tourSteps.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === step ? 'bg-indigo-600 w-4' : 'bg-gray-300'}`} />
            ))}
          </div>

          {step < tourSteps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm animate-pulse-slow"
            >
              <CheckCircle className="w-4 h-4" />
              Começar a Usar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
