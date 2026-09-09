import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Download, ExternalLink, Smartphone } from 'lucide-react';
import { getVapidPublicKey, isInstallPromptAvailable, isMobileDevice, isPWAInstalled, promptInstall, registerPushNotifications, setupInstallPrompt } from '../lib/notifications';

export default function PWAInstallGate() {
  const [installed, setInstalled] = useState(() => isPWAInstalled());
  const [canPrompt, setCanPrompt] = useState(() => isInstallPromptAvailable());
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'loading' | 'enabled' | 'unavailable' | 'error'>('idle');

  useEffect(() => {
    if (!isMobileDevice()) return;
    const cleanup = setupInstallPrompt(() => setCanPrompt(true));
    setCanPrompt(isInstallPromptAvailable());
    const handleInstalled = () => {
      setInstalled(true);
      setCanPrompt(false);
    };
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      cleanup();
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (!isMobileDevice() || installed) return null;

  const handleInstall = async () => {
    if (!canPrompt) {
      setShowInstallHelp(true);
      return;
    }
    const accepted = await promptInstall();
    if (accepted) setInstalled(true);
  };

  const handleNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotificationStatus('unavailable');
      return;
    }
    setNotificationStatus('loading');
    try {
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey || !(await registerPushNotifications(vapidKey))) {
        setNotificationStatus('error');
        return;
      }
      setNotificationStatus('enabled');
    } catch {
      setNotificationStatus('error');
    }
  };

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-slate-950/95 p-5 text-slate-900">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-600 text-white shadow-lg shadow-green-600/20">
          <Smartphone className="h-8 w-8" />
        </div>
        <h1 className="text-center text-xl font-bold">Instale o HomeCare Pro</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-slate-600">
          No celular, o sistema precisa ser aberto pelo aplicativo instalado para garantir notificações, segurança e uma experiência adequada.
        </p>

        <button onClick={handleInstall} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700">
            <Download className="h-4 w-4" />
            Instalar aplicativo
        </button>

        <button onClick={handleNotifications} disabled={notificationStatus === 'loading' || notificationStatus === 'enabled'} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-default disabled:opacity-70">
          {notificationStatus === 'enabled' ? <CheckCircle2 className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {notificationStatus === 'loading' ? 'Ativando notificações...' : notificationStatus === 'enabled' ? 'Notificações ativadas' : 'Ativar notificações'}
        </button>

        {(showInstallHelp || !canPrompt || notificationStatus === 'unavailable' || notificationStatus === 'error') && <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          {isIOS ? (
            <p><strong>iPhone/iPad:</strong> toque em <ExternalLink className="inline h-4 w-4" /> Compartilhar, escolha <strong>Adicionar à Tela de Início</strong> e abra pelo novo ícone.</p>
          ) : (
            <p>Se o botão não aparecer, abra o menu do navegador e escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</p>
          )}
          {notificationStatus === 'unavailable' && <p className="mt-3 text-amber-700">Este navegador não oferece notificações push. Use Chrome/Edge no Android ou Safari instalado no iPhone.</p>}
          {notificationStatus === 'error' && <p className="mt-3 text-rose-700">Não foi possível ativar agora. Faça login e tente novamente pelo aplicativo instalado.</p>}
        </div>}
        <p className="mt-4 text-center text-xs text-slate-400">Depois da instalação, abra o HomeCare Pro pelo ícone do aplicativo.</p>
      </div>
    </div>
  );
}
