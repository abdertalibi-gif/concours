// scraper/parsers/competitionTable.ts — extracteur générique nombre de postes (Phase 11, PREVIEW ONLY, NO DB WRITE)
// API: extractCompetitionTable(text, options) → CompetitionTableResult
// Ne pas confondre : extraction = texte → table reconstruite ; aucune écriture, aucun import.
import type { ScrapedItem } from '../lib/types';
import type { ValidatedPayload, FieldMeta } from '../mappers/types';
import { mapToCompetition } from '../mappers/competitionMapper.ts';

export type PlacesStatus = 'AUTO' | 'REVIEW' | 'MISSING';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CompetitionTableRow {
  institution: string;
  places: number;
  speciality: string;
  grade: string;
  page: number;
  raw: string;
  confidence: Confidence;
}

export interface PlacesEvidence {
  field: 'places';
  value: number;
  status: PlacesStatus;
  page: number;
  raw: string;
  reason: string;
  institution: string;
  speciality: string;
  grade: string;
  confidence: Confidence;
}

export interface CompetitionTableResult {
  detected: boolean;
  page?: number;
  header?: string[];
  rows: CompetitionTableRow[];
  places: {
    status: PlacesStatus;
    values: number[];
    total: number | null;
    evidence: PlacesEvidence[];
  };
  warnings: string[];
}

export interface CompetitionTableOptions {
  pageHint?: number;
  pageCount?: number;
  scanned?: boolean;
}

// ---------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------
const STRONG_PHRASES = [
  'عدد المناصب المالية',
  'عدد المناصب المفتوحة',
  'عدد المناصب',
  'عدد الوظائف',
  'الوظائف المفتوحة',
  'المجموع العام للمناصب ف',
  'عدد المنصب',
  'nombre de postes',
  'nombre des postes',
  'nombre de places',
  'nombre des places',
];

// Mots isolés : faiblesse → activation mais jamais AUTO seul
const WEAK_RE = /(المناصب|المنصب|وظائف|وظيفة)|(\bposte\w*\b|\bplace\w*\b)/i;

// Combinaisons de tête de tableau pour corroborer qu'une ligne est un header de tableau
const TABLE_CELL_RE = /(المؤسسة|العدد|التخصص|الإطار|الدرجة|العدد الإجمالي|institution|nombre|specialit|finance|spécialit|grade|cadre|échelle|salaire)/i;

// Lignes-header à ignorer après détection : phrase forte seule, OU ligne entièrement
// composée de cellules de header. Ne s'applique jamais aux lignes commençant par un
// chiffre (les lignes de données en colonne "postes" commencent par le nombre).
const STRONG_PHRASE_SKIP_RE = /(عدد المناصب المالية|عدد المناصب المفتوحة|عدد المناصب|عدد الوظائف|المناصب|المنصب|وظائف|وظيفة|عدد المنصب|nombre de postes|nombre des postes|nombre de places|nombre des places|postes|places)/i;
const HEADER_CELL_ONLY_RE = /^(المؤسسة|المؤسسات|العدد|التخصص|التخصص المطلوب|التخصصات|الإطار|الإطار المطلوب|الدرجة|institution|instituts|spécialité|specialite|specialité|grade|cadre|échelle|salle|date|remarque|notes)$/i;

// Mots "grade" : présence obligatoire pour qu'un nombre soit un champ places
const GRADE_RE = /(متصرف|تقني|مهندس|إطار|مدير|الدرجة|سلم|رتبة|أستاذ|مكلف|محرر|قيم|ingénieur|ingenieur|technicien|administrateur|cadre|échelle|grade)/i;

// Préfixes institution (arabe + français)
const INST_PREFIX_RE = /^(كلية|كلي|المدرسة|مدرسة|المركز|مركز|المراكز|المعهد|معهد|معاهد|جامعة|الأكاديمية|أكاديمي|المديرية|مديري|الوزارة|المندوبية|النيابة|المؤسسات|المؤسسة|facult|écol|ecol|centre|institut|universit|acadé|academi|direction|minist|délégat)/i;

