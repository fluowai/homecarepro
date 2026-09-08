import React, { useState } from 'react';
import { Building2, Users, CreditCard, Activity, Search, Filter, Plus, Shield, Server, Package, LifeBuoy, Link2, LayoutDashboard, Globe, UserCog, Wrench, Settings, Mail, ShoppingCart, UserCheck, Box, TrendingUp, ChevronRight, Share2, Zap, ShieldCheck, CheckCircle } from 'lucide-react';
import { useHomeCareStore } from '../store';
import { PlanManager } from './PlanManager';
import { SupportDesk } from './SupportDesk';
import { GlobalUserManager } from './GlobalUserManager';
import { InternalTeamManager } from './InternalTeamManager';
import { TenantEditorModal } from './TenantEditorModal';
import { InviteLinkModal } from './InviteLinkModal';
import { DomainValidator } from './DomainValidator';
import EmailTemplatesManager from './EmailTemplatesManager';
import { Tenant } from '../types';
import { toast } from 'sonner';

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
      { id: 'emails', label: 'Templates de E-mail', icon: Mail },
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

    const renderOverview = () => {
    const minRedes = [
      { name: 'Vida em Casa', type: 'Cliente', status: 'Ativo', desc: 'Venda Direta', logo: '👥' },
      { name: 'Saúde em Casa', type: 'Revenda Whitelabel', status: 'Ativo', desc: 'Plano Enterprise', logo: '⚕️' },
      { name: 'Cuidar Mais', type: 'Revenda Whitelabel', status: 'Ativo', desc: 'Plano Premium', logo: '🛡️' },
      { name: 'Care Plus', type: 'Cliente', status: 'Ativo', desc: 'Plano Profissional', logo: '🏥' },
      { name: 'Bem Viver Home Care', type: 'Cliente', status: 'Ativo', desc: 'Plano Essencial', logo: '🏘️' },
      { name: 'Viver Melhor', type: 'Revenda Whitelabel', status: 'Ativo', desc: 'Plano Standard', logo: '⚕️' },
    ];

    const chartMonths = ['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'];
    const vendasDiretas = [20, 30, 45, 50, 60, 75];
    const revendasWhitelabel = [10, 15, 20, 35, 45, 50];
    const maxVal = 125;

    return (
      <div className="space-y-6 animate-fade-in -mt-4">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 via-teal-50 to-emerald-50 p-8 shadow-sm border border-emerald-100">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">BEM-VINDO(A), FLUO! 👋</h2>
            <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Gestão completa para o mercado de Home Care</h1>
            <p className="text-gray-600 text-base">Venda direta, gerencie revendas Whitelabel e expanda o cuidado para mais pessoas.</p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-100/50 flex items-center justify-center p-8 hidden md:flex">
             <div className="text-right">
               <p className="text-emerald-800 italic font-medium">"Tecnologia que aproxima o cuidado de quem precisa."</p>
               <div className="w-8 h-1 bg-emerald-500 ml-auto mt-3"></div>
             </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500"><ShoppingCart className="w-5 h-5" /></div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Vendas Totais</p>
            <h3 className="text-2xl font-bold text-gray-900">R$ 128.430</h3>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3" /> + 12% este mês
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-500"><UserCheck className="w-5 h-5" /></div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Clientes Ativos</p>
            <h3 className="text-2xl font-bold text-gray-900">142</h3>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3" /> + 8% este mês
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-500"><Box className="w-5 h-5" /></div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Revendas Whitelabel</p>
            <h3 className="text-2xl font-bold text-gray-900">8</h3>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3" /> + 2 novas este mês
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-500"><Package className="w-5 h-5" /></div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Planos Ativos</p>
            <h3 className="text-2xl font-bold text-gray-900">316</h3>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3" /> + 18% este mês
            </p>
          </div>
        </div>

        {/* Minhas Redes & Acesso Rapido */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 rounded-lg text-white"><Share2 className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Minhas Redes</h3>
                  <p className="text-xs text-gray-500">Clientes e revendas conectados à sua plataforma.</p>
                </div>
              </div>
              <button className="text-sm text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1">Ver todos <ChevronRight className="w-4 h-4"/></button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {minRedes.map((item, idx) => (
                <div key={idx} className="flex flex-col p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow cursor-pointer relative group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-xl shadow-sm border border-gray-100 flex-shrink-0">
                      {item.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm truncate">{item.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${item.type === 'Cliente' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{item.type}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-medium text-emerald-600"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {item.status}</span>
                        <span>•</span>
                        <span className="truncate">{item.desc}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
             <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-600 rounded-lg text-white"><Zap className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Acesso rápido</h3>
                  <p className="text-xs text-gray-500">Ações mais utilizadas no dia a dia.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button className="flex items-center p-3 rounded-xl border border-green-100 bg-green-50/50 hover:bg-green-50 transition-colors text-left group">
                  <div className="w-10 h-10 rounded-lg bg-green-600 text-white flex items-center justify-center flex-shrink-0 mr-3">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-green-800 text-sm">Nova Venda</h4>
                    <p className="text-[11px] text-green-600/80">Venda direta ao Home Care</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-green-600 opacity-50 group-hover:opacity-100" />
                </button>

                <button onClick={() => document.getElementById('btn-nova-revenda')?.click()} className="flex items-center p-3 rounded-xl border border-purple-100 bg-purple-50/50 hover:bg-purple-50 transition-colors text-left group">
                  <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mr-3">
                    <Box className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-purple-800 text-sm">Nova Revenda</h4>
                    <p className="text-[11px] text-purple-600/80">Cadastrar Whitelabel</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-600 opacity-50 group-hover:opacity-100" />
                </button>

                <button className="flex items-center p-3 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors text-left group">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mr-3">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-800 text-sm">Gerenciar Clientes</h4>
                    <p className="text-[11px] text-blue-600/80">Acessar base de clientes</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-600 opacity-50 group-hover:opacity-100" />
                </button>

                <button onClick={() => { const btn = document.querySelector('button[aria-label="Planos"]') as HTMLButtonElement; if (btn) btn.click(); }} className="flex items-center p-3 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 transition-colors text-left group">
                  <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0 mr-3">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-amber-800 text-sm">Criar Plano</h4>
                    <p className="text-[11px] text-amber-700/80">Configurar produtos e planos</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600 opacity-50 group-hover:opacity-100" />
                </button>
              </div>
          </div>
        </div>

        {/* Evolucao & Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
             <div className="flex items-start justify-between mb-6">
               <div className="flex items-center gap-2">
                 <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Activity className="w-5 h-5" /></div>
                 <div>
                   <h3 className="font-bold text-gray-900">Evolução de vendas</h3>
                   <p className="text-xs text-gray-500">Comparativo de vendas (direta e revendas) nos últimos 6 meses.</p>
                 </div>
               </div>
               <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 font-medium outline-none">
                 <option>Últimos 6 meses</option>
               </select>
             </div>
             
             <div className="flex items-center justify-center gap-6 mb-4">
               <div className="flex items-center gap-2 text-xs font-semibold text-gray-600"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Vendas Diretas</div>
               <div className="flex items-center gap-2 text-xs font-semibold text-gray-600"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Revendas Whitelabel</div>
             </div>

             <div className="h-48 relative w-full mt-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100, 125].map((val, i) => {
                    const y = 200 - (val / maxVal) * 200;
                    return (
                      <g key={i}>
                        <line x1="30" y1={y} x2="600" y2={y} stroke="#f3f4f6" strokeWidth="1" />
                        <text x="0" y={y + 4} fill="#9ca3af" fontSize="10">{val}k</text>
                      </g>
                    );
                  })}
                  
                  {/* Lines and Points */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    points={vendasDiretas.map((val, i) => `${30 + i * 114},${200 - (val / maxVal) * 200}`).join(' ')}
                  />
                  {vendasDiretas.map((val, i) => (
                    <circle key={`vd-${i}`} cx={30 + i * 114} cy={200 - (val / maxVal) * 200} r="4" fill="#10b981" />
                  ))}

                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    points={revendasWhitelabel.map((val, i) => `${30 + i * 114},${200 - (val / maxVal) * 200}`).join(' ')}
                  />
                  {revendasWhitelabel.map((val, i) => (
                    <circle key={`rw-${i}`} cx={30 + i * 114} cy={200 - (val / maxVal) * 200} r="4" fill="#3b82f6" />
                  ))}

                  {/* X Axis Labels */}
                  {chartMonths.map((m, i) => (
                    <text key={i} x={30 + i * 114} y="220" fill="#9ca3af" fontSize="10" textAnchor="middle">{m}</text>
                  ))}
                </svg>
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-2">
                 <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><ShieldCheck className="w-5 h-5" /></div>
                 <div>
                   <h3 className="font-bold text-gray-900">Status da plataforma</h3>
                   <p className="text-[11px] text-gray-500">Todos os serviços funcionando.</p>
                 </div>
               </div>
               <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-emerald-100">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Operacional
               </div>
            </div>

            <div className="space-y-4">
              {[
                { name: 'Plataforma', p: '100%' },
                { name: 'Base de dados', p: '100%' },
                { name: 'Processamento de vendas', p: '100%' },
                { name: 'Área de revendas Whitelabel', p: '100%' },
                { name: 'Integrações e APIs', p: '100%' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <CheckCircle className="w-4 h-4 text-emerald-500" />
                     <span className="text-sm text-gray-700 font-medium">{s.name}</span>
                   </div>
                   <span className="text-sm font-bold text-emerald-600">{s.p}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl font-medium text-xs">
               <CheckCircle className="w-4 h-4" /> Todos os serviços estão operando normalmente.
            </div>
          </div>
        </div>

      </div>
    );
  };

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
            onClick={() => toast.info('Filtro de tenants - em breve mais opções')}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Revendas Table */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Revendas (Tenants Principais)
          </h3>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">ID / Nome da Instância</th>
                    <th className="p-4">Plano</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Domínio / Cor Primária</th>
                    <th className="p-4 text-right pr-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resellers.map((tenant) => (
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
                          <button
                            onClick={() => {
                              useHomeCareStore.getState().startImpersonation(tenant.id);
                              onExit('dashboard');
                            }}
                            className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Acessar como"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                          </button>
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
                  {resellers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        Nenhuma revenda localizada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Clínicas Clientes Table */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Clínicas Clientes (Sub-tenants)
          </h3>
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="p-4 pl-6">ID / Nome da Instância</th>
                    <th className="p-4">Revenda Vinculada</th>
                    <th className="p-4">Plano</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Domínio / Cor Primária</th>
                    <th className="p-4 text-right pr-6">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clinics.map((tenant) => {
                    const parent = tenants.find((t) => t.id === tenant.parentId);
                    return (
                      <tr key={tenant.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-lg shadow-sm border border-gray-200">
                              {tenant.logo || '🏥'}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">{tenant.name}</div>
                              <div className="text-xs text-gray-500">ID: {tenant.id} • CNPJ: {tenant.cnpj}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium text-gray-700">
                            {parent ? parent.name : 'Desconhecida'}
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
                            <button
                              onClick={() => {
                                useHomeCareStore.getState().startImpersonation(tenant.id);
                                onExit('dashboard');
                              }}
                              className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Acessar como"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                            </button>
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
                    );
                  })}
                  {clinics.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        Nenhuma clínica cliente localizada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
      case 'emails':
        return <EmailTemplatesManager scope="system" />;
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
        {activeSection !== 'overview' && (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
            <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
          </div>
        )}
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

