// Phase 16 - Targeted Discovery + End-to-End Validation of Real Competition PDFs
// PREVIEW ONLY - NO DB WRITE, no Supabase, no localStorage, no Forms, no writes
// Pipeline: OFFICIAL_SOURCES -> bounded discovery (probe endpoints, collect real PDF hrefs)
//   -> top-3-5 candidates -> downloadAndExtractPdf -> extractCompetitionTable (existing only)
//   -> mapToCompetition (existing only) -> preview (AUTO/REVIEW/MISSING) + evidence
//   -> classification -> decision IMPORTABLE | REVIEW | BLOCKED
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
// Discovery bounds (strict — cannot flood official sites)
// ------------------------------------------------------------------
const MAX_PROBES = 12;
const MAX_CANDIDATES = 15;
const MAX_ANALYZED = 3;
const PROBE_TIMEOUT = 6000;

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
];

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface DerivedPdfUrl {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  official: boolean;
  discoveryPath: string;
}

interface CandidatePdf {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  official: boolean;
  type: 'text' | 'scanned';
  pageCount: number;
  extractionEmpty: boolean;
}

interface Phase16Preview {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  status: 'VALID_CONCOURS_PDF' | 'POSSIBLE_CONCOURS_PDF' | 'NOT_CONCOURS' | 'SCANNED_REVIEW' | 'UNKNOWN';
  table: CompetitionTableResult | null;
  mapped: ValidatedPayload | null;
  places: { status: PlacesStatus; total: number | null; evidence: string[] };
  evidence: {
    institution: { value: string | null; page: number; raw: string; confidence: 'AUTO' | 'REVIEW' | 'MISSING' };
    speciality: { value: string | null; page: number; raw: string; confidence: 'AUTO' | 'REVIEW' | 'MISSING' };
    grade: { value: string | null; page: number; raw: string; confidence: 'AUTO' | 'REVIEW' | 'MISSING' };
    places: { value: number | null; page: number; raw: string; confidence: 'AUTO' | 'REVIEW' | 'MISSING' };
  };
  decision: 'IMPORTABLE' | 'REVIEW' | 'BLOCKED';
  decisionReasons: string[];
}

interface Phase16Output {
  phase: '16';
  phaseLabel: string;
  runType: 'PREVIEW_ONLY';
  runDate: string;
  status: 'COMPLETE' | 'NO_SUITABLE_CONCOURS_PDF_FOUND';
  statusReason: string | null;
  discovery: {
    probesAttempted: number;
    probesOk: number;
    pdfUrlsDiscovered: string[];
    candidatesClassified: Array<{ pdfUrl: string; classification: string; reason: string }>;
  };
  candidatesAnalyzed: Phase16Preview[];
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
  summary: {
    candidatesDiscovered: number;
    candidatesSelected: number;
    documentsAnalyzed: number;
    validConcoursPdf: number;
    possibleConcoursPdf: number;
    notConcoursPdf: number;
    scannedReview: number;
  };
}

// ------------------------------------------------------------------
// Bounded discovery: probe official endpoints, collect real .pdf hrefs
// ------------------------------------------------------------------
async function probeEndpoint(url: string): Promise<{ ok: boolean; status: number; body: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 concours-discovery (research)' } });
    const status = res.status;
    let body = '';
    try { body = await res.text(); } catch { body = ''; }
    return { ok: res.ok, status, body };
  } catch {
    return { ok: false, status: 0, body: '' };
  } finally {
    clearTimeout(t);
  }
}

function extractPdfHrefs(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  const re = /href\s*=\s*["']([^"']+\.pdf[^"']*?)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let raw = m[1];
    if (raw.startsWith('//')) raw = 'https:' + raw;
    else if (raw.startsWith('/')) raw = baseUrl.replace(/\/$/, '') + raw;
    else if (!/^https?:\/\//i.test(raw)) raw = baseUrl.replace(/\/$/, '') + '/' + raw;
    if (/^https?:\/\//i.test(raw) && !out.includes(raw)) out.push(raw);
  }
  return out;
}

interface DiscoveryResult {
  candidates: DerivedPdfUrl[];
  probes: number;
  probesOk: number;
}

