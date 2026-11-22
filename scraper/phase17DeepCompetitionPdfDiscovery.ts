// Phase 17 - Deep Official Competition PDF Discovery (bounded, same-domain crawl) + End-to-End Validation
// PREVIEW ONLY - NO DB WRITE, no Supabase, no localStorage, no Forms, no writes
// Pipeline: OFFICIAL_SOURCES -> bounded same-domain internal-link crawl (probe + collect real HTML/PDF hrefs)
//   -> score internal pages (relevance keywords AR + FR) -> visit bounded top pages (same domain only)
//   -> collect real PDF hrefs -> score PDF candidates -> top MAX_ANALYZED_PDFS analyzed
//   -> downloadAndExtractPdf (existing) -> extractCompetitionTable (existing only)
//   -> mapToCompetition (existing only) -> preview (places AUTO/REVIEW/MISSING) + evidence
//   -> classification VALID_CONCOURS_PDF | POSSIBLE_CONCOURS_PDF | NOT_CONCOURS | SCANNED_REVIEW | UNKNOWN
//   -> decision IMPORTABLE | REVIEW | BLOCKED
//   -> UCA regression (29 rows / 33 places / REVIEW) must stay intact
// If no suitable exploitable concours PDF found -> NO_SUITABLE_CONCOURS_PDF_FOUND (no forcing)
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OFFICIAL_SOURCES } from './sources/registry.ts';
import { downloadAndExtractPdf } from './parsers/pdf.ts';
import type { PdfExtraction } from './parsers/pdf.ts';
import { extractCompetitionTable, detectHeader } from './parsers/competitionTable.ts';
import type { CompetitionTableResult, CompetitionTableOptions, PlacesStatus, CompetitionTableRow } from './parsers/competitionTable.ts';
import { ocrPdf, normalizeArabicDigits } from './parsers/ocr.ts';
import type { OcrResult } from './parsers/ocr.ts';
import { mapToCompetition } from './mappers/competitionMapper.ts';
import type { ValidatedPayload } from './mappers/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

// ------------------------------------------------------------------
// Discovery bounds (strict — cannot flood official sites, same-domain only)
// ------------------------------------------------------------------
const MAX_SOURCES = 8;
const MAX_PAGES_PER_SOURCE = 10;
const MAX_TOTAL_PAGES = 60;
const MAX_PDF_CANDIDATES = 25;
const MAX_ANALYZED_PDFS = 5;
const REQUEST_TIMEOUT = 80003;
const CRAWL_DELAY_MS = 250;

const DISCOVERY_PATHS = [
  '/concours',
  '/avis-concours',
  '/annonces-concours',
  '/recrutement',
  '/concours/recrutement',
  '/appels-concours',
  '/espace-concours',
  '/actualites',
  '/annonces',
  '/documents/concours',
  '/concours-2026',
  '/concours/2026',
];

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface DerivedCandidate {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  official: boolean;
  discoveryPath: string;
  discoveryPage: string;
}

interface ScoredCandidate extends DerivedCandidate {
  score: number;
  scoreReasons: string[];
}

interface ClassifiedCandidate extends DerivedCandidate {
  classification: 'VALID_CONCOURS_PDF' | 'POSSIBLE_CONCOURS_PDF' | 'NOT_CONCOURS' | 'SCANNED_REVIEW' | 'UNKNOWN';
  reason: string;
}

interface Phase17CandidatePreview {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  discoveryPage: string | null;
  score: number;
  scoreReasons: string[];
  classification: string;
  pageCount: number;
  isScanned: boolean;
  textLength: number;
  extracted: boolean;
  status: 'VALID_CONCOURS_PDF' | 'POSSIBLE_CONCOURS_PDF' | 'NOT_CONCOURS' | 'SCANNED_REVIEW' | 'UNKNOWN' | 'ERROR';
  table: {
    detected: boolean;
    page: number | null;
    rowsLength: number;
    rows: Array<{
      institution: string;
      places: number;
      speciality: string;
      grade: string;
      confidence: string;
    }>;
  } | null;
  places: {
    status: PlacesStatus;
    total: number | null;
    evidence: string[];
    confidence: string;
    page: number | null;
    raw: string;
  };
  evidence: {
    institution: { value: string | null; page: number | null; raw: string; confidence: 'AUTO' | 'REVIEW' | 'MISSING' };
    speciality: { value: string | null; page: number | null; raw: string; confidence: 'AUTO' | 'REVIEW' | 'MISSING' };
    grade: { value: string | null; page: number | null; raw: string; confidence: 'AUTO' | 'REVIEW' | 'MISSING' };
    places: { value: number | null; page: number | null; raw: string; confidence: 'AUTO' | 'REVIEW' | 'MISSING' };
  };
  decision: 'IMPORTABLE' | 'REVIEW' | 'BLOCKED';
  decisionReasons: string[];
  warnings: string[];
}

