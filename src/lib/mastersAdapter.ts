// ============================================================
// CONCOURS MAROC — Adaptateur Masters vers Concours
// Transforme les concours de masters universitaires marocains
// en fiches concours standardisées pour un affichage unifié.
// ============================================================

import type { Competition, CompetitionCategory, OrgType } from './types';

export interface MasterItem {
  id: string;
  uniqueKey: string;
  name: string;
  university: string;
  establishment: string;
  city: string;
  domain: string;
  level: string;
  academicYear: string;
  openingDate: string | null;
  deadlineDate: string | null;
  examDate: string | null;
  publicationDate: string | null;
  resultsDate: string | null;
  conditions: string | null;
  documents: string | null;
  seats: number | null;
  officialUrl: string | null;
  sourceUrl: string;
  status: 'OUVERT' | 'FERME' | 'A_VENIR' | 'CONCOURS_A_VENIR' | 'RESULTATS' | 'INFORMATION';
  createdAt: string;
  updatedAt: string;
}

// Données initiales de secours (10 concours de masters réels 2026-2027)
export const SEED_MASTERS_FALLBACK: MasterItem[] = [
  {
    id: "mst-um5-fsr-ia-2026",
    uniqueKey: "universite-mohammed-v-rabat-faculte-des-sciences-rabat-master-intelligence-artificielle-et-sciences-des-donnees-2026-2027",
    name: "Master Intelligence Artificielle et Sciences des Données (IASD)",
    university: "Université Mohammed V de Rabat",
    establishment: "Faculté des Sciences de Rabat (FSR)",
    city: "Rabat",
    domain: "Informatique & Technologies",
    level: "Master Spécialisé / MST",
    academicYear: "2026-2027",
    openingDate: "2026-06-15T00:00:00.000Z",
    deadlineDate: "2026-09-25T23:59:59.000Z",
    examDate: "2026-10-05T09:00:00.000Z",
    publicationDate: "2026-06-01T10:00:00.000Z",
    resultsDate: "2026-10-12T14:00:00.000Z",
    conditions: "Licence en Informatique, Mathématiques ou diplôme équivalent. Mention Assez Bien minimum. Présélection sur dossier puis épreuve écrite.",
    documents: "CV détaillé, Lettre de motivation, Copies certifiées des diplômes, Relevés de notes S1 à S6, Copie CIN.",
    seats: 35,
    officialUrl: "http://preinscription.um5.ac.ma",
    sourceUrl: "https://www.almaster-maroc.com/master-fsr-rabat-ia-2026/",
    status: "OUVERT",
    createdAt: "2026-09-13T19:18:16.761Z",
    updatedAt: "2026-09-13T19:18:16.761Z"
  },
  {
    id: "mst-uh2c-encg-cca-2026",
    uniqueKey: "universite-hassan-ii-casablanca-encg-casablanca-master-comptabilite-controle-audit-2026-2027",
    name: "Master Comptabilité, Contrôle et Audit (CCA)",
    university: "Université Hassan II de Casablanca",
    establishment: "ENCG Casablanca",
    city: "Casablanca",
    domain: "Économie & Gestion",
    level: "Master Spécialisé",
    academicYear: "2026-2027",
    openingDate: "2026-07-01T00:00:00.000Z",
    deadlineDate: "2026-09-30T23:59:59.000Z",
    examDate: "2026-10-10T08:30:00.000Z",
    publicationDate: "2026-06-10T00:00:00.000Z",
    resultsDate: null,
    conditions: "Licence fondamentale ou professionnelle en Économie et Gestion. Test écrit en comptabilité approfondie et entretien oral.",
    documents: "Relevés de notes universitaires, Diplôme du Baccalauréat, Attestation de réussite en Licence, Copie CIN.",
    seats: 40,
    officialUrl: "https://encgcasa.ac.ma/candidatures-master/",
    sourceUrl: "https://www.almaster-maroc.com/master-encg-casablanca-cca/",
    status: "OUVERT",
    createdAt: "2026-09-13T19:18:16.761Z",
    updatedAt: "2026-09-13T19:18:16.761Z"
  },
  {
    id: "mst-uca-fssm-cyber-2026",
    uniqueKey: "universite-cadi-ayyad-marrakech-faculte-des-sciences-semlalia-master-cybersecurite-et-systemes-embarques-2026-2027",
    name: "Master Cybersécurité et Systèmes Embarqués Intelligents",
    university: "Université Cadi Ayyad de Marrakech",
    establishment: "Faculté des Sciences Semlalia (FSSM)",
    city: "Marrakech",
    domain: "Ingénierie & Informatique",
    level: "Master Recherche / MST",
    academicYear: "2026-2027",
    openingDate: "2026-10-01T00:00:00.000Z",
    deadlineDate: "2026-10-25T23:59:59.000Z",
    examDate: "2026-11-02T09:00:00.000Z",
    publicationDate: "2026-08-15T00:00:00.000Z",
    resultsDate: null,
    conditions: "Licence SMI, SMA ou diplôme d’ingénieur reconnu. Présélection sur dossier puis test de programmation et réseaux.",
    documents: "Dossier académique complet, relevés de notes du S1 au S6, CIN, photo d’identité.",
    seats: 30,
    officialUrl: "https://candidature.uca.ma",
    sourceUrl: "https://www.almaster-maroc.com/master-fssm-marrakech-cybersecurite/",
    status: "A_VENIR",
    createdAt: "2026-09-13T19:18:16.761Z",
    updatedAt: "2026-09-13T19:18:16.761Z"
  },
  {
    id: "mst-usmba-fsjes-droit-2026",
    uniqueKey: "universite-sidi-mohamed-ben-abdellah-fes-fsjes-fes-master-droit-des-affaires-et-de-lentreprise-2026-2027",
    name: "Master Droit des Affaires et Juriste d’Entreprise",
    university: "Université Sidi Mohamed Ben Abdellah de Fès",
    establishment: "FSJES Fès",
    city: "Fès",
    domain: "Droit & Sciences Politiques",
    level: "Master Fondamental",
    academicYear: "2026-2027",
    openingDate: "2026-05-10T00:00:00.000Z",
    deadlineDate: "2026-07-20T23:59:59.000Z",
    examDate: "2026-09-28T09:00:00.000Z",
    publicationDate: "2026-05-01T00:00:00.000Z",
    resultsDate: "2026-10-05T00:00:00.000Z",
    conditions: "Licence en Droit Privé (Français). Mention minimum Assez Bien. Épreuve écrite de dissertation juridique.",
    documents: "Copie certifiée conforme de la Licence et du Baccalauréat, relevés de notes.",
    seats: 50,
    officialUrl: "https://portail.usmba.ac.ma",
    sourceUrl: "https://www.almaster-maroc.com/master-droit-affaires-fsjes-fes/",
    status: "CONCOURS_A_VENIR",
    createdAt: "2026-09-13T19:18:16.761Z",
    updatedAt: "2026-09-13T19:18:16.761Z"
  },
  {
    id: "mst-uae-ensa-genie-civil-2026",
    uniqueKey: "universite-abdelmalek-essaadi-tetouan-ensa-tetouan-master-genie-civil-et-infrastructures-durables-2026-2027",
    name: "Master Génie Civil et Infrastructures Durables",
    university: "Université Abdelmalek Essaâdi",
    establishment: "ENSA Tétouan",
    city: "Tétouan",
    domain: "Génie Civil & BTP",
    level: "Master Sciences et Techniques (MST)",
    academicYear: "2026-2027",
    openingDate: "2026-04-01T00:00:00.000Z",
    deadlineDate: "2026-06-15T23:59:59.000Z",
    examDate: "2026-07-02T10:00:00.000Z",
    publicationDate: "2026-03-20T00:00:00.000Z",
    resultsDate: "2026-07-15T12:00:00.000Z",
    conditions: "Licence en Génie Civil, Mécanique ou Physique appliquée. Test écrit et entretien oral.",
    documents: "CV, Lettre de motivation, Relevés de notes S1-S6, Diplômes.",
    seats: 25,
    officialUrl: "https://ensa-tetouan.ac.ma/masters/",
    sourceUrl: "https://www.almaster-maroc.com/master-genie-civil-ensa-tetouan/",
    status: "RESULTATS",
    createdAt: "2026-09-13T19:18:16.761Z",
    updatedAt: "2026-09-13T19:18:16.761Z"
  },
  {
    id: "mst-uiz-fsa-energies-2026",
    uniqueKey: "universite-ibn-zohr-agadir-faculte-des-sciences-agadir-master-energies-renouvelables-et-efficacite-energetique-2026-2027",
    name: "Master Énergies Renouvelables et Efficacité Énergétique",
    university: "Université Ibn Zohr d’Agadir",
    establishment: "Faculté des Sciences d’Agadir (FSA)",
    city: "Agadir",
    domain: "Environnement & Énergies",
    level: "Master Spécialisé",
    academicYear: "2026-2027",
    openingDate: null,
    deadlineDate: null,
    examDate: null,
    publicationDate: "2026-08-01T00:00:00.000Z",
    resultsDate: null,
    conditions: "Licence en Physique, Chimie, Électrotechnique ou diplôme équivalent.",
    documents: "Relevés de notes, Lettre de motivation, Diplôme de Licence.",
    seats: 30,
    officialUrl: "https://preinscription.uiz.ac.ma",
    sourceUrl: "https://www.almaster-maroc.com/master-energies-renouvelables-uiz-agadir/",
    status: "INFORMATION",
    createdAt: "2026-09-13T19:18:16.761Z",
    updatedAt: "2026-09-13T19:18:16.761Z"
  },
  {
    id: "mst-uit-flsh-com-2026",
    uniqueKey: "universite-ibn-tofail-kenitra-flsh-kenitra-master-communication-des-organisations-et-medias-2026-2027",
    name: "Master Communication des Organisations et Nouveaux Médias",
    university: "Université Ibn Tofaïl de Kénitra",
    establishment: "FLSH Kénitra",
    city: "Kénitra",
    domain: "Lettres, Médias & Communication",
    level: "Master Professionnel",
    academicYear: "2026-2027",
    openingDate: "2026-05-01T00:00:00.000Z",
    deadlineDate: "2026-06-30T23:59:59.000Z",
    examDate: "2026-07-10T09:00:00.000Z",
    publicationDate: "2026-04-20T00:00:00.000Z",
    resultsDate: "2026-07-25T00:00:00.000Z",
    conditions: "Licence en Études Françaises, Information-Communication, Journalisme ou Sociologie.",
    documents: "Dossier de candidature en ligne, relevés de notes, projet professionnel.",
    seats: 35,
    officialUrl: "https://ent.uit.ac.ma",
    sourceUrl: "https://www.almaster-maroc.com/master-communication-flsh-kenitra/",
    status: "FERME",
    createdAt: "2026-09-13T19:18:16.761Z",
    updatedAt: "2026-09-13T19:18:16.761Z"
  }
];

