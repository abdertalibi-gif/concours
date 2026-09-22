import { supabase, isSupabaseConfigured } from '../supabase';
import type { Exam } from '../types';
import { objectToSnake, rowsToCamel } from './_helpers';

const TABLE = 'exams';

export async function listExams(limit = 200): Promise<Exam[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false }).limit(limit);
    if (error || !data) return [];
    return rowsToCamel<Exam>(data as unknown as Record<string, unknown>[]);
  } catch {
    return [];
  }
}

export async function getExamById(id: string): Promise<Exam | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error || !data) return null;
    const camel = data as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(camel)) out[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
    return out as unknown as Exam;
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

// Upload PDF to Supabase Storage
export interface UploadResult {
  fileUrl: string;
  filePath: string;
  fileName: string;
  fileSize: string;
}

export async function uploadExamPdf(file: File, folder = 'examens'): Promise<UploadResult> {
  if (!isSupabaseConfigured) throw new Error('Supabase non configuré');

  // Validation
  const isExtensionValid = /\.pdf$/i.test(file.name);
  const isMimeValid = !file.type || file.type === 'application/pdf';
  if (!isExtensionValid || !isMimeValid) throw new Error('Fichier PDF uniquement.');

  const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
  if (file.size > MAX_SIZE) throw new Error('Le fichier ne doit pas dépasser 20 MB.');

  // Chemin unique : documents/examens/{year}/{uuid}_{sanitized}.pdf
  const year = new Date().getFullYear();
  const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${folder}/${year}/${Date.now()}_${sanitized}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);

  return {
    fileUrl: publicUrl,
    filePath,
    fileName: file.name,
    fileSize: formatBytes(file.size),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Delete PDF from Storage
export async function deleteExamPdf(filePath: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.storage.from('documents').remove([filePath]);
    return !error;
  } catch {
    return false;
  }
}