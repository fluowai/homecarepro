import React, { useState } from 'react';
import { X, Link2, Copy, CheckCircle2, Send } from 'lucide-react';

interface InviteLinkModalProps {
  inviteLink: string;
  title?: string;
  description?: string;
  onClose: () => void;
}

export function InviteLinkModal({ inviteLink, title = 'Link de Convite Gerado', description, onClose }: InviteLinkModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      const el = document.createElement('textarea');
      el.value = inviteLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(`Olá! Aqui está seu link de acesso ao HomeCare Pro: ${inviteLink}\n\nClique para criar sua conta (defina seu e-mail e senha).`);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-indigo-600" />
              {title}
            </h3>
            <p className="text-sm text-gray-500">{description || 'Envie este link para o administrador criar a conta.'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-2">Link copiável</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteLink}
                onFocus={(e) => e.target.select()}
                className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs text-indigo-900 font-mono truncate focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                  copied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <Send className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              O convite expira em <strong>7 dias</strong>. A pessoa convidada criará a conta com o e-mail{' '}
              <strong>{description ? 'informado' : 'informado na criação'}</strong> e definirá a própria senha.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              Enviar via WhatsApp
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
