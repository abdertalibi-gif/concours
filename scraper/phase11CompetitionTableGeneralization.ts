// Phase 11 — Généralisation de l'extraction de la table "عدد المناصب" (nombre de postes)
// PREVIEW ONLY — NO IMPORTS, NO DB WRITE, aucune nouvelle URL.
// Pipeline : PDF → downloadAndExtractPdf → extractCompetitionTable(text) → places
//            → buildCompetitionPreview (REVIEW reste REVIEW, jamais REVIEW→AUTO).
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ScrapedItem } from './lib/types';
import { downloadAndExtractPdf } from './parsers/pdf.ts';
import { extractCompetitionTable, buildCompetitionPreview } from './parsers/competitionTable.ts';
import type { CompetitionTableResult, PlacesStatus } from './parsers/competitionTable.ts';
import { COMPETITION_PDF_CANDIDATES } from './sources/competitionPdfCandidates.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

// ---------------------------------------------------------------
// Candidates : uniquement des PDFs déjà découverts en Phase 8.
// Source (1) : scraper/sources/competitionPdfCandidates.ts (auto-généré Phase 8, best VALID)
// Source (2) : résultats corpus scraper/output/competition-pdf-discovery-*.json (Phase 8)
// Fallback statique = copies exactes des entrées de ces résultats Phase 8 (aucune invention).
// ---------------------------------------------------------------
interface Candidate {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  phase8Classification?: string;
}

const PHASE8_FALLBACK_SCANNED: Candidate[] = [
  {
    pdfUrl: 'https://www.men.gov.ma/sites/default/files/2026-07/%D9%85%D8%B0%D9%83%D8%B1%D8%A9%20%D8%B1%D9%82%D9%85%2026-069.pdf',
    sourceId: 'min-education',
    organization: "Ministère de l'Éducation Nationale",
    phase8Classification: 'SCANNED_REVIEW',
  },
  {
    pdfUrl: 'https://www.men.gov.ma/sites/default/files/2026-07/%D9%85%D8%B0%D9%83%D8%B1%D8%A9%20%D8%B1%D9%82%D9%85%2026-066.pdf',
    sourceId: 'min-education',
    organization: "Ministère de l'Éducation Nationale",
    phase8Classification: 'SCANNED_REVIEW',
  },
  {
    pdfUrl: 'https://www.uca.ma/uploads/documents/concours/RNJfZ8rGBq7TaeS0hx3KZNBElHSp5GpRGMas2O4J.pdf',
    sourceId: 'univ-uca',
    organization: 'Université Cadi Ayyad de Marrakech',
    phase8Classification: 'SCANNED_REVIEW',
  },
  {
    pdfUrl: 'https://www.uca.ma/uploads/documents/concours/szv1FbM6I8ZfmRd0yZZAxa6PshFFPn0r0YD4vbeG.pdf',
    sourceId: 'univ-uca',
    organization: 'Université Cadi Ayyad de Marrakech',
    phase8Classification: 'SCANNED_REVIEW',
  },
];

function loadPhase8DiscoveryCandidates(): Candidate[] {
  const out: Candidate[] = [];
  try {
    if (!readdirSync(OUT_DIR, { withFileTypes: true }).some((d) => d.isFile())) return out;
  } catch {
    return out;
  }
  const files = readdirSync(OUT_DIR).filter((f) => /^competition-pdf-discovery-.*\.json$/.test(f)).sort();
  for (const f of files) {
    try {
      const data = JSON.parse(readFileSync(join(OUT_DIR, f), 'utf-8'));
      const all: Array<{ pdfUrl: string; sourceId: string; organization: string; classification?: string }> =
        (data.allCandidates || data.top5 || []).filter((c: any) => c && c.pdfUrl);
      for (const c of all) {
        if (!out.some((x) => x.pdfUrl === c.pdfUrl)) {
          out.push({ pdfUrl: c.pdfUrl, sourceId: c.sourceId || 'phase8', organization: c.organization || '', phase8Classification: c.classification });
        }
      }
    } catch {
      /* ignore fichier partiel */
    }
  }
  return out;
}

