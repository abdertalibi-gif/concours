import { supabase, isSupabaseConfigured } from '../supabase';
import type { Favorite } from '../types';
import { objectToSnake, rowsToCamel } from './_helpers';

const TABLE = 'favorites';

export async function listUserFavorites(userId: string): Promise<Favorite[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error || !data) return [];
    return rowsToCamel<Favorite>(data as unknown as Record<string, unknown>[]);
  } catch {
    return [];
  }
}

export async function addFavorite(payload: Record<string, unknown>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).insert(objectToSnake(payload));
    return !error;
  } catch {
    return false;
  }
}

export async function removeFavorite(userId: string, targetType: string, targetId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).delete().eq('user_id', userId).eq('target_type', targetType).eq('target_id', targetId);
    return !error;
  } catch {
    return false;
  }
}
