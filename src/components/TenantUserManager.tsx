import React, { useState, useEffect } from 'react';
import { Search, Shield, Mail, Building2, AlertCircle, Loader2, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useHomeCareStore } from '../store';

interface GlobalUser {
  id: string;
  tenant_id: string;
  full_name: string;
  role: string;
  email: string | null;
}

export default function TenantUserManager() {
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resetPasswordUser, setResetPasswordUser] = useState<GlobalUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  const { tenants, activeTenantId, currentUserRole, profile } = useHomeCareStore();

  useEffect(() => {
    fetchUsers();
  }, [activeTenantId, currentUserRole, profile?.tenant_id]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPassword) return;
    setIsResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = typeof import.meta.env.VITE_API_URL !== 'undefined' ? import.meta.env.VITE_API_URL : window.location.origin;
      const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ targetUserId: resetPasswordUser.id, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao resetar senha');
      toast.success('Senha atualizada com sucesso!');
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar senha');
    } finally {
      setIsResetting(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // O tenant ativo pode ser um valor antigo do localStorage. Para impedir
      // que a tela de equipe consulte uma instância diferente da sessão atual,
      // o perfil autenticado é a fonte de verdade para o tenant raiz.
      const rootTenantId = profile?.tenant_id || activeTenantId;
      if (!rootTenantId) {
        setUsers([]);
        return;
      }

      let targetTenantIds = [rootTenantId];

      if (currentUserRole === 'super_admin') {
        // O banco já aplica a árvore via RLS. Aqui mantemos apenas a
        // apresentação da árvore carregada pelo usuário, sem incluir o tenant
        // de outra sessão ou um valor arbitrário do navegador.
        const descendantIds = new Set<string>([rootTenantId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const tenant of tenants) {
            if (tenant.parentId && descendantIds.has(tenant.parentId) && !descendantIds.has(tenant.id)) {
              descendantIds.add(tenant.id);
              changed = true;
            }
          }
        }
        targetTenantIds = [...descendantIds];
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .in('tenant_id', targetTenantIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as any) || []);
    } catch (err) {
      console.error('Error fetching tenant users:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTenantName = (tenantId: string) => {
    return tenants.find(t => t.id === tenantId)?.name || tenantId;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'mega_admin': return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-md">Mega Admin</span>;
      case 'system_support': return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md">System Support</span>;
      case 'super_admin': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-md">Super Admin</span>;
      case 'admin': return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md">Admin (Clínica)</span>;
      case 'professional': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md">Profissional</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-md capitalize">{role.replace('_', ' ')}</span>;
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    u.tenant_id?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Gestão de Usuários e Equipe
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {currentUserRole === 'super_admin' 
              ? 'Visualize a equipe da sua revenda e audite os usuários das suas clínicas.' 
              : 'Gerencie a equipe administrativa e operacional da sua clínica.'}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar usuário, tenant ou perfil..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
            <p>Carregando usuários...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Usuário</th>
                  <th className="p-4">Instância / Empresa</th>
                  <th className="p-4">Nível de Acesso</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{user.full_name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email || 'E-mail protegido'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {getTenantName(user.tenant_id)}
                      </div>
                    </td>
                    <td className="p-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-medium">Ativo</span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <button onClick={() => setResetPasswordUser(user)} className="text-gray-400 hover:text-indigo-600 p-1 rounded-full hover:bg-indigo-50 transition-colors" title="Mudar Senha">
                        <Lock className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
                      Nenhum usuário encontrado na sua rede.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                Redefinir Senha
              </h3>
              <button onClick={() => setResetPasswordUser(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Redefinindo a senha de <strong>{resetPasswordUser.full_name}</strong>.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                  required
                  minLength={6}
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setResetPasswordUser(null)} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isResetting} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {isResetting ? 'Salvando...' : 'Salvar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
