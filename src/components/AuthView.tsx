import React, { useState } from 'react';
import { Mail, Lock, User, Building2, Eye, EyeOff, Loader2, Heart, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHomeCareStore } from '../store';

type AuthMode = 'login' | 'signup' | 'first_access_check' | 'first_access_submit';

export default function AuthView() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [tenantId, setTenantId] = useState('sp');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const init = useHomeCareStore((s) => s.init);
  const tenants = useHomeCareStore((s) => s.tenants);

  const isDemoMode = () => {
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
      return (window as any).__ENV__.VITE_ENABLE_DEMO_MODE === 'true';
    }
    return import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';
  };

  const canSignup = isDemoMode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'first_access_check') {
        const res = await fetch('/api/auth/check-first-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao verificar e-mail');
        if (data.hasPendingInvite) {
          setMode('first_access_submit');
        } else {
          setError('Nenhum convite pendente para este e-mail. Se você já tem conta, faça o login normal.');
        }
        return;
      }

      if (mode === 'first_access_submit') {
        if (!fullName.trim()) throw new Error('O nome é obrigatório.');
        if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
        const res = await fetch('/api/invites/accept-by-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, fullName, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao criar conta');
        
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        await init();
        window.location.href = '/';
        return;
      }

      if (mode === 'signup') {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              tenant_id: tenantId,
              role: 'admin',
            },
          },
        });
        if (authError) throw authError;
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao autenticar';
      if (message.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos.');
      } else if (message.includes('already registered')) {
        setError('Este email já está cadastrado.');
      } else if (message.includes('Password should be at least')) {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
  };

  const isFirstAccess = mode === 'first_access_check' || mode === 'first_access_submit';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4 shadow-lg shadow-green-600/20">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">HomeCare Pro</h1>
          <p className="text-slate-500 mt-1">Gestão de Atendimento Domiciliar</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 relative overflow-hidden">
          {isFirstAccess && (
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className="absolute top-6 left-6 text-slate-400 hover:text-slate-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <h2 className={`text-xl font-semibold text-slate-900 mb-1 ${isFirstAccess ? 'text-center mt-2' : ''}`}>
            {mode === 'login' && 'Entrar na plataforma'}
            {mode === 'signup' && 'Criar conta'}
            {isFirstAccess && 'Primeiro Acesso'}
          </h2>
          <p className={`text-sm text-slate-500 mb-6 ${isFirstAccess ? 'text-center' : ''}`}>
            {mode === 'login' && 'Acesse o painel de gestão domiciliar'}
            {mode === 'signup' && 'Cadastre-se para começar a usar'}
            {mode === 'first_access_check' && 'Informe o seu e-mail para validar o seu convite.'}
            {mode === 'first_access_submit' && 'Crie sua senha para ativar sua conta.'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {!canSignup && mode === 'signup' ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 mb-4">
                O cadastro direto está desativado. Contas são criadas por convite.
              </p>
              <button
                onClick={() => setMode('login')}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Ir para login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && canSignup && (
                <>
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
                        placeholder="Seu nome"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidade / Filial</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={tenantId}
                        onChange={(e) => setTenantId(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition appearance-none bg-white"
                      >
                        {tenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.logo} {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {(mode === 'login' || mode === 'signup' || mode === 'first_access_check' || mode === 'first_access_submit') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={mode === 'first_access_submit'}
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition disabled:bg-slate-50 disabled:text-slate-500"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
              )}

              {mode === 'first_access_submit' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition"
                      placeholder="Ex: João Silva"
                    />
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'signup' || mode === 'first_access_submit') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition"
                      placeholder={mode === 'login' ? '••••••••' : 'Mínimo 6 caracteres'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aguarde...
                  </>
                ) : mode === 'first_access_check' ? (
                  <>Continuar <ArrowRight className="w-4 h-4" /></>
                ) : mode === 'first_access_submit' ? (
                  'Ativar Conta e Entrar'
                ) : mode === 'login' ? (
                  'Entrar'
                ) : (
                  'Criar conta'
                )}
              </button>
            </form>
          )}

          {mode === 'login' && (
            <div className="mt-4 text-center">
              <button
                onClick={() => { setMode('first_access_check'); setError(''); setPassword(''); }}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition flex items-center justify-center gap-1 mx-auto"
              >
                Primeiro Acesso? Crie sua senha
              </button>
            </div>
          )}

          {canSignup && !isFirstAccess && (
            <div className="mt-6 text-center">
              <button onClick={toggleMode} className="text-sm text-green-600 hover:text-green-700 font-medium transition">
                {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          HomeCare Pro v1.0 — Sistema de Gestão Domiciliar
        </p>
      </div>
    </div>
  );
}
