// ============================================================
// CONCOURS MAROC — Couche d'accès aux données
// Abstraction de stockage : localStorage (démo) interchangeable
// avec une API REST/Prisma en production. Toute l'application
// passe par ce module (jamais d'accès direct au stockage).
//
// ⬢ Supabase PostgreSQL : synchronisation bidirectionnelle
//   - PULL au démarrage (Supabase → localStorage)
//   - PUSH à chaque mutation (localStorage → Supabase)
//   - Fallback automatique sur les données locales
// ============================================================
import { useEffect, useState } from 'react';
import type {
  AppNotification, Competition, Course, DatabaseShape, DocItem, Exam,
  Favorite, Follow, Ministry, Report, School, University, User, UserProgress,
} from './types';
export type { DatabaseShape };
import {
  SEED_COURSES, SEED_DOCS, SEED_EXAMS, SEED_MINISTRIES,
  SEED_NOTIFICATIONS, SEED_SCHOOLS, SEED_UNIVERSITIES, SEED_USERS, buildCompetitions
} from './seed';
import { resolveInstitutionLogo, OFFICIAL_INSTITUTION_LOGOS } from '../data/institutionLogos';
import { statusFromCompetition, uid } from './utils';
import { initSupabaseSync, pushToSupabase, deleteFromSupabase } from './supabase-db';

const KEY = 'cm_db_v4';
const SESSION_KEY = 'cm_session_v3';

function seedDatabase(): DatabaseShape {
  return {
    version: 4,
    users: SEED_USERS,
    schools: SEED_SCHOOLS,
    universities: SEED_UNIVERSITIES,
    ministries: SEED_MINISTRIES,
    competitions: buildCompetitions(),
    exams: SEED_EXAMS,
    documents: SEED_DOCS,
    courses: SEED_COURSES,
    favorites: [
      { id: 'fav1', userId: 'u-user', targetType: 'CONCOURS', targetId: 'c13', createdAt: new Date().toISOString() },
      { id: 'fav2', userId: 'u-user', targetType: 'EXAMEN', targetId: 'ex1', createdAt: new Date().toISOString() },
      { id: 'fav3', userId: 'u-user', targetType: 'COURS', targetId: 'course-maths', createdAt: new Date().toISOString() },
    ],
    follows: [
      { id: 'fol1', userId: 'u-user', competitionId: 'c13', createdAt: new Date().toISOString() },
      { id: 'fol2', userId: 'u-user', competitionId: 'c1', createdAt: new Date().toISOString() },
    ],
    notifications: SEED_NOTIFICATIONS,
    progress: [
      { id: 'p1', userId: 'u-user', courseId: 'course-maths', completedLessons: ['l-m1', 'l-m2'], percent: 22, updatedAt: new Date().toISOString() },
    ],
    reports: [],
    settings: { siteName: 'Concours Maroc', contactEmail: 'contact@concoursmaroc.ma' },
  };
}

/**
 * Migration automatique et silencieuse :
 * Ne supprime JAMAIS les données utilisateurs (favoris, cours, concours créés).
 * Met à jour les logos vers les chemins locaux et injecte les universités marocaines.
 */
