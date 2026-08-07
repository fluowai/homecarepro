import React, { useEffect, useState } from 'react';
import { Mail, Lock, User, Loader2, Heart, Building2, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHomeCareStore } from '../store';

interface InviteInfo {
  id: string;
  email: string;
  role: 'super_admin' | 'admin';
  tenant: { id: string; name: string; logo: string; primaryColor?: string; secondaryColor?: string };
}

interface InviteAcceptViewProps {
  token: string;
}

export default function InviteAcceptView({ token }: InviteAcceptViewProps) {
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const init = useHomeCareStore((s) => s.init);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Convite inválido.');
          return;
        }
        if (!cancelled) setInvite(data);
      } catch {
        setError('Falha ao validar o convite. Tente novamente.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const primaryColor = invite?.tenant.primaryColor || '#16a34a';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) {
      setError('Informe seu nome completo.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, fullName: fullName.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Falha ao criar a conta.');
        return;
      }

      // Auto login with the newly created account
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite!.email,
        password,
      });
      if (signInError) {
        setSuccess(true);
        return;
      }
      setSuccess(true);
      await init();
      window.location.href = '/';
    } catch {
      setError('Falha ao conectar com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg" style={{ backgroundColor: primaryColor }}>
            {invite?.tenant.logo ? (
              <img src={invite.tenant.logo} alt="" className="w-10 h-10 object-contain" />
            ) : (
              <Heart className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{invite?.tenant.name || 'HomeCare Pro'}</h1>
          <p className="text-slate-500 mt-1">Convite para acesso à plataforma</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Validando convite...</p>
            </div>
          ) : error && !invite ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500" />
              <p className="text-sm text-slate-600">{error}</p>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
              <h3 className="text-lg font-semibold text-slate-900">Conta criada com sucesso!</h3>
              <p className="text-sm text-slate-500">Você será redirecionado para o painel.</p>
            </div>
          ) : invite ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-6">
                <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-slate-800">{invite.tenant.name}</p>
                  <p className="text-slate-500 text-xs">
                    Você será o {invite.role === 'super_admin' ? 'Super Admin (Revenda Whitelabel)' : 'Administrador (Clínica)'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail (convidado)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={invite.email}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition"
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition"
                      placeholder="Repita a senha"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar minha conta'
                  )}
                </button>
              </form>
            </>
          ) : null}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          HomeCare Pro — Convite de acesso seguro
        </p>
      </div>
    </div>
  );
}
