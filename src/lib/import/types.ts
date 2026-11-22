// ============================================================
// CONCOURS MAROC — Admin Direct File Import : types partagés
//
// Ce module est volontairement "pur" : il n'importe NI db.ts,
// NI localStorage, NI fetch, NI aucun client IA. Le preview est
// donc structurellement read-only (invariant de l'import v1).
// ============================================================

import type { Competition, Ministry, School, University } from '../types';
import type { MasterItem } from '../mastersAdapter';
import type { ResolvedOrganisme } from '../organismeResolver';

/** Entités supportées par l'import v1. */
export type ImportEntity = 'CONCOURS' | 'MASTERS';

/** Statut d'une ligne après parsing + normalisation + validation. */
export type RowStatus = 'OK' | 'REVIEW' | 'ERROR' | 'DUPLICATE' | 'DUPLICATE_IN_FILE';

export const ROW_STATUSES: readonly RowStatus[] = [
  'OK',
  'REVIEW',
  'ERROR',
  'DUPLICATE',
  'DUPLICATE_IN_FILE',
] as const;

export interface ImportMessage {
  level: 'error' | 'warning' | 'info';
  field?: string;
  message: string;
}

/** Table brute : en-têtes + lignes, quel que soit le format d'origine. */
export interface RawTable {
  headers: string[];
  rows: Record<string, string>[];
}

export type ParsedCsvResult = {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: ',' | ';';
};

/** Référentiels injectés : c'est l'appelant qui fournit la DB, jamais le module. */
export interface ImportRefs {
  competitions: Competition[];
  masters: MasterItem[];
  schools: School[];
  ministries: Ministry[];
  universities: University[];
}

export const EMPTY_REFS: ImportRefs = {
  competitions: [],
  masters: [],
  schools: [],
  ministries: [],
  universities: [],
};

/** Référentiels d'organismes seuls (pour la résolution de référence). */
export interface OrganismeRefs {
  schools: School[];
  universities: University[];
  ministries: Ministry[];
}

export interface FieldSpec {
  /** Nom du champ métier (clé de dbField dans scraper/form-schemas.json). */
  field: string;
  /** Nom de colonne base de données (dbColumn). */
  column: string;
  /** Libellé lisible (FR). */
  label: string;
  required: boolean;
  transform?: string;
  /** Si présent et tableau : enum fermé, valeur invalide = ERROR. */
  allowedValues?: string[];
  /** En-têtes alternatifs acceptés (FR / AR / variantes). */
  aliases: string[];
}

export interface HeaderMapping {
  header: string;
  normalizedHeader: string;
  spec: FieldSpec | null;
}

export interface FieldDiff {
  field: string;
  incoming: unknown;
  existing: unknown;
}

export interface ImportRow {
  /** Numéro de ligne lisible dans le fichier, base 1. */
  index: number;
  raw: Record<string, string>;
  /** Valeurs normalisées, typées, prêtes pour validation. */
  data: Record<string, unknown>;
  status: RowStatus;
  messages: ImportMessage[];
  /** Clés de déduplication déterministes de la ligne. */
  dedupeKeys: string[];
  /** Identifiant de l'enregistrement existant en cas de DUPLICATE. */
  existingId?: string;
  /** Différences vs l'existant — informatif uniquement, aucun auto-update v1. */
  diff: FieldDiff[];
  /**
   * Organisme résolu au moment du preview (CONCOURS uniquement).
   * Conservé pour que le payload final soit IDENTIQUE à ce qui a
   * été validé et affiché, sans re-résoudre ni réinventer de valeur.
   */
  resolution?: ResolvedOrganisme;
  /** L'admin peut exclure une ligne de l'import confirmé. */
  include: boolean;
}

export type ImportCounts = Record<RowStatus, number> & { total: number };

export interface ImportPreview {
  entity: ImportEntity;
  fileName: string;
  format: 'json' | 'csv' | 'xlsx';
  headers: string[];
  mapping: HeaderMapping[];
  unmappedHeaders: string[];
  rows: ImportRow[];
  counts: ImportCounts;
  parserNotes: string[];
}

export interface ImportSummary {
  imported: number;
  duplicates: number;
  review: number;
  errors: number;
  details: string[];
}

export function emptyCounts(): ImportCounts {
  return {
    OK: 0,
    REVIEW: 0,
    ERROR: 0,
    DUPLICATE: 0,
    DUPLICATE_IN_FILE: 0,
    total: 0,
  };
}