function migrateDatabase(db: DatabaseShape): DatabaseShape {
  // 1. Universités
  if (!db.universities || db.universities.length === 0) {
    db.universities = [...SEED_UNIVERSITIES];
  } else {
    const existingUniIds = new Set(db.universities.map(u => u.id));
    for (const u of SEED_UNIVERSITIES) {
      if (!existingUniIds.has(u.id)) {
        db.universities.push(u);
      }
    }
  }

  // 2. Écoles : enrichissement avec logos locaux officiels et relations
  const seedSchoolMap = new Map(SEED_SCHOOLS.map(s => [s.id, s]));
  const existingSchoolIds = new Set(db.schools.map(s => s.id));
  db.schools = db.schools.map(s => {
    const seed = seedSchoolMap.get(s.id);
    if (seed) {
      return {
        ...seed,
        ...s,
        // Conserve le logo custom si l'admin l'a explicitement défini
        officialLogo: seed.officialLogo,
        logoUrl: s.customLogo || seed.officialLogo || s.logoUrl,
        universityId: s.universityId || seed.universityId,
        ministryId: s.ministryId || seed.ministryId,
        aliases: s.aliases || seed.aliases,
        isActive: s.isActive ?? true,
      };
    }
    return { ...s, isActive: s.isActive ?? true };
  });
  for (const s of SEED_SCHOOLS) {
    if (!existingSchoolIds.has(s.id)) {
      db.schools.push(s);
    }
  }

  // 3. Ministères : enrichissement avec logos officiels
  const seedMinMap = new Map(SEED_MINISTRIES.map(m => [m.id, m]));
  const existingMinIds = new Set(db.ministries.map(m => m.id));
  db.ministries = db.ministries.map(m => {
    const seed = seedMinMap.get(m.id);
    if (seed) {
      return {
        ...seed,
        ...m,
        officialLogo: seed.officialLogo,
        logoUrl: m.customLogo || seed.officialLogo || m.logoUrl,
        aliases: m.aliases || seed.aliases,
        isActive: m.isActive ?? true,
      };
    }
    return { ...m, isActive: m.isActive ?? true };
  });
  for (const m of SEED_MINISTRIES) {
    if (!existingMinIds.has(m.id)) {
      db.ministries.push(m);
    }
  }

  // 4. Concours : fusionner les nouveaux concours réels sans écraser les créations utilisateur
  const seedComps = buildCompetitions();
  const existingCompIds = new Set(db.competitions.map(c => c.id));
  for (const c of seedComps) {
    if (!existingCompIds.has(c.id)) {
      db.competitions.push(c);
    }
  }

  db.version = 4;
  return db;
}

// ---- Supabase : synchronisation initiale au démarrage ----
let _supabaseInitDone = false;

function triggerSupabaseSync() {
  if (_supabaseInitDone) return;
  _supabaseInitDone = true;
  initSupabaseSync().then((cloudDb) => {
    if (cloudDb) {
      // Fusionner les données cloud avec les données locales existantes
      // Les données cloud enrichissent sans écraser les modifications locales
      const localDb = _loadLocalDB();
      const merged: DatabaseShape = {
        ...localDb,
        version: 4,
        // Utiliser les données cloud si elles sont plus complètes
        ministries: cloudDb.ministries.length >= localDb.ministries.length ? cloudDb.ministries : localDb.ministries,
        universities: cloudDb.universities.length >= localDb.universities.length ? cloudDb.universities : localDb.universities,
        schools: cloudDb.schools.length >= localDb.schools.length ? cloudDb.schools : localDb.schools,
        competitions: cloudDb.competitions.length >= localDb.competitions.length ? cloudDb.competitions : localDb.competitions,
        exams: cloudDb.exams.length >= localDb.exams.length ? cloudDb.exams : localDb.exams,
        documents: cloudDb.documents.length >= localDb.documents.length ? cloudDb.documents : localDb.documents,
        courses: cloudDb.courses.length >= localDb.courses.length ? cloudDb.courses : localDb.courses,
        // Conserver les données utilisateur locales (favoris, suivis, progression)
        favorites: localDb.favorites,
        follows: localDb.follows,
        progress: localDb.progress,
        notifications: cloudDb.notifications.length > 0 ? cloudDb.notifications : localDb.notifications,
        reports: localDb.reports,
        settings: localDb.settings,
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent('cm_db_update'));
        console.log('[Supabase] ✅ Données cloud fusionnées avec localStorage.');
      } catch { /* noop */ }
    }
  }).catch(() => {
    // Échec silencieux — les données locales continuent de fonctionner
  });
}

