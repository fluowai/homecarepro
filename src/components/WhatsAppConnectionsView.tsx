import React, { useEffect, useState } from 'react';
import { useWhatsAppStore } from '../whatsappStore';
import { Plus, QrCode, Smartphone, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function WhatsAppConnectionsView() {
  const { instances, fetchInstances, createInstance, isLoading } = useWhatsAppStore();
  const [newInstanceName, setNewInstanceName] = useState('');
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  useEffect(() => {
    fetchInstances();
    
    // Subscribe to changes
    const sub = supabase.channel('whatsapp_instances_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_instances' }, () => {
        fetchInstances();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  const handleCreate = async () => {
    if (!newInstanceName.trim()) return;
    await createInstance(newInstanceName);
    setNewInstanceName('');
  };

  const handleShowQR = async (instanceName: string) => {
    setShowQRModal(instanceName);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`/api/whatsapp/instances/${instanceName}/qr`, {
        headers: {
          'Authorization': `Bearer ${session?.session?.access_token}`
        }
      });
      const data = await res.json();
      if (data.qrcode?.base64) {
        setQrCodeData(data.qrcode.base64);
      } else {
        // Fallback to check if DB has it
        const instance = instances.find(i => i.instance_name === instanceName);
        if (instance?.qr_code) {
          setQrCodeData(instance.qr_code);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Conexões WhatsApp</h1>
          <p className="text-slate-600">Gerencie seus números conectados para atendimento.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Nova Conexão</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Nome da instância (ex: Atendimento, Suporte)"
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={newInstanceName}
            onChange={(e) => setNewInstanceName(e.target.value)}
          />
          <button
            onClick={handleCreate}
            disabled={isLoading || !newInstanceName.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={20} />
            Conectar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instances.map((instance) => (
          <div key={instance.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${instance.status === 'open' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{instance.instance_name}</h3>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full \${
                    instance.status === 'open' ? 'bg-green-100 text-green-700' : 
                    instance.status === 'connecting' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-red-100 text-red-700'
                  }`}>
                    {instance.status === 'open' ? 'Conectado' : instance.status === 'connecting' ? 'Conectando' : 'Desconectado'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2">
              {instance.status !== 'open' && (
                <button
                  onClick={() => handleShowQR(instance.instance_name)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  <QrCode size={18} />
                  QR Code
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full space-y-4">
            <h3 className="text-xl font-bold text-center">Leia o QR Code</h3>
            <p className="text-center text-slate-600 text-sm">Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e aponte a câmera.</p>
            <div className="flex justify-center p-4 bg-slate-50 rounded-lg min-h-[250px] items-center">
              {qrCodeData ? (
                <img src={qrCodeData} alt="QR Code" className="w-64 h-64" />
              ) : (
                <p className="text-slate-500">Gerando QR Code...</p>
              )}
            </div>
            <button
              onClick={() => {
                setShowQRModal(null);
                setQrCodeData(null);
              }}
              className="w-full py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