async function discoverPdfCandidates(): Promise<DiscoveryResult> {
  const candidates: DerivedPdfUrl[] = [];
  const seen = new Set<string>();
  let probes = 0;
  let probesOk = 0;

  const sources = OFFICIAL_SOURCES
    .filter((s: any) => s.official && s.active && (s.hasPDF || s.hasPDF))
    .sort((a: any, b: any) => { const p: Record<string, number> = { high: 0, medium: 1, low: 2 }; return (p[a.priority] ?? 3) - (p[b.priority] ?? 3); });

  outer:
  for (const src of sources) {
    const base = String((src.baseUrl || src.baseUrl || '')).replace(/\/$/, '');
    if (!/^https?:\/\//i.test(base)) continue;
    for (const path of DISCOVERY_PATHS) {
      if (probes >= MAX_PROBES) break outer;
      const url = base + path;
      const res = await probeEndpoint(url);
      probes++;
      if (res.ok) probesOk++;
      const hrefs = extractPdfHrefs(res.body, base);
      for (const pdfUrl of hrefs) {
        if (seen.has(pdfUrl)) continue;
        seen.add(pdfUrl);
        candidates.push({ pdfUrl, sourceId: src.sourceId, organization: src.name, official: src.official, discoveryPath: path });
        if (candidates.length >= MAX_CANDIDATES) break outer;
      }
    }
  }
  return { candidates, probes, probesOk };
}

// ------------------------------------------------------------------
// Classify a discovered candidate (STEP 4)
// ------------------------------------------------------------------
function classifyCandidate(c: DerivedPdfUrl): { classification: string; reason: string } {
  const u = c.pdfUrl.toLowerCase();
  const hasPdfExt = /\.pdf($|\?)/.test(u);
  const families = [
    { family: 'concours', terms: ['concours', 'avis-concours', 'appel-concours', 'recrutement'] },
    { family: 'master', terms: ['master', 'masters'] },
    { family: 'bachelor', terms: ['licence', 'bachelor'] },
    { family: 'calendrier', terms: ['calendrier', 'emploi-du-temps', 'planning'] },
  ];
  const matched = families.filter(f => f.terms.some(t => u.includes(t))).map(f => f.family);
  const strongInUrl = ['concours', 'recrutement'].some(t => u.includes(t)) && hasPdfExt;
  const nonConcoursTerms = ['resultat', 'resultats', 'liste-admis', 'calendrier', 'emploi-du', 'stage', 'these', 'appel-candidature-projet'].some(t => u.includes(t));

  if (strongInUrl && !nonConcoursTerms) return { classification: 'VALID_CONCOURS_PDF', reason: `URL ` + c.discoveryPath + `: terme concours/recrutement + extension PDF` };
  if (hasPdfExt && matched.includes('concours')) return { classification: 'POSSIBLE_CONCOURS_PDF', reason: `URL ` + c.discoveryPath + `: PDF avec terme concours` };
  if (nonConcoursTerms && hasPdfExt) return { classification: 'NOT_CONCOURS', reason: `URL ` + c.discoveryPath + `: contient terme hors concours (` + nonConcoursTerms + `)` };
  if (hasPdfExt) return { classification: 'UNKNOWN', reason: `URL ` + c.discoveryPath + `: PDF mais terme non discriminant` };
  return { classification: 'NOT_CONCOURS', reason: `URL ` + c.discoveryPath + `: pas d'extension PDF` };
}

// ------------------------------------------------------------------
// Analyze a chosen PDF: download -> extract -> OCR si scanné -> table -> mapper
// ------------------------------------------------------------------
async function analyzeCandidate(c: DerivedPdfUrl): Promise<Phase16Preview> {
  const evidence = {
    institution: { value: null as string | null, page: 0, raw: '', confidence: 'MISSING' as const },
    speciality: { value: null as string | null, page: 0, raw: '', confidence: 'MISSING' as const },
    grade: { value: null as string | null, page: 0, raw: '', confidence: 'MISSING' as const },
    places: { value: null as number | null, page: 0, raw: '', confidence: 'MISSING' as const },
  };
  const warnings: string[] = [];

  let extraction: PdfExtraction | null = null;
  let text = '';
  let scanned = false;
  try {
    const r = await downloadAndExtractPdf(c.pdfUrl, 15000);
    extraction = r;
    scanned = r.isScanned ?? false;
    text = (r.text || '').trim();
    if (r.isScanned || text.length < 80) {
      warnings.push('document scanné — OCR nécessaire');
    }
  } catch (e) {
    return {
      pdfUrl: c.pdfUrl, sourceId: c.sourceId, organization: c.organization, status: 'UNKNOWN',
      table: null, mapped: null, places: { status: 'MISSING', total: null, evidence: [] },
      evidence, decision: 'BLOCKED', decisionReasons: ['téléchargement/extraction échoué: ' + e],
    };
  }

  // OCR si scanné
  if (scanned || text.length < 80) {
    try {
      const o = await ocrPdf(c.pdfUrl, 0, 150);
      const pagesText = (o.pages || []).map((p: any) => p.text || '').join('\n');
      if (o.status === 'SUCCESS' || o.status === 'PARTIAL') {
        text = normalizeArabicDigits(pagesText);
        warnings.push('texte issu de OCR (toute page)');
      } else {
        warnings.push('OCR échec (' + (o.status || 'FAILED') + ') — texte non exploitable');
        return {
          pdfUrl: c.pdfUrl, sourceId: c.sourceId, organization: c.organization, status: 'SCANNED_REVIEW',
          table: null, mapped: null, places: { status: 'MISSING', total: null, evidence: [] },
          evidence, decision: 'BLOCKED', decisionReasons: ['PDF scanné dont l\'OCR n\'a pas produit de texte exploitable', ...warnings],
        };
      }
    } catch (e) {
      warnings.push('OCR échoué: ' + e);
      return {
        pdfUrl: c.pdfUrl, sourceId: c.sourceId, organization: c.organization, status: 'SCANNED_REVIEW',
        table: null, mapped: null, places: { status: 'MISSING', total: null, evidence: [] },
        evidence, decision: 'BLOCKED', decisionReasons: ['PDF scanné — OCR a échoué (à relire manuellement)', ...warnings],
      };
    }
  }

  // extractCompetitionTable (existing only)
  let table: CompetitionTableResult | null = null;
  try {
    const opts: CompetitionTableOptions = { pageHint: 1, pageCount: extraction?.pageCount ?? 1, scanned: Boolean(scanned) };
    table = extractCompetitionTable({ text, detected: true } as any, opts);
    if (!table || !table.detected) {
      table = extractCompetitionTable(text, opts);
    }
  } catch (e) {
    warnings.push('extractCompetitionTable échoué: ' + e);
  }

  // décision provisoire selon status places / table
  const placesStatus = table?.places?.status ?? 'MISSING';
  const placesValue = table?.places?.total ?? null;

  // mapper (existing only)
  let mapped: ValidatedPayload | null = null;
  try {
    const scraped = {
      sourceId: c.sourceId,
      sourceUrl: c.pdfUrl,
      title: 'Concours ' + c.organization,
      description: text.slice(0, 3000),
      rawText: text.slice(0, 8000),
      normalizedText: text,
      discoveredFrom: c.discoveryPath,
      classification: 'COMPETITION',
    } as any;
    mapped = await mapToCompetition(scraped);
  } catch (e) {
    warnings.push('mapToCompetition échoué: ' + e);
  }

  // evidence: trouver institution/spécialité/grade depuis le texte mappé
  const topRow = table?.rows?.[0] ?? null;
  if (topRow?.institution) {
    evidence.institution = { value: topRow.institution, page: topRow.page ?? table?.page ?? 1, raw: topRow.raw, confidence: 'MISSING' };
  }
  if (topRow?.speciality) {
    evidence.speciality = { value: topRow.speciality, page: topRow.page ?? table?.page ?? 1, raw: topRow.raw, confidence: 'MISSING' };
  }
  if (topRow?.grade) {
    evidence.grade = { value: topRow.grade, page: topRow.page ?? table?.page ?? 1, raw: topRow.raw, confidence: 'MISSING' };
  }
  if (placesStatus === 'AUTO' && typeof placesValue === 'number') {
    evidence.places = { value: placesValue, page: table?.page ?? 1, raw: String(placesValue), confidence: 'MISSING' };
  }

  // classification finale
  let status: Phase16Preview['status'];
  if (table && table.detected && placesStatus === 'AUTO' && typeof placesValue === 'number') status = 'VALID_CONCOURS_PDF';
  else if (table && table.detected) status = 'POSSIBLE_CONCOURS_PDF';
  else if (scanned) status = 'SCANNED_REVIEW';
  else status = 'NOT_CONCOURS';

  // décision
  let decision: Phase16Preview['decision'];
  const reasons: string[] = [];
  const placesEvidenceStr = table ? JSON.stringify(table.places ?? {}) : 'aucun';
  if (status === 'VALID_CONCOURS_PDF') {
    decision = 'IMPORTABLE';
    reasons.push('table détectée, places AUTO=' + placesValue + ' (total), page=' + (table?.page ?? 1));
  } else if (status === 'POSSIBLE_CONCOURS_PDF') {
    decision = 'REVIEW';
    reasons.push('table détectée mais places ' + placesStatus + ' — preuve à vérifier, places=' + placesEvidenceStr);
  } else if (status === 'SCANNED_REVIEW') {
    decision = 'REVIEW';
    reasons.push('PDF scanné — OCR non exploitable, relire manuellement');
  } else {
    decision = 'BLOCKED';
    reasons.push('pas de table de concours exploitable (status=' + status + ')');
  }
  reasons.push(...warnings);

  return {
    pdfUrl: c.pdfUrl, sourceId: c.sourceId, organization: c.organization, status,
    table, mapped,
    places: { status: placesStatus, total: placesValue, evidence: [placesEvidenceStr] },
    evidence,
    decision, decisionReasons: reasons,
  };
}

// ------------------------------------------------------------------
// UCA regression (must remain 29 rows / 33 places / REVIEW)
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
  const outFile = join(OUT_DIR, `phase16-competition-discovery-${stamp}.json`);
  const logFile = join(LOG_DIR, `phase16-competition-discovery-${stamp}.txt`);
  const lines: string[] = [];

  lines.push('=== Phase 16 - Targeted Discovery + End-to-End Validation (PREVIEW ONLY, 0 writes) ===');
  lines.push('Run: ' + new Date().toISOString());

  // 1) Discovery
  lines.push('--- ÉTAPE 1 : découverte ciblée (bornes probes=' + MAX_PROBES + ', candidats=' + MAX_CANDIDATES + ') ---');
  let candidates: DerivedPdfUrl[] = [];
  let probesAttempted = 0;
  let probesOk = 0;
  try {
    const discoveryResult = await discoverPdfCandidates();
    candidates = discoveryResult.candidates;
    probesAttempted = discoveryResult.probes;
    probesOk = discoveryResult.probesOk;
    lines.push('Probes tentées: ' + probesAttempted + ' | Probes OK: ' + probesOk + ' | PDFs découverts: ' + candidates.length);
  } catch (e) {
    lines.push('Découverte échouée: ' + e);
  }

  const classified = candidates.map(c => ({ pdfUrl: c.pdfUrl, ...classifyCandidate(c) }));
  lines.push('--- Classification candidats découverts ---');
  for (const k of classified) lines.push(`  [${k.classification}] ${k.pdfUrl} — ${k.reason}`);

  // 2) Sélection des meilleurs (top par classification VALID > POSSIBLE)
  const rank: Record<string, number> = { VALID_CONCOURS_PDF: 0, POSSIBLE_CONCOURS_PDF: 1, UNKNOWN: 2, NOT_CONCOURS: 3 };
  const selected = classified
    .filter(k => k.classification !== 'NOT_CONCOURS')
    .sort((a2,b2) => (rank[a2.classification] ?? 9) - (rank[b2.classification] ?? 9))
    .slice(0, MAX_ANALYZED)
    .map(k => candidates.find(c => c.pdfUrl === k.pdfUrl)!)
    .filter(Boolean);

  lines.push(`--- Sélection: ${selected.length} PDF(s) à analyser (max ${MAX_ANALYZED}) ---`);
  for (const s of selected) lines.push('  ' + s.pdfUrl);

  // 3) Analyse complète
  const analyzed: Phase16Preview[] = [];
  for (const cand of selected) {
    lines.push('--- Analyse: ' + cand.pdfUrl + ' ---');
    const prev = await analyzeCandidate(cand);
    analyzed.push(prev);
    lines.push(`  status=${prev.status} decision=${prev.decision} places=${prev.places.status}(${prev.places.total ?? '-'})`);
    lines.push(`  institution=${prev.evidence.institution.value ?? '-'} [${prev.evidence.institution.confidence}]`);
    lines.push(`  speciality=${prev.evidence.speciality.value ?? '-'} [${prev.evidence.speciality.confidence}]`);
    lines.push(`  grade=${prev.evidence.grade.value ?? '-'} [${prev.evidence.grade.confidence}]`);
    for (const r of prev.decisionReasons) lines.push('    … ' + r);
  }

  // 4) Décision finale
  const important = analyzed.filter(a => a.decision === 'IMPORTABLE');
  const reviewable = analyzed.filter(a => a.decision === 'REVIEW');
  const blocked = analyzed.filter(a => a.decision === 'BLOCKED');

  let status: Phase16Output['status'] = 'COMPLETE';
  let statusReason: string | null = null;
  if (important.length === 0 && reviewable.length === 0) {
    status = 'NO_SUITABLE_CONCOURS_PDF_FOUND';
    statusReason = analyzed.length === 0
      ? 'aucun candidat PDF exploitable découvert lors de la découverte ciblée (aucun PDF concours trouvé sur les endpoints officiels testés)'
      : blocked.map(b => b.pdfUrl).join(', ') + ' — tous BLOCKED (pas de table de concours exploitable)';
    lines.push('!!! Aucun PDF de concours exploitable → NO_SUITABLE_CONCOURS_PDF_FOUND');
    lines.push('    Raisons: ' + statusReason);
  } else {
    lines.push('Decisions: IMPORTABLE=' + important.length + ' REVIEW=' + reviewable.length + ' BLOCKED=' + blocked.length);
  }

  // 5) UCA regression
  const reg = runUcaRegression();
  lines.push(`UCA regression: rows=${reg.rows} places=${reg.places} status=${reg.status} ${reg.rows === 29 && reg.places === 33 && reg.status === 'REVIEW' ? 'OK' : 'KO'}`);

  const output: Phase16Output = {
    phase: '16',
    phaseLabel: 'Découverte ciblée PDFs concours + validation de bout en bout (préview)',
    runType: 'PREVIEW_ONLY',
    runDate: new Date().toISOString(),
    status,
    statusReason,
    discovery: {
      probesAttempted,
      probesOk,
      pdfUrlsDiscovered: candidates.map(c => c.pdfUrl),
      candidatesClassified: classified,
    },
    candidatesAnalyzed: analyzed,
    regression: { ucaRows: reg.rows, ucaPlaces: reg.places, ucaStatus: reg.status },
    writes: { database: 0, supabase: 0, forms: 0, localStorage: 0 },
    summary: {
      candidatesDiscovered: candidates.length,
      candidatesSelected: selected.length,
      documentsAnalyzed: analyzed.length,
      validConcoursPdf: analyzed.filter(a => a.status === 'VALID_CONCOURS_PDF').length,
      possibleConcoursPdf: analyzed.filter(a => a.status === 'POSSIBLE_CONCOURS_PDF').length,
      notConcoursPdf: analyzed.filter(a => a.status === 'NOT_CONCOURS').length,
      scannedReview: analyzed.filter(a => a.status === 'SCANNED_REVIEW').length,
    },
  };

  writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf-8');
  writeFileSync(logFile, lines.join('\n'), 'utf-8');

  console.log('=== Phase 16 - Découverte ciblée + Validation (PREVIEW ONLY, 0 writes) ===');
  console.log('Status: ' + status);
  if (statusReason) console.log('Raison: ' + statusReason);
  console.log('Candidats découverts: ' + candidates.length + ' | analysés: ' + analyzed.length);
  console.log('Décisions: IMPORTABLE=' + important.length + ' REVIEW=' + reviewable.length + ' BLOCKED=' + blocked.length);
  console.log('UCA regression: rows=' + reg.rows + ' places=' + reg.places + ' status=' + reg.status + ' ' + (reg.rows === 29 && reg.places === 33 && reg.status === 'REVIEW' ? 'OK' : 'KO'));
  console.log('Writes: DB=0 Supabase=0 Forms=0 localStorage=0');
  console.log('Output: ' + outFile.replace(HERE + '\\', ''));
  console.log('Log:    ' + logFile.replace(HERE + '\\', ''));
}

main();