/** Lecture interne localStorage (sans déclencher le sync Supabase). */
function _loadLocalDB(): DatabaseShape {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) {
      const v3Raw = localStorage.getItem('cm_db_v3');
      const v2Raw = localStorage.getItem('cm_db_v2');
      const prevRaw = v3Raw || v2Raw;
      if (prevRaw) {
        try {
          const prevDb = JSON.parse(prevRaw) as DatabaseShape;
          const migrated = migrateDatabase(prevDb);
          localStorage.setItem(KEY, JSON.stringify(migrated));
          return migrated;
        } catch { /* corrompu */ }
      }
      const db = seedDatabase();
      localStorage.setItem(KEY, JSON.stringify(db));
      return db;
    }
    const db = JSON.parse(raw) as DatabaseShape;
    if (db.version !== 4) {
      const migrated = migrateDatabase(db);
      localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }
    // Synchronisation non-destructive des logos officiels
    let needsSync = false;
    if (db.schools) {
      for (const s of db.schools) {
        const official = OFFICIAL_INSTITUTION_LOGOS[s.id];
        if (official && (s.officialLogo !== official || (!s.customLogo && s.logoUrl !== official))) {
          s.officialLogo = official;
          if (!s.customLogo) s.logoUrl = official;
          needsSync = true;
        }
      }
    }
    if (db.universities) {
      for (const u of db.universities) {
        const official = OFFICIAL_INSTITUTION_LOGOS[u.id];
        if (official && (u.officialLogo !== official || (!u.customLogo && u.logoUrl !== official))) {
          u.officialLogo = official;
          if (!u.customLogo) u.logoUrl = official;
          needsSync = true;
        }
      }
    }
    if (db.ministries) {
      for (const m of db.ministries) {
        const official = OFFICIAL_INSTITUTION_LOGOS[m.id];
        if (official && (m.officialLogo !== official || (!m.customLogo && m.logoUrl !== official))) {
          m.officialLogo = official;
          if (!m.customLogo) m.logoUrl = official;
          needsSync = true;
        }
      }
    }
    if (needsSync) {
      try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* noop */ }
    }
    return db;
  } catch {
    const db = seedDatabase();
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* noop */ }
    return db;
  }
}

export function loadDB(): DatabaseShape {
  // Déclencher la synchronisation Supabase au premier appel (non bloquant)
  triggerSupabaseSync();
  return _loadLocalDB();
}

export function saveDB(db: DatabaseShape) {
  localStorage.setItem(KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent('cm_db_update'));
}

/** Hook réactif : re-render à chaque mutation de la base. */
export function useDbVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const fn = () => setV((x) => x + 1);
    window.addEventListener('cm_db_update', fn);
    return () => window.removeEventListener('cm_db_update', fn);
  }, []);
  return v;
}

export function useDB(): DatabaseShape {
  useDbVersion();
  return loadDB();
}

// ---------------- Session ----------------
export function getSessionUserId(): string | null {
  try {
    let val = localStorage.getItem(SESSION_KEY);
    if (!val) {
      val = localStorage.getItem('cm_session_v2');
      if (val) localStorage.setItem(SESSION_KEY, val);
    }
    return val;
  } catch { return null; }
}
export function setSessionUserId(id: string | null) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent('cm_db_update'));
}

// ---------------- Requêtes génériques ----------------
export interface PageResult<T> { items: T[]; total: number; page: number; perPage: number; totalPages: number; }

function paginate<T>(arr: T[], page: number, perPage: number): PageResult<T> {
  const total = arr.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * perPage;
  return { items: arr.slice(start, start + perPage), total, page: p, perPage, totalPages };
}

export interface CompetitionFilters {
  q?: string; ministry?: string; school?: string; university?: string; year?: string; level?: string;
  city?: string; domaine?: string; status?: string; category?: string; sort?: string;
}

