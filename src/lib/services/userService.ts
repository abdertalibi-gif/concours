import { supabase, isSupabaseConfigured } from '../supabase';
import type { User } from '../types';
import { objectToSnake } from './_helpers';

const TABLE = 'profiles';

export async function listProfiles(limit = 200): Promise<Record<string, unknown>[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false }).limit(limit);
    if (error || !data) return [];
    return data as unknown as Record<string, unknown>[];
  } catch {
    return [];
  }
}

export async function getProfileById(id: string): Promise<Record<string, unknown> | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error || !data) return null;
    return data as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function upsertProfile(payload: Record<string, unknown>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).upsert(objectToSnake(payload), { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export function mapProfileToUser(profile: Record<string, unknown>): User {
  const fullName = typeof profile['full_name'] === 'string' ? (profile['full_name'] as string) : '';
  const parts = fullName.split(' ');
  return {
    id: String(profile['id'] ?? ''),
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
    email: String(profile['email'] ?? ''),
    passwordHash: '',
    role: (profile['role'] as User['role']) ?? 'USER',
    status: (profile['status'] as User['status']) ?? 'ACTIVE',
    city: profile['city'] as string | undefined,
    level: profile['level'] as string | undefined,
    phone: profile['phone'] as string | undefined,
    bio: profile['bio'] as string | undefined,
    createdAt: String(profile['created_at'] ?? new Date().toISOString()),
    lastLoginAt: profile['last_login_at'] as string | undefined,
  };
}
