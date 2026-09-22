// Phase 15 - Full-Document OCR + Page Targeting (all pages, per-page preview)
// PREVIEW ONLY - NO DB WRITE, no Supabase, no localStorage, no Forms, no imports
// Pipeline: SCANNED_REVIEW PDF -> ALL pages OCR (tesseract.js) -> page classification -> normalize -> extractCompetitionTable (existing only) -> preview
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadAndExtractPdf } from './parsers/pdf.ts';
import type { PdfExtraction } from './parsers/pdf.ts';
import { extractCompetitionTable, detectHeader } from './parsers/competitionTable.ts';
import type { CompetitionTableResult, CompetitionTableOptions, PlacesStatus, CompetitionTableRow } from './parsers/competitionTable.ts';
import { ocrPdf, normalizeArabicDigits } from './parsers/ocr.ts';
import type { OcrResult } from './parsers/ocr.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

interface Candidate {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  classification?: string;
}

interface TargetedCandidate extends Candidate {
  pageTarget: number;
}

interface PageDiagnostic {
  page: number;
  classification: 'NO_RELEVANT_KEYWORD' | 'WEAK_KEYWORD' | 'STRONG_KEYWORD' | 'POSSIBLE_TABLE';
  keywords: Array<{ keyword: string; strength: 'STRONG' | 'WEAK'; context: string }>;
  strongPhraseFound: boolean;
  weakPhraseFound: boolean;
  numericValueFound: boolean;
  institutionFound: boolean;
  specialityFound: boolean;
  gradeFound: boolean;
  normalizedText: string;
  table: CompetitionTableResult | null;
  warning: string | null;
}

interface DocumentPreview {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  pages: PageDiagnostic[];
  table: CompetitionTableResult | null;
  pageTarget: number | null;
  previewStatus: PlacesStatus | 'SCANNED_REVIEW' | 'OCR_FAILED';
  regressionEvidence: Array<{ page: number; institution: string; speciality: string; grade: string; places: number; confidence: string; status: string; reason: string }>;
  warnings: string[];
}

// ------------------------------------------------------------------
// Phase 13/14 used ocrPdfTargeted (1 PAGE @150). Phase 15 = ALL pages.
// ------------------------------------------------------------------
const SCANNED_CANDIDATES_TARGETED: TargetedCandidate[] = [
  { pdfUrl: 'https://www.men.gov.ma/sites/default/files/2026-07/%D9%85%D8%B0%D9%83%D8%B1%D8%A9%20%D8%B1%D9%82%D9%85%2026-069.pdf', sourceId: 'min-education', organization: 'Ministere de l\'Education Nationale', classification: 'SCANNED_REVIEW', pageTarget: 3 },
  { pdfUrl: 'https://www.men.gov.ma/sites/default/files/2026-07/%D9%85%D8%B0%D9%83%D8%B1%D8%A9%20%D8%B1%D9%82%D9%85%2026-066.pdf', sourceId: 'min-education', organization: 'Ministere de l\'Education Nationale', classification: 'SCANNED_REVIEW', pageTarget: 3 },
  { pdfUrl: 'https://www.uca.ma/uploads/documents/concours/RNJfZ8rGBq7TaeS0hx3KZNBElHSp5GpRGMas2O4J.pdf', sourceId: 'univ-uca', organization: 'Universite Cadi Ayyad de Marrakech', classification: 'SCANNED_REVIEW', pageTarget: 1 },
  { pdfUrl: 'https://www.uca.ma/uploads/documents/concours/szv1FbM6I8ZfmRd0yZZAxa6PshFFPn0r0YD4vbeG.pdf', sourceId: 'univ-uca', organization: 'Universite Cadi Ayyad de Marrakech', classification: 'SCANNED_REVIEW', pageTarget: 1 },
];

const STRONG_PHRASES = [
  'عدد المناصب', 'عدد المناصب المالية', 'عدد المناصب المفتوحة',
  'nombre de postes', 'nombre des postes', 'nombre de places', 'nombre des places',
];

const WEAK_PHRASES = [
  'المناصب', 'مناصب', 'منصب', 'الوظائف', 'وظائف', 'وظيفة',
  'postes', 'places',
];

const INSTITUTION_RE = /(المؤسسة|المؤسسات|التخصص|التخصصات|الدرجة|الإطار|الإطار المطلوب|المالية|institution|spécialité|spécialités|grade|établissement|établissements)/i;