export function queryCompetitions(f: CompetitionFilters, page = 1, perPage = 12, includeDrafts = false): PageResult<Competition> {
  let arr = loadDB().competitions.filter((c) => (includeDrafts ? true : c.publishStatus === 'PUBLISHED'));
  const q = (f.q ?? '').trim().toLowerCase();
  if (q) arr = arr.filter((c) => [c.title, c.organizationName, c.city, c.level, String(c.year), c.domaine ?? ''].join(' ').toLowerCase().includes(q));
  if (f.ministry) arr = arr.filter((c) => c.ministryId === f.ministry);
  if (f.school) arr = arr.filter((c) => c.schoolId === f.school);
  if (f.university) {
    const db = loadDB();
    const schoolsInUniv = new Set(db.schools.filter(s => s.universityId === f.university).map(s => s.id));
    arr = arr.filter((c) => (c.schoolId && schoolsInUniv.has(c.schoolId)));
  }
  if (f.year) arr = arr.filter((c) => String(c.year) === f.year);
  if (f.level) arr = arr.filter((c) => c.level === f.level);
  if (f.city) arr = arr.filter((c) => c.city === f.city);
  if (f.domaine) arr = arr.filter((c) => c.domaine === f.domaine);
  if (f.category) arr = arr.filter((c) => c.category === f.category);
  if (f.status) arr = arr.filter((c) => statusFromCompetition(c) === f.status);
  const sort = f.sort ?? 'deadline';
  arr = [...arr].sort((a, b) => {
    if (sort === 'deadline') return (a.registrationDeadline ?? '9').localeCompare(b.registrationDeadline ?? '9');
    if (sort === 'recent') return b.publishedAt.localeCompare(a.publishedAt);
    if (sort === 'oldest') return a.publishedAt.localeCompare(b.publishedAt);
    if (sort === 'name') return a.title.localeCompare(b.title, 'fr');
    if (sort === 'places') return b.places - a.places;
    if (sort === 'views') return b.views - a.views;
    return 0;
  });
  return paginate(arr, page, perPage);
}

export function getCompetitionBySlug(slug: string): Competition | undefined {
  return loadDB().competitions.find((c) => c.slug === slug);
}

export function incrementViews(id: string) {
  const db = loadDB();
  const c = db.competitions.find((x) => x.id === id);
  if (c) { c.views += 1; saveDB(db); }
}

export function getRelatedCompetitions(c: Competition, n = 3): Competition[] {
  return loadDB().competitions
    .filter((x) => x.id !== c.id && x.publishStatus === 'PUBLISHED' && (x.schoolId === c.schoolId || x.ministryId === c.ministryId || x.domaine === c.domaine))
    .slice(0, n);
}

export function resolveOrgLogo(c: Competition): { logoUrl?: string; logoColor: string; name: string } {
  const db = loadDB();
  const school = c.schoolId ? db.schools.find(x => x.id === c.schoolId) : undefined;
  const ministry = c.ministryId ? db.ministries.find(x => x.id === c.ministryId) : undefined;
  const university = (c.universityId || school?.universityId) ? db.universities?.find(u => u.id === (c.universityId || school?.universityId)) : undefined;

  const resolved = resolveInstitutionLogo({
    customLogo: c.customLogo || school?.customLogo || ministry?.customLogo,
    officialLogo: c.officialLogo || school?.officialLogo || ministry?.officialLogo,
    institutionId: c.schoolId || c.ministryId,
    institutionType: c.schoolId ? 'school' : 'ministry',
    universityId: university?.id,
    universityLogo: university?.logoUrl,
    ministryId: ministry?.id,
    ministryLogo: ministry?.logoUrl,
    existingLogoUrl: c.logoUrl,
  });

  return {
    logoUrl: resolved.logoUrl || c.logoUrl || school?.logoUrl || ministry?.logoUrl,
    logoColor: school?.logoColor || ministry?.logoColor || c.logoColor || '#0B2A4A',
    name: school?.shortName || ministry?.shortName || c.organizationName,
  };
}

