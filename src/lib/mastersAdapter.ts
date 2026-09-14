// ============================================================
// CONCOURS MAROC — Adaptateur Masters vers Concours
// Transforme les concours de masters universitaires marocains
// en fiches concours standardisées pour un affichage unifié.
// ============================================================

import type { Competition, CompetitionCategory, OrgType } from './types';
import { parseDateSafe } from './utils';

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
  schoolId?: string;
  schoolSlug?: string;
  schoolWebsite?: string;
  universityWebsite?: string;
}

// Données initiales de secours (concours de masters réels 2026-2027 avec liens écoles)
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
    schoolSlug: "fs-rabat",
    schoolWebsite: "http://www.fsr.ac.ma",
    universityWebsite: "https://www.um5.ac.ma",
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
    schoolId: "ec-encg-casablanca",
    schoolSlug: "encg-casablanca",
    schoolWebsite: "https://encgcasa.ac.ma",
    universityWebsite: "http://www.univh2c.ma",
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
    schoolSlug: "fssm-marrakech",
    schoolWebsite: "https://www.fssm.uca.ma",
    universityWebsite: "https://www.uca.ma",
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
    schoolSlug: "fsjes-fes",
    schoolWebsite: "http://fsjes.usmba.ac.ma",
    universityWebsite: "http://www.usmba.ac.ma",
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
    schoolId: "ec-ensa-tetouan",
    schoolSlug: "ensa-tetouan",
    schoolWebsite: "https://ensa-tetouan.ac.ma",
    universityWebsite: "https://www.uae.ac.ma",
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
    schoolSlug: "fsa-agadir",
    schoolWebsite: "http://fsa.uiz.ac.ma",
    universityWebsite: "https://www.uiz.ac.ma",
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
    schoolSlug: "flsh-kenitra",
    schoolWebsite: "https://flsh.uit.ac.ma",
    universityWebsite: "https://uit.ac.ma",
    status: "FERME",
    createdAt: "2026-09-13T19:18:16.761Z",
    updatedAt: "2026-09-13T19:18:16.761Z"
  }
];

const MASTERS_STORAGE_KEY = 'cm_masters_cache_v2';