const CITY_RE = /(مراكش|الدار البيضاء|الرباط|فاس|مكناس|طنجة|أكادير|اسفي|آسفي|قلعة السراغنة|قلعة|بني ملال|خريبكة|وجدة|تطوان|العيون|الداخلة|الصويرة|تارودانت|الرشيدية|برشيد|الجديدة|سلا|تمارة|القنيطرة|الناظور|الحسيمة|جرادة|ورزازات)/;

const PAGE_MARKER_RE = /^--\s*(\d+)\s+of\s+(\d+)\s*--$/;

// Anti-faux-positifs reporters
const YEAR_RE = /^(19|20)\d{2}$/;
const DATE_OR_REF_RE = /^0\d/;

// ---------------------------------------------------------------
// Validation anti-faux-positifs
// ---------------------------------------------------------------
function isPlacesToken(token: string, line: string): { ok: boolean; reason?: string } {
  if (!/^\d+$/.test(token)) return { ok: false, reason: `token non numérique: ${token}` };
  const n = parseInt(token, 10);
  if (!Number.isFinite(n) || n < 1 || n > 500) return { ok: false, reason: `hors plage 1..500: ${token}` };
  if (YEAR_RE.test(token)) return { ok: false, reason: `année exclue: ${token}` };
  if (DATE_OR_REF_RE.test(token)) return { ok: false, reason: `date/référence (0x) exclue: ${token}` };
  const after = line.slice(token.length).trimStart();
  if (!after) return { ok: false, reason: `numéro isolé sans contexte: ${token}` };
  const next = after[0];
  if (next && /[/:\-+.%‎]/.test(next)) return { ok: false, reason: `contexte date/référence/code après '${token}' → '${next}'` };
  if (/^(annee|année|page|pages|niveau|niv|bac\+|concours|article|n°|no\b)/i.test(after)) return { ok: false, reason: `contexte numérique exclu après '${token}'` };
  return { ok: true };
}

// ---------------------------------------------------------------
// Détection header
// ---------------------------------------------------------------
interface HeaderInfo {
  found: boolean;
  strong: boolean;
  split: boolean; // phrase détectée à travers plusieurs lignes (confiance moyenne)
  headerCells: string[];
  phrase: string;
  index: number;
}

function splitCells(line: string): string[] {
  return line.split(/[\t|]/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

export function detectHeader(text: string): HeaderInfo {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lcLine = line.toLowerCase();
    for (const phrase of STRONG_PHRASES) {
      if (lcLine.includes(phrase)) {
        return { found: true, strong: true, split: false, headerCells: splitCells(line), phrase, index: i };
      }
    }
    // Phrase forte à travers 1-2 lignes (arabe fusionné) — uniquement si la phrase
    // n'est PAS déjà présente sur une seule des lignes (sinon le match exact de la
    // ligne correspondante aurait dû être retenu — on ne doit pas marquer split).
    const aLine = lcLine;
    const bLine = (lines[i + 1] ?? '').toLowerCase();
    const cLine = (lines[i + 2] ?? '').toLowerCase();
    for (const phrase of STRONG_PHRASES) {
      const window1 = `${aLine} ${bLine}`;
      const window2 = `${aLine} ${bLine} ${cLine}`;
      const splitAcross = () => {
        if (window2.includes(phrase) && !aLine.includes(phrase) && !bLine.includes(phrase) && !cLine.includes(phrase)) return true;
        if (window1.includes(phrase) && !aLine.includes(phrase) && !bLine.includes(phrase)) return true;
        return false;
      };
      if (splitAcross()) {
        return { found: true, strong: true, split: true, headerCells: splitCells(`${line} ${lines[i + 1] ?? ''}`), phrase, index: i };
      }
    }
  }
  // Fallback : mot faible + contexte tableau
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (WEAK_RE.test(line) && (TABLE_CELL_RE.test(line) || line.includes('\t') || lines[i + 1]?.match(/^\d{1,3}[\t ]+/))) {
      return { found: true, strong: false, split: false, headerCells: splitCells(line), phrase: 'mot faible', index: i };
    }
  }
  return { found: false, strong: false, split: false, headerCells: [], phrase: '', index: -1 };
}

