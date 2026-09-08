import { useEffect, useState } from 'react';
import { Download, ExternalLink, Smartphone } from 'lucide-react';
import { isInstallPromptAvailable, isMobileDevice, isPWAInstalled, promptInstall, setupInstallPrompt } from '../lib/notifications';

export default function PWAInstallGate() {
  const [installed, setInstalled] = useState(() => isPWAInstalled());
  const [canPrompt, setCanPrompt] = useState(() => isInstallPromptAvailable());

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
    const accepted = await promptInstall();
    if (accepted) setInstalled(true);
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

        {canPrompt && (
          <button onClick={handleInstall} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700">
            <Download className="h-4 w-4" />
            Adicionar à tela inicial
          </button>
        )}

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          {isIOS ? (
            <p><strong>iPhone/iPad:</strong> toque em <ExternalLink className="inline h-4 w-4" /> Compartilhar, escolha <strong>Adicionar à Tela de Início</strong> e abra pelo novo ícone.</p>
          ) : (
            <p>Se o botão não aparecer, abra o menu do navegador e escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</p>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Depois da instalação, abra o HomeCare Pro pelo ícone do aplicativo.</p>
      </div>
    </div>
  );
}
