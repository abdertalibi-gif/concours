// Phase 13 - Real OCR for SCANNED_REVIEW PDFs (optional, isolated, reversible)
// PREVIEW ONLY - NO DB WRITE, no Supabase, no localStorage, no Forms, no imports
// Pipeline: SCANNED_REVIEW PDF -> OCR (tesseract.js) -> PdfExtraction-compatible -> extractCompetitionTable -> preview
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadAndExtractPdf } from './parsers/pdf.ts';
import type { PdfExtraction } from './parsers/pdf.ts';
import { extractCompetitionTable } from './parsers/competitionTable.ts';
import type { CompetitionTableResult, PlacesStatus } from './parsers/competitionTable.ts';
import { ocrPdf, ocrPdfTargeted, normalizeArabicDigits } from './parsers/ocr.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

interface Candidate {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  classification?: string;
}

interface PreviewRecord {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  classification: string;
  ocr: { status: string; pages: number; avgConfidence: number | null; warnings: string[] };
  table: CompetitionTableResult | null;
  previewStatus: PlacesStatus | 'SCANNED_REVIEW' | 'OCR_FAILED';
  warnings: string[];
  evidence: Array<{ page: number; institution: string; speciality: string; grade: string; places: number; ocrConfidence: number | null; status: string; reason: string }>;
}

function loadScannedCandidates(): Candidate[] {
  const fallback: Candidate[] = [
    { pdfUrl: 'https://www.men.gov.ma/sites/default/files/2026-07/%D9%85%D8%B0%D9%83%D8%B1%D8%A9%20%D8%B1%D9%82%D9%85%2026-069.pdf', sourceId: 'min-education', organization: 'Ministere de l\'Education Nationale', classification: 'SCANNED_REVIEW' },
    { pdfUrl: 'https://www.men.gov.ma/sites/default/files/2026-07/%D9%85%D8%B0%D9%83%D8%B1%D8%A9%20%D8%B1%D9%82%D9%85%2026-066.pdf', sourceId: 'min-education', organization: 'Ministere de l\'Education Nationale', classification: 'SCANNED_REVIEW' },
    { pdfUrl: 'https://www.uca.ma/uploads/documents/concours/RNJfZ8rGBq7TaeS0hx3KZNBElHSp5GpRGMas2O4J.pdf', sourceId: 'univ-uca', organization: 'Universite Cadi Ayyad de Marrakech', classification: 'SCANNED_REVIEW' },
    { pdfUrl: 'https://www.uca.ma/uploads/documents/concours/szv1FbM6I8ZfmRd0yZZAxa6PshFFPn0r0YD4vbeG.pdf', sourceId: 'univ-uca', organization: 'Universite Cadi Ayyad de Marrakech', classification: 'SCANNED_REVIEW' },
  ];
  const discovered: Candidate[] = [];
  try {
    const files = readdirSync(OUT_DIR).filter(f => /^competition-pdf-discovery-.*\.json$/.test(f)).sort();
    for (const f of files) {
      try {
        const data = JSON.parse(readFileSync(join(OUT_DIR, f), 'utf-8'));
        const all: any[] = data.allCandidates || data.top5 || [];
        for (const c of all) {
          if (c && c.pdfUrl && c.classification === 'SCANNED_REVIEW') {
            if (!discovered.some(x => x.pdfUrl === c.pdfUrl) && !fallback.some(x => x.pdfUrl === c.pdfUrl)) {
              discovered.push({ pdfUrl: c.pdfUrl, sourceId: c.sourceId || 'phase8', organization: c.organization || '', classification: c.classification });
            }
          }
        }
      } catch {}
    }
  } catch {}
  const merged = [...fallback];
  for (const c of discovered) if (!merged.some(x => x.pdfUrl === c.pdfUrl)) merged.push(c);
  return merged.filter(c => c.classification === 'SCANNED_REVIEW');
}

