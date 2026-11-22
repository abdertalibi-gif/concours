// ============================================================
// CONCOURS MAROC — Clés de déduplication déterministes
//
// Règle v1 : toute correspondance avec un enregistrement existant
// produit DUPLICATE et la ligne est IGNORÉE. Aucun auto-update,
// même si les données entrantes diffèrent. La comparaison est
// purement textuelle et ne dépend ni de Date.now() ni d'un
// aléa, afin que deux imports du même fichier donnent le même
// résultat.
// ============================================================

/** Nettoie une chaîne pour la comparaison (casse, accents, espaces). */
export function dedupeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Normalise une URL pour la comparaison (protocole/fin de slash). */
export function dedupeUrl(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return v.replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
}

export interface CompetitionKeyInput {
  slug?: string | null;
  sourceUrl?: string | null;
  schoolId?: string | null;
  title?: string | null;
  year?: number | null;
}

/**
 * Ensemble de clés pour un concours. Une ligne est un doublon si
 * elle partage au moins UNE clé avec l'existant. Les trois critères
 * sont ceux déjà utilisés par l'import JSON historique
 * (AdminConcours.tsx) : slug, URL source, école+titre+année.
 */
export function competitionDedupeKeys(input: CompetitionKeyInput): string[] {
  const keys: string[] = [];

  const slug = (input.slug ?? '').trim();
  if (slug) keys.push(`slug:${slug}`);

  const src = dedupeUrl(input.sourceUrl);
  if (src) keys.push(`src:${src}`);

  const schoolId = (input.schoolId ?? '').trim();
  const title = dedupeText(input.title);
  if (schoolId && title && input.year) {
    keys.push(`combo:${schoolId}|${title}|${input.year}`);
  }

  return keys;
}

export interface MastersKeyInput {
  university?: string | null;
  establishment?: string | null;
  name?: string | null;
  academicYear?: string | null;
}

function cleanKeyPart(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Clé unique d'un master. Miroir exact de
 * server/services/mastersService.ts :: generateUniqueKey
 * (université - établissement - intitulé - année universitaire).
 */
export function mastersDedupeKey(input: MastersKeyInput): string {
  return [input.university, input.establishment, input.name, input.academicYear]
    .map(cleanKeyPart)
    .join('-');
}

/** Clés de déduplication d'un master : uniqueKey + id. */
export function mastersDedupeKeys(input: MastersKeyInput): string[] {
  const uniqueKey = mastersDedupeKey(input);
  return [`uk:${uniqueKey}`, `id:${deterministicMasterId(uniqueKey)}`];
}

/**
 * Identifiant déterministe d'un master.
 * createMaster() utilise Date.now() et n'est donc PAS idempotent ;
 * l'import ne l'utilise jamais et dérive l'id de la uniqueKey.
 */
export function deterministicMasterId(uniqueKey: string): string {
  return `mst-${uniqueKey}`.slice(0, 120);
}

/** Deux ensembles de clés se recoupent-ils ? */
export function keysIntersect(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(a);
  for (const key of b) {
    if (set.has(key)) return true;
  }
  return false;
}

/** Indexe des enregistrements existants par clés, pour recherche O(1). */
export function indexByKeys<T>(items: T[], keyFn: (item: T) => string[]): Map<string, T> {
  const index = new Map<string, T>();
  for (const item of items) {
    for (const key of keyFn(item)) {
      if (!index.has(key)) index.set(key, item);
    }
  }
  return index;
}

/** Retrouve l'enregistrement existant correspondant à un ensemble de clés. */
export function findExisting<T>(index: Map<string, T>, keys: string[]): T | undefined {
  for (const key of keys) {
    const hit = index.get(key);
    if (hit !== undefined) return hit;
  }
  return undefined;
}