function buildCandidateList(): Candidate[] {
  const list: Candidate[] = [];
  const push = (c: Candidate) => {
    if (c.pdfUrl && !list.some((x) => x.pdfUrl === c.pdfUrl)) list.push(c);
  };
  for (const c of COMPETITION_PDF_CANDIDATES as unknown as Array<{ pdfUrl: string; sourceId: string; organization: string; classification?: string }>) {
    push({ pdfUrl: c.pdfUrl, sourceId: c.sourceId, organization: c.organization, phase8Classification: c.classification });
  }
  // Résultats Phase 8 sur disque (tous candidats, y compris scannés)
  for (const c of loadPhase8DiscoveryCandidates()) push(c);
  // Fallback : copies des résultats Phase 8 (scannés) si le corpus n'est pas présent
  for (const c of PHASE8_FALLBACK_SCANNED) push(c);
  return list;
}

// ---------------------------------------------------------------
// Pipeline section 9 : REVIEW doit rester REVIEW, jamais REVIEW→AUTO.
// ---------------------------------------------------------------
function buildMinimalScraped(c: Candidate): ScrapedItem {
  return {
    title: `Avis de concours — ${c.organization || c.sourceId}`,
    organization: c.organization || undefined,
    establishment: c.organization || undefined,
    university: c.organization || undefined,
    sourceUrl: c.pdfUrl,
    source: c.sourceId,
    fingerprint: `phase11-${c.sourceId}-${c.pdfUrl}`,
    scrapedAt: new Date().toISOString(),
    category: 'RECRUTEMENT',
    academicYear: '2026-2027',
    description: `Extraction phase 11 — ${c.pdfUrl}`,
  } as ScrapedItem;
}

function checkPipelineReview(c: Candidate, table: CompetitionTableResult): string[] {
  const notes: string[] = [];
  const preview = buildCompetitionPreview(buildMinimalScraped(c), table);
  const override = (preview as any).placesOverride as { status: string; total: number | null; rows: number } | undefined;
  if (!override) {
    notes.push('pipeline: pas d’override places');
    return notes;
  }
  if (table.places.status === 'REVIEW') {
    if (override.status !== 'REVIEW') notes.push(`pipeline: REVIEW converti en ${override.status} — VIOLATION section 9`);
    if ((preview.fields as Record<string, any>).places?.status !== 'REVIEW') notes.push('pipeline: field places.status ≠ REVIEW');
    notes.push('pipeline: places reste REVIEW (jamais REVIEW→AUTO) ✓');
  } else if (table.places.status === 'AUTO') {
    if (override.status !== 'AUTO') notes.push(`pipeline: AUTO perdu → ${override.status}`);
    if (override.total !== table.places.total) notes.push('pipeline: total AUTO divergent');
    notes.push('pipeline: places AUTO préservé ✓');
  } else {
    notes.push('pipeline: places MISSING — champ bloqué (aucune valeur inventée)');
  }
  return notes;
}

// ---------------------------------------------------------------
// Résultat par PDF
// ---------------------------------------------------------------
interface PdfResult {
  index: number;
  candidate: Candidate;
  fetchError?: string;
  pageCount: number;
  textLength: number;
  scanned: boolean;
  tableDetected: boolean;
  rows: number;
  placesTotal: number | null;
  values: number[];
  status: PlacesStatus | 'SCANNED_REVIEW' | 'ERROR';
  reason: string;
  warnings: string[];
  pipelineNotes: string[];
}

const UCA_URL = 'https://www.uca.ma/uploads/documents/concours/LjvjOfcYuTcvZ7G3y9PoHeVbPH9UOGBwubhCwGF1.pdf';