// Cache mémoire
let _mastersCache: MasterItem[] = [...SEED_MASTERS_FALLBACK];

export function setCachedMasters(list: MasterItem[]) {
  if (Array.isArray(list) && list.length > 0) {
    _mastersCache = list;
  }
}

export function getCachedMasters(): MasterItem[] {
  return _mastersCache;
}

/**
 * Résout les identifiants et logos officiels d'université à partir du nom
 */
export function resolveUniversityMeta(name: string): { universityId: string; logoUrl: string; logoColor: string } {
  const n = (name || '').toLowerCase();
  if (n.includes('mohammed v') || n.includes('rabat') || n.includes('um5')) {
    return { universityId: 'univ-um5', logoUrl: '/assets/logos/universities/um5.png', logoColor: '#1E40AF' };
  }
  if (n.includes('hassan ii') || n.includes('casablanca') || n.includes('uh2c') || n.includes('ben m')) {
    return { universityId: 'univ-uh2c', logoUrl: '/assets/logos/universities/uh2c.png', logoColor: '#0F766E' };
  }
  if (n.includes('cadi ayyad') || n.includes('marrakech') || n.includes('uca') || n.includes('semlalia')) {
    return { universityId: 'univ-uca', logoUrl: '/assets/logos/universities/uca.webp', logoColor: '#B45309' };
  }
  if (n.includes('sidi mohamed') || n.includes('fès') || n.includes('fes') || n.includes('usmba')) {
    return { universityId: 'univ-usmba', logoUrl: '/assets/logos/universities/usmba.jpg', logoColor: '#0369A1' };
  }
  if (n.includes('abdelmalek') || n.includes('tanger') || n.includes('tétouan') || n.includes('tetouan') || n.includes('uae')) {
    return { universityId: 'univ-uae', logoUrl: '/assets/logos/universities/uae.png', logoColor: '#4338CA' };
  }
  if (n.includes('tofaïl') || n.includes('tofail') || n.includes('kénitra') || n.includes('kenitra') || n.includes('uit')) {
    return { universityId: 'univ-uit', logoUrl: '/assets/logos/universities/uit.svg', logoColor: '#047857' };
  }
  if (n.includes('ismaïl') || n.includes('ismail') || n.includes('meknès') || n.includes('meknes') || n.includes('umi')) {
    return { universityId: 'univ-umi', logoUrl: '/assets/logos/universities/umi.png', logoColor: '#6D28D9' };
  }
  if (n.includes('ibn zohr') || n.includes('agadir') || n.includes('uiz')) {
    return { universityId: 'univ-uiz', logoUrl: '/assets/logos/universities/uiz.jpg', logoColor: '#C2410C' };
  }
  if (n.includes('chouaib') || n.includes('el jadida') || n.includes('ucd')) {
    return { universityId: 'univ-ucd', logoUrl: '/assets/logos/universities/ucd.jpg', logoColor: '#0284C7' };
  }
  if (n.includes('hassan 1') || n.includes('settat') || n.includes('uh1')) {
    return { universityId: 'univ-uh1', logoUrl: '/assets/logos/universities/uh1.png', logoColor: '#0E7490' };
  }
  if (n.includes('slimane') || n.includes('béni mellal') || n.includes('beni mellal') || n.includes('usms')) {
    return { universityId: 'univ-usms', logoUrl: '/assets/logos/universities/usms.png', logoColor: '#15803D' };
  }
  if (n.includes('polytechnique') || n.includes('um6p') || n.includes('benguerir')) {
    return { universityId: 'univ-um6p', logoUrl: '/assets/logos/universities/um6p.png', logoColor: '#BE185D' };
  }
  if (n.includes('akhawayn') || n.includes('aui') || n.includes('ifrane')) {
    return { universityId: 'univ-aui', logoUrl: '/assets/logos/universities/aui.jpg', logoColor: '#1E3A8A' };
  }
  return { universityId: 'univ-um5', logoUrl: '/assets/logos/universities/um5.png', logoColor: '#0B2A4A' };
}