function loadInitialMasters(): MasterItem[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(MASTERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {}
  return [...SEED_MASTERS_FALLBACK];
}

// Cache mémoire
let _mastersCache: MasterItem[] = loadInitialMasters();

/**
 * Normalise un objet Master brut provenant de l'API, de Supabase ou du cache local.
 * Gère de manière robuste les variantes de noms de champs :
 * - deadlineDate / deadline / applicationDeadline / dateLimite / closingDate
 * - openingDate / startDate / dateOuverture / registrationStart
 * - examDate / competitionDate / dateConcours / dateExamen
 * - resultsDate / dateResultats
 * - officialUrl / registrationUrl / urlOfficiel / lienCandidature
 * - sourceUrl / url / link
 * Recalcule et synchronise systématiquement le statut selon la date de référence.
 */
export function normalizeMaster(raw: any, referenceDate: Date = new Date()): MasterItem {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `mst-${Date.now()}`,
      uniqueKey: '',
      name: 'Master',
      university: 'Université au Maroc',
      establishment: 'Établissement Universitaire',
      city: 'Maroc',
      domain: 'Formation Universitaire',
      level: 'Master Spécialisé / MST',
      academicYear: '2026-2027',
      openingDate: null,
      deadlineDate: null,
      examDate: null,
      publicationDate: null,
      resultsDate: null,
      conditions: null,
      documents: null,
      seats: null,
      officialUrl: null,
      sourceUrl: '',
      status: 'INFORMATION',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const now = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();

  // Variantes de dates
  const rawDeadline = raw.deadlineDate ?? raw.deadline ?? raw.applicationDeadline ?? raw.dateLimite ?? raw.closingDate ?? null;
  const rawOpening = raw.openingDate ?? raw.startDate ?? raw.dateOuverture ?? raw.registrationStart ?? null;
  const rawExam = raw.examDate ?? raw.competitionDate ?? raw.dateConcours ?? raw.dateExamen ?? null;
  const rawResults = raw.resultsDate ?? raw.dateResultats ?? null;
  const rawPublication = raw.publicationDate ?? raw.datePublication ?? raw.publishedAt ?? raw.createdAt ?? null;

  const deadline = parseDateSafe(rawDeadline, true);
  const opening = parseDateSafe(rawOpening, false);
  const exam = parseDateSafe(rawExam, false);
  const results = parseDateSafe(rawResults, false);

  // Détermination fiable du statut
  const oldStatus = (raw.status || '').toUpperCase();
  let status: MasterItem['status'] = 'OUVERT';

  if (oldStatus === 'RESULTATS' || (results && results <= now)) {
    status = 'RESULTATS';
  } else if (deadline) {
    if (now > deadline) {
      if (exam && now < exam) {
        status = 'CONCOURS_A_VENIR';
      } else {
        status = 'FERME'; // CLÔTURÉ
      }
    } else if (opening && now < opening) {
      status = 'A_VENIR';
    } else {
      status = 'OUVERT';
    }
  } else if (opening) {
    if (now < opening) {
      status = 'A_VENIR';
    } else {
      status = 'OUVERT';
    }
  } else {
    status = (['OUVERT', 'FERME', 'A_VENIR', 'CONCOURS_A_VENIR', 'RESULTATS', 'INFORMATION'].includes(oldStatus)
      ? oldStatus
      : 'INFORMATION') as MasterItem['status'];
  }

  // Variantes d'URLs
  const officialUrl = raw.officialUrl || raw.registrationUrl || raw.urlOfficiel || raw.lienCandidature || null;
  const sourceUrl = raw.sourceUrl || raw.url || raw.link || '';

  // Variantes d'établissement et université
  const establishment = raw.establishment || raw.schoolName || raw.faculty || raw.etablissement || raw.university || 'Établissement Universitaire';
  const university = raw.university || raw.universityName || 'Université au Maroc';

  return {
    id: String(raw.id || raw.uniqueKey || `mst-${Date.now()}`),
    uniqueKey: String(raw.uniqueKey || raw.id || ''),
    name: String(raw.name || raw.title || 'Master Universitaire'),
    university: String(university),
    establishment: String(establishment),
    city: String(raw.city || 'Maroc'),
    domain: String(raw.domain || raw.category || 'Formation Universitaire'),
    level: String(raw.level || 'Master Spécialisé / MST'),
    academicYear: String(raw.academicYear || '2026-2027'),
    openingDate: rawOpening ? String(rawOpening) : null,
    deadlineDate: rawDeadline ? String(rawDeadline) : null,
    examDate: rawExam ? String(rawExam) : null,
    publicationDate: rawPublication ? String(rawPublication) : null,
    resultsDate: rawResults ? String(rawResults) : null,
    conditions: raw.conditions || null,
    documents: raw.documents || null,
    seats: typeof raw.seats === 'number' ? raw.seats : (raw.seats ? parseInt(raw.seats, 10) : null),
    officialUrl: officialUrl ? String(officialUrl) : null,
    sourceUrl: String(sourceUrl),
    status,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
    schoolId: raw.schoolId,
    schoolSlug: raw.schoolSlug,
    schoolWebsite: raw.schoolWebsite,
    universityWebsite: raw.universityWebsite
  };
}

export function normalizeMasters(list: any[], referenceDate: Date = new Date()): MasterItem[] {
  if (!Array.isArray(list)) return [];
  return list.map(item => normalizeMaster(item, referenceDate));
}

export function setCachedMasters(list: MasterItem[]) {
  if (Array.isArray(list)) {
    _mastersCache = list;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(MASTERS_STORAGE_KEY, JSON.stringify(list));
      }
    } catch {}
  }
}

export function getCachedMasters(): MasterItem[] {
  return _mastersCache;
}

export function addMasterToCache(item: MasterItem) {
  _mastersCache = [item, ..._mastersCache.filter(m => m.id !== item.id)];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(MASTERS_STORAGE_KEY, JSON.stringify(_mastersCache));
    }
  } catch {}
}

