import React, { useEffect, useState, useRef } from 'react';
import { useWhatsAppStore, WhatsAppThread, WhatsAppMessage } from '../whatsappStore';
import { formatWhatsAppNumber } from '../lib/formatters';
import { Send, Paperclip, User, Clock, Image as ImageIcon, FileText, Music, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AttendancesView() {
  const { threads, messages, fetchThreads, fetchMessages, sendMessage, instances } = useWhatsAppStore();
  const [selectedThread, setSelectedThread] = useState<WhatsAppThread | null>(null);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThreads();
    
    const sub = supabase.channel('whatsapp_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_threads' }, () => {
        fetchThreads();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        if (selectedThread && payload.new && (payload.new as any).contact_id === selectedThread.contact_id) {
          fetchMessages(selectedThread.contact_id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [selectedThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectThread = async (thread: WhatsAppThread) => {
    setSelectedThread(thread);
    await fetchMessages(thread.contact_id);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !selectedThread) return;
    
    // We assume the first connected instance for sending, or we should select one
    const activeInstance = instances.find(i => i.status === 'open') || instances[0];
    if (!activeInstance) {
      alert("Nenhuma instância conectada!");
      return;
    }

    const phone = selectedThread.contact?.phone;
    if (!phone) return;

    await sendMessage(activeInstance.instance_name, phone, inputText);
    setInputText('');
  };

  const renderMedia = (msg: WhatsAppMessage) => {
    if (!msg.media_url) return null;
    
    if (msg.message_type === 'image') {
      return <img src={msg.media_url} alt="Media" className="max-w-xs rounded-lg mt-2 cursor-pointer hover:opacity-90" onClick={() => window.open(msg.media_url || '', '_blank')} />;
    }
    if (msg.message_type === 'audio') {
      return <audio src={msg.media_url} controls className="mt-2 max-w-[200px]" />;
    }
    if (msg.message_type === 'video') {
      return <video src={msg.media_url} controls className="max-w-xs rounded-lg mt-2" />;
    }
    if (msg.message_type === 'document') {
      return (
        <a href={msg.media_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mt-2 p-2 bg-slate-100 rounded-lg hover:bg-slate-200">
          <FileText size={20} className="text-blue-500" />
          <span className="text-sm font-medium text-slate-700 underline">Baixar Documento</span>
        </a>
      );
    }
    return null;
  };

  return (
    <div className="h-[calc(100vh-80px)] flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden m-6">
      
      {/* Sidebar - Threads */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-semibold text-slate-800">Atendimentos</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="p-4 text-center text-slate-500">Nenhuma conversa encontrada.</div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => handleSelectThread(thread)}
                className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors \${selectedThread?.id === thread.id ? 'bg-blue-50 border-blue-100' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 overflow-hidden">
                      {thread.contact?.profile_pic_url ? (
                        <img src={thread.contact.profile_pic_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {thread.contact?.profile_name || 'Desconhecido'}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {formatWhatsAppNumber(thread.contact?.phone || '')}
                      </p>
                    </div>
                  </div>
                  {thread.unread_count > 0 && (
                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {thread.unread_count}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main - Chat Area */}
      <div className="flex-1 flex flex-col bg-[#e5ddd5]">
        {selectedThread ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 overflow-hidden">
                {selectedThread.contact?.profile_pic_url ? (
                  <img src={selectedThread.contact.profile_pic_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">
                  {selectedThread.contact?.profile_name || formatWhatsAppNumber(selectedThread.contact?.phone || '')}
                </h3>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isOutbound = msg.direction === 'OUTBOUND';
                return (
                  <div key={msg.id} className={`flex \${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-lg shadow-sm \${isOutbound ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                      {msg.content && <p className="text-slate-800 whitespace-pre-wrap">{msg.content}</p>}
                      {renderMedia(msg)}
                      <div className="flex justify-end items-center gap-1 mt-1">
                        <span className="text-[10px] text-slate-500">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#f0f0f0] flex items-end gap-2">
              <button className="p-2 text-slate-500 hover:text-slate-700 transition-colors">
                <Paperclip size={24} />
              </button>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Digite uma mensagem..."
                className="flex-1 max-h-32 min-h-[44px] p-2 rounded-lg border-none focus:ring-0 resize-none"
                rows={1}
              />
              <button 
                onClick={handleSend}
                disabled={!inputText.trim()}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Send size={20} className="ml-1" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
            <div className="p-6 bg-white rounded-full shadow-sm">
              <Smartphone size={48} className="text-slate-300" />
            </div>
            <p>Selecione uma conversa para iniciar o atendimento.</p>
          </div>
        )}
      </div>

    </div>
  );
}
