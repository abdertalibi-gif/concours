// ============================================================
// CONCOURS MAROC — Construction de l'aperçu d'import (READ-ONLY)
//
// Invariant : cette fonction n'effectue AUCUNE écriture.
// Elle ne touche ni localStorage, ni Supabase, ni /api/masters, ni
// aucun client IA. Les référentiels existants sont fournis par
// l'appelant, ce qui rend l'aperçu testable et structurellement
// inoffensif.
//
// Séquence : PARSE (hors module) -> NORMALIZE -> VALIDATE ->
// RESOLVE REFERENCES -> DEDUPE -> PREVIEW
//
// Décision v1 : toute correspondance avec un enregistrement existant
// donne DUPLICATE et la ligne est IGNORÉE. Aucun auto-update, même
// si les données entrantes diffèrent (le diff est fourni à titre
// informatif uniquement).
// ============================================================

import { buildHeaderMapping } from './fieldRegistry';
import { normalizeRow } from './normalize';
import { validateConcoursRow, validateMastersRow } from './validate';
import { toCompetitionPayload, toMasterImportPayload } from './adapters';
import { competitionDedupeKeys, keysIntersect, mastersDedupeKeys } from './dedupe';
import { emptyCounts, type FieldDiff, type ImportPreview, type ImportRefs, type ImportRow, type RawTable, type RowStatus } from './types';
import { slugify } from '../utils';

export interface BuildPreviewInput {
  entity: 'CONCOURS' | 'MASTERS';
  table: RawTable;
  fileName: string;
  refs: ImportRefs;
  now?: Date;
  format?: 'json' | 'csv' | 'xlsx';
}

function diffConcours(
  data: Record<string, unknown>,
  existing: Record<string, unknown>,
): FieldDiff[] {
  const diff: FieldDiff[] = [];
  const comparable = [
    'title', 'organizationName', 'places', 'level', 'city', 'region',
    'registrationStart', 'registrationDeadline', 'description',
  ];
  for (const field of comparable) {
    const incoming = data[field];
    const current = existing[field];
    const a = Array.isArray(incoming) ? incoming.join(' | ') : incoming ?? '';
    const b = Array.isArray(current) ? current.join(' | ') : current ?? '';
    if (String(a) !== String(b)) {
      diff.push({ field, incoming: incoming ?? null, existing: current ?? null });
    }
  }
  return diff;
}

function diffMasters(
  data: Record<string, unknown>,
  existing: Record<string, unknown>,
): FieldDiff[] {
  const diff: FieldDiff[] = [];
  const comparable = ['name', 'university', 'establishment', 'city', 'domain', 'level', 'academicYear', 'deadlineDate', 'seats'];
  for (const field of comparable) {
    const incoming = data[field] ?? null;
    const current = existing[field] ?? null;
    if (String(incoming) !== String(current)) {
      diff.push({ field, incoming, existing: current });
    }
  }
  return diff;
}

/**
 * Construit l'aperçu complet d'un import : mapping, validation,
 * résolution de références et déduplication. Aucune écriture.
 */
