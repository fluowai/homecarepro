import React, { useState } from 'react';
import { Mail, Phone, Lock, User, Building2, Eye, EyeOff, Loader2, Heart, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHomeCareStore } from '../store';
import { normalizeBrazilPhone } from '../lib/formatters';

type AuthMode = 'login' | 'signup' | 'first_access_check' | 'first_access_submit';

export default function AuthView() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [tenantId, setTenantId] = useState('sp');
  const [loginType, setLoginType] = useState<'manager' | 'professional'>('manager');
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

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (authError) throw authError;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar o login com Google.');
      setLoading(false);
    }
  };

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
        if (loginType === 'professional') {
          const phone = normalizeBrazilPhone(email);
          if (!/^\+55\d{10,11}$/.test(phone)) throw new Error('Informe um telefone celular válido com DDD.');
          const { error: authError } = await supabase.auth.signInWithPassword({ phone, password });
          if (authError) throw authError;
          await init();
          if (useHomeCareStore.getState().currentUserRole !== 'professional') {
            await supabase.auth.signOut();
            throw new Error('Este acesso por telefone é exclusivo para profissionais.');
          }
          window.location.href = '/';
          return;
        } else {
          const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
          if (authError) throw authError;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao autenticar';
      if (message.includes('Invalid login credentials')) {
        setError(loginType === 'professional' ? 'Telefone ou senha incorretos.' : 'E-mail ou senha incorretos.');
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
    <main className="auth-screen">
      <section className="auth-visual" aria-label="Woodesk Home Care">
        <div className="auth-visual-wash" />
      </section>

      <section className="auth-content">
        <div className="auth-language" aria-label="Idioma atual">
          <span aria-hidden="true">🇧🇷</span>
          <span>PT-BR</span>
          <span className="auth-language-chevron">⌄</span>
        </div>

        <div className="auth-card-wrap">
          <div className="auth-card">
            <div className="auth-logo" aria-label="Woodesk Home Care">
              <span className="auth-logo-mark" aria-hidden="true" />
              <strong>Woodesk</strong>
              <span>Home Care</span>
            </div>

            {isFirstAccess && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className="auth-back"
                aria-label="Voltar para o login"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}

            <div className="auth-heading">
              <h1>{mode === 'login' ? 'Olá!' : mode === 'signup' ? 'Criar conta' : 'Primeiro acesso'}</h1>
              <p>
                {mode === 'login' && 'Faça seu login para continuar'}
                {mode === 'signup' && 'Cadastre-se para começar'}
                {mode === 'first_access_check' && 'Informe o seu e-mail para validar o convite'}
                {mode === 'first_access_submit' && 'Crie sua senha para ativar sua conta'}
              </p>
            </div>

            {error && <div className="auth-error" role="alert">{error}</div>}

            {!canSignup && mode === 'signup' ? (
              <div className="auth-empty-state">
                <p>O cadastro direto está desativado. Contas são criadas por convite.</p>
                <button type="button" onClick={() => setMode('login')}>Ir para login</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="auth-form">
                {mode === 'login' && (
                  <div className="auth-role-switch" role="tablist" aria-label="Tipo de acesso">
                    <button type="button" role="tab" aria-selected={loginType === 'manager'} onClick={() => { setLoginType('manager'); setEmail(''); setError(''); }} className={loginType === 'manager' ? 'is-active' : ''}>
                      <Building2 className="h-5 w-5" /> Gestor
                    </button>
                    <button type="button" role="tab" aria-selected={loginType === 'professional'} onClick={() => { setLoginType('professional'); setEmail(''); setError(''); }} className={loginType === 'professional' ? 'is-active' : ''}>
                      <User className="h-5 w-5" /> Profissional
                    </button>
                  </div>
                )}

                {mode === 'signup' && canSignup && (
                  <>
                    <label className="auth-field">
                      <span>Nome completo</span>
                      <span className="auth-input-wrap"><User /><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Seu nome" /></span>
                    </label>
                    <label className="auth-field">
                      <span>Unidade / Filial</span>
                      <span className="auth-input-wrap"><Building2 /><select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>{tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></span>
                    </label>
                  </>
                )}

                {(mode === 'login' || mode === 'signup' || isFirstAccess) && (
                  <label className="auth-field">
                    <span>{mode === 'login' && loginType === 'professional' ? 'Telefone' : 'E-mail'}</span>
                    <span className="auth-input-wrap">{mode === 'login' && loginType === 'professional' ? <Phone /> : <Mail />}<input type={mode === 'login' && loginType === 'professional' ? 'tel' : 'email'} value={email} onChange={(e) => setEmail(e.target.value)} required disabled={mode === 'first_access_submit'} autoComplete={mode === 'login' && loginType === 'professional' ? 'tel' : 'email'} placeholder={mode === 'login' && loginType === 'professional' ? '(11) 99999-9999' : 'seu@email.com'} /></span>
                  </label>
                )}

                {mode === 'first_access_submit' && (
                  <label className="auth-field">
                    <span>Nome completo</span>
                    <span className="auth-input-wrap"><User /><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Ex: João Silva" /></span>
                  </label>
                )}

                {(mode === 'login' || mode === 'signup' || mode === 'first_access_submit') && (
                  <label className="auth-field">
                    <span>Senha</span>
                    <span className="auth-input-wrap"><Lock /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="current-password" placeholder={mode === 'login' ? '••••••••••' : 'Mínimo 6 caracteres'} /><button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff /> : <Eye />}</button></span>
                  </label>
                )}

                {mode === 'login' && (
                  <div className="auth-options">
                    <label><input type="checkbox" /> <span>Lembrar de mim</span></label>
                    <button type="button" onClick={() => { setMode('first_access_check'); setError(''); setPassword(''); }}>Esqueceu sua senha?</button>
                  </div>
                )}

                <button type="submit" disabled={loading} className="auth-submit">
                  {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Aguarde...</> : mode === 'first_access_check' ? <>Continuar <ArrowRight className="h-5 w-5" /></> : mode === 'first_access_submit' ? 'Ativar conta e entrar' : mode === 'login' ? <>Entrar <ArrowRight className="h-5 w-5" /></> : 'Criar conta'}
                </button>
              </form>
            )}

            {mode === 'login' && (
              <>
                <div className="auth-divider"><span>ou</span></div>
                <button type="button" className="auth-google" onClick={handleGoogleLogin} disabled={loading}><span className="auth-google-mark">G</span> Entrar com Google</button>
                <button type="button" className="auth-first-access" onClick={() => { setMode('first_access_check'); setError(''); setPassword(''); }}>Primeiro acesso? <strong>Crie sua conta</strong></button>
              </>
            )}

            {canSignup && !isFirstAccess && mode === 'signup' && <button type="button" className="auth-first-access" onClick={toggleMode}>Já tem conta? <strong>Entrar</strong></button>}
          </div>
        </div>

        <div className="auth-content-footer"><Heart className="h-5 w-5" /> Tecnologia a serviço de vidas melhores.</div>
      </section>
    </main>
  );
}