// ---------------- Universités ----------------
export interface UniversityFilters { q?: string; city?: string; region?: string; ministryId?: string; }
export function queryUniversities(f: UniversityFilters = {}, page = 1, perPage = 24): PageResult<University> {
  let arr = (loadDB().universities || []).filter(u => u.isActive !== false);
  const q = (f.q ?? '').trim().toLowerCase();
  if (q) arr = arr.filter((u) => [u.name, u.shortName, u.city, u.region, ...(u.aliases || [])].join(' ').toLowerCase().includes(q));
  if (f.city) arr = arr.filter((u) => u.city === f.city);
  if (f.region) arr = arr.filter((u) => u.region === f.region);
  if (f.ministryId) arr = arr.filter((u) => u.ministryId === f.ministryId);
  return paginate(arr, page, perPage);
}
export function getUniversityById(id: string): University | undefined {
  return (loadDB().universities || []).find((u) => u.id === id);
}
export function getUniversityBySlug(slug: string): University | undefined {
  return (loadDB().universities || []).find((u) => u.slug === slug);
}
export function universityStats(universityId: string) {
  const db = loadDB();
  const affiliatedSchools = db.schools.filter(s => s.universityId === universityId);
  const schoolIds = new Set(affiliatedSchools.map(s => s.id));
  return {
    ecolesCount: affiliatedSchools.length,
    concoursCount: db.competitions.filter(c => c.schoolId && schoolIds.has(c.schoolId) && c.publishStatus === 'PUBLISHED').length,
    examensCount: db.exams.filter(e => e.schoolId && schoolIds.has(e.schoolId) && e.publishStatus === 'PUBLISHED').length,
  };
}

// ---------------- Écoles ----------------
export interface SchoolFilters {
  q?: string; city?: string; region?: string; type?: string; domaine?: string; level?: string;
  universityId?: string; ministryId?: string;
}
export function querySchools(f: SchoolFilters, page = 1, perPage = 12): PageResult<School> {
  let arr = loadDB().schools.filter(s => s.isActive !== false);
  const q = (f.q ?? '').trim().toLowerCase();
  if (q) arr = arr.filter((s) => [s.name, s.shortName, s.city, s.type, ...(s.aliases || [])].join(' ').toLowerCase().includes(q));
  if (f.city) arr = arr.filter((s) => s.city === f.city);
  if (f.region) arr = arr.filter((s) => s.region === f.region);
  if (f.type) arr = arr.filter((s) => s.type === f.type);
  if (f.universityId) arr = arr.filter((s) => s.universityId === f.universityId);
  if (f.ministryId) arr = arr.filter((s) => s.ministryId === f.ministryId);
  if (f.domaine) arr = arr.filter((s) => s.domains.includes(f.domaine!));
  if (f.level) arr = arr.filter((s) => s.levels.includes(f.level!));
  return paginate(arr, page, perPage);
}
export function getSchoolBySlug(slug: string) { return loadDB().schools.find((s) => s.slug === slug); }
export function getSchoolById(id: string) { return loadDB().schools.find((s) => s.id === id); }
export function schoolStats(schoolId: string) {
  const db = loadDB();
  return {
    concours: db.competitions.filter((c) => c.schoolId === schoolId && c.publishStatus === 'PUBLISHED').length,
    examens: db.exams.filter((e) => e.schoolId === schoolId && e.publishStatus === 'PUBLISHED').length,
    documents: db.documents.filter((d) => d.schoolId === schoolId && d.publishStatus === 'PUBLISHED').length,
  };
}

// ---------------- Ministères ----------------
export function getMinistryById(id: string): Ministry | undefined {
  return loadDB().ministries.find(m => m.id === id);
}
export function getMinistryBySlug(slug: string): Ministry | undefined {
  return loadDB().ministries.find(m => m.slug === slug);
}
export function queryMinistries(q = ''): Ministry[] {
  let arr = loadDB().ministries.filter(m => m.isActive !== false);
  const s = q.trim().toLowerCase();
  if (s) arr = arr.filter(m => [m.name, m.shortName, ...(m.aliases || [])].join(' ').toLowerCase().includes(s));
  return arr;
}

