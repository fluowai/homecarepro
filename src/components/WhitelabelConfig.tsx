import React, { useState, useEffect } from 'react';
import { Settings, Globe, Palette, Upload, Loader2, Save } from 'lucide-react';
import { useHomeCareStore } from '../store';
import { supabase } from '../lib/supabase';

export function WhitelabelConfig() {
  const profile = useHomeCareStore((s) => s.profile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [config, setConfig] = useState({
    customDomain: '',
    primaryColor: '#0066FF',
    secondaryColor: '#E6F0FF',
    logo: ''
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('custom_domain, primary_color, secondary_color, logo')
        .eq('id', profile?.tenant_id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setConfig({
          customDomain: data.custom_domain || '',
          primaryColor: data.primary_color || '#0066FF',
          secondaryColor: data.secondary_color || '#E6F0FF',
          logo: data.logo || ''
        });
      }
    } catch (err) {
      console.error('Failed to load tenant config', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const res = await fetch('/api/tenant/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Falha ao salvar configuração');
      }
      
      setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações Whitelabel (Revenda)</h1>
          <p className="text-gray-500">Personalize a aparência e o domínio da sua plataforma.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSave} className="p-6 space-y-8">
          
          {message.text && (
            <div className={`p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}

          {/* Domínio */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b pb-2">
              <Globe className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">Domínio Personalizado</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seu Domínio
                </label>
                <input
                  type="text"
                  placeholder="app.suamarca.com.br"
                  value={config.customDomain}
                  onChange={(e) => setConfig({ ...config, customDomain: e.target.value })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Para que o domínio funcione, configure no seu painel de DNS um apontamento tipo <strong>A</strong> ou <strong>CNAME</strong> para o IP ou domínio do nosso servidor.
                </p>
              </div>
            </div>
          </div>

          {/* Identidade Visual */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b pb-2">
              <Palette className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">Identidade Visual</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor Primária
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="h-10 w-10 p-1 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cor Secundária
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={config.secondaryColor}
                    onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                    className="h-10 w-10 p-1 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.secondaryColor}
                    onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                    className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL da Logomarca
                </label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    placeholder="https://exemplo.com/logo.png"
                    value={config.logo}
                    onChange={(e) => setConfig({ ...config, logo: e.target.value })}
                    className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                {config.logo && (
                  <div className="mt-4 p-4 bg-gray-50 border rounded-lg inline-block">
                    <img src={config.logo} alt="Logo preview" className="h-12 object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
