import { supabase, isSupabaseConfigured } from '../supabase';
import { objectToSnake, rowsToCamel } from './_helpers';

export interface Application {
  id: string;
  userId: string;
  competitionId: string;
  status: 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE';
  createdAt: string;
  updatedAt: string;
}

const TABLE = 'applications';

export async function listUserApplications(userId: string): Promise<Application[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error || !data) return [];
    return rowsToCamel<Application>(data as unknown as Record<string, unknown>[]);
  } catch {
    return [];
  }
}

export async function createApplication(userId: string, competitionId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).insert(objectToSnake({ userId, competitionId, status: 'EN_ATTENTE' }));
    return !error;
  } catch {
    return false;
  }
}

export async function updateApplicationStatus(id: string, status: Application['status']): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).update({ status }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
