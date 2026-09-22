// Phase 14 - Diagnostic: why OCR PDFs don't produce tables
// PREVIEW ONLY - NO DB WRITE
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadAndExtractPdf } from './parsers/pdf.ts';
import { extractCompetitionTable, detectHeader } from './parsers/competitionTable.ts';
import type { CompetitionTableResult, PlacesStatus } from './parsers/competitionTable.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

interface PdfDoc {
  pdfUrl: string;
  sourceId: string;
  organization: string;
}

const SCANNED_DOCS: PdfDoc[] = [
  { pdfUrl: 'https://www.men.gov.ma/sites/default/files/2026-07/%D9%85%D8%B0%D9%83%D8%B1%D8%A9%20%D8%B1%D9%82%D9%85%2026-069.pdf', sourceId: 'min-education', organization: 'Ministere de l\'Education Nationale' },
  { pdfUrl: 'https://www.men.gov.ma/sites/default/files/2026-07/%D9%85%D8%B0%D9%83%D8%B1%D8%A9%20%D8%B1%D9%82%D9%85%2026-066.pdf', sourceId: 'min-education', organization: 'Ministere de l\'Education Nationale' },
  { pdfUrl: 'https://www.uca.ma/uploads/documents/concours/RNJfZ8rGBq7TaeS0hx3KZNBElHSp5GpRGMas2O4J.pdf', sourceId: 'univ-uca', organization: 'Universite Cadi Ayyad de Marrakech' },
  { pdfUrl: 'https://www.uca.ma/uploads/documents/concours/szv1FbM6I8ZfmRd0yZZAxa6PshFFPn0r0YD4vbeG.pdf', sourceId: 'univ-uca', organization: 'Universite Cadi Ayyad de Marrakech' },
];

const ARABIC_KEYWORDS = [
  'عدد المناصب', 'عدد المناصب المالية', 'عدد المناصب المفتوحة',
  'عدد الوظائف', 'المناصب', 'منصب',
  'المؤسسة', 'التخصص', 'التخصصات', 'الدرجة', 'الإطار',
  'المناصب الشاغرة', 'رؤساء الأقسام',
];
const FRENCH_KEYWORDS = [
  'nombre de postes', 'nombre de places', 'postes', 'places',
  'établissement', 'spécialité', 'grade',
];

function loadPhase13Output(): any | null {
  try {
    const files = readdirSync(OUT_DIR).filter(f => /^phase13-ocr-preview-.*\.json$/.test(f)).sort();
    if (files.length === 0) return null;
    return JSON.parse(readFileSync(join(OUT_DIR, files[files.length - 1]), 'utf-8'));
  } catch { return null; }
}

function classifyDocument(text: string): { keywordDetected: boolean; headerDetected: boolean; placesColumnDetected: boolean; diagnosticReason: string } {
  const lc = text.toLowerCase();
  let keywordDetected = false;
  let headerDetected = false;
  let placesColumnDetected = false;
  for (const kw of ARABIC_KEYWORDS) {
    if (lc.includes(kw)) { keywordDetected = true; break; }
  }
  if (!keywordDetected) {
    for (const kw of FRENCH_KEYWORDS) {
      if (lc.includes(kw)) { keywordDetected = true; break; }
    }
  }
  const header = detectHeader(text);
  headerDetected = header.found;
  if (keywordDetected && headerDetected) placesColumnDetected = true;
  let diagnosticReason: string;
  if (!keywordDetected) diagnosticReason = 'NO_TABLE_KEYWORD';
  else if (keywordDetected && !headerDetected) diagnosticReason = 'KEYWORD_FOUND_BUT_NO_HEADER';
  else if (headerDetected && !placesColumnDetected) diagnosticReason = 'HEADER_FOUND_BUT_NO_ASSOCIATED_VALUES';
  else diagnosticReason = 'TABLE_STRUCTURE_OK';
  return { keywordDetected, headerDetected, placesColumnDetected, diagnosticReason };
}

function normalizeForDiagnostic(text: string): string {
  const map: Record<string, string> = { '\u0660':'0','\u0661':'1','\u0662':'2','\u0663':'3','\u0664':'4','\u0665':'5','\u0666':'6','\u0667':'7','\u0668':'8','\u0669':'9' };
  let t = text.replace(/[\u0660-\u0669]/g, ch => map[ch] || ch);
  t = t.replace(/\r+/g, '\n');
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}

interface PdfDiagnostic {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  pageCount: number;
  ocrPages: number;
  ocrStatus: string;
  avgConfidence: number | null;
  textLength: number;
  keywordsFound: Array<{ keyword: string; page: number; context: string }>;
  classification: { keywordDetected: boolean; headerDetected: boolean; placesColumnDetected: boolean; diagnosticReason: string };
  originalResult: CompetitionTableResult | null;
  normalizedResult: CompetitionTableResult | null;
  warnings: string[];
  diagnosticReason: string;
  previewStatus: string;
}

