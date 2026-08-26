import React, { useState } from 'react';
import { X, User, Image as ImageIcon, Save, Loader2 } from 'lucide-react';
import { useHomeCareStore } from '../store';
import { toast } from 'sonner';
import { uploadFileToMinio } from '../lib/upload';

interface UserProfileModalProps {
  onClose: () => void;
}

export function UserProfileModal({ onClose }: UserProfileModalProps) {
  const { profile, updateProfile } = useHomeCareStore();
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem v\u00e1lida.');
      return;
    }

    setIsUploading(true);
    try {
      const uploadedUrl = await uploadFileToMinio(file);
      setAvatarUrl(uploadedUrl);
      toast.success('Imagem carregada com sucesso.');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast.error('Falha ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('O nome n\u00e3o pode estar vazio.');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        avatar_url: avatarUrl
      });
      toast.success('Perfil atualizado com sucesso!');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar o perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Editar Perfil</h2>
              <p className="text-sm text-gray-500">Atualize suas informa\u00e7\u00f5es pessoais</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative group cursor-pointer">
                <img 
                  src={avatarUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120"} 
                  className="w-24 h-24 rounded-full border border-gray-200 object-cover" 
                  alt="Avatar"
                />
                <label className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-white mb-1" />
                      <span className="text-white text-xs font-medium">Alterar</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={isUploading} />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">Clique na imagem para alterar</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-transparent"
                placeholder="Seu nome"
              />
            </div>

          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="px-6 py-2 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-4 h-4" /> Salvar</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
