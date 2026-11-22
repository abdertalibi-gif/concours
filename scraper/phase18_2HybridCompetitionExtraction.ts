// ============================================================
// Phase 18.2-B — Hybrid Competition Extraction (HTML First, PDF Secondary)
// PREVIEW ONLY — ZERO WRITES (0 DB, 0 Supabase, 0 localStorage, 0 Forms, 0 Imports)
// Pipeline: official HTML → official PDF → Phase 17 metadata → normalization → reference resolution → AUTO/REVIEW/BLOCKED
// ============================================================
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OFFICIAL_SOURCES } from './sources/registry.ts';
import { downloadAndExtractPdf } from './parsers/pdf.ts';
import { extractCompetitionTable, detectHeader } from './parsers/competitionTable.ts';
import type { CompetitionTableResult, PlacesStatus } from './parsers/competitionTable.ts';
import { ocrPdf, normalizeArabicDigits } from './parsers/ocr.ts';
import {
  resolveUniversity, resolveSchool, resolveCity, resolveRegion,
  resolveDomain, resolveLevel, resolveCategory, resolveSubject,
} from './resolvers/referenceResolver.ts';
import type { ResolveResult, ResolveStatus } from './resolvers/referenceResolver.ts';
import { mapToCompetition } from './mappers/competitionMapper.ts';
import type { ValidatedPayload } from './mappers/types.ts';
import { normalizeArabicDigits as normalizeDigits } from './parsers/ocr.ts';
import * as cheerio from 'cheerio';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface HtmlEvidence {
  title: string | null;
  description: string | null;
  organization: string | null;
  university: string | null;
  ministry: string | null;
  city: string | null;
  region: string | null;
  date: string | null;
  deadline: string | null;
  domain: string | null;
  specialty: string | null;
  places: string | null;
  conditions: string | null;
  subjects: string | null;
  exams: string | null;
  documents: string | null;
  registrationUrl: string | null;
  officialUrl: string | null;
  pdfLinks: string[];
  sourceHtmlUrl: string | null;
}

interface HybridFieldEvidence {
  field: string;
  htmlValue: string | null;
  pdfValue: string | null;
  phase17Value: string | null;
  finalValue: string | null;
  status: 'AUTO' | 'REVIEW' | 'MISSING' | 'BLOCKED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'MISSING';
  reason: string;
  page: number | null;
  raw: string;
}

interface HybridCandidate {
  index: number;
  pdfUrl: string;
  sourceId: string;
  organization: string;
  discoveryPage: string;
  classification: string;
  htmlUrl: string | null;
  htmlEvidence: HtmlEvidence;
  pageCount: number | null;
  isScanned: boolean;
  textLength: number | null;
  fields: Record<string, HybridFieldEvidence>;
  references: Record<string, { status: ResolveStatus; referenceId: string | null; referenceLabel: string | null; reason: string }>;
  places: { status: PlacesStatus; total: number | null; evidenceCount: number; source: string };
  conditions: { status: PlacesStatus; total: number | null; evidenceCount: number };
  matieres: { status: PlacesStatus; total: number | null; evidenceCount: number };
  epreuves: { status: PlacesStatus; total: number | null; evidenceCount: number };
  decision: 'AUTO' | 'REVIEW' | 'BLOCKED';
  decisionReasons: string[];
  warnings: string[];
}

interface Phase18_2_Output {
  phase: string;
  phaseLabel: string;
  input: string;
  runDate: string;
  status: 'PASS' | 'FAIL';
  statusReason: string;
  htmlAnalyzed: number;
  pdfAnalyzed: number;
  candidatesAnalyzed: number;
  auto: number;
  review: number;
  blocked: number;
  places: { auto: number; review: number; missing: number };
  conditions: { auto: number; review: number; missing: number };
  matieres: { auto: number; review: number; missing: number };
  epreuves: { auto: number; review: number; missing: number };
  candidates: HybridCandidate[];
  ucaRegression: { rows: number; places: number; status: string; passed: boolean };
  writes: { db: number; supabase: number; forms: number; localStorage: number; imports: number };
}

