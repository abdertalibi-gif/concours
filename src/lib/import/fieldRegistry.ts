// ============================================================
// CONCOURS MAROC — Registre de champs de l'import Admin
//
// Source de vérité : scraper/form-schemas.json
//   registry.competition.fields  (dbField / dbColumn / required /
//                                allowedValues / transform)
//   registry.master.fields       (+ hiddenFields importables)
//
// Le JSON fournit la spécification canonique ; les alias
// d'en-têtes (variantes FR, abréviations, colonnes arabes) sont
// déclarés ici car ils n'existent pas dans le registre.
//
// Aucun import de db.ts : ce module reste pur.
// ============================================================

import registryJson from '../../../scraper/form-schemas.json';
import type { FieldSpec, ImportEntity } from './types';

interface SchemaField {
  label?: string;
  required?: boolean;
  allowedValues?: string[] | string;
  transform?: string;
  dbField?: string;
  dbColumn?: string;
}

interface SchemaEntry {
  entity?: string;
  dbTable?: string;
  fields?: Record<string, SchemaField>;
  hiddenFields?: Record<string, SchemaField>;
  validation?: string[];
}

interface FormSchemas {
  registry?: {
    competition?: SchemaEntry;
    master?: SchemaEntry;
  };
}

const SCHEMAS = registryJson as unknown as FormSchemas;

/** Champs masqués générés : jamais importables depuis un fichier. */
const GENERATED_FIELDS = new Set(['id', 'slug', 'createdAt', 'updatedAt', 'publishedAt', 'views', 'logoUrl', 'uniqueKey']);

/** Champs masqués d'un master qui sont en revanche fournis par les fichiers. */
const IMPORTABLE_HIDDEN_MASTER_FIELDS = ['openingDate', 'publicationDate', 'resultsDate', 'sourceUrl'];

/**
 * Alias d'en-têtes acceptés en plus du nom de champ.
 * Clé = nom de champ métier. Valeur = variantes d'en-tête normalisées
 * par `normalizeHeader` (minuscules, sans accents, non-alphanumériques
 * remplacés par « _ »).
 */
const HEADER_ALIASES: Record<ImportEntity, Record<string, string[]>> = {
  CONCOURS: {
    title: ['intitule', 'intitule_concours', 'nom_concours', 'concours', 'titre', 'اسم_المباراة', 'عنوان'],
    organizationName: ['organisme', 'nom_organisme', 'etablissement', 'institution', 'الجهة', 'المؤسسة'],
    organizationType: ['type_organisme', 'organisme_type', 'type_organisme'],
    schoolId: ['school_id', 'id_ecole', 'ecole_id', 'code_ecole'],
    ministryId: ['ministry_id', 'id_ministere', 'ministere_id', 'code_ministere'],
    category: ['categorie', 'type_concours'],
    year: ['annee', 'annee_concours', 'exercice', 'السنة', 'سنة'],
    level: ['niveau', 'niveau_diplome', 'diplome'],
    city: ['ville', 'localite'],
    region: ['region', 'region_administrative'],
    domaine: ['domaine', 'filiere', 'specialite', 'المجال'],
    places: ['nombre_places', 'nb_places', 'place', 'effectif', 'places_offertes', 'عدد_المقاعد'],
    description: ['description', 'resume', 'presentation'],
    conditions: ['conditions', 'conditions_acces', 'conditions_admission'],
    epreuves: ['epreuves', 'epreuve', 'examens'],
    matieres: ['matieres', 'matieres_objet', 'disciplines'],
    documentsDemandes: ['documents', 'documents_demandes', 'pieces_demandees', 'dossier'],
    profil: ['profil', 'profil_demande'],
    programme: ['programme', 'programme_detaille'],
    procedure: ['procedure', 'procedure_inscription', 'modalites'],
    frais: ['frais', 'frais_inscription', 'tarif'],
    resultats: ['resultats', 'liste_resultats'],
    registrationStart: ['ouverture', 'date_ouverture', 'debut_inscriptions', 'date_debut', 'date_inscription_debut'],
    registrationDeadline: [
      'date_limite',
      'cloture',
      'cloture_inscriptions',
      'date_cloture',
      'fin_inscriptions',
      'date_limite_inscription',
      'deadline',
      'تاريخ_إغلاق_التسجيل',
    ],
    competitionDate: ['date_concours', 'date_epreuve', 'date_examen', 'date_competition'],
    convocationDate: ['date_convocation', 'convocation'],
    resultsDate: ['date_resultats', 'date_publication_resultats', 'نتائج'],
    officialWebsite: ['site_officiel', 'site_web', 'website', 'url_officielle', 'الموقع_الرسمي'],
    registrationUrl: ['url_inscription', 'lien_inscription', 'lien_candidature', 'url_candidature', 'رابط_التسجيل'],
    sourceUrl: ['url_source', 'source', 'lien_source', 'url'],
    sourceOrganization: ['organisme_source', 'source_organisme'],
    publishStatus: ['statut_publication', 'publication'],
    verificationStatus: ['verification', 'statut_verification'],
    manualStatus: ['statut_force', 'forcer_statut'],
    logoColor: ['couleur', 'couleur_logo'],
    isDemo: ['demo', 'est_demo', 'is_demo'],
  },
  MASTERS: {
    name: ['intitule', 'intitule_master', 'nom', 'nom_master', 'master', 'اسم_الماستر'],
    establishment: ['etablissement', 'faculte', 'faculte_etablissement', 'structure'],
    university: ['universite', 'universite_rattachement', 'الجامعة'],
    city: ['ville', 'localite'],
    domain: ['domaine', 'filiere', 'specialite'],
    level: ['niveau', 'niveau_diplome', 'type_diplome', 'diplome'],
    academicYear: ['annee_universitaire', 'annee_academique', 'annee_scolaire', 'promotion'],
    status: ['statut', 'statut_concours', 'etat'],
    seats: ['places', 'nombre_places', 'nb_places', 'effectif', 'عدد_المقاعد'],
    deadlineDate: ['date_limite', 'cloture', 'date_cloture', 'fin_inscriptions', 'deadline', 'تاريخ_إغلاق_التسجيل'],
    openingDate: ['ouverture', 'date_ouverture', 'debut_inscriptions', 'date_debut'],
    examDate: ['date_concours', 'date_epreuve', 'date_examen'],
    resultsDate: ['date_resultats', 'نتائج'],
    publicationDate: ['date_publication', 'publie_le'],
    officialUrl: ['url_officielle', 'lien_officiel', 'url_portail', 'lien_candidature', 'site_officiel', 'رابط_التسجيل'],
    schoolWebsite: ['site_etablissement', 'site_web_etablissement', 'website_etablissement'],
    sourceUrl: ['url_source', 'source', 'lien_source', 'url'],
    conditions: ['conditions', 'conditions_acces'],
    documents: ['documents', 'dossier', 'pieces_demandees'],
  },
};

