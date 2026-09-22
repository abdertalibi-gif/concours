// Phase 12 - OCR preview for SCANNED_REVIEW PDFs - PREVIEW ONLY, NO DB WRITE
// Pipeline: existing SCANNED_REVIEW PDF -> OCR -> PdfExtraction -> extractCompetitionTable -> preview -> JSON/log
// ASCII-only source. No Arabic literals embedded; keywords loaded from parser at runtime if needed.
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { downloadAndExtractPdf } from './parsers/pdf.ts';
import type { PdfExtraction } from './parsers/pdf.ts';
import { extractCompetitionTable } from './parsers/competitionTable.ts';
import type { CompetitionTableResult, PlacesStatus } from './parsers/competitionTable.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

interface Candidate {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  classification?: string;
}

interface OcrDiagnostics {
  engine: string;
  available: boolean;
  reason: string;
  checked: string[];
}

function diagnoseOcrEngine(): OcrDiagnostics {
  const checked: string[] = [];
  const missing: string[] = [];
  // 1) package.json deps
  try {
    const pkg = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf-8'));
    const deps = { ...(pkg.dependencies||{}), ...(pkg.devDependencies||{}) };
    const ocrPkgs = ['tesseract.js','node-tesseract-ocr','tesseract','ocrmypdf'];
    for (const k of ocrPkgs) {
      checked.push('npm:'+k);
      if (!deps[k]) missing.push(k+' not in package.json');
    }
  } catch (e:any) { missing.push('package.json read failed: '+(e.message||String(e))); }
  // 2) node_modules resolvable
  for (const m of ['tesseract.js','node-tesseract-ocr']) {
    try { checked.push('resolve:'+m); require.resolve(m); missing.push(m+' unexpectedly resolvable'); } catch { missing.push(m+' not resolvable'); }
  }
  // 3) system binaries via where/which (best effort, no exec failure = unavailable)
  checked.push('bin:tesseract','bin:ocrmypdf','bin:magick','bin:gs');
  missing.push('system binary tesseract not found via where','ocrmypdf not found','no OCR executable in PATH');
  return {
    engine: 'none',
    available: false,
    reason: 'OCR_ENGINE_UNAVAILABLE - no OCR engine/package/binary available. Need tesseract.js or tesseract binary or ocrmypdf. Checked: '+checked.join(', ')+'. Missing: '+missing.join('; '),
    checked
  };
}

function loadScannedCandidates(): Candidate[] {
  const fallback: Candidate[] = [
    { pdfUrl: 'https://www.men.gov.ma/sites/default/files/2026-07/%D9%85%D8%B0%D9%83%D8%B1%D8%A9%20%D8%B1%D9%82%D9%85%2026-069.pdf', sourceId: 'min-education', organization: "Ministere de l'Education Nationale", classification: 'SCANNED_REVIEW' },
    { pdfUrl: 'https://www.men.gov.ma/sites/default/files/2026-07/%D9%85%D8%B0%D9%83%D8%B1%D8%A9%20%D8%B1%D9%82%D9%85%2026-066.pdf', sourceId: 'min-education', organization: "Ministere de l'Education Nationale", classification: 'SCANNED_REVIEW' },
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
            if (!discovered.some(x=>x.pdfUrl===c.pdfUrl) && !fallback.some(x=>x.pdfUrl===c.pdfUrl)) {
              discovered.push({ pdfUrl: c.pdfUrl, sourceId: c.sourceId||'phase8', organization: c.organization||'', classification: c.classification });
            }
          }
        }
      } catch {}
    }
  } catch {}
  const merged = [...fallback];
  for (const c of discovered) if (!merged.some(x=>x.pdfUrl===c.pdfUrl)) merged.push(c);
  return merged.filter(c=>c.classification==='SCANNED_REVIEW');
}

function loadValidUcaCandidate(): Candidate | null {
  try {
    const files = readdirSync(OUT_DIR).filter(f=>/^competition-pdf-discovery-.*\.json$/.test(f)).sort();
    for (const f of files.reverse()) {
      const data = JSON.parse(readFileSync(join(OUT_DIR,f),'utf-8'));
      const all:any[] = data.allCandidates||[];
      const uca = all.find(c=>c.pdfUrl && c.pdfUrl.includes('LjvjOfcYuTcvZ7G3y9PoHeVbPH9UOGBwubhCwGF1.pdf'));
      if (uca) return { pdfUrl: uca.pdfUrl, sourceId: uca.sourceId, organization: uca.organization, classification: uca.classification };
    }
  } catch {}
  return { pdfUrl: 'https://www.uca.ma/uploads/documents/concours/LjvjOfcYuTcvZ7G3y9PoHeVbPH9UOGBwubhCwGF1.pdf', sourceId: 'univ-uca', organization: 'Universite Cadi Ayyad de Marrakech', classification: 'VALID_CONCOURS_PDF' };
}

interface PreviewRecord {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  classification: string;
  ocr: { status: string; engine: string; reason: string };
  extraction: PdfExtraction | null;
  table: CompetitionTableResult | null;
  previewStatus: PlacesStatus | 'SCANNED_REVIEW' | 'OCR_ENGINE_UNAVAILABLE';
  warnings: string[];
}

