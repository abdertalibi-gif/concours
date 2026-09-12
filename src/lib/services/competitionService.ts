import { supabase, isSupabaseConfigured } from '../supabase';
import type { Competition } from '../types';
import { objectToSnake, rowsToCamel } from './_helpers';

const TABLE = 'competitions';

export async function listCompetitions(limit = 200): Promise<Competition[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false }).limit(limit);
    if (error || !data) return [];
    return rowsToCamel<Competition>(data as unknown as Record<string, unknown>[]);
  } catch {
    return [];
  }
}

export async function getCompetitionById(id: string): Promise<Competition | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error || !data) return null;
    const camel = data as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(camel)) out[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
    return out as unknown as Competition;
  } catch {
    return null;
  }
}

export async function createCompetition(payload: Record<string, unknown>): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from(TABLE).insert(objectToSnake(payload)).select('id').single();
    if (error) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

export async function updateCompetition(id: string, patch: Record<string, unknown>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).update(objectToSnake(patch)).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCompetition(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
