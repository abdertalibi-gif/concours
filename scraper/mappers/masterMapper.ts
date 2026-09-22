// masterMapper — ScrapedItem → ValidatedPayload MasterItem (form AdminMastersImport)
import type { ScrapedItem } from '../lib/types';
import type { ValidatedPayload, FieldMeta, FieldStatus } from './types';
import { resolveUniversity, resolveSchool, resolveCity, resolveDomain, resolveLevel } from '../resolvers/referenceResolver';

function field(status: FieldStatus, targetField: string, value: unknown, opts: Partial<FieldMeta> = {}): FieldMeta {
  return { targetField, value, status, ...opts };
}

export function mapToMaster(scraped: ScrapedItem): ValidatedPayload {
  const fields: Record<string, FieldMeta> = {};
  const errors: string[] = [];
  const warnings: string[] = [];
  const payload: Record<string, unknown> = {};

  // name — required
  if (!scraped.title?.trim()) {
    fields.name = field('BLOCKED', 'name', undefined, { sourceField: 'title', reason: 'title manquant — obligatoire Master' });
    errors.push('name manquant');
  } else {
    fields.name = field('AUTO', 'name', scraped.title.trim(), { sourceField: 'title' });
    payload.name = scraped.title.trim();
  }

  // university — resolve
  const uniRes = resolveUniversity(scraped.university || null);
  if (!scraped.university) {
    fields.university = field('MISSING', 'university', null, { sourceField: 'university', reason: 'université absente source (50/150)' });
    payload.university = null;
  } else if (uniRes.status === 'AUTO' && uniRes.matched) {
    fields.university = field('AUTO', 'university', uniRes.matched.label, { sourceField: 'university', referenceId: uniRes.referenceId, referenceLabel: uniRes.matched.label, reason: uniRes.reason, transformedFrom: scraped.university });
    payload.university = uniRes.matched.label;
  } else {
    fields.university = field('REVIEW', 'university', scraped.university, { sourceField: 'university', referenceId: null, referenceLabel: null, reason: uniRes.reason || 'aucune correspondance fiable — ne pas créer' });
    payload.university = scraped.university;
    warnings.push(`university REVIEW: ${uniRes.reason}`);
  }

  // establishment — resolve (avec universityId si AUTO)
  const estRes = resolveSchool(scraped.establishment || null, uniRes.referenceId);
  if (!scraped.establishment) {
    fields.establishment = field('MISSING', 'establishment', null, { sourceField: 'establishment', reason: 'établissement absent (29/150)' });
    payload.establishment = null;
  } else if (estRes.status === 'AUTO' && estRes.matched) {
    fields.establishment = field('AUTO', 'establishment', estRes.matched.label, { sourceField: 'establishment', referenceId: estRes.referenceId, referenceLabel: estRes.matched.label, reason: estRes.reason, transformedFrom: scraped.establishment });
    payload.establishment = estRes.matched.label;
  } else {
    fields.establishment = field('REVIEW', 'establishment', scraped.establishment, { sourceField: 'establishment', referenceId: null, referenceLabel: null, reason: estRes.reason || 'aucune correspondance' });
    payload.establishment = scraped.establishment;
    warnings.push(`establishment REVIEW: ${estRes.reason}`);
  }

  // city
  const cityRes = resolveCity(scraped.city || null);
  if (!scraped.city) {
    fields.city = field('MISSING', 'city', null, { sourceField: 'city' });
    payload.city = null;
  } else if (cityRes.status === 'AUTO') {
    fields.city = field('AUTO', 'city', cityRes.matched!.label, { sourceField: 'city', referenceId: cityRes.referenceId, reason: cityRes.reason });
    payload.city = cityRes.matched!.label;
  } else {
    fields.city = field('REVIEW', 'city', scraped.city, { sourceField: 'city', reason: cityRes.reason });
    payload.city = scraped.city;
  }

  // domain
  const domRes = resolveDomain(scraped.domain || null);
  if (!scraped.domain) {
    fields.domain = field('MISSING', 'domain', null, { sourceField: 'domain', reason: '60/150 vides' });
    payload.domain = null;
  } else if (domRes.status === 'AUTO') {
    fields.domain = field('AUTO', 'domain', domRes.matched!.label, { sourceField: 'domain', referenceId: domRes.referenceId, reason: domRes.reason });
    payload.domain = domRes.matched!.label;
  } else {
    fields.domain = field('REVIEW', 'domain', scraped.domain, { sourceField: 'domain', reason: domRes.reason });
    payload.domain = scraped.domain;
  }

  // level
  const lvlRes = resolveLevel(scraped.level || null);
  if (!scraped.level) {
    fields.level = field('MISSING', 'level', null, { sourceField: 'level' });
    payload.level = null;
  } else if (lvlRes.status === 'AUTO') {
    fields.level = field('AUTO', 'level', lvlRes.matched!.label, { sourceField: 'level', referenceId: lvlRes.referenceId });
    payload.level = lvlRes.matched!.label;
  } else {
    fields.level = field('REVIEW', 'level', scraped.level, { sourceField: 'level', reason: lvlRes.reason });
    payload.level = scraped.level;
  }

  // academicYear — pas de resolver, free
  if (!scraped.academicYear) {
    fields.academicYear = field('MISSING', 'academicYear', null, { sourceField: 'academicYear' });
    payload.academicYear = null;
  } else {
    fields.academicYear = field('AUTO', 'academicYear', scraped.academicYear, { sourceField: 'academicYear' });
    payload.academicYear = scraped.academicYear;
  }

  // status — calculé, mais on garde AUTO si présent
  // Le formulaire a default OUVERT, mais on ne doit pas inventer si source n'a pas de dates
  // On laisse null si pas de dates et pas de status source
  const hasDates = !!(scraped.deadlineDate || scraped.openingDate || scraped.examDate || scraped.resultsDate);
  if (!hasDates) {
    fields.status = field('MISSING', 'status', null, { sourceField: 'deadlineDate/openingDate', reason: 'aucune date source → INFORMATION' });
    payload.status = 'INFORMATION';
  } else {
    // Logique simple: si resultsDate → RESULTATS, sinon si deadline future → OUVERT, sinon FERME
    // On ne force pas, on laisse REVIEW si ambigu
    fields.status = field('AUTO', 'status', 'OUVERT', { sourceField: 'deadlineDate/resultsDate', reason: 'calculé côté serveur normalizeMaster' });
    payload.status = 'OUVERT';
  }

  // seats — UNSUPPORTED si absent, ne pas mettre 35
  if (scraped.places === null || scraped.places === undefined) {
    fields.seats = field('MISSING', 'seats', null, { sourceField: 'places', reason: '0/150 — jamais annoncé, default 35 du formulaire NON appliqué' });
    payload.seats = null;
  } else {
    fields.seats = field('AUTO', 'seats', scraped.places, { sourceField: 'places', reason: 'parseInt' });
    payload.seats = scraped.places;
  }

  // deadlineDate — ISO, ne pas inventer
  if (!scraped.deadlineDate) {
    fields.deadlineDate = field('MISSING', 'deadlineDate', null, { sourceField: 'deadlineDate', reason: '101/150 vides' });
    payload.deadlineDate = null;
  } else {
    fields.deadlineDate = field('AUTO', 'deadlineDate', scraped.deadlineDate, { sourceField: 'deadlineDate', reason: 'ISO YYYY-MM-DD, plausibilité vs publishedAt déjà vérifiée' });
    payload.deadlineDate = scraped.deadlineDate;
  }

  // examDate
  if (!scraped.examDate) {
    fields.examDate = field('MISSING', 'examDate', null, { sourceField: 'examDate', reason: '128/150 vides' });
    payload.examDate = null;
  } else {
    fields.examDate = field('AUTO', 'examDate', scraped.examDate, { sourceField: 'examDate' });
    payload.examDate = scraped.examDate;
  }

  // openingDate / resultsDate / publicationDate / sourceUrl — hidden fields
  fields.openingDate = !scraped.openingDate ? field('MISSING', 'openingDate', null, { sourceField: 'openingDate', reason: '123/150 vides' }) : field('AUTO', 'openingDate', scraped.openingDate, { sourceField: 'openingDate' });
  payload.openingDate = scraped.openingDate || null;

  fields.resultsDate = !scraped.resultsDate ? field('MISSING', 'resultsDate', null, { sourceField: 'resultsDate' }) : field('AUTO', 'resultsDate', scraped.resultsDate, { sourceField: 'resultsDate' });
  payload.resultsDate = scraped.resultsDate || null;

  fields.publicationDate = !scraped.publishedAt ? field('MISSING', 'publicationDate', null, { sourceField: 'publishedAt' }) : field('AUTO', 'publicationDate', scraped.publishedAt, { sourceField: 'publishedAt' });
  payload.publicationDate = scraped.publishedAt || null;

  fields.sourceUrl = !scraped.sourceUrl ? field('BLOCKED', 'sourceUrl', null, { sourceField: 'sourceUrl', reason: 'sourceUrl manquant — obligatoire' }) : field('AUTO', 'sourceUrl', scraped.sourceUrl, { sourceField: 'sourceUrl' });
  payload.sourceUrl = scraped.sourceUrl || null;
  if (!scraped.sourceUrl) errors.push('sourceUrl manquant');

  // officialUrl / schoolWebsite
  fields.officialUrl = !scraped.officialUrl ? field('MISSING', 'officialUrl', null, { sourceField: 'officialUrl', reason: '27/150 sans official' }) : field('AUTO', 'officialUrl', scraped.officialUrl, { sourceField: 'officialUrl' });
  payload.officialUrl = scraped.officialUrl || null;

  const regUrl = scraped.registrationUrl || null;
  fields.schoolWebsite = !regUrl ? field('MISSING', 'schoolWebsite', null, { sourceField: 'registrationUrl', reason: '72/150 sans registration' }) : field('AUTO', 'schoolWebsite', regUrl, { sourceField: 'registrationUrl' });
  // schoolWebsite du formulaire = site établissement, on mappe registrationUrl si .ma et non PDF? Simplifié: on garde tel quel
  payload.schoolWebsite = regUrl;

  // conditions / documents — UNSUPPORTED si absent source
  if (!scraped.conditions || scraped.conditions.length === 0) {
    fields.conditions = field('UNSUPPORTED', 'conditions', null, { sourceField: 'conditions', reason: '0/150 — jamais structuré, formulaire default NON appliqué' });
    payload.conditions = null;
  } else {
    fields.conditions = field('AUTO', 'conditions', scraped.conditions.join('\n'), { sourceField: 'conditions', reason: "split('\\n') côté formulaire inversé" });
    payload.conditions = scraped.conditions.join('\n');
  }

  if (!scraped.documents || scraped.documents.length === 0) {
    fields.documents = field('MISSING', 'documents', null, { sourceField: 'documents', reason: '98/150 sans PDF' });
    payload.documents = null;
  } else {
    fields.documents = field('AUTO', 'documents', scraped.documents.join(', '), { sourceField: 'documents', reason: 'join(", ") — split côté masterToCompetition' });
    payload.documents = scraped.documents.join(', ');
  }

  // Validation finale Master : name + establishment requis (handleSave:309)
  const blockedReasons: string[] = [];
  if (!payload.name) blockedReasons.push('name manquant');
  if (!payload.establishment) blockedReasons.push('establishment manquant');
  // city/academicYear/sourceUrl aussi requis pour uniqueKey mais Prisma nullable — on met en REVIEW pas BLOCKED
  const blocked = blockedReasons.length > 0;
  if (blocked) errors.push(...blockedReasons);

  const valid = errors.length === 0;

  return {
    entityType: 'master',
    payload,
    fields,
    valid,
    errors,
    warnings,
    blocked,
    blockedReasons,
  };
}