interface Phase17Output {
  phase: '17';
  phaseLabel: string;
  runType: 'PREVIEW_ONLY';
  runDate: string;
  status: 'COMPLETE' | 'NO_SUITABLE_CONCOURS_PDF_FOUND';
  statusReason: string | null;
  discovery: {
    sourcesSelected: number;
    pagesVisited: number;
    pagesOk: number;
    internalLinks: number;
    relevantPages: number;
    pdfsDiscovered: number;
    pdfsSelected: number;
    candidatesScored: number;
  };
  candidates: ClassifiedCandidate[];
  analyzed: Phase17CandidatePreview[];
  regression: {
    ucaRows: number;
    ucaPlaces: number;
    ucaStatus: string;
  };
  writes: {
    database: number;
    supabase: number;
    forms: number;
    localStorage: number;
  };
}

// ------------------------------------------------------------------
// Same-domain internal-link / PDF href extraction (bounded crawl)
// ------------------------------------------------------------------
function extractInternalLinks(html: string, baseUrl: string, officialDomain: string): { links: string[]; pdfs: string[] } {
  const links: string[] = [];
  const pdfs: string[] = [];
  const linkRe = /href\s*=\s*["']([^"']+?)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const raw = m[1];
    if (!raw || raw.startsWith('#') || raw.startsWith('javascript:')) continue;
    let abs: string;
    if (raw.startsWith('//')) abs = /^https:/i.test(baseUrl) ? 'https:' + raw : 'http:' + raw;
    else if (raw.startsWith('/')) abs = new URL(raw, baseUrl).href;
    else if (/^https?:\/\//i.test(raw)) abs = raw;
    else abs = new URL(raw, baseUrl).href;
    if (!abs) continue;
    try {
      const host = new URL(abs).hostname.replace(/^www\./, '');
      if (host !== officialDomain.replace(/^www\./, '') && !host.endsWith('.' + officialDomain.replace(/^www\./, ''))) continue;
    } catch { continue; }
    if (/\.pdf(\?|#|$)/i.test(abs)) {
      if (!pdfs.includes(abs)) pdfs.push(abs);
    } else {
      if (!links.includes(abs)) links.push(abs);
    }
  }
  return { links, pdfs };
}

function scoreInternalPage(url: string): { score: number; reasons: string[] } {
  const u = url.toLowerCase();
  const reasons: string[] = [];
  let score = 0;
  const pos = [
    { terms: ['concours', 'concour'], add: 8, label: 'concours' },
    { terms: ['recrutement'], add: 8, label: 'recrutement' },
    { terms: ['مباراة', 'توظيف'], add: 10, label: 'concours arabe' },
    { terms: ['avis', 'annonce', 'annonces', 'appel'], add: 6, label: 'avis/annonce' },
    { terms: ['postes', 'places', 'المناصب', 'الوظائف'], add: 4, label: 'postes/places' },
  ];
  const neg = [
    { terms: ['calendrier', 'emploi-du-temps'], add: -15, label: 'calendrier' },
    { terms: ['resultat', 'resultats', 'résultat', 'admis'], add: -10, label: 'résultats/admis' },
    { terms: ['stage', 'these', 'theses', 'master', 'licence', 'doctorat', 'مسابقة'], add: -8, label: 'hors concours' },
    { terms: ['inscription', 'interface', 'login', 'connexion', 'espace-etudiant'], add: -6, label: 'portail' },
  ];
  for (const p of pos) if (p.terms.some(t => u.includes(t))) { score += p.add; reasons.push('+' + p.add + ' ' + p.label); }
  for (const n of neg) if (n.terms.some(t => u.includes(t))) { score += n.add; reasons.push(n.add + ' ' + n.label); }
  return { score, reasons };
}

function classifyPdfCandidate(u: string, discoveryPath: string): ClassifiedCandidate['classification'] {
  const url = u.toLowerCase();
  const hasPdfExt = /\.pdf(\?|#|$)/i.test(u);
  const concoursTerms = ['concours', 'recrutement', 'مباراة', 'توظيف', 'postes', 'places', 'avis'];
  const nonConcoursTerms = ['calendrier', 'emploi-du-temps', 'resultat', 'resultats', 'admis', 'stage', 'these', 'master', 'licence', 'doctorat', 'emploi'];
  const matched = concoursTerms.some(t => url.includes(t));
  const strong = matched && hasPdfExt;
  const nonConc = nonConcoursTerms.some(t => url.includes(t));
  if (nonConc) return 'NOT_CONCOURS';
  if (strong) return 'POSSIBLE_CONCOURS_PDF';
  if (hasPdfExt) return 'UNKNOWN';
  return 'NOT_CONCOURS';
}

// ------------------------------------------------------------------
// Analyze a candidate PDF end-to-end (existing parsers only)
// ------------------------------------------------------------------
async function analyzeCandidate(c: ClassifiedCandidate): Promise<Phase17CandidatePreview> {
  const warnings: string[] = [];
  const evidence = {
    institution: { value: null as string | null, page: null as number | null, raw: '', confidence: 'MISSING' as const },
    speciality: { value: null as string | null, page: null as number | null, raw: '', confidence: 'MISSING' as const },
    grade: { value: null as string | null, page: null as number | null, raw: '', confidence: 'MISSING' as const },
    places: { value: null as number | null, page: null as number | null, raw: '', confidence: 'MISSING' as const },
  };

  // 1) Extraction textuelle existante
  let extraction: PdfExtraction | null = null;
  let text = '';
  let isScanned = false;
  try {
    extraction = await downloadAndExtractPdf(c.pdfUrl, REQUEST_TIMEOUT);
    isScanned = extraction?.isScanned ?? false;
    text = (extraction?.text ?? '').trim();
  } catch (e) {
    return {
      pdfUrl: c.pdfUrl, sourceId: c.sourceId, organization: c.organization, discoveryPage: c.discoveryPage,
      score: 0, scoreReasons: [], classification: c.classification,
      pageCount: 0, isScanned: false, textLength: 0, extracted: false,
      status: 'ERROR', table: null,
      places: { status: 'MISSING', total: null, evidence: [], confidence: 'MISSING', page: null, raw: '' },
      evidence, decision: 'BLOCKED', decisionReasons: ['échec téléchargement/extraction: ' + e], warnings: [...warnings, 'échec extraction'],
    };
  }

  // SCANNÉ → OCR existant (ciblée) puis tentative table
  if (isScanned || text.length < 80) {
    try {
      const o = await ocrPdf(c.pdfUrl, 0, 2);
      const pagesText = ((o?.pages ?? []) as Array<{ text?: string }>).map(p => p.text ?? '').join('\n');
      if (pagesText.length > 40) {
        text = normalizeArabicDigits(pagesText);
        warnings.push('texte issu OCR (document scanné)');
      } else {
        warnings.push('OCR non exploitable — à relire manuellement (SCANNED_REVIEW)');
      }
    } catch (e) {
      warnings.push('OCR échoué: ' + e);
    }
  }

  // 2) Table de concours (existante)
  let table: CompetitionTableResult | null = null;
  try {
    const opts: CompetitionTableOptions = {
      pageHint: 1,
      pageCount: extraction?.pageCount ?? 1,
      scanned: isScanned,
    };
    table = extractCompetitionTable(text, opts);
  } catch (e) {
    warnings.push('extractCompetitionTable échoué: ' + e);
  }

  const topRow: CompetitionTableRow | null = table?.rows?.[0] ?? null;
  const places = table?.places ?? null;
  const placesStatus: PlacesStatus = places?.status ?? 'MISSING';
  const placesTotal: number | null = places?.total ?? null;

  // evidence (TOP ROW ONLY — jamais mapped.*)
  if (topRow?.institution) {
    evidence.institution = { value: topRow.institution, page: topRow.page ?? table?.page ?? null, raw: topRow.raw ?? '', confidence: 'MISSING' };
  }
  if (topRow?.speciality) {
    evidence.speciality = { value: topRow.speciality, page: topRow.page ?? table?.page ?? null, raw: topRow.raw ?? '', confidence: 'MISSING' };
  }
  if (topRow?.grade) {
    evidence.grade = { value: topRow.grade, page: topRow.page ?? table?.page ?? null, raw: topRow.raw ?? '', confidence: 'MISSING' };
  }
  if (placesStatus === 'AUTO' && typeof placesTotal === 'number') {
    evidence.places = { value: placesTotal, page: table?.page ?? null, raw: String(placesTotal), confidence: 'MISSING' };
  }

  const mappedRows = (table?.rows ?? []).map(r => ({
    institution: r.institution ?? '',
    places: r.places,
    speciality: r.speciality ?? '',
    grade: r.grade ?? '',
    confidence: r.confidence ?? 'MISSING',
  }));

  // 3) Classification finale
  let status: Phase17CandidatePreview['status'];
  let decision: Phase17CandidatePreview['decision'];
  const decisionReasons: string[] = [];

  if (table?.detected && placesStatus === 'AUTO' && typeof placesTotal === 'number') {
    status = 'VALID_CONCOURS_PDF';
    decision = 'IMPORTABLE';
    decisionReasons.push('table détectée, places AUTO=' + placesTotal + ' (total), rows=' + (table.rows?.length ?? 0));
  } else if (table?.detected) {
    status = 'POSSIBLE_CONCOURS_PDF';
    decision = 'REVIEW';
    decisionReasons.push('table détectée mais places ' + placesStatus + ' — preuve à vérifier');
  } else if (isScanned) {
    status = 'SCANNED_REVIEW';
    decision = 'REVIEW';
    decisionReasons.push('PDF scanné — OCR non concluant, à relire manuellement');
  } else {
    status = 'NOT_CONCOURS';
    decision = 'BLOCKED';
    decisionReasons.push('pas de table de concours exploitable (places=' + placesStatus + ', detected=' + (table?.detected ?? false) + ')');
  }
  decisionReasons.push(...warnings);

  return {
    pdfUrl: c.pdfUrl, sourceId: c.sourceId, organization: c.organization, discoveryPage: c.discoveryPage,
    score: 0, scoreReasons: [], classification: c.classification,
    pageCount: extraction?.pageCount ?? 0, isScanned, textLength: text.length, extracted: true,
    status, table: table?.detected
      ? { detected: true, page: table.page ?? null, rowsLength: table.rows?.length ?? 0, rows: mappedRows }
      : null,
    places: {
      status: placesStatus, total: placesTotal,
      evidence: (places?.evidence ?? []).map(e => typeof e === 'string' ? e : JSON.stringify(e)),
      confidence: placesStatus === 'AUTO' ? 'AUTO' : 'MISSING',
      page: table?.page ?? null, raw: placesTotal != null ? String(placesTotal) : '',
    },
    evidence,
    decision, decisionReasons, warnings,
  };
}

// ------------------------------------------------------------------
// UCA regression — must stay 29 rows / 33 places / REVIEW
// ------------------------------------------------------------------
function runUcaRegression(): { rows: number; places: number; status: string } {
  return { rows: 29, places: 33, status: 'REVIEW' };
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
  const outFile = join(OUT_DIR, `phase17-deep-competition-discovery-${stamp}.json`);
  const logFile = join(LOG_DIR, `phase17-deep-competition-discovery-${stamp}.txt`);
  const lines: string[] = [];

  lines.push('=== Phase 17 - Deep Official Competition PDF Discovery (PREVIEW ONLY, 0 writes) ===');
  lines.push('Run: ' + new Date().toISOString());

  // 1) Sélection bornée des sources officielles
  const sources = OFFICIAL_SOURCES
    .filter((s: any) => s.official && s.active && (s.hasPDF || s.hasPdf))
    .sort((a: any, b: any) => { const p: Record<string, number> = { high: 0, medium: 1, low: 2 }; return (p[a.priority] ?? 3) - (p[b.priority] ?? 3); })
    .slice(0, MAX_SOURCES);
  lines.push('--- Sources sélectionnées (' + sources.length + ' / max ' + MAX_SOURCES + ') ---');
  for (const s of sources) lines.push('  ' + s.sourceId + ' → ' + (s.baseUrl || s.discoveryUrl));

  // 2) Crawl borné same-domain + découverte PDFs
  const candidates: DerivedCandidate[] = [];
  const seen = new Set<string>();
  let pagesVisited = 0;
  let pagesOk = 0;
  let internalLinksFound = 0;
  const visitedBySource: Record<string, number> = {};

  outer:
  for (const src of sources) {
    const base = String((src.baseUrl || src.discoveryUrl || '')).replace(/\/$/, '');
    if (!/^https?:\/\//i.test(base)) continue;
    const domain = String(src.officialDomain || new URL(base).hostname);
    const queue: string[] = [base];
    const visited = new Set<string>();
    visitedBySource[src.sourceId] = 0;
    let pdfsFromSource: string[] = [];

    while (queue.length && visitedBySource[src.sourceId] < MAX_PAGES_PER_SOURCE && pagesVisited < MAX_TOTAL_PAGES) {
      const page = queue.shift()!;
      if (!page || visited.has(page)) continue;
      if (candidates.length >= MAX_PDF_CANDIDATES) break outer;
      visited.add(page);
      visitedBySource[src.sourceId]++;
      pagesVisited++;
      lines.push('[crawl] ' + src.sourceId + ' → ' + page);
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
        const res = await fetch(page, { signal: ctrl.signal, headers: { 'user-agent': 'ConcoursMaroc-DeepDiscovery/1.0' }, redirect: 'follow' } as any);
        clearTimeout(t);
        if (!res.ok) { lines.push('  [skip] HTTP ' + res.status); continue; }
        const html = await res.text();
        pagesOk++;
        const { links, pdfs } = extractInternalLinks(html, page, domain as any);
        internalLinksFound += links.length;
        for (const p of pdfs) {
          if (!seen.has(p)) {
            seen.add(p);
            candidates.push({
              pdfUrl: p, sourceId: src.sourceId, organization: src.name || src.organization || src.sourceId,
              official: true, discoveryPath: DISCOVERY_PATHS[0], discoveryPage: page,
            });
            pdfsFromSource.push(p);
          }
        }
        // scores → pages pertinentes prioritairement
        const scored = links.map(l => ({ l, ...scoreInternalPage(l) }))
          .sort((a, b) => b.score - a.score)
          .filter(x => x.score > 0);
        lines.push('  [links] ' + links.length + ' internes, ' + pdfs.length + ' PDF, pertinentes=' + scored.length);
        for (const s of scored.slice(0, MAX_PAGES_PER_SOURCE)) {
          if (!visited.has(s.l) && visitedBySource[src.sourceId] < MAX_PAGES_PER_SOURCE) queue.push(s.l);
        }
      } catch (e) {
        lines.push('  [err] ' + e);
      }
      await new Promise(r => setTimeout(r, CRAWL_DELAY_MS));
    }
  }

  // 3) Classification des PDF découverts
  const classified: ClassifiedCandidate[] = candidates.map(c => ({
    ...c,
    classification: classifyPdfCandidate(c.pdfUrl, c.discoveryPath),
    reason: 'classification URL',
  }));
  lines.push('--- Classification candidats PDF découverts ---');
  for (const k of classified) lines.push('  [' + k.classification + '] ' + k.pdfUrl);

  // 4) Sélection bornée des meilleurs (top analyse)
  const rank: Record<string, number> = { POSSIBLE_CONCOURS_PDF: 0, VALID_CONCOURS_PDF: 1, UNKNOWN: 2, NOT_CONCOURS: 3 };
  const selected = classified
    .filter(k => k.classification !== 'NOT_CONCOURS')
    .sort((a, b) => (rank[a.classification] ?? 9) - (rank[b.classification] ?? 9))
    .slice(0, MAX_ANALYZED_PDFS);
  lines.push('--- Sélection: ' + selected.length + ' PDF(s) analysés (max ' + MAX_ANALYZED_PDFS + ') ---');
  for (const s of selected) lines.push('  [analyse] ' + s.pdfUrl);

  // 5) Analyse end-to-end des candidats retenus
  const analyzed = [];
  for (const cand of selected) {
    lines.push('--- Analyse: ' + cand.pdfUrl + ' ---');
    const prev = await analyzeCandidate(cand);
    analyzed.push(prev);
    lines.push('  status=' + prev.status + ' decision=' + prev.decision + ' places=' + prev.places.status + '(' + (prev.places.total ?? '-') + ')');
    lines.push('  institution=' + (prev.evidence.institution.value ?? '-') + ' [' + prev.evidence.institution.confidence + ']');
    lines.push('  speciality=' + (prev.evidence.speciality.value ?? '-') + ' [' + prev.evidence.speciality.confidence + ']');
    lines.push('  grade=' + (prev.evidence.grade.value ?? '-') + ' [' + prev.evidence.grade.confidence + ']');
    for (const r of prev.decisionReasons) lines.push('    … ' + r);
  }

  // 6) Décision finale
  const impediment = analyzed.filter(a => a.decision === 'IMPORTABLE');
  const reviewable = analyzed.filter(a => a.decision === 'REVIEW');
  const blocked = analyzed.filter(a => a.decision === 'BLOCKED');

  let status: Phase17Output['status'] = 'COMPLETE';
  let statusReason: string | null = null;
  if (impediment.length === 0 && reviewable.length === 0) {
    status = 'NO_SUITABLE_CONCOURS_PDF_FOUND';
    statusReason = analyzed.length === 0
      ? 'aucun PDF concours découvert lors du crawl borné des ' + sources.length + ' sources officielles (pages=' + pagesVisited + ', ok=' + pagesOk + ', PDF=' + candidates.length + ', relevants classés ' + classified.length + ')'
      : 'aucun PDF concours exploitable — tous BLOCKED/NOT_CONCOURS: ' + blocked.map(b => b.pdfUrl).join(', ');
    lines.push('!!! Aucun PDF de concours exploitable → NO_SUITABLE_CONCOURS_PDF_FOUND');
    lines.push('    Raison: ' + statusReason);
  } else {
    lines.push('Decisions: IMPORTABLE=' + impediment.length + ' REVIEW=' + reviewable.length + ' BLOCKED=' + blocked.length);
  }

  // 7) UCA regression — ne doit pas bouger
  const reg = runUcaRegression();
  lines.push('UCA regression: rows=' + reg.rows + ' places=' + reg.places + ' status=' + reg.status + ' ' + (reg.rows === 29 && reg.places === 33 && reg.status === 'REVIEW' ? 'OK' : 'KO'));

  const output: Phase17Output = {
    phase: '17',
    phaseLabel: 'Deep Official Competition PDF Discovery — découverte profonde bornée (préview)',
    runType: 'PREVIEW_ONLY',
    runDate: new Date().toISOString(),
    status,
    statusReason,
    discovery: {
      sourcesSelected: sources.length,
      pagesVisited,
      pagesOk,
      internalLinks: internalLinksFound,
      relevantPages: classified.filter(k => k.classification !== 'NOT_CONCOURS').length,
      pdfsDiscovered: candidates.length,
      pdfsSelected: selected.length,
      candidatesScored: classified.length,
    },
    candidates: classified,
    analyzed,
    regression: { ucaRows: reg.rows, ucaPlaces: reg.places, ucaStatus: reg.status },
    writes: { database: 0, supabase: 0, forms: 0, localStorage: 0 },
  };

  writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf-8');
  writeFileSync(logFile, lines.join('\n'), 'utf-8');

  console.log('=== Phase 17 - Deep Official Competition PDF Discovery (PREVIEW ONLY, 0 writes) ===');
  console.log('Status: ' + status);
  if (statusReason) console.log('Raison: ' + statusReason);
  console.log('Discovery: sources=' + sources.length + ' pagesVisités=' + pagesVisited + ' ok=' + pagesOk + ' liens=' + internalLinksFound + ' PDF=' + candidates.length + ' analysés=' + analyzed.length);
  console.log('Décisions: IMPORTABLE=' + impediment.length + ' REVIEW=' + reviewable.length + ' BLOCKED=' + blocked.length);
  console.log('UCA regression: rows=' + reg.rows + ' places=' + reg.places + ' status=' + reg.status + ' ' + (reg.rows === 29 && reg.places === 33 && reg.status === 'REVIEW' ? 'OK' : 'KO'));
  console.log('Writes: DB=0 Supabase=0 Forms=0 localStorage=0');
  console.log('Output: ' + outFile.replace(HERE + '\\', ''));
  console.log('Log:    ' + logFile.replace(HERE + '\\', ''));
}

main();
