import { supabase, isSupabaseConfigured } from '../supabase';
import type { University } from '../types';
import { objectToSnake, safeSelect } from './_helpers';

const TABLE = 'universities';

export async function listUniversities(limit = 200): Promise<University[]> {
  return safeSelect<University>(TABLE, 'created_at', limit);
}

export async function getUniversityById(id: string): Promise<University | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error || !data) return null;
    return data as unknown as University;
  } catch {
    return null;
  }
}

export async function createUniversity(payload: Record<string, unknown>): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from(TABLE).insert(objectToSnake(payload)).select('id').single();
    if (error) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

export async function updateUniversity(id: string, patch: Record<string, unknown>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).update(objectToSnake(patch)).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteUniversity(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
