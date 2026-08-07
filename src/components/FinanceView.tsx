import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Download, 
  ArrowUpRight,
  Building2,
  PieChart,
  FileDigit,
  Send
} from 'lucide-react';
import { useHomeCareStore } from '../store';

export default function FinanceView() {
  const { patients, professionals, visits, insurances, activeTenantId } = useHomeCareStore();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pago' | 'pendente' | 'atrasado'>('all');

  const tenantPatients = patients.filter(p => p.tenantId === activeTenantId);
  const tenantVisits = visits.filter(v => v.tenantId === activeTenantId);

  // Billing analytics calculations based on real data
  const totalBilled = tenantVisits.reduce((acc, curr) => acc + curr.value, 0);
  const totalReceived = tenantVisits.filter(v => v.status === 'concluida').reduce((acc, curr) => acc + curr.value, 0);
  const totalPending = tenantVisits.filter(v => v.status === 'agendada' || v.status === 'em_andamento').reduce((acc, curr) => acc + curr.value, 0);
  
  // Custom margin logic: 70% goes to the professional, 30% to the clinic
  const costMargin = 0.7; 
  const totalCost = totalBilled * costMargin;
  const netProfit = totalBilled - totalCost;

  // Generate dynamic invoices based on patients and their visits
  const invoices = tenantPatients.map(patient => {
    const patientVisits = tenantVisits.filter(v => v.patientId === patient.id);
    const amount = patientVisits.reduce((sum, v) => sum + v.value, 0);
    
    // Determine status based on visits
    const hasPending = patientVisits.some(v => v.status !== 'concluida');
    const status = hasPending ? 'pendente' : 'pago';
    
    const planName = patient.insuranceId 
      ? insurances.find(i => i.id === patient.insuranceId)?.name || patient.planType 
      : patient.planType;

    return {
      id: `inv-${patient.id}`,
      patientName: patient.name,
      plan: planName,
      amount: amount,
      dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 5).toLocaleDateString('pt-BR'), // Day 5 of next month
      status: amount === 0 ? 'pago' : status as 'pago' | 'pendente' | 'atrasado',
      period: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', ' / ')
    };
  }).filter(inv => inv.amount > 0); // Only show patients with billed amounts

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter === 'all') return true;
    return inv.status === statusFilter;
  });

  // Calculate participation by insurance plan
  const planStats = invoices.reduce((acc, inv) => {
    if (!acc[inv.plan]) {
      acc[inv.plan] = { count: 0, value: 0 };
    }
    acc[inv.plan].count += 1;
    acc[inv.plan].value += inv.amount;
    return acc;
  }, {} as Record<string, { count: number, value: number }>);

  const planArray = Object.entries(planStats).map(([name, stats]) => ({
    name,
    count: stats.count,
    value: stats.value,
    pct: totalBilled > 0 ? (stats.value / totalBilled) * 100 : 0
  })).sort((a, b) => b.value - a.value);

  const colors = ['bg-rose-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-amber-500', 'bg-cyan-500'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Painel de Faturamento (DRE)</h2>
          <p className="text-slate-500 text-sm mt-1">Visão integrada de faturamento bruto, custos com profissionais (repasse) e lucro líquido.</p>
        </div>
        <button
          onClick={() => alert("Simulação de Relatório: Exportando demonstrativo DRE detalhado em PDF...")}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded-lg transition-all shadow-md"
        >
          <Download className="w-4 h-4" />
          <span>Exportar DRE Completa</span>
        </button>
      </div>

      {/* Finance KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -z-10" />
          <div className="flex items-center justify-between z-10">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wide">Receita Bruta</span>
            <DollarSign className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-4 z-10">
            <span className="text-2xl font-bold text-slate-900">
              R$ {totalBilled.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Total faturado no mês</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -z-10" />
          <div className="flex items-center justify-between z-10">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wide">Repasses (Custo ~70%)</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-2xl font-bold text-slate-900 block mt-4 z-10">
            R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Pagamento aos profissionais</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-10" />
          <div className="flex items-center justify-between z-10">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wide">Lucro Bruto (~30%)</span>
            <PieChart className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-bold text-indigo-700 block mt-4 z-10">
            R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Margem líquida da clínica</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10" />
          <div className="flex items-center justify-between z-10">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wide">A Receber (Pendentes)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900 block mt-4 z-10">
            R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Atendimentos não finalizados</p>
        </div>
      </div>

      {/* Plans breakdown & invoices table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left/Middle: Invoices listing */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-800 text-sm">Fechamento de Faturas por Paciente</h3>
              
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
                  Fechadas ({invoices.filter(i => i.status === 'pago').length})
                </button>
                <button
                  onClick={() => setStatusFilter('pendente')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    statusFilter === 'pendente' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Abertas ({invoices.filter(i => i.status === 'pendente').length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Nenhuma fatura encontrada.</div>
              ) : (
                filteredInvoices.map((inv) => (
                  <div key={inv.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                        <CreditCard className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">{inv.patientName}</span>
                        <span className="text-[10px] text-slate-500 font-medium block mt-0.5">Convênio: {inv.plan} • {inv.period}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block font-semibold mb-1">Custo Profissional (70%)</span>
                        <span className="text-[11px] font-bold text-rose-600 block">- R$ {(inv.amount * 0.7).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block font-semibold mb-1">Valor Bruto Faturado</span>
                        <span className="text-xs font-bold text-slate-900 block">R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>

                      <div className="flex flex-col gap-2 border-l border-slate-100 pl-4 ml-2">
                        {inv.status === 'pago' ? (
                          <>
                            <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wide text-center bg-emerald-50 text-emerald-700 border border-emerald-100`}>
                              Fechado
                            </span>
                            <button className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded transition-colors font-bold">
                              <Download className="w-3 h-3" /> NF-e
                            </button>
                          </>
                        ) : inv.status === 'pendente' ? (
                          <>
                            <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wide text-center bg-amber-50 text-amber-700 border border-amber-100`}>
                              Pendente
                            </span>
                            <button onClick={() => alert("Simulação: Emitindo Nota Fiscal e enviando fatura para " + inv.patientName)} className="flex items-center justify-center gap-1.5 px-2 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors font-bold">
                              <Send className="w-3 h-3" /> Cobrar
                            </button>
                          </>
                        ) : (
                          <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wide text-center bg-rose-50 text-rose-700 border border-rose-100`}>
                            {inv.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Plans distribution */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mb-5">
              <Building2 className="w-4 h-4 text-green-600" />
              <span>Receita por Convênio</span>
            </h3>

            <div className="space-y-5">
              {planArray.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">Sem dados de convênios.</div>
              ) : (
                planArray.map((p, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                      <span>{p.name} ({p.count} pac.)</span>
                      <span>R$ {p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`${colors[index % colors.length]} h-full`} style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-4 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-100">Auditoria Automática</h4>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O sistema calcula automaticamente o repasse de 70% para os profissionais baseado nas evoluções concluídas. Valores de visitas não executadas (pendentes) constam como receita projetada, mas não entram no contas a pagar até o Check-out ser validado.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
