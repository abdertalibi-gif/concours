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

/**
 * Analyse une date sous divers formats courants (ISO, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, timestamp).
 * @param val Chaîne, Date, ou nombre
 * @param isDeadline S'il s'agit d'une date limite sans heure précisée, fixée à la fin de journée (23:59:59.999)
 */
export function parseDateSafe(val?: string | Date | number | null, isDeadline = false): Date | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(val).trim();
  if (!s || s === '—' || s === '-' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return null;

  // Format JJ/MM/AAAA ou JJ-MM-AAAA (avec ou sans heure)
  const frMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (frMatch) {
    const day = parseInt(frMatch[1], 10);
    const month = parseInt(frMatch[2], 10) - 1;
    const year = parseInt(frMatch[3], 10);
    const hour = frMatch[4] ? parseInt(frMatch[4], 10) : (isDeadline ? 23 : 0);
    const min = frMatch[5] ? parseInt(frMatch[5], 10) : (isDeadline ? 59 : 0);
    const sec = frMatch[6] ? parseInt(frMatch[6], 10) : (isDeadline ? 59 : 0);
    const d = new Date(year, month, day, hour, min, sec);
    return isNaN(d.getTime()) ? null : d;
  }

  // Format YYYY-MM-DD seul (sans heure)
  const isoDateOnly = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoDateOnly) {
    const year = parseInt(isoDateOnly[1], 10);
    const month = parseInt(isoDateOnly[2], 10) - 1;
    const day = parseInt(isoDateOnly[3], 10);
    const hour = isDeadline ? 23 : 0;
    const min = isDeadline ? 59 : 0;
    const sec = isDeadline ? 59 : 0;
    const d = new Date(year, month, day, hour, min, sec);
    return isNaN(d.getTime()) ? null : d;
  }

  // Parse ISO ou format standard
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

/** Jours restants avant la date limite (fuseau Maroc). */
export function daysRemaining(deadline?: string | Date | null): number | null {
  if (!deadline) return null;
  const end = parseDateSafe(deadline, true);
  if (!end) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.ceil((startOfEnd.getTime() - startOfToday.getTime()) / 86400000);
  return diff;
}

export type AutoCompetitionStatus = 'OUVERT' | 'A_VENIR' | 'CLOTURE' | 'DATE_A_VERIFIER';

export interface CompetitionDateEvaluation {
  status: AutoCompetitionStatus;
  label: 'OUVERT' | 'À VENIR' | 'CLÔTURÉ' | 'DATE À VÉRIFIER';
  hasOpeningDate: boolean;
  hasClosingDate: boolean;
  hasIncoherentDates: boolean;
  isIncoherent: boolean;
  isDateReliable: boolean;
  openingDate: Date | null;
  closingDate: Date | null;
  warning?: string;
  daysRemainingToClose: number | null;
  daysRemainingToOpen: number | null;
}

/**
 * Calcule automatiquement et rigoureusement le statut d'un concours à partir des dates.
 * 
 * RÈGLES APPLIQUÉES :
 * - Si ouverture atteinte et clôture non dépassée : OUVERT
 * - Si clôture dépassée : CLÔTURÉ
 * - Si ouverture dans le futur : À VENIR
 * - Si dates manquantes, incomplètes ou incohérentes (inversées) : DATE À VÉRIFIER
 * 
 * Ne supprime JAMAIS ni ne clôture un concours sur simple absence de date.
 */
