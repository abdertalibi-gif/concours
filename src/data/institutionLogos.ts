// ============================================================
// CONCOURS MAROC — MAPPING CENTRALISÉ DES LOGOS OFFICIELS
// Logos officiels locaux stockés dans public/assets/logos/
// AUCUN faux logo. AUCUN logo dessiné ou généré.
// ============================================================

import type { Competition, School, University, Ministry, DatabaseShape } from '../lib/types';

export interface LogoResolution {
  logoUrl?: string;
  hasRealLogo: boolean;
  source: 'custom_competition' | 'custom_institution' | 'official_institution' | 'university' | 'ministry' | 'fallback';
  displayName: string;
  badgeName: string;
  color?: string;
}

export const OFFICIAL_INSTITUTION_LOGOS: Record<string, string> = {
  // --- MINISTÈRES ---
  'min-education': '/assets/logos/ministries/education.png',
  'min-interieur': '/assets/logos/ministries/interieur.svg',
  'min-sante': '/assets/logos/ministries/sante.png',
  'min-sup': '/assets/logos/ministries/enssup.png',
  'min-agri': '/assets/logos/ministries/agriculture.svg',
  'min-justice': '/assets/logos/ministries/justice.png',
  'min-finances': '/assets/logos/ministries/finances.png',
  'min-equipement': '/assets/logos/ministries/equipement.svg',
  'min-culture': '/assets/logos/ministries/culture.png',
  'min-jeunesse': '/assets/logos/ministries/culture.png',
  'min-energie': '/assets/logos/ministries/energie.png',
  'min-numerique': '/assets/logos/ministries/numerique.svg',
  'min-industrie': '/assets/logos/ministries/industrie.png',

  // --- UNIVERSITÉS ---
  'univ-um5': '/assets/logos/universities/um5.png',
  'univ-uh2c': '/assets/logos/universities/uh2c.png',
  'univ-uca': '/assets/logos/universities/uca.webp',
  'univ-usmba': '/assets/logos/universities/usmba.jpg',
  'univ-uae': '/assets/logos/universities/uae.png',
  'univ-ump': '/assets/logos/universities/ump.svg',
  'univ-uiz': '/assets/logos/universities/uiz.jpg',
  'univ-uit': '/assets/logos/universities/uit.svg',
  'univ-umi': '/assets/logos/universities/umi.png',
  'univ-ucd': '/assets/logos/universities/ucd.jpg',
  'univ-uh1': '/assets/logos/universities/uh1.png',
  'univ-usms': '/assets/logos/universities/usms.png',
  'univ-aui': '/assets/logos/universities/aui.jpg',
  'univ-um6p': '/assets/logos/universities/um6p.png',

  // --- GRANDES ÉCOLES D'INGÉNIEURS & COMMERCE ---
  'ec-emi': '/assets/logos/schools/emi-rabat.png',
  'ec-ensias': '/assets/logos/schools/ensias-rabat.png',
  'ec-inpt': '/assets/logos/schools/inpt-rabat.jpg',
  'ec-ehtp': '/assets/logos/schools/ehtp-casablanca.png',
  'ec-ensam-meknes': '/assets/logos/schools/ensam-meknes.png',
  'ec-ensam-casablanca': '/assets/logos/schools/ensam-casablanca.png',
  'ec-iav': '/assets/logos/schools/iav-hassan-ii.png',
  'ec-iscae': '/assets/logos/schools/iscae.jpg',
  'ec-insea': '/assets/logos/institutes/insea-rabat.png',
  'ec-ena': '/assets/logos/schools/ena-rabat.jpg',
  'ec-aiac': '/assets/logos/schools/aiac.png',
  'ec-isic': '/assets/logos/institutes/isic-rabat.png',
  'ec-ofppt': '/assets/logos/institutes/ofppt.png',
  'ec-ens-rabat': '/assets/logos/schools/ens-rabat.png',
  'ec-enset-mohammedia': '/assets/logos/schools/enset-mohammedia.jpg',

  // --- ENSA (RÉSEAU NATIONAL ENSA MAROC) ---
  'ec-ensa-marrakech': '/assets/logos/schools/ensa-marrakech.png',
  'ec-ensa-agadir': '/assets/logos/schools/ensa-agadir.png',
  'ec-ensa-tanger': '/assets/logos/schools/ensa-tanger.jpg',
  'ec-ensa-oujda': '/assets/logos/schools/ensa-oujda.png',
  'ec-ensa-fes': '/assets/logos/schools/ensa-fes.png',
  'ec-ensa-kenitra': '/assets/logos/schools/ensa-kenitra.png',
  'ec-ensa-safi': '/assets/logos/schools/ensa-safi.png',
  'ec-ensa-alhoceima': '/assets/logos/schools/ensa-alhoceima.jpg',
  'ec-ensa-khouribga': '/assets/logos/schools/ensa-khouribga.jpg',
  'ec-ensa-eljadida': '/assets/logos/schools/ensa-eljadida.png',
  'ec-ensa-berrechid': '/assets/logos/schools/ensa-berrechid.png',
  'ec-ensa-benimellal': '/assets/logos/schools/ensa-benimellal.png',

  // --- ENCG (RÉSEAU NATIONAL ENCG MAROC) ---
  'ec-encg-settat': '/assets/logos/schools/encg-settat.png',
  'ec-encg-casablanca': '/assets/logos/schools/encg-casablanca.png',
  'ec-encg-tanger': '/assets/logos/schools/encg-tanger.png',
  'ec-encg-agadir': '/assets/logos/schools/encg-agadir.jpg',
  'ec-encg-marrakech': '/assets/logos/schools/encg-marrakech.jpg',
  'ec-encg-kenitra': '/assets/logos/schools/encg-kenitra.png',
  'ec-encg-oujda': '/assets/logos/schools/encg-oujda.png',
  'ec-encg-fes': '/assets/logos/schools/encg-fes.png',
  'ec-encg-eljadida': '/assets/logos/schools/encg-eljadida.png',
  'ec-encg-dakhla': '/assets/logos/schools/encg-dakhla.png',
  'ec-encg-benimellal': '/assets/logos/schools/encg-benimellal.png',
  'ec-encg-meknes': '/assets/logos/schools/encg-meknes.png',

  // --- EST (ÉCOLES SUPÉRIEURES DE TECHNOLOGIE) ---
  'ec-est-casablanca': '/assets/logos/schools/est-casablanca.png',
  'ec-est-sale': '/assets/logos/schools/est-sale.png',
  'ec-est-fes': '/assets/logos/schools/est-fes.png',

  // --- FST (FACULTÉS DES SCIENCES ET TECHNIQUES) ---
  'ec-fst-mohammedia': '/assets/logos/faculties/fst-mohammedia.png',
  'ec-fst-fes': '/assets/logos/faculties/fst-fes.png',
  'ec-fst-marrakech': '/assets/logos/faculties/fst-marrakech.png',

  // --- FACULTÉS DE MÉDECINE & PHARMACIE ---
  'ec-fmpr': '/assets/logos/faculties/fmpr.jpg',
  'ec-fmpc': '/assets/logos/faculties/fmpc.png',

  // --- INSTITUTS & SANTÉ ---
  'ec-ispits-rabat': '/assets/logos/institutes/ispits-rabat.png',
  'ec-ispits-casablanca': '/assets/logos/institutes/ispits-casablanca.png',
};

