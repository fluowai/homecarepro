import React, { useState, useEffect } from 'react';
import { Package, Plus, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SaaSPlan } from '../types';

export function PlanManager() {
  const [plans, setPlans] = useState<SaaSPlan[]>([]);
  const [loading, setLoading] = useState(true);

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
          price: p.price,
          maxPatients: p.max_patients,
          maxUsers: p.max_users,
          features: p.features || []
        })));
      }
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
    } finally {
      setLoading(false);
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
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm">
          <Plus className="w-4 h-4" />
          <span>Novo Plano</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col">
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
            
            <button className="w-full py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
              Editar Plano
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
