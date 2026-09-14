import { runAlmasterImport } from './almasterImporter.js';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

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

export interface SyncSummaryData {
  id: string;
  createdAt: string;
  totalFound: number;
  newCount: number;
  updatedCount: number;
  duplicateCount: number;
  errorCount: number;
  openCount: number;
  upcomingCount: number;
  closedCount: number;
  examUpcomingCount: number;
  resultsCount: number;
  informationCount: number;
  details: string[];
}

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const MASTERS_FILE = path.join(DATA_DIR, 'masters.json');
const LOGS_FILE = path.join(DATA_DIR, 'sync-logs.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Initial realistic 2026-2027 Moroccan University Masters Seed
const INITIAL_MASTERS: MasterItem[] = [
  {
    id: 'mst-um5-fsr-ia-2026',
    uniqueKey: 'universite-mohammed-v-rabat-faculte-des-sciences-rabat-master-intelligence-artificielle-et-sciences-des-donnees-2026-2027',
    name: 'Master Intelligence Artificielle et Sciences des Données (IASD)',
    university: 'Université Mohammed V de Rabat',
    establishment: 'Faculté des Sciences de Rabat (FSR)',
    city: 'Rabat',
    domain: 'Informatique & Technologies',
    level: 'Master Spécialisé / MST',
    academicYear: '2026-2027',
    openingDate: '2026-06-15T00:00:00.000Z',
    deadlineDate: '2026-09-25T23:59:59.000Z',
    examDate: '2026-10-05T09:00:00.000Z',
    publicationDate: '2026-06-01T10:00:00.000Z',
    resultsDate: '2026-10-12T14:00:00.000Z',
    conditions: 'Licence en Informatique, Mathématiques ou équivalent. Mention Assez Bien minimum. Étude de dossier et épreuve écrite.',
    documents: 'CV détaillé, Lettre de motivation, Copies certifiées des diplômes, Relevés de notes S1 à S6, Copie CIN.',
    seats: 35,
    officialUrl: 'http://preinscription.um5.ac.ma',
    sourceUrl: 'https://www.almaster-maroc.com/master-fsr-rabat-ia-2026/',
    schoolSlug: 'fs-rabat',
    schoolWebsite: 'http://www.fsr.ac.ma',
    universityWebsite: 'https://www.um5.ac.ma',
    status: 'OUVERT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mst-uh2c-encg-cca-2026',
    uniqueKey: 'universite-hassan-ii-casablanca-encg-casablanca-master-comptabilite-controle-audit-2026-2027',
    name: 'Master Comptabilité, Contrôle et Audit (CCA)',
    university: 'Université Hassan II de Casablanca',
    establishment: 'ENCG Casablanca',
    city: 'Casablanca',
    domain: 'Économie & Gestion',
    level: 'Master Spécialisé',
    academicYear: '2026-2027',
    openingDate: '2026-07-01T00:00:00.000Z',
    deadlineDate: '2026-09-30T23:59:59.000Z',
    examDate: '2026-10-10T08:30:00.000Z',
    publicationDate: '2026-06-10T00:00:00.000Z',
    resultsDate: null,
    conditions: 'Licence fondamentale ou professionnelle en Économie et Gestion. Test écrit en comptabilité approfondie et entretien oral.',
    documents: 'Relevés de notes universitaires, Diplôme du Baccalauréat, Attestation de réussite en Licence, Copie CIN.',
    seats: 40,
    officialUrl: 'https://encgcasa.ac.ma/candidatures-master/',
    sourceUrl: 'https://www.almaster-maroc.com/master-encg-casablanca-cca/',
    schoolId: 'ec-encg-casablanca',
    schoolSlug: 'encg-casablanca',
    schoolWebsite: 'https://encgcasa.ac.ma',
    universityWebsite: 'http://www.univh2c.ma',
    status: 'OUVERT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mst-uca-fssm-cyber-2026',
    uniqueKey: 'universite-cadi-ayyad-marrakech-faculte-des-sciences-sem lalia-master-cybersecurite-et-systemes-embarques-2026-2027',
    name: 'Master Cybersécurité et Systèmes Embarqués Intelligents',
    university: 'Université Cadi Ayyad de Marrakech',
    establishment: 'Faculté des Sciences Semlalia (FSSM)',
    city: 'Marrakech',
    domain: 'Ingénierie & Informatique',
    level: 'Master Recherche / MST',
    academicYear: '2026-2027',
    openingDate: '2026-10-01T00:00:00.000Z',
    deadlineDate: '2026-10-25T23:59:59.000Z',
    examDate: '2026-11-02T09:00:00.000Z',
    publicationDate: '2026-08-15T00:00:00.000Z',
    resultsDate: null,
    conditions: 'Licence SMI, SMA ou diplôme d’ingénieur reconnu. Présélection sur dossier puis test de programmation et réseaux.',
    documents: 'Dossier académique complet, relevés de notes du S1 au S6, CIN, photo d’identité.',
    seats: 30,
    officialUrl: 'https://candidature.uca.ma',
    sourceUrl: 'https://www.almaster-maroc.com/master-fssm-marrakech-cybersecurite/',
    schoolSlug: 'fssm-marrakech',
    schoolWebsite: 'https://www.fssm.uca.ma',
    universityWebsite: 'https://www.uca.ma',
    status: 'A_VENIR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mst-usmba-fsjes-droit-2026',
    uniqueKey: 'universite-sidi-mohamed-ben-abdellah-fes-fsjes-fes-master-droit-des-affaires-et-de-lentreprise-2026-2027',
    name: 'Master Droit des Affaires et Juriste d’Entreprise',
    university: 'Université Sidi Mohamed Ben Abdellah de Fès',
    establishment: 'FSJES Fès',
    city: 'Fès',
    domain: 'Droit & Sciences Politiques',
    level: 'Master Fondamental',
    academicYear: '2026-2027',
    openingDate: '2026-05-10T00:00:00.000Z',
    deadlineDate: '2026-07-20T23:59:59.000Z',
    examDate: '2026-09-28T09:00:00.000Z',
    publicationDate: '2026-05-01T00:00:00.000Z',
    resultsDate: '2026-10-05T00:00:00.000Z',
    conditions: 'Licence en Droit Privé (Français). Mention minimum Assez Bien. Épreuve écrite de dissertation juridique.',
    documents: 'Copie certifiée conforme de la Licence et du Baccalauréat, relevés de notes.',
    seats: 50,
    officialUrl: 'https://portail.usmba.ac.ma',
    sourceUrl: 'https://www.almaster-maroc.com/master-droit-affaires-fsjes-fes/',
    schoolSlug: 'fsjes-fes',
    schoolWebsite: 'http://fsjes.usmba.ac.ma',
    universityWebsite: 'http://www.usmba.ac.ma',
    status: 'CONCOURS_A_VENIR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mst-uae-ensa-genie-civil-2026',
    uniqueKey: 'universite-abdelmalek-essaadi-tetouan-ensa-tetouan-master-genie-civil-et-infrastructures-durables-2026-2027',
    name: 'Master Génie Civil et Infrastructures Durables',
    university: 'Université Abdelmalek Essaâdi',
    establishment: 'ENSA Tétouan',
    city: 'Tétouan',
    domain: 'Génie Civil & BTP',
    level: 'Master Sciences et Techniques (MST)',
    academicYear: '2026-2027',
    openingDate: '2026-04-01T00:00:00.000Z',
    deadlineDate: '2026-06-15T23:59:59.000Z',
    examDate: '2026-07-02T10:00:00.000Z',
    publicationDate: '2026-03-20T00:00:00.000Z',
    resultsDate: '2026-07-15T12:00:00.000Z',
    conditions: 'Licence en Génie Civil, Mécanique ou Physique appliquée. Test écrit et entretien oral.',
    documents: 'CV, Lettre de motivation, Relevés de notes S1-S6, Diplômes.',
    seats: 25,
    officialUrl: 'https://ensa-tetouan.ac.ma/masters/',
    sourceUrl: 'https://www.almaster-maroc.com/master-genie-civil-ensa-tetouan/',
    schoolId: 'ec-ensa-tetouan',
    schoolSlug: 'ensa-tetouan',
    schoolWebsite: 'https://ensa-tetouan.ac.ma',
    universityWebsite: 'https://www.uae.ac.ma',
    status: 'RESULTATS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mst-uiz-fsa-energies-2026',
    uniqueKey: 'universite-ibn-zohr-agadir-faculte-des-sciences-agadir-master-energies-renouvelables-et-efficacite-energetique-2026-2027',
    name: 'Master Énergies Renouvelables et Efficacité Énergétique',
    university: 'Université Ibn Zohr d’Agadir',
    establishment: 'Faculté des Sciences d’Agadir (FSA)',
    city: 'Agadir',
    domain: 'Environnement & Énergies',
    level: 'Master Spécialisé',
    academicYear: '2026-2027',
    openingDate: null,
    deadlineDate: null,
    examDate: null,
    publicationDate: '2026-08-01T00:00:00.000Z',
    resultsDate: null,
    conditions: 'Licence en Physique, Chimie, Électrotechnique ou diplôme équivalent.',
    documents: 'Relevés de notes, Lettre de motivation, Diplôme de Licence.',
    seats: 30,
    officialUrl: 'https://preinscription.uiz.ac.ma',
    sourceUrl: 'https://www.almaster-maroc.com/master-energies-renouvelables-uiz-agadir/',
    schoolSlug: 'fsa-agadir',
    schoolWebsite: 'http://fsa.uiz.ac.ma',
    universityWebsite: 'https://www.uiz.ac.ma',
    status: 'INFORMATION',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mst-uit-flsh-com-2026',
    uniqueKey: 'universite-ibn-tofail-kenitra-flsh-kenitra-master-communication-des-organisations-et-medias-2026-2027',
    name: 'Master Communication des Organisations et Nouveaux Médias',
    university: 'Université Ibn Tofaïl de Kénitra',
    establishment: 'FLSH Kénitra',
    city: 'Kénitra',
    domain: 'Lettres, Médias & Communication',
    level: 'Master Professionnel',
    academicYear: '2026-2027',
    openingDate: '2026-05-01T00:00:00.000Z',
    deadlineDate: '2026-06-30T23:59:59.000Z',
    examDate: '2026-07-10T09:00:00.000Z',
    publicationDate: '2026-04-20T00:00:00.000Z',
    resultsDate: '2026-07-25T00:00:00.000Z',
    conditions: 'Licence en Études Françaises, Information-Communication, Journalisme ou Sociologie.',
    documents: 'Dossier de candidature en ligne, relevés de notes, projet professionnel.',
    seats: 35,
    officialUrl: 'https://ent.uit.ac.ma',
    sourceUrl: 'https://www.almaster-maroc.com/master-communication-flsh-kenitra/',
    schoolSlug: 'flsh-kenitra',
    schoolWebsite: 'https://flsh.uit.ac.ma',
    universityWebsite: 'https://uit.ac.ma',
    status: 'FERME',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function enrichMasterWithSchoolInfo(m: MasterItem): MasterItem {
  if (m.schoolWebsite && m.schoolSlug) return m;
  const est = (m.establishment || '').toLowerCase();
  let schoolWebsite = m.schoolWebsite;
  let schoolSlug = m.schoolSlug;
  let schoolId = m.schoolId;

  if (est.includes('encg') && est.includes('casablanca')) {
    schoolId = 'ec-encg-casablanca';
    schoolSlug = 'encg-casablanca';
    schoolWebsite = 'https://encgcasa.ac.ma';
  } else if (est.includes('ensa') && (est.includes('tétouan') || est.includes('tetouan'))) {
    schoolId = 'ec-ensa-tetouan';
    schoolSlug = 'ensa-tetouan';
    schoolWebsite = 'https://ensa-tetouan.ac.ma';
  } else if (est.includes('fsr') || (est.includes('faculté des sciences') && est.includes('rabat'))) {
    schoolSlug = 'fs-rabat';
    schoolWebsite = 'http://www.fsr.ac.ma';
  } else if (est.includes('fssm') || est.includes('semlalia')) {
    schoolSlug = 'fssm-marrakech';
    schoolWebsite = 'https://www.fssm.uca.ma';
  } else if (est.includes('fsa') || (est.includes('sciences') && est.includes('agadir'))) {
    schoolSlug = 'fsa-agadir';
    schoolWebsite = 'http://fsa.uiz.ac.ma';
  } else if (est.includes('fsjes') && (est.includes('fès') || est.includes('fes'))) {
    schoolSlug = 'fsjes-fes';
    schoolWebsite = 'http://fsjes.usmba.ac.ma';
  } else if (est.includes('flsh') && (est.includes('kénitra') || est.includes('kenitra'))) {
    schoolSlug = 'flsh-kenitra';
    schoolWebsite = 'https://flsh.uit.ac.ma';
  }

  return {
    ...m,
    schoolId: schoolId || m.schoolId,
    schoolSlug: schoolSlug || m.schoolSlug,
    schoolWebsite: schoolWebsite || m.schoolWebsite,
  };
}

export function parseDateSafe(dateVal: string | Date | null | undefined, isEndOfDay = false): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
  const str = String(dateVal).trim();
  if (!str) return null;

  // Check if date-only format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isEndOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  }

  // Check if date-only format DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const date = new Date(year, month, day);
    if (isEndOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  }

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

export function getMastersStore(): MasterItem[] {
  ensureDataDir();
  try {
    if (fs.existsSync(MASTERS_FILE)) {
      const content = fs.readFileSync(MASTERS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(enrichMasterWithSchoolInfo).map(m => {
          // Recompute status in real-time
          const rtStatus = computeMasterStatus({
            openingDate: parseDateSafe(m.openingDate, false),
            deadlineDate: parseDateSafe(m.deadlineDate, true),
            examDate: parseDateSafe(m.examDate, false),
            resultsDate: parseDateSafe(m.resultsDate, false),
            hasResultsPublished: m.status === 'RESULTATS'
          });
          return { ...m, status: rtStatus };
        });
      }
    }
  } catch (err) {
    console.error('Error reading masters file:', err);
  }
  // Initialize with seed
  saveMastersStore(INITIAL_MASTERS);
  return INITIAL_MASTERS;
}

export function saveMastersStore(masters: MasterItem[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(MASTERS_FILE, JSON.stringify(masters, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving masters file:', err);
  }
}

export function getSyncLogs(): SyncSummaryData[] {
  ensureDataDir();
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const content = fs.readFileSync(LOGS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading logs file:', err);
  }
  return [];
}

export function saveSyncLog(log: SyncSummaryData) {
  ensureDataDir();
  try {
    const logs = getSyncLogs();
    logs.unshift(log);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(0, 30), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sync log:', err);
  }
}

/**
 * Compute status automatically based on dates and available information:
 * - OUVERT : candidature actuellement ouverte (openingDate <= now <= deadlineDate, or deadline in future)
 * - FERME (CLÔTURÉ) : date limite dépassée (now > deadlineDate)
 * - A_VENIR : candidature pas encore ouverte (now < openingDate)
 * - CONCOURS_A_VENIR : candidature terminée mais concours pas encore passé (now > deadlineDate && now < examDate)
 * - RESULTATS : résultats publiés (resultsDate <= now or marked in text)
 * - INFORMATION : aucune date fiable disponible
 */
export function computeMasterStatus(params: {
  openingDate: Date | null;
  deadlineDate: Date | null;
  examDate: Date | null;
  resultsDate: Date | null;
  hasResultsPublished?: boolean;
  referenceDate?: Date;
}): MasterItem['status'] {
  const now = params.referenceDate && !isNaN(params.referenceDate.getTime())
    ? params.referenceDate
    : new Date();

  if (params.hasResultsPublished || (params.resultsDate && params.resultsDate <= now)) {
    return 'RESULTATS';
  }

  if (params.deadlineDate) {
    // Has passed deadline
    if (now > params.deadlineDate) {
      if (params.examDate && now < params.examDate) {
        return 'CONCOURS_A_VENIR';
      }
      return 'FERME';
    }
    // Before deadline
    if (params.openingDate && now < params.openingDate) {
      return 'A_VENIR';
    }
    return 'OUVERT';
  }

  if (params.openingDate) {
    if (now < params.openingDate) {
      return 'A_VENIR';
    }
    return 'OUVERT';
  }

  return 'INFORMATION';
}

export interface StatusUpdateChange {
  id: string;
  name: string;
  establishment: string;
  university: string;
  oldStatus: MasterItem['status'];
  newStatus: MasterItem['status'];
  deadlineDate: string | null;
  openingDate: string | null;
}

export interface StatusUpdateSummary {
  success: boolean;
  timestamp: string;
  total: number;
  updatedCount: number;
  stats: {
    ouvert: number;
    aVenir: number;
    cloture: number;
    concoursAVenir: number;
    resultats: number;
    information: number;
  };
  changes: StatusUpdateChange[];
  message: string;
}

/**
 * Fonction utilitaire pour mettre à jour automatiquement le statut
 * (OUVERT, À VENIR, CLÔTURÉ) de tous les masters dans la base de données
 * en comparant la date limite actuelle avec la date du jour.
 *
 * RÈGLES APPLIQUÉES :
 * - CLÔTURÉ (FERME) : now > deadlineDate (date limite dépassée par rapport à la date du jour)
 * - À VENIR (A_VENIR) : now < openingDate (date d'ouverture dans le futur)
 * - OUVERT : candidature active (openingDate <= now <= deadlineDate, ou deadline future)
 * 
 * Les statuts modifiés sont immédiatement persistés dans la base de données.
 */
export function updateAllMastersStatus(referenceDate: Date = new Date()): StatusUpdateSummary {
  ensureDataDir();
  let masters: MasterItem[] = [];

  try {
    if (fs.existsSync(MASTERS_FILE)) {
      const content = fs.readFileSync(MASTERS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        masters = parsed;
      }
    }
  } catch (err) {
    console.error('Error reading masters file during status update:', err);
  }

  if (masters.length === 0) {
    masters = [...INITIAL_MASTERS];
  }

  const now = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  const nowIso = now.toISOString();

  let updatedCount = 0;
  const changes: StatusUpdateChange[] = [];
  const stats = {
    ouvert: 0,
    aVenir: 0,
    cloture: 0,
    concoursAVenir: 0,
    resultats: 0,
    information: 0,
  };

  const updatedMasters = masters.map((m) => {
    const oldStatus = m.status;
    const newStatus = computeMasterStatus({
      openingDate: parseDateSafe(m.openingDate, false),
      deadlineDate: parseDateSafe(m.deadlineDate, true),
      examDate: parseDateSafe(m.examDate, false),
      resultsDate: parseDateSafe(m.resultsDate, false),
      hasResultsPublished: oldStatus === 'RESULTATS',
      referenceDate: now,
    });

    if (newStatus === 'OUVERT') stats.ouvert++;
    else if (newStatus === 'A_VENIR') stats.aVenir++;
    else if (newStatus === 'FERME') stats.cloture++;
    else if (newStatus === 'CONCOURS_A_VENIR') stats.concoursAVenir++;
    else if (newStatus === 'RESULTATS') stats.resultats++;
    else stats.information++;

    if (oldStatus !== newStatus) {
      updatedCount++;
      changes.push({
        id: m.id,
        name: m.name,
        establishment: m.establishment,
        university: m.university,
        oldStatus,
        newStatus,
        deadlineDate: m.deadlineDate || null,
        openingDate: m.openingDate || null,
      });
      return {
        ...m,
        status: newStatus,
        updatedAt: nowIso,
      };
    }

    return m;
  });

  if (updatedCount > 0) {
    saveMastersStore(updatedMasters);
    console.log(`[MastersService] 🔄 ${updatedCount} master(s) mis à jour en base de données selon la date du jour (${now.toLocaleDateString('fr-FR')}).`);
  }

  const message = updatedCount > 0
    ? `Mise à jour automatique effectuée : ${updatedCount} master(s) mis à jour (${stats.ouvert} OUVERT, ${stats.aVenir} À VENIR, ${stats.cloture} CLÔTURÉ).`
    : `Tous les statuts sont déjà synchronisés avec la date du jour (${stats.ouvert} OUVERT, ${stats.aVenir} À VENIR, ${stats.cloture} CLÔTURÉ).`;

  return {
    success: true,
    timestamp: nowIso,
    total: masters.length,
    updatedCount,
    stats,
    changes,
    message,
  };
}

export function generateUniqueKey(university: string, establishment: string, name: string, academicYear: string): string {
  const clean = (str: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  return `${clean(university)}-${clean(establishment)}-${clean(name)}-${clean(academicYear)}`;
}

/**
 * Service de synchronisation automatique depuis AlMaster-Maroc (https://www.almaster-maroc.com/)
 */
export async function syncMastersFromAlMaster(): Promise<SyncSummaryData> {
  return await runAlmasterImport();
}

export function createMaster(data: Partial<MasterItem>): MasterItem {
  const store = getMastersStore();
  const now = new Date().toISOString();
  const slug = (data.name || 'master')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const id = `mst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const uniqueKey = data.uniqueKey || `manual-${slug}-${Date.now()}`;

  const newMaster: MasterItem = {
    id,
    uniqueKey,
    name: data.name?.trim() || 'Nouveau Master Universitaire',
    university: data.university?.trim() || 'Université Marocaine',
    establishment: data.establishment?.trim() || 'Faculté / Établissement',
    city: data.city?.trim() || 'Rabat',
    domain: data.domain?.trim() || 'Sciences et Technologies',
    level: data.level?.trim() || 'Master (Bac+5)',
    academicYear: data.academicYear?.trim() || '2026-2027',
    openingDate: data.openingDate || null,
    deadlineDate: data.deadlineDate || null,
    examDate: data.examDate || null,
    publicationDate: data.publicationDate || now.split('T')[0],
    resultsDate: data.resultsDate || null,
    conditions: data.conditions?.trim() || 'Licence requise dans le domaine d’études. Présélection sur dossier.',
    documents: data.documents?.trim() || 'CV, Relevés de notes S1-S6, Diplôme de Licence, Copie CIN.',
    seats: typeof data.seats === 'number' ? data.seats : (data.seats ? parseInt(String(data.seats), 10) : null),
    officialUrl: data.officialUrl?.trim() || null,
    sourceUrl: data.sourceUrl?.trim() || data.officialUrl?.trim() || '',
    status: (data.status as any) || 'OUVERT',
    schoolId: data.schoolId,
    schoolSlug: data.schoolSlug,
    schoolWebsite: data.schoolWebsite,
    universityWebsite: data.universityWebsite,
    createdAt: now,
    updatedAt: now
  };

  const enriched = enrichMasterWithSchoolInfo(newMaster);
  store.unshift(enriched);
  saveMastersStore(store);
  return enriched;
}

export function updateMaster(id: string, updates: Partial<MasterItem>): MasterItem | null {
  const store = getMastersStore();
  const idx = store.findIndex(m => m.id === id || m.uniqueKey === id);
  if (idx === -1) return null;

  const current = store[idx];
  const updated: MasterItem = {
    ...current,
    ...updates,
    id: current.id,
    uniqueKey: current.uniqueKey,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
    university: updates.university !== undefined ? updates.university.trim() : current.university,
    establishment: updates.establishment !== undefined ? updates.establishment.trim() : current.establishment,
    city: updates.city !== undefined ? updates.city.trim() : current.city,
    domain: updates.domain !== undefined ? updates.domain.trim() : current.domain,
    level: updates.level !== undefined ? updates.level.trim() : current.level,
    academicYear: updates.academicYear !== undefined ? updates.academicYear.trim() : current.academicYear,
    seats: updates.seats !== undefined 
      ? (typeof updates.seats === 'number' ? updates.seats : (updates.seats ? parseInt(String(updates.seats), 10) : null))
      : current.seats,
    officialUrl: updates.officialUrl !== undefined ? (updates.officialUrl?.trim() || null) : current.officialUrl,
    schoolWebsite: updates.schoolWebsite !== undefined ? (updates.schoolWebsite?.trim() || undefined) : current.schoolWebsite,
    updatedAt: new Date().toISOString()
  };

  const enriched = enrichMasterWithSchoolInfo(updated);
  store[idx] = enriched;
  saveMastersStore(store);
  return enriched;
}

export function deleteMaster(id: string): boolean {
  const store = getMastersStore();
  const filtered = store.filter(m => m.id !== id && m.uniqueKey !== id);
  if (filtered.length === store.length) return false;
  saveMastersStore(filtered);
  return true;
}
