// ============================================================
// Parseur de dates à la française → ISO YYYY-MM-DD
// Formats supportés :
//   - "25 septembre 2026" / "1er avril 2026"
//   - "25/09/2026", "25-09-2026", "25.09.2026"
//   - Plages "du X au Y" / "du X ... au Y" / "de X à Y"
//       → start = openingDate, end = deadlineDate (fin de plage)
// Règles de sécurité :
//   - jamais de date inventée (jour + mois + année explicites)
//   - date antérieure à la publication hors tolérance → champ vide (ambigu)
//   - plusieurs dates libres non classables → ne pas deviner (vide)
// ============================================================

import { normalizeStr } from '../normalizers/normalize';

export interface ParsedDates {
  openingDate?: string;
  deadlineDate?: string;
  examDate?: string;
  resultsDate?: string;
}

interface DateCandidate {
  day: number;
  month: number;
  year: number;
  index: number;
  length: number;
}

const FR_MONTHS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
};

const FR_MONTH_ABBR: Record<string, number> = {
  janv: 1,
  févr: 2,
  fevr: 2,
  avr: 4,
  juil: 7,
  sept: 9,
  oct: 10,
  nov: 11,
  déc: 12,
  dec: 12,
};

const KEYWORD_WINDOW = 90;

const KEYWORDS: Record<keyof ParsedDates, string[]> = {
  resultsDate: [
    'resultat',
    'affichage des resultats',
    'liste des admis',
    'admis',
    'publication des resultats',
    'lancement des resultats',
    'seront affiches',
  ],
  deadlineDate: [
    'date limite',
    'dernier delai',
    'delai de',
    'cloture',
    'jusqu au',
    'jusqua',
    'au plus tard',
    'depot',
    'dernier jour',
    'remise',
    'avant le',
    'fin des inscriptions',
    'fin du depot',
    'derniere date',
  ],
  examDate: [
    'concours',
    'epreuve',
    'ecrit',
    'oral',
    'entretien',
    'examen',
    'session',
    'test',
    'selection',
    'audition',
    'preconcours',
  ],
  openingDate: [
    'ouverture',
    'debut des',
    'lancement',
    'a partir du',
    'des le',
    'a compter du',
    'lance officiellement',
  ],
};