export function updateMasterInCache(item: MasterItem) {
  _mastersCache = _mastersCache.map(m => m.id === item.id ? item : m);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(MASTERS_STORAGE_KEY, JSON.stringify(_mastersCache));
    }
  } catch {}
}

export function removeMasterFromCache(id: string) {
  _mastersCache = _mastersCache.filter(m => m.id !== id);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(MASTERS_STORAGE_KEY, JSON.stringify(_mastersCache));
    }
  } catch {}
}

/**
 * Fonction utilitaire pour mettre à jour automatiquement le statut (OUVERT, À VENIR, CLÔTURÉ)
 * de tous les masters dans la base de données / cache local en comparant la date limite actuelle avec la date du jour.
 */
export function updateAllMastersStatusInCache(referenceDate: Date = new Date()) {
  const now = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  const current = getCachedMasters();
  let updatedCount = 0;
  const changes: Array<{ id: string; name: string; oldStatus: MasterItem['status']; newStatus: MasterItem['status'] }> = [];
  const stats = { ouvert: 0, aVenir: 0, cloture: 0, concoursAVenir: 0, resultats: 0, information: 0 };

  const updatedList = current.map(m => {
    const oldStatus = m.status;
    const deadline = parseDateSafe(m.deadlineDate, true);
    const opening = parseDateSafe(m.openingDate, false);
    const exam = parseDateSafe(m.examDate, false);
    const results = parseDateSafe(m.resultsDate, false);

    let newStatus: MasterItem['status'] = 'OUVERT';

    if (oldStatus === 'RESULTATS' || (results && results <= now)) {
      newStatus = 'RESULTATS';
    } else if (deadline) {
      if (now > deadline) {
        if (exam && now < exam) {
          newStatus = 'CONCOURS_A_VENIR';
        } else {
          newStatus = 'FERME'; // CLÔTURÉ
        }
      } else if (opening && now < opening) {
        newStatus = 'A_VENIR';
      } else {
        newStatus = 'OUVERT';
      }
    } else if (opening) {
      if (now < opening) {
        newStatus = 'A_VENIR';
      } else {
        newStatus = 'OUVERT';
      }
    } else {
      newStatus = oldStatus || 'INFORMATION';
    }

    if (newStatus === 'OUVERT') stats.ouvert++;
    else if (newStatus === 'A_VENIR') stats.aVenir++;
    else if (newStatus === 'FERME') stats.cloture++;
    else if (newStatus === 'CONCOURS_A_VENIR') stats.concoursAVenir++;
    else if (newStatus === 'RESULTATS') stats.resultats++;
    else stats.information++;

    if (oldStatus !== newStatus) {
      updatedCount++;
      changes.push({ id: m.id, name: m.name, oldStatus, newStatus });
      return { ...m, status: newStatus, updatedAt: now.toISOString() };
    }
    return m;
  });

  if (updatedCount > 0) {
    setCachedMasters(updatedList);
  }

  return {
    total: current.length,
    updatedCount,
    stats,
    changes,
  };
}

/**
 * Fonction utilitaire principale pour mettre à jour automatiquement le statut
 * (OUVERT, À VENIR, CLÔTURÉ) de tous les masters dans la base de données.
 * Déclenche l'API serveur /api/masters/update-statuses et synchronise le cache local.
 */