export function buildPreview(input: BuildPreviewInput): ImportPreview {
  const { entity, table, refs, now = new Date() } = input;
  const { mapping, specs } = buildHeaderMapping(entity, table.headers);
  const unmappedHeaders = mapping.filter((m) => !m.spec).map((m) => m.header);
  const counts = emptyCounts();
  const parserNotes: string[] = [];

  if (table.headers.length === 0) {
    parserNotes.push('Aucun en-tête détecté dans le fichier.');
  }
  const requiredMissing = specs
    .filter((s) => s.required)
    .filter((s) => !mapping.some((m) => m.spec?.field === s.field));
  for (const field of requiredMissing) {
    parserNotes.push(`Colonne obligatoire absente du fichier : ${field} (${field}).`);
  }

  const existingIndex = new Map<string, Record<string, unknown>>();
  if (entity === 'CONCOURS') {
    for (const c of refs.competitions) {
      for (const key of competitionDedupeKeys({
        slug: c.slug,
        sourceUrl: c.sourceUrl,
        schoolId: c.schoolId,
        title: c.title,
        year: c.year,
      })) {
        if (!existingIndex.has(key)) existingIndex.set(key, c as unknown as Record<string, unknown>);
      }
    }
  } else {
    for (const m of refs.masters) {
      for (const key of mastersDedupeKeys({
        university: m.university,
        establishment: m.establishment,
        name: m.name,
        academicYear: m.academicYear,
      })) {
        if (!existingIndex.has(key)) existingIndex.set(key, m as unknown as Record<string, unknown>);
      }
    }
  }

  // Clés déjà rencontrées dans le fichier -> détection DUPLICATE_IN_FILE.
  const seenInFile = new Map<string, number>();
  const rows: ImportRow[] = [];

  table.rows.forEach((raw, idx) => {
    const index = idx + 1;
    const normalized = normalizeRow(mapping, raw);
    const { data, messages: normalizeErrors } = normalized;

    let status: RowStatus = 'OK';
    let messages = [...normalizeErrors];
    let diff: FieldDiff[] = [];
    let existingId: string | undefined;
    let dedupeKeys: string[] = [];
    let resolution: ImportRow['resolution'];

    if (entity === 'CONCOURS') {
      // year par défaut si absent, pour ne pas pénaliser un fichier minimal.
      if (data.year === null || data.year === undefined) data.year = now.getFullYear();

      const orgRefs = { schools: refs.schools, universities: refs.universities, ministries: refs.ministries };
      const validated = validateConcoursRow(data, orgRefs, normalizeErrors);
      status = validated.status;
      messages = validated.messages;
      resolution = validated.resolution ?? undefined;

      const schoolId = validated.resolution?.schoolId ?? (typeof data.schoolId === 'string' ? data.schoolId : undefined);
      const slug = slugify(`${validated.resolution?.organizationName || String(data.organizationName || '')}-${String(data.title || '')}-${String(data.year)}`);
      dedupeKeys = competitionDedupeKeys({
        slug,
        sourceUrl: typeof data.sourceUrl === 'string' ? data.sourceUrl : undefined,
        schoolId,
        title: typeof data.title === 'string' ? data.title : undefined,
        year: typeof data.year === 'number' ? data.year : undefined,
      });

      const existing = dedupeKeys.map((k) => existingIndex.get(k)).find(Boolean);
      if (existing && status !== 'ERROR') {
        status = 'DUPLICATE';
        existingId = String(existing.id);
        diff = diffConcours(data, existing);
        messages = [
          ...messages,
          {
            level: 'info',
            message: 'Enregistrement existant détecté (même clé). Ignoré — aucun écrasement automatique en v1.',
          },
        ];
      } else if (existing) {
        // Erreur ET doublon : l'erreur reste prioritaire.
        messages = [
          ...messages,
          { level: 'info', message: 'Un enregistrement existant correspond déjà à cette clé.' },
        ];
      }

      const dupInFile = dedupeKeys.find((k) => seenInFile.has(k));
      if (dupInFile && status === 'OK') {
        status = 'DUPLICATE_IN_FILE';
        messages = [
          ...messages,
          {
            level: 'warning',
            message: `Doublon dans le fichier : même clé que la ligne ${seenInFile.get(dupInFile)}.`,
          },
        ];
      }
    } else {
      const validated = validateMastersRow(data, normalizeErrors);
      status = validated.status;
      messages = validated.messages;

      dedupeKeys = mastersDedupeKeys({
        university: typeof data.university === 'string' ? data.university : undefined,
        establishment: typeof data.establishment === 'string' ? data.establishment : undefined,
        name: typeof data.name === 'string' ? data.name : undefined,
        academicYear: typeof data.academicYear === 'string' ? data.academicYear : undefined,
      });

      const existing = dedupeKeys.map((k) => existingIndex.get(k)).find(Boolean);
      if (existing && status !== 'ERROR') {
        status = 'DUPLICATE';
        existingId = String(existing.id);
        diff = diffMasters(data, existing);
        messages = [
          ...messages,
          {
            level: 'info',
            message: 'Master existant détecté (même uniqueKey). Ignoré — aucun écrasement automatique en v1.',
          },
        ];
      } else if (existing) {
        messages = [
          ...messages,
          { level: 'info', message: 'Un master existant correspond déjà à cette clé.' },
        ];
      }

      const dupInFile = dedupeKeys.find((k) => seenInFile.has(k));
      if (dupInFile && status === 'OK') {
        status = 'DUPLICATE_IN_FILE';
        messages = [
          ...messages,
          {
            level: 'warning',
            message: `Doublon dans le fichier : même clé que la ligne ${seenInFile.get(dupInFile)}.`,
          },
        ];
      }
    }

    for (const key of dedupeKeys) {
      if (!seenInFile.has(key)) seenInFile.set(key, index);
    }

    counts[status] += 1;
    counts.total += 1;

    rows.push({
      index,
      raw,
      data,
      status,
      messages,
      dedupeKeys,
      existingId,
      diff,
      resolution,
      include: status === 'OK' || status === 'REVIEW',
    });
  });

  return {
    entity,
    fileName: input.fileName,
    format: input.format ?? 'csv',
    headers: table.headers,
    mapping,
    unmappedHeaders,
    rows,
    counts,
    parserNotes,
  };
}

export { toCompetitionPayload, toMasterImportPayload, keysIntersect };
export type { RowStatus };
