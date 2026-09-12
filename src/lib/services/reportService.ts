import { supabase, isSupabaseConfigured } from '../supabase';
import type { Report } from '../types';
import { objectToSnake, safeSelect } from './_helpers';

const TABLE = 'reports';

export async function listReports(limit = 200): Promise<Report[]> {
  return safeSelect<Report>(TABLE, 'created_at', limit);
}

export async function createReport(payload: Record<string, unknown>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).insert(objectToSnake(payload));
    return !error;
  } catch {
    return false;
  }
}

export async function updateReportStatus(id: string, status: Report['status']): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from(TABLE).update({ status }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
