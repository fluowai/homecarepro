import React, { useState, useEffect } from 'react';
import { Search, UserX, Shield, Mail, Building2, UserCog, AlertCircle, Loader2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHomeCareStore } from '../store';

interface GlobalUser {
  id: string;
  tenant_id: string;
  full_name: string;
  role: string;
  email: string; // Since we can't easily query auth.users without admin key, we might have to rely on user_profiles or a view. For now we will mock the email or use full_name.
}

export function GlobalUserManager() {
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { tenants } = useHomeCareStore();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // The RLS policy for mega_admin allows reading all user_profiles
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data as any || []);
    } catch (err) {
      console.error('Error fetching global users:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTenantName = (tenantId: string) => {
    if (tenantId === 'system') return 'Mega Admin (Sistema)';
    return tenants.find(t => t.id === tenantId)?.name || tenantId;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'mega_admin': return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-md">Mega Admin</span>;
      case 'system_support': return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md">System Support</span>;
      case 'super_admin': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-md">Super Admin</span>;
      case 'admin': return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md">Admin</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-md capitalize">{role}</span>;
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
            Gestão Global de Usuários
          </h3>
          <p className="text-sm text-gray-500 mt-1">Visualize todos os usuários de todas as revendas e clientes.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar usuário, tenant ou role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
            <p>Carregando base global de usuários...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4 pl-6">Usuário</th>
                  <th className="p-4">Instância (Tenant)</th>
                  <th className="p-4">Nível de Acesso</th>
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
                            {user.email || 'email@oculto.com'}
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
                    <td className="p-4 text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar Perfil">
                          <UserCog className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Bloquear Usuário">
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
                      Nenhum usuário encontrado para a busca.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