// ---------------- Examens ----------------
export interface ExamFilters { q?: string; school?: string; year?: string; level?: string; subject?: string; type?: string; }
export function queryExams(f: ExamFilters, page = 1, perPage = 12, includeDrafts = false): PageResult<Exam> {
  let arr = loadDB().exams.filter((e) => (includeDrafts ? true : e.publishStatus === 'PUBLISHED'));
  const q = (f.q ?? '').trim().toLowerCase();
  if (q) arr = arr.filter((e) => [e.title, e.schoolName, e.subject, String(e.year)].join(' ').toLowerCase().includes(q));
  if (f.school) arr = arr.filter((e) => e.schoolId === f.school);
  if (f.year) arr = arr.filter((e) => String(e.year) === f.year);
  if (f.level) arr = arr.filter((e) => e.level === f.level);
  if (f.subject) arr = arr.filter((e) => e.subject === f.subject);
  if (f.type) arr = arr.filter((e) => e.type === f.type);
  arr = [...arr].sort((a, b) => b.year - a.year || b.downloads - a.downloads);
  return paginate(arr, page, perPage);
}
export function getExamBySlug(slug: string) { return loadDB().exams.find((e) => e.slug === slug); }

// ---------------- Documents ----------------
export interface DocFilters { q?: string; category?: string; year?: string; org?: string; }
export function queryDocuments(f: DocFilters, page = 1, perPage = 12, includeDrafts = false): PageResult<DocItem> {
  let arr = loadDB().documents.filter((d) => (includeDrafts ? true : d.publishStatus === 'PUBLISHED'));
  const q = (f.q ?? '').trim().toLowerCase();
  if (q) arr = arr.filter((d) => [d.title, d.organizationName, d.category].join(' ').toLowerCase().includes(q));
  if (f.category) arr = arr.filter((d) => d.category === f.category);
  if (f.year) arr = arr.filter((d) => String(d.year) === f.year);
  if (f.org) arr = arr.filter((d) => d.schoolId === f.org || d.ministryId === f.org);
  arr = [...arr].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(arr, page, perPage);
}
export function getDocumentBySlug(slug: string) { return loadDB().documents.find((d) => d.slug === slug); }

// ---------------- Cours ----------------
export function queryCourses(q = '', subject = ''): Course[] {
  let arr = loadDB().courses.filter((c) => c.publishStatus === 'PUBLISHED');
  const s = q.trim().toLowerCase();
  if (s) arr = arr.filter((c) => [c.title, c.subject, c.description].join(' ').toLowerCase().includes(s));
  if (subject) arr = arr.filter((c) => c.subject === subject);
  return arr;
}
export function getCourseBySlug(slug: string) { return loadDB().courses.find((c) => c.slug === slug); }
export function courseLessonsCount(c: Course) { return c.chapters.reduce((n, ch) => n + ch.lessons.length, 0); }

// ---------------- Recherche globale ----------------
export interface GlobalResults {
  competitions: Competition[];
  schools: School[];
  universities: University[];
  ministries: Ministry[];
  exams: Exam[];
  documents: DocItem[];
  courses: Course[];
}
export function globalSearch(q: string): GlobalResults {
  const s = q.trim().toLowerCase();
  const db = loadDB();
  if (s.length < 2) return { competitions: [], schools: [], universities: [], ministries: [], exams: [], documents: [], courses: [] };
  const match = (txt: string) => txt.toLowerCase().includes(s);
  return {
    competitions: db.competitions.filter((c) => c.publishStatus === 'PUBLISHED' && match(`${c.title} ${c.organizationName} ${c.city}`)).slice(0, 5),
    schools: db.schools.filter((x) => x.isActive !== false && match(`${x.name} ${x.shortName} ${x.city} ${(x.aliases || []).join(' ')}`)).slice(0, 4),
    universities: (db.universities || []).filter((u) => u.isActive !== false && match(`${u.name} ${u.shortName} ${u.city} ${(u.aliases || []).join(' ')}`)).slice(0, 3),
    ministries: db.ministries.filter((m) => m.isActive !== false && match(`${m.name} ${m.shortName} ${(m.aliases || []).join(' ')}`)).slice(0, 3),
    exams: db.exams.filter((e) => e.publishStatus === 'PUBLISHED' && match(`${e.title} ${e.schoolName} ${e.subject}`)).slice(0, 4),
    documents: db.documents.filter((d) => d.publishStatus === 'PUBLISHED' && match(`${d.title} ${d.organizationName}`)).slice(0, 4),
    courses: db.courses.filter((c) => c.publishStatus === 'PUBLISHED' && match(`${c.title} ${c.subject}`)).slice(0, 4),
  };
}