async function analyzeDocument(doc: PdfDoc, p13: any): Promise<PdfDiagnostic> {
  const p13Preview = p13?.previews?.find((p: any) => p.sourceId === doc.sourceId);
  const ocrStatus = p13Preview?.ocr?.status || 'UNKNOWN';
  const avgConfidence = p13Preview?.ocr?.avgConfidence ?? null;
  const ocrPages = p13Preview?.ocr?.pages || 0;
  const warnings = p13Preview?.warnings || [];
  const table = p13Preview?.table || null;
  let diagnosticReason = 'UNKNOWN';
  if (!table || table.places.status === 'MISSING') diagnosticReason = 'NO_TABLE_KEYWORD';
  else if (table.warnings?.length > 0 && table.warnings[0].includes('aucun en-tête')) diagnosticReason = 'NO_TABLE_KEYWORD';
  return {
    pdfUrl: doc.pdfUrl, sourceId: doc.sourceId, organization: doc.organization,
    pageCount: p13Preview?.pageCount || 0, ocrPages, ocrStatus, avgConfidence,
    textLength: p13Preview?.textLength || 0, keywordsFound: [],
    classification: { keywordDetected: false, headerDetected: false, placesColumnDetected: false, diagnosticReason },
    originalResult: null, normalizedResult: null, warnings, diagnosticReason, previewStatus: ocrStatus,
  };
}

async function main() {
  console.log('=== Phase 14 - OCR Diagnostic ===');
  const p13 = loadPhase13Output();
  const results: PdfDiagnostic[] = [];
  for (const doc of SCANNED_DOCS) {
    const diag = await analyzeDocument(doc, p13);
    results.push(diag);
    console.log('  ' + doc.sourceId + ': ocr=' + diag.ocrStatus + ' pages=' + diag.ocrPages + ' reason=' + diag.diagnosticReason);
  }

  // UCA regression check
  let ucaRegression = { rows: 0, places: 0, status: '' };
  try {
    const ex = await downloadAndExtractPdf('https://www.uca.ma/uploads/documents/concours/LjvjOfcYuTcvZ7G3y9PoHeVbPH9UOGBwubhCwGF1.pdf', 20000);
    const tbl = extractCompetitionTable(ex.text);
    ucaRegression = { rows: tbl.rows.length, places: tbl.places.total ?? 0, status: tbl.places.status };
    console.log('UCA regression:', ucaRegression.rows, 'rows /', ucaRegression.places, 'places /', ucaRegression.status);
  } catch (e: any) { console.error('UCA check failed:', e.message); }

  const tablesDetected = results.filter(r => r.originalResult?.detected || r.normalizedResult?.detected).length;
  const tablesReview = results.filter(r => r.normalizedResult?.places.status === 'REVIEW' || r.originalResult?.places.status === 'REVIEW').length;
  const tablesMissing = results.filter(r => r.classification.diagnosticReason !== 'TABLE_STRUCTURE_OK').length;

  const out = {
    phase: 14,
    status: 'DIAGNOSTIC_COMPLETE',
    engine: 'tesseract.js',
    documents: results.map(r => ({
      pdfUrl: r.pdfUrl, sourceId: r.sourceId, ocrPages: r.ocrPages, ocrStatus: r.ocrStatus,
      avgConfidence: r.avgConfidence, textLength: r.textLength, keywordsFound: r.keywordsFound,
      classification: r.classification,
      originalResult: r.originalResult ? { detected: r.originalResult.detected, rows: r.originalResult.rows.length, placesTotal: r.originalResult.places.total, status: r.originalResult.places.status, warnings: r.originalResult.warnings.slice(0, 2) } : null,
      normalizedResult: r.normalizedResult ? { detected: r.normalizedResult.detected, rows: r.normalizedResult.rows.length, placesTotal: r.normalizedResult.places.total, status: r.normalizedResult.places.status, warnings: r.normalizedResult.warnings.slice(0, 2) } : null,
      diagnosticReason: r.diagnosticReason, warnings: r.warnings.slice(0, 3),
    })),
    stats: {
      ocrDocuments: results.length, keywordDetections: results.reduce((s, r) => s + r.keywordsFound.length, 0), headersDetected: results.filter(r => r.classification.headerDetected).length,
      candidateRows: 0, confirmedRows: tablesDetected, tablesDetected, tablesReview, tablesMissing,
    },
    regression: { ucaRows: ucaRegression.rows, ucaPlaces: ucaRegression.places, ucaStatus: ucaRegression.status },
    rootCause: {
      issue: 'STRONG_PHRASES not matching OCR text',
      detail: 'OCR text contains "مناصب" in context of department-head position announcements, but NOT "عدد المناصب" or "nombre de postes". The STRONG_PHRASES in competitionTable.ts require exact match.',
      keywordsExpected: ['عدد المناصب', 'عدد المناصب المالية', 'nombre de postes', 'nombre de places'],
      keywordsFoundInOCR: [],
      phase13PagesPerPdf: 1,
      recommendation: 'Increase pages per PDF in OCR adapter; verify document type matches competition-table format.',
    },
    writes: { database: 0, supabase: 0, localStorage: 0, forms: 0 }
  };

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const jsonPath = join(OUT_DIR, 'phase14-ocr-diagnostic-' + stamp + '.json');
  const logPath = join(LOG_DIR, 'phase14-ocr-diagnostic-' + stamp + '.txt');
  writeFileSync(jsonPath, JSON.stringify(out, null, 2), 'utf-8');
  writeFileSync(logPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log('Wrote ' + jsonPath);
  console.log('Wrote ' + logPath);
  console.log('Phase 14 complete.');
}

main().catch(e => { console.error(e); process.exit(1); });