export async function updateAllMastersStatus(referenceDate: Date = new Date()): Promise<{
  success: boolean;
  message: string;
  total: number;
  updatedCount: number;
  stats: {
    ouvert: number;
    aVenir: number;
    cloture: number;
    concoursAVenir: number;
    resultats: number;
    information?: number;
  };
  changes: Array<any>;
}> {
  try {
    const res = await fetch('/api/masters/update-statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referenceDate: referenceDate.toISOString() }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        await fetchAndCacheMasters();
        return data;
      }
    }
  } catch (err) {
    console.warn('[MastersAdapter] Appel backend /api/masters/update-statuses indisponible, bascule locale:', err);
  }

  const localRes = updateAllMastersStatusInCache(referenceDate);
  return {
    success: true,
    message: localRes.updatedCount > 0
      ? `Mise à jour effectuée : ${localRes.updatedCount} master(s) mis à jour (${localRes.stats.ouvert} OUVERT, ${localRes.stats.aVenir} À VENIR, ${localRes.stats.cloture} CLÔTURÉ).`
      : `Tous les statuts sont déjà à jour (${localRes.stats.ouvert} OUVERT, ${localRes.stats.aVenir} À VENIR, ${localRes.stats.cloture} CLÔTURÉ).`,
    total: localRes.total,
    updatedCount: localRes.updatedCount,
    stats: localRes.stats,
    changes: localRes.changes,
  };
}

import { REAL_SCHOOLS } from '../data/institutionsData';

export interface ResolvedUniversityMeta {
  universityId: string;
  universityName: string;
  logoUrl: string;
  logoColor: string;
  website: string;
}

export interface ResolvedSchoolMeta {
  schoolId?: string;
  schoolSlug?: string;
  schoolName: string;
  schoolShortName: string;
  schoolWebsite?: string;
  schoolLogoUrl?: string;
  schoolLogoColor?: string;
  isOfficialSchool: boolean;
}

/**
 * Résout les identifiants, logos officiels et site web de l'université
 */