// ---------------- Favoris / Suivis ----------------
export function isFavorite(userId: string, targetType: Favorite['targetType'], targetId: string): boolean {
  return loadDB().favorites.some((f) => f.userId === userId && f.targetType === targetType && f.targetId === targetId);
}
export function toggleFavorite(userId: string, targetType: Favorite['targetType'], targetId: string): boolean {
  const db = loadDB();
  const i = db.favorites.findIndex((f) => f.userId === userId && f.targetType === targetType && f.targetId === targetId);
  if (i >= 0) { db.favorites.splice(i, 1); saveDB(db); return false; }
  db.favorites.push({ id: uid('fav'), userId, targetType, targetId, createdAt: new Date().toISOString() });
  saveDB(db); return true;
}
export function userFavorites(userId: string): Favorite[] {
  return loadDB().favorites.filter((f) => f.userId === userId);
}
export function isFollowing(userId: string, competitionId: string): boolean {
  return loadDB().follows.some((f) => f.userId === userId && f.competitionId === competitionId);
}
export function toggleFollow(userId: string, competitionId: string): boolean {
  const db = loadDB();
  const i = db.follows.findIndex((f) => f.userId === userId && f.competitionId === competitionId);
  if (i >= 0) { db.follows.splice(i, 1); saveDB(db); return false; }
  db.follows.push({ id: uid('fol'), userId, competitionId, createdAt: new Date().toISOString() });
  saveDB(db); return true;
}
export function userFollows(userId: string): Follow[] {
  return loadDB().follows.filter((f) => f.userId === userId);
}
export function followersCount(competitionId: string): number {
  return loadDB().follows.filter((f) => f.competitionId === competitionId).length;
}

// ---------------- Progression ----------------
export function getProgress(userId: string, courseId: string): UserProgress | undefined {
  return loadDB().progress.find((p) => p.userId === userId && p.courseId === courseId);
}
export function toggleLessonComplete(userId: string, courseId: string, lessonId: string) {
  const db = loadDB();
  let p = db.progress.find((x) => x.userId === userId && x.courseId === courseId);
  if (!p) {
    p = { id: uid('prog'), userId, courseId, completedLessons: [], percent: 0, updatedAt: new Date().toISOString() };
    db.progress.push(p);
  }
  const i = p.completedLessons.indexOf(lessonId);
  if (i >= 0) p.completedLessons.splice(i, 1); else p.completedLessons.push(lessonId);
  const course = db.courses.find((c) => c.id === courseId);
  const total = course ? course.chapters.reduce((n, ch) => n + ch.lessons.length, 0) : 1;
  p.percent = Math.round((p.completedLessons.length / Math.max(1, total)) * 100);
  p.updatedAt = new Date().toISOString();
  saveDB(db);
}

