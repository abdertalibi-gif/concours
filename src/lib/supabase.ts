import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? 'https://placeholder-project.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key'
);

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseUrl.startsWith('http')
);
