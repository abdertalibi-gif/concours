// ============================================================
// CONCOURS MAROC — Couche de synchronisation Supabase
// Pont bidirectionnel entre localStorage et Supabase PostgreSQL.
//
// Stratégie :
//   1. Au démarrage, si Supabase est configuré, on PULL les données
//      cloud vers localStorage (enrichissement, pas remplacement).
//   2. À chaque mutation (saveDB), on PUSH vers Supabase en arrière-plan.
//   3. Si Supabase est indisponible, localStorage continue seul.
//
// Les fonctions dans db.ts restent 100% synchrones.
// Aucun composant React n'est modifié.
// ============================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Competition, School, University, Ministry, Exam,
  DocItem, Course, User, AppNotification, Favorite,
  Follow, UserProgress, Report, DatabaseShape,
} from './types';

// -------- Helpers camelCase ↔ snake_case --------

function toSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function objectToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[toSnake(key)] = val;
  }
  return result;
}

function objectToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = val;
  }
  return result;
}

function rowsToCamel<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => objectToCamel(r) as T);
}

// -------- Mapping des collections vers les tables Supabase --------

const TABLE_MAP: Record<string, string> = {
  ministries: 'ministries',
  universities: 'universities',
  schools: 'schools',
  competitions: 'competitions',
  exams: 'exams',
  documents: 'documents',
  courses: 'courses',
  users: 'profiles',
  favorites: 'favorites',
  follows: 'follows',
  notifications: 'notifications',
  progress: 'user_progress',
  reports: 'reports',
};

// -------- État de synchronisation --------

let _syncStatus: 'idle' | 'syncing' | 'done' | 'error' = 'idle';
let _syncPromise: Promise<DatabaseShape | null> | null = null;

export function getSyncStatus() {
  return _syncStatus;
}

// -------- PULL : Supabase → localStorage --------

async function fetchTable<T>(table: string): Promise<T[]> {
  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.warn(`[Supabase] Erreur lecture ${table}:`, error.message);
      return [];
    }
    return rowsToCamel<T>(data || []);
  } catch {
    return [];
  }
}

/**
 * Charge toutes les données depuis Supabase et les retourne
 * sous la forme DatabaseShape compatible avec le localStorage existant.
 * Retourne null si Supabase n'est pas configuré ou si la connexion échoue.
 */
export async function pullFromSupabase(): Promise<DatabaseShape | null> {
  if (!isSupabaseConfigured) return null;

  _syncStatus = 'syncing';

  try {
    const [
      ministries, universities, schools, competitions,
      exams, documents, courses, users, favorites,
      follows, notifications, progress, reports,
    ] = await Promise.all([
      fetchTable<Ministry>('ministries'),
      fetchTable<University>('universities'),
      fetchTable<School>('schools'),
      fetchTable<Competition>('competitions'),
      fetchTable<Exam>('exams'),
      fetchTable<DocItem>('documents'),
      fetchTable<Course>('courses'),
      fetchTable<User>('app_users'),
      fetchTable<Favorite>('favorites'),
      fetchTable<Follow>('follows'),
      fetchTable<AppNotification>('notifications'),
      fetchTable<UserProgress>('user_progress'),
      fetchTable<Report>('reports'),
    ]);

    // Vérifier qu'on a reçu des données significatives
    // (si Supabase est vide/pas encore seedé, on ne remplace pas les données locales)
    const hasData = ministries.length > 0 || schools.length > 0 || competitions.length > 0;

    if (!hasData) {
      console.log('[Supabase] Base vide — utilisation des données locales existantes.');
      _syncStatus = 'done';
      return null;
    }

    _syncStatus = 'done';
    console.log(`[Supabase] ✅ Synchronisation réussie : ${ministries.length} ministères, ${schools.length} écoles, ${competitions.length} concours.`);

    return {
      version: 4,
      users,
      schools,
      universities,
      ministries,
      competitions,
      exams,
      documents,
      courses,
      favorites,
      follows,
      notifications,
      progress,
      reports,
      settings: { siteName: 'Concours Maroc', contactEmail: 'contact@concoursmaroc.ma' },
    };
  } catch (err) {
    console.warn('[Supabase] Erreur de synchronisation, fallback local :', err);
    _syncStatus = 'error';
    return null;
  }
}