/**
 * Normalise un en-tête : BOM, accents, casse, ponctuation.
 * Les lettres arabes (\u0600-\u06FF) sont CONSERVÉES : sans cela tous
 * les en-têtes arabes se réduiraient à une chaîne vide et les alias
 * déclarés en HEADER_ALIASES ne pourraient jamais correspondre.
 */
export function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_\u0600-\u06ff]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function toFieldSpec(key: string, spec: SchemaField, aliases: Record<string, string[]>): FieldSpec {
  const field = spec.dbField ?? key;
  return {
    field,
    column: spec.dbColumn ?? field,
    label: spec.label ?? key,
    required: spec.required === true,
    transform: spec.transform,
    allowedValues: Array.isArray(spec.allowedValues) ? spec.allowedValues : undefined,
    aliases: aliases[field] ?? [],
  };
}

function buildSpecs(entity: ImportEntity): FieldSpec[] {
  const entry: SchemaEntry | undefined =
    entity === 'CONCOURS' ? SCHEMAS.registry?.competition : SCHEMAS.registry?.master;
  if (!entry) return [];

  const aliases = HEADER_ALIASES[entity];
  const specs: FieldSpec[] = [];
  const seen = new Set<string>();

  for (const [key, spec] of Object.entries(entry.fields ?? {})) {
    const fieldSpec = toFieldSpec(key, spec, aliases);
    if (seen.has(fieldSpec.field)) continue;
    seen.add(fieldSpec.field);
    specs.push(fieldSpec);
  }

  if (entity === 'MASTERS') {
    for (const key of IMPORTABLE_HIDDEN_MASTER_FIELDS) {
      if (seen.has(key)) continue;
      const hidden = entry.hiddenFields?.[key];
      const fieldSpec = toFieldSpec(key, hidden ?? {}, aliases);
      seen.add(fieldSpec.field);
      specs.push(fieldSpec);
    }
  }

  return specs.filter((s) => !GENERATED_FIELDS.has(s.field));
}

const SPECS_CACHE: Record<ImportEntity, FieldSpec[]> = {
  CONCOURS: buildSpecs('CONCOURS'),
  MASTERS: buildSpecs('MASTERS'),
};

export function getFieldSpecs(entity: ImportEntity): FieldSpec[] {
  return SPECS_CACHE[entity];
}

export function getFieldSpec(entity: ImportEntity, field: string): FieldSpec | undefined {
  return SPECS_CACHE[entity].find((s) => s.field === field);
}

/** Champs strictement requis d'une entité (dérivé du registre). */
export function getRequiredFields(entity: ImportEntity): string[] {
  return SPECS_CACHE[entity].filter((s) => s.required).map((s) => s.field);
}

/**
 * Construit la table d'association en-tête de fichier -> champ métier.
 * En-têtes non reconnus sont retournés avec `spec: null` afin d'être
 * signalés dans l'aperçu plutôt que silencieusement ignorés.
 */
export function buildHeaderMapping(
  entity: ImportEntity,
  headers: string[],
): { mapping: Array<{ header: string; normalizedHeader: string; spec: FieldSpec | null }>; specs: FieldSpec[] } {
  const specs = getFieldSpecs(entity);
  const byKey = new Map<string, FieldSpec>();
  for (const spec of specs) {
    byKey.set(normalizeHeader(spec.field), spec);
    byKey.set(normalizeHeader(spec.label), spec);
    for (const alias of spec.aliases) {
      byKey.set(normalizeHeader(alias), spec);
    }
    if (spec.column) byKey.set(normalizeHeader(spec.column), spec);
  }

  const mapping = headers.map((header) => {
    const normalizedHeader = normalizeHeader(header);
    return { header, normalizedHeader, spec: byKey.get(normalizedHeader) ?? null };
  });

  return { mapping, specs };
}

/** Le registre expose-t-il bien les champs attendus (garde-fou d'exécution) ? */
export function assertRegistryLoaded(entity: ImportEntity): void {
  const specs = getFieldSpecs(entity);
  if (specs.length === 0) {
    throw new Error(
      `Registre de champs vide pour ${entity}. Vérifiez scraper/form-schemas.json (registry.${entity === 'CONCOURS' ? 'competition' : 'master'}).`,
    );
  }
}