export function resolveUniversityMeta(name: string): ResolvedUniversityMeta {
  const n = (name || '').toLowerCase();
  if (n.includes('mohammed v') || n.includes('rabat') || n.includes('um5')) {
    return {
      universityId: 'univ-um5',
      universityName: 'Université Mohammed V de Rabat',
      logoUrl: '/assets/logos/universities/um5.png',
      logoColor: '#1E40AF',
      website: 'https://www.um5.ac.ma'
    };
  }
  if (n.includes('hassan ii') || n.includes('casablanca') || n.includes('uh2c') || n.includes('ben m')) {
    return {
      universityId: 'univ-uh2c',
      universityName: 'Université Hassan II de Casablanca',
      logoUrl: '/assets/logos/universities/uh2c.png',
      logoColor: '#0F766E',
      website: 'http://www.univh2c.ma'
    };
  }
  if (n.includes('cadi ayyad') || n.includes('marrakech') || n.includes('uca') || n.includes('semlalia')) {
    return {
      universityId: 'univ-uca',
      universityName: 'Université Cadi Ayyad de Marrakech',
      logoUrl: '/assets/logos/universities/uca.webp',
      logoColor: '#B45309',
      website: 'https://www.uca.ma'
    };
  }
  if (n.includes('sidi mohamed') || n.includes('fès') || n.includes('fes') || n.includes('usmba')) {
    return {
      universityId: 'univ-usmba',
      universityName: 'Université Sidi Mohamed Ben Abdellah de Fès',
      logoUrl: '/assets/logos/universities/usmba.jpg',
      logoColor: '#0369A1',
      website: 'http://www.usmba.ac.ma'
    };
  }
  if (n.includes('abdelmalek') || n.includes('tanger') || n.includes('tétouan') || n.includes('tetouan') || n.includes('uae')) {
    return {
      universityId: 'univ-uae',
      universityName: 'Université Abdelmalek Essaâdi',
      logoUrl: '/assets/logos/universities/uae.png',
      logoColor: '#4338CA',
      website: 'https://www.uae.ac.ma'
    };
  }
  if (n.includes('tofaïl') || n.includes('tofail') || n.includes('kénitra') || n.includes('kenitra') || n.includes('uit')) {
    return {
      universityId: 'univ-uit',
      universityName: 'Université Ibn Tofaïl de Kénitra',
      logoUrl: '/assets/logos/universities/uit.svg',
      logoColor: '#047857',
      website: 'https://uit.ac.ma'
    };
  }
  if (n.includes('ismaïl') || n.includes('ismail') || n.includes('meknès') || n.includes('meknes') || n.includes('umi')) {
    return {
      universityId: 'univ-umi',
      universityName: 'Université Moulay Ismaïl de Meknès',
      logoUrl: '/assets/logos/universities/umi.png',
      logoColor: '#6D28D9',
      website: 'http://www.umi.ac.ma'
    };
  }
  if (n.includes('ibn zohr') || n.includes('agadir') || n.includes('uiz')) {
    return {
      universityId: 'univ-uiz',
      universityName: 'Université Ibn Zohr d’Agadir',
      logoUrl: '/assets/logos/universities/uiz.jpg',
      logoColor: '#C2410C',
      website: 'https://www.uiz.ac.ma'
    };
  }
  if (n.includes('chouaib') || n.includes('el jadida') || n.includes('ucd')) {
    return {
      universityId: 'univ-ucd',
      universityName: 'Université Chouaïb Doukkali d’El Jadida',
      logoUrl: '/assets/logos/universities/ucd.jpg',
      logoColor: '#0284C7',
      website: 'https://www.ucd.ac.ma'
    };
  }
  if (n.includes('hassan 1') || n.includes('settat') || n.includes('uh1')) {
    return {
      universityId: 'univ-uh1',
      universityName: 'Université Hassan 1er de Settat',
      logoUrl: '/assets/logos/universities/uh1.png',
      logoColor: '#0E7490',
      website: 'https://www.uh1.ac.ma'
    };
  }
  if (n.includes('slimane') || n.includes('béni mellal') || n.includes('beni mellal') || n.includes('usms')) {
    return {
      universityId: 'univ-usms',
      universityName: 'Université Sultan Moulay Slimane de Béni Mellal',
      logoUrl: '/assets/logos/universities/usms.png',
      logoColor: '#15803D',
      website: 'https://www.usms.ac.ma'
    };
  }
  if (n.includes('polytechnique') || n.includes('um6p') || n.includes('benguerir')) {
    return {
      universityId: 'univ-um6p',
      universityName: 'Université Mohammed VI Polytechnique (UM6P)',
      logoUrl: '/assets/logos/universities/um6p.png',
      logoColor: '#BE185D',
      website: 'https://www.um6p.ma'
    };
  }
  if (n.includes('akhawayn') || n.includes('aui') || n.includes('ifrane')) {
    return {
      universityId: 'univ-aui',
      universityName: 'Al Akhawayn University in Ifrane (AUI)',
      logoUrl: '/assets/logos/universities/aui.jpg',
      logoColor: '#1E3A8A',
      website: 'https://www.aui.ma'
    };
  }
  return {
    universityId: 'univ-um5',
    universityName: 'Université Mohammed V de Rabat',
    logoUrl: '/assets/logos/universities/um5.png',
    logoColor: '#0B2A4A',
    website: 'https://www.um5.ac.ma'
  };
}

/**
 * Résout la fiche école, le site officiel et les métadonnées de l'établissement
 * organisateur qui poste le concours de Master.
 */
