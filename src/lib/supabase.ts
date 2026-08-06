import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof window !== 'undefined' && (window as any).__ENV__ && (window as any).__ENV__[key]) {
    return (window as any).__ENV__[key];
  }
  return import.meta.env[key];
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') as string | undefined;
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
);