// ---------------------------------------------------------------
// Parsing lignes
// ---------------------------------------------------------------
function isHeaderSkipLine(line: string): boolean {
  if (/^\d/.test(line)) return false; // les lignes de données commencent par le nombre → jamais skippées
  const t = line.trim();
  if (STRONG_PHRASE_SKIP_RE.test(line)) return true;
  if (HEADER_CELL_ONLY_RE.test(t)) return true;
  if (line.includes('\t') && line.split(/\t/).every((cell) => HEADER_CELL_ONLY_RE.test(cell.trim()))) return true;
  return false;
}

function isInstitutionLine(line: string): boolean {
  if (/^\d/.test(line)) return false;
  if (line.length > 100) return false;
  if (PAGE_MARKER_RE.test(line)) return false;
  const hasPrefix = INST_PREFIX_RE.test(line);
  const hasCity = CITY_RE.test(line);
  const hasTab = line.includes('\t');
  // Une ligne avec cellules tabulées dont l'une est purement numérique (par ex. un reliquat
  // de ligne embarquée) ne doit pas être consommée comme institution.
  if (hasTab && line.split(/\t/).some((c) => /^\d{1,3}$/.test(c.trim()))) return false;
  return hasPrefix || (hasCity && hasTab);
}

// ---------------------------------------------------------------
// Ligne "embedée" française : institution + places + spécialité + grade
// sur UNE seule ligne (séparée par tabulations OU 2+ espaces).
// ---------------------------------------------------------------
function parseEmbeddedRow(line: string, page: number): { row: CompetitionTableRow; confidence: Confidence } | null {
  if (/^\d/.test(line)) return null;
  if (line.length > 120) return null;
  const hasTab = line.includes('\t');
  const sep = hasTab ? /\t/ : / {2,}/;
  const tokens = line.split(sep).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (tokens.length < 3) return null;

  // position du token places : au milieu (pas la 1re cellule = institution)
  let placesIdx = -1;
  for (let ti = 1; ti < tokens.length - 1; ti++) {
    const token = tokens[ti];
    if (!/^\d{1,3}$/.test(token)) continue;
    const n = parseInt(token, 10);
    if (n < 1 || n > 500) continue;
    if (YEAR_RE.test(token)) continue;
    if (DATE_OR_REF_RE.test(token)) continue;
    if (/^0\d/.test(token)) continue;
    // contexte après-le-token
    const after = tokens.slice(ti + 1).join(' ').trimStart();
    if (!after) continue;
    const next = after[0];
    if (next && /[/:\-+.%]/u.test(next)) continue;
    if (next && /[ا-ي]/u.test(next) && /^(منصب|لكل|بمعدل|العدد|المناصب)/u.test(after) && !GRADE_RE.test(after)) continue;
    if (/^(annee|année|page|pages|niveau|niv|bac\+|pages?)\b/i.test(after)) continue;
    placesIdx = ti;
    break;
  }
  if (placesIdx < 0) return null;

  const before = tokens.slice(0, placesIdx).join(' ').trim();
  if (!before || before.length < 3) return null;
  const instOk = INST_PREFIX_RE.test(before) || (CITY_RE.test(before) && hasTab);
  if (!instOk) return null;

  const after = tokens.slice(placesIdx + 1).join(' ').trim();
  // le grade DOIT apparaître après le token places pour qualifier la ligne
  const gradeMatch = after.match(GRADE_RE);
  if (!gradeMatch) return null;
  const grade = gradeMatch[0];
  const speciality = after.slice(0, gradeMatch.index ?? 0).trim().replace(/\s+/g, ' ').slice(0, 80);

  const row: CompetitionTableRow = {
    institution: before.replace(/\s+/g, ' ').slice(0, 80),
    places: parseInt(tokens[placesIdx], 10),
    speciality,
    grade,
    page,
    raw: line.slice(0, 120),
    confidence: instOk ? 'HIGH' : 'MEDIUM',
  };
  return { row, confidence: row.confidence };
}