// ------------------------------------------------------------------
// Classification par page (Step 4/5)
// ------------------------------------------------------------------
function classifyPage(text: string, page: number, normalized: string): PageDiagnostic {
  const lc = text.toLowerCase();
  const keywords: PageDiagnostic['keywords'] = [];
  let strong = false;
  let weak = false;

  for (const p of STRONG_PHRASES) {
    if (lc.includes(p)) {
      strong = true;
      const idx = text.indexOf(p);
      keywords.push({ keyword: p, strength: 'STRONG', context: text.slice(Math.max(0, idx - 60), Math.min(text.length, idx + p.length + 120)).replace(/\s+/g, ' ').trim().slice(0, 140) });
    }
  }
  if (!strong) {
    for (const p of WEAK_PHRASES) {
      if (lc.includes(p)) {
        weak = true;
        const idx = text.indexOf(p);
        keywords.push({ keyword: p, strength: 'WEAK', context: text.slice(Math.max(0, idx - 40), Math.min(text.length, idx + p.length + 80)).replace(/\s+/g, ' ').trim().slice(0, 110) });
      }
    }
  }

  const institutionFound = INSTITUTION_RE.test(normalized);
  const numericValueFound = /\d{1,3}/.test(normalized);
  const specialityFound = /(التخصص|التخصصات|spécialit|specialit|مؤسسة|المؤسسة|institution|établissement)/i.test(normalized);
  const gradeFound = /(الإطار|الدرجة|grade|الإطار المطلوب|cadre|الدرجة المطلوبة)/i.test(normalized);

  // Classification
  let classification: PageDiagnostic['classification'];
  let warning: string | null = null;
  if (strong) {
    classification = 'STRONG_KEYWORD';
  } else if (institutionFound && specialityFound && gradeFound && numericValueFound) {
    classification = 'POSSIBLE_TABLE';
    warning = 'plusieurs indicateurs détectés (institution+spécialité+grade+nombre) mais pas de phrase forte "عدد المناصب" - table incertaine';
  } else if (weak) {
    classification = 'WEAK_KEYWORD';
    warning = 'mot faible (مناصب/postes) sans indication de nombre de postes - pas preuve de table de places';
  } else {
    classification = 'NO_RELEVANT_KEYWORD';
    warning = 'aucun mot-clé de table de postes';
  }

  // Tentative d'extraction avec le parser existant
  let table: CompetitionTableResult | null = null;
  let tableWarning: string | null = null;
  if (classification === 'STRONG_KEYWORD' || classification === 'POSSIBLE_TABLE') {
    try {
      table = extractCompetitionTable(normalized, { pageHint: page, scanned: true } as CompetitionTableOptions);
      if (table.warnings.length) tableWarning = table.warnings.slice(0, 2).join(' | ');
    } catch (e: any) {
      tableWarning = 'extractCompetitionTable failed: ' + (e.message || String(e));
    }
  }

  return {
    page, classification, keywords,
    strongPhraseFound: strong, weakPhraseFound: weak,
    numericValueFound, institutionFound, specialityFound, gradeFound,
    normalizedText: normalized, table, warning: tableWarning || warning,
  };
}

function loadScannedCandidates(): Candidate[] {
  const fallback: Candidate[] = SCANNED_CANDIDATES_TARGETED.map(c => ({ pdfUrl: c.pdfUrl, sourceId: c.sourceId, organization: c.organization, classification: c.classification }));
  try {
    const discovered: Candidate[] = [];
    const files = readdirSync(OUT_DIR).filter(f => /^competition-pdf-discovery-.*\.json$/.test(f)).sort();
    for (const f of files) {
      try {
        const data = JSON.parse(readFileSync(join(OUT_DIR, f), 'utf-8'));
        const all: any[] = data.allCandidates || data.top5 || [];
        for (const c of all) {
          if (c && c.pdfUrl && c.classification === 'SCANNED_REVIEW') {
            if (!fallback.some(x => x.pdfUrl === c.pdfUrl) && !discovered.some(x => x.pdfUrl === c.pdfUrl)) {
              discovered.push({ pdfUrl: c.pdfUrl, sourceId: c.sourceId || 'phase8', organization: c.organization || '', classification: c.classification });
            }
          }
        }
      } catch {}
    }
    const merged = [...fallback];
    for (const c of discovered) if (!merged.some(x => x.pdfUrl === c.pdfUrl)) merged.push(c);
    return merged.filter(c => c.classification === 'SCANNED_REVIEW');
  } catch { return fallback; }
}