export function evaluateCompetitionDates(c: {
  registrationStart?: string | Date | null;
  registrationDeadline?: string | Date | null;
  openingDate?: string | Date | null;
  closingDate?: string | Date | null;
  applicationDeadline?: string | Date | null;
  competitionDate?: string | Date | null;
  [key: string]: any;
}, now: Date = new Date()): CompetitionDateEvaluation {
  const open = parseDateSafe(c.registrationStart ?? (c as any).openingDate, false);
  const close = parseDateSafe(c.registrationDeadline ?? (c as any).closingDate ?? (c as any).applicationDeadline, true);
  const nowMs = now.getTime();

  const hasOpeningDate = Boolean(open);
  const hasClosingDate = Boolean(close);

  let daysRemainingToClose: number | null = null;
  if (close) {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfClose = new Date(close.getFullYear(), close.getMonth(), close.getDate());
    daysRemainingToClose = Math.ceil((startOfClose.getTime() - startOfToday.getTime()) / 86400000);
  }

  let daysRemainingToOpen: number | null = null;
  if (open) {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfOpen = new Date(open.getFullYear(), open.getMonth(), open.getDate());
    daysRemainingToOpen = Math.ceil((startOfOpen.getTime() - startOfToday.getTime()) / 86400000);
  }

  const buildResult = (res: Omit<CompetitionDateEvaluation, 'isIncoherent'>): CompetitionDateEvaluation => ({
    ...res,
    isIncoherent: res.hasIncoherentDates,
  });

  // 1. Détection de dates incohérentes (ouverture après clôture)
  if (open && close && open.getTime() > close.getTime()) {
    return buildResult({
      status: 'DATE_A_VERIFIER',
      label: 'DATE À VÉRIFIER',
      hasOpeningDate,
      hasClosingDate,
      hasIncoherentDates: true,
      isDateReliable: false,
      openingDate: open,
      closingDate: close,
      warning: "Date d'ouverture postérieure à la date limite de candidature.",
      daysRemainingToClose,
      daysRemainingToOpen,
    });
  }

  // 2. Les deux dates sont disponibles et cohérentes
  if (open && close) {
    if (nowMs < open.getTime()) {
      return buildResult({
        status: 'A_VENIR',
        label: 'À VENIR',
        hasOpeningDate,
        hasClosingDate,
        hasIncoherentDates: false,
        isDateReliable: true,
        openingDate: open,
        closingDate: close,
        daysRemainingToClose,
        daysRemainingToOpen,
      });
    }
    if (nowMs > close.getTime()) {
      return buildResult({
        status: 'CLOTURE',
        label: 'CLÔTURÉ',
        hasOpeningDate,
        hasClosingDate,
        hasIncoherentDates: false,
        isDateReliable: true,
        openingDate: open,
        closingDate: close,
        daysRemainingToClose,
        daysRemainingToOpen,
      });
    }
    return buildResult({
      status: 'OUVERT',
      label: 'OUVERT',
      hasOpeningDate,
      hasClosingDate,
      hasIncoherentDates: false,
      isDateReliable: true,
      openingDate: open,
      closingDate: close,
      daysRemainingToClose,
      daysRemainingToOpen,
    });
  }

  // 3. Seule la date limite (clôture) est renseignée
  if (close) {
    if (nowMs > close.getTime()) {
      return buildResult({
        status: 'CLOTURE',
        label: 'CLÔTURÉ',
        hasOpeningDate,
        hasClosingDate,
        hasIncoherentDates: false,
        isDateReliable: true,
        openingDate: null,
        closingDate: close,
        warning: "Date d'ouverture non renseignée.",
        daysRemainingToClose,
        daysRemainingToOpen: null,
      });
    }
    return buildResult({
      status: 'OUVERT',
      label: 'OUVERT',
      hasOpeningDate,
      hasClosingDate,
      hasIncoherentDates: false,
      isDateReliable: true,
      openingDate: null,
      closingDate: close,
      warning: "Date d'ouverture non renseignée.",
      daysRemainingToClose,
      daysRemainingToOpen: null,
    });
  }

  // 4. Seule la date d'ouverture est renseignée
  if (open) {
    if (nowMs < open.getTime()) {
      return buildResult({
        status: 'A_VENIR',
        label: 'À VENIR',
        hasOpeningDate,
        hasClosingDate,
        hasIncoherentDates: false,
        isDateReliable: true,
        openingDate: open,
        closingDate: null,
        warning: "Date limite de clôture non communiquée.",
        daysRemainingToClose: null,
        daysRemainingToOpen,
      });
    }
    // Ouverture passée mais aucune date limite connue -> Date à vérifier
    return buildResult({
      status: 'DATE_A_VERIFIER',
      label: 'DATE À VÉRIFIER',
      hasOpeningDate,
      hasClosingDate,
      hasIncoherentDates: false,
      isDateReliable: false,
      openingDate: open,
      closingDate: null,
      warning: "Date limite de candidature non communiquée.",
      daysRemainingToClose: null,
      daysRemainingToOpen,
    });
  }

  // 5. Aucune date disponible
  return buildResult({
    status: 'DATE_A_VERIFIER',
    label: 'DATE À VÉRIFIER',
    hasOpeningDate,
    hasClosingDate,
    hasIncoherentDates: false,
    isDateReliable: false,
    openingDate: null,
    closingDate: null,
    warning: "Aucune date officielle d'ouverture ou de clôture disponible.",
    daysRemainingToClose: null,
    daysRemainingToOpen: null,
  });
}