export function extractCompetitionTable(text: string, options: CompetitionTableOptions = {}): CompetitionTableResult {
  const warnings: string[] = [];
  const rows: CompetitionTableRow[] = [];
  const excluded: string[] = [];

  // PDF scanné / pas de texte
  if (options.scanned || (text || '').trim().length === 0) {
    return {
      detected: false,
      rows: [],
      places: { status: 'MISSING', values: [], total: null, evidence: [] },
      warnings: [options.scanned ? 'PDF scanné — pas de texte exploitable (SCANNED_REVIEW)' : 'texte vide'],
    };
  }

  const lines = text.split(/\n/).map((l) => l.trim());
  const header = detectHeader(text);
  if (!header.found) {
    return {
      detected: false,
      rows: [],
      places: { status: 'MISSING', values: [], total: null, evidence: [] },
      warnings: ['aucun en-tête nombre de postes détecté (عدد المناصب / nombre de postes / …)'],
    };
  }

  let currentPage = options.pageHint ?? 1;
  let currentInstitution = '';
  let institutionMerged = false;
  let rowMerged = false;
  let parsed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // Marqueurs de page
    const pageMatch = line.match(PAGE_MARKER_RE);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10) + 1;
      continue;
    }
    // Lignes de header répétées (page suivante, formules arabes fusionnées…) — ignorées
    if (isHeaderSkipLine(line)) continue;

    // Ligne "embedée" : institution + places + spécialité + grade sur la même ligne (fr)
    const embedded = parseEmbeddedRow(line, currentPage);
    if (embedded) {
      rows.push(embedded.row);
      parsed++;
      continue;
    }

    // Ligne institution (mise à jour du contexte courant)
    if (isInstitutionLine(line)) {
      currentInstitution = line.replace(/\s+/g, ' ').trim().slice(0, 80);
      // Fusion des lignes de continuation de l'institution (arabe scindé)
      let k = i + 1;
      while (k < lines.length) {
        const nxt = lines[k];
        if (!nxt || PAGE_MARKER_RE.test(nxt)) break;
        if (/^\d/.test(nxt)) break;
        if (GRADE_RE.test(nxt)) break;
        if (isInstitutionLine(nxt)) break;
        if (isHeaderSkipLine(nxt)) break;
        if (nxt.length > 40) break;
        currentInstitution += ' ' + nxt;
        institutionMerged = true;
        k++;
      }
      if (k > i + 1) currentInstitution = currentInstitution.replace(/\s+/g, ' ').trim().slice(0, 80);
      i = k - 1;
      continue;
    }

    // Ligne "row" : nombre + spécialité + grade
    const m = line.match(/^(\d{1,3})([\t ]+)(.+)$/);
    if (m) {
      const token = m[1];
      const guard = isPlacesToken(token, line);
      if (!guard.ok) {
        excluded.push(guard.reason || token);
        continue;
      }
      const rest = m[3].trim();
      if (!GRADE_RE.test(rest)) {
        excluded.push(`nombre '${token}' sans cadre/grade dans: ${rest.slice(0, 40)}`);
        continue;
      }
      const places = parseInt(token, 10);
      // Séparation spécialité / grade
      let speciality = rest;
      let grade = '';
      const gradeMatch = rest.match(GRADE_RE);
      if (gradeMatch && gradeMatch.index !== undefined) {
        speciality = rest.slice(0, gradeMatch.index).trim();
        grade = rest.slice(gradeMatch.index).trim();
      }
      speciality = speciality.replace(/[\t]+/g, ' ').trim().slice(0, 80);
      grade = grade.replace(/[\t]+/g, ' ').trim().slice(0, 60);
      const confidence: Confidence = currentInstitution ? 'HIGH' : 'MEDIUM';
      rows.push({
        institution: currentInstitution,
        places,
        speciality,
        grade,
        page: currentPage,
        raw: line.slice(0, 120),
        confidence,
      });
      parsed++;
      // Fusion ligne de continuation de la spécialité/grade
      let j = i + 1;
      while (j < lines.length) {
        const nxt = lines[j];
        if (!nxt || PAGE_MARKER_RE.test(nxt) || isInstitutionLine(nxt) || /^\d/.test(nxt)) break;
        if (isHeaderSkipLine(nxt)) break;
        if (nxt.length > 60) break;
        if (rows.length && !rowMerged) {
          const prev = rows[rows.length - 1];
          prev.grade = `${prev.grade} ${nxt}`.replace(/\s+/g, ' ').trim().slice(0, 60);
          rowMerged = true;
        }
        j++;
      }
      i = j - 1;
      continue;
    }
  }

  const values = rows.map((r) => r.places);
  const total = values.length ? values.reduce((a, b) => a + b, 0) : null;

  // Statut
  let status: PlacesStatus;
  const reasons: string[] = [];

  if (rows.length === 0) {
    status = 'MISSING';
    reasons.push('table/fonction détectée mais aucune ligne exploitable');
  } else if (!header.strong) {
    status = 'REVIEW';
    reasons.push('mot-clé places faible seul (pas de phrase explicite)');
  } else if (header.split) {
    status = 'REVIEW';
    reasons.push('en-tête nombre de postes réparti sur plusieurs lignes (arabe fusionné) — colonne identifiée avec confiance moyenne');
  } else if (institutionMerged) {
    status = 'REVIEW';
    reasons.push('institutions sur plusieurs lignes fusionnées');
  } else if (rowMerged) {
    status = 'REVIEW';
    reasons.push('lignes partiellement fusionnées (spécialité/grade sur lignes suivantes)');
  } else if (rows.some((r) => !r.institution)) {
    status = 'REVIEW';
    reasons.push('certaines valeurs sans institution rattachée');
  } else if (rows.some((r) => r.confidence === 'MEDIUM')) {
    status = 'REVIEW';
    reasons.push('valeurs à confiance moyenne');
  } else if (total !== null && total > 0) {
    status = 'AUTO';
    reasons.push('en-tête explicite sur une ligne, colonne places explicite, chaque valeur associée, aucune ambiguïté');
  } else {
    status = 'REVIEW';
    reasons.push('total invalide');
  }

  if (excluded.length) {
    warnings.push(`faux positifs exclus: ${excluded.slice(0, 8).join(' | ')}`);
  }
  if (status === 'REVIEW') {
    warnings.push('extraction texte heuristique sans corroboration native (table non restituée par pdf-parse)');
  }

  const evidence: PlacesEvidence[] = rows.map((r) => ({
    field: 'places',
    value: r.places,
    status,
    page: r.page,
    raw: r.raw,
    reason: 'Valeur détectée dans la colonne/context du nombre de postes (عدد المناصب / nombre de postes) — rattachée à un grade ligne par ligne',
    institution: r.institution,
    speciality: r.speciality,
    grade: r.grade,
    confidence: r.confidence,
  }));

  return {
    detected: rows.length > 0,
    page: options.pageHint ?? 1,
    header: header.headerCells,
    rows,
    places: { status, values, total, evidence },
    warnings,
  };
}

