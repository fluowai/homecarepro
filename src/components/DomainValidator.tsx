import React, { useMemo, useState } from 'react';
import { Globe, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Loader2, ShieldCheck, ExternalLink } from 'lucide-react';
import { useHomeCareStore } from '../store';
import { supabase } from '../lib/supabase';

export interface DomainCheckResult {
  domain: string;
  cname: string | null;
  a: string | null;
  status: 'valid' | 'warning' | 'invalid';
  message: string;
}

interface DomainValidatorProps {
  scope?: 'all' | 'mine';
}

export function DomainValidator({ scope = 'all' }: DomainValidatorProps) {
  const { tenants, activeTenantId } = useHomeCareStore();
  const [checking, setChecking] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, DomainCheckResult>>({});
  const [error, setError] = useState('');
  const [expectedTarget, setExpectedTarget] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.hostname : 'app.homecarepro.com.br'
  );

  const scopedTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (scope === 'mine') return t.id === activeTenantId || t.parentId === activeTenantId;
      return t.id !== 'system';
    });
  }, [tenants, scope, activeTenantId]);

  const withDomain = scopedTenants.filter((t) => t.customDomain && t.customDomain.trim());
  const withoutDomain = scopedTenants.filter((t) => !t.customDomain || !t.customDomain.trim());

  const runCheck = async (domains: string[]) => {
    if (domains.length === 0) return;
    setChecking(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch('/api/admin/domains/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ domains, expectedTarget }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Falha ao validar domínios.');
      const next: Record<string, DomainCheckResult> = {};
      for (const r of result.results) next[r.domain] = r;
      setResults((prev) => ({ ...prev, ...next }));
    } catch (err: any) {
      setError(err.message || 'Falha ao validar domínios.');
    } finally {
      setChecking(false);
      setCheckingDomain(null);
    }
  };

  const checkAll = () => runCheck(withDomain.map((t) => t.customDomain!.trim()));

  const checkOne = async (domain: string) => {
    setCheckingDomain(domain);
    await runCheck([domain]);
  };

  const statusBadge = (domain: string) => {
    const r = results[domain];
    if (!r) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-gray-100 text-gray-600">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          Não verificado
        </span>
      );
    }
    if (checkingDomain === domain || checking) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700">
          <Loader2 className="w-3 h-3 animate-spin" />
          Verificando
        </span>
      );
    }
    if (r.status === 'valid') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="w-3 h-3" />
          Válido
        </span>
      );
    }
    if (r.status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700">
          <AlertTriangle className="w-3 h-3" />
          Atenção
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-red-50 text-red-700">
        <XCircle className="w-3 h-3" />
        Inválido
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-600" />
          Validação de Domínios
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Verifique se os domínios personalizados das instâncias apontam corretamente para o sistema (CNAME/A).
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Domínio de destino esperado (CNAME)
            </label>
            <input
              type="text"
              value={expectedTarget}
              onChange={(e) => setExpectedTarget(e.target.value.trim())}
              placeholder="app.homecarepro.com.br"
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Cada domínio de tenant deve ter um CNAME apontando para este destino, ou um registro A resolvendo direto.
            </p>
          </div>
          <button
            onClick={checkAll}
            disabled={checking || withDomain.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {checking ? 'Verificando...' : `Verificar ${withDomain.length} domínio${withDomain.length === 1 ? '' : 's'}`}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Domínios configurados
          </h3>
          <span className="text-xs font-semibold text-gray-500">{withDomain.length} instância(s)</span>
        </div>

        {withDomain.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Globe className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Nenhuma instância com domínio personalizado configurado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Instância</th>
                  <th className="p-4">Domínio</th>
                  <th className="p-4">Situação do DNS</th>
                  <th className="p-4 text-right pr-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {withDomain.map((t) => {
                  const domain = t.customDomain!.trim();
                  const r = results[domain];
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-lg shadow-sm border border-gray-200">
                            {t.logo || '🏢'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                            <div className="text-xs text-gray-500">{t.plan} • {t.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 font-mono">
                          {domain}
                          <a
                            href={`https://${domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-indigo-600"
                            title="Abrir no navegador"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </span>
                      </td>
                      <td className="p-4">{statusBadge(domain)}</td>
                      <td className="p-4 text-right pr-6">
                        <button
                          onClick={() => checkOne(domain)}
                          disabled={checking}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Verificar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {withDomain.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 space-y-2">
            {withDomain.map((t) => {
              const domain = t.customDomain!.trim();
              const r = results[domain];
              if (!r) return null;
              return (
                <div key={t.id} className={`p-3 rounded-xl border text-sm ${
                  r.status === 'valid'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : r.status === 'warning'
                    ? 'bg-amber-50 border-amber-100 text-amber-800'
                    : 'bg-red-50 border-red-100 text-red-800'
                }`}>
                  <p className="font-semibold">{domain} — {r.message}</p>
                  {r.cname && <p className="text-xs mt-1 font-mono">CNAME: {r.cname}</p>}
                  {r.a && <p className="text-xs mt-0.5 font-mono">A: {r.a}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {withoutDomain.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-gray-400" />
            Instâncias sem domínio personalizado
          </h3>
          <div className="flex flex-wrap gap-2">
            {withoutDomain.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                {t.logo || '🏢'} {t.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