function fmtDate(c: DateCandidate): string {
  const y = String(c.year);
  const m = String(c.month).padStart(2, '0');
  const d = String(c.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseMonth(token: string): number | undefined {
  const t = normalizeStr(token);
  if (FR_MONTHS[t]) return FR_MONTHS[t];
  for (const [k, v] of Object.entries(FR_MONTH_ABBR)) {
    if (t === normalizeStr(k)) return v;
  }
  // "sept." / "septembre" → on accepte la racine
  if (t.startsWith('septem') || t === 'sept') return 9;
  if (t.startsWith('octo') || t === 'oct') return 10;
  if (t.startsWith('nove') || t === 'nov') return 11;
  if (t.startsWith('dece') || t === 'dec') return 12;
  return undefined;
}

function isRealDate(d: DateCandidate): boolean {
  const dt = new Date(Date.UTC(d.year, d.month - 1, d.day));
  return (
    dt.getUTCFullYear() === d.year &&
    dt.getUTCMonth() === d.month - 1 &&
    dt.getUTCDate() === d.day
  );
}

function collectCandidates(text: string): DateCandidate[] {
  const candidates: DateCandidate[] = [];

  // "25 septembre 2026", "1er avril 2026"
  // Attention : on évite que le numéro soit un numéro de page/rubrique.
  const reWords = /(\d{1,2})(?:er|eme|ème)?[\s.\-/]+([a-zà-ÿ]+)[\s.\-/]+(20\d{2})/gi;
  let m: RegExpExecArray | null;
  while ((m = reWords.exec(text))) {
    const month = parseMonth(m[2]);
    if (month) {
      candidates.push({
        day: Number(m[1]),
        month,
        year: Number(m[3]),
        index: m.index + m[1].length + 1,
        length: m[0].length,
      });
    }
  }

  // "25/09/2026", "25-09-2026", "25.09.2026"
  const reNum = /(\d{1,2})[\s/.\-]+(\d{1,2})[\s/.\-]+(20\d{2})/gi;
  while ((m = reNum.exec(text))) {
    let day = Number(m[1]);
    let month = Number(m[2]);
    if (month > 12) {
      const swap = day;
      day = month;
      month = swap;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      candidates.push({
        day,
        month,
        year: Number(m[3]),
        index: m.index,
        length: m[0].length,
      });
    }
  }

  candidates.sort((a, b) => a.index - b.index);
  return candidates.filter(isRealDate);
}

function windowAround(text: string, c: DateCandidate): string {
  const start = Math.max(0, c.index - KEYWORD_WINDOW);
  const end = Math.min(text.length, c.index + c.length + KEYWORD_WINDOW);
  return text.slice(start, end);
}

function classifyWindow(window: string): keyof ParsedDates | 'unknown' {
  const w = normalizeStr(window);
  let best: keyof ParsedDates | 'unknown' = 'unknown';
  let bestScore = 0;
  for (const cat of Object.keys(KEYWORDS) as (keyof ParsedDates)[]) {
    let score = 0;
    for (const kw of KEYWORDS[cat]) {
      const occurrences = w.split(kw).length - 1;
      score += occurrences;
    }
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return bestScore === 0 ? 'unknown' : best;
}

/** Détection de plages valides "du X ... au Y". */
function detectRanges(text: string, candidates: DateCandidate[]): Array<[DateCandidate, DateCandidate]> {
  const ranges: Array<[DateCandidate, DateCandidate]> = [];
  const used = new Set<number>();

  for (let i = 0; i + 1 < candidates.length; i++) {
    const a = candidates[i];
    const b = candidates[i + 1];
    if (used.has(a.index) || used.has(b.index)) continue;
    if (Math.abs(b.year - a.year) > 1) continue;

    // Fenêtre entre les deux dates (≤ 40 caractères)
    const between = text.slice(a.index + a.length, b.index).trim();
    if (between.length === 0 || between.length > 40) continue;

    // Connecteurs de plage : "au", "à", "jusqu'au", "jusqu'à", "-"
    const gap = normalizeStr(between).replace(/[^\wà]/g, '');
    const isRangeConnector =
      gap === 'au' ||
      gap === 'a' ||
      gap === 'à' ||
      gap === 'jusquau' ||
      gap === 'jusqua' ||
      /^-+$/.test(gap) ||
      /^jusqu/.test(gap) ||
      gap === 'auplustard';

    // Le début doit être précédé de "du"/"de" (ou d'un "le")
    const beforeStart = normalizeStr(text.slice(Math.max(0, a.index - 12), a.index));
    const hasStartMarker = /(du|de|le|entre|commençant)\s*$/.test(beforeStart);

    if (isRangeConnector) {
      ranges.push([a, b]);
      used.add(a.index);
      used.add(b.index);
      continue;
    }
    if (hasStartMarker && /au|à/.test(normalizeStr(between))) {
      ranges.push([a, b]);
      used.add(a.index);
      used.add(b.index);
    }
  }

  return ranges;
}

/** Règles de plausibilité vs date de publication (champ ambigu → vide). */
function applyPlausibility(result: ParsedDates, publishedAt?: string): ParsedDates {
  if (!publishedAt) return result;
  const pubIso = publishedAt.slice(0, 10);
  const pubTime = Date.parse(pubIso);
  if (!Number.isFinite(pubTime)) return result;

  const DAY = 86_400_000;
  // Tolérances (jours avant publication) :
  //  - resultsDate : les posts récapitulent des résultats antérieurs
  //  - openingDate : le post peut être publié quelques jours après l'ouverture
  //  - deadlineDate / examDate : antérieurs à la publication = incohérent → vide
  const toleranceBefore: Record<keyof ParsedDates, number> = {
    resultsDate: 45,
    openingDate: 10,
    deadlineDate: 2,
    examDate: 3,
  };

  for (const key of Object.keys(result) as (keyof ParsedDates)[]) {
    const v = result[key];
    if (!v) continue;
    const diff = Date.parse(v) - pubTime;
    if (diff < -toleranceBefore[key] * DAY) delete result[key];
  }
  return result;
}

/**
 * Extraction des dates d'un texte d'annonce.
 * @param text         contenu (texte mono-ligne)
 * @param title        titre (priorise les résultats)
 * @param publishedAt  date de publication ISO (plausibilité)
 */
export function extractDates(text: string, title = '', publishedAt?: string): ParsedDates {
  if (!text) return {};
  const candidates = collectCandidates(text);
  if (candidates.length === 0) return {};

  const result: ParsedDates = {};
  const usedIndexes = new Set<number>();

  const assign = (cat: keyof ParsedDates | null, c: DateCandidate): boolean => {
    if (!cat) return false;
    if (result[cat]) return false;
    if (usedIndexes.has(c.index)) return false;
    result[cat] = fmtDate(c);
    usedIndexes.add(c.index);
    return true;
  };

  // 1) Plages "du X au Y" → opening = début, deadline = FIN de plage
  const ranges = detectRanges(text, candidates);
  for (const [start, end] of ranges) {
    const s = fmtDate(start);
    const e = fmtDate(end);
    if (s < e) {
      if (!result.openingDate) {
        result.openingDate = s;
        usedIndexes.add(start.index);
      }
      if (!result.deadlineDate) {
        result.deadlineDate = e;
        usedIndexes.add(end.index);
      }
    } else if (e < s) {
      // plage inversée : la plus tardive est conservée en deadline
      if (!result.deadlineDate) {
        result.deadlineDate = s;
        usedIndexes.add(start.index);
      }
    }
  }

  // 2) Titre "résultat" → première date restante = résultat
  const titleHasResult = normalizeStr(title).includes('resultat');
  if (titleHasResult) {
    for (const c of candidates) {
      if (usedIndexes.has(c.index)) continue;
      if (assign('resultsDate', c)) break;
    }
  }

  // 3) Classification par mots-clés
  for (const c of candidates) {
    if (usedIndexes.has(c.index)) continue;
    const cls = classifyWindow(windowAround(text, c));
    if (cls !== 'unknown') assign(cls, c);
  }

  // 4) Une seule date libre → deadline (défaut conservateur) ;
  //    plusieurs dates libres → ambigu → vide (ne pas deviner)
  const free = candidates.filter((c) => !usedIndexes.has(c.index));
  if (free.length === 1 && !result.deadlineDate) {
    const c = free[0];
    result.deadlineDate = fmtDate(c);
    usedIndexes.add(c.index);
  }

  return applyPlausibility(result, publishedAt);
}