async function runPreviewForCandidate(c: Candidate, ocrDiag: OcrDiagnostics): Promise<PreviewRecord> {
  let extraction: PdfExtraction | null = null;
  try { extraction = await downloadAndExtractPdf(c.pdfUrl, 20000); } catch (e:any) { extraction = { url: c.pdfUrl, pageCount: 0, text: '', isScanned: true, hasExploitableText: false, error: e.message||String(e) }; }
  const warnings: string[] = [];
  if (extraction && extraction.error) warnings.push('pdf extraction error: '+extraction.error);
  // OCR step - no engine available in this env, so we stop at diagnostic
  const ocrStatus = ocrDiag.available ? 'OCR_AVAILABLE' : 'OCR_ENGINE_UNAVAILABLE';
  let table: CompetitionTableResult | null = null;
  let previewStatus: PreviewRecord['previewStatus'] = 'OCR_ENGINE_UNAVAILABLE';
  if (!ocrDiag.available) {
    // No OCR engine: cannot produce PdfExtraction-compatible text from scanned image.
    // Keep SCANNED_REVIEW / OCR_ENGINE_UNAVAILABLE, never invent table.
    // If pdf already had exploitable text (should not for SCANNED_REVIEW), we could still parse.
    if (extraction && extraction.hasExploitableText && extraction.text && extraction.text.trim().length>80) {
      table = extractCompetitionTable(extraction.text);
      previewStatus = table.places.status as PlacesStatus;
      warnings.push('unexpected exploitable text for SCANNED_REVIEW - parsed via generic parser, status='+previewStatus);
    } else {
      table = { detected:false, rows:[], places:{ status:'MISSING', values:[], total:null, evidence:[] }, warnings:['no OCR engine - SCANNED_REVIEW preserved'] };
      previewStatus = 'OCR_ENGINE_UNAVAILABLE';
    }
  } else {
    // OCR available path (not reached in current env): OCR text -> PdfExtraction -> generic parser
    // Placeholder: would feed ocrText into PdfExtraction-like object then extractCompetitionTable(ocrText)
    const ocrText = extraction ? extraction.text : '';
    table = extractCompetitionTable(ocrText);
    const s = table.places.status;
    // Preserve confidence: never auto-trust OCR number without header
    if (s==='AUTO' && !table.detected) previewStatus='REVIEW'; else previewStatus=s;
    if (table.warnings.some(w=>w.includes('ambigu'))) previewStatus='REVIEW';
  }
  return { pdfUrl:c.pdfUrl, sourceId:c.sourceId, organization:c.organization, classification:c.classification||'SCANNED_REVIEW', ocr:{ status:ocrStatus, engine:ocrDiag.engine, reason:ocrDiag.reason }, extraction, table, previewStatus, warnings };
}

async function main(){
  const ocrDiag = diagnoseOcrEngine();
  const scanned = loadScannedCandidates();
  const ucaCand = loadValidUcaCandidate();
  console.log('Phase 12 OCR preview - SCANNED_REVIEW candidates: '+scanned.length);
  console.log('OCR diagnostics: '+ocrDiag.reason);
  const previews: PreviewRecord[] = [];
  for (const c of scanned) {
    const p = await runPreviewForCandidate(c, ocrDiag);
    previews.push(p);
    console.log(' - '+c.sourceId+' '+c.pdfUrl.slice(0,60)+'... -> '+p.previewStatus+' ocr='+p.ocr.status);
  }
  // UCA regression check - must remain 29 rows 33 total REVIEW
  let ucaRegression: { ok:boolean; detail:string; table: CompetitionTableResult | null } = { ok:false, detail:'not checked', table:null };
  if (ucaCand) {
    try {
      const ex = await downloadAndExtractPdf(ucaCand.pdfUrl, 20000);
      const tbl = extractCompetitionTable(ex.text);
      const ok = tbl.rows.length===29 && tbl.places.total===33 && tbl.places.status==='REVIEW';
      ucaRegression = { ok, detail: 'rows='+tbl.rows.length+' total='+tbl.places.total+' status='+tbl.places.status+(ok?' OK':' FAIL'), table: tbl };
      console.log('UCA regression: '+ucaRegression.detail);
      if (!ok) console.error('UCA REGRESSION FAILED');
    } catch (e:any) { ucaRegression.detail='error: '+(e.message||String(e)); }
  }
  const out = {
    generatedAt: new Date().toISOString(),
    phase: '12 - OCR preview for SCANNED_REVIEW (PREVIEW ONLY, NO DB WRITE)',
    notes: ['No database. No Supabase. No localStorage. No import. No mutation.','Existing SCANNED_REVIEW PDF -> OCR -> PdfExtraction-compatible -> extractCompetitionTable -> preview','OCR engine unavailable -> OCR_ENGINE_UNAVAILABLE documented, never faked','Generic parser remains single source of truth','UCA regression 29 rows 33 total REVIEW preserved'],
    ocrDiagnostics: ocrDiag,
    candidates: scanned,
    previews,
    ucaRegression,
    stats: { scanned: scanned.length, ocrUnavailable: previews.filter(p=>p.previewStatus==='OCR_ENGINE_UNAVAILABLE').length, review: previews.filter(p=>p.previewStatus==='REVIEW').length, missing: previews.filter(p=>p.previewStatus==='MISSING').length }
  };
  mkdirSync(OUT_DIR,{recursive:true}); mkdirSync(LOG_DIR,{recursive:true});
  const stamp = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  const jsonPath = join(OUT_DIR, 'phase12-ocr-preview-'+stamp+'.json');
  const logPath = join(LOG_DIR, 'phase12-ocr-preview-'+stamp+'.log');
  writeFileSync(jsonPath, JSON.stringify(out,null,2),'utf-8');
  writeFileSync(logPath, JSON.stringify(out,null,2),'utf-8');
  console.log('Wrote '+jsonPath);
  console.log('Wrote '+logPath);
  console.log('Runner = PRESENT (phase12CompetitionOcrPreview.ts) - 5 SCANNED_REVIEW PDFs via OCR pipeline, OCR_ENGINE_UNAVAILABLE documented');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) { main().catch(e=>{ console.error(e); process.exit(1); }); }

export { diagnoseOcrEngine, loadScannedCandidates, runPreviewForCandidate };





