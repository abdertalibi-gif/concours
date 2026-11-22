import { createClient, SupabaseClient } from '@supabase/supabase-js';

// `import.meta.env` n'existe que sous Vite. Les tests unitaires
// (tsx/Node) importent ce module via db.ts : on lit donc l'env de
// façon défensive, sans changer le comportement dans le navigateur.
const env: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

const rawUrl = env.VITE_SUPABASE_URL;
const rawKey = env.VITE_SUPABASE_ANON_KEY;

// Ensure URL is always a valid HTTP/HTTPS url
function resolveSupabaseUrl(): string {
  if (typeof rawUrl === 'string' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
    return rawUrl;
  }
  return 'https://lixxittkqacsmjntebip.supabase.co';
}

function resolveSupabaseKey(): string {
  if (typeof rawKey === 'string' && rawKey.trim().length > 0) {
    return rawKey.trim();
  }
  // If the user mistakenly placed the anon/publishable key in VITE_SUPABASE_URL
  if (typeof rawUrl === 'string' && rawUrl.startsWith('sb_')) {
    return rawUrl.trim();
  }
  return 'placeholder-anon-key';
}

export const supabaseUrl = resolveSupabaseUrl();
export const supabaseAnonKey = resolveSupabaseKey();

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export const isSupabaseConfigured = Boolean(
  typeof rawUrl === 'string' && rawUrl.startsWith('http') &&
  typeof rawKey === 'string' && rawKey.trim().length > 0
);
