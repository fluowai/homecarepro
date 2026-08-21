import React, { useState, useEffect } from 'react';
import { 
  Mail, Plus, Edit, Trash2, Save, X, Eye, EyeOff, 
  Code, Send, Copy, Check, Search, RefreshCw, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { useHomeCareStore } from '../store';
import { EmailTemplate } from '../types';

interface EmailTemplatesManagerProps {
  scope: 'system' | 'tenant';
  title?: string;
  subtitle?: string;
}

const DEFAULT_VARIABLES: Record<string, string[]> = {
  invite: ['inviter_name', 'role_name', 'invite_link'],
  appointment_reminder: ['patient_name', 'professional_name', 'appointment_date', 'appointment_time', 'clinic_address'],
  visit_confirmation: ['patient_name', 'visit_date', 'professional_name', 'report_summary'],
  survey_request: ['patient_name', 'survey_link', 'professional_name'],
  payment_receipt: ['patient_name', 'amount', 'due_date', 'payment_link'],
  overdue_invoice: ['patient_name', 'amount', 'due_date', 'invoice_number'],
};

const TEMPLATE_NAMES = [
  { value: 'invite', label: 'Convite de Usuário' },
  { value: 'appointment_reminder', label: 'Lembrete de Consulta' },
  { value: 'visit_confirmation', label: 'Confirmação de Visita' },
  { value: 'survey_request', label: 'Pesquisa de Satisfação' },
  { value: 'payment_receipt', label: 'Comprovante de Pagamento' },
  { value: 'overdue_invoice', label: 'Fatura Vencida' },
];

export default function EmailTemplatesManager({ 
  scope, 
  title = 'Templates de E-mail', 
  subtitle = 'Gerencie os modelos de e-mail usados pelo sistema.' 
}: EmailTemplatesManagerProps) {
  const { 
    emailTemplates, 
    addEmailTemplate, 
    updateEmailTemplate, 
    deleteEmailTemplate,
    renderEmailTemplate,
    profile,
    currentUserRole,
    activeTenantId 
  } = useHomeCareStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewResult, setPreviewResult] = useState<{ subject: string; html: string; text?: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visibleTemplates = emailTemplates.filter(t => {
    if (scope === 'system') return t.type === 'system' || t.tenantId === null;
    if (scope === 'tenant') return t.type === 'tenant' || t.tenantId === activeTenantId;
    return t.tenantId === activeTenantId;
  }).filter(t => 
    searchQuery === '' || 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate({ ...template });
    setIsCreating(false);
  };

  const handleCreate = () => {
    const defaultTemplate: EmailTemplate = {
      id: '',
      tenantId: scope === 'system' ? null : activeTenantId,
      name: 'invite',
      type: scope === 'system' ? 'system' : 'tenant',
      description: '',
      subject: '{{role_name}} - Você foi convidado para acessar o HomeCare Pro',
      htmlContent: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h2>Convite</h2><p>{{inviter_name}} convidou você como {{role_name}}.</p><p><a href="{{invite_link}}">Aceitar Convite</a></p></div>',
      textContent: '',
      variables: DEFAULT_VARIABLES['invite'] || [],
      isActive: true,
      isDefault: false,
      createdAt: '',
      updatedAt: '',
    };
    setEditingTemplate(defaultTemplate);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    
    const required = ['name', 'subject', 'htmlContent'];
    for (const field of required) {
      if (!editingTemplate[field as keyof EmailTemplate]) {
        toast.error(`O campo ${field} é obrigatório.`);
        return;
      }
    }

    try {
      if (isCreating) {
        await addEmailTemplate({
          tenantId: scope === 'system' ? null : activeTenantId,
          name: editingTemplate.name,
          type: scope === 'system' ? 'system' : 'tenant',
          description: editingTemplate.description,
          subject: editingTemplate.subject,
          htmlContent: editingTemplate.htmlContent,
          textContent: editingTemplate.textContent,
          variables: editingTemplate.variables,
          isActive: editingTemplate.isActive,
          isDefault: false,
        });
        toast.success('Template criado com sucesso!');
      } else {
        await updateEmailTemplate(editingTemplate.id, editingTemplate);
        toast.success('Template atualizado com sucesso!');
      }
      setEditingTemplate(null);
      setIsCreating(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar template.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEmailTemplate(id);
      toast.success('Template excluído.');
    } catch (err) {
      toast.error('Erro ao excluir template.');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePreview = async () => {
    if (!editingTemplate) return;
    
    setPreviewLoading(true);
    const previewVars: Record<string, string> = {
      'inviter_name': 'Dr. João Silva',
      'role_name': 'admin',
      'invite_link': 'https://homecare.wootech.com.br/?invite=abc123',
      'patient_name': 'Maria Santos',
      'professional_name': 'Enf. Ana Costa',
      'appointment_date': '15/08/2026',
      'appointment_time': '14:30',
      'clinic_name': 'Clínica HomeCare Pro',
    };

    try {
      const renderedHtml = renderEmailTemplate(editingTemplate, previewVars);
      
      const renderResponse = await fetch('/api/email-templates/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: editingTemplate.id || undefined,
          name: editingTemplate.id ? undefined : editingTemplate.name,
          variables: previewVars,
        }),
      });

      if (renderResponse.ok) {
        const data = await renderResponse.json();
        setPreviewResult({
          subject: data.subject || editingTemplate.subject,
          html: data.html || renderedHtml,
          text: data.text,
        });
      } else {
        setPreviewResult({
          subject: editingTemplate.subject,
          html: renderedHtml,
          text: editingTemplate.textContent,
        });
      }
      setShowPreview(true);
    } catch (err) {
      const renderedHtml = renderEmailTemplate(editingTemplate, previewVars);
      setPreviewResult({
        subject: editingTemplate.subject,
        html: renderedHtml,
        text: editingTemplate.textContent,
      });
      setShowPreview(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCopyTemplate = (tmpl: EmailTemplate) => {
    navigator.clipboard.writeText(tmpl.htmlContent);
    toast.success('HTML copiado para área de transferência!');
  };

  if (editingTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">
            {isCreating ? 'Novo Template' : 'Editar Template'}
          </h2>
          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={previewLoading}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              {previewLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {previewLoading ? 'Renderizando...' : 'Visualizar'}
            </button>
            <button
              onClick={() => { setEditingTemplate(null); setIsCreating(false); }}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Salvar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Template</label>
              <select
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value, variables: DEFAULT_VARIABLES[e.target.value] || [] })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                disabled={!isCreating}
              >
                {TEMPLATE_NAMES.map(tmpl => (
                  <option key={tmpl.value} value={tmpl.value}>{tmpl.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
              <input
                type="text"
                value={editingTemplate.description || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                placeholder="Descreva quando este template é usado..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={editingTemplate.isActive}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">Template ativo</label>
            </div>

            {editingTemplate.variables.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Variáveis Disponíveis</label>
                <div className="flex flex-wrap gap-1">
                  {editingTemplate.variables.map((v) => (
                    <span key={v} className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded-md font-mono">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {showPreview && previewResult && (
              <button
                onClick={() => setShowPreview(false)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded-xl transition-colors"
              >
                Fechar Visualização
              </button>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assunto do E-mail</label>
              <input
                type="text"
                value={editingTemplate.subject}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                <span>Conteúdo HTML</span>
                <button
                  onClick={() => handleCopyTemplate(editingTemplate)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  title="Copiar HTML"
                >
                  <Copy className="w-3 h-3" /> Copiar
                </button>
              </label>
              <textarea
                value={editingTemplate.htmlContent}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, htmlContent: e.target.value })}
                rows={20}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-y"
                placeholder="<div>Seu conteúdo HTML aqui...</div>"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Conteúdo de Texto (opcional)</label>
              <textarea
                value={editingTemplate.textContent || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, textContent: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-y"
                placeholder="Versão em texto puro do e-mail..."
              />
            </div>
          </div>
        </div>

        {showPreview && previewResult && (
          <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-gray-500" /> Visualização do E-mail
                </h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Assunto</label>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{previewResult.subject}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Conteúdo</label>
                  <div 
                    className="mt-2 border border-gray-200 rounded-lg p-4 bg-gray-50 overflow-y-auto max-h-[500px]"
                    dangerouslySetInnerHTML={{ __html: previewResult.html }}
                  />
                </div>
                {previewResult.text && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Texto Puro</label>
                    <pre className="mt-2 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-4 whitespace-pre-wrap overflow-y-auto max-h-[200px]">
                      {previewResult.text}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
          <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar templates..."
          className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 w-full max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {visibleTemplates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50/50 border border-gray-200 rounded-2xl">
          <Mail className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <h4 className="font-bold text-gray-700 text-sm mb-1">Nenhum template encontrado</h4>
          <p className="text-xs text-gray-500 mb-4">
            {searchQuery ? 'Nenhum template corresponde à busca.' : 'Comece criando seu primeiro template de e-mail.'}
          </p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Criar Template
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Template</th>
                  <th className="p-4">Assunto</th>
                  <th className="p-4">Variáveis</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-right pr-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleTemplates.map((tmpl) => (
                  <tr key={tmpl.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{TEMPLATE_NAMES.find(t => t.value === tmpl.name)?.label || tmpl.name}</div>
                          <div className="text-xs text-gray-400">{tmpl.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-700 max-w-xs truncate">{tmpl.subject}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {tmpl.variables.slice(0, 3).map((v) => (
                          <code key={v} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {`{{${v}}}`}
                          </code>
                        ))}
                        {tmpl.variables.length > 3 && (
                          <span className="text-xs text-gray-400">+{tmpl.variables.length - 3} mais</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {tmpl.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full">
                          <EyeOff className="w-3 h-3" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${
                        tmpl.type === 'system' 
                          ? 'bg-purple-50 text-purple-700' 
                          : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {tmpl.type === 'system' ? 'Sistema' : 'Clínica'}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        {tmpl.isDefault ? null : (
                          <button
                            onClick={() => {
                              setEditingTemplate(tmpl);
                              setIsCreating(false);
                            }}
                            className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {!tmpl.isDefault && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Excluir template "${tmpl.name}"? Esta ação não pode ser desfeita.`)) {
                                setDeletingId(tmpl.id);
                                await handleDelete(tmpl.id);
                              }
                            }}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
