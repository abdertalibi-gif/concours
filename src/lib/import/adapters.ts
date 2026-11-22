// ============================================================
// CONCOURS MAROC — Adaptateurs de mapping vers les data layers
//
// CONCOURS : produit un objet `Competition` conforme à
//   src/lib/types.ts, consommé par adminBulkCreateConcours().
// MASTERS  : produit un objet MasterItem consommé par
//   POST /api/masters/bulk.
//
// Les deux adaptateurs ne font QUE du mapping/normalisation en
// mémoire : aucune écriture, aucun appel réseau.
// ============================================================

import { slugify, uid } from '../utils';
import type { Competition, CompetitionCategory, OrgType, PublishStatus, VerificationStatus } from '../types';
import type { MasterItem } from '../mastersAdapter';
import type { ResolvedOrganisme } from '../organismeResolver';
import { deterministicMasterId, mastersDedupeKey } from './dedupe';

const COLORS = ['#0D47A1', '#C62828', '#2E7D32', '#4A148C', '#E65100', '#00695C', '#B71C1C', '#01579B', '#5D4037', '#37474F'];
const REGIONS = [
  'Rabat-Salé-Kénitra', 'Casablanca-Settat', 'Marrakech-Safi', 'Fès-Meknès',
  'Tanger-Tétouan-Al Hoceïma', 'Souss-Massa', 'Oriental', 'Béni Mellal-Khénifra',
  'Drâa-Tafilalet', 'Guelmim-Oued Noun', 'Laâyoune-Sakia El Hamra', 'Dakhla-Oued Ed-Dahab',
];

const DEFAULT_CONDITIONS = [
  'Titulaires d’une Licence fondamentale ou professionnelle ou diplôme équivalent',
  'Validation des modules prérequis requis par la filière',
  'Présélection sur dossier académique',
];

const DEFAULT_DOCUMENTS = [
  'Copie certifiée de la CIN',
  'Relevés de notes des 6 semestres',
  'Diplôme de la Licence ou attestation de réussite',
  'Curriculum Vitae (CV) détaillé avec photo',
  'Lettre de motivation signée',
];

function str(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (Array.isArray(value)) return value.join(', ');
  const s = String(value);
  return s === '' ? fallback : s;
}

function list(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const cleaned = value.map((v) => String(v).trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : fallback;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const cleaned = value
      .split(/\r\n|\r|\n/)
      .map((v) => v.trim())
      .filter(Boolean);
    return cleaned.length > 0 ? cleaned : fallback;
  }
  return fallback;
}

function opt(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s === '' ? undefined : s;
}

function intOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Nombre de places : par défaut 100 (cohérent avec emptyForm() du formulaire). */
function placesOrDefault(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 100;
}

/** Catégorie : seuls les codes du registre sont acceptés. */
const CATEGORIES: CompetitionCategory[] = ['ECOLE', 'MINISTERE', 'UNIVERSITE', 'INSTITUTION', 'RECRUTEMENT', 'FORMATION', 'AUTRE'];
const ORG_TYPES: OrgType[] = ['MINISTERE', 'ECOLE', 'INSTITUTION'];
const PUBLISH_STATUSES: PublishStatus[] = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED'];
const VERIF_STATUSES: VerificationStatus[] = ['UNVERIFIED', 'PENDING', 'VERIFIED', 'EXPIRED'];

function oneOf<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  if (typeof value !== 'string') return fallback;
  const found = allowed.find((a) => a.toLowerCase() === value.trim().toLowerCase());
  return found ?? fallback;
}

