// ============================================================
// Validation automatique des résultats du scraper.
// Usage :
//   npx tsx validation.ts [chemin/fichier.json]     (défaut : dernier JSON)
// Sortie : scraper/logs/validation-<timestamp>.txt
// ============================================================

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UNIVERSITY_DOMAINS } from './sources/almaster_aliases';
import { normalizeStr } from './normalizers/normalize';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = `${HERE}/output`;
const LOG_DIR = `${HERE}/logs`;

export interface ValidationReport {
  total: number;
  valid: number;
  duplicates: number;
  errors: number;
  coverage: Record<string, number>;
  missingTop: string[];
  flaggedItems: Array<{ title: string; reason: string }>;
}

const FIELDS = [
  'title', 'organization', 'university', 'establishment', 'city', 'region', 'domain',
  'level', 'academicYear', 'description', 'conditions', 'documents', 'places',
  'openingDate', 'deadlineDate', 'examDate', 'resultsDate', 'officialUrl',
  'registrationUrl', 'sourceUrl',
];

const DATE_FIELDS = ['openingDate', 'deadlineDate', 'examDate', 'resultsDate'];

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Détecte les erreurs de parsing (section 4 du cahier des charges). */
function detectParsingErrors(item: {
  title: string;
  description?: string;
  officialUrl?: string;
  registrationUrl?: string;
  publishedAt?: string;
  deadlineDate?: string;
  examDate?: string;
  openingDate?: string;
  establishment?: string;
  university?: string;
}, flags: Array<{ title: string; reason: string }>): void {
  const push = (reason: string) => flags.push({ title: item.title, reason });

  // URL Almaster prise par erreur comme officialUrl
  if (item.officialUrl?.includes('almaster-maroc.com') || item.registrationUrl?.includes('almaster-maroc.com')) {
    push('URL Almaster conservée comme lien officiel/inscription');
  }
  // URL Facebook/social prise comme site officiel
  const socialRe = /facebook|fb\.|instagram|twitter|t\.co|x\.com|linkedin|youtube|whatsapp|wa\.me|t\.me|telegram|tiktok/;
  if (item.officialUrl && socialRe.test(item.officialUrl)) push('Réseau social conservé comme lien officiel');
  if (item.registrationUrl && socialRe.test(item.registrationUrl)) push('Réseau social conservé comme lien inscription');

  // Deadline / exam antérieurs à la publication (au-delà des tolérances)
  const pub = item.publishedAt ? item.publishedAt.slice(0, 10) : undefined;
  const DAY = 86_400_000;
  if (pub && item.deadlineDate && item.deadlineDate < pub) {
    if (Date.parse(pub) - Date.parse(item.deadlineDate) > 2 * DAY) {
      push(`Deadline (${item.deadlineDate}) antérieure à la publication (${pub})`);
    }
  }
  if (pub && item.examDate && item.examDate < pub) {
    if (Date.parse(pub) - Date.parse(item.examDate) > 7 * DAY) {
      push(`Date d'examen (${item.examDate}) antérieure à la publication (${pub})`);
    }
  }

  // Texte générique pris comme établissement
  const generic = ['faculté des sciences', 'faculte des sciences', 'université', 'universite', 'master', 'inscription', 'concours', 'ecole', 'école', 'institut'];
  if (item.establishment && normalizeStr(item.establishment).length < 8) {
    const est = normalizeStr(item.establishment);
    if (generic.some((g) => est === normalizeStr(g))) {
      push(`Établissement probablement générique : "${item.establishment}"`);
    }
  }

  // Université détectée sans preuve suffisante (remontée informative)
  if (item.university) {
    const title = normalizeStr(item.title) + ' ' + (item.description ? normalizeStr(item.description) : '');
    const uni = normalizeStr(item.university);
    const hasKey = uni.split(' ').some((w) => w.length > 3 && title.includes(w));
    // preuve supplémentaire : domaine universitaire dans les URLs
    let hasUrlProof = false;
    for (const link of [item.officialUrl, item.registrationUrl]) {
      if (!link) continue;
      let host = '';
      try {
        host = new URL(link).hostname.replace(/^www\./, '');
      } catch {
        continue;
      }
      for (const [proto] of Object.entries(UNIVERSITY_DOMAINS)) {
        if (host === proto || host.endsWith('.' + proto)) {
          hasUrlProof = true;
          break;
        }
      }
      if (hasUrlProof) break;
    }
    if (!hasKey && !hasUrlProof) {
      push(`Université attribuée sans correspondance dans le contenu : "${item.university}"`);
    }
  }

  // Plusieurs deadlines différentes dans le même article
  if (item.deadlineDate && item.description) {
    const desc = item.description;
    const found = new Set<string>();
    const reWords = /(\d{1,2})(?:er|eme|ème)?[\s.\-/]+([a-zà-ÿ]+)[\s.\-/]+(20\d{2})/gi;
    const frMonths: Record<string, number> = {
      janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
      juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
      sept: 9, oct: 10, nov: 11, dec: 12, janv: 1, fevr: 2, avr: 4, juil: 7,
    };
    let m: RegExpExecArray | null;
    while ((m = reWords.exec(desc))) {
      const month = frMonths[normalizeStr(m[2])];
      if (!month) continue;
      found.add(`${m[3]}-${String(month).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`);
    }
    const reNum = /(\d{1,2})[\s/.\-]+(\d{1,2})[\s/.\-]+(20\d{2})/g;
    while ((m = reNum.exec(desc))) {
      let day = Number(m[1]), month = Number(m[2]);
      if (month > 12) { const tmp = day; day = month; month = tmp; }
      if (month >= 1 && month <= 12) found.add(`${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    if (!found.has(item.deadlineDate)) {
      push("Deadline extraite non présente textuellement dans l'article");
    }
  }

  // Incohérence : deadline > 1 an après publication (probablement pas un vrai deadline)
  if (pub && item.deadlineDate && Date.parse(item.deadlineDate) - Date.parse(pub) > 365 * DAY) {
    push(`Deadline (${item.deadlineDate}) improbable (> 1 an après publication ${pub})`);
  }
}

function latestJson(baseDir: string): string {
  const files = readdirSync(baseDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) throw new Error('Aucun fichier JSON trouvé dans ' + baseDir);
  return join(baseDir, files.sort().pop() as string);
}

function classifyItem(filled: Set<string>, item: Record<string, unknown>): CatLabel {
  const n = filled.size;
  if (n >= 10) return 'full';
  if (
    n <= 6 ||
    (!item.establishment &&
      !item.university &&
      !item.deadlineDate)
  ) {
    return 'sparse';
  }
  return 'medium';
}

type CatLabel = 'full' | 'medium' | 'sparse' | 'multi';

/** Qualité d'un item pour l'échantillon : nb dates + nb liens + nb infos. */
function completeness(filled: Set<string>, item: Record<string, unknown>): number {
  const dates = ['openingDate', 'deadlineDate', 'examDate', 'resultsDate'].filter((f) => filled.has(f)).length;
  const links = ['officialUrl', 'registrationUrl', 'sourceUrl', 'documents'].filter((f) => filled.has(f)).length;
  return filled.size * 2 + dates * 3 + links;
}

export function runValidation(jsonPath?: string): ValidationReport {
  const srcPath = jsonPath || latestJson(OUT_DIR);
  const items = JSON.parse(readFileSync(srcPath, 'utf-8')) as Array<Record<string, unknown>>;

  const report: ValidationReport = {
    total: items.length,
    valid: 0,
    duplicates: 0,
    errors: 0,
    coverage: {},
    missingTop: [],
    flaggedItems: [],
  };

  // ---- Doublons (fingerprint) ----
  const seen = new Map<string, number>();
  for (const item of items) {
    const fp = String(item.fingerprint || `${item.title}|${item.sourceUrl}`);
    seen.set(fp, (seen.get(fp) || 0) + 1);
  }
  let dupCount = 0;
  for (const [, n] of seen) if (n > 1) dupCount += (n - 1);
  report.duplicates = dupCount;

  // ---- Couverture ----
  for (const f of FIELDS) {
    const filled = items.filter((i) => !isEmpty(i[f])).length;
    report.coverage[f] = filled;
  }

  // ---- Audit par item ----
  const details: string[] = [];
  let suspiciousTitles = 0, missingSource = 0, missingOfficial = 0, missingCity = 0,
    missingEstablishment = 0, missingUniversity = 0, missingDomain = 0, missingDates = 0,
    invalidDates = 0, missingAcademicYear = 0, missingLevel = 0, shortDescription = 0,
    invalidUrls = 0;

  const validItems: Array<Record<string, unknown>> = [];

  for (const item of items) {
    const title = String(item.title || '');
    const filled = new Set(FIELDS.filter((f) => !isEmpty(item[f])));

    // valid = titre + sourceUrl + (au moins un champ d'ancrage institutionnel ou date)
    const hasAnchor = !isEmpty(item.city) || !isEmpty(item.university) || !isEmpty(item.establishment) || !isEmpty(item.deadlineDate) || !isEmpty(item.officialUrl);
    if (title && !isEmpty(item.sourceUrl) && Boolean(isValidHttpUrl(String(item.sourceUrl))) && hasAnchor) {
      report.valid++;
      validItems.push(item);
    }

    // titres vides ou suspects
    if (!title || title.trim().length < 4 || /\d{6,}/.test(title)) {
      suspiciousTitles++;
      if (title) report.flaggedItems.push({ title, reason: 'Titre suspect (trop court ou chiffres)' });
    }
    if (isEmpty(item.sourceUrl)) missingSource++;
    if (isEmpty(item.officialUrl)) missingOfficial++;
    if (isEmpty(item.city)) missingCity++;
    if (isEmpty(item.establishment)) missingEstablishment++;
    if (isEmpty(item.university)) missingUniversity++;
    if (isEmpty(item.domain)) missingDomain++;
    if (DATE_FIELDS.every((d) => isEmpty(item[d]))) missingDates++;
    for (const d of DATE_FIELDS) {
      if (!isEmpty(item[d]) && !isIsoDate(String(item[d]))) invalidDates++;
    }
    if (isEmpty(item.academicYear)) missingAcademicYear++;
    if (isEmpty(item.level)) missingLevel++;
    if (!isEmpty(item.description) && String(item.description).trim().length < 50) shortDescription++;
    for (const u of ['officialUrl', 'registrationUrl', 'sourceUrl']) {
      if (!isEmpty(item[u]) && !isValidHttpUrl(String(item[u]))) invalidUrls++;
    }

    detectParsingErrors(item as never, report.flaggedItems);
  }

  // ---- Erreurs = items avec flag de parsing ou dates invalides ----
  report.errors = report.flaggedItems.length;

  // ---- Champs les plus souvent manquants ----
  report.missingTop = FIELDS
    .map((f) => ({ f, empty: report.total - report.coverage[f] }))
    .filter((x) => x.empty > 0)
    .sort((a, b) => b.empty - a.empty)
    .slice(0, 6)
    .map((x) => `${x.f} (${x.empty}/${report.total})`);

  // ---- Tableau de couverture ----
  const lines: string[] = [];
  lines.push('=' .repeat(70));
  lines.push(`VALIDATION — ${new Date().toISOString()}`);
  lines.push(`Fichier      : ${srcPath}`);
  lines.push(`Total items  : ${report.total}`);
  lines.push(`Valides      : ${report.valid}`);
  lines.push(`Doublons     : ${report.duplicates}`);
  lines.push(`Erreurs      : ${report.errors}`);
  lines.push('='.repeat(70));
  lines.push('');
  lines.push('AUDIT');
  lines.push(`  - titres vides ou suspects    : ${suspiciousTitles}`);
  lines.push(`  - sourceUrl manquante         : ${missingSource}`);
  lines.push(`  - officialUrl manquante       : ${missingOfficial}`);
  lines.push(`  - ville manquante             : ${missingCity}`);
  lines.push(`  - établissement manquant      : ${missingEstablishment}`);
  lines.push(`  - université manquante        : ${missingUniversity}`);
  lines.push(`  - domaine manquant            : ${missingDomain}`);
  lines.push(`  - items sans aucune date      : ${missingDates}`);
  lines.push(`  - dates au format invalide    : ${invalidDates}`);
  lines.push(`  - année académique manquante  : ${missingAcademicYear}`);
  lines.push(`  - niveau manquant             : ${missingLevel}`);
  lines.push(`  - descriptions trop courtes   : ${shortDescription}`);
  lines.push(`  - URLs invalides              : ${invalidUrls}`);
  lines.push('');
  lines.push('COUVERTURE');
  lines.push('Champ                | Rempli | Vide | Pourcentage');
  lines.push('-'.repeat(70));
  for (const f of FIELDS) {
    const filled = report.coverage[f];
    const pct = report.total > 0 ? Math.round((filled / report.total) * 100) : 0;
    const name = f.padEnd(20);
    lines.push(`${name} | ${String(filled).padStart(6)} | ${String(report.total - filled).padStart(4)} | ${String(pct).padStart(3)}%`);
  }
  lines.push('');
  lines.push('CHAMPS LES PLUS SOUVENT MANQUANTS');
  lines.push(`  ${report.missingTop.join(', ')}`);
  lines.push('');

  // ---- Erreurs de parsing détectées (section 4) ----
  if (report.flaggedItems.length > 0) {
    lines.push('ERREURS DE PARSING DÉTECTÉES');
    for (const f of report.flaggedItems) lines.push(`  - [${f.reason}] ${f.title.slice(0, 90)}`);
    lines.push('');
  } else {
    lines.push('ERREURS DE PARSING DÉTECTÉES : AUCUNE');
    lines.push('');
  }

  // ---- Échantillon qualitatif (section 6) ----
  const withInfo = items.map((item) => {
    const filled = new Set(FIELDS.filter((f) => !isEmpty(item[f])));
    return { item, filled, label: classifyItem(filled, item), score: completeness(filled, item) };
  });

  const samples: Array<{ item: Record<string, unknown>; labels: Set<CatLabel> }> = [];
  const usedIdx = new Set<number>();
  const addCat = (cat: CatLabel, n: number) => {
    const arr = withInfo
      .map((x, i) => ({ ...x, i }))
      .filter((x) => x.label === cat)
      .sort((a, b) => b.score - a.score);
    for (const s of arr) {
      if (usedIdx.has(s.i)) continue;
      usedIdx.add(s.i);
      if (!samples.find((y) => y.item === s.item)) samples.push({ item: s.item, labels: new Set([cat]) });
      else samples.find((y) => y.item === s.item)!.labels.add(cat);
      if (n-- <= 0) break;
    }
  };
  // annonces multi-dates (≥2 dates extraites)
  const addMulti = (n: number) => {
    const arr = withInfo
      .map((x, i) => ({ ...x, i }))
      .filter((x) => ['openingDate', 'deadlineDate', 'examDate', 'resultsDate'].filter((d) => x.filled.has(d)).length >= 2)
      .sort((a, b) => b.score - a.score);
    for (const s of arr) {
      if (n <= 0) break;
      const existing = samples.find((y) => y.item === s.item);
      if (existing) {
        existing.labels.add('multi');
        n--;
      } else {
        samples.push({ item: s.item, labels: new Set(['multi']) });
        usedIdx.add(s.i);
        n--;
      }
    }
  };
  addCat('full', 3);
  addCat('medium', 3);
  addCat('sparse', 2);
  addMulti(2);

  lines.push('ÉCHANTILLON QUALITATIF (représentatif)');
  lines.push('-'.repeat(70));
  let idx = 1;
  for (const s of samples) {
    const it = s.item;
    lines.push(`${idx++}. ${String(it.title).slice(0, 60)} [${[...s.labels].join('/')}]`);
    lines.push(`    établissement : ${it.establishment || '—'}`);
    lines.push(`    université    : ${it.university || '—'}`);
    lines.push(`    ville         : ${it.city || '—'} | région: ${it.region || '—'}`);
    lines.push(`    domaine       : ${it.domain || '—'} | niveau: ${it.level || '—'}`);
    lines.push(`    deadline      : ${it.deadlineDate || '—'} | exam: ${it.examDate || '—'} | résultats: ${it.resultsDate || '—'}`);
    lines.push(`    officialUrl   : ${it.officialUrl || '—'}`);
    lines.push(`    sourceUrl     : ${it.sourceUrl || '—'}`);
    lines.push('');
  }

  const file = writeReport(lines);
  console.log('Rapport de validation :', file);
  return report;
}

function writeReport(lines: string[]): string {
  mkdirSync(LOG_DIR, { recursive: true });
  const tag = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const file = join(LOG_DIR, `validation-${tag}.txt`);
  writeFileSync(file, lines.join('\n') + '\n', 'utf-8');
  return file;
}

function main(): void {
  const arg = process.argv[2];
  try {
    const r = runValidation(arg);
    const pct = (f: string) => `${Math.round((r.coverage[f] / r.total) * 100)}%`;
    console.log('');
    console.log('--- RÉSUMÉ VALIDATION ---');
    console.log(`Total               : ${r.total}`);
    console.log(`Valides             : ${r.valid}`);
    console.log(`Doublons            : ${r.duplicates}`);
    console.log(`Erreurs             : ${r.errors}`);
    const avg = FIELDS.reduce((s, f) => s + r.coverage[f], 0) / (r.total * FIELDS.length) * 100;
    console.log(`Couverture moyenne  : ${avg.toFixed(1)}%`);
    console.log(`Champs manquants    : ${r.missingTop.slice(0, 3).join(', ')}`);
    console.log(`Dates (coverage)    : opening ${pct('openingDate')} ${pct('deadlineDate')} deadline`);
    console.log('----------------------');
  } catch (err) {
    console.error('Erreur de validation :', (err as Error).message);
    process.exitCode = 1;
  }
}

function isMainModule(): boolean {
  if (!process.argv[1]) return false;
  const invoked = process.argv[1].split('\\').join('/');
  return import.meta.url === `file://${invoked}`;
}

if (isMainModule()) {
  main();
}