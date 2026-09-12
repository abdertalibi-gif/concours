import { supabase, isSupabaseConfigured } from '../supabase';
import type { AppNotification } from '../types';
import { objectToSnake, rowsToCamel } from './_helpers';

const TABLE = 'notifications';

export async function listUserNotifications(userId: string): Promise<AppNotification[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
    if (error || !data) return [];
    return rowsToCamel<AppNotification>(data as unknown as Record<string, unknown>[]);
  } catch {
    return [];
  }
}

export async function createNotification(payload: Record<string, unknown>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).insert(objectToSnake(payload));
    return !error;
  } catch {
    return false;
  }
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).update({ read: true }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
