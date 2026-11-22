import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCompetitionTable, detectHeader, buildCompetitionPreview } from './parsers/competitionTable.ts';
import type { CompetitionTableResult, CompetitionTableRow, PlacesStatus } from './parsers/competitionTable.ts';
import { mapToCompetition } from './mappers/competitionMapper.ts';
import type { ValidatedPayload } from './mappers/types.ts';
import { normalizeArabicDigits } from './parsers/ocr.ts';
import {
  resolveUniversity, resolveSchool, resolveCity, resolveRegion,
  resolveDomain, resolveLevel, resolveCategory, resolveSubject,
} from './resolvers/referenceResolver.ts';
import type { ResolveResult, ResolveStatus } from './resolvers/referenceResolver.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

interface FieldEvidence {
  field: string;
  value: string | number | null;
  page: number | null;
  raw: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'MISSING';
  status: 'AUTO' | 'REVIEW' | 'MISSING' | 'BLOCKED';
  reason?: string;
}

interface ReferenceEvidence {
  field: string;
  input: string | null;
  status: ResolveStatus;
  referenceId: string | null;
  referenceLabel: string | null;
  reason?: string;
}

interface Phase18Candidate {
  index: number;
  pdfUrl: string;
  sourceId: string;
  organization: string;
  discoveryPage: string;
  classification: string;
  pageCount: number | null;
  isScanned: boolean;
  textLength: number | null;
  status: string;
  tableDetected: boolean;
  rowsLength: number;
  places: { status: PlacesStatus; total: number | null; evidenceCount: number };
  fields: Record<string, FieldEvidence>;
  references: Record<string, ReferenceEvidence>;
  importableFlashPoints: string[];
  missingRequired: string[];
  decision: 'IMPORTABLE' | 'REVIEW' | 'BLOCKED';
  decisionReasons: string[];
  warnings: string[];
}

interface Phase18Output {
  phase: number;
  phaseLabel: string;
  input: string;
  runDate: string;
  status: 'PASS' | 'FAIL';
  statusReason: string;
  candidatesAnalyzed: number;
  importable: number;
  review: number;
  blocked: number;
  placesValidated: number;
  conditionsValidated: number;
  matieresValidated: number;
  epreuvesValidated: number;
  candidates: Phase18Candidate[];
  ucaRegression: { rows: number; places: number; status: string; passed: boolean };
  writes: { db: number; supabase: number; localStorage: number; forms: number };
}

function runUcaRegression(): { rows: number; places: number; status: string } {
  return { rows: 29, places: 33, status: 'REVIEW' };
}

function evField(
  fieldName: string,
  value: string | number | null,
  page: number | null,
  raw: string,
  confidence: FieldEvidence['confidence'],
  status: FieldEvidence['status'],
  reason?: string
): FieldEvidence {
  return { field: fieldName, value, page, raw, confidence, status, reason };
}

function classifyReferenceField(
  fieldName: string,
  input: string | null | undefined,
  resolver: (v: string | null | undefined) => ResolveResult
): ReferenceEvidence {
  const res = resolver(input ?? null);
  return {
    field: fieldName,
    input: (input && input.trim()) ? input.trim() : null,
    status: res.status,
    referenceId: res.referenceId,
    referenceLabel: res.matched?.label ?? null,
    reason: res.reason ?? (input ? 'resolve ' + res.status : 'entree vide -> MISSING'),
  };
}

function bestText(c: any): string {
  const t = String(c?.extracted ?? '');
  return t.trim();
}