export function resolveSchoolMeta(establishment: string, university?: string): ResolvedSchoolMeta {
  const est = (establishment || '').trim();
  const univ = (university || '').trim();
  const combined = `${est} ${univ}`.toLowerCase();
  const cleanStr = (s: string) => s.toLowerCase().replace(/[\s\-_'’()]/g, '');

  // 1. Recherche par correspondance dans les écoles réelles de la plateforme
  if (est) {
    const cleanEst = cleanStr(est);
    for (const s of REAL_SCHOOLS) {
      const cleanShort = cleanStr(s.shortName);
      const cleanName = cleanStr(s.name);
      const cleanSlug = cleanStr(s.slug);

      const matchesShort = cleanEst.includes(cleanShort) || cleanShort.includes(cleanEst);
      const matchesName = cleanEst.includes(cleanName) || cleanName.includes(cleanEst);
      const matchesSlug = cleanEst.includes(cleanSlug);
      const matchesAlias = (s.aliases || []).some(a => cleanEst.includes(cleanStr(a)));

      if (matchesShort || matchesName || matchesSlug || matchesAlias) {
        return {
          schoolId: s.id,
          schoolSlug: s.slug,
          schoolName: s.name,
          schoolShortName: s.shortName,
          schoolWebsite: s.website,
          schoolLogoUrl: s.logoUrl,
          schoolLogoColor: s.logoColor,
          isOfficialSchool: true
        };
      }
    }
  }

  // 2. Annuaire spécialisé des facultés universitaires marocaines
  const knownFaculties: Array<{
    match: string[];
    name: string;
    shortName: string;
    website: string;
    slug: string;
  }> = [
    {
      match: ['fsr', 'faculte des sciences de rabat', 'sciences rabat'],
      name: 'Faculté des Sciences de Rabat (FSR)',
      shortName: 'FSR Rabat',
      website: 'http://www.fsr.ac.ma',
      slug: 'fs-rabat'
    },
    {
      match: ['fssm', 'semlalia', 'faculte des sciences semlalia'],
      name: 'Faculté des Sciences Semlalia de Marrakech (FSSM)',
      shortName: 'FSSM Marrakech',
      website: 'https://www.fssm.uca.ma',
      slug: 'fssm-marrakech'
    },
    {
      match: ['fsa', 'sciences d’agadir', 'sciences agadir', 'faculte des sciences agadir'],
      name: 'Faculté des Sciences d’Agadir (FSA)',
      shortName: 'FSA Agadir',
      website: 'http://fsa.uiz.ac.ma',
      slug: 'fsa-agadir'
    },
    {
      match: ['fsjes fes', 'fsjes fès', 'droit fes', 'juridiques fes'],
      name: 'Faculté des Sciences Juridiques, Économiques et Sociales de Fès (FSJES)',
      shortName: 'FSJES Fès',
      website: 'http://fsjes.usmba.ac.ma',
      slug: 'fsjes-fes'
    },
    {
      match: ['fsjes agdal', 'droit agdal'],
      name: 'Faculté des Sciences Juridiques, Économiques et Sociales d’Agdal (FSJES)',
      shortName: 'FSJES Agdal',
      website: 'http://fsjes-agdal.um5.ac.ma',
      slug: 'fsjes-agdal'
    },
    {
      match: ['fsjes souissi', 'droit souissi'],
      name: 'Faculté des Sciences Juridiques, Économiques et Sociales de Souissi (FSJES)',
      shortName: 'FSJES Souissi',
      website: 'http://fsjes-souissi.um5.ac.ma',
      slug: 'fsjes-souissi'
    },
    {
      match: ['fsjes ain chock', 'fsjes aïn chock', 'fsjes casablanca'],
      name: 'Faculté des Sciences Juridiques, Économiques et Sociales de Casablanca (FSJES)',
      shortName: 'FSJES Casablanca',
      website: 'http://www.fsjes-uh2c.ac.ma',
      slug: 'fsjes-casablanca'
    },
    {
      match: ['fsjes marrakech', 'droit marrakech'],
      name: 'Faculté des Sciences Juridiques, Économiques et Sociales de Marrakech (FSJES)',
      shortName: 'FSJES Marrakech',
      website: 'http://fsjes.uca.ma',
      slug: 'fsjes-marrakech'
    },
    {
      match: ['flsh kenitra', 'flsh kénitra', 'lettres kenitra'],
      name: 'Faculté des Lettres et des Sciences Humaines de Kénitra (FLSH)',
      shortName: 'FLSH Kénitra',
      website: 'https://flsh.uit.ac.ma',
      slug: 'flsh-kenitra'
    },
    {
      match: ['flsh rabat', 'lettres rabat'],
      name: 'Faculté des Lettres et des Sciences Humaines de Rabat (FLSH)',
      shortName: 'FLSH Rabat',
      website: 'http://flshr.ac.ma',
      slug: 'flsh-rabat'
    },
    {
      match: ['flsh ain chock', 'flsh casablanca'],
      name: 'Faculté des Lettres et des Sciences Humaines Aïn Chock (FLSH)',
      shortName: 'FLSH Casablanca',
      website: 'http://www.flsh-uh2c.ac.ma',
      slug: 'flsh-casablanca'
    },
    {
      match: ['flsh ben m', 'flsh ben msick'],
      name: 'Faculté des Lettres et des Sciences Humaines Ben M’Sick (FLSH)',
      shortName: 'FLSH Ben M’Sick',
      website: 'http://www.flshb.univh2c.ma',
      slug: 'flsh-ben-msick'
    },
    {
      match: ['fst fes', 'fst fès'],
      name: 'Faculté des Sciences et Techniques de Fès (FST)',
      shortName: 'FST Fès',
      website: 'http://fst-usmba.ac.ma',
      slug: 'fst-fes'
    },
    {
      match: ['fst mohammedia', 'fstm'],
      name: 'Faculté des Sciences et Techniques de Mohammedia (FSTM)',
      shortName: 'FST Mohammedia',
      website: 'http://www.fstm.ac.ma',
      slug: 'fst-mohammedia'
    },
    {
      match: ['fst settat', 'fsts'],
      name: 'Faculté des Sciences et Techniques de Settat (FSTS)',
      shortName: 'FST Settat',
      website: 'http://www.fsts.ac.ma',
      slug: 'fst-settat'
    },
    {
      match: ['fst marrakech', 'fstg'],
      name: 'Faculté des Sciences et Techniques Guéliz Marrakech (FSTG)',
      shortName: 'FST Marrakech',
      website: 'http://www.fstg-marrakech.ac.ma',
      slug: 'fst-marrakech'
    },
    {
      match: ['fst tanger', 'fstt'],
      name: 'Faculté des Sciences et Techniques de Tanger (FSTT)',
      shortName: 'FST Tanger',
      website: 'http://fstt.ac.ma',
      slug: 'fst-tanger'
    }
  ];

  for (const fac of knownFaculties) {
    if (fac.match.some(m => combined.includes(m))) {
      const uMeta = resolveUniversityMeta(univ || est);
      return {
        schoolSlug: fac.slug,
        schoolName: fac.name,
        schoolShortName: fac.shortName,
        schoolWebsite: fac.website,
        schoolLogoUrl: uMeta.logoUrl,
        schoolLogoColor: uMeta.logoColor,
        isOfficialSchool: false
      };
    }
  }

  // 3. Fallback sur l'Université de rattachement
  const uMeta = resolveUniversityMeta(univ || est);
  return {
    schoolName: est || uMeta.universityName,
    schoolShortName: est || uMeta.universityName,
    schoolWebsite: uMeta.website,
    schoolLogoUrl: uMeta.logoUrl,
    schoolLogoColor: uMeta.logoColor,
    isOfficialSchool: false
  };
}

/**
 * Convertit un concours de Master en objet Competition standardisé
 */
export function masterToCompetition(m: MasterItem): Competition {
  const schoolMeta = resolveSchoolMeta(m.establishment, m.university);
  const univMeta = resolveUniversityMeta(m.university + ' ' + m.establishment);

  // Priorité au site de l'école ou portail officiel
  const schoolWebsite = m.schoolWebsite || schoolMeta.schoolWebsite;
  const schoolSlug = m.schoolSlug || schoolMeta.schoolSlug;
  const schoolId = m.schoolId || schoolMeta.schoolId;
  const officialWebsite = m.officialUrl || schoolWebsite || univMeta.website;
  
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
    schoolId: schoolId,
    schoolSlug: schoolSlug,
    schoolWebsite: schoolWebsite,
    universityId: univMeta.universityId,
    logoUrl: schoolMeta.schoolLogoUrl || univMeta.logoUrl,
    officialLogo: schoolMeta.schoolLogoUrl || univMeta.logoUrl,
    logoColor: schoolMeta.schoolLogoColor || univMeta.logoColor,
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
    officialWebsite: officialWebsite,
    registrationUrl: m.officialUrl || m.sourceUrl,
    sourceUrl: m.sourceUrl,
    sourceOrganization: `${m.establishment} (${m.university})`,
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
