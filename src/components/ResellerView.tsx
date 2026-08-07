import React, { useState } from 'react';
import { Building, Activity, Search, Plus, Shield, Settings, Link2, Star, CheckCircle, UserPlus, CalendarCheck, TrendingUp } from 'lucide-react';
import { useHomeCareStore } from '../store';
import { WhitelabelConfig } from './WhitelabelConfig';
import { TenantEditorModal } from './TenantEditorModal';
import { InviteLinkModal } from './InviteLinkModal';
import { Tenant } from '../types';

export default function ResellerView() {
  const { tenants, activeTenantId, regenerateInvite } = useHomeCareStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'clinics' | 'whitelabel'>('overview');
  const [creatingClinic, setCreatingClinic] = useState(false);
  const [reinviteTenant, setReinviteTenant] = useState<Tenant | null>(null);
  const [reinviteEmail, setReinviteEmail] = useState('');
  const [reinviteLink, setReinviteLink] = useState<string | null>(null);
  const [reinviteLoading, setReinviteLoading] = useState(false);
  const [reinviteError, setReinviteError] = useState('');

  const myReseller = tenants.find(t => t.id === activeTenantId);
  const myClinics = tenants.filter(t => t.parentId === activeTenantId);
  const activeClinics = myClinics.filter(t => t.status !== 'blocked');

  const stats = [
    { label: 'Clínicas Clientes', value: myClinics.length, icon: Building, color: 'bg-indigo-500', bgColor: 'bg-indigo-50' },
    { label: 'Clínicas Ativas', value: activeClinics.length, icon: CheckCircle, color: 'bg-green-500', bgColor: 'bg-green-50' },
    { label: 'Convites Pendentes', value: '—', icon: Link2, color: 'bg-amber-500', bgColor: 'bg-amber-50' },
    { label: 'Status da Revenda', value: myReseller?.status === 'blocked' ? 'Bloqueada' : 'Ativa', icon: Activity, color: 'bg-blue-500', bgColor: 'bg-blue-50' },
  ];

  const filteredClinics = myClinics.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Painel da Revenda Whitelabel
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {myReseller?.name || 'Carregando...'} — gestão exclusiva da sua rede de clínicas e identidade visual.
          </p>
        </div>
        {activeTab === 'clinics' && (
          <button
            onClick={() => setCreatingClinic(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Clínica</span>
          </button>
        )}
      </div>

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

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 flex flex-wrap items-center">
          <button 
            className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity className="w-4 h-4" />
            Visão Geral
          </button>
          <button 
            className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'clinics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('clinics')}
          >
            <Building className="w-4 h-4" />
            Clínicas Clientes
          </button>
          <button 
            className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'whitelabel' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('whitelabel')}
          >
            <Palette2 className="w-4 h-4" />
            Configuração Whitelabel
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Star className="w-5 h-5 fill-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">Sua marca, sua plataforma</h3>
                      <p className="text-indigo-100 text-sm">White-label completo para sua rede de clínicas.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-indigo-200 text-xs">Plano</p>
                      <p className="font-bold text-lg">{myReseller?.plan || '—'}</p>
                    </div>
                    <div>
                      <p className="text-indigo-200 text-xs">Domínio</p>
                      <p className="font-semibold text-sm truncate">{myReseller?.customDomain || 'Padrão'}</p>
                    </div>
                    <div>
                      <p className="text-indigo-200 text-xs">Status</p>
                      <p className="font-semibold text-sm capitalize">{myReseller?.status || 'ativo'}</p>
                    </div>
                    <div>
                      <p className="text-indigo-200 text-xs">Clínicas</p>
                      <p className="font-bold text-lg">{myClinics.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Sua Rede
                  </h3>
                  {myClinics.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Building className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">Nenhuma clínica vinculada ainda.</p>
                      <button
                        onClick={() => { setActiveTab('clinics'); setCreatingClinic(true); }}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Criar primeira clínica
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {myClinics.map((clinic) => (
                        <div key={clinic.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                            {clinic.logo || '🏥'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm truncate">{clinic.name}</p>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${clinic.status === 'blocked' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                              <span className="text-xs text-gray-500 capitalize">{clinic.status || 'ativo'}</span>
                              <span className="text-xs text-gray-400">• {clinic.plan}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setReinviteTenant(clinic);
                              setReinviteEmail('');
                              setReinviteLink(null);
                              setReinviteError('');
                            }}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Convidar administrador"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-indigo-600" />
                    Como funciona
                  </h3>
                  <ol className="space-y-4 text-sm text-gray-600">
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                      <span>Crie uma clínica e informe o e-mail do administrador.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                      <span>Um link de convite é gerado. Envie para o responsável.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                      <span>A clínica cria a conta com e-mail e senha e entra no sistema com a sua marca.</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Acesso
                  </h3>
                  <p className="text-sm text-gray-500">
                    Você tem acesso total à sua rede. Clínicas veem apenas seus próprios dados. Sua marca (cores, logo e domínio) é aplicada automaticamente para todas as suas clínicas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clinics' && (
          <div>
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-end gap-4 border-b border-gray-100">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar clínica..." 
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">Clínica</th>
                    <th className="p-4">Plano</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right pr-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredClinics.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-lg shadow-sm border border-gray-200">
                            {tenant.logo || '🏥'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{tenant.name}</div>
                            <div className="text-xs text-gray-500">CNPJ: {tenant.cnpj || '—'}</div>
                          </div>
                        </div>
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
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setReinviteTenant(tenant);
                              setReinviteEmail('');
                              setReinviteLink(null);
                              setReinviteError('');
                            }}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Convidar administrador da clínica"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Configurações da clínica">
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredClinics.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        Nenhuma clínica vinculada encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'whitelabel' && (
          <div className="p-6">
            <WhitelabelConfig />
          </div>
        )}
      </div>

      {creatingClinic && (
        <TenantEditorModal
          tenant={{ id: '', name: '', logo: '', cnpj: '', plan: 'Free', status: 'active', parentId: activeTenantId } as Tenant}
          isCreating
          onClose={() => setCreatingClinic(false)}
        />
      )}

      {reinviteTenant && !reinviteLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-emerald-600" />
                Convite de Administrador — {reinviteTenant.name}
              </h3>
              <p className="text-sm text-gray-500">Gere um link para o administrador da clínica criar a conta.</p>
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
                  placeholder="admin@clinica.com.br"
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
          title="Link de Convite Gerado"
          description={`Convite para ${reinviteTenant?.name} criar a conta de administrador.`}
          onClose={() => {
            setReinviteLink(null);
            setReinviteTenant(null);
          }}
        />
      )}
    </div>
  );
}

function Palette2(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}
