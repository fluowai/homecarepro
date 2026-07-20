import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Download, 
  Filter, 
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Users
} from 'lucide-react';
import { useHomeCareStore } from '../store';

export default function FinanceView() {
  const { patients, visits, activeTenantId } = useHomeCareStore();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pago' | 'pendente' | 'atrasado'>('all');

  const tenantPatients = patients.filter(p => p.tenantId === activeTenantId && p.status === 'active');
  const tenantVisits = visits.filter(v => v.tenantId === activeTenantId);

  // Billing analytics
  const totalBilled = tenantVisits.reduce((acc, curr) => acc + curr.value, 0);
  const totalReceived = tenantVisits.filter(v => v.status === 'concluida').reduce((acc, curr) => acc + curr.value, 0);
  const totalPending = tenantVisits.filter(v => v.status === 'agendada' || v.status === 'em_andamento').reduce((acc, curr) => acc + curr.value, 0);
  const totalOverdue = tenantPatients.length > 2 ? 840 : 0; // Simulated past overdue factor for demonstration

  // Pre-generate a list of invoices for the active tenant
  const invoices = [
    {
      id: 'inv-1',
      patientName: 'Dona Francisca Ribeiro',
      plan: 'Bradesco Saúde',
      amount: 1550,
      dueDate: '2026-07-25',
      status: 'pendente' as 'pago' | 'pendente' | 'atrasado',
      period: 'Julho / 2026'
    },
    {
      id: 'inv-2',
      patientName: 'Seu Geraldo de Souza',
      plan: 'Particular',
      amount: 2840,
      dueDate: '2026-07-10',
      status: 'pago' as 'pago' | 'pendente' | 'atrasado',
      period: 'Julho / 2026'
    },
    {
      id: 'inv-3',
      patientName: 'Ana Júlia de Albuquerque',
      plan: 'Unimed',
      amount: 4300,
      dueDate: '2026-07-05',
      status: 'pago' as 'pago' | 'pendente' | 'atrasado',
      period: 'Julho / 2026'
    },
    {
      id: 'inv-4',
      patientName: 'Seu Moacyr Guimarães',
      plan: 'Particular',
      amount: 840,
      dueDate: '2026-07-01',
      status: 'atrasado' as 'pago' | 'pendente' | 'atrasado',
      period: 'Julho / 2026'
    }
  ];

  // Filtering invoices
  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter === 'all') return true;
    return inv.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Faturamento e Financeiro</h2>
          <p className="text-slate-500 text-sm mt-1">Visão integrada de contratos de coparticipação, repasses de profissionais e conciliação de convênios.</p>
        </div>
        <button
          onClick={() => alert("Simulação de Relatório: Exportando demonstrativo consolidado em PDF...")}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded-lg transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Exportar DRE</span>
        </button>
      </div>

      {/* Finance KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Faturamento Estimado</span>
            <DollarSign className="w-4 h-4 text-blue-500 bg-blue-50 p-1.5 box-content rounded-lg" />
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-2xl font-bold text-slate-800">
              R$ {(totalBilled + totalOverdue).toLocaleString('pt-BR')}
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              +8.5% <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">Acumulado do mês corrente</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Recebido (Repasses Concluídos)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 bg-emerald-50 p-1.5 box-content rounded-lg" />
          </div>
          <span className="text-2xl font-bold text-slate-800 block mt-4">
            R$ {totalReceived.toLocaleString('pt-BR')}
          </span>
          <p className="text-[11px] text-slate-400 mt-1.5">Liberado para repasse médico</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Em Aberto (Pendentes)</span>
            <Clock className="w-4 h-4 text-amber-500 bg-amber-50 p-1.5 box-content rounded-lg" />
          </div>
          <span className="text-2xl font-bold text-slate-800 block mt-4">
            R$ {totalPending.toLocaleString('pt-BR')}
          </span>
          <p className="text-[11px] text-slate-400 mt-1.5">Visitas agendadas/em andamento</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Valores em Atraso</span>
            <AlertCircle className="w-4 h-4 text-red-500 bg-red-50 p-1.5 box-content rounded-lg" />
          </div>
          <span className="text-2xl font-bold text-slate-800 block mt-4">
            R$ {totalOverdue.toLocaleString('pt-BR')}
          </span>
          <p className="text-[11px] text-slate-400 mt-1.5">Cobranças vencidas há mais de 5 dias</p>
        </div>
      </div>

      {/* Plans breakdown & invoices table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle: Invoices listing */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-800 text-sm">Faturas de Coparticipação & Particular</h3>
              
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    statusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todas ({invoices.length})
                </button>
                <button
                  onClick={() => setStatusFilter('pago')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    statusFilter === 'pago' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Pagas ({invoices.filter(i => i.status === 'pago').length})
                </button>
                <button
                  onClick={() => setStatusFilter('pendente')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    statusFilter === 'pendente' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Abertas ({invoices.filter(i => i.status === 'pendente').length})
                </button>
                <button
                  onClick={() => setStatusFilter('atrasado')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    statusFilter === 'atrasado' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Atraso ({invoices.filter(i => i.status === 'atrasado').length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <div key={inv.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                      <CreditCard className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">{inv.patientName}</span>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-1">Convênio: {inv.plan} • Referência: {inv.period}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-semibold mb-1">Valor Faturado</span>
                      <span className="text-xs font-bold text-slate-800 block">R$ {inv.amount.toLocaleString('pt-BR')}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-semibold mb-1">Vencimento</span>
                      <span className="text-xs font-semibold text-slate-500 block">{inv.dueDate}</span>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0 ${
                      inv.status === 'pago' ? 'bg-emerald-50 text-emerald-600' :
                      inv.status === 'pendente' ? 'bg-amber-50 text-amber-600' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Plans distribution */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mb-4">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span>Participação por Convênio</span>
            </h3>

            <div className="space-y-4">
              {[
                { name: 'Bradesco Saúde', pct: 45, count: 2, value: 'R$ 6.200', color: 'bg-rose-500' },
                { name: 'Particular / Dinheiro', pct: 30, count: 2, value: 'R$ 4.300', color: 'bg-emerald-500' },
                { name: 'Unimed Cooperada', pct: 20, count: 1, value: 'R$ 2.800', color: 'bg-blue-500' },
                { name: 'Amil Coparticipação', pct: 5, count: 0, value: 'R$ 0', color: 'bg-amber-500' }
              ].map((p, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>{p.name} ({p.count})</span>
                    <span>{p.value}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`${p.color} h-full`} style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-4 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-blue-100" />
              <h4 className="font-bold text-xs uppercase tracking-wider">Auditoria e Compliance</h4>
            </div>
            
            <p className="text-[11px] text-blue-100 leading-relaxed">
              Todos os repasses médicos e faturamentos de convênios obedecem rigorosamente à tabela TUSS e de despesas de materiais de home care, garantindo conciliação fiscal sem glosas.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
