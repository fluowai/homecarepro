import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  PieChart, 
  CreditCard, 
  Download, 
  Building2,
  FilePlus2,
  CheckCircle2,
  XCircle,
  Receipt
} from 'lucide-react';
import { useHomeCareStore } from '../store';

type StatusFilter = 'all' | 'PENDING' | 'PAID' | 'CANCELED';

export default function FinanceView() {
  const { patients, visits, insurances, invoices, activeTenantId, addInvoice, updateInvoice } = useHomeCareStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [generating, setGenerating] = useState(false);

  const tenantPatients = patients.filter(p => p.tenantId === activeTenantId);
  const tenantVisits = visits.filter(v => v.tenantId === activeTenantId);
  const tenantInvoices = invoices
    .filter(i => i.tenantId === activeTenantId)
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());

  // Billing analytics based on real visit data
  const totalBilled = tenantVisits.filter(v => v.status === 'concluida').reduce((acc, curr) => acc + curr.value, 0);
  const totalPending = tenantVisits.filter(v => v.status === 'agendada' || v.status === 'em_andamento').reduce((acc, curr) => acc + curr.value, 0);
  const totalReceived = tenantInvoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + curr.value, 0);

  // Business rule: repasse de 70% ao profissional (configurável na implementação real de pagamentos)
  const costMargin = 0.7;
  const totalCost = totalBilled * costMargin;
  const netProfit = totalBilled - totalCost;

  const patientName = (id: string) => tenantPatients.find(p => p.id === id)?.name || 'Paciente removido';
  const patientPlan = (id: string) => {
    const p = tenantPatients.find(pat => pat.id === id);
    if (!p) return '—';
    return p.insuranceId ? insurances.find(i => i.id === p.insuranceId)?.name || p.planType : p.planType;
  };

  const filteredInvoices = tenantInvoices.filter(inv => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'PENDING') return inv.status === 'PENDING';
    if (statusFilter === 'PAID') return inv.status === 'PAID';
    return inv.status === 'CANCELED';
  });

  // Receita por convênio baseada nas faturas reais
  const planStats = tenantInvoices.reduce((acc, inv) => {
    const plan = patientPlan(inv.patientId);
    if (!acc[plan]) acc[plan] = { count: 0, value: 0 };
    acc[plan].count += 1;
    acc[plan].value += inv.value;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const planArray = Object.entries(planStats)
    .map(([name, stats]) => ({ name, count: stats.count, value: stats.value, pct: tenantInvoices.length ? (stats.value / tenantInvoices.reduce((s, i) => s + i.value, 0)) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  const colors = ['bg-rose-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-amber-500', 'bg-cyan-500'];

  const flash = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 6000);
  };

  const generateMonthlyInvoices = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      const existingPatients = new Set(
        tenantInvoices
          .filter(i => new Date(i.issueDate).getMonth() === month && new Date(i.issueDate).getFullYear() === year)
          .map(i => i.patientId)
      );

      const candidates = tenantPatients.filter(p => {
        if (existingPatients.has(p.id)) return false;
        return tenantVisits.some(v => {
          if (v.patientId !== p.id || v.status !== 'concluida') return false;
          const d = new Date(v.date);
          return d.getMonth() === month && d.getFullYear() === year;
        });
      });

      if (candidates.length === 0) {
        flash('Nenhum paciente com visitas concluídas no período sem fatura aberta.', 'info');
        return;
      }

      let created = 0;
      for (const p of candidates) {
        const value = tenantVisits
          .filter(v => {
            if (v.patientId !== p.id || v.status !== 'concluida') return false;
            const d = new Date(v.date);
            return d.getMonth() === month && d.getFullYear() === year;
          })
          .reduce((s, v) => s + v.value, 0);
        if (value <= 0) continue;
        const dueDate = new Date(year, month + 1, 5);
        const inv = await addInvoice({
          patientId: p.id,
          issueDate: now.toISOString().slice(0, 10),
          dueDate: dueDate.toISOString().slice(0, 10),
          value,
          status: 'PENDING',
          description: `Fatura mensal de ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        });
        if (inv) created++;
      }
      flash(created > 0 ? `${created} fatura(s) registrada(s) com sucesso.` : 'Nenhuma fatura criada.', created > 0 ? 'success' : 'info');
    } catch (err) {
      console.error('[FinanceView] generateMonthlyInvoices failed', err);
      flash('Falha ao gerar faturas. Verifique o banco de dados.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const markReceived = async (inv: typeof tenantInvoices[number]) => {
    await updateInvoice(inv.id, { status: 'PAID', description: inv.description });
    flash(`Fatura de ${patientName(inv.patientId)} marcada como recebida.`, 'success');
  };

  const cancelInvoice = async (inv: typeof tenantInvoices[number]) => {
    await updateInvoice(inv.id, { status: 'CANCELED', description: inv.description });
    flash(`Fatura de ${patientName(inv.patientId)} cancelada.`, 'info');
  };

  const handleDownloadReceipt = (inv: typeof tenantInvoices[number]) => {
    const content = [
      'RECIBO DE FATURA - HomeCare Pro',
      `Período: ${new Date(inv.issueDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
      `Paciente: ${patientName(inv.patientId)}`,
      `Convênio: ${patientPlan(inv.patientId)}`,
      `Valor: R$ ${inv.value.toFixed(2)}`,
      `Emissão: ${new Date(inv.issueDate).toLocaleDateString('pt-BR')}`,
      `Vencimento: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('pt-BR') : '—'}`,
      `Status: ${inv.status}`,
      '',
      'Este é um recibo emitido pelo sistema. A emissão de NF-e exige',
      'integração com serviço fiscal (a ser configurada).',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo_${patientName(inv.patientId).replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDre = () => {
    const header = 'Emissao;Paciente;Convenio;Valor;Vencimento;Status\n';
    const rows = tenantInvoices.map(inv => [
      inv.issueDate,
      patientName(inv.patientId),
      patientPlan(inv.patientId),
      inv.value.toFixed(2),
      inv.dueDate || '',
      inv.status
    ].join(';')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dre_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Painel de Faturamento (DRE)</h2>
          <p className="text-slate-500 text-sm mt-1">Visão de faturamento por visitas concluídas, repasses a profissionais e faturas registradas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={generateMonthlyInvoices}
            disabled={generating}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-all shadow-md"
          >
            <FilePlus2 className="w-4 h-4" />
            {generating ? 'Gerando...' : 'Fechar Faturas do Período'}
          </button>
          <button
            onClick={handleExportDre}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm rounded-lg transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Exportar DRE</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          : message.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100'
          : 'bg-sky-50 text-sky-700 border border-sky-100'
        }`}>
          {message.text}
        </div>
      )}

      {/* Finance KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -z-10" />
          <div className="flex items-center justify-between z-10">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wide">Receita Bruta (visitas concluídas)</span>
            <DollarSign className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-4 z-10">
            <span className="text-2xl font-bold text-slate-900">
              R$ {totalBilled.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Visitas finalizadas</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -z-10" />
          <div className="flex items-center justify-between z-10">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wide">Repasses (custo ~70%)</span>
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
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Margem da clínica</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-10" />
          <div className="flex items-center justify-between z-10">
            <span className="text-slate-500 font-semibold text-xs uppercase tracking-wide">Recebido (faturas)</span>
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-slate-900 block mt-4 z-10">
            R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">Faturas marcadas como recebidas</p>
        </div>
      </div>

      {/* Invoices & plans breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Invoices listing */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  Faturas Registradas
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Registradas e persistidas no banco de dados.</p>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    statusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todas ({tenantInvoices.length})
                </button>
                <button
                  onClick={() => setStatusFilter('PAID')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    statusFilter === 'PAID' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Recebidas ({tenantInvoices.filter(i => i.status === 'PAID').length})
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                    statusFilter === 'PENDING' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Pendentes ({tenantInvoices.filter(i => i.status === 'PENDING').length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Nenhuma fatura encontrada. Use "Fechar Faturas do Período" para gerar faturas a partir das visitas concluídas.
                </div>
              ) : (
                filteredInvoices.map((inv) => (
                  <div key={inv.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                        <CreditCard className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">{patientName(inv.patientId)}</span>
                        <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                          {patientPlan(inv.patientId)} • Emissão: {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('pt-BR') : '—'}
                          {inv.dueDate ? ` • Venc.: ${new Date(inv.dueDate).toLocaleDateString('pt-BR')}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block font-semibold mb-1">Valor Faturado</span>
                        <span className="text-xs font-bold text-slate-900 block">R$ {inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>

                      <div className="flex flex-col gap-2 border-l border-slate-100 pl-4 ml-2">
                        {inv.status === 'PAID' ? (
                          <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wide text-center bg-emerald-50 text-emerald-700 border border-emerald-100`}>
                            Recebida
                          </span>
                        ) : inv.status === 'PENDING' ? (
                          <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wide text-center bg-amber-50 text-amber-700 border border-amber-100`}>
                            Pendente
                          </span>
                        ) : (
                          <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wide text-center bg-rose-50 text-rose-700 border border-rose-100`}>
                            Cancelada
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          {inv.status === 'PENDING' && (
                            <button onClick={() => markReceived(inv)} title="Marcar como recebida"
                              className="flex items-center gap-1.5 px-2 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Receber
                            </button>
                          )}
                          {inv.status === 'PENDING' && (
                            <button onClick={() => cancelInvoice(inv)} title="Cancelar fatura"
                              className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded transition-colors font-bold">
                              <XCircle className="w-3 h-3" /> Cancelar
                            </button>
                          )}
                          <button onClick={() => handleDownloadReceipt(inv)} title="Baixar recibo"
                            className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded transition-colors font-bold">
                            <Download className="w-3 h-3" /> Recibo
                          </button>
                        </div>
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
                <div className="text-xs text-slate-400 text-center py-4">Sem faturas registradas.</div>
              ) : (
                planArray.map((p, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                      <span>{p.name} ({p.count} fat.)</span>
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
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-100">Repasse aos Profissionais</h4>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              O sistema calcula o repasse de 70% aos profissionais com base nas visitas concluídas.
              Visitas pendentes constam como receita projetada e não entram no contas a pagar até o check-out ser validado.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
