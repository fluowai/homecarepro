import React, { useEffect, useState } from 'react';
import { Building2, Loader2, Mail, MapPin, Phone, Save, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHomeCareStore } from '../store';

type CompanyProfile = {
  companyLegalName: string;
  companyTradeName: string;
  cnpj: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  companyAddress: string;
  companyAddressNumber: string;
  companyAddressComplement: string;
  companyNeighborhood: string;
  companyCity: string;
  companyState: string;
  companyZipCode: string;
};

const EMPTY_PROFILE: CompanyProfile = {
  companyLegalName: '', companyTradeName: '', cnpj: '', companyEmail: '', companyPhone: '',
  companyWebsite: '', companyAddress: '', companyAddressNumber: '', companyAddressComplement: '',
  companyNeighborhood: '', companyCity: '', companyState: '', companyZipCode: '',
};

const fields: Array<{ key: keyof CompanyProfile; label: string; type?: string; placeholder?: string }> = [
  { key: 'companyLegalName', label: 'Razão social', placeholder: 'Nome empresarial registrado' },
  { key: 'companyTradeName', label: 'Nome fantasia', placeholder: 'Nome usado pela empresa' },
  { key: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
  { key: 'companyEmail', label: 'E-mail da empresa', type: 'email', placeholder: 'contato@empresa.com.br' },
  { key: 'companyPhone', label: 'Telefone da empresa', type: 'tel', placeholder: '(00) 00000-0000' },
  { key: 'companyWebsite', label: 'Site', type: 'url', placeholder: 'https://empresa.com.br' },
];

function inputClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500';
}

export default function CompanyProfileView({ title = 'Dados da Empresa', subtitle }: { title?: string; subtitle?: string }) {
  const profile = useHomeCareStore((s) => s.profile);
  const currentTenant = useHomeCareStore((s) => s.tenants.find((tenant) => tenant.id === s.activeTenantId));
  const [data, setData] = useState<CompanyProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>({ text: '' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!profile?.tenant_id) return;
      setLoading(true);
      const { data: tenant, error } = await supabase.from('tenants')
        .select('cnpj, company_legal_name, company_trade_name, company_email, company_phone, company_website, company_address, company_address_number, company_address_complement, company_neighborhood, company_city, company_state, company_zip_code')
        .eq('id', profile.tenant_id)
        .single();
      if (!cancelled) {
        if (error) setMessage({ text: 'Não foi possível carregar os dados da empresa.', error: true });
        else setData({
          companyLegalName: tenant?.company_legal_name || '', companyTradeName: tenant?.company_trade_name || '',
          cnpj: tenant?.cnpj || '', companyEmail: tenant?.company_email || '', companyPhone: tenant?.company_phone || '',
          companyWebsite: tenant?.company_website || '', companyAddress: tenant?.company_address || '',
          companyAddressNumber: tenant?.company_address_number || '', companyAddressComplement: tenant?.company_address_complement || '',
          companyNeighborhood: tenant?.company_neighborhood || '', companyCity: tenant?.company_city || '',
          companyState: tenant?.company_state || '', companyZipCode: tenant?.company_zip_code || '',
        });
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [profile?.tenant_id]);

  const update = (key: keyof CompanyProfile, value: string) => setData((current) => ({ ...current, [key]: value }));

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setMessage({ text: '' });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch('/api/tenant/company-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Falha ao salvar dados da empresa.');
      setMessage({ text: 'Dados da empresa salvos com sucesso.' });
    } catch (error: any) {
      setMessage({ text: error.message || 'Falha ao salvar dados da empresa.', error: true });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-600" /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><Building2 className="h-6 w-6 text-indigo-600" />{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle || `Mantenha os dados oficiais de ${currentTenant?.name || 'sua organização'} atualizados.`}</p>
      </header>
      <form onSubmit={handleSave} className="space-y-7 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        {message.text && <div className={`rounded-lg p-3 text-sm ${message.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{message.text}</div>}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 border-b pb-2 text-base font-semibold text-gray-900"><Building2 className="h-4 w-4 text-gray-500" />Identificação</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {fields.map((field) => <label key={field.key} className="text-sm font-medium text-gray-700">{field.label}<input type={field.type || 'text'} value={data[field.key]} placeholder={field.placeholder} onChange={(e) => update(field.key, e.target.value)} className={`${inputClass()} mt-1 font-normal`} /></label>)}
          </div>
        </section>
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 border-b pb-2 text-base font-semibold text-gray-900"><MapPin className="h-4 w-4 text-gray-500" />Endereço</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="text-sm font-medium text-gray-700 md:col-span-3">Logradouro<input value={data.companyAddress} onChange={(e) => update('companyAddress', e.target.value)} className={`${inputClass()} mt-1 font-normal`} /></label>
            <label className="text-sm font-medium text-gray-700">Número<input value={data.companyAddressNumber} onChange={(e) => update('companyAddressNumber', e.target.value)} className={`${inputClass()} mt-1 font-normal`} /></label>
            <label className="text-sm font-medium text-gray-700 md:col-span-2">Complemento<input value={data.companyAddressComplement} onChange={(e) => update('companyAddressComplement', e.target.value)} className={`${inputClass()} mt-1 font-normal`} /></label>
            <label className="text-sm font-medium text-gray-700 md:col-span-2">Bairro<input value={data.companyNeighborhood} onChange={(e) => update('companyNeighborhood', e.target.value)} className={`${inputClass()} mt-1 font-normal`} /></label>
            <label className="text-sm font-medium text-gray-700 md:col-span-2">Cidade<input value={data.companyCity} onChange={(e) => update('companyCity', e.target.value)} className={`${inputClass()} mt-1 font-normal`} /></label>
            <label className="text-sm font-medium text-gray-700">UF<input maxLength={2} value={data.companyState} onChange={(e) => update('companyState', e.target.value.toUpperCase())} className={`${inputClass()} mt-1 font-normal`} /></label>
            <label className="text-sm font-medium text-gray-700">CEP<input value={data.companyZipCode} onChange={(e) => update('companyZipCode', e.target.value)} className={`${inputClass()} mt-1 font-normal`} /></label>
          </div>
        </section>
        <div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar dados'}</button></div>
      </form>
    </div>
  );
}
