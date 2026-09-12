// ============================================================
// CONCOURS MAROC — Système centralisé de résolution d'organisme (Auto Organisme / Auto-Select)
// ============================================================
import { loadDB } from './db';
import type { OrgType } from './types';

export interface ResolvedOrganisme {
  organismeId?: string;
  schoolId?: string;
  universityId?: string;
  ministryId?: string;
  organizationName: string;
  organizationType: OrgType;
  logoUrl?: string;
  ministryName?: string;
  matches: Array<{ id: string; name: string; type: string; category: string; logoUrl?: string }>;
  isDetected: boolean;
  requiresManualSelection: boolean;
}

export function resolveOrganisme(input: {
  organismeId?: string;
  schoolId?: string;
  ministryId?: string;
  organizationName?: string;
  title?: string;
  description?: string;
  sourceUrl?: string;
  officialWebsite?: string;
}): ResolvedOrganisme {
  const db = loadDB();
  const schools = db.schools || [];
  const universities = db.universities || [];
  const ministries = db.ministries || [];

  // 1. Direct ID match
  if (input.schoolId) {
    const s = schools.find(item => item.id === input.schoolId);
    if (s) {
      const min = s.ministryId ? ministries.find(m => m.id === s.ministryId) : undefined;
      return {
        organismeId: s.id,
        schoolId: s.id,
        universityId: s.universityId,
        ministryId: s.ministryId,
        organizationName: s.name,
        organizationType: 'ECOLE',
        logoUrl: s.logoUrl,
        ministryName: min?.name,
        matches: [{ id: s.id, name: s.name, type: 'École', category: 'ECOLE', logoUrl: s.logoUrl }],
        isDetected: true,
        requiresManualSelection: false,
      };
    }
  }

  if (input.ministryId) {
    const m = ministries.find(item => item.id === input.ministryId);
    if (m) {
      return {
        organismeId: m.id,
        ministryId: m.id,
        organizationName: m.name,
        organizationType: 'MINISTERE',
        logoUrl: m.logoUrl,
        ministryName: m.name,
        matches: [{ id: m.id, name: m.name, type: 'Ministère', category: 'MINISTERE', logoUrl: m.logoUrl }],
        isDetected: true,
        requiresManualSelection: false,
      };
    }
  }

  // 2. Text / Keyword extraction from title, description, orgName, URLs
  const searchCorpus = [
    input.organizationName,
    input.title,
    input.description,
    input.sourceUrl,
    input.officialWebsite,
  ].filter(Boolean).join(' ').toLowerCase();

  if (!searchCorpus.trim()) {
    return {
      organizationName: '',
      organizationType: 'ECOLE',
      matches: [],
      isDetected: false,
      requiresManualSelection: true,
    };
  }

  const matchesFound: Array<{ id: string; name: string; type: string; category: string; logoUrl?: string; score: number }> = [];

  // Check schools
  for (const s of schools) {
    let score = 0;
    const nameLower = s.name.toLowerCase();
    const shortLower = s.shortName.toLowerCase();
    if (searchCorpus.includes(shortLower) && shortLower.length > 1) score += 10;
    if (searchCorpus.includes(nameLower)) score += 15;
    if (s.aliases) {
      for (const alias of s.aliases) {
        if (searchCorpus.includes(alias.toLowerCase())) score += 8;
      }
    }
    if (score > 0) {
      matchesFound.push({ id: s.id, name: s.name, type: 'École', category: 'ECOLE', logoUrl: s.logoUrl, score });
    }
  }

  // Check universities
  for (const u of universities) {
    let score = 0;
    const nameLower = u.name.toLowerCase();
    const shortLower = u.shortName.toLowerCase();
    if (searchCorpus.includes(shortLower) && shortLower.length > 1) score += 9;
    if (searchCorpus.includes(nameLower)) score += 12;
    if (score > 0) {
      matchesFound.push({ id: u.id, name: u.name, type: 'Université', category: 'ECOLE', logoUrl: u.logoUrl, score });
    }
  }

  // Check ministries
  for (const m of ministries) {
    let score = 0;
    const nameLower = m.name.toLowerCase();
    const shortLower = m.shortName.toLowerCase();
    if (searchCorpus.includes(shortLower) && shortLower.length > 2) score += 10;
    if (searchCorpus.includes(nameLower)) score += 15;
    if (score > 0) {
      matchesFound.push({ id: m.id, name: m.name, type: 'Ministère', category: 'MINISTERE', logoUrl: m.logoUrl, score });
    }
  }

  // Sort matches by score desc
  matchesFound.sort((a, b) => b.score - a.score);

  if (matchesFound.length >= 1) {
    const best = matchesFound[0];
    const school = best.category === 'ECOLE' ? schools.find(s => s.id === best.id) : undefined;
    const ministry = best.category === 'MINISTERE' ? ministries.find(m => m.id === best.id) : undefined;
    const min = school?.ministryId ? ministries.find(m => m.id === school.ministryId) : ministry;

    return {
      organismeId: best.id,
      schoolId: school?.id,
      universityId: school?.universityId,
      ministryId: min?.id,
      organizationName: best.name,
      organizationType: best.category as OrgType,
      logoUrl: best.logoUrl,
      ministryName: min?.name,
      matches: matchesFound,
      isDetected: true,
      requiresManualSelection: false,
    };
  }

  return {
    organizationName: input.organizationName || '',
    organizationType: 'ECOLE',
    matches: [],
    isDetected: false,
    requiresManualSelection: true,
  };
}
