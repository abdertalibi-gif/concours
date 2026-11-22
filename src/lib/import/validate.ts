// ============================================================
// CONCOURS MAROC — Validation des lignes importées
//
// Règles derivatives de scraper/form-schemas.json :
//   competition.validation =
//     ["title required", "organizationName required",
//      "description required", "places>=1", "deadline>=start",
//      "URL regex for officialWebsite/registrationUrl"]
//
// Convention de statut :
//   ERROR  -> donnée manquante / invalide, ligne non importable
//   REVIEW -> référence d'organisme non résolue ou ambiguë.
//             L'admin tranche dans l'aperçu. On n'invente JAMAIS
//             de référence ni de statut bidon (ex. « A_VERIFIER »)
// ============================================================

import { resolveOrganismeWithRefs, type ResolvedOrganisme } from '../organismeResolver';
import type { ImportMessage, OrganismeRefs, RowStatus } from './types';
import { getFieldSpecs } from './fieldRegistry';
import { isBlank } from './normalize';

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(' | ');
  return String(value);
}

function hasErrors(messages: ImportMessage[]): boolean {
  return messages.some((m) => m.level === 'error');
}

export interface OrganismeCheck {
  status: RowStatus;
  messages: ImportMessage[];
  resolution: ResolvedOrganisme | null;
}

/**
 * Contrôle les références d'organisme d'un concours.
 * Référence inconnue => REVIEW (jamais une référence inventée).
 */
export function checkConcoursOrganisme(
  data: Record<string, unknown>,
  refs: OrganismeRefs,
): OrganismeCheck {
  const messages: ImportMessage[] = [];
  const schoolId = asString(data.schoolId).trim();
  const ministryId = asString(data.ministryId).trim();
  const universityId = asString(data.universityId).trim();

  if (schoolId && !refs.schools.some((s) => s.id === schoolId)) {
    messages.push({
      level: 'warning',
      field: 'schoolId',
      message: `École inconnue : « ${schoolId} ». À sélectionner manuellement ou laisser vide.`,
    });
  }
  if (ministryId && !refs.ministries.some((m) => m.id === ministryId)) {
    messages.push({
      level: 'warning',
      field: 'ministryId',
      message: `Ministère inconnu : « ${ministryId} ». À sélectionner manuellement ou laisser vide.`,
    });
  }
  if (universityId && !refs.universities.some((u) => u.id === universityId)) {
    messages.push({
      level: 'warning',
      field: 'universityId',
      message: `Université inconnue : « ${universityId} ».`,
    });
  }

  const hasUnresolvedExplicitRef =
    (schoolId !== '' && !refs.schools.some((s) => s.id === schoolId)) ||
    (ministryId !== '' && !refs.ministries.some((m) => m.id === ministryId)) ||
    (universityId !== '' && !refs.universities.some((u) => u.id === universityId));

  const resolution = resolveOrganismeWithRefs(refs, {
    schoolId: schoolId || undefined,
    ministryId: ministryId || undefined,
    organizationName: asString(data.organizationName) || undefined,
    title: asString(data.title) || undefined,
    description: asString(data.description) || undefined,
    sourceUrl: asString(data.sourceUrl) || undefined,
    officialWebsite: asString(data.officialWebsite) || undefined,
  });

  const needsReview =
    hasUnresolvedExplicitRef ||
    (schoolId === '' && ministryId === '' && resolution.requiresManualSelection);

  if (needsReview) {
    messages.push({
      level: 'warning',
      field: 'organizationName',
      message:
        'Organisme non résolu de façon univoque. Choisissez un établissement/ministère existant dans l\'aperçu, ou importez en brouillon non rattaché.',
    });
  }

  return {
    status: needsReview ? 'REVIEW' : 'OK',
    messages,
    resolution,
  };
}

/** Validation métier d'un concours. Ne modifie rien. */
export function validateConcoursRow(
  data: Record<string, unknown>,
  refs: OrganismeRefs,
  normalizeErrors: ImportMessage[],
): { status: RowStatus; messages: ImportMessage[]; resolution: ResolvedOrganisme | null } {
  const messages: ImportMessage[] = [...normalizeErrors];
  const required = getFieldSpecs('CONCOURS').filter((s) => s.required).map((s) => s.field);

  for (const field of required) {
    const value = data[field];
    const empty =
      value === null ||
      value === undefined ||
      (typeof value === 'string' && isBlank(value)) ||
      (Array.isArray(value) && value.length === 0);
    if (empty) {
      messages.push({ level: 'error', field, message: `Champ obligatoire manquant : ${field}.` });
    }
  }

  const places = typeof data.places === 'number' ? data.places : null;
  if (places !== null && places < 1) {
    messages.push({ level: 'error', field: 'places', message: 'Le nombre de places doit être >= 1.' });
  }

  // Contrôle croisé deadline >= ouverture
  const start = typeof data.registrationStart === 'string' ? Date.parse(data.registrationStart) : NaN;
  const deadline = typeof data.registrationDeadline === 'string' ? Date.parse(data.registrationDeadline) : NaN;
  if (!Number.isNaN(start) && !Number.isNaN(deadline) && deadline < start) {
    messages.push({
      level: 'error',
      field: 'registrationDeadline',
      message: 'La clôture des inscriptions est antérieure à leur ouverture.',
    });
  }

  const org = checkConcoursOrganisme(data, refs);
  messages.push(...org.messages);

  let status: RowStatus = 'OK';
  if (hasErrors(messages)) status = 'ERROR';
  else if (org.status === 'REVIEW') status = 'REVIEW';

  return { status, messages, resolution: org.resolution };
}

/** Validation métier d'un master. Ne modifie rien. */
export function validateMastersRow(
  data: Record<string, unknown>,
  normalizeErrors: ImportMessage[],
): { status: RowStatus; messages: ImportMessage[] } {
  const messages: ImportMessage[] = [...normalizeErrors];
  const required = getFieldSpecs('MASTERS').filter((s) => s.required).map((s) => s.field);

  for (const field of required) {
    const value = data[field];
    if (isBlank(asString(value))) {
      messages.push({ level: 'error', field, message: `Champ obligatoire manquant : ${field}.` });
    }
  }

  const opening = typeof data.openingDate === 'string' ? Date.parse(data.openingDate) : NaN;
  const deadline = typeof data.deadlineDate === 'string' ? Date.parse(data.deadlineDate) : NaN;
  if (!Number.isNaN(opening) && !Number.isNaN(deadline) && deadline < opening) {
    messages.push({
      level: 'error',
      field: 'deadlineDate',
      message: 'La date limite de candidature est antérieure à la date d\'ouverture.',
    });
  }

  const status: RowStatus = hasErrors(messages) ? 'ERROR' : 'OK';
  return { status, messages };
}