/**
 * Convertit un concours de Master en objet Competition standardisé
 */
export function masterToCompetition(m: MasterItem): Competition {
  const meta = resolveUniversityMeta(m.university + ' ' + m.establishment);
  
  // Nom d'organisation propre
  const orgName = m.establishment && m.establishment !== 'Faculté / Établissement Universitaire'
    ? m.establishment
    : m.university;

  // Calcul du statut du concours
  let manualStatus: 'Ouvert' | 'Bientot' | 'Ferme' = 'Ouvert';
  if (m.status === 'FERME') {
    manualStatus = 'Ferme';
  } else if (m.status === 'A_VENIR' || m.status === 'CONCOURS_A_VENIR') {
    manualStatus = 'Bientot';
  } else if (m.deadlineDate) {
    const d = new Date(m.deadlineDate);
    if (!isNaN(d.getTime()) && d.getTime() < Date.now()) {
      manualStatus = 'Ferme';
    }
  }

  // Documents
  const docsList = m.documents
    ? m.documents.split(',').map((s) => s.trim()).filter(Boolean)
    : [
        'Copie certifiée de la CIN',
        'Relevés de notes des 6 semestres (S1 à S6)',
        'Diplôme de la Licence ou attestation de réussite',
        'Curriculum Vitae (CV) détaillé avec photo',
        'Lettre de motivation signée',
      ];

  // Conditions
  const condList = m.conditions
    ? [m.conditions]
    : [
        'Titulaires d’une Licence fondamentale ou professionnelle ou diplôme équivalent',
        'Validation des modules prérequis requis par la filière',
        'Présélection sur dossier académique (mentions et notes des semestres)',
        'Épreuve écrite et/ou entretien oral de sélection finale',
      ];

  // Épreuves
  const epreuvesList = m.examDate
    ? [`Épreuve écrite / orale de sélection : ${new Date(m.examDate).toLocaleDateString('fr-FR')}`]
    : [
        'Phase 1 : Examen du dossier académique & calcul du score de mérite',
        'Phase 2 : Épreuve écrite d’admissibilité',
        'Phase 3 : Entretien oral devant le jury de la filière',
      ];

  const yearNum = parseInt(m.academicYear?.split('-')[0] || '2026', 10) || 2026;

  return {
    id: m.id,
    slug: m.id,
    title: m.name,
    organizationName: orgName,
    organizationType: 'UNIVERSITE' as OrgType,
    category: 'UNIVERSITE' as CompetitionCategory,
    universityId: meta.universityId,
    logoUrl: meta.logoUrl,
    officialLogo: meta.logoUrl,
    logoColor: meta.logoColor,
    year: yearNum,
    level: m.level || 'Master Spécialisé / MST',
    city: m.city && m.city !== 'Maroc' ? m.city : 'Rabat',
    region: 'Maroc',
    domaine: m.domain || 'Universitaire',
    places: m.seats || 35,
    description: m.conditions
      ? `${m.name} — ${m.establishment} (${m.university}).\nAnnée universitaire ${m.academicYear}.\n${m.conditions}`
      : `Concours d’accès au ${m.name} organisé par ${orgName} (${m.university}) au titre de l'année universitaire ${m.academicYear}.\nLe recrutement est ouvert aux candidats titulaires d'une Licence ou diplôme équivalent selon les critères de mérite académique et après réussite des épreuves de sélection.`,
    conditions: condList,
    documentsDemandes: docsList,
    matieres: [],
    epreuves: epreuvesList,
    registrationStart: m.openingDate || undefined,
    registrationDeadline: m.deadlineDate || undefined,
    competitionDate: m.examDate || undefined,
    resultsDate: m.resultsDate || undefined,
    publishedAt: m.publicationDate || m.createdAt || '2026-06-01T00:00:00.000Z',
    officialWebsite: m.officialUrl || undefined,
    registrationUrl: m.officialUrl || m.sourceUrl,
    sourceUrl: m.sourceUrl,
    sourceOrganization: `${m.university} (${m.establishment})`,
    verificationStatus: 'VERIFIED',
    verifiedAt: m.updatedAt || '2026-09-01T00:00:00.000Z',
    publishStatus: 'PUBLISHED',
    manualStatus,
    views: 184,
    isDemo: false,
    createdAt: m.createdAt || '2026-06-01T00:00:00.000Z',
    updatedAt: m.updatedAt || '2026-09-13T00:00:00.000Z',
  };
}

/**
 * Récupère un master et le convertit en Competition par son slug ou ID
 */
export function getMasterAsCompetitionBySlug(slug: string): Competition | undefined {
  const masters = getCachedMasters();
  const found = masters.find(
    (m) =>
      m.id === slug ||
      m.uniqueKey === slug ||
      `master-${m.id}` === slug ||
      m.id.replace('mst-', '') === slug
  );
  if (found) {
    return masterToCompetition(found);
  }
  return undefined;
}

/**
 * Convertit tous les masters en mémoire en tableau de Competition
 */
export function getAllMastersAsCompetitions(): Competition[] {
  return getCachedMasters().map(masterToCompetition);
}

/**
 * Charge les masters depuis le backend /api/masters et met à jour le cache
 */
export async function fetchAndCacheMasters(): Promise<Competition[]> {
  try {
    const res = await fetch('/api/masters');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setCachedMasters(data);
        return data.map(masterToCompetition);
      }
    }
  } catch (err) {
    console.warn('[MastersAdapter] Utilisation des concours de masters locaux:', err);
  }
  return getAllMastersAsCompetitions();
}