// ---------------- Notifications ----------------
export function userNotifications(userId: string): AppNotification[] {
  return loadDB().notifications
    .filter((n) => n.userId === 'all' || n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function unreadCount(userId: string): number {
  return userNotifications(userId).filter((n) => !n.readBy.includes(userId)).length;
}
export function markNotificationRead(userId: string, notifId: string) {
  const db = loadDB();
  const n = db.notifications.find((x) => x.id === notifId);
  if (n && !n.readBy.includes(userId)) { n.readBy.push(userId); saveDB(db); }
}
export function markAllRead(userId: string) {
  const db = loadDB();
  db.notifications.forEach((n) => { if (!n.readBy.includes(userId)) n.readBy.push(userId); });
  saveDB(db);
}
export function pushNotification(n: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>) {
  const db = loadDB();
  db.notifications.unshift({ ...n, id: uid('notif'), createdAt: new Date().toISOString(), readBy: [] });
  saveDB(db);
}

// ---------------- Signalements ----------------
export function createReport(r: Omit<Report, 'id' | 'createdAt' | 'status'>) {
  const db = loadDB();
  db.reports.unshift({ ...r, id: uid('rep'), status: 'OPEN', createdAt: new Date().toISOString() });
  saveDB(db);
}

// ---------------- CRUD générique (admin) ----------------
type Collection = 'competitions' | 'schools' | 'universities' | 'ministries' | 'exams' | 'documents' | 'courses' | 'users' | 'notifications' | 'reports';

export function adminCreate<T extends { id: string }>(col: Collection, item: T) {
  const db = loadDB();
  if (!db[col]) {
    (db[col] as unknown as T[]) = [];
  }
  (db[col] as unknown as T[]).unshift(item);
  saveDB(db);
  // ⬢ Sync vers Supabase en arrière-plan
  pushToSupabase(col, item as unknown as Record<string, unknown>);
}
export function adminUpdate<T extends { id: string }>(col: Collection, id: string, patch: Partial<T>) {
  const db = loadDB();
  const arr = db[col] as unknown as T[];
  if (!arr) return;
  const i = arr.findIndex((x) => x.id === id);
  if (i >= 0) {
    arr[i] = { ...arr[i], ...patch };
    saveDB(db);
    // ⬢ Sync vers Supabase en arrière-plan
    pushToSupabase(col, arr[i] as unknown as Record<string, unknown>);
  }
}
export function adminDelete(col: Collection, id: string) {
  const db = loadDB();
  if (!db[col]) return;
  (db[col] as unknown as { id: string }[]) = (db[col] as unknown as { id: string }[]).filter((x) => x.id !== id);
  saveDB(db);
  // ⬢ Sync vers Supabase en arrière-plan
  deleteFromSupabase(col, id);
}

/** Archive logique : marque isActive = false sans supprimer les liens de concours associés */
export function adminArchiveItem(col: 'schools' | 'universities' | 'ministries', id: string, active = false) {
  adminUpdate(col, id, { isActive: active } as any);
}

// ---------------- Statistiques ----------------
export function publicStats() {
  const db = loadDB();
  const pub = db.competitions.filter((c) => c.publishStatus === 'PUBLISHED');
  return {
    concours: pub.length,
    ecoles: db.schools.filter(s => s.isActive !== false).length,
    universites: (db.universities || []).filter(u => u.isActive !== false).length,
    ministeres: db.ministries.filter(m => m.isActive !== false).length,
    examens: db.exams.filter((e) => e.publishStatus === 'PUBLISHED').length,
    documents: db.documents.filter((d) => d.publishStatus === 'PUBLISHED').length,
  };
}
export function adminStats() {
  const db = loadDB();
  const all = db.competitions;
  const pub = all.filter((c) => c.publishStatus === 'PUBLISHED');
  const byStatus = (s: string) => pub.filter((c) => statusFromCompetition(c) === s).length;
  return {
    totalConcours: all.length,
    ouverts: byStatus('Ouvert'),
    bientot: byStatus('Bientot'),
    fermes: byStatus('Ferme'),
    ecoles: db.schools.length,
    universites: (db.universities || []).length,
    ministeres: db.ministries.length,
    examens: db.exams.length,
    documents: db.documents.length,
    cours: db.courses.length,
    users: db.users.length,
    reports: db.reports.filter((r) => r.status === 'OPEN').length,
    drafts: all.filter((c) => c.publishStatus !== 'PUBLISHED').length,
  };
}
export function competitionsByMonth(): { label: string; count: number }[] {
  const db = loadDB();
  const months: Record<string, number> = {};
  db.competitions.forEach((c) => {
    const d = new Date(c.publishedAt);
    const k = d.toLocaleDateString('fr-MA', { month: 'short' });
    months[k] = (months[k] ?? 0) + 1;
  });
  return Object.entries(months).map(([label, count]) => ({ label, count }));
}

// ---------------- Utilisateurs (admin) ----------------
export function getUserById(id: string): User | undefined {
  return loadDB().users.find((u) => u.id === id);
}
export function getUserByEmail(email: string): User | undefined {
  return loadDB().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export { statusFromCompetition };
export type { Ministry, School, University, User };