/**
 * Lance la synchronisation initiale (appelée une seule fois au démarrage).
 * Retourne une promesse réutilisable.
 */
export function initSupabaseSync(): Promise<DatabaseShape | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (_syncPromise) return _syncPromise;
  _syncPromise = pullFromSupabase();
  return _syncPromise;
}

// -------- PUSH : localStorage → Supabase (arrière-plan) --------

/**
 * Envoie un upsert vers Supabase en arrière-plan.
 * Ne bloque jamais l'UI. Les erreurs sont loggées silencieusement.
 */
export async function pushToSupabase(
  collection: string,
  item: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const table = TABLE_MAP[collection];
  if (!table) return;

  try {
    const snakeItem = objectToSnake(item);
    const { error } = await supabase.from(table).upsert(snakeItem as never, { onConflict: 'id' });
    if (error) {
      console.warn(`[Supabase] Push ${table} erreur:`, error.message);
    }
  } catch (err) {
    console.warn(`[Supabase] Push ${table} échec:`, err);
  }
}

/**
 * Supprime un enregistrement dans Supabase en arrière-plan.
 */
export async function deleteFromSupabase(
  collection: string,
  id: string,
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const table = TABLE_MAP[collection];
  if (!table) return;

  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.warn(`[Supabase] Delete ${table} erreur:`, error.message);
    }
  } catch (err) {
    console.warn(`[Supabase] Delete ${table} échec:`, err);
  }
}

/**
 * Synchronise un lot complet de données vers Supabase (utilisé lors du seed initial).
 */
export async function pushBatchToSupabase(
  collection: string,
  items: Record<string, unknown>[],
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const table = TABLE_MAP[collection];
  if (!table) return;

  try {
    const snakeItems = items.map(objectToSnake);
    const { error } = await supabase.from(table).upsert(snakeItems as never[], { onConflict: 'id' });
    if (error) {
      console.warn(`[Supabase] Batch push ${table} erreur:`, error.message);
    }
  } catch (err) {
    console.warn(`[Supabase] Batch push ${table} échec:`, err);
  }
}

const MIGRATION_FLAG = 'cm_supabase_migrated_v1';

/**
 * Migration idempotente localStorage -> Supabase.
 * - Ne supprime jamais les données locales.
 * - Utilise upsert (onConflict=id) : pas de doublons.
 * - Ne migre qu'une fois (flag localStorage), sauf force=true.
 */
export async function migrateLocalStorageToSupabase(force = false): Promise<{ ok: boolean; counts: Record<string, number> }> {
  const counts: Record<string, number> = {};
  if (!isSupabaseConfigured) return { ok: false, counts };
  try {
    if (!force && localStorage.getItem(MIGRATION_FLAG) === '1') return { ok: true, counts };
    const raw = localStorage.getItem('cm_db_v4');
    if (!raw) return { ok: false, counts };
    const db = JSON.parse(raw) as DatabaseShape;
    const collections: (keyof DatabaseShape)[] = [
      'ministries', 'universities', 'schools', 'competitions',
      'exams', 'documents', 'courses', 'favorites',
      'follows', 'notifications', 'progress', 'reports',
    ];
    for (const col of collections) {
      const items = (db[col] as unknown as Record<string, unknown>[]) || [];
      counts[col] = items.length;
      if (items.length > 0) {
        // Petits lots pour éviter les limites de taille
        const chunk = 100;
        for (let i = 0; i < items.length; i += chunk) {
          await pushBatchToSupabase(col, items.slice(i, i + chunk));
        }
      }
    }
    // Users -> profiles : mapper sans passwordHash (Supabase Auth gère le secret)
    const users = (db.users as unknown as Record<string, unknown>[]) || [];
    counts['users'] = users.length;
    localStorage.setItem(MIGRATION_FLAG, '1');
    return { ok: true, counts };
  } catch (err) {
    console.warn('[Supabase] Migration échec:', err);
    return { ok: false, counts };
  }
}