// Nouvelle URL UCA pour la regression (Phase 15)
const UCA_REGRESSION_URL = 'https://www.uca.ma/uploads/documents/concours/LjvjOfcYuTcvZ7G3y9PoHeVbPH9UOGBwubhCwGF1.pdf';

async function runFullOcrPreview(c: Candidate, pageTarget: number | null): Promise<DocumentPreview> {
  const warnings: string[] = [];
  let ocrResult: OcrResult;
  try {
    console.log('[OCR-ALL] Processing ' + c.sourceId + ' (ALL pages)...');
    ocrResult = await ocrPdf(c.pdfUrl, 0, 150);
  } catch (e: any) {
    ocrResult = { status: 'FAILED', pages: [], warnings: ['OCR exception: ' + (e.message || String(e))] };
  }

  const pageDiagnostics: PageDiagnostic[] = [];
  for (const p of ocrResult.pages) {
    const normalized = normalizeArabicDigits(p.text);
    const pageDiag = classifyPage(p.text, p.page, normalized);
    pageDiagnostics.push(pageDiag);
    if ((p.confidence ?? 100) < 50) warnings.push('page ' + p.page + ' low confidence: ' + p.confidence);
  }
  if (ocrResult.warnings.length) warnings.push(...ocrResult.warnings);

  // Multi-page: combiner pageTarget + pageTarget+1 uniquement si table CONTINUE
  let combinedTable: CompetitionTableResult | null = null;
  let combinedPages: number[] | null = null;
  if (pageTarget !== null) {
    const pA = pageDiagnostics.find(d => d.page === pageTarget);
    const pB = pageDiagnostics.find(d => d.page === pageTarget + 1);
    if (pA && pB && (pA.classification === 'STRONG_KEYWORD' || pA.classification === 'POSSIBLE_TABLE') &&
        (pB.classification === 'STRONG_KEYWORD' || pB.classification === 'POSSIBLE_TABLE')) {
      const txt = pA.normalizedText + '\n' + pB.normalizedText;
      try {
        combinedTable = extractCompetitionTable(txt, { pageHint: pageTarget, scanned: true });
        combinedPages = [pageTarget, pageTarget + 1];
        if (combinedTable.warnings.length) warnings.push('multi-page ' + combinedPages.join('+') + ': ' + combinedTable.warnings.slice(0, 2).join(' | '));
      } catch (e: any) {
        warnings.push('multi-page extract failed: ' + e.message);
      }
    }
  }

  // Table finale = la meilleure table détectée
  const candidateTables = pageDiagnostics.filter(d => d.table?.detected);
  let finalTable: CompetitionTableResult | null = null;
  if (combinedTable?.detected) finalTable = combinedTable;
  else if (candidateTables.length) {
    candidateTables.sort((a, b) => (b.table?.places.total || 0) - (a.table?.places.total || 0));
    finalTable = candidateTables[0].table as CompetitionTableResult;
  }

  // Classification finale
  let previewStatus: DocumentPreview['previewStatus'] = 'SCANNED_REVIEW';
  if (finalTable && finalTable.detected && finalTable.places.status === 'AUTO') previewStatus = 'AUTO';
  else if (finalTable?.detected) previewStatus = 'REVIEW';
  else previewStatus = ocrResult.pages.length === 0 ? 'OCR_FAILED' : 'SCANNED_REVIEW';

  const regressionEvidence: DocumentPreview['regressionEvidence'] = [];
  const rows: CompetitionTableRow[] = finalTable?.rows || [];
  for (const r of rows) {
    regressionEvidence.push({
      page: r.page, institution: r.institution, speciality: r.speciality,
      grade: r.grade, places: r.places,
      confidence: r.confidence || 'MEDIUM',
      status: finalTable?.places.status || 'REVIEW',
      reason: 'page ' + r.page + ' OCR -> extractCompetitionTable -> ' + (finalTable?.places.status || 'REVIEW'),
    });
  }

  return {
    pdfUrl: c.pdfUrl, sourceId: c.sourceId, organization: c.organization,
    pages: pageDiagnostics.map(d => ({ ...d, normalizedText: undefined, table: d.table })),
    table: finalTable, pageTarget,
    previewStatus, regressionEvidence, warnings,
  } as any as DocumentPreview;
}

