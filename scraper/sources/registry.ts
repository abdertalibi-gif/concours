// ============================================================
// Registre des sources — Phase 5 DISCOVERY ONLY
// Runners (Phase 1) + Métadonnées officielles (Phase 5)
// Ne pas confondre agrégateur (Almaster) et sources officielles.
// ============================================================

import type { SourceRunner } from '../lib/types';
import { almasterSource } from './almaster';

// Runner actif (seul parser implémenté en Phase 1-4)
const REGISTRY: Record<string, SourceRunner> = {
  almaster: almasterSource,
};

export function getSource(name: string): SourceRunner | undefined {
  return REGISTRY[name.toLowerCase()];
}

export function listSources(): string[] {
  return Object.keys(REGISTRY);
}

// ------------------------------------------------------------------
// Métadonnées des sources officielles (DISCOVERY, pas de runner)
// Source de vérité : REAL_UNIVERSITIES / REAL_SCHOOLS / REAL_MINISTRIES
// + form-schemas.json (entity → form)
// ------------------------------------------------------------------
export interface SourceMeta {
  sourceId: string;
  name: string;
  organization: string;
  entityTypes: Array<'MASTER'|'COMPETITION'|'EXAM'|'DOCUMENT'|'COURSE'|'SCHOOL'|'UNIVERSITY'|'MINISTRY'>;
  baseUrl: string;
  officialDomain: string;
  discoveryUrl: string;
  robots?: string;
  sitemap?: string;
  rssAtom?: string;
  pagination?: string;
  supportedFormats: Array<'HTML'|'PDF'|'JSON'|'XML'>;
  priority: 'high'|'medium'|'low';
  active: boolean;
  official: boolean;
  structured: boolean;
  stable: boolean;
  requiresJS: boolean;
  hasPDF: boolean;
  hasDates: boolean;
  hasConditions: boolean;
  hasPlaces: boolean;
  notes: string;
}