// ---------------------------------------------------------------
// Intégration pipeline Competition (section 9) — PREVIEW ONLY
// Si places.status === REVIEW → le champ places reste REVIEW, jamais REVIEW→AUTO.
// ---------------------------------------------------------------
export function buildCompetitionPreview(scraped: ScrapedItem, table: CompetitionTableResult): ValidatedPayload & { placesOverride?: Record<string, unknown> } {
  const mapped = mapToCompetition(scraped);
  const status = table.places.status;
  if (status === 'REVIEW' || status === 'AUTO' || status === 'MISSING') {
    const override: FieldMeta = {
      targetField: 'places',
      value: status === 'AUTO' ? table.places.total : null,
      status: status === 'MISSING' ? 'BLOCKED' : status,
      sourceField: 'pdf table عدد المناصب',
      reason: table.places.total !== null
        ? `total ${table.places.total} (${table.rows.length} lignes) — ${table.warnings.join('; ')}`
        : table.warnings.join('; ') || 'aucune valeur fiable',
      evidence: table.places.evidence.slice(0, 3),
    };
    (mapped.fields as Record<string, FieldMeta>).places = override;
    (mapped.payload as Record<string, unknown>).places = status === 'AUTO' ? table.places.total : null;
    if (status === 'REVIEW') (mapped.payload as Record<string, unknown>).places = table.places.total;
    (mapped as any).placesOverride = { status, total: table.places.total, rows: table.rows.length };
  }
  return mapped;
}