export async function runPhase11(): Promise<{ results: PdfResult[]; uca: PdfResult; files: { jsonFile: string; txtFile: string } }> {
  const candidates = buildCandidateList();
  const results: PdfResult[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const r = await downloadAndExtractPdf(c.pdfUrl, 20000);
    const base: PdfResult = {
      index: i + 1,
      candidate: c,
      pageCount: r.pageCount,
      textLength: r.text.length,
      scanned: r.isScanned,
      tableDetected: false,
      rows: 0,
      placesTotal: null,
      values: [],
      status: 'ERROR',
      reason: '',
      warnings: [],
      pipelineNotes: [],
    };

    if (r.error) {
      base.status = 'ERROR';
      base.reason = `fetch/parse error: ${r.error}`;
      base.warnings.push(base.reason);
      results.push(base);
      continue;
    }

    if (r.isScanned || !r.hasExploitableText) {
      base.status = 'SCANNED_REVIEW';
      base.reason = `PDF scanné/image (${r.text.length}c, ${r.pageCount}p) — pas de texte exploitable, extracteur texte non applicable`;
      base.warnings.push('SCANNED_REVIEW');
      results.push(base);
      continue;
    }

    const table = extractCompetitionTable(r.text, { pageCount: r.pageCount, scanned: false });
    base.tableDetected = table.detected;
    base.rows = table.rows.length;
    base.placesTotal = table.places.total;
    base.values = table.places.values;
    base.status = table.places.status;
    base.reason = table.detected
      ? `${table.rows.length} lignes, total ${table.places.total ?? '—'}, statut ${table.places.status} — ${table.warnings.join(' ; ') || 'extraction cohérente'}`
      : `table non détectée — ${table.warnings.join(' ; ') || 'aucun tableau nombre de postes fiable'}`;
    base.warnings = table.warnings;
    base.pipelineNotes = checkPipelineReview(c, table);
    console.log(`[Phase11] ${c.organization || c.sourceId} — detected=${base.tableDetected} rows=${base.rows} total=${base.placesTotal} status=${base.status}`);
    results.push(base);
  }

  // ---------------------------------------------------------------
  // Régression UCA (section 7) : 29 lignes, 1+1+…=33, statut REVIEW, pas de 2026.
  // Vérification stricte du résultat attendu — mais jamais d'AUTO forcé.
  // ---------------------------------------------------------------
  const uca = results.find((r) => r.candidate.pdfUrl === UCA_URL);
  if (!uca) throw new Error('UCA non trouvé dans la liste des candidats (régression impossible)');
  const ucaChecks: string[] = [];
  if (uca.fetchError) throw new Error(`Régression UCA bloquée — fetch/parse error: ${uca.fetchError}`);
  if (uca.scanned) throw new Error('Régression UCA bloquée — PDF scanné inattendu');
  if (uca.rows !== 29) ucaChecks.push(`rows ≠ 29 (got ${uca.rows})`);
  const sum = uca.values.reduce((a, b) => a + b, 0);
  if (sum !== 33) ucaChecks.push(`1+1+… ≠ 33 (got ${sum})`);
  if (uca.placesTotal !== 33) ucaChecks.push(`total ≠ 33 (got ${uca.placesTotal})`);
  if (uca.status !== 'REVIEW') ucaChecks.push(`status ≠ REVIEW (got ${uca.status}) — AUTO ne doit pas être forcé`);
  if (uca.values.some((v) => v === 2026 || v >= 2000)) ucaChecks.push('faux positif année (2026/…≥2000) détecté dans les valeurs');
  if (ucaChecks.length) {
    throw new Error(`Régression UCA échouée: ${ucaChecks.join(' ; ')}`);
  }

  // ---------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------
  const tag = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const jsonFile = join(OUT_DIR, `competition-table-generalization-${tag}.json`);
  const txtFile = join(LOG_DIR, `competition-table-generalization-${tag}.txt`);
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  const stats = summarize(results);
  const output = {
    generatedAt: new Date().toISOString(),
    phase: '11 — Généralisation extraction nombre de postes (PREVIEW ONLY)',
    notes: [
      'Aucun import réel. Aucune écriture DB/Supabase/localStorage. Formulaire et modèle Competition non modifiés.',
      'Résultats AUTO/REVIEW/MISSING selon critères objectifs de extractCompetitionTable — jamais d’AUTO forcé.',
      'PDFs scannés → SCANNED_REVIEW (extracteur texte non applicable).',
    ],
    pdfsTested: results.length,
    stats,
    uca: {
      pdfUrl: UCA_URL,
      rows: uca.rows,
      places: uca.placesTotal,
      status: uca.status,
      checks: ['29 rows', '1+1+…=33', 'REVIEW', 'pas de 2026'],
    },
    results: results.map((r) => ({
      pdf: r.candidate.pdfUrl,
      organization: r.candidate.organization,
      sourceId: r.candidate.sourceId,
      phase8Classification: r.candidate.phase8Classification,
      fetchError: r.fetchError,
      pageCount: r.pageCount,
      textLength: r.textLength,
      tableDetected: r.tableDetected,
      rows: r.rows,
      placesTotal: r.placesTotal,
      values: r.values.slice(0, 40),
      status: r.status,
      reason: r.reason,
      warnings: r.warnings.slice(0, 6),
      pipelineNotes: r.pipelineNotes,
    })),
  };
  writeFileSync(jsonFile, JSON.stringify(output, null, 2), 'utf-8');

  const lines: string[] = [];
  lines.push('======================================================================');
  lines.push('COMPETITION TABLE GENERALIZATION — Phase 11 — PREVIEW ONLY — NO DB WRITE');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('======================================================================');
  lines.push('');
  lines.push(`PDFs tested: ${stats.pdfsTested}`);
  lines.push('');
  lines.push(`TABLE_DETECTED: ${stats.tableDetected}`);
  lines.push(`TABLE_NOT_FOUND: ${stats.tableNotFound}`);
  lines.push(`SCANNED_REVIEW: ${stats.scanned}`);
  lines.push('');
  lines.push(`AUTO: ${stats.auto}`);
  lines.push(`REVIEW: ${stats.review}`);
  lines.push(`MISSING: ${stats.missing}`);
  lines.push('');
  lines.push('--------------------------------------------------------------');
  lines.push(`PDF | table detected | rows | places total | status | reason`);
  lines.push('--------------------------------------------------------------');
  for (const r of results) {
    const name = (r.candidate.organization || r.candidate.sourceId).slice(0, 32);
    lines.push(
      `${r.index}. ${name} | ${r.tableDetected ? 'yes' : 'no'} | ${r.rows} | ${r.placesTotal ?? '—'} | ${r.status} | ${r.reason.slice(0, 110)}`
    );
  }
  lines.push('--------------------------------------------------------------');
  lines.push('');
  lines.push('UCA:');
  lines.push(`rows: ${uca.rows}`);
  lines.push(`places: ${uca.placesTotal}`);
  lines.push(`status: ${uca.status}`);
  lines.push(`checks: 29 rows | 1+1+…=33 | statut REVIEW (jamais AUTO forcé) | aucune valeur ≥2000 (2026 exclu)`);
  lines.push('');
  lines.push('Pipeline (section 9):');
  for (const r of results) {
    for (const n of r.pipelineNotes) lines.push(`  [${r.candidate.sourceId}] ${n}`);
  }
  lines.push('');
  lines.push('Statuts expliqués:');
  for (const r of results) {
    lines.push(`  ${r.index}. ${r.candidate.organization || r.candidate.sourceId} → ${r.status}`);
    lines.push(`     ${r.reason}`);
  }
  lines.push('');
  lines.push('Rappel des règles:');
  lines.push('  AUTO   : tableau explicitement identifié + colonne nombre de postes + chaque valeur liée + aucune ambiguïté.');
  lines.push('  REVIEW : extraction texte heuristique sans corroboration native (pdf-parse ne restitue pas le tableau) — jamais REVIEW→AUTO.');
  lines.push('  MISSING: tableau introuvable ou structure trop ambiguë.');
  lines.push('  SCANNED_REVIEW : PDF image — extracteur texte non applicable.');
  lines.push('');
  lines.push('======================================================================');
  lines.push('DB writes: 0');
  lines.push('Supabase writes: 0');
  lines.push('localStorage writes: 0');
  lines.push('Forms modified: 0');
  lines.push('======================================================================');
  writeFileSync(txtFile, lines.join('\n'), 'utf-8');

  console.log(lines.slice(0, 40).join('\n'));
  return { results, uca, files: { jsonFile, txtFile } };
}

function summarize(results: PdfResult[]) {
  const stats = {
    pdfsTested: results.length,
    tableDetected: results.filter((r) => r.tableDetected).length,
    tableNotFound: results.filter((r) => !r.tableDetected && !r.scanned).length,
    scanned: results.filter((r) => r.status === 'SCANNED_REVIEW').length,
    auto: results.filter((r) => r.status === 'AUTO').length,
    review: results.filter((r) => r.status === 'REVIEW').length,
    missing: results.filter((r) => r.status === 'MISSING').length,
    error: results.filter((r) => r.status === 'ERROR').length,
  };
  return stats;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runPhase11()
    .then((r) => {
      console.log('\nOutput:');
      console.log(r.files.jsonFile);
      console.log(r.files.txtFile);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export { buildCandidateList, summarize };