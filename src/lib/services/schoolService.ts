import { supabase, isSupabaseConfigured } from '../supabase';
import type { School } from '../types';
import { objectToSnake, safeSelect } from './_helpers';

const TABLE = 'schools';

export async function listSchools(limit = 200): Promise<School[]> {
  return safeSelect<School>(TABLE, 'created_at', limit);
}

export async function getSchoolById(id: string): Promise<School | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error || !data) return null;
    return data as unknown as School;
  } catch {
    return null;
  }
}

export async function createSchool(payload: Record<string, unknown>): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from(TABLE).insert(objectToSnake(payload)).select('id').single();
    if (error) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

export async function updateSchool(id: string, patch: Record<string, unknown>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).update(objectToSnake(patch)).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteSchool(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
