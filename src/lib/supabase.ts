import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Ensure URL is always a valid HTTP/HTTPS url
function resolveSupabaseUrl(): string {
  if (typeof rawUrl === 'string' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
    return rawUrl;
  }
  // If the user mistakenly placed the anon/publishable key in VITE_SUPABASE_URL
  if (typeof rawKey === 'string' && rawKey.startsWith('https://') && rawKey.includes('.supabase.co')) {
    return rawKey;
  }
  return 'https://lixxittkqacsmjntebip.supabase.co';
}

// Values that are obviously placeholders and must never be treated as a real key.
const PLACEHOLDER_KEY_PATTERNS = [
  'placeholder',
  'votre_key',
  'your_key',
  'your-anon',
  'your_anon',
  'changeme',
  'change_me',
  'replace',
  'example',
];

function isUsableKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const key = value.trim();
  // Real Supabase keys (legacy JWT or sb_publishable_...) are always long.
  if (key.length < 20) return false;
  const lower = key.toLowerCase();
  return !PLACEHOLDER_KEY_PATTERNS.some((p) => lower.includes(p));
}

function resolveSupabaseKey(): string {
  // If the user mistakenly placed the anon/publishable key in VITE_SUPABASE_URL
  if (typeof rawUrl === 'string' && rawUrl.trim().startsWith('sb_')) {
    return rawUrl.trim();
  }
  if (isUsableKey(rawKey)) {
    return rawKey.trim();
  }
  return '';
}

export const supabaseUrl = resolveSupabaseUrl();
export const supabaseAnonKey = resolveSupabaseKey();

// Supabase is only considered configured when we actually have a usable public
// key. Otherwise every request would be sent with a placeholder key and the API
// would answer 401 Unauthorized.
export const isSupabaseConfigured = Boolean(
  typeof rawUrl === 'string' &&
  rawUrl.startsWith('http') &&
  isUsableKey(rawKey)
);

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder-anon-key'
);