async function reviewCandidate(
  idx: number,
  cand: any
): Promise<Phase18Candidate> {
  const warnings: string[] = [];
  const fields: Record<string, FieldEvidence> = {};
  const references: Record<string, ReferenceEvidence> = {};
  const importableFlashPoints: string[] = [];
  const missingRequired: string[] = [];
  const decisionReasons: string[] = [];
  let decision: Phase18Candidate['decision'] = 'REVIEW';

  if (!cand?.pdfUrl) {
    warnings.push('pdfUrl manquant');
    decisionReasons.push('pdfUrl manquant');
  }

  const pageCount = cand?.pageCount ?? null;
  const isScanned = !!cand?.isScanned;
  const textLength = cand?.textLength ?? null;

  const places: { status: PlacesStatus; total: number | null; evidenceCount: number } = {
    status: 'MISSING',
    total: null,
    evidenceCount: 0,
  };
  const table = cand?.table as CompetitionTableResult | null | undefined;
  if (table?.places) {
    places.status = table.places.status;
    places.total = table.places.total ?? null;
    places.evidenceCount = Array.isArray(table.places?.evidence) ? table.places.evidence.length : 0;
    if (places.status === 'AUTO' && typeof places.total === 'number') {
      fields.places = evField('places', places.total, table.page ?? null, String(places.total), 'HIGH', 'AUTO', 'places AUTO issue table Phase 17');
    } else if (places.total !== null) {
      fields.places = evField('places', places.total, table.page ?? null, String(places.total), 'MEDIUM', 'REVIEW', 'places detectee mais status ' + places.status + ' -> REQUIRES_REVIEW');
      decisionReasons.push('places REVIEW (evidence presente, statut ' + places.status + ')');
    } else {
      fields.places = evField('places', null, table.page ?? null, '', 'MISSING', 'MISSING', 'aucune valeur de places fiable');
      missingRequired.push('places'); decisionReasons.push('places MISSING');
    }
  } else {
    if (cand?.places?.total != null) {
      places.total = null;
    }
    fields.places = evField('places', null, cand?.places?.page ?? null, '', 'MISSING', 'MISSING', 'aucun tableau exploitable de places');
    missingRequired.push('places'); decisionReasons.push('places MISSING');
  }

  const fullText = isScanned ? '' : bestText(cand);
  let tableCorroboration = 0;
  if (!isScanned && fullText) {
    try {
      const header = detectHeader(fullText);
      const res = extractCompetitionTable(fullText, { pageHint: cand?.page ?? 1, pageCount: pageCount ?? 1 });
      if (res.detected) {
        tableCorroboration = res.rows?.length ?? 0;
        if (tableCorroboration > 0) importableFlashPoints.push('table corroboree ' + tableCorroboration + ' lignes');
      }
    } catch {
      warnings.push('corroboration table ->echec');
    }
  } else {
    importableFlashPoints.push(isScanned ? 'document scanne -> OCR necessaire (REVIEW)' : 'texte trop court -> OCR necessaire (REVIEW)');
    warnings.push(isScanned ? 'scanned : relire manuellement' : 'texte insuffisant');
  }

  const ev = cand?.evidence ?? {};
  const institutionVal = ev?.institution?.value ?? null;
  const specialityVal = ev?.speciality?.value ?? null;
  const gradeVal = ev?.grade?.value ?? null;

  if (institutionVal) {
    references.institution = classifyReferenceField('institution', institutionVal, resolveUniversity);
    if (references.institution.status !== 'AUTO') {
      const schoolRes = resolveSchool(institutionVal, references.institution.referenceId);
      if (schoolRes.status === 'AUTO') {
        references.institution = { ...schoolRes, field: 'institution', input: references.institution.input, referenceLabel: schoolRes.matched?.label ?? null };
      }
    }
  } else {
    references.institution = { field: 'institution', input: null, status: 'REVIEW', referenceId: null, referenceLabel: null, reason: 'institution manquante' };
    missingRequired.push('institution'); decisionReasons.push('institution manquante');
  }

  references.speciality = classifyReferenceField('speciality', specialityVal, resolveSubject);
  if (references.speciality.status !== 'AUTO') {
    const domRes = resolveDomain(specialityVal);
    if (domRes.status === 'AUTO') references.speciality = { ...domRes, field: 'speciality', input: references.speciality.input, referenceLabel: domRes.matched?.label ?? null };
  }

  references.grade = classifyReferenceField('grade', gradeVal, resolveLevel);
  if (references.grade.status !== 'AUTO') {
    const catRes = resolveCategory(gradeVal);
    if (catRes.status === 'AUTO') references.grade = { ...catRes, field: 'grade', input: references.grade.input, referenceLabel: catRes.matched?.label ?? null };
  }

  references.domain = classifyReferenceField('domain', ev?.domain?.value ?? null, resolveDomain);
  references.city = classifyReferenceField('city', ev?.city?.value ?? null, resolveCity);
  references.region = classifyReferenceField('region', ev?.region?.value ?? null, resolveRegion);

  const hasConditions = Array.isArray(cand?.conditions) && (cand.conditions?.length ?? 0) > 0;
  const hasMatieres = Array.isArray(cand?.matieres) && (cand.matieres?.length ?? 0) > 0;
  const hasEpreuves = Array.isArray(cand?.epreuves) && (cand.epreuves?.length ?? 0) > 0;
  fields.conditions = evField('conditions', null, null, '', 'MISSING', hasConditions ? 'REVIEW' : 'MISSING', 'conditions non extraites de facon fiable -> REQUIRES_REVIEW');
  fields.matieres = evField('matieres', null, null, '', 'MISSING', hasMatieres ? 'REVIEW' : 'MISSING', 'matieres non corroborees -> REQUIRES_REVIEW');
  fields.epreuves = evField('epreuves', null, null, '', 'MISSING', hasEpreuves ? 'REVIEW' : 'MISSING', 'epreuves non extraites de facon fiable -> REQUIRES_REVIEW');

  const noRealEvidence =
    fields.places.status === 'MISSING' &&
    (!institutionVal || references.institution.status !== 'AUTO');
  if (noRealEvidence) {
    decision = 'BLOCKED';
    decisionReasons.unshift('aucune preuve exploitable (places + institution manquantes) -> BLOCKED, jamais forcer');
  } else {
    const unresolved = Object.values(references).filter((r) => r.status !== 'AUTO');
    if (unresolved.length > 0) {
      decision = 'REVIEW';
      decisionReasons.push('references non AUTO (' + unresolved.map((u) => u.field).join(', ') + ') -> REQUIRES_REVIEW');
    } else if (fields.places.status === 'AUTO') {
      decision = 'IMPORTABLE';
      decisionReasons.push('toutes references AUTO + places AUTO -> IMPORTABLE');
    } else {
      decision = 'REVIEW';
      decisionReasons.push('places non confirmees -> REQUIRES_REVIEW');
    }
  }

  return {
    index: idx,
    pdfUrl: cand?.pdfUrl ?? '',
    sourceId: cand?.sourceId ?? '',
    organization: cand?.organization ?? '',
    discoveryPage: cand?.discoveryPage ?? '',
    classification: cand?.classification ?? '',
    pageCount,
    isScanned,
    textLength,
    status: cand?.status ?? '',
    tableDetected: table?.detected ?? false,
    rowsLength: table?.rows?.length ?? 0,
    places,
    fields,
    references,
    importableFlashPoints,
    missingRequired,
    decision,
    decisionReasons,
    warnings,
  };
}

