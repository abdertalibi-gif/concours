import { supabase, isSupabaseConfigured } from '../supabase';
import type { Exam } from '../types';
import { objectToSnake, safeSelect } from './_helpers';

const TABLE = 'exams';

export async function listExams(limit = 200): Promise<Exam[]> {
  return safeSelect<Exam>(TABLE, 'created_at', limit);
}

export async function getExamById(id: string): Promise<Exam | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error || !data) return null;
    return data as unknown as Exam;
  } catch {
    return null;
  }
}

export async function createExam(payload: Record<string, unknown>): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from(TABLE).insert(objectToSnake(payload)).select('id').single();
    if (error) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

export async function updateExam(id: string, patch: Record<string, unknown>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).update(objectToSnake(patch)).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteExam(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
