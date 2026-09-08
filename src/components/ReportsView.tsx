import { useMemo, useState } from 'react';
import { Download, FileBarChart, Users, CalendarCheck, DollarSign } from 'lucide-react';
import { useHomeCareStore } from '../store';

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReportsView() {
  const { professionals, visits, activeTenantId } = useHomeCareStore();
  const [professionalId, setProfessionalId] = useState('all');
  const [period, setPeriod] = useState<'all' | '30' | '90'>('30');

  const tenantProfessionals = professionals.filter((professional) => professional.tenantId === activeTenantId);
  const tenantVisits = visits.filter((visit) => visit.tenantId === activeTenantId);
  const reportRows = useMemo(() => {
    const cutoff = period === 'all' ? null : new Date(Date.now() - Number(period) * 86400000);
    return tenantProfessionals
      .filter((professional) => professionalId === 'all' || professional.id === professionalId)
      .map((professional) => {
        const professionalVisits = tenantVisits.filter((visit) => {
          if (visit.professionalId !== professional.id) return false;
          if (!cutoff) return true;
          return new Date(`${visit.date}T00:00:00`).getTime() >= cutoff.getTime();
        });
        const completed = professionalVisits.filter((visit) => visit.status === 'concluida');
        const value = completed.reduce((total, visit) => total + (visit.value || 0), 0);
        return { professional, total: professionalVisits.length, completed: completed.length, value };
      });
  }, [period, professionalId, tenantProfessionals, tenantVisits]);

  const totals = reportRows.reduce((acc, row) => ({
    professionals: acc.professionals + 1,
    visits: acc.visits + row.completed,
    value: acc.value + row.value,
  }), { professionals: 0, visits: 0, value: 0 });

  const exportReport = () => {
    downloadCsv(`relatorio-profissionais-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Profissional', 'Especialidade', 'Registro', 'Visitas concluídas', 'Visitas no período', 'Valor gerado'],
      ...reportRows.map(({ professional, total, completed, value }) => [
        professional.name,
        professional.specialty,
        professional.registration,
        String(completed),
        String(total),
        value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Relatórios profissionais</h2>
          <p className="mt-1 text-sm text-slate-500">Produção dos profissionais baseada nas visitas registradas no período selecionado.</p>
        </div>
        <button onClick={exportReport} className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">Profissionais <Users className="h-4 w-4 text-indigo-600" /></div><strong className="mt-3 block text-2xl text-slate-900">{totals.professionals}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">Visitas concluídas <CalendarCheck className="h-4 w-4 text-emerald-600" /></div><strong className="mt-3 block text-2xl text-slate-900">{totals.visits}</strong></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-500">Valor produzido <DollarSign className="h-4 w-4 text-amber-600" /></div><strong className="mt-3 block text-2xl text-slate-900">{totals.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">Profissional
          <select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"><option value="all">Todos os profissionais</option>{tenantProfessionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}</select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">Período
          <select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="all">Todo o histórico</option></select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 p-5"><FileBarChart className="h-5 w-5 text-indigo-600" /><h3 className="font-bold text-slate-800">Desempenho por profissional</h3></div>
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Profissional</th><th className="px-5 py-3">Especialidade</th><th className="px-5 py-3">Concluídas</th><th className="px-5 py-3">No período</th><th className="px-5 py-3">Valor</th></tr></thead><tbody className="divide-y divide-slate-100">{reportRows.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Nenhum profissional encontrado para este filtro.</td></tr> : reportRows.map(({ professional, total, completed, value }) => <tr key={professional.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-800">{professional.name}<span className="block text-xs font-normal text-slate-400">{professional.registration}</span></td><td className="px-5 py-4 text-slate-600">{professional.specialty}</td><td className="px-5 py-4 font-semibold text-emerald-700">{completed}</td><td className="px-5 py-4 text-slate-600">{total}</td><td className="px-5 py-4 font-semibold text-slate-800">{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>)}</tbody></table></div>
      </div>
    </div>
  );
}
