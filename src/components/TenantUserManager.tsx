import React, { useState, useEffect } from 'react';
import { Search, Shield, Mail, Building2, AlertCircle, Loader2, Users } from 'lucide-react';
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
  
  const { tenants, activeTenantId, currentUserRole } = useHomeCareStore();

  useEffect(() => {
    fetchUsers();
  }, [activeTenantId, currentUserRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let targetTenantIds = [activeTenantId];

      if (currentUserRole === 'super_admin') {
        const childTenants = tenants.filter(t => t.parentId === activeTenantId).map(t => t.id);
        targetTenantIds = [...targetTenantIds, ...childTenants];
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
                  <th className="p-4 text-right pr-6">Status</th>
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
                    <td className="p-4 text-right pr-6">
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-medium">Ativo</span>
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
    </div>
  );
}