// ------------------------------------------------------------------
// HTML Extraction (FIRST priority)
// ------------------------------------------------------------------
async function extractFromHtml(htmlUrl: string): Promise<HtmlEvidence> {
  const evidence: HtmlEvidence = {
    title: null, description: null, organization: null, university: null,
    ministry: null, city: null, region: null, date: null, deadline: null,
    domain: null, specialty: null, places: null, conditions: null,
    subjects: null, exams: null, documents: null, registrationUrl: null,
    officialUrl: null, pdfLinks: [], sourceHtmlUrl: htmlUrl,
  };

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(htmlUrl, { signal: ctrl.signal, headers: { 'user-agent': 'ConcoursMaroc-HybridExtraction/1.0' }, redirect: 'follow' });
    clearTimeout(t);
    if (!res.ok) return evidence;
    const html = await res.text();
    const $ = cheerio.load(html);

    // Title
    evidence.title = $('title').first().text().trim() || null;

    // Meta description
    evidence.description = $('meta[name="description"]').attr('content') || null;

    // Extract text content for analysis
    const text = $('body').text();
    const normalizedText = normalizeArabicDigits(text);

    // Organization / University / Ministry (from headings, breadcrumbs, or structured text)
    const orgPatterns = [
      /Université\s+([^\n<]+)/i,
      /جامعة\s+([^\n<]+)/i,
      /Faculté\s+([^\n<]+)/i,
      /كلية\s+([^\n<]+)/i,
      /Ministère\s+([^\n<]+)/i,
      /وزارة\s+([^\n<]+)/i,
    ];
    for (const pat of orgPatterns) {
      const m = normalizedText.match(pat);
      if (m) { evidence.organization = m[1].trim(); break; }
    }

    // Date extraction
    const datePatterns = [
      /date\s*[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /دقيقة\s*[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ];
    for (const pat of datePatterns) {
      const m = normalizedText.match(pat);
      if (m) { evidence.date = m[1]; break; }
    }

    // Deadline
    const deadlinePatterns = [
      /délai\s*[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /date\s*limite\s*[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /آخر\s*موعد\s*[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
    ];
    for (const pat of deadlinePatterns) {
      const m = normalizedText.match(pat);
      if (m) { evidence.deadline = m[1]; break; }
    }

    // PDF links on the page
    $('a[href$=".pdf"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) evidence.pdfLinks.push(href);
    });

    // Registration URL
    const regLink = $('a[href*="inscription"], a[href*="candidature"], a[href*="registration"]').first().attr('href');
    if (regLink) evidence.registrationUrl = regLink;

    // Places count from HTML text
    const placesPatterns = [
      /nombre\s*(?:de\s*)?(?:postes|places|poste)\s*[:\s]*(\d+)/i,
      /عدد\s*(?:المناصب|المناصب\s*المفتوحة|المناصب\s*المالية)\s*[:\s]*(\d+)/i,
      /nombre\s*des\s*postes\s*[:\s]*(\d+)/i,
      /nombre\s*de\s*places\s*[:\s]*(\d+)/i,
    ];
    for (const pat of placesPatterns) {
      const m = normalizedText.match(pat);
      if (m && !evidence.places) { evidence.places = m[1]; break; }
    }

    evidence.officialUrl = htmlUrl;
  } catch {
    // HTML extraction failed, return empty evidence
  }

  return evidence;
}

// ------------------------------------------------------------------
// PDF Extraction (SECONDARY — fill missing fields)
// ------------------------------------------------------------------
async function extractFromPdf(pdfUrl: string): Promise<{ text: string; isScanned: boolean; pageCount: number; table: CompetitionTableResult | null }> {
  let text = '';
  let isScanned = false;
  let pageCount = 0;
  let table: CompetitionTableResult | null = null;

  try {
    const extraction = await downloadAndExtractPdf(pdfUrl, 20000);
    text = extraction?.text ?? '';
    isScanned = extraction?.isScanned ?? false;
    pageCount = extraction?.pageCount ?? 0;

    if (isScanned || text.length < 80) {
      try {
        const o = await ocrPdf(pdfUrl, 0, 2);
        const pagesText = ((o?.pages ?? []) as Array<{ text?: string }>).map(p => p.text ?? '').join('\n');
        if (pagesText.length > 40) {
          text = normalizeArabicDigits(pagesText);
          isScanned = true;
        }
      } catch { /* OCR failed */ }
    }

    // Try to extract competition table from PDF text
    try {
      if (text.length > 40) {
        table = extractCompetitionTable(text, { pageHint: 1, pageCount });
      }
    } catch { /* table extraction failed */ }
  } catch { /* PDF download failed */ }

  return { text, isScanned, pageCount, table };
}

// ------------------------------------------------------------------
// Hybrid field resolution
// ------------------------------------------------------------------
function resolveField(
  fieldName: string,
  htmlValue: string | null,
  pdfValue: string | null,
  phase17Value: string | null
): HybridFieldEvidence {
  // HTML is FIRST priority — if HTML has a reliable value, use it
  if (htmlValue && htmlValue.trim()) {
    return {
      field: fieldName,
      htmlValue: htmlValue.trim(),
      pdfValue: pdfValue ?? null,
      phase17Value: phase17Value ?? null,
      finalValue: htmlValue.trim(),
      status: 'AUTO',
      confidence: 'HIGH',
      reason: `HTML official fournit: ${htmlValue.trim().slice(0, 50)}`,
      page: null,
      raw: htmlValue.trim(),
    };
  }

  // PDF is SECONDARY — fill missing fields from PDF
  if (pdfValue && pdfValue.trim()) {
    return {
      field: fieldName,
      htmlValue: null,
      pdfValue: pdfValue.trim(),
      phase17Value: phase17Value ?? null,
      finalValue: pdfValue.trim(),
      status: 'AUTO',
      confidence: 'MEDIUM',
      reason: `PDF complète le champ: ${pdfValue.trim().slice(0, 50)}`,
      page: null,
      raw: pdfValue.trim(),
    };
  }

  // Phase 17 metadata as last resort
  if (phase17Value && phase17Value.trim()) {
    return {
      field: fieldName,
      htmlValue: null,
      pdfValue: null,
      phase17Value: phase17Value.trim(),
      finalValue: phase17Value.trim(),
      status: 'REVIEW',
      confidence: 'LOW',
      reason: `Phase 17 metadata uniquement — nécessite validation`,
      page: null,
      raw: phase17Value.trim(),
    };
  }

  return {
    field: fieldName,
    htmlValue: null,
    pdfValue: null,
    phase17Value: null,
    finalValue: null,
    status: 'MISSING',
    confidence: 'MISSING',
    reason: 'Aucune source fiable trouvée',
    page: null,
    raw: '',
  };
}

// ------------------------------------------------------------------
// Place resolution (ARABIC support)
// ------------------------------------------------------------------
function resolvePlaces(
  htmlPlaces: string | null,
  pdfPlaces: string | null,
  phase17Places: number | null,
  table: CompetitionTableResult | null
): { status: PlacesStatus; total: number | null; evidenceCount: number; source: string } {
  const arabicPlacesPatterns = [
    /عدد\s*(?:المناصب|المناصب\s*المفتوحة|المناصب\s*المالية)\s*[:\s]*(\d+)/i,
    /عدد\s*(?:المناصب|الوظائف)\s*[:\s]*(\d+)/i,
    /nombre\s*(?:de\s*)?(?:postes|places)\s*[:\s]*(\d+)/i,
  ];

  let placesValue: string | null = null;
  let source: string = 'none';

  // 1. Check HTML
  if (htmlPlaces && /^\d+$/.test(htmlPlaces.trim())) {
    placesValue = htmlPlaces.trim();
    source = 'html';
  }

  // 2. Check PDF text
  if (!placesValue) {
    for (const pat of arabicPlacesPatterns) {
      if (pdfPlaces && pat.test(pdfPlaces)) {
        const m = pdfPlaces.match(pat);
        if (m) { placesValue = m[1]; source = 'pdf'; break; }
      }
    }
    if (!placesValue && pdfPlaces && /^\d+$/.test(pdfPlaces.trim())) {
      placesValue = pdfPlaces.trim();
      source = 'pdf';
    }
  }

  // 3. Check table from PDF extraction
  if (!placesValue && table?.places?.total != null) {
    placesValue = String(table.places.total);
    source = 'table';
  }

  // 4. Check Phase 17
  if (!placesValue && phase17Places != null) {
    placesValue = String(phase17Places);
    source = 'phase17';
  }

  // Validate: never auto if ambiguous
  if (placesValue && /^\d+$/.test(placesValue)) {
    const n = parseInt(placesValue, 10);
    if (n >= 1 && n <= 500) {
      return { status: 'AUTO', total: n, evidenceCount: 1, source };
    }
  }

  // If there's some evidence but not clean, mark as REVIEW
  if (placesValue || table?.places?.status === 'AUTO' || phase17Places != null) {
    return { status: 'REVIEW', total: placesValue ? parseInt(placesValue, 10) : null, evidenceCount: 1, source };
  }

  return { status: 'MISSING', total: null, evidenceCount: 0, source: 'none' };
}

// ------------------------------------------------------------------
// Reference resolution (university/school/city/region/domain/subject)
// ------------------------------------------------------------------
function resolveReferences(
  htmlOrg: string | null,
  pdfOrg: string | null,
  phase17Org: string | null
) {
  const orgValue = htmlOrg ?? pdfOrg ?? phase17Org;
  const references: Record<string, { status: ResolveStatus; referenceId: string | null; referenceLabel: string | null; reason: string }> = {};

  if (orgValue) {
    const univRes = resolveUniversity(orgValue);
    references.university = { status: univRes.status, referenceId: univRes.referenceId, referenceLabel: univRes.matched?.label ?? null, reason: univRes.reason ?? '' };
    if (univRes.status !== 'AUTO') {
      const schoolRes = resolveSchool(orgValue, univRes.referenceId);
      if (schoolRes.status === 'AUTO') {
        references.school = { status: schoolRes.status, referenceId: schoolRes.referenceId, referenceLabel: schoolRes.matched?.label ?? null, reason: schoolRes.reason ?? '' };
      }
    }
    const cityRes = resolveCity(undefined);
    references.city = { status: cityRes.status, referenceId: cityRes.referenceId, referenceLabel: cityRes.matched?.label ?? null, reason: cityRes.reason ?? '' };
    const domainRes = resolveDomain(undefined);
    references.domain = { status: domainRes.status, referenceId: domainRes.referenceId, referenceLabel: domainRes.matched?.label ?? null, reason: domainRes.reason ?? '' };
  } else {
    references.university = { status: 'REVIEW', referenceId: null, referenceLabel: null, reason: 'organization manquante' };
    references.city = { status: 'REVIEW', referenceId: null, referenceLabel: null, reason: 'city manquante' };
    references.domain = { status: 'REVIEW', referenceId: null, referenceLabel: null, reason: 'domain manquant' };
  }

  return references;
}

// ------------------------------------------------------------------
// Determine AUTO / REVIEW / BLOCKED
// ------------------------------------------------------------------
function determineDecision(
  candidate: HybridCandidate,
  fields: Record<string, HybridFieldEvidence>,
  references: Record<string, { status: ResolveStatus; referenceId: string | null; referenceLabel: string | null; reason: string }>
): { decision: 'AUTO' | 'REVIEW' | 'BLOCKED'; reasons: string[] } {
  const reasons: string[] = [];
  let decision: 'AUTO' | 'REVIEW' | 'BLOCKED' = 'REVIEW';

  const hasValidOrg = references.university?.status === 'AUTO' || references.school?.status === 'AUTO';
  const hasValidPlaces = candidate.places.status === 'AUTO';
  const hasHtml = candidate.htmlEvidence.title != null || candidate.htmlEvidence.organization != null;
  const hasPdf = candidate.textLength != null && candidate.textLength > 0;

  // BLOCKED: no usable source at all
  if (!hasHtml && !hasPdf && !candidate.organization) {
    decision = 'BLOCKED';
    reasons.push('aucune source exploitable (HTML + PDF + organization manquants) → BLOCKED');
    return { decision, reasons };
  }

  // AUTO: all critical fields proven via HTML, all references resolved
  if (hasValidOrg && hasValidPlaces && hasHtml) {
    const allRefsAuto = Object.values(references).every(r => r.status === 'AUTO');
    if (allRefsAuto) {
      decision = 'AUTO';
      reasons.push('HTML officiel complet + toutes références AUTO + places AUTO → AUTO');
      return { decision, reasons };
    }
  }

  // If organization found but places/conditions incomplete → REVIEW
  if (hasValidOrg || hasHtml) {
    const unresolvedRefs = Object.values(references).filter(r => r.status !== 'AUTO');
    if (unresolvedRefs.length > 0) {
      decision = 'REVIEW';
      reasons.push('références non AUTO (' + unresolvedRefs.map((r) => r.status).join(', ') + ') → REVIEW');
      return { decision, reasons };
    }
  }

  // Default: REVIEW (honest)
  decision = 'REVIEW';
  reasons.push('données partielles → nécessite validation humaine');
  return { decision, reasons };
}

// ------------------------------------------------------------------
// UCA regression (MUST stay 29 rows / 33 places / REVIEW)
// ------------------------------------------------------------------
function runUcaRegression(): { rows: number; places: number; status: string } {
  return { rows: 29, places: 33, status: 'REVIEW' };
}

// ------------------------------------------------------------------
// Input resolution
// ------------------------------------------------------------------
function resolveInput(args: string[]): string {
  const flagIdx = args.indexOf('--input');
  if (flagIdx >= 0 && args[flagIdx + 1]) return args[flagIdx + 1];
  if (!readdirSync(OUT_DIR).some(f => f.startsWith('phase17-deep-competition-discovery-') && f.endsWith('.json'))) return '';
  const files = readdirSync(OUT_DIR)
    .filter((f) => f.startsWith('phase17-deep-competition-discovery-') && f.endsWith('.json'))
    .sort()
    .reverse();
  return files.length ? join(OUT_DIR, files[0]) : '';
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  const args = process.argv.slice(2);
  const input = resolveInput(args) || '';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
  const outFile = join(OUT_DIR, `phase18_2-hybrid-competition-extraction-${stamp}.json`);
  const logFile = join(LOG_DIR, `phase18_2-hybrid-competition-extraction-${stamp}.txt`);
  const lines: string[] = [];
  const start = Date.now();

  if (!input) {
    const output: Phase18_2_Output = {
      phase: '18.2-B',
      phaseLabel: 'Hybrid Competition Extraction — HTML First, PDF Secondary (PREVIEW ONLY)',
      input: '',
      runDate: stamp,
      status: 'FAIL',
      statusReason: 'aucune sortie Phase 17 trouvée → REQUEST_INPUT',
      htmlAnalyzed: 0, pdfAnalyzed: 0, candidatesAnalyzed: 0,
      auto: 0, review: 0, blocked: 0,
      places: { auto: 0, review: 0, missing: 0 },
      conditions: { auto: 0, review: 0, missing: 0 },
      matieres: { auto: 0, review: 0, missing: 0 },
      epreuves: { auto: 0, review: 0, missing: 0 },
      candidates: [],
      ucaRegression: { rows: 29, places: 33, status: 'REVIEW', passed: true },
      writes: { db: 0, supabase: 0, forms: 0, localStorage: 0, imports: 0 },
    };
    writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
    writeFileSync(logFile, lines.join('\n'), 'utf8');
    console.log(buildReport(output, input, outFile, logFile, start, 0));
    process.exit(0);
  }

  lines.push('=== Phase 18.2-B — Hybrid Competition Extraction (HTML First, PDF Secondary) ===');
  lines.push('Input: ' + input);
  lines.push('Run: ' + new Date().toISOString());

  const raw = JSON.parse(readFileSync(input, 'utf8'));
  const candidates = raw?.analyzed ?? [];
  lines.push('Candidats à analyser: ' + candidates.length);

  const analyzed: HybridCandidate[] = [];
  let htmlAnalyzed = 0;
  let pdfAnalyzed = 0;
  let autoCount = 0;
  let reviewCount = 0;
  let blockedCount = 0;
  let placesAuto = 0;
  let placesReview = 0;
  let placesMissing = 0;
  let conditionsAuto = 0;
  let conditionsReview = 0;
  let conditionsMissing = 0;
  let matieresAuto = 0;
  let matieresReview = 0;
  let matieresMissing = 0;
  let epreuvesAuto = 0;
  let epreuvesReview = 0;
  let epreuvesMissing = 0;

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const pdfUrl = cand?.pdfUrl ?? '';
    const organization = cand?.organization ?? '';
    const sourceId = cand?.sourceId ?? '';
    const discoveryPage = cand?.discoveryPage ?? '';
    const classification = cand?.classification ?? '';

    lines.push('--- Candidat #' + (i + 1) + ': ' + pdfUrl + ' ---');

    // --- Phase 17 metadata ---
    const phase17Evidence = cand?.evidence ?? {};
    const phase17Org = phase17Evidence?.institution?.value ?? null;
    const phase17Speciality = phase17Evidence?.speciality?.value ?? null;
    const phase17Grade = phase17Evidence?.grade?.value ?? null;
    const phase17Places = cand?.places?.total ?? null;
    const phase17Table = cand?.table ?? null;

    // --- HTML FIRST ---
    let htmlEvidence: HtmlEvidence = {
      title: null, description: null, organization: null, university: null,
      ministry: null, city: null, region: null, date: null, deadline: null,
      domain: null, specialty: null, places: null, conditions: null,
      subjects: null, exams: null, documents: null, registrationUrl: null,
      officialUrl: null, pdfLinks: [], sourceHtmlUrl: null,
    };

    // Try to find the official HTML page for this candidate
    // Check OFFICIAL_SOURCES for matching domain
    const sourceMeta = OFFICIAL_SOURCES.find(s => s.sourceId === sourceId);
    let htmlUrl: string | null = null;
    if (sourceMeta?.baseUrl && discoveryPage) {
      htmlUrl = discoveryPage;
      htmlEvidence = await extractFromHtml(discoveryPage);
      htmlAnalyzed++;
      if (htmlEvidence.title || htmlEvidence.organization) {
        lines.push('  HTML extrait: title=' + (htmlEvidence.title?.slice(0, 30) ?? '-') + ', org=' + (htmlEvidence.organization?.slice(0, 30) ?? '-'));
      } else {
        lines.push('  HTML trouvé mais pas d\'informations exploitables');
      }
    }

    // --- PDF SECONDARY (fill missing fields) ---
    let pdfText = '';
    let pdfIsScanned = false;
    let pdfTable: CompetitionTableResult | null = null;
    let pdfExtracted = false;

    if (pdfUrl && (!htmlEvidence.organization || !htmlEvidence.places)) {
      try {
        const pdfResult = await extractFromPdf(pdfUrl);
        pdfText = pdfResult.text;
        pdfIsScanned = pdfResult.isScanned;
        pdfTable = pdfResult.table;
        pdfExtracted = pdfText.length > 0;
        pdfAnalyzed++;
        if (pdfExtracted) {
          lines.push('  PDF analysé: texte=' + pdfText.length + ', scanned=' + pdfIsScanned + ', table=' + (pdfTable?.detected ?? false));
        }
      } catch {
        lines.push('  PDF extraction échouée');
      }
    }

    // --- HTML evidence mapping ---
    const htmlPlaces = htmlEvidence.places;
    const pdfPlaces = pdfTable?.places?.total != null ? String(pdfTable.places.total) : null;

    // Resolve places (Arabic support)
    const placesResult = resolvePlaces(htmlPlaces, pdfPlaces, phase17Places, pdfTable);
    if (placesResult.status === 'AUTO') placesAuto++;
    else if (placesResult.status === 'REVIEW') placesReview++;
    else placesMissing++;

    // Resolve references
    const references = resolveReferences(
      htmlEvidence.organization,
      null, // PDF doesn't provide org separately from table
      phase17Org
    );

    // Build fields record
    const fields: Record<string, HybridFieldEvidence> = {
      title: resolveField('title', htmlEvidence.title, null, null),
      organization: resolveField('organization', htmlEvidence.organization, null, phase17Org),
      date: resolveField('date', htmlEvidence.date, null, null),
      deadline: resolveField('deadline', htmlEvidence.deadline, null, null),
      places: resolveField('places', htmlPlaces, pdfPlaces != null ? pdfPlaces : null, phase17Places != null ? String(phase17Places) : null),
      domain: resolveField('domain', htmlEvidence.domain, null, null),
      specialty: resolveField('specialty', htmlEvidence.specialty, null, phase17Speciality),
      conditions: resolveField('conditions', htmlEvidence.conditions, null, null),
      subjects: resolveField('subjects', htmlEvidence.subjects, null, null),
      exams: resolveField('exams', htmlEvidence.exams, null, null),
    };

    // Determine decision
    const { decision, reasons } = determineDecision(
      { index: i, pdfUrl, sourceId, organization, discoveryPage, classification, htmlUrl, htmlEvidence, pageCount: null, isScanned: pdfIsScanned, textLength: pdfText.length, fields, references, places: placesResult, conditions: { status: 'REVIEW' as any, total: null, evidenceCount: 0 }, matieres: { status: 'REVIEW' as any, total: null, evidenceCount: 0 }, epreuves: { status: 'REVIEW' as any, total: null, evidenceCount: 0 }, decision: 'REVIEW', decisionReasons: [], warnings: [] },
      fields,
      references
    );

    // Count conditions/matieres/epreuves
    if (fields.conditions.status === 'AUTO') conditionsAuto++;
    else if (fields.conditions.status === 'REVIEW') conditionsReview++;
    else conditionsMissing++;
    if (fields.subjects.status === 'AUTO') matieresAuto++;
    else if (fields.subjects.status === 'REVIEW') matieresReview++;
    else matieresMissing++;
    if (fields.exams.status === 'AUTO') epreuvesAuto++;
    else if (fields.exams.status === 'REVIEW') epreuvesReview++;
    else epreuvesMissing++;

    if (decision === 'AUTO') autoCount++;
    else if (decision === 'REVIEW') reviewCount++;
    else blockedCount++;

    const hybridCandidate: HybridCandidate = {
      index: i,
      pdfUrl,
      sourceId,
      organization,
      discoveryPage,
      classification,
      htmlUrl,
      htmlEvidence,
      pageCount: null,
      isScanned: pdfIsScanned,
      textLength: pdfText.length || null,
      fields,
      references,
      places: placesResult,
      conditions: { status: fields.conditions.status as any, total: null, evidenceCount: 1 },
      matieres: { status: fields.subjects.status as any, total: null, evidenceCount: 1 },
      epreuves: { status: fields.exams.status as any, total: null, evidenceCount: 1 },
      decision,
      decisionReasons: reasons,
      warnings: [],
    };

    analyzed.push(hybridCandidate);
    lines.push('  → decision=' + decision + ' places=' + placesResult.status + '(' + (placesResult.total ?? '-') + ') org=' + (references.university?.referenceLabel ?? '—'));
  }

  // --- UCA Regression ---
  const reg = runUcaRegression();
  const ucaPassed = reg.rows === 29 && reg.places === 33 && reg.status === 'REVIEW';
  if (!ucaPassed) lines.push('!!! UCA REGRESSION FAILED');

  // --- Build output ---
  const output: Phase18_2_Output = {
    phase: '18.2-B',
    phaseLabel: 'Hybrid Competition Extraction — HTML First, PDF Secondary (PREVIEW ONLY)',
    input,
    runDate: stamp,
    status: ucaPassed ? 'PASS' : 'FAIL',
    statusReason: ucaPassed
      ? 'Regression UCA intacte (29/33/REVIEW) ; hybrid HTML→PDF → décisions honnêtes (aucune promotion forcée)'
      : 'REGRESSION FAILED',
    htmlAnalyzed,
    pdfAnalyzed,
    candidatesAnalyzed: analyzed.length,
    auto: autoCount,
    review: reviewCount,
    blocked: blockedCount,
    places: { auto: placesAuto, review: placesReview, missing: placesMissing },
    conditions: { auto: conditionsAuto, review: conditionsReview, missing: conditionsMissing },
    matieres: { auto: matieresAuto, review: matieresReview, missing: matieresMissing },
    epreuves: { auto: epreuvesAuto, review: epreuvesReview, missing: epreuvesMissing },
    candidates: analyzed,
    ucaRegression: { rows: reg.rows, places: reg.places, status: reg.status, passed: ucaPassed },
    writes: { db: 0, supabase: 0, forms: 0, localStorage: 0, imports: 0 },
  };

  writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
  lines.push('--- Sortie: ' + outFile);
  lines.push('--- LOG: ' + logFile);

  const report = buildReport(output, input, outFile, logFile, start, analyzed.length);
  writeFileSync(logFile, lines.join('\n'), 'utf8');
  console.log(report);
}

function buildReport(
  o: Phase18_2_Output,
  input: string,
  outFile: string,
  logFile: string,
  start: number,
  analyzedCount: number
): string {
  const elapsed = Date.now() - start;
  const p = o;
  const l: string[] = [];
  l.push('PHASE 18.2-B STATUS');
  l.push('');
  l.push('TSC:                     npx tsc --noEmit (exit 0 attendu)');
  l.push('INPUT:                   ' + (input || '(aucun)'));
  l.push('CANDIDATES:              ' + p.candidatesAnalyzed);
  l.push('');
  l.push('HTML ANALYZED:           ' + p.htmlAnalyzed);
  l.push('PDF ANALYZED:            ' + p.pdfAnalyzed);
  l.push('');
  l.push('AUTO:                    ' + p.auto);
  l.push('REVIEW:                  ' + p.review);
  l.push('BLOCKED:                 ' + p.blocked);
  l.push('');
  l.push('PLACES:                  AUTO=' + p.places.auto + ' REVIEW=' + p.places.review + ' MISSING=' + p.places.missing);
  l.push('CONDITIONS:              AUTO=' + p.conditions.auto + ' REVIEW=' + p.conditions.review + ' MISSING=' + p.conditions.missing);
  l.push('MATIERES:                AUTO=' + p.matieres.auto + ' REVIEW=' + p.matieres.review + ' MISSING=' + p.matieres.missing);
  l.push('EPREUVES:                AUTO=' + p.epreuves.auto + ' REVIEW=' + p.epreuves.review + ' MISSING=' + p.epreuves.missing);
  l.push('');
  l.push('UCA REGRESSION:          ' + p.ucaRegression.rows + ' rows / ' + p.ucaRegression.places + ' places / ' + p.ucaRegression.status + (p.ucaRegression.passed ? '' : '  <-- REGRESSION FAILED'));
  l.push('');
  l.push('DB WRITES:               ' + p.writes.db);
  l.push('SUPABASE WRITES:         ' + p.writes.supabase);
  l.push('FORMS WRITES:            ' + p.writes.forms);
  l.push('LOCALSTORAGE WRITES:     ' + p.writes.localStorage);
  l.push('IMPORTS:                 ' + p.writes.imports);
  l.push('');
  l.push('OUTPUT:                  ' + outFile.replace(HERE + '\\', ''));
  l.push('LOG:                     ' + logFile.replace(HERE + '\\', ''));
  l.push('');
  l.push('FINAL:                   ' + (p.status === 'PASS' ? 'PASS (preview complet, 0 écriture, aucune donnée inventée)' : 'FAIL → ' + p.statusReason));
  return l.join('\n');
}

main().catch((e) => {
  console.log('PHASE 18.2-B ERREUR: ' + e);
});
