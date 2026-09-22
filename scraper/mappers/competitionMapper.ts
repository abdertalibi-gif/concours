// competitionMapper — ScrapedItem → ValidatedPayload Competition (form AdminConcours)
import type { ScrapedItem } from '../lib/types';
import type { ValidatedPayload, FieldMeta, FieldStatus } from './types';
import { resolveSchool, resolveUniversity, resolveCity, resolveRegion, resolveDomain, resolveLevel, resolveCategory } from '../resolvers/referenceResolver';
import { slugify, uid } from './helpers';

function field(status: FieldStatus, targetField: string, value: unknown, opts: Partial<FieldMeta> = {}): FieldMeta {
  return { targetField, value, status, ...opts };
}

export function mapToCompetition(scraped: ScrapedItem): ValidatedPayload {
  const fields: Record<string, FieldMeta> = {};
  const errors: string[] = [];
  const warnings: string[] = [];
  const payload: Record<string, unknown> = {};
  const blockedReasons: string[] = [];

  // title — required
  if (!scraped.title?.trim()) {
    fields.title = field('BLOCKED', 'title', undefined, { sourceField: 'title', reason: 'titre manquant — obligatoire' });
    errors.push('title manquant'); blockedReasons.push('title manquant');
  } else {
    fields.title = field('AUTO', 'title', scraped.title.trim(), { sourceField: 'title' });
    payload.title = scraped.title.trim();
  }

  // organizationName — establishment||university||organization — required
  const orgName = (scraped.establishment || scraped.university || scraped.organization || '').trim() || null;
  if (!orgName) {
    fields.organizationName = field('BLOCKED', 'organizationName', null, { sourceField: 'establishment/university/organization', reason: '8/150 vides — obligatoire, REQUIRES_REVIEW' });
    errors.push('organizationName manquant'); blockedReasons.push('organizationName manquant');
    payload.organizationName = null;
  } else {
    fields.organizationName = field('AUTO', 'organizationName', orgName, { sourceField: 'establishment', reason: 'préférence establishment' });
    payload.organizationName = orgName;
  }

  // organizationType — default INSTITUTION, AUTO
  fields.organizationType = field('AUTO', 'organizationType', 'INSTITUTION', { sourceField: 'organizationType', reason: 'Almaster universitaire → INSTITUTION' });
  payload.organizationType = 'INSTITUTION';

  // schoolId / universityId — dérivés, REVIEW si pas de match
  const uniRes = resolveUniversity(scraped.university || null);
  const schoolRes = resolveSchool(scraped.establishment || null, uniRes.referenceId);
  if (schoolRes.status === 'AUTO' && schoolRes.matched) {
    fields.schoolId = field('AUTO', 'schoolId', schoolRes.referenceId, { sourceField: 'establishment', referenceId: schoolRes.referenceId, referenceLabel: schoolRes.matched.label, reason: schoolRes.reason });
    payload.schoolId = schoolRes.referenceId;
    payload.schoolSlug = (schoolRes as any).matched?.label ? slugify(schoolRes.matched!.label) : undefined;
  } else if (!scraped.establishment) {
    fields.schoolId = field('MISSING', 'schoolId', null, { sourceField: 'establishment', reason: 'pas d’établissement source' });
    payload.schoolId = undefined;
  } else {
    fields.schoolId = field('REVIEW', 'schoolId', null, { sourceField: 'establishment', reason: schoolRes.reason || 'aucune correspondance fiable' });
    payload.schoolId = undefined;
    warnings.push(`schoolId REVIEW: ${schoolRes.reason}`);
  }

  if (uniRes.status === 'AUTO' && uniRes.matched) {
    fields.universityId = field('AUTO', 'universityId', uniRes.referenceId, { sourceField: 'university', referenceId: uniRes.referenceId, reason: uniRes.reason });
    payload.universityId = uniRes.referenceId;
  } else if (!scraped.university) {
    fields.universityId = field('MISSING', 'universityId', null, { sourceField: 'university' });
    payload.universityId = undefined;
  } else {
    fields.universityId = field('REVIEW', 'universityId', null, { sourceField: 'university', reason: uniRes.reason });
    payload.universityId = undefined;
  }

  // city / region
  const cityRes = resolveCity(scraped.city || null);
  if (!scraped.city) {
    fields.city = field('BLOCKED', 'city', null, { sourceField: 'city', reason: 'ville manquante — obligatoire Competition' });
    errors.push('city manquant'); blockedReasons.push('city manquant');
  } else if (cityRes.status === 'AUTO') {
    fields.city = field('AUTO', 'city', cityRes.matched!.label, { sourceField: 'city', referenceId: cityRes.referenceId });
    payload.city = cityRes.matched!.label;
  } else {
    fields.city = field('REVIEW', 'city', scraped.city, { sourceField: 'city', reason: cityRes.reason });
    payload.city = scraped.city;
    warnings.push(`city REVIEW: ${cityRes.reason}`);
  }

  const regionRes = resolveRegion(scraped.region || null);
  if (!scraped.region) {
    fields.region = field('BLOCKED', 'region', null, { sourceField: 'region', reason: 'région manquante — obligatoire' });
    errors.push('region manquant'); blockedReasons.push('region manquant');
  } else if (regionRes.status === 'AUTO') {
    fields.region = field('AUTO', 'region', regionRes.matched!.label, { sourceField: 'region', referenceId: regionRes.referenceId });
    payload.region = regionRes.matched!.label;
  } else {
    fields.region = field('REVIEW', 'region', scraped.region, { sourceField: 'region', reason: regionRes.reason });
    payload.region = scraped.region;
  }

  // domaine
  const domRes = resolveDomain(scraped.domain || null);
  if (!scraped.domain) {
    fields.domaine = field('MISSING', 'domaine', null, { sourceField: 'domain', reason: '60/150 vides — optional' });
    payload.domaine = undefined;
  } else if (domRes.status === 'AUTO') {
    fields.domaine = field('AUTO', 'domaine', domRes.matched!.label, { sourceField: 'domain', referenceId: domRes.referenceId });
    payload.domaine = domRes.matched!.label;
  } else {
    fields.domaine = field('REVIEW', 'domaine', scraped.domain, { sourceField: 'domain', reason: domRes.reason });
    payload.domaine = scraped.domain;
  }

  // level
  const lvlRes = resolveLevel(scraped.level || null);
  if (!scraped.level) {
    fields.level = field('BLOCKED', 'level', null, { sourceField: 'level', reason: 'level manquant — obligatoire' });
    errors.push('level manquant'); blockedReasons.push('level manquant');
  } else if (lvlRes.status === 'AUTO') {
    fields.level = field('AUTO', 'level', lvlRes.matched!.label, { sourceField: 'level' });
    payload.level = lvlRes.matched!.label;
  } else {
    fields.level = field('REVIEW', 'level', scraped.level, { sourceField: 'level', reason: lvlRes.reason });
    payload.level = scraped.level;
  }

  // year — parseInt
  if (!scraped.academicYear) {
    fields.year = field('BLOCKED', 'year', null, { sourceField: 'academicYear', reason: 'année manquante — obligatoire' });
    errors.push('year manquant'); blockedReasons.push('year manquant');
  } else {
    const y = parseInt(String(scraped.academicYear).split('-')[0], 10);
    if (isNaN(y)) {
      fields.year = field('REVIEW', 'year', null, { sourceField: 'academicYear', reason: 'format année invalide' });
      payload.year = null;
      warnings.push('year format invalide');
    } else {
      fields.year = field('AUTO', 'year', y, { sourceField: 'academicYear', reason: 'parseInt YYYY-YYYY → YYYY' });
      payload.year = y;
    }
  }

  // places — UNSUPPORTED 0/150, jamais inventer
  if (scraped.places === null || scraped.places === undefined) {
    fields.places = field('BLOCKED', 'places', null, { sourceField: 'places', reason: '0/150 — obligatoire, REQUIRES_REVIEW, jamais inventer 35/100' });
    errors.push('places manquant'); blockedReasons.push('places manquant (0/150)');
    payload.places = null;
  } else {
    fields.places = field('AUTO', 'places', scraped.places, { sourceField: 'places', reason: 'parseInt' });
    payload.places = scraped.places;
  }

  // description — required, 150/150 présentes mais version clean
  const rawDesc = String(scraped.description || '').trim();
  if (!rawDesc || rawDesc.length < 50) {
    fields.description = field('BLOCKED', 'description', null, { sourceField: 'description', reason: 'description trop courte/manquant — obligatoire' });
    errors.push('description manquante'); blockedReasons.push('description manquante');
  } else {
    fields.description = field('AUTO', 'description', rawDesc, { sourceField: 'description', reason: '150/150, version clean proposée côté preview' });
    payload.description = rawDesc;
  }

  // conditions — UNSUPPORTED 0/150 → BLOCKED
  if (!scraped.conditions || scraped.conditions.length === 0) {
    fields.conditions = field('BLOCKED', 'conditions', null, { sourceField: 'conditions', reason: '0/150 — obligatoire, REQUIRES_REVIEW, jamais conditions génériques' });
    errors.push('conditions manquant'); blockedReasons.push('conditions manquant (0/150)');
    payload.conditions = null;
  } else {
    fields.conditions = field('AUTO', 'conditions', scraped.conditions, { sourceField: 'conditions', reason: "split('\\n')" });
    payload.conditions = scraped.conditions;
  }

  // matieres — UNSUPPORTED toujours → BLOCKED
  fields.matieres = field('BLOCKED', 'matieres', null, { sourceField: 'matieres', reason: 'jamais fourni — obligatoire, REQUIRES_REVIEW' });
  errors.push('matieres manquant'); blockedReasons.push('matieres manquant');
  payload.matieres = null;

  // epreuves — dérivée examDate
  if (!scraped.examDate) {
    fields.epreuves = field('MISSING', 'epreuves', null, { sourceField: 'examDate', reason: '128/150 vides — générique 3 phases si via Master, sinon MISSING' });
    payload.epreuves = null;
  } else {
    fields.epreuves = field('AUTO', 'epreuves', [`Épreuve : ${scraped.examDate}`], { sourceField: 'examDate' });
    payload.epreuves = [`Épreuve : ${scraped.examDate}`];
  }

  // documentsDemandes — required
  if (!scraped.documents || scraped.documents.length === 0) {
    fields.documentsDemandes = field('BLOCKED', 'documentsDemandes', null, { sourceField: 'documents', reason: '98/150 vides — obligatoire, REQUIRES_REVIEW' });
    errors.push('documentsDemandes manquant'); blockedReasons.push('documentsDemandes manquant');
    payload.documentsDemandes = null;
  } else {
    fields.documentsDemandes = field('AUTO', 'documentsDemandes', scraped.documents, { sourceField: 'documents' });
    payload.documentsDemandes = scraped.documents;
  }

  // procedure/frais/resultats/profil/programme — optional UNSUPPORTED
  fields.procedure = field('UNSUPPORTED', 'procedure', null, { sourceField: 'procedure', reason: 'absent flux — optional' });
  fields.frais = field('UNSUPPORTED', 'frais', null, { sourceField: 'frais', reason: 'absent flux — optional' });
  fields.resultats = field('MISSING', 'resultats', null, { sourceField: 'resultsDate', reason: 'optional' });
  fields.profil = field('UNSUPPORTED', 'profil', null, { sourceField: 'profil' });
  fields.programme = field('UNSUPPORTED', 'programme', null, { sourceField: 'programme' });
  payload.procedure = undefined; payload.frais = undefined; payload.profil = undefined; payload.programme = undefined;

  // dates → ISO
  const toISO = (v: string | null | undefined) => {
    if (!v) return undefined;
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  };
  fields.registrationStart = !scraped.openingDate ? field('MISSING', 'registrationStart', null, { sourceField: 'openingDate' }) : field('AUTO', 'registrationStart', toISO(scraped.openingDate), { sourceField: 'openingDate', reason: 'new Date(v).toISOString()' });
  payload.registrationStart = toISO(scraped.openingDate || null);

  fields.registrationDeadline = !scraped.deadlineDate ? field('MISSING', 'registrationDeadline', null, { sourceField: 'deadlineDate' }) : field('AUTO', 'registrationDeadline', toISO(scraped.deadlineDate), { sourceField: 'deadlineDate' });
  payload.registrationDeadline = toISO(scraped.deadlineDate || null);

  fields.competitionDate = !scraped.examDate ? field('MISSING', 'competitionDate', null, { sourceField: 'examDate' }) : field('AUTO', 'competitionDate', toISO(scraped.examDate), { sourceField: 'examDate' });
  payload.competitionDate = toISO(scraped.examDate || null);

  fields.convocationDate = field('UNSUPPORTED', 'convocationDate', null, { sourceField: 'convocationDate', reason: 'absent flux — optional' });
  payload.convocationDate = undefined;

  fields.resultsDate = !scraped.resultsDate ? field('MISSING', 'resultsDate', null, { sourceField: 'resultsDate' }) : field('AUTO', 'resultsDate', toISO(scraped.resultsDate), { sourceField: 'resultsDate' });
  payload.resultsDate = toISO(scraped.resultsDate || null);

  // URLs
  const isUrl = (v: string | null | undefined) => !!v && /^https?:\/\/.+/.test(String(v));
  if (!scraped.officialUrl) {
    fields.officialWebsite = field('MISSING', 'officialWebsite', null, { sourceField: 'officialUrl', reason: '27/150 sans official — optional' });
    payload.officialWebsite = undefined;
  } else if (!isUrl(scraped.officialUrl)) {
    fields.officialWebsite = field('REVIEW', 'officialWebsite', scraped.officialUrl, { sourceField: 'officialUrl', reason: 'URL invalide regex ^https?:\\/\\/.+' });
    payload.officialWebsite = scraped.officialUrl;
    warnings.push('officialWebsite URL invalide');
  } else {
    fields.officialWebsite = field('AUTO', 'officialWebsite', scraped.officialUrl, { sourceField: 'officialUrl' });
    payload.officialWebsite = scraped.officialUrl;
  }

  if (!scraped.registrationUrl) {
    fields.registrationUrl = field('MISSING', 'registrationUrl', null, { sourceField: 'registrationUrl' });
    payload.registrationUrl = undefined;
  } else if (!isUrl(scraped.registrationUrl)) {
    fields.registrationUrl = field('REVIEW', 'registrationUrl', scraped.registrationUrl, { sourceField: 'registrationUrl', reason: 'URL invalide' });
    payload.registrationUrl = scraped.registrationUrl;
  } else {
    fields.registrationUrl = field('AUTO', 'registrationUrl', scraped.registrationUrl, { sourceField: 'registrationUrl' });
    payload.registrationUrl = scraped.registrationUrl;
  }

  fields.sourceUrl = !scraped.sourceUrl ? field('MISSING', 'sourceUrl', null, { sourceField: 'sourceUrl' }) : field('AUTO', 'sourceUrl', scraped.sourceUrl, { sourceField: 'sourceUrl' });
  payload.sourceUrl = scraped.sourceUrl || undefined;

  fields.sourceOrganization = field('AUTO', 'sourceOrganization', orgName || null, { sourceField: 'organization' });
  payload.sourceOrganization = orgName || undefined;

  // category
  const catRes = resolveCategory('UNIVERSITE');
  fields.category = field('AUTO', 'category', 'UNIVERSITE', { sourceField: 'category', referenceId: catRes.referenceId, reason: 'master → UNIVERSITE' });
  payload.category = 'UNIVERSITE';

  // hidden: id, slug, publishStatus, verificationStatus, etc. — générés comme le form
  const slugVal = payload.title ? slugify(`${orgName}-${payload.title}-${payload.year || '2026'}`) : slugify(String(payload.title || 'concours'));
  fields.slug = field('AUTO', 'slug', slugVal, { reason: 'slugify(organizationName-title-year) slice 80' });
  payload.slug = slugVal;

  fields.id = field('AUTO', 'id', uid('c'), { reason: "uid('c') — comme AdminConcours.tsx:219" });
  payload.id = uid('c');

  fields.publishStatus = field('AUTO', 'publishStatus', 'DRAFT', { reason: 'default DRAFT — comme emptyForm' });
  payload.publishStatus = 'DRAFT';
  fields.verificationStatus = field('AUTO', 'verificationStatus', 'UNVERIFIED', { reason: 'default UNVERIFIED' });
  payload.verificationStatus = 'UNVERIFIED';
  fields.publishedAt = field('AUTO', 'publishedAt', new Date().toISOString(), { reason: 'now ISO' });
  payload.publishedAt = new Date().toISOString();
  fields.views = field('AUTO', 'views', 0, { reason: '0 par défaut' });
  payload.views = 0;
  fields.isDemo = field('AUTO', 'isDemo', false, {});
  payload.isDemo = false;
  fields.createdAt = field('AUTO', 'createdAt', new Date().toISOString(), {});
  payload.createdAt = new Date().toISOString();
  fields.updatedAt = field('AUTO', 'updatedAt', new Date().toISOString(), {});
  payload.updatedAt = new Date().toISOString();

  const blocked = blockedReasons.length > 0;
  const valid = !blocked && errors.length === 0;

  return {
    entityType: 'competition',
    payload,
    fields,
    valid,
    errors,
    warnings,
    blocked,
    blockedReasons,
  };
}
