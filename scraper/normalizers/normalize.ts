// ============================================================
// Normaliseur — normalisation des chaînes, nettoyage des titres,
// finalisation d'un item (validation + empreinte de dédup).
// ============================================================

import type { ItemDraft, ScrapedItem } from '../lib/types';

export function normalizeStr(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`´]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(s: string): string {
  return normalizeStr(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Répare un encodage mojibake observé sur le flux Almaster
 * (ex : "RǸsultats" au lieu de "Résultats").
 */
export function repairTitle(title: string): string {
  return (title || '').replace(/[Ǹǹ]/g, (ch) => (ch === '\u01F8' ? 'E' : 'e'));
}

/** Nettoyage du titre : retire préfixes/années superflues. */
export function cleanTitle(title: string): string {
  let t = repairTitle(title.trim());

  const prefixes = [
    /^r[eé]sultats de?finitifs?\s*/i,
    /^r[eé]sultats\s*/i,
    /^avis de concours\s*/i,
    /^concours d'acc[eè]s\s*/i,
    /^concours de\s*/i,
    /^concours\s*/i,
    /^pr[ée]inscription\s*/i,
    /^inscription\s*/i,
    /^annonce de\s*/i,
    /^appel [aà] candidatures?\s*/i,
  ];
  for (const p of prefixes) t = t.replace(p, '');

  // "2026-2027" | "2026/2027" | "2026 2027"
  t = t.replace(/\b(20\d{2})\s*[-–/]\s*(20\d{2})\b/gi, ' ');
  // "au titre de l'année universitaire"
  t = t.replace(/\bau titre de l'ann[eé]e universitaire\b/gi, ' ');
  // "(au) cycle Master et Master Spécialisé"
  t = t.replace(/\bau cycle\s+master\s+et\s+master\s+sp[eé]cialis[eé]\b/gi, ' ');
  t = t.replace(/\bcyle\b/gi, 'cycle');
  t = t.replace(/\bcycle\s+master\b/gi, ' ');

  t = t.replace(/^[\s\-–:;|,]+|[\s\-–:;|,]+$/g, '');
  return t.trim() || title.trim();
}

export interface FinalizeResult {
  item: ScrapedItem;
  fingerprint: string;
}

/**
 * Valide et finalise un brouillon. Retourne null si l'item est inexploitable
 * (titre ou URL source manquante). Construit l'empreinte de dédup :
 * slug(titre)|slug(établissement||université||organisme)|année
 */
export function finalizeItem(draft: ItemDraft, source: string): ScrapedItem | null {
  const title = (draft.title || '').trim();
  const sourceUrl = (draft.sourceUrl || '').trim();
  if (!title || !sourceUrl) return null;

  const orgRef = draft.establishment || draft.university || draft.organization || '';
  const year = (draft.academicYear || '').slice(0, 4) || 'unknown';
  const fingerprint = `${slugify(title)}|${slugify(orgRef)}|${year}`;

  return {
    title,
    organization: draft.organization?.trim() || undefined,
    university: draft.university?.trim() || undefined,
    establishment: draft.establishment?.trim() || undefined,
    city: draft.city?.trim() || undefined,
    region: draft.region?.trim() || undefined,
    domain: draft.domain?.trim() || undefined,
    level: draft.level?.trim() || undefined,
    academicYear: draft.academicYear?.trim() || undefined,
    description: draft.description?.trim() || undefined,
    conditions: draft.conditions?.length ? draft.conditions : undefined,
    documents: draft.documents?.length ? draft.documents : undefined,
    places: draft.places ?? undefined,
    openingDate: draft.openingDate,
    deadlineDate: draft.deadlineDate,
    examDate: draft.examDate,
    resultsDate: draft.resultsDate,
    officialUrl: draft.officialUrl?.trim() || undefined,
    registrationUrl: draft.registrationUrl?.trim() || undefined,
    sourceUrl,
    category: draft.category?.trim() || undefined,
    source,
    publishedAt: draft.publishedAt,
    originalTitle: draft.originalTitle || undefined,
    tags: draft.tags?.length ? draft.tags : undefined,
    fingerprint,
    scrapedAt: new Date().toISOString(),
  };
}