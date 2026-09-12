// Helpers partagés des services Supabase (snake_case <-> camelCase)
import { supabase, isSupabaseConfigured } from '../supabase';

export function toSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export function objectToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[toSnake(key)] = val;
  }
  return result;
}

export function objectToCamel<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    result[camel] = val;
  }
  return result as T;
}

export function rowsToCamel<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => objectToCamel<T>(r));
}

export async function safeSelect<T>(table: string, orderBy = 'created_at', limit = 200): Promise<T[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending: false }).limit(limit);
    if (error || !data) return [];
    return rowsToCamel<T>(data as unknown as Record<string, unknown>[]);
  } catch {
    return [];
  }
}
