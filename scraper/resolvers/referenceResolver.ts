// ============================================================
// Reference Resolver — Phase 2B
// Utilise exclusivement les références existantes du projet.
// Aucune création automatique. Matching : exact → normalisé → alias → REVIEW
// ============================================================
import { REAL_SCHOOLS, REAL_UNIVERSITIES, REAL_MINISTRIES } from '../../src/data/institutionsData.ts';
import { LEVELS, CITIES, REGIONS, DOMAINS, SUBJECTS } from '../../src/lib/utils.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const schemas = JSON.parse(readFileSync(join(import.meta.dirname, '../form-schemas.json'), 'utf-8'));

export type ResolveStatus = 'AUTO' | 'REVIEW';
export interface ResolveResult {
  status: ResolveStatus;
  matched: { id: string; label: string; value: string } | null;
  referenceId: string | null;
  reason?: string;
}

function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`´]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function candidatesForEntity(list: Array<{ id: string; name: string; shortName?: string; slug?: string; aliases?: string[] }>, input: string): Array<{ id: string; label: string; values: string[] }> {
  return list.map(e => ({
    id: e.id,
    label: e.name,
    values: [e.name, e.shortName || '', e.slug || '', ...(e.aliases || [])].filter(Boolean) as string[],
  }));
}

function resolveByList(
  inputRaw: string | null | undefined,
  list: Array<{ id: string; name: string; shortName?: string; slug?: string; aliases?: string[] }>,
): ResolveResult {
  if (!inputRaw || !String(inputRaw).trim()) {
    return { status: 'REVIEW', matched: null, referenceId: null, reason: 'valeur vide' };
  }
  const input = String(inputRaw).trim();
  const normInput = normalize(input);

  // 1. exacte — collecte tous avant décision (évite false positive si alias partagé)
  const exactMatches: typeof list = [];
  for (const e of list) {
    const vals = [e.name, e.shortName || '', e.slug || '', ...(e.aliases || [])].filter(Boolean) as string[];
    if (vals.some(v => v === input)) exactMatches.push(e);
  }
  if (exactMatches.length === 1) {
    return { status: 'AUTO', matched: { id: exactMatches[0].id, label: exactMatches[0].name, value: exactMatches[0].id }, referenceId: exactMatches[0].id, reason: 'correspondance exacte' };
  }
  if (exactMatches.length > 1) {
    return { status: 'REVIEW', matched: null, referenceId: null, reason: `ambiguïté exacte: ${exactMatches.map(m=>m.id).join(', ')}` };
  }
  // 2. normalisée
  const normMatches: typeof list = [];
  for (const e of list) {
    const vals = [e.name, e.shortName || '', e.slug || '', ...(e.aliases || [])].filter(Boolean) as string[];
    if (vals.some(v => normalize(v) === normInput)) {
      normMatches.push(e);
    }
  }
  if (normMatches.length === 1) {
    return { status: 'AUTO', matched: { id: normMatches[0].id, label: normMatches[0].name, value: normMatches[0].id }, referenceId: normMatches[0].id, reason: 'correspondance normalisée' };
  }
  if (normMatches.length > 1) {
    return { status: 'REVIEW', matched: null, referenceId: null, reason: `ambiguïté normalisée: ${normMatches.map(m=>m.id).join(', ')}` };
  }
  // 3. alias normalisé inclus (ex: "FS Rabat" contient "FS")
  // On cherche si l'input normalisé est inclus dans un alias normalisé ou l'inverse, mais de façon stricte (mot complet)
  const aliasMatches: typeof list = [];
  for (const e of list) {
    const vals = [e.name, e.shortName || '', ...(e.aliases || [])].filter(Boolean) as string[];
    for (const v of vals) {
      const nv = normalize(v);
      if (nv.length < 3) continue;
      if (nv === normInput || normInput.split(' ').some(tok => tok.length>=3 && nv.includes(tok)) ) {
        // trop permissif — on exige alias complet = input ou alias contient tous les tokens significatifs
        if (nv === normInput) aliasMatches.push(e);
        break;
      }
    }
  }
  if (aliasMatches.length === 1) {
    return { status: 'AUTO', matched: { id: aliasMatches[0].id, label: aliasMatches[0].name, value: aliasMatches[0].id }, referenceId: aliasMatches[0].id, reason: 'alias normalisé' };
  }
  if (aliasMatches.length > 1) {
    return { status: 'REVIEW', matched: null, referenceId: null, reason: `alias ambigu: ${aliasMatches.map(m=>m.id).join(', ')}` };
  }
  return { status: 'REVIEW', matched: null, referenceId: null, reason: 'aucune correspondance fiable' };
}

function resolveStaticList(inputRaw: string | null | undefined, allowed: string[]): ResolveResult {
  if (!inputRaw || !String(inputRaw).trim()) return { status: 'REVIEW', matched: null, referenceId: null, reason: 'valeur vide' };
  const input = String(inputRaw).trim();
  const normInput = normalize(input);
  // exacte
  if (allowed.includes(input)) {
    return { status: 'AUTO', matched: { id: input, label: input, value: input }, referenceId: input, reason: 'exacte' };
  }
  // normalisée
  const normAllowed = allowed.map(v => ({ raw: v, norm: normalize(v) }));
  const exactNorm = normAllowed.filter(a => a.norm === normInput);
  if (exactNorm.length === 1) {
    return { status: 'AUTO', matched: { id: exactNorm[0].raw, label: exactNorm[0].raw, value: exactNorm[0].raw }, referenceId: exactNorm[0].raw, reason: 'normalisée' };
  }
  if (exactNorm.length > 1) {
    return { status: 'REVIEW', matched: null, referenceId: null, reason: `ambiguïté: ${exactNorm.map(a=>a.raw).join(', ')}` };
  }
  return { status: 'REVIEW', matched: null, referenceId: null, reason: 'hors référentiel' };
}

// ------------------------------------------------------------------
// Public resolvers
// ------------------------------------------------------------------
export function resolveUniversity(input: string | null | undefined): ResolveResult {
  return resolveByList(input, REAL_UNIVERSITIES as any);
}
export function resolveSchool(input: string | null | undefined, universityId?: string | null): ResolveResult {
  // Si universityId fourni, on filtre d'abord par université pour réduire l'ambiguïté
  let list: any = REAL_SCHOOLS;
  if (universityId) {
    const filtered = (REAL_SCHOOLS as any[]).filter(s => s.universityId === universityId);
    if (filtered.length) list = filtered;
  }
  return resolveByList(input, list);
}
export function resolveMinistry(input: string | null | undefined): ResolveResult {
  return resolveByList(input, REAL_MINISTRIES as any);
}
export function resolveCity(input: string | null | undefined): ResolveResult {
  return resolveStaticList(input, [...CITIES]);
}
export function resolveRegion(input: string | null | undefined): ResolveResult {
  return resolveStaticList(input, [...REGIONS]);
}
export function resolveDomain(input: string | null | undefined): ResolveResult {
  // Domaines Master : 9 valeurs (form-schemas.json) + DOMAINS 11 valeurs (Competition)
  const allDomains = Array.from(new Set([...DOMAINS, ...((schemas as any).referentials.MASTER_DOMAINS.values as string[])]));
  return resolveStaticList(input, allDomains);
}
export function resolveLevel(input: string | null | undefined): ResolveResult {
  const allLevels = Array.from(new Set([...LEVELS, ...((schemas as any).referentials.MASTER_LEVELS.values as string[])]));
  return resolveStaticList(input, allLevels);
}
export function resolveCategory(input: string | null | undefined): ResolveResult {
  const cats = ["ECOLE","MINISTERE","UNIVERSITE","INSTITUTION","RECRUTEMENT","FORMATION","AUTRE"];
  return resolveStaticList(input, cats);
}
export function resolveSubject(input: string | null | undefined): ResolveResult {
  return resolveStaticList(input, [...SUBJECTS]);
}

export function resolveReference(type: string, value: string | null | undefined): ResolveResult {
  switch (type) {
    case 'university': return resolveUniversity(value);
    case 'school': return resolveSchool(value);
    case 'ministry': return resolveMinistry(value);
    case 'city': return resolveCity(value);
    case 'region': return resolveRegion(value);
    case 'domain': return resolveDomain(value);
    case 'level': return resolveLevel(value);
    case 'category': return resolveCategory(value);
    case 'subject': return resolveSubject(value);
    default: return { status: 'REVIEW', matched: null, referenceId: null, reason: `type inconnu ${type}` };
  }
}

// AutoOrganisme : reproduit organismeResolver.ts scoring sans fuzzy agressif
// On utilise resolveReference successifs, pas de création auto
export function resolveAutoOrganisme(input: { title?: string; description?: string; schoolName?: string; universityName?: string }): { status: ResolveStatus; school: ResolveResult; university: ResolveResult; ministry: ResolveResult; organizationName: string | null; organizationType: string | null } {
  const corpus = [input.title, input.schoolName, input.universityName].filter(Boolean).join(' ');
  const school = resolveSchool(input.schoolName || corpus);
  const university = resolveUniversity(input.universityName || corpus);
  const ministry = resolveMinistry(corpus);
  // Si school trouvé AUTO, on le privilégie
  if (school.status === 'AUTO') {
    return { status: 'AUTO', school, university, ministry, organizationName: school.matched?.label || null, organizationType: 'ECOLE' };
  }
  if (university.status === 'AUTO') {
    return { status: 'AUTO', school, university, ministry, organizationName: university.matched?.label || null, organizationType: 'INSTITUTION' };
  }
  if (ministry.status === 'AUTO') {
    return { status: 'AUTO', school, university, ministry, organizationName: ministry.matched?.label || null, organizationType: 'MINISTERE' };
  }
  return { status: 'REVIEW', school, university, ministry, organizationName: null, organizationType: null };
}
