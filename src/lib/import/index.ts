// ============================================================
// CONCOURS MAROC — Import direct de fichiers (surface publique)
//
// v1 : CONCOURS + MASTERS uniquement. Aucun AI / LLM / agent.
// Le preview (buildPreview) est strictement read-only ; les
// écritures passent exclusivement par les adaptateurs de data
// layer (adminBulkCreateConcours / POST /api/masters/bulk).
// ============================================================

export * from './types';
export { parseCsv, detectDelimiter, stripBom, CsvParseError } from './csv';
export {
  readFileToTable,
  readJson,
  readSpreadsheet,
  detectFormat,
  ImportReadError,
  SUPPORTED_EXTENSIONS,
} from './readers';
export type { ImportFormat } from './readers';
export {
  getFieldSpecs,
  getFieldSpec,
  getRequiredFields,
  buildHeaderMapping,
  normalizeHeader,
  assertRegistryLoaded,
} from './fieldRegistry';
export { normalizeCell, normalizeRow, isBlank } from './normalize';
export { validateConcoursRow, validateMastersRow, checkConcoursOrganisme } from './validate';
export {
  competitionDedupeKeys,
  mastersDedupeKeys,
  mastersDedupeKey,
  deterministicMasterId,
  indexByKeys,
  findExisting,
  keysIntersect,
  dedupeText,
  dedupeUrl,
} from './dedupe';
export { toCompetitionPayload, toMasterImportPayload } from './adapters';
export { buildPreview } from './buildPreview';
export type { BuildPreviewInput } from './buildPreview';