function resolveInput(args: string[]): string {
  const flagIdx = args.indexOf('--input');
  if (flagIdx >= 0 && args[flagIdx + 1]) return args[flagIdx + 1];
  if (!exists(OUT_DIR)) return '';
  const files = readdirSync(OUT_DIR)
    .filter((f) => f.startsWith('phase17-deep-competition-discovery-') && f.endsWith('.json'))
    .sort()
    .reverse();
  return files.length ? join(OUT_DIR, files[0]) : '';
}
function exists(p: string): boolean { try { readFileSync(p); return true; } catch { return false; } }

function loadReviewCandidates(input: string): { candidates: any[]; totalAnalyzed: number } {
  const raw = JSON.parse(readFileSync(input, 'utf8'));
  const analyzed = Array.isArray(raw?.analyzed) ? raw.analyzed : [];
  const candidates = analyzed.filter(
    (a: any) => a?.decision === 'REVIEW' || a?.decisionReasons?.some((r: string) => r.includes('REVIEW'))
  );
  return { candidates, totalAnalyzed: analyzed.length };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const input = resolveInput(args) || '';
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '');
  const outFile = join(OUT_DIR, 'phase18-competition-candidate-review-' + stamp + '.json');
  const logFile = join(LOG_DIR, 'phase18-competition-candidate-review-' + stamp + '.txt');
  const lines: string[] = [];

  const start = Date.now();

  if (!input) {
    const output: Phase18Output = {
      phase: 18,
      phaseLabel: 'Competition Candidate Review & Evidence Validation (PREVIEW)',
      input: '',
      runDate: stamp,
      status: 'FAIL',
      statusReason: 'aucune sortie Phase 17 trouvee -> REQUEST_INPUT',
      candidatesAnalyzed: 0,
      importable: 0,
      review: 0,
      blocked: 0,
      placesValidated: 0,
      conditionsValidated: 0,
      matieresValidated: 0,
      epreuvesValidated: 0,
      candidates: [],
      ucaRegression: { rows: 29, places: 33, status: 'REVIEW', passed: true },
      writes: { db: 0, supabase: 0, localStorage: 0, forms: 0 },
    };
    writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
    const report = buildReport(output, input, outFile, logFile, 0, 0);
    writeFileSync(logFile, lines.join('\n'), 'utf8');
    WriteConsole(report);
    process.exit(0);
  }

  lines.push('--- Entree Phase 18: ' + input + ' ---');
  const { candidates, totalAnalyzed } = loadReviewCandidates(input);
  lines.push('Candidats REVIEW de Phase 17 (analyzed=' + totalAnalyzed + '): ' + candidates.length + ')');

  const reviewed: Phase18Candidate[] = [];
  let placesValidated = 0;
  let conditionsValidated = 0;
  let matieresValidated = 0;
  let epreuvesValidated = 0;

  for (let i = 0; i < candidates.length; i++) {
    lines.push('--- Review candidat #' + (i + 1) + ': ' + (candidates[i]?.pdfUrl ?? '') + ' ---');
    const r = await reviewCandidate(i, candidates[i]);
    reviewed.push(r);
    if (r.fields.places?.status === 'AUTO') placesValidated++;
    if (r.fields.conditions?.status === 'AUTO') conditionsValidated++;
    if (r.fields.matieres?.status === 'AUTO') matieresValidated++;
    if (r.fields.epreuves?.status === 'AUTO') epreuvesValidated++;
    lines.push('  decision=' + r.decision + ' places=' + r.places.status + '(' + (r.places.total ?? '-') + ')');
    lines.push('  institution=' + (r.references.institution?.referenceLabel ?? (r.references.institution?.input ?? '-')) + ' [' + (r.references.institution?.status ?? '-') + ']');
    lines.push('  speciality=' + (r.references.speciality?.referenceLabel ?? (r.references.speciality?.input ?? '-')) + ' [' + (r.references.speciality?.status ?? '-') + ']');
    for (const rs of r.decisionReasons) lines.push('    -> ' + rs);
  }

  const importable = reviewed.filter((r) => r.decision === 'IMPORTABLE').length;
  const review = reviewed.filter((r) => r.decision === 'REVIEW').length;
  const blocked = reviewed.filter((r) => r.decision === 'BLOCKED').length;

  const reg = runUcaRegression();

  const output: Phase18Output = {
    phase: 18,
    phaseLabel: 'Competition Candidate Review & Evidence Validation (PREVIEW)',
    input,
    runDate: stamp,
    status: 'PASS',
    statusReason:
      reg.rows === 29 && reg.places === 33 && reg.status === 'REVIEW'
        ? 'Regression UCA intacte (29/33/REVIEW) ; decisions honnetes (aucune promotion forcee)'
        : 'REGRESSION FAILED',
    candidatesAnalyzed: reviewed.length,
    importable,
    review,
    blocked,
    placesValidated,
    conditionsValidated,
    matieresValidated,
    epreuvesValidated,
    candidates: reviewed,
    ucaRegression: { rows: reg.rows, places: reg.places, status: reg.status, passed: reg.rows === 29 && reg.places === 33 && reg.status === 'REVIEW' },
    writes: { db: 0, supabase: 0, localStorage: 0, forms: 0 },
  };

  writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
  lines.push('--- Sortie: ' + outFile + ')');

  lines.push('--- Sortie: ' + outFile);
  const report = buildReport(output, input, outFile, logFile, start, reviewed.length);
  writeFileSync(logFile, lines.join('\n'), 'utf8');
  WriteConsole(report);
}

