import React, { useState, useEffect, useMemo } from 'react';
import { Search, Mail, Building2, Loader2, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DirUser {
  id: string;
  tenant_id: string;
  full_name: string;
  role: string;
  email: string | null;
  created_at?: string;
}

interface DirTenant {
  id: string;
  name: string;
  parent_id: string | null;
  tenant_type?: string;
  status?: string;
}

const ROLE_LABELS: Record<string, string> = {
  mega_admin: 'Mega Admin',
  super_admin: 'Super Admin (Revenda)',
  admin: 'Administrador',
  operator: 'Operador',
  professional: 'Profissional',
  patient: 'Paciente/Familiar',
  viewer: 'Visualizador',
  system_support: 'Suporte (Sistema)',
  auditor: 'Auditor',
};

export function NetworkDirectory() {
  const [users, setUsers] = useState<DirUser[]>([]);
  const [tenants, setTenants] = useState<DirTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDirectory();
  }, []);

  const fetchDirectory = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = typeof import.meta.env.VITE_API_URL !== 'undefined' ? import.meta.env.VITE_API_URL : window.location.origin;
      const res = await fetch(`${apiUrl}/api/admin/user-directory`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar contatos');
      setUsers((data.users || []) as DirUser[]);
      setTenants((data.tenants || []) as DirTenant[]);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar contatos.');
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tenantById = Object.fromEntries(tenants.map((t) => [t.id, t]));

    const clusters: Array<{ tenant: DirTenant | null; users: DirUser[] }> = [];
    const clusterByTenant: Record<string, number> = {};

    const pushUser = (user: DirUser, tenantId: string) => {
      const bucket = tenantId === 'system' ? null : tenantById[tenantId] || { id: tenantId, name: tenantId, parent_id: null };
      const key = tenantId;
      if (!(key in clusterByTenant)) {
        clusterByTenant[key] = clusters.length;
        clusters.push({ tenant: bucket ?? null, users: [] });
      }
      clusters[clusterByTenant[key]].users.push(user);
    };

    const matched = users
      .filter((u) => {
        if (!q) return true;
        const tenantName = tenantById[u.tenant_id]?.name || '';
        return [u.full_name || '', u.email || '', u.role, tenantName]
          .some((v) => v.toLowerCase().includes(q));
      });

    matched.forEach((u) => pushUser(u, u.tenant_id));

    // Ordena: "Sistema" primeiro; revenda (sem parent) depois; clínicas por nome
    clusters.sort((a, b) => {
      if (!!a.tenant === !!b.tenant) {
        return (a.tenant?.name || '').localeCompare(b.tenant?.name || '');
      }
      return a.tenant ? 1 : -1;
    });

    return clusters;
  }, [users, tenants, search]);

  const totalEmails = users.filter((u) => u.email).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            E-mails da Rede
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Contatos de todos os níveis da sua marca: revenda, clínicas e equipes.
            {totalEmails > 0 && <span className="font-semibold text-gray-700"> {totalEmails} e-mail(s) cadastrado(s).</span>}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, role ou clínica..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
          <p>Carregando contatos da rede...</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-400">
          <Users className="w-10 h-10 text-gray-300 mb-3" />
          <p>Nenhum contato encontrado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ tenant, users: clusterUsers }) => (
            <div key={tenant?.id || 'system'} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">
                      {tenant?.name || 'Sistema (Mega Admin)'}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {tenant ? (tenant.tenant_type === 'cooperativa' ? 'Cooperativa' : 'Clínica/Organização') : 'Equipe interna'} • {clusterUsers.length} pessoa(s)
                    </p>
                  </div>
                </div>
                {tenant?.status && tenant.status !== 'active' && (
                  <span className="px-2 py-1 text-[11px] font-bold uppercase rounded-lg bg-red-50 text-red-600">
                    {tenant.status}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="p-4 pl-6">Nome</th>
                      <th className="p-4">E-mail</th>
                      <th className="p-4">Nível</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clusterUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                              {user.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">{user.full_name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700 font-mono">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {user.email || <span className="text-gray-400 font-sans">E-mail não informado</span>}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-gray-100 text-gray-700">
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {clusterUsers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-gray-400 text-sm">
                          <AlertCircle className="w-5 h-5 mx-auto mb-1 text-gray-300" />
                          Nenhuma pessoa cadastrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}