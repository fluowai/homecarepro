import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, UserPlus, Search, UserX, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InternalUser {
  id: string;
  full_name: string;
  role: string;
  email: string;
}

export function InternalTeamManager() {
  const [team, setTeam] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('tenant_id', 'system') // Only users in the 'system' tenant
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeam(data as any || []);
    } catch (err) {
      console.error('Error fetching internal team:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeam = team.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Time Interno (Mega Admin)
          </h3>
          <p className="text-sm text-gray-500 mt-1">Gerencie os usuários que têm acesso ao painel principal do sistema.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar na equipe..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Novo Membro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-100">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
            <p>Carregando equipe interna...</p>
          </div>
        ) : filteredTeam.length === 0 ? (
          <div className="col-span-full p-12 flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-100">
            <ShieldCheck className="w-8 h-8 text-gray-300 mb-4" />
            <p>Nenhum membro encontrado.</p>
          </div>
        ) : (
          filteredTeam.map(user => (
            <div key={user.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group">
              <button className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                <UserX className="w-4 h-4" />
              </button>
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0">
                  {user.full_name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{user.full_name}</h4>
                  <p className="text-sm text-gray-500">{user.email || 'Email oculto'}</p>
                  
                  <div className="mt-3 inline-block">
                    {user.role === 'mega_admin' ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-md">
                        Administrador Global
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md">
                        Suporte ao Sistema
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Adicionar Membro à Equipe</h3>
              <p className="text-sm text-gray-500">Convide um novo membro para operar o painel Mega Admin.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Ex: Ana Silva" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Profissional</label>
                <input type="email" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" placeholder="ana@seusaas.com.br" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Acesso</label>
                <select className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="system_support">Suporte ao Sistema (Acesso Restrito)</option>
                  <option value="mega_admin">Administrador Global (Acesso Total)</option>
                </select>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-700 text-xs rounded-lg mt-2">
                O usuário receberá um e-mail com instruções para definir a senha e acessar o painel.
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg">
                Cancelar
              </button>
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">
                Enviar Convite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
