import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  MessageSquare, 
  BellRing, 
  CheckCheck, 
  Clock, 
  Sparkles,
  Smartphone,
  Phone,
  Video,
  Info,
  CalendarCheck
} from 'lucide-react';
import { useHomeCareStore } from '../store';

export default function CommunicationView() {
  const { 
    patients, 
    activeTenantId, 
    messages, 
    sendMessage, 
    receiveMessage, 
    markMessagesRead 
  } = useHomeCareStore();

  const [activePatientId, setActivePatientId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Active unit patients
  const tenantPatients = patients.filter(p => p.tenantId === activeTenantId && p.status === 'active');

  const [showListMobile, setShowListMobile] = useState(true);

  // Auto-select first patient conversation if none is selected
  useEffect(() => {
    if (!activePatientId && tenantPatients.length > 0) {
      setActivePatientId(tenantPatients[0].id);
    }
  }, [tenantPatients, activePatientId]);

  // Handle mobile view state
  useEffect(() => {
    if (activePatientId && window.innerWidth < 768) {
      setShowListMobile(false);
    }
  }, [activePatientId]);

  // Mark active patient messages as read
  useEffect(() => {
    if (activePatientId) {
      markMessagesRead(activePatientId);
    }
  }, [activePatientId, messages, markMessagesRead]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activePatientId]);

  const activePatient = patients.find(p => p.id === activePatientId);
  const activeChatMessages = messages.filter(m => m.patientId === activePatientId && m.tenantId === activeTenantId);

  // Send reply
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activePatientId) return;

    sendMessage(activePatientId, inputText, 'operator');
    setInputText('');

    // Simulated patient reply after 2 seconds
    const userPrompt = inputText;
    setTimeout(() => {
      let patientReply = "Obrigada pelo retorno. Vou avisar o cuidador aqui em casa.";
      
      if (userPrompt.toLowerCase().includes('confirm') || userPrompt.toLowerCase().includes('escala')) {
        patientReply = "Perfeito, já recebemos o horário aqui e a equipe de cuidadores está a postos para receber a enfermeira.";
      } else if (userPrompt.toLowerCase().includes('remédio') || userPrompt.toLowerCase().includes('prescrição')) {
        patientReply = "Ok, os remédios estão comprados e organizados na bandeja do quarto. Obrigada!";
      } else if (userPrompt.toLowerCase().includes('dor') || userPrompt.toLowerCase().includes('sintoma')) {
        patientReply = "O paciente está dormindo melhor agora, mas vamos monitorar a febre conforme orientado.";
      }
      
      receiveMessage(activePatientId, patientReply);
    }, 2000);
  };

  // Automated notification templates
  const triggerVisitReminder = () => {
    if (!activePatientId) return;
    const reminderText = `[HomeCare Pro Lembrete] Olá, gostaríamos de confirmar que a visita da Dra. Mariana Costa (Enfermagem) está agendada para amanhã às 09:00 na residência. Caso precise remarcar, favor nos avisar por aqui.`;
    sendMessage(activePatientId, reminderText, 'system');

    setTimeout(() => {
      receiveMessage(activePatientId, "Lembrete confirmado! Estaremos aguardando o profissional no horário marcado.");
    }, 1500);
  };

  const triggerVisitConfirmation = () => {
    if (!activePatientId) return;
    const confirmationText = `[HomeCare Pro Confirmação] Olá, informamos que o atendimento assistencial de hoje com Dona Francisca foi concluído com sucesso às 10:05. A evolução técnica e os sinais vitais já estão atualizados no prontuário digital.`;
    sendMessage(activePatientId, confirmationText, 'system');
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Painel de Comunicação Integrada</h2>
        <p className="text-slate-500 text-sm mt-1">Inbox unificado de atendimento ao paciente e disparadores automáticos.</p>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl flex flex-1 h-[580px] md:h-[650px] overflow-hidden relative">
        
        {/* Left Side: Conversations List */}
        <div className={`${showListMobile ? 'flex' : 'hidden'} md:flex w-full md:w-80 border-r border-slate-200 flex-col h-full bg-slate-50/50`}>
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Conversas por Paciente</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {tenantPatients.map((pat) => {
              const chatMsgs = messages.filter(m => m.patientId === pat.id && m.tenantId === activeTenantId);
              const lastMsg = chatMsgs[chatMsgs.length - 1];
              const unreadCount = chatMsgs.filter(m => m.sender === 'patient' && !m.read).length;
              const isSelected = activePatientId === pat.id;

              return (
                <div
                  key={pat.id}
                  onClick={() => {
                    setActivePatientId(pat.id);
                    setShowListMobile(false);
                  }}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 ${
                    isSelected ? 'bg-green-50/60 md:border-l-4 md:border-green-600' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={pat.avatar}
                      alt={pat.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-800 block truncate">{pat.name}</span>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        {lastMsg ? lastMsg.text : 'Sem mensagens recentes'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                    {unreadCount > 0 && (
                      <span className="bg-green-600 text-white font-bold text-[9px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400">WhatsApp</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Conversations Window */}
        {activePatient ? (
          <div className={`${!showListMobile ? 'flex' : 'hidden'} md:flex flex-1 flex-col h-full bg-white relative`}>
            
            {/* Chat header */}
            <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white z-10 sticky top-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowListMobile(true)}
                  className="md:hidden p-1.5 -ml-1 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  <Smartphone className="w-5 h-5 rotate-180" />
                </button>
                <img
                  src={activePatient.avatar}
                  alt={activePatient.name}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-xl object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <h3 className="font-bold text-xs text-slate-800 truncate">{activePatient.name}</h3>
                  <span className="text-[9px] md:text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="truncate">WhatsApp (Familiar)</span>
                  </span>
                </div>
              </div>

              {/* CRM Trigger actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={triggerVisitReminder}
                  className="p-2 md:px-3 md:py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                  title="Lembrete de Visita"
                >
                  <BellRing className="w-3.5 h-3.5 text-green-600" />
                  <span className="hidden lg:inline">Lembrete</span>
                </button>
                <button
                  onClick={triggerVisitConfirmation}
                  className="p-2 md:px-3 md:py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                  title="Confirmação"
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden lg:inline">Confirmar</span>
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50">
              {activeChatMessages.map((msg) => {
                const isOperator = msg.sender === 'operator';
                const isSystem = msg.sender === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="mx-auto max-w-md bg-green-50 border border-green-100 text-green-800 p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm flex gap-2">
                      <Sparkles className="w-4 h-4 text-green-600 fill-green-600 shrink-0" />
                      <div>
                        <strong className="block font-bold">Disparo Automático de Lembrete:</strong>
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOperator ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div className={`max-w-md p-3.5 rounded-2xl shadow-sm text-xs leading-relaxed ${
                      isOperator 
                        ? 'bg-green-600 text-white rounded-br-none' 
                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                    }`}>
                      <p>{msg.text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1.5 text-[9px]">
                        <span className={isOperator ? 'text-green-100' : 'text-slate-400'}>
                          {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOperator && <CheckCheck className="w-3.5 h-3.5 text-green-100" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white flex gap-2.5 items-center">
              <input
                type="text"
                required
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escreva a mensagem de retorno para a família..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl text-xs px-4 py-3 text-slate-700 focus:outline-none focus:border-green-600 focus:bg-white transition-all"
              />
              <button
                type="submit"
                className="p-3 bg-green-600 hover:bg-green-600 text-white rounded-xl shadow-md shadow-green-100 transition-all flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-8 bg-white">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-700 text-sm">Carregando WhatsApp CRM</h4>
            <p className="text-xs max-w-xs mt-1">Por favor, certifique-se de possuir pacientes ativos cadastrados na sua base operacional.</p>
          </div>
        )}

      </div>
    </div>
  );
}