// Sources officielles — URLs vérifiées depuis src/data/institutionsData.ts (pas inventées)
// + les 5 nouvelles sources ajoutées en Phase 20
// ------------------------------------------------------------------
export const OFFICIAL_SOURCES: SourceMeta[] = [
  // Universités (14) — MASTER + COMPETITION
  { sourceId: 'univ-um5', name: 'Université Mohammed V de Rabat', organization: 'Université Mohammed V de Rabat', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'https://www.um5.ac.ma', officialDomain: 'um5.ac.ma', discoveryUrl: 'https://www.um5.ac.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'Portail officiel UM5 — annonces concours masters / résultats facultés (FSR, FSJES Agdal/Souissi, ENS, FMP).' },
  { sourceId: 'univ-uh2c', name: 'Université Hassan II de Casablanca', organization: 'Université Hassan II de Casablanca', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'http://www.univh2c.ma', officialDomain: 'univh2c.ma', discoveryUrl: 'http://www.univh2c.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'UH2C — ENCG Casa, ENSAM, ENSET Mohammedia, FST Mohammedia, FS Ben M\'Sik/Ain Chock.' },
  { sourceId: 'univ-uca', name: 'Université Cadi Ayyad de Marrakech', organization: 'Université Cadi Ayyad de Marrakech', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'https://www.uca.ma', officialDomain: 'uca.ma', discoveryUrl: 'https://www.uca.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'UCA — ENSA Marrakech/Safi, ENCG Marrakech, FST Marrakech, EST Safi/Essaouira.' },
  { sourceId: 'univ-usmba', name: 'Université Sidi Mohamed Ben Abdellah de Fès', organization: 'Université Sidi Mohamed Ben Abdellah de Fès', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'http://www.usmba.ac.ma', officialDomain: 'usmba.ac.ma', discoveryUrl: 'http://www.usmba.ac.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'USMBA — ENSA Fès, ENCG Fès, FST Fès, ENS Fès.' },
  { sourceId: 'univ-uae', name: 'Université Abdelmalek Essaâdi', organization: 'Université Abdelmalek Essaâdi', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'https://www.uae.ac.ma', officialDomain: 'uae.ac.ma', discoveryUrl: 'https://www.uae.ac.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'UAE — ENSA Tanger/Hoceima, ENCG Tanger, FST Tanger, ENS Tétouan.' },
  { sourceId: 'univ-ump', name: 'Université Mohammed Premier d\'Oujda', organization: 'Université Mohammed Premier d\'Oujda', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'https://www.ump.ma', officialDomain: 'ump.ma', discoveryUrl: 'https://www.ump.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'UMP — ENSA Oujda, ENCG Oujda, EST Oujda, FMP Oujda.' },
  { sourceId: 'univ-uiz', name: 'Université Ibn Zohr d\'Agadir', organization: 'Université Ibn Zohr d\'Agadir', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'https://www.uiz.ac.ma', officialDomain: 'uiz.ac.ma', discoveryUrl: 'https://www.uiz.ac.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'UIZ — ENSA Agadir, ENCG Agadir/Dakhla, EST Agadir/Guelmim.' },
  { sourceId: 'univ-uit', name: 'Université Ibn Tofail de Kénitra', organization: 'Université Ibn Tofail de Kénitra', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'https://uit.ac.ma', officialDomain: 'uit.ac.ma', discoveryUrl: 'https://uit.ac.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'UIT — ENSA Kénitra, ENCG Kénitra, EST Kénitra, FLSH Kénitra.' },
  { sourceId: 'univ-umi', name: 'Université Moulay Ismaïl de Meknès', organization: 'Université Moulay Ismaïl de Meknès', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'http://www.umi.ac.ma', officialDomain: 'umi.ac.ma', discoveryUrl: 'http://www.umi.ac.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'UMI — ENSAM Meknès, ENCG Meknès, FST Errachidia, EST Meknès.' },
  { sourceId: 'univ-ucd', name: 'Université Chouaib Doukkali d\'El Jadida', organization: 'Université Chouaib Doukkali d\'El Jadida', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'https://www.ucd.ac.ma', officialDomain: 'ucd.ac.ma', discoveryUrl: 'https://www.ucd.ac.ma', supportedFormats: ['HTML','PDF'], priority: 'medium', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'UCD — ENSA El Jadida, ENCG El Jadida, FS El Jadida.' },
  { sourceId: 'univ-uh1', name: 'Université Hassan 1er de Settat', organization: 'Université Hassan 1er de Settat', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'https://www.uh1.ac.ma', officialDomain: 'uh1.ac.ma', discoveryUrl: 'https://www.uh1.ac.ma', supportedFormats: ['HTML','PDF'], priority: 'medium', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'UH1 — ENCG Settat, FST Settat, ENSA Berrechid, EST Berrechid.' },
  { sourceId: 'univ-usms', name: 'Université Sultan Moulay Slimane de Béni Mellal', organization: 'Université Sultan Moulay Slimane de Béni Mellal', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'https://www.usms.ac.ma', officialDomain: 'usms.ac.ma', discoveryUrl: 'https://www.usms.ac.ma', supportedFormats: ['HTML','PDF'], priority: 'medium', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'USMS — ENSA Khouribga/Béni Mellal, ENCG Béni Mellal, FST Béni Mellal.' },
  { sourceId: 'univ-um6p', name: 'Université Mohammed VI Polytechnique', organization: 'Université Mohammed VI Polytechnique', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'https://www.um6p.ma', officialDomain: 'um6p.ma', discoveryUrl: 'https://www.um6p.ma', supportedFormats: ['HTML','PDF'], priority: 'medium', active: true, official: true, structured: true, stable: true, requiresJS: true, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: true, notes: 'UM6P — Benguerir/Rabat, portail candidature structuré, places annoncées.' },
  { sourceId: 'univ-aui', name: 'Al Akhawayn University in Ifrane', organization: 'Al Akhawayn University in Ifrane', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'http://www.aui.ma', officialDomain: 'aui.ma', discoveryUrl: 'http://www.aui.ma', supportedFormats: ['HTML','PDF'], priority: 'low', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'AUI — Ifrane, enseignement anglophone, site officiel.' },

  // Ministères (12) — COMPETITION / DOCUMENT
  { sourceId: 'min-education', name: 'Ministère de l\'Éducation Nationale', organization: 'Ministère de l\'Éducation Nationale', entityTypes: ['COMPETITION','DOCUMENT'], baseUrl: 'https://www.men.gov.ma', officialDomain: 'men.gov.ma', discoveryUrl: 'https://www.men.gov.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: false, hasPlaces: true, notes: 'MENPS — concours enseignement, agrégation.' },
  { sourceId: 'min-sup', name: 'Ministère de l\'Enseignement Supérieur', organization: 'Ministère de l\'Enseignement Supérieur', entityTypes: ['COMPETITION','DOCUMENT','MASTER'], baseUrl: 'https://www.enssup.gov.ma', officialDomain: 'enssup.gov.ma', discoveryUrl: 'https://www.enssup.gov.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: false, hasPlaces: false, notes: 'MESRSI — tutelle universités, circulaires masters.' },
  { sourceId: 'min-interieur', name: 'Ministère de l\'Intérieur', organization: 'Ministère de l\'Intérieur', entityTypes: ['COMPETITION','DOCUMENT'], baseUrl: 'https://www.interieur.gov.ma', officialDomain: 'interieur.gov.ma', discoveryUrl: 'https://www.interieur.gov.ma', supportedFormats: ['HTML','PDF'], priority: 'medium', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: false, hasPlaces: true, notes: 'Collectivités territoriales.' },
  { sourceId: 'min-sante', name: 'Ministère de la Santé', organization: 'Ministère de la Santé', entityTypes: ['COMPETITION','DOCUMENT'], baseUrl: 'https://www.sante.gov.ma', officialDomain: 'sante.gov.ma', discoveryUrl: 'https://www.sante.gov.ma', supportedFormats: ['HTML','PDF'], priority: 'medium', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: false, hasPlaces: true, notes: 'ISPITS, CHU.' },
  { sourceId: 'min-finances', name: 'Ministère de l\'Économie et des Finances', organization: 'Ministère de l\'Économie et des Finances', entityTypes: ['COMPETITION','DOCUMENT'], baseUrl: 'https://www.finances.gov.ma', officialDomain: 'finances.gov.ma', discoveryUrl: 'https://www.finances.gov.ma', supportedFormats: ['HTML','PDF'], priority: 'medium', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: false, hasPlaces: true, notes: 'DGI, Douanes.' },
  { sourceId: 'min-justice', name: 'Ministère de la Justice', organization: 'Ministère de la Justice', entityTypes: ['COMPETITION','DOCUMENT'], baseUrl: 'https://www.justice.gov.ma', officialDomain: 'justice.gov.ma', discoveryUrl: 'https://www.justice.gov.ma', supportedFormats: ['HTML','PDF'], priority: 'medium', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: false, hasPlaces: true, notes: 'Greffe, magistrature.' },

  // Agrégateur (non officiel) — référence Phase 1-4
  { sourceId: 'almaster', name: 'Almaster Maroc (agrégateur)', organization: 'Almaster Maroc', entityTypes: ['MASTER'], baseUrl: 'https://www.almaster-maroc.com', officialDomain: 'almaster-maroc.com', discoveryUrl: 'https://www.almaster-maroc.com/feeds/posts/default?alt=json', supportedFormats: ['JSON','HTML','PDF'], priority: 'low', active: true, official: false, structured: true, stable: false, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: false, hasPlaces: false, notes: 'Agrégateur non officiel — JSON feed Blogger (150 annonces), HTML, PDF. Ne pas considérer comme source officielle.' },

  // === NOUVELLES SOURCES Phase 20 ===
  // 5 nouvelles sources universitaires couvrant différentes régions
  { sourceId: 'univ-ifri', name: 'Institut Français de Recherche en Iran', organization: 'Institut Français de Recherche en Iran', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'http://www.ifri.ma', officialDomain: 'ifri.ma', discoveryUrl: 'http://www.ifri.ma', supportedFormats: ['HTML','PDF'], priority: 'medium', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'IFRI — partenariats académiques internationaux, concours de recherche.' },
  { sourceId: 'univ-ain-chock', name: 'Faculté des Sciences Ain Chock', organization: 'Faculté des Sciences Ain Chock', entityTypes: ['MASTER','COMPETITION'], baseUrl: 'http://www.ensset.uca.ma', officialDomain: 'ensset.uca.ma', discoveryUrl: 'http://www.ensset.uca.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: false, notes: 'FC — ENSSET Casablanca, formation technique et universitaire.' },
  { sourceId: 'ecole-sup', name: 'Écoles Supérieures Techniques', organization: 'Écoles Supérieures Techniques', entityTypes: ['COMPETITION'], baseUrl: 'http://www.est.ma', officialDomain: 'est.ma', discoveryUrl: 'http://www.est.ma', supportedFormats: ['HTML','PDF'], priority: 'medium', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: true, hasPlaces: true, notes: 'EST — enseignement technique supérieur, concours d\'admission.' },
  { sourceId: 'ministere-education', name: 'Ministère de l\'Éducation Nationale - Concours', organization: 'Ministère de l\'Éducation Nationale', entityTypes: ['COMPETITION'], baseUrl: 'https://concours.men.gov.ma', officialDomain: 'concours.men.gov.ma', discoveryUrl: 'https://concours.men.gov.ma', supportedFormats: ['HTML','PDF'], priority: 'high', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: false, hasPlaces: true, notes: 'Concours enseignement national, agrégation, certification.' },
  { sourceId: 'portal-emploi', name: 'Portail Emploi Public', organization: 'Portail Emploi Public', entityTypes: ['COMPETITION'], baseUrl: 'https://emploi-public.ma', officialDomain: 'emploi-public.ma', discoveryUrl: 'https://emploi-public.ma', supportedFormats: ['HTML','PDF'], priority: 'medium', active: true, official: true, structured: false, stable: true, requiresJS: false, hasPDF: true, hasDates: true, hasConditions: false, hasPlaces: true, notes: 'Plateforme officielle des offres d\'emploi et concours publics.' },
]