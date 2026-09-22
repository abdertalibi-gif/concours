// ============================================================
// Inférence : université, établissement, ville, région, domaine,
// niveau, année académique.
// Principe : AUCUNE donnée inventée.
//  - université : prouvée par titre/tags OU contenu avec le mot
//    "université/université" proche OU domaine URL du site officiel
//  - établissement : titre/tags priorisés, contenu seulement si
//    match spécifique (longueur ≥ 4) — pas de texte générique
//  - région : dérivée statiquement de la ville (carte officielle)
// ============================================================

import { normalizeStr, slugify } from './normalize';
import {
  CITY_REGIONS,
  ESTABLISHMENTS,
  MASTER_DOMAINS,
  MOROCCAN_CITIES,
  UNIVERSITIES,
  UNIVERSITY_DOMAINS,
} from '../sources/almaster_aliases';
import type { ParsedDates } from '../parsers/dates';

export function inferUniversity(
  raw: string,
  extraContent = '',
  links: string[] = [],
): { name: string; city: string; website: string } | undefined {
  const r = normalizeStr(raw);
  let best: (typeof UNIVERSITIES)[number] | null = null;
  let bestScore = 0;

  const scoreMatch = (source: string, aliases: string[]): number => {
    let score = 0;
    for (const alias of aliases) {
      const a = normalizeStr(alias);
      if (a.length > 2 && source.includes(a)) score += a.length;
    }
    return score;
  };

  for (const u of UNIVERSITIES) {
    const s = scoreMatch(r, [u.name, ...u.aliases]);
    if (s > bestScore) {
      best = u;
      bestScore = s;
    }
  }

  // 2) Contenu : l'alias doit être accompagné du mot "université"
  //    (l'occurrence dans une phrase = preuve, pas une simple coïncidence)
  if (!best && extraContent) {
    const c = normalizeStr(extraContent);
    for (const u of UNIVERSITIES) {
      const aliases = [u.name, ...u.aliases].filter((a) => normalizeStr(a).length >= 4);
      for (const alias of aliases) {
        const a = normalizeStr(alias);
        const idx = c.indexOf(a);
        if (idx < 0) continue;
        const ctx = c.slice(Math.max(0, idx - 60), idx + a.length + 60);
        if (/(universit|faculte des sciences juridiques)/.test(ctx)) {
          if (a.length > bestScore) {
            best = u;
            bestScore = a.length;
          }
          break;
        }
      }
    }
  }

  // 3) Preuve URL : le domaine du site officiel appartient à une université
  if (!best) {
    for (const link of links) {
      let host = '';
      try {
        host = new URL(link).hostname.replace(/^www\./, '');
      } catch {
        continue;
      }
      for (const [domain, uniName] of Object.entries(UNIVERSITY_DOMAINS)) {
        if (host === domain || host.endsWith('.' + domain)) {
          best = UNIVERSITIES.find((u) => u.name === uniName) ?? null;
          bestScore = 1;
          break;
        }
      }
      if (best) break;
    }
  }

  if (!best) return undefined;
  return { name: best.name, city: best.city, website: best.website };
}

export function inferEstablishment(
  raw: string,
  extraContent = '',
): { name: string; city?: string } | undefined {
  const r = normalizeStr(raw);
  let best: (typeof ESTABLISHMENTS)[number] | null = null;
  let bestScore = 0;

  const scoreIn = (source: string): void => {
    for (const e of ESTABLISHMENTS) {
      let score = 0;
      for (const alias of e.aliases) {
        const a = normalizeStr(alias);
        if (a.length > 2 && source.includes(a)) score += a.length;
      }
      if (score > bestScore) {
        best = e;
        bestScore = score;
      }
    }
  };
  scoreIn(r);

  // Contenu : seulement les alias assez spécifiques (longueur ≥ 4)
  // pour éviter un texte générique pris comme établissement.
  if (!best && extraContent) {
    const c = normalizeStr(extraContent);
    for (const e of ESTABLISHMENTS) {
      let score = 0;
      for (const alias of e.aliases) {
        const a = normalizeStr(alias);
        if (a.length >= 4 && c.includes(a)) score += a.length;
      }
      if (score > bestScore) {
        best = e;
        bestScore = score;
      }
    }
  }

  if (!best || bestScore === 0) return undefined;
  return { name: best.name, city: best.city };
}

export function inferCity(
  raw: string,
  estCity?: string,
  univCity?: string,
): string | undefined {
  if (estCity) return estCity;
  if (univCity) return univCity;
  const r = normalizeStr(raw);
  for (const city of MOROCCAN_CITIES) {
    const n = normalizeStr(city);
    if (n.length > 2) {
      const re = new RegExp(`\\b${escapeRegExp(n)}\\b`);
      if (re.test(r)) return city;
    }
  }
  return undefined;
}