export function statusFromCompetition(c: {
  manualStatus?: string;
  registrationDeadline?: string | Date | null;
  registrationStart?: string | Date | null;
  openingDate?: string | Date | null;
  closingDate?: string | Date | null;
  applicationDeadline?: string | Date | null;
}): AutoCompetitionStatus {
  return evaluateCompetitionDates(c).status;
}

export function remainingLabel(
  deadline?: string | Date | null,
  start?: string | Date | null
): { text: string; tone: 'green' | 'orange' | 'red' | 'gray'; status: AutoCompetitionStatus } {
  const ev = evaluateCompetitionDates({ registrationDeadline: deadline, registrationStart: start });
  
  if (ev.status === 'CLOTURE') {
    return { text: 'Inscriptions closes', tone: 'gray', status: 'CLOTURE' };
  }
  if (ev.status === 'A_VENIR') {
    const days = ev.daysRemainingToOpen;
    if (days === 0) return { text: "Ouverture aujourd'hui !", tone: 'orange', status: 'A_VENIR' };
    if (days === 1) return { text: 'Ouverture demain', tone: 'orange', status: 'A_VENIR' };
    if (days && days > 0) return { text: `Ouverture dans ${days} j`, tone: 'orange', status: 'A_VENIR' };
    return { text: 'Inscriptions bientôt ouvertes', tone: 'orange', status: 'A_VENIR' };
  }
  if (ev.status === 'OUVERT') {
    const r = ev.daysRemainingToClose;
    if (r === null) return { text: 'En cours (date à confirmer)', tone: 'orange', status: 'OUVERT' };
    if (r <= 0) return { text: "Dernier jour !", tone: 'red', status: 'OUVERT' };
    if (r === 1) return { text: '1 jour restant', tone: 'red', status: 'OUVERT' };
    if (r <= 7) return { text: `${r} jours restants`, tone: 'red', status: 'OUVERT' };
    if (r <= 20) return { text: `${r} jours restants`, tone: 'orange', status: 'OUVERT' };
    return { text: `${r} jours restants`, tone: 'green', status: 'OUVERT' };
  }
  return { text: 'Date à vérifier', tone: 'gray', status: 'DATE_A_VERIFIER' };
}

export function formatDateFR(iso?: string | Date | null): string {
  if (!iso) return '—';
  const d = parseDateSafe(iso);
  if (!d) return '—';
  try {
    return d.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function formatDateShort(iso?: string | Date | null): string {
  if (!iso) return '—';
  const d = parseDateSafe(iso);
  if (!d) return '—';
  try {
    return d.toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function formatDateTimeFR(iso?: string | Date | null): string {
  if (!iso) return '—';
  const d = parseDateSafe(iso);
  if (!d) return '—';
  try {
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

export const STATUS_META: Record<string, { label: string; classes: string; dot: string }> = {
  OUVERT: { label: 'OUVERT', classes: 'bg-emerald-50 text-emerald-800 ring-emerald-300 font-extrabold shadow-sm', dot: 'bg-emerald-500 animate-pulse' },
  Ouvert: { label: 'OUVERT', classes: 'bg-emerald-50 text-emerald-800 ring-emerald-300 font-extrabold shadow-sm', dot: 'bg-emerald-500 animate-pulse' },
  A_VENIR: { label: 'À VENIR', classes: 'bg-sky-50 text-sky-800 ring-sky-300 font-bold', dot: 'bg-sky-500' },
  Bientot: { label: 'À VENIR', classes: 'bg-sky-50 text-sky-800 ring-sky-300 font-bold', dot: 'bg-sky-500' },
  CLOTURE: { label: 'CLÔTURÉ', classes: 'bg-slate-100 text-slate-700 ring-slate-200 font-semibold', dot: 'bg-slate-400' },
  Ferme: { label: 'CLÔTURÉ', classes: 'bg-slate-100 text-slate-700 ring-slate-200 font-semibold', dot: 'bg-slate-400' },
  DATE_A_VERIFIER: { label: 'DATE À VÉRIFIER', classes: 'bg-amber-50 text-amber-900 ring-amber-300 font-bold', dot: 'bg-amber-500' },
  DateAVerifier: { label: 'DATE À VÉRIFIER', classes: 'bg-amber-50 text-amber-900 ring-amber-300 font-bold', dot: 'bg-amber-500' },
  Suspendu: { label: 'SUSPENDU', classes: 'bg-rose-50 text-rose-700 ring-rose-200 font-bold', dot: 'bg-rose-500' },
  Archive: { label: 'ARCHIVÉ', classes: 'bg-slate-100 text-slate-500 ring-slate-200 font-semibold', dot: 'bg-slate-400' },
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