/**
 * CENTRAL LOGO RESOLVER
 * Résout le logo d'une entité (Concours, École/Établissement, Université, Ministère)
 * selon la chaîne de priorité stricte :
 * 1. customLogo du concours (si fourni)
 * 2. customLogo de l'institution
 * 3. officialLogo de l'institution (ou mapping centralisé)
 * 4. logo de l'université de rattachement
 * 5. logo du ministère de tutelle
 * 6. fallback neutre ("Logo non disponible")
 */
export function resolveInstitutionLogo(
  item: Competition | School | University | Ministry | any,
  options?: { db?: DatabaseShape; currentDB?: () => DatabaseShape }
): LogoResolution {
  if (!item) {
    return {
      logoUrl: undefined,
      hasRealLogo: false,
      source: 'fallback',
      displayName: 'Institution',
      badgeName: 'INCONNU',
    };
  }

  // 1. Si c'est un concours avec un customLogo
  if ('customLogo' in item && item.customLogo && item.customLogo.trim() !== '') {
    return {
      logoUrl: item.customLogo,
      hasRealLogo: true,
      source: 'custom_competition',
      displayName: item.title || item.organizationName || 'Concours',
      badgeName: item.organizationName || 'CONCOURS',
      color: item.logoColor || '#0B2A4A',
    };
  }

  // Helper pour trouver les entités dans la DB
  const getDB = (): DatabaseShape | null => {
    if (options?.db) return options.db;
    if (options?.currentDB) return options.currentDB();
    try {
      const raw = localStorage.getItem('concours_maroc_db_v1');
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignorer
    }
    return null;
  };

  const db = getDB();

  // Si c'est un concours, trouver l'établissement ou le ministère
  let targetSchool: School | undefined;
  let targetUniversity: University | undefined;
  let targetMinistry: Ministry | undefined;

  if ('schoolId' in item && item.schoolId && db) {
    targetSchool = db.schools?.find((s) => s.id === item.schoolId);
  } else if ('type' in item && 'city' in item && 'region' in item) {
    // L'item est lui-même une School
    targetSchool = item as School;
  }

  if (targetSchool) {
    // 2. customLogo de l'institution
    if (targetSchool.customLogo && targetSchool.customLogo.trim() !== '') {
      return {
        logoUrl: targetSchool.customLogo,
        hasRealLogo: true,
        source: 'custom_institution',
        displayName: targetSchool.name,
        badgeName: targetSchool.shortName || targetSchool.name,
        color: targetSchool.logoColor || '#0B2A4A',
      };
    }

    // 3. officialLogo de l'institution
    const official = targetSchool.officialLogo || OFFICIAL_INSTITUTION_LOGOS[targetSchool.id];
    if (official && official.trim() !== '') {
      return {
        logoUrl: official,
        hasRealLogo: true,
        source: 'official_institution',
        displayName: targetSchool.name,
        badgeName: targetSchool.shortName || targetSchool.name,
        color: targetSchool.logoColor || '#0B2A4A',
      };
    }

    // 4. Logo de l'université de rattachement
    if (targetSchool.universityId && db) {
      targetUniversity = db.universities?.find((u) => u.id === targetSchool!.universityId);
      if (targetUniversity) {
        const uLogo =
          targetUniversity.customLogo ||
          targetUniversity.officialLogo ||
          OFFICIAL_INSTITUTION_LOGOS[targetUniversity.id] ||
          targetUniversity.logoUrl;
        if (uLogo && uLogo.trim() !== '') {
          return {
            logoUrl: uLogo,
            hasRealLogo: true,
            source: 'university',
            displayName: targetSchool.name,
            badgeName: targetSchool.shortName || targetSchool.name,
            color: targetUniversity.logoColor || targetSchool.logoColor || '#0B2A4A',
          };
        }
      }
    }

    // 5. Logo du ministère de tutelle
    const minId = targetSchool.ministryId || (targetUniversity && targetUniversity.ministryId);
    if (minId && db) {
      targetMinistry = db.ministries?.find((m) => m.id === minId);
      if (targetMinistry) {
        const mLogo =
          targetMinistry.customLogo ||
          targetMinistry.officialLogo ||
          OFFICIAL_INSTITUTION_LOGOS[targetMinistry.id] ||
          targetMinistry.logoUrl;
        if (mLogo && mLogo.trim() !== '') {
          return {
            logoUrl: mLogo,
            hasRealLogo: true,
            source: 'ministry',
            displayName: targetSchool.name,
            badgeName: targetSchool.shortName || targetSchool.name,
            color: targetMinistry.logoColor || '#0B2A4A',
          };
        }
      }
    }

    // Fallback pour School si aucun logo
    return {
      logoUrl: targetSchool.logoUrl,
      hasRealLogo: Boolean(targetSchool.logoUrl),
      source: targetSchool.logoUrl ? 'official_institution' : 'fallback',
      displayName: targetSchool.name,
      badgeName: targetSchool.shortName || targetSchool.name,
      color: targetSchool.logoColor || '#0B2A4A',
    };
  }

  // Si l'item est une Université
  if ('city' in item && 'region' in item && !('type' in item) && ('website' in item || 'shortName' in item)) {
    const univ = item as University;
    const uLogo = univ.customLogo || univ.officialLogo || OFFICIAL_INSTITUTION_LOGOS[univ.id] || univ.logoUrl;
    return {
      logoUrl: uLogo,
      hasRealLogo: Boolean(uLogo),
      source: univ.customLogo ? 'custom_institution' : uLogo ? 'university' : 'fallback',
      displayName: univ.name,
      badgeName: univ.shortName || univ.name,
      color: univ.logoColor || '#0B2A4A',
    };
  }

  // Si l'item est un Ministère (ou concours rattaché directement à un Ministère)
  let ministryObj: Ministry | undefined;
  if ('ministryId' in item && item.ministryId && db) {
    ministryObj = db.ministries?.find((m) => m.id === item.ministryId);
  } else if ('status' in item && 'slug' in item && 'name' in item) {
    ministryObj = item as Ministry;
  }

  if (ministryObj) {
    const mLogo =
      ministryObj.customLogo ||
      ministryObj.officialLogo ||
      OFFICIAL_INSTITUTION_LOGOS[ministryObj.id] ||
      ministryObj.logoUrl ||
      '/assets/logos/ministries/royaume-maroc.svg';
    return {
      logoUrl: mLogo,
      hasRealLogo: true,
      source: ministryObj.customLogo ? 'custom_institution' : 'ministry',
      displayName: ministryObj.name,
      badgeName: ministryObj.shortName || ministryObj.name,
      color: ministryObj.logoColor || '#0B2A4A',
    };
  }

  // Dernier recours : logoUrl direct de l'item ou fallback
  const fallbackUrl = item.logoUrl || OFFICIAL_INSTITUTION_LOGOS[item.id];
  return {
    logoUrl: fallbackUrl,
    hasRealLogo: Boolean(fallbackUrl),
    source: fallbackUrl ? 'official_institution' : 'fallback',
    displayName: item.name || item.title || item.organizationName || 'Institution',
    badgeName: item.shortName || item.organizationName || 'INSTITUTION',
    color: item.logoColor || '#0B2A4A',
  };
}
