// ============================================================
// CONCOURS MAROC — Utilitaires
// Calculs de dates (fuseau Afrique/Casablanca), slugs, formatage.
// ============================================================

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

export function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

/** Jours restants avant la date limite (fuseau Maroc). */
export function daysRemaining(deadline?: string): number | null {
  if (!deadline) return null;
  try {
    const now = new Date();
    // Comparaison calendaire simple (suffisant côté client)
    const end = new Date(deadline);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const diff = Math.ceil((startOfEnd.getTime() - startOfToday.getTime()) / 86400000);
    return diff;
  } catch {
    return null;
  }
}

export function remainingLabel(deadline?: string): { text: string; tone: 'green' | 'orange' | 'red' | 'gray' } {
  const r = daysRemaining(deadline);
  if (r === null) return { text: 'Date à confirmer', tone: 'gray' };
  if (r < 0) return { text: 'Fermé', tone: 'red' };
  if (r === 0) return { text: "Dernier jour !", tone: 'red' };
  if (r === 1) return { text: '1 jour restant', tone: 'red' };
  if (r <= 7) return { text: `${r} jours restants`, tone: 'red' };
  if (r <= 30) return { text: `${r} jours restants`, tone: 'green' };
  return { text: `${r} jours restants`, tone: 'orange' };
}

export function formatDateFR(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function formatDateShort(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function formatDateTimeFR(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' à ' +
      d.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return '—';
  }
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return formatDateShort(iso);
}

export function formatNumber(n: number): string {
  return n.toLocaleString('fr-MA');
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

/** Hachage mot de passe côté client (démo). En production : bcrypt/argon2 côté serveur. */
export function hashPassword(password: string, salt = 'cm_salt_v1'): string {
  let h1 = 0xdeadbeef ^ salt.length;
  let h2 = 0x41c6ce57 ^ salt.length;
  const str = salt + '::' + password;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'cm1$' + (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function statusFromCompetition(c: {
  manualStatus?: string;
  registrationDeadline?: string;
  registrationStart?: string;
}): 'Ouvert' | 'Bientot' | 'Ferme' | 'Suspendu' | 'Archive' {
  if (c.manualStatus === 'Suspendu') return 'Suspendu';
  if (c.manualStatus === 'Archive') return 'Archive';
  const now = Date.now();
  if (c.registrationStart && new Date(c.registrationStart).getTime() > now) return 'Bientot';
  if (c.manualStatus === 'Bientot') return 'Bientot';
  if (c.registrationDeadline && new Date(c.registrationDeadline).getTime() < now) return 'Ferme';
  if (c.manualStatus === 'Ferme') return 'Ferme';
  return 'Ouvert';
}

export const STATUS_META: Record<string, { label: string; classes: string; dot: string }> = {
  Ouvert: { label: 'Ouvert', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  Bientot: { label: 'Bientôt', classes: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  Ferme: { label: 'Fermé', classes: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  Suspendu: { label: 'Suspendu', classes: 'bg-slate-100 text-slate-700 ring-slate-300', dot: 'bg-slate-500' },
  Archive: { label: 'Archivé', classes: 'bg-slate-100 text-slate-500 ring-slate-200', dot: 'bg-slate-400' },
};

export const LEVELS = ['Bac', 'Bac+0', 'Bac+1', 'Bac+2', 'Bac+3', 'Bac+4', 'Bac+5', 'Bac+6', 'Doctorat', 'Tous niveaux'];
export const SUBJECTS = [
  'Mathématiques',
  'Physique',
  'Chimie',
  'SVT',
  'Informatique',
  'Français',
  'Anglais',
  'Arabe',
  'Logique',
  'Culture générale',
  'Économie',
  'Droit',
  'Médecine',
];
export const CITIES = [
  'Rabat',
  'Casablanca',
  'Marrakech',
  'Fès',
  'Meknès',
  'Tanger',
  'Agadir',
  'Oujda',
  'Kénitra',
  'Tétouan',
  'Mohammedia',
  'El Jadida',
  'Béni Mellal',
  'Nador',
  'Laâyoune',
  'Dakhla',
  'Tout le Maroc',
];
export const DOMAINS = [
  'Ingénierie',
  'Informatique',
  'Santé',
  'Éducation',
  'Droit',
  'Économie',
  'Administration',
  'Agriculture',
  'Architecture',
  'Commerce',
  'Sciences',
];
export const REGIONS = [
  'Rabat-Salé-Kénitra',
  'Casablanca-Settat',
  'Marrakech-Safi',
  'Fès-Meknès',
  'Tanger-Tétouan-Al Hoceïma',
  'Souss-Massa',
  'Oriental',
  'Béni Mellal-Khénifra',
  'Drâa-Tafilalet',
  'Guelmim-Oued Noun',
  'Laâyoune-Sakia El Hamra',
  'Dakhla-Oued Ed-Dahab',
];

