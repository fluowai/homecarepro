import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useHomeCareStore } from './store';

export interface WhatsAppInstance {
  id: string;
  tenant_id: string;
  instance_name: string;
  status: string;
  qr_code: string | null;
}

export interface WhatsAppContact {
  id: string;
  phone: string;
  profile_name: string | null;
  profile_pic_url: string | null;
}

export interface WhatsAppMessage {
  id: string;
  tenant_id: string;
  instance_id: string;
  contact_id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  message_type: string;
  content: string;
  media_url: string | null;
  status: string;
  created_at: string;
}

export interface WhatsAppThread {
  id: string;
  contact_id: string;
  contact?: WhatsAppContact;
  last_message_time: string;
  unread_count: number;
}

interface WhatsAppState {
  instances: WhatsAppInstance[];
  contacts: WhatsAppContact[];
  messages: WhatsAppMessage[];
  threads: WhatsAppThread[];
  isLoading: boolean;
  
  fetchInstances: () => Promise<void>;
  createInstance: (name: string) => Promise<void>;
  fetchThreads: () => Promise<void>;
  fetchMessages: (contactId: string) => Promise<void>;
  sendMessage: (instanceName: string, phone: string, text: string, mediaUrl?: string, mediaMimetype?: string) => Promise<void>;
}

export const useWhatsAppStore = create<WhatsAppState>((set, get) => ({
  instances: [],
  contacts: [],
  messages: [],
  threads: [],
  isLoading: false,

  fetchInstances: async () => {
    if (!isSupabaseConfigured) return;
    set({ isLoading: true });
    try {
      const { data } = await supabase.from('whatsapp_instances').select('*').order('created_at', { ascending: false });
      if (data) set({ instances: data });
    } finally {
      set({ isLoading: false });
    }
  },

  createInstance: async (name) => {
    if (!isSupabaseConfigured) return;
    set({ isLoading: true });
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const response = await fetch('/api/whatsapp/instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ instanceName: name })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Não foi possível criar a conexão WhatsApp.');
      }
      await get().fetchInstances();
    } finally {
      set({ isLoading: false });
    }
  },

  fetchThreads: async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await supabase
        .from('whatsapp_threads')
        .select(`
          *,
          contact:whatsapp_contacts(*)
        `)
        .order('last_message_time', { ascending: false });
      
      if (data) set({ threads: data });
    } catch (e) {
      console.error(e);
    }
  },

  fetchMessages: async (contactId) => {
    if (!isSupabaseConfigured) return;
    set({ isLoading: true });
    try {
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true });
      
      if (data) set({ messages: data });
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessage: async (instanceName, phone, text, mediaUrl, mediaMimetype) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      await fetch('/api/whatsapp/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          instanceName,
          number: phone,
          text,
          mediaUrl,
          mediaMimetype
        })
      });
      
      // Optionally re-fetch messages
    } catch (e) {
      console.error(e);
    }
  }
}));
