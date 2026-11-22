// ============================================================
// CONCOURS MAROC — Normalisation des cellules importées
//
// Reprend les `transform` de scraper/form-schemas.json :
//   trim()            -> string nettoyé
//   parseInt||x       -> entier
//   toISOString()     -> date ISO
//   split('\n')       -> tableau (une valeur par ligne)
//   split(',')        -> tableau (une valeur par virgule)
//   checked           -> booléen
//   regex ^https?://  -> URL validée
//
// Aucune écriture, aucun accès réseau : module pur.
// ============================================================

import { parseDateSafe } from '../utils';
import type { FieldSpec, HeaderMapping, ImportMessage } from './types';

type FieldKind = 'string' | 'int' | 'date' | 'deadline' | 'url' | 'lines' | 'commas' | 'bool';

const INT_FIELDS = new Set(['year', 'places', 'seats']);

const DATE_FIELDS = new Set([
  'registrationStart',
  'registrationDeadline',
  'competitionDate',
  'convocationDate',
  'resultsDate',
  'openingDate',
  'deadlineDate',
  'examDate',
  'publicationDate',
]);

/** Champs dont la date est une échéance : parseDateSafe en fin de journée. */
const DEADLINE_FIELDS = new Set(['registrationDeadline', 'deadlineDate']);

const URL_FIELDS = new Set([
  'officialWebsite',
  'registrationUrl',
  'sourceUrl',
  'officialUrl',
  'schoolWebsite',
]);

const LINES_FIELDS = new Set(['conditions', 'epreuves', 'documentsDemandes']);
const COMMAS_FIELDS = new Set(['matieres']);
const BOOL_FIELDS = new Set(['isDemo']);

const URL_RE = /^https?:\/\/.+/;

/**
 * Contrôle STRICT d'une date avant délégation à parseDateSafe.
 *
 * `new Date('32/13/2026')` ne lève pas d'erreur : JavaScript reporte
 * au 1er février 2027. Pour un import, une telle valeur doit être
 * signalée comme invalide, jamais « corrigée » silencieusement.
 * Formats acceptés : AAAA-MM-JJ, JJ/MM/AAAA, JJ-MM-AAAA.
 */
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DMY_DATE_RE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

function isStrictDate(raw: string): boolean {
  const iso = ISO_DATE_RE.exec(raw);
  if (iso) {
    return inRange(Number(iso[1]), 1900, 2999) && inRange(Number(iso[2]), 1, 12) && inRange(Number(iso[3]), 1, 31);
  }
  const dmy = DMY_DATE_RE.exec(raw);
  if (dmy) {
    return inRange(Number(dmy[3]), 1900, 2999) && inRange(Number(dmy[2]), 1, 12) && inRange(Number(dmy[1]), 1, 31);
  }
  return false;
}

function inRange(n: number, min: number, max: number): boolean {
  return Number.isInteger(n) && n >= min && n <= max;
}

function fieldKind(spec: FieldSpec): FieldKind {
  if (INT_FIELDS.has(spec.field)) return 'int';
  if (DEADLINE_FIELDS.has(spec.field)) return 'deadline';
  if (DATE_FIELDS.has(spec.field)) return 'date';
  if (URL_FIELDS.has(spec.field)) return 'url';
  if (LINES_FIELDS.has(spec.field)) return 'lines';
  if (COMMAS_FIELDS.has(spec.field)) return 'commas';
  if (BOOL_FIELDS.has(spec.field)) return 'bool';
  return 'string';
}

function toBool(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'oui' || v === 'yes' || v === 'vrai' || v === 'x';
}

function toInt(value: string): number | null {
  const cleaned = value.replace(/\s|\u00a0/g, '').replace(/,/g, '.');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number.parseInt(cleaned, 10);
  return Number.isNaN(n) ? null : n;
}

function err(field: string, message: string): ImportMessage {
  return { level: 'error', field, message };
}

/** Valeur sentinelle « pas de donnée » : chaîne vide, tirets, null/undefined textuels. */
export function isBlank(raw: string | undefined | null): boolean {
  if (raw === undefined || raw === null) return true;
  const v = raw.trim();
  return v === '' || v === '-' || v === '—' || v.toLowerCase() === 'null' || v.toLowerCase() === 'undefined';
}

export interface NormalizedCell {
  value: unknown;
  messages: ImportMessage[];
}

/** Normalise une cellule selon le `field` et la spec du registre. */
export function normalizeCell(spec: FieldSpec, raw: string | undefined | null): NormalizedCell {
  const kind = fieldKind(spec);
  const messages: ImportMessage[] = [];

  if (isBlank(raw)) {
    // Un champ enum fermé peut légitimement être vide.
    return { value: kind === 'bool' ? false : kind === 'string' ? '' : null, messages };
  }

  const value = (raw as string).trim();

  switch (kind) {
    case 'int': {
      const n = toInt(value);
      if (n === null) {
        messages.push(err(spec.field, `« ${value} » n'est pas un nombre entier valide (${spec.label}).`));
        return { value: null, messages };
      }
      return { value: n, messages };
    }
    case 'date':
    case 'deadline': {
      if (!isStrictDate(value)) {
        messages.push(err(spec.field, `« ${value} » n'est pas une date valide (${spec.label}). Formats acceptés : AAAA-MM-JJ ou JJ/MM/AAAA.`));
        return { value: null, messages };
      }
      const d = parseDateSafe(value, kind === 'deadline');
      if (!d) {
        messages.push(err(spec.field, `« ${value} » n'est pas une date valide (${spec.label}). Formats acceptés : AAAA-MM-JJ ou JJ/MM/AAAA.`));
        return { value: null, messages };
      }
      return { value: d.toISOString(), messages };
    }
    case 'url': {
      const v = value === '' ? null : value;
      if (v && !URL_RE.test(v)) {
        messages.push(err(spec.field, `URL invalide : « ${v } » (${spec.label}). Format attendu : https://…`));
        return { value: null, messages };
      }
      return { value: v, messages };
    }
    case 'lines': {
      const list = value
        .split(/\r\n|\r|\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      return { value: list, messages };
    }
    case 'commas': {
      const list = value
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
      return { value: list, messages };
    }
    case 'bool': {
      return { value: toBool(value), messages };
    }
    case 'string':
    default: {
      if (spec.allowedValues && spec.allowedValues.length > 0) {
        const found = spec.allowedValues.find((a) => a.toLowerCase() === value.toLowerCase());
        if (found !== undefined) return { value: found, messages };
        messages.push(
          err(
            spec.field,
            `« ${value} » n'est pas une valeur valide pour ${spec.label}. Valeurs acceptées : ${spec.allowedValues.join(', ')}.`,
          ),
        );
        return { value: null, messages };
      }
      return { value, messages };
    }
  }
}

export interface NormalizedRow {
  data: Record<string, unknown>;
  messages: ImportMessage[];
  /** Champs présents dans le fichier et effectivement mappés. */
  presentFields: string[];
}

/** Normalise une ligne brute via la table d'association en-tête -> champ. */
export function normalizeRow(
  mapping: HeaderMapping[],
  raw: Record<string, string>,
): NormalizedRow {
  const data: Record<string, unknown> = {};
  const messages: ImportMessage[] = [];
  const presentFields: string[] = [];

  for (const entry of mapping) {
    if (!entry.spec) continue;
    const cell = normalizeCell(entry.spec, raw[entry.header]);
    if (cell.messages.length > 0) {
      messages.push(...cell.messages);
      continue;
    }
    data[entry.spec.field] = cell.value;
    presentFields.push(entry.spec.field);
  }

  return { data, messages, presentFields };
}