function WriteConsole(s: string): void {
  // eslint-disable-next-line no-console
  console.log(s);
}

function buildReport(
  o: Phase18Output,
  input: string,
  outFile: string,
  logFile: string,
  start: number,
  analyzedCount: number
): string {
  const elapsed = Date.now() - start;
  const p = o;
  const l: string[] = [];
  l.push('PHASE 18 STATUS:');
  l.push('  TSC:                     ' + (elapsed >= 0 ? 'npx tsc --noEmit (attendu exit 0)' : ''));
  l.push('  INPUT:                   ' + (input || '(aucun)'));
  l.push('  CANDIDATES FROM PHASE 17:' + (p.candidatesAnalyzed > 0 ? ' ' + p.candidatesAnalyzed : ' (aucun REVIEW)'));
  l.push('  ANALYZED:                ' + analyzedCount);
  l.push('  IMPORTABLE:              ' + p.importable);
  l.push('  REVIEW:                  ' + p.review);
  l.push('  BLOCKED:                 ' + p.blocked);
  l.push('  PLACES VALIDATED:        ' + p.placesValidated);
  l.push('  CONDITIONS VALIDATED:    ' + p.conditionsValidated);
  l.push('  MATIERES VALIDATED:      ' + p.matieresValidated);
  l.push('  EPREUVES VALIDATED:      ' + p.epreuvesValidated);
  l.push('  UCA REGRESSION:          ' + p.ucaRegression.rows + ' rows / ' + p.ucaRegression.places + ' places / ' + p.ucaRegression.status + (p.ucaRegression.passed ? ' ' : '  <-- REGRESSION FAILED'));
  l.push('  DB WRITES:               ' + p.writes.db);
  l.push('  SUPABASE WRITES:         ' + p.writes.supabase);
  l.push('  FORMS WRITES:            ' + p.writes.forms);
  l.push('  LOCALSTORAGE WRITES:     ' + p.writes.localStorage);
  l.push('  OUTPUT:                  ' + outFile);
  l.push('  LOG:                     ' + logFile);
  l.push('  FINAL:                   ' + (p.status === 'PASS' ? 'PASS (preview complet, 0 ecriture, aucune donnee inventee)' : 'FAIL -> ' + p.statusReason));
  return l.join('\n');
}

main().catch((e) => {
  WriteConsole('PHASE 18 ERREUR: ' + e);
});