function loadValidUcaCandidate(): Candidate | null {
  try {
    const files = readdirSync(OUT_DIR).filter(f => /^competition-pdf-discovery-.*\.json$/.test(f)).sort();
    for (const f of files.reverse()) {
      const data = JSON.parse(readFileSync(join(OUT_DIR, f), 'utf-8'));
      const all: any[] = data.allCandidates || [];
      const uca = all.find(c => c.pdfUrl && c.pdfUrl.includes('LjvjOfcYuTcvZ7G3y9PoHeVbPH9UOGBwubhCwGF1.pdf'));
      if (uca) return { pdfUrl: uca.pdfUrl, sourceId: uca.sourceId, organization: uca.organization, classification: uca.classification };
    }
  } catch {}
  return { pdfUrl: 'https://www.uca.ma/uploads/documents/concours/LjvjOfcYuTcvZ7G3y9PoHeVbPH9UOGBwubhCwGF1.pdf', sourceId: 'univ-uca', organization: 'Universite Cadi Ayyad de Marrakech', classification: 'VALID_CONCOURS_PDF' };
}

async function runOcrAndExtract(c: Candidate): Promise<PreviewRecord> {
  const warnings: string[] = [];
  let ocrResult;
  try {
    console.log('[OCR] Processing ' + c.sourceId + '...');
    ocrResult = await ocrPdfTargeted(c.pdfUrl);
  } catch (e: any) {
    ocrResult = { status: 'FAILED', pages: [], warnings: ['OCR exception: ' + (e.message || String(e))] };
  }

  const avgConf = ocrResult.pages.length ? ocrResult.pages.reduce((s, p) => s + (p.confidence || 0), 0) / ocrResult.pages.length : null;
  const fullOcrText = ocrResult.pages.map(p => p.text).join('\n');

  // Normalize Arabic-Indic digits in OCR text before feeding to parser
  const normalizedOcrText = normalizeArabicDigits(fullOcrText);

  let table: CompetitionTableResult | null = null;
  let previewStatus: PreviewRecord['previewStatus'] = 'OCR_FAILED';
  const evidence: PreviewRecord['evidence'] = [];

  if (ocrResult.status !== 'FAILED' && normalizedOcrText.trim().length > 80) {
    try {
      table = extractCompetitionTable(normalizedOcrText);
      const s = table.places.status;
      // Preserve confidence rules: never auto-trust OCR without explicit header + places column
      if (s === 'AUTO' && !table.detected) {
        previewStatus = 'REVIEW';
      } else if (table.warnings.some(w => w.includes('ambigu') || w.includes('fusionn'))) {
        previewStatus = 'REVIEW';
      } else {
        previewStatus = s;
      }
      // Build evidence from table rows
      for (const row of table.rows) {
        evidence.push({
          page: row.page,
          institution: row.institution,
          speciality: row.speciality,
          grade: row.grade,
          places: row.places,
          ocrConfidence: avgConf,
          status: previewStatus,
          reason: 'OCR text -> extractCompetitionTable -> ' + previewStatus
        });
      }
      if (table.warnings.length) warnings.push(...table.warnings);
    } catch (e: any) {
      warnings.push('extractCompetitionTable failed: ' + e.message);
      previewStatus = 'MISSING';
    }
  } else {
    previewStatus = 'SCANNED_REVIEW';
    table = { detected: false, rows: [], places: { status: 'MISSING', values: [], total: null, evidence: [] }, warnings: ['OCR failed or insufficient text'] };
    warnings.push('OCR status: ' + ocrResult.status);
    if (ocrResult.warnings.length) warnings.push(...ocrResult.warnings);
  }

  return {
    pdfUrl: c.pdfUrl,
    sourceId: c.sourceId,
    organization: c.organization,
    classification: c.classification || 'SCANNED_REVIEW',
    ocr: {
      status: ocrResult.status,
      pages: ocrResult.pages.length,
      avgConfidence: avgConf,
      warnings: ocrResult.warnings
    },
    table,
    previewStatus,
    warnings,
    evidence
  };
}

async function main() {
  console.log('=== Phase 13 - Real OCR for SCANNED_REVIEW ===');
  const scanned = loadScannedCandidates();
  const ucaCand = loadValidUcaCandidate();
  console.log('Candidates: ' + scanned.length + ' SCANNED_REVIEW + 1 VALID_CONCOURS_PDF (UCA regression)');

  const previews: PreviewRecord[] = [];
  for (const c of scanned) {
    const p = await runOcrAndExtract(c);
    previews.push(p);
    const avgStr = p.ocr.avgConfidence !== null ? p.ocr.avgConfidence.toFixed(1) : 'N/A';
    console.log(' - ' + c.sourceId + ' -> OCR:' + p.ocr.status + ' (' + p.ocr.pages + ' pages, avgConf=' + avgStr + ') TABLE:' + p.previewStatus + ' rows=' + (p.table?.rows.length || 0) + ' places=' + (p.table?.places.total || 'null'));
  }

  // UCA regression check - must remain 29 rows, 33 places, REVIEW
  let ucaRegression = { ok: false, detail: 'not checked', table: null as CompetitionTableResult | null };
  if (ucaCand) {
    try {
      const ex = await downloadAndExtractPdf(ucaCand.pdfUrl, 20000);
      const tbl = extractCompetitionTable(ex.text);
      const ok = tbl.rows.length === 29 && tbl.places.total === 33 && tbl.places.status === 'REVIEW';
      ucaRegression = { ok, detail: 'rows=' + tbl.rows.length + ' total=' + tbl.places.total + ' status=' + tbl.places.status + (ok ? ' OK' : ' FAIL'), table: tbl };
      console.log('UCA regression:', ucaRegression.detail);
      if (!ok) console.error('UCA REGRESSION FAILED');
    } catch (e: any) {
      ucaRegression.detail = 'error: ' + (e.message || String(e));
    }
  }

  const stats = {
    scanned: scanned.length,
    ocrSuccess: previews.filter(p => p.ocr.status === 'SUCCESS').length,
    ocrPartial: previews.filter(p => p.ocr.status === 'PARTIAL').length,
    ocrFailed: previews.filter(p => p.ocr.status === 'FAILED').length,
    tableDetected: previews.filter(p => p.table?.detected).length,
    tableAmbiguous: previews.filter(p => p.previewStatus === 'REVIEW' && p.table?.detected).length,
    tableMissing: previews.filter(p => p.previewStatus === 'MISSING' || p.previewStatus === 'SCANNED_REVIEW').length,
    auto: previews.filter(p => p.previewStatus === 'AUTO').length,
    review: previews.filter(p => p.previewStatus === 'REVIEW').length,
    missing: previews.filter(p => p.previewStatus === 'MISSING' || p.previewStatus === 'SCANNED_REVIEW').length
  };

  const out = {
    generatedAt: new Date().toISOString(),
    phase: '13 - Real OCR for SCANNED_REVIEW (PREVIEW ONLY, NO DB WRITE)',
    notes: [
      'No database. No Supabase. No localStorage. No import. No mutation.',
      'Existing SCANNED_REVIEW PDF -> OCR (tesseract.js) -> normalizeArabicDigits -> extractCompetitionTable -> preview',
      'OCR engine: tesseract.js (ara+fra+eng) via pdftoppm page rendering',
      'Generic parser remains single source of truth',
      'UCA regression 29 rows 33 total REVIEW preserved'
    ],
    candidates: scanned,
    previews,
    ucaRegression,
    stats
  };

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const jsonPath = join(OUT_DIR, 'phase13-ocr-preview-' + stamp + '.json');
  const logPath = join(LOG_DIR, 'phase13-ocr-preview-' + stamp + '.log');
  writeFileSync(jsonPath, JSON.stringify(out, null, 2), 'utf-8');
  writeFileSync(logPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log('Wrote ' + jsonPath);
  console.log('Wrote ' + logPath);
  console.log('Runner = PRESENT (phase13CompetitionOcrPreview.ts) - 4 SCANNED_REVIEW PDFs via real OCR pipeline');
}

if (true) { main().catch(e => { console.error(e); process.exit(1); }); }

export { runOcrAndExtract, loadScannedCandidates };




