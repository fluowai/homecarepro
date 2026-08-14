import React, { useState, useEffect } from 'react';
import { Package, Plus, Check, Loader2, X, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SaaSPlan } from '../types';

type Feedback = { text: string; type: 'success' | 'error' } | null;

const emptyForm = { name: '', price: '', maxPatients: '', maxUsers: '', features: '' };

export function PlanManager() {
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saas_plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;

      if (data) {
        setPlans(data.map(p => ({
          id: p.id,
          name: p.name,
          price: Number(p.price ?? 0),
          maxPatients: Number(p.max_patients ?? 0),
          maxUsers: Number(p.max_users ?? 0),
          features: Array.isArray(p.features) ? p.features : [],
        })));
      }
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (plan: SaaSPlan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      price: String(plan.price),
      maxPatients: String(plan.maxPatients),
      maxUsers: String(plan.maxUsers),
      features: (plan.features || []).join(', '),
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFeedback({ text: 'Informe o nome do plano.', type: 'error' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price || 0),
        max_patients: Number(form.maxPatients || 0),
        max_users: Number(form.maxUsers || 0),
        features: form.features.split(',').map(f => f.trim()).filter(Boolean),
      };

      if (editingId) {
        const { error } = await supabase.from('saas_plans').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saas_plans').insert({ id: `plan-${Date.now()}`, ...payload });
        if (error) throw error;
      }

      setFeedback({ text: editingId ? 'Plano atualizado com sucesso.' : 'Plano criado com sucesso.', type: 'success' });
      setShowModal(false);
      loadPlans();
    } catch (err: any) {
      setFeedback({ text: err.message || 'Falha ao salvar o plano.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o plano "${name}"?`)) return;
    try {
      const { error } = await supabase.from('saas_plans').delete().eq('id', id);
      if (error) throw error;
      setFeedback({ text: 'Plano excluído.', type: 'success' });
      loadPlans();
    } catch (err: any) {
      setFeedback({ text: err.message || 'Falha ao excluir o plano.', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Planos de Assinatura
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie os pacotes disponíveis para as clínicas e revendas.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Plano</span>
        </button>
      </div>

      {feedback && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col relative group">
            <button
              onClick={() => handleDelete(plan.id, plan.name)}
              className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              title="Excluir plano"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="mb-4">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase rounded-full tracking-wider">
                {plan.name}
              </span>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-bold text-gray-900">
                {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
              </span>
              {plan.price > 0 && <span className="text-gray-500 text-sm">/mês</span>}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Até <strong>{plan.maxPatients}</strong> pacientes</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Até <strong>{plan.maxUsers}</strong> usuários</span>
              </li>
              {plan.features.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => openEdit(plan)}
              className="w-full py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Editar Plano
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Plano' : 'Novo Plano'}</h3>
                <p className="text-sm text-gray-500">Os limites entram em vigor imediatamente.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Plano</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="Ex: Pro"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$/mês)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Pacientes</label>
                  <input
                    type="number"
                    min={0}
                    value={form.maxPatients}
                    onChange={e => setForm(f => ({ ...f, maxPatients: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Usuários</label>
                  <input
                    type="number"
                    min={0}
                    value={form.maxUsers}
                    onChange={e => setForm(f => ({ ...f, maxUsers: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recursos (separados por vírgula)</label>
                <textarea
                  rows={3}
                  value={form.features}
                  onChange={e => setForm(f => ({ ...f, features: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="App família, Relatórios ilimitados, Suporte prioritário"
                />
              </div>
            </form>
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Salvando...' : 'Salvar Plano'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