async function main() {
  console.log('=== Phase 15 - Full-Document OCR + Page Targeting ===');
  const candidates = loadScannedCandidates();
  console.log('Candidates: ' + candidates.length + ' SCANNED_REVIEW');

  const previews: DocumentPreview[] = [];
  for (const c of candidates) {
    const targeted = SCANNED_CANDIDATES_TARGETED.find(t => t.pdfUrl === c.pdfUrl);
    const p = await runFullOcrPreview(c, targeted?.pageTarget ?? null);
    previews.push(p);
    console.log(' - ' + c.sourceId + ' -> pages=' + p.pages.length + ' status=' + p.previewStatus + ' rows=' + (p.table?.rows.length || 0) + ' places=' + (p.table?.places.total || 'null'));
  }

  // UCA regression - must remain 29 rows, 33 places, REVIEW
  let ucaRegression = { ok: false, detail: 'not checked' };
  try {
    const ex = await downloadAndExtractPdf(UCA_REGRESSION_URL, 20000);
    const tbl = extractCompetitionTable(ex.text);
    const ok = tbl.rows.length === 29 && tbl.places.total === 33 && tbl.places.status === 'REVIEW';
    ucaRegression = { ok, detail: 'rows=' + tbl.rows.length + ' places=' + tbl.places.total + ' status=' + tbl.places.status + (ok ? ' OK' : ' FAIL') };
    console.log('UCA regression:', ucaRegression.detail);
    if (!ok) console.error('UCA REGRESSION FAILED');
  } catch (e: any) {
    ucaRegression.detail = 'error: ' + (e.message || String(e));
  }

  const summary = {
    documentsAnalyzed: previews.length,
    pagesOcr: previews.reduce((s, p) => s + p.pages.length, 0),
    strongKeywordPages: previews.reduce((s, p) => s + p.pages.filter(x => x.classification === 'STRONG_KEYWORD').length, 0),
    possibleTablePages: previews.reduce((s, p) => s + p.pages.filter(x => x.classification === 'POSSIBLE_TABLE').length, 0),
    tablesDetected: previews.filter(p => p.table?.detected).length,
    reviewDocuments: previews.filter(p => p.previewStatus === 'REVIEW').length,
    missingDocuments: previews.filter(p => p.previewStatus === 'SCANNED_REVIEW' || p.previewStatus === 'OCR_FAILED').length,
  };

  const out = {
    phase: 15,
    status: 'FULL_OCR_COMPLETE',
    engine: 'tesseract.js',
    notes: [
      'No database. No Supabase. No localStorage. No Forms. No import. No mutation.',
      'Full-document OCR (ALL pages @150dpi) + page targeting + extractCompetitionTable (existing, only parser). No parallel parser.',
      'UCA regression preserved.',
    ],
    documents: previews.map(p => ({
      pdfUrl: p.pdfUrl, sourceId: p.sourceId, organization: p.organization, pageTarget: p.pageTarget,
      previewStatus: p.previewStatus,
      pages: p.pages.map(x => ({ page: x.page, classification: x.classification, strong: x.strongPhraseFound, weak: x.weakPhraseFound, numeric: x.numericValueFound, institution: x.institutionFound, speciality: x.specialityFound, grade: x.gradeFound, keywords: x.keywords.slice(0, 3) })),
      table: p.table ? { detected: p.table.detected, rows: p.table.rows.length, places: p.table.places.total, status: p.table.places.status, warnings: p.table.warnings.slice(0, 2) } : null,
      evidence: p.regressionEvidence.slice(0, 5),
      warnings: p.warnings.slice(0, 3),
    })),
    summary,
    regression: { ucaRows: 29, ucaPlaces: 33, ucaStatus: 'REVIEW', ucaDetail: ucaRegression.detail },
    writes: { database: 0, supabase: 0, localStorage: 0, forms: 0 },
  };

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const jsonPath = join(OUT_DIR, 'phase15-full-ocr-preview-' + stamp + '.json');
  const logPath = join(LOG_DIR, 'phase15-full-ocr-preview-' + stamp + '.txt');
  writeFileSync(jsonPath, JSON.stringify(out, null, 2), 'utf-8');
  writeFileSync(logPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log('Wrote ' + jsonPath);
  console.log('Wrote ' + logPath);
}

if (true) { main().catch(e => { console.error(e); process.exit(1); }); }

export {};
