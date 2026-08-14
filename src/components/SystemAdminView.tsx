import React, { useState } from 'react';
import { Building2, Users, CreditCard, Activity, Search, Filter, Plus, Shield, Server, Package, LifeBuoy, Link2, LayoutDashboard, Globe, UserCog, Wrench, Settings } from 'lucide-react';
import { useHomeCareStore } from '../store';
import { PlanManager } from './PlanManager';
import { SupportDesk } from './SupportDesk';
import { GlobalUserManager } from './GlobalUserManager';
import { InternalTeamManager } from './InternalTeamManager';
import { TenantEditorModal } from './TenantEditorModal';
import { InviteLinkModal } from './InviteLinkModal';
import { DomainValidator } from './DomainValidator';
import { Tenant } from '../types';

interface SystemAdminViewProps {
  onExit: (view: string) => void;
  activeSection?: string;
}

const MENU_GROUPS = [
  {
    title: 'Geral',
    items: [
      { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { id: 'network', label: 'Cadastro & Rede', icon: Server },
      { id: 'plans', label: 'Planos', icon: Package },
      { id: 'domains', label: 'Validação de Domínios', icon: Globe },
    ],
  },
  {
    title: 'Operação',
    items: [
      { id: 'support', label: 'Suporte', icon: LifeBuoy },
      { id: 'users', label: 'Usuários Globais', icon: UserCog },
      { id: 'team', label: 'Time Interno', icon: Wrench },
    ],
  },
];

export default function SystemAdminView({ onExit, activeSection = 'overview' }: SystemAdminViewProps) {
  const { tenants, regenerateInvite } = useHomeCareStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [reinviteTenant, setReinviteTenant] = useState<Tenant | null>(null);
  const [reinviteEmail, setReinviteEmail] = useState('');
  const [reinviteLink, setReinviteLink] = useState<string | null>(null);
  const [reinviteLoading, setReinviteLoading] = useState(false);
  const [reinviteError, setReinviteError] = useState('');

  const filteredTenants = tenants.filter(
    (t) => t.id !== 'system' && t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resellers = filteredTenants.filter((t) => !t.parentId);
  const clinics = filteredTenants.filter((t) => t.parentId != null);

  const stats = [
    { label: 'Revendas Ativas', value: resellers.filter(t => t.status !== 'blocked').length, icon: Building2, color: 'bg-indigo-500', bgColor: 'bg-indigo-50' },
    { label: 'Instâncias Cadastradas', value: clinics.length + resellers.length, icon: Users, color: 'bg-green-500', bgColor: 'bg-green-50' },
    { label: 'Instâncias Ativas', value: filteredTenants.filter(t => t.status !== 'blocked').length, icon: CreditCard, color: 'bg-emerald-500', bgColor: 'bg-emerald-50' },
    { label: 'Instâncias Bloqueadas', value: filteredTenants.filter(t => t.status === 'blocked').length, icon: Activity, color: 'bg-blue-500', bgColor: 'bg-blue-50' },
  ];

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color.replace('bg-', 'text-')}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            Rede em resumo
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTenants.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                  {t.logo || '🏢'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-sm truncate">{t.name}</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${t.status === 'blocked' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <span className="text-xs text-gray-500 capitalize">{t.status || 'ativo'}</span>
                    <span className="text-xs text-gray-400">• {t.plan}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Acesso
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Painel exclusivo de gestão do sistema. Cadastre revendas, gerencie planos, suporte, usuários globais e valide os domínios whitelabel.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => document.getElementById('btn-nova-revenda')?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Revenda
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNetwork = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar tenant..."
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => alert('Filtro de tenants - em breve mais opções')}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4 pl-6">ID / Nome da Instância</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Plano</th>
                <th className="p-4">Status</th>
                <th className="p-4">Domínio / Cor Primária</th>
                <th className="p-4 text-right pr-6">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-lg shadow-sm border border-gray-200">
                        {tenant.logo || '🏢'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{tenant.name}</div>
                        <div className="text-xs text-gray-500">ID: {tenant.id} • CNPJ: {tenant.cnpj}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${!tenant.parentId ? 'bg-indigo-50 text-indigo-700' : 'bg-green-50 text-green-700'}`}>
                      {!tenant.parentId ? 'Revenda' : 'Clínica Cliente'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-gray-700">{tenant.plan}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${tenant.status === 'blocked' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <span className="text-sm text-gray-600 capitalize">{tenant.status || 'ativo'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {tenant.customDomain || 'Padrão'}
                      {tenant.primaryColor && (
                        <span className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: tenant.primaryColor }} title={tenant.primaryColor} />
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right pr-6">
                    <div className="flex items-center justify-end gap-1">
                      {!tenant.parentId && (
                        <button
                          onClick={() => {
                            setReinviteTenant(tenant);
                            setReinviteEmail('');
                            setReinviteLink(null);
                            setReinviteError('');
                          }}
                          className="text-gray-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                          title="Gerar link de convite da revenda"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingTenant(tenant)}
                        className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                        title="Editar Tenant"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Nenhuma instância localizada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'network':
        return renderNetwork();
      case 'plans':
        return <div className="p-6 bg-gray-50/30"><PlanManager /></div>;
      case 'support':
        return <div className="p-6 bg-gray-50/30"><SupportDesk /></div>;
      case 'users':
        return <div className="p-6 bg-gray-50/30"><GlobalUserManager /></div>;
      case 'team':
        return <div className="p-6 bg-gray-50/30"><InternalTeamManager /></div>;
      case 'domains':
        return <DomainValidator scope="all" />;
      default:
        return renderOverview();
    }
  };

  const currentMenu = MENU_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeSection);
  const title = currentMenu?.label || 'Visão Geral';
  const subtitle = "Visão global de revendas, clientes whitelabel, planos e suporte.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
          <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
        </div>
        {activeSection === 'network' && (
          <button
            id="btn-nova-revenda"
            onClick={() => setEditingTenant({ id: '', name: '', logo: '', cnpj: '', plan: 'Free', status: 'active' } as Tenant)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Revenda</span>
          </button>
        )}
      </div>

      {renderSection()}

      {editingTenant && (
        <TenantEditorModal
          tenant={editingTenant}
          isCreating={editingTenant.id === ''}
          onClose={() => setEditingTenant(null)}
        />
      )}

      {reinviteTenant && !reinviteLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-emerald-600" />
                Novo Convite — {reinviteTenant.name}
              </h3>
              <p className="text-sm text-gray-500">Gere um novo link de acesso para a revenda criar a conta.</p>
            </div>
            <div className="p-6 space-y-4">
              {reinviteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{reinviteError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">E-mail do Administrador</label>
                <input
                  type="email"
                  value={reinviteEmail}
                  onChange={(e) => setReinviteEmail(e.target.value)}
                  placeholder="admin@revenda.com.br"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setReinviteTenant(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!reinviteEmail.trim()) {
                    setReinviteError('Informe o e-mail do administrador.');
                    return;
                  }
                  setReinviteLoading(true);
                  setReinviteError('');
                  try {
                    const link = await regenerateInvite(reinviteTenant.id, reinviteEmail.trim());
                    setReinviteLink(link);
                  } catch (err: any) {
                    setReinviteError(err.message || 'Falha ao gerar convite.');
                  } finally {
                    setReinviteLoading(false);
                  }
                }}
                disabled={reinviteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {reinviteLoading ? 'Gerando...' : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Gerar Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {reinviteLink && (
        <InviteLinkModal
          inviteLink={reinviteLink}
          title="Novo Link de Convite Gerado"
          description={`Convite para ${reinviteTenant?.name} criar a conta de Super Admin.`}
          onClose={() => {
            setReinviteLink(null);
            setReinviteTenant(null);
          }}
        />
      )}
    </div>
  );
}