/** Région : dérivation statique de la ville (carte officielle), jamais de devinette. */
export function inferRegion(city?: string): string | undefined {
  if (!city) return undefined;
  return CITY_REGIONS[city];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Détection du domaine (libellés alignés sur l'admin du site). */
export function inferDomain(raw: string): string | undefined {
  const r = normalizeStr(raw);

  const rules: Array<{ keywords: string[]; domain: string }> = [
    {
      keywords: [
        'intelligence artificielle', 'science des donnees', 'donnees', 'data science', 'big data',
        'informatique', 'genie logiciel', 'cybersecurite', 'systemes d information',
        'genie informatique', 'informatique decisionnelle', 'systemes embarques',
        'iot', 'machine learning', 'deep learning', 'automatisation',
      ],
      domain: 'Informatique & Intelligence Artificielle',
    },
    {
      keywords: [
        'droit', 'juridique', 'politique', 'sciences criminelles', 'droit des affaires',
        'droit public', 'droit prive', 'contentieux', 'droit penal', 'droit de la sante',
      ],
      domain: 'Droit, Sciences Juridiques & Politiques',
    },
    {
      keywords: [
        'economie', 'economique', 'finance', 'gestion des plateformes', 'gestion de projet',
        'comptabilite', 'audit', 'controle de gestion', 'banque', 'assurance', 'marketing',
        'commerce', 'management', 'entreprenariat', 'entrepreneuriat', 'gestion des risques',
        'ingenierie financiere', 'marche des capitaux', 'gestion du patrimoine', 'fiscalite',
      ],
      domain: 'Économie, Finance & Gestion',
    },
    {
      keywords: [
        'mathematique', 'statistique', 'modelisation', 'operationnel', 'recherche operationnelle',
        'mathematiques appliquees', 'optimisation', 'probabilite',
      ],
      domain: 'Sciences Mathématiques & Données',
    },
    {
      keywords: [
        'biologie', 'chimie', 'sante', 'pharmacie', 'environnement', 'agrobiologie',
        'sante publique', 'biotechnologie', 'biomedical', 'biologie moleculaire',
        'microbiologie', 'entomologie', 'nutrition', 'sciences pharmaceutiques',
        'toxicologie', 'ecologie', 'agroalimentaire',
      ],
      domain: 'Biologie, Chimie & Santé',
    },
    {
      keywords: [
        'lettres', 'langue', 'linguistique', 'humanite', 'francais', 'anglais', 'histoire',
        'traduction', 'communication', 'journalisme', 'arabe', 'litterature', 'audiovisuel',
        'patrimoine', 'etudes francaises',
      ],
      domain: 'Lettres, Langues & Sciences Humaines',
    },
    {
      keywords: [
        'ingenierie', 'ingenieur', 'technologie', 'genie', 'energie', 'electronique',
        'telecommunication', 'telecom', 'mecanique', 'civil', 'mecatronique', 'automatique',
        'industrie', 'aerospatiale', 'reseau', 'reseaux', 'genie civil', 'genie mecanique',
        'genie electrique', 'genie industriel', 'genie energetique', 'genie des procédés',
        'genie chimique', 'qualite', 'logistique', 'maintenance', 'hydro', 'batterie',
        'polymères', 'polymere', 'robotique', 'urbanisme',
      ],
      domain: 'Sciences & Technologies de l’Ingénieur',
    },
    {
      keywords: [
        'education', 'enseignement', 'pedagogie', 'didactique', 'formation', 'ingenierie pedagogique',
        'evaluation des apprentissages', 'developpement curriculaire',
      ],
      domain: 'Sciences de l’Éducation',
    },
    {
      keywords: [
        'commerce international', 'commerce et marketing', 'business', 'management strategique',
        'management des organisations', 'achat', 'distribution', 'handling', 'supply chain',
        'rh', 'ressources humaines', 'tourisme', 'hotellerie',
      ],
      domain: 'Management & Commerce International',
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => r.includes(kw))) return rule.domain;
  }
  return undefined;
}

/** Niveau : détection depuis le titre normalisé. */
export function inferLevel(title: string): string | undefined {
  const t = normalizeStr(title);
  if (t.includes('specialise')) return 'Master Spécialisé (Bac+5)';
  if (t.includes('recherche')) return 'Master de Recherche (Bac+5)';
  if (t.includes('mst')) return 'Master des Sciences et Techniques (MST)';
  if (t.includes('professionnel')) return 'Master Professionnel (Bac+5)';
  if (t.includes('fondamental')) return 'Master Fondamental (Bac+5)';
  if (t.includes('master')) return 'Master (Bac+5)';
  return undefined;
}

/**
 * Année académique : priorité au motif "2026-2027" du titre, puis à la
 * première année trouvée dans les dates, sinon année dérivée de la publication.
 */
export function extractAcademicYear(
  title: string,
  dates: ParsedDates,
  publishedAt?: string,
): string {
  const t = title || '';

  let m = t.match(/(20\d{2})\s*[-–/]\s*(20\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;

  const years = Array.from(t.matchAll(/\b(20\d{2})\b/g)).map((x) => x[1]);
  if (years.length > 0) {
    const y = Number(years[0]);
    return `${y}-${y + 1}`;
  }

  const dateYears = [
    dates.openingDate,
    dates.deadlineDate,
    dates.examDate,
    dates.resultsDate,
  ]
    .map((d) => (d ? d.slice(0, 4) : undefined))
    .filter(Boolean);
  if (dateYears.length > 0) {
    const y = Number(dateYears[0]);
    return `${y}-${y + 1}`;
  }

  let y = new Date().getFullYear();
  if (publishedAt) {
    const py = new Date(publishedAt).getFullYear();
    if (Number.isFinite(py)) y = py;
  }
  return `${y}-${y + 1}`;
}

export { slugify };