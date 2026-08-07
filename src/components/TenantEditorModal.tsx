import React, { useState, useEffect } from 'react';
import { X, Globe, Palette, Save, AlertTriangle, CheckCircle, ShieldAlert, Edit3, Sparkles, Mail } from 'lucide-react';
import { useHomeCareStore } from '../store';
import { Tenant } from '../types';
import { InviteLinkModal } from './InviteLinkModal';

interface TenantEditorModalProps {
  tenant: Tenant;
  isCreating?: boolean;
  onClose: () => void;
}

export function TenantEditorModal({ tenant, isCreating = false, onClose }: TenantEditorModalProps) {
  const { updateTenant, createTenantWithInvite } = useHomeCareStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const [name, setName] = useState(tenant.name || '');
  const [logo, setLogo] = useState(tenant.logo || '\u{1F3EC}');
  const [cnpj, setCnpj] = useState(tenant.cnpj || '');
  const [customDomain, setCustomDomain] = useState(tenant.customDomain || '');
  const [primaryColor, setPrimaryColor] = useState(tenant.primaryColor || '#16a34a');
  const [status, setStatus] = useState(tenant.status || 'active');
  const [plan, setPlan] = useState(tenant.plan || 'Free');
  const [adminEmail, setAdminEmail] = useState('');
  const [tenantType, setTenantType] = useState<'homecare' | 'cooperativa'>(tenant.tenantType || 'homecare');

  useEffect(() => {
    setName(tenant.name || '');
    setLogo(tenant.logo || '\u{1F3EC}');
    setCnpj(tenant.cnpj || '');
    setCustomDomain(tenant.customDomain || '');
    setPrimaryColor(tenant.primaryColor || '#16a34a');
    setStatus(tenant.status || 'active');
    setPlan(tenant.plan || 'Free');
    setAdminEmail('');
    setTenantType(tenant.tenantType || 'homecare');
  }, [tenant]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Nome da inst\u00e2ncia \u00e9 obrigat\u00f3rio.');
      return;
    }
    if (isCreating && !adminEmail.trim()) {
      alert('Informe o e-mail do administrador para gerar o link de convite.');
      return;
    }
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 400));

      if (isCreating) {
        const { inviteLink } = await createTenantWithInvite({
          name,
          logo,
          cnpj,
          plan,
          customDomain: customDomain || undefined,
          primaryColor,
          adminEmail,
          tenantType,
        });
        setInviteLink(inviteLink);
        setSuccess(true);
        return;
      }
      updateTenant(tenant.id, {
        name,
        logo,
        cnpj,
        customDomain: customDomain || undefined,
        primaryColor,
        status,
        plan,
        tenantType,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {isCreating ? <Sparkles className="w-5 h-5 text-indigo-600" /> : <Edit3 className="w-5 h-5 text-indigo-600" />}
              {isCreating ? 'Nova Revenda' : 'Editar Tenant'}
            </h3>
            {!isCreating && (
              <p className="text-sm text-gray-500">{tenant.name} ({tenant.id})</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {success && !inviteLink && (
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-3 border border-emerald-100 animate-slide-up">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <p className="text-sm font-medium">
                {isCreating ? 'Revenda criada com sucesso!' : 'Configurações salvas com sucesso!'}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-gray-500" />
              Informações Básicas
            </h4>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Instância</label>
              <input
                type="text"
                placeholder="Ex: HomeCare Pro São Paulo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Organização</label>
              <select
                value={tenantType}
                onChange={(e) => setTenantType(e.target.value as 'homecare' | 'cooperativa')}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors bg-white"
              >
                <option value="homecare">Home Care (Gestão de Pacientes e Visitas)</option>
                <option value="cooperativa">Cooperativa (Gestão de Escalas e Repasses)</option>
              </select>
            </div>
            {isCreating && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">E-mail do Administrador (Revenda)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="admin@revenda.com.br"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  O sistema gerará um link de convite. A revenda criará a conta com e-mail e senha.
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CNPJ</label>
              <input
                type="text"
                placeholder="12.345.678/0001-99"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Logo (emoji ou URL)</label>
              <input
                type="text"
                placeholder={'🏢'}
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-500" />
              Domínio Personalizado
            </h4>
            <div>
              <input
                type="text"
                placeholder="ex: app.clinica.com.br"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">Configure o DNS apontando para o CNAME do sistema.</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Palette className="w-4 h-4 text-pink-500" />
              Branding
            </h4>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cor Primária</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Controle de Acesso e Plano
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Plano Atual</label>
                <select 
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors bg-white"
                >
                  <option value="Free">Free</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                  <option value="Mega">Mega</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors bg-white"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </div>
            </div>

            {status === 'blocked' && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex gap-3 text-red-700 text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <p>O tenant bloqueado não poderá acessar o sistema. Os usuários verão uma tela de suspensão.</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          {!inviteLink && (
            <button
              onClick={handleSave}
              disabled={loading || success}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? 'Salvando...' : (
                <>
                  <Save className="w-4 h-4" />
                  {isCreating ? 'Criar Revenda' : 'Salvar Alterações'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {inviteLink && (
        <InviteLinkModal
          inviteLink={inviteLink}
          title="Link de Convite da Revenda"
          description="A revenda usará este link para criar a conta com e-mail e senha."
          onClose={onClose}
        />
      )}
    </div>
  );
}
