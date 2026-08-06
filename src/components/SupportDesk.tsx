import React, { useState, useEffect } from 'react';
import { LifeBuoy, Search, Filter, MessageSquare, Loader2, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SupportTicket } from '../types';

export function SupportDesk() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        setTickets(data.map(t => ({
          id: t.id,
          tenantId: t.tenant_id,
          userId: t.user_id,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        })));
      }
    } catch (err) {
      console.error('Erro ao carregar chamados:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'closed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-orange-500" />;
      default: return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-indigo-600" />
            Central de Suporte
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie os chamados abertos pelas Revendas e Clínicas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar assunto..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 shadow-sm"
            />
          </div>
          <button className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Assunto / ID</th>
                <th className="p-4">Tenant</th>
                <th className="p-4">Status</th>
                <th className="p-4">Prioridade</th>
                <th className="p-4">Abertura</th>
                <th className="p-4 text-right pr-6">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.filter(t => t.subject.toLowerCase().includes(search.toLowerCase())).map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                  <td className="p-4 pl-6">
                    <div className="font-semibold text-gray-900 text-sm">{ticket.subject}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{ticket.id.split('-')[0]}</div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-gray-600">{ticket.tenantId}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 capitalize text-sm text-gray-700 font-medium">
                      {getStatusIcon(ticket.status)}
                      {ticket.status}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full capitalize ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="p-4 text-right pr-6">
                    <button className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold">
                      Responder
                    </button>
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Nenhum chamado aberto. Tudo tranquilo! 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