function bool(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

/**
 * Construit un `Competition` complet.
 * Les identifiants/generatedAt/viewed sont produits ici, comme le
 * fait le formulaire Admin.
 */
export function toCompetitionPayload(
  data: Record<string, unknown>,
  resolution: ResolvedOrganisme | null,
  now: Date = new Date(),
): Competition {
  const iso = now.toISOString();
  const year = typeof data.year === 'number' && Number.isFinite(data.year) ? data.year : now.getFullYear();

  const organizationName = resolution?.organizationName || str(data.organizationName, 'Organisme non renseigné');
  const organizationType = resolution?.organizationType
    ? oneOf<OrgType>(resolution.organizationType, ORG_TYPES, 'INSTITUTION')
    : oneOf<OrgType>(data.organizationType, ORG_TYPES, 'INSTITUTION');

  const schoolId = resolution?.schoolId ?? opt(data.schoolId);
  const ministryId = resolution?.ministryId ?? opt(data.ministryId);
  const universityId = resolution?.universityId ?? opt(data.universityId);

  // Le slug est déterministe : même fichier importé deux fois => même slug,
  // ce qui alimente la détection de DUPLICATE.
  const slug = slugify(`${organizationName}-${str(data.title, 'concours')}-${year}`);

  const category = oneOf<CompetitionCategory>(
    data.category,
    CATEGORIES,
    organizationType === 'MINISTERE' ? 'MINISTERE' : organizationType === 'ECOLE' ? 'ECOLE' : 'INSTITUTION',
  );

  return {
    id: uid('c'),
    slug,
    title: str(data.title, 'Concours sans titre'),
    organizationName,
    organizationType,
    schoolId,
    schoolSlug: undefined,
    schoolWebsite: opt(data.officialWebsite),
    universityId,
    ministryId,
    logoUrl: resolution?.logoUrl,
    officialLogo: resolution?.logoUrl,
    customLogo: undefined,
    logoColor: str(data.logoColor, COLORS[0]),
    category,
    year,
    level: str(data.level, 'Bac+3'),
    city: str(data.city, 'Rabat'),
    region: str(data.region, REGIONS[0]),
    domaine: opt(data.domaine),
    places: placesOrDefault(data.places),
    description: str(data.description),
    conditions: list(data.conditions, DEFAULT_CONDITIONS),
    profil: opt(data.profil),
    programme: opt(data.programme),
    matieres: list(data.matieres, []),
    epreuves: list(data.epreuves, []),
    documentsDemandes: list(data.documentsDemandes, DEFAULT_DOCUMENTS),
    procedure: opt(data.procedure),
    frais: opt(data.frais),
    resultats: opt(data.resultats),
    registrationStart: opt(data.registrationStart),
    registrationDeadline: opt(data.registrationDeadline),
    competitionDate: opt(data.competitionDate),
    convocationDate: opt(data.convocationDate),
    resultsDate: opt(data.resultsDate),
    publishedAt: iso,
    officialWebsite: opt(data.officialWebsite),
    registrationUrl: opt(data.registrationUrl),
    sourceUrl: opt(data.sourceUrl),
    sourceOrganization: opt(data.sourceOrganization) ?? organizationName,
    verificationStatus: oneOf<VerificationStatus>(data.verificationStatus, VERIF_STATUSES, 'UNVERIFIED'),
    verifiedAt: undefined,
    verifiedBy: undefined,
    publishStatus: oneOf<PublishStatus>(data.publishStatus, PUBLISH_STATUSES, 'DRAFT'),
    manualStatus: opt(data.manualStatus) as Competition['manualStatus'],
    views: 0,
    isDemo: bool(data.isDemo),
    createdAt: iso,
    updatedAt: iso,
  };
}

const MASTER_STATUSES: MasterItem['status'][] = [
  'OUVERT', 'FERME', 'A_VENIR', 'CONCOURS_A_VENIR', 'RESULTATS', 'INFORMATION',
];

function isoOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/**
 * Construit un `MasterItem` avec identifiants DÉTERMINISTES.
 *
 * createMaster() (server/services/mastersService.ts) génère son id et
 * sa uniqueKey avec Date.now(), ce qui n'est pas idempotent. L'import
 * ne l'utilise jamais : uniqueKey est dérivée de
 * (université, établissement, intitulé, année) et id de la uniqueKey,
 * donc réimporter le même fichier ne crée aucun doublon.
 *
 * Le champ `status` est recalculé côté serveur à l'écriture
 * (computeMasterStatus) ; la valeur fournie ici n'est qu'un défaut.
 */
export function toMasterImportPayload(
  data: Record<string, unknown>,
  now: Date = new Date(),
): MasterItem {
  const iso = now.toISOString();
  const university = str(data.university, 'Université Marocaine');
  const establishment = str(data.establishment, 'Faculté / Établissement');
  const name = str(data.name, 'Nouveau Master Universitaire');
  const academicYear = str(data.academicYear, '2026-2027');

  const uniqueKey = mastersDedupeKey({ university, establishment, name, academicYear });

  return {
    id: deterministicMasterId(uniqueKey),
    uniqueKey,
    name,
    university,
    establishment,
    city: str(data.city, 'Rabat'),
    domain: str(data.domain, 'Sciences et Technologies'),
    level: str(data.level, 'Master Spécialisé / MST'),
    academicYear,
    openingDate: isoOrNull(data.openingDate),
    deadlineDate: isoOrNull(data.deadlineDate),
    examDate: isoOrNull(data.examDate),
    publicationDate: isoOrNull(data.publicationDate) ?? iso.split('T')[0],
    resultsDate: isoOrNull(data.resultsDate),
    conditions: opt(data.conditions) ?? null,
    documents: opt(data.documents) ?? null,
    seats: intOrNull(data.seats),
    officialUrl: opt(data.officialUrl) ?? null,
    sourceUrl: opt(data.sourceUrl) ?? '',
    status: oneOf<MasterItem['status']>(data.status, MASTER_STATUSES, 'INFORMATION'),
    createdAt: iso,
    updatedAt: iso,
  };
}
