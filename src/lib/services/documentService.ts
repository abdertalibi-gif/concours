import { supabase, isSupabaseConfigured } from '../supabase';
import type { DocItem } from '../types';
import { objectToSnake, safeSelect } from './_helpers';

const TABLE = 'documents';

export async function listDocuments(limit = 200): Promise<DocItem[]> {
  return safeSelect<DocItem>(TABLE, 'created_at', limit);
}

export async function getDocumentById(id: string): Promise<DocItem | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error || !data) return null;
    return data as unknown as DocItem;
  } catch {
    return null;
  }
}

export async function createDocument(payload: Record<string, unknown>): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from(TABLE).insert(objectToSnake(payload)).select('id').single();
    if (error) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

export async function updateDocument(id: string, patch: Record<string, unknown>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).update(objectToSnake(patch)).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteDocument(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
