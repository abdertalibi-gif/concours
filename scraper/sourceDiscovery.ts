// sourceDiscovery — Phase 5 DISCOVERY ONLY (no DB write)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OFFICIAL_SOURCES } from './sources/registry.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

async function probe(url: string, timeout = 4000): Promise<{ url: string; ok: boolean; status?: number; contentType?: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' } as any);
    clearTimeout(t);
    return { url, ok: res.ok, status: res.status, contentType: res.headers.get('content-type') || undefined };
  } catch {
    clearTimeout(t);
    // fallback GET
    try {
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), timeout);
      const res2 = await fetch(url, { method: 'GET', signal: c2.signal, redirect: 'follow' } as any);
      clearTimeout(t2);
      return { url, ok: res2.ok, status: res2.status, contentType: res2.headers.get('content-type') || undefined };
    } catch {
      return { url, ok: false };
    }
  }
}

export async function runSourceDiscovery() {
  const results: any[] = [];

  for (const src of OFFICIAL_SOURCES) {
    const base = src.baseUrl.replace(/\/$/, '');
    const checks: Record<string, any> = {};

    // Discovery allégée (DISCOVERY ONLY, pas de scraping massif, respect robots.txt)
    // On ne fetch pas massivement les sites pour éviter charge ; on documente les endpoints à vérifier manuellement
    checks.robots = { url: `${base}/robots.txt`, ok: false, note: 'à vérifier manuellement (respect robots.txt)' };
    checks.sitemap = { url: `${base}/sitemap.xml`, ok: false, note: 'à vérifier — sitemap non détecté automatiquement' };
    if (src.sourceId === 'almaster') {
      checks.rss = { url: `${base}/feeds/posts/default?alt=json`, ok: true, contentType: 'application/json', note: 'Feed JSON Blogger vérifié en Phase 1' };
    } else {
      checks.rss = { url: `${base}/feed`, ok: false, note: 'RSS/Atom à vérifier manuellement' };
    }
    checks.api = { url: `${base}/api`, ok: false, note: 'API publique non documentée' };

    // Pages d'annonces — heuristic : baseUrl itself is announcement page
    checks.pages = {
      annonces: { url: base, ok: true, note: 'Portail officiel — HTML annonces' },
      concours: { url: `${base}/concours`, ok: false, note: 'À vérifier manuellement' },
      masters: { url: `${base}/masters`, ok: false },
      resultats: { url: `${base}/resultats`, ok: false }
    };

    // Pagination / supportedFormats already in meta
    // Capacité champs — basée sur observation Phase 1-4 et structure sites officiels
    const capacity: Record<string, string> = {};
    if (src.entityTypes.includes('MASTER')) {
      capacity['MASTER.title'] = 'AUTO';
      capacity['MASTER.university'] = src.official ? 'AUTO' : 'REVIEW';
      capacity['MASTER.city'] = 'AUTO';
      capacity['MASTER.domain'] = 'REVIEW';
      capacity['MASTER.deadlineDate'] = src.hasDates ? 'AUTO' : 'REVIEW';
      capacity['MASTER.officialUrl'] = src.hasPDF ? 'AUTO (PDF)' : 'REVIEW';
      capacity['MASTER.places'] = src.hasPlaces ? 'AUTO' : 'MISSING';
      capacity['MASTER.conditions'] = src.hasConditions ? 'AUTO' : 'MISSING';
    }
    if (src.entityTypes.includes('COMPETITION')) {
      capacity['COMPETITION.title'] = 'AUTO';
      capacity['COMPETITION.places'] = src.hasPlaces ? 'AUTO' : 'REVIEW';
      capacity['COMPETITION.conditions'] = src.hasConditions ? 'REVIEW' : 'MISSING';
      capacity['COMPETITION.deadlineDate'] = src.hasDates ? 'AUTO' : 'REVIEW';
    }

    results.push({
      sourceId: src.sourceId,
      name: src.name,
      organization: src.organization,
      entityTypes: src.entityTypes,
      baseUrl: src.baseUrl,
      officialDomain: src.officialDomain,
      discoveryUrl: src.discoveryUrl,
      official: src.official,
      active: src.active,
      priority: src.priority,
      supportedFormats: src.supportedFormats,
      quality: { official: src.official, structured: src.structured, stable: src.stable, requiresJS: src.requiresJS, hasPDF: src.hasPDF, hasDates: src.hasDates, hasConditions: src.hasConditions, hasPlaces: src.hasPlaces },
      discovery: {
        robots: checks.robots,
        sitemap: checks.sitemap,
        rssAtom: checks.rss,
        api: checks.api,
        pages: checks.pages,
        pagination: src.sourceId === 'almaster' ? 'JSON feed max-results' : 'HTML pagination à vérifier',
        archives: 'À vérifier'
      },
      mapping: {
        MASTER: src.entityTypes.includes('MASTER') ? 'MasterForm → masters' : null,
        COMPETITION: src.entityTypes.includes('COMPETITION') ? 'ConcoursForm → competitions' : null,
        EXAM: src.entityTypes.includes('EXAM') ? 'ExamForm → exams' : null,
        DOCUMENT: src.entityTypes.includes('DOCUMENT') ? 'DocForm → documents' : null
      },
      capacity,
      notes: src.notes
    });
  }

  const tag = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
  const jsonFile = join(OUT_DIR, `source-discovery-${tag}.json`);
  const txtFile = join(LOG_DIR, `source-discovery-${tag}.txt`);
  const sourcesJsonFile = join(HERE, 'sources', 'sources.json');
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });
  mkdirSync(join(HERE, 'sources'), { recursive: true });

  // sources.json — registry officiel pour usage scraper futur
  writeFileSync(sourcesJsonFile, JSON.stringify(OFFICIAL_SOURCES, null, 2), 'utf-8');
  writeFileSync(jsonFile, JSON.stringify({ generatedAt: new Date().toISOString(), total: results.length, sources: results }, null, 2), 'utf-8');

  const lines: string[] = [];
  lines.push('======================================================================');
  lines.push(`SOURCE DISCOVERY — ${new Date().toISOString()}`);
  lines.push(`Total sources: ${results.length} | Officielles: ${results.filter(r=>r.official).length} | Non officielles: ${results.filter(r=>!r.official).length}`);
  lines.push('======================================================================');
  lines.push('');
  for (const r of results) {
    lines.push(`${r.sourceId} — ${r.name} — ${r.baseUrl} — ${r.official ? 'OFFICIEL' : 'AGRÉGATEUR'} — ${r.entityTypes.join(',')}`);
    lines.push(`  robots: ${r.discovery.robots.ok ? 'OK '+r.discovery.robots.url : '—'} | sitemap: ${r.discovery.sitemap.ok ? 'OK' : '—'} | rss: ${r.discovery.rssAtom.ok ? 'OK '+r.discovery.rssAtom.url : '—'}`);
    lines.push(`  PDF:${r.quality.hasPDF?' oui':' non'} Dates:${r.quality.hasDates?' oui':' non'} Conditions:${r.quality.hasConditions?' oui':' non'} Places:${r.quality.hasPlaces?' oui':' non'} Structured:${r.quality.structured?' oui':' non'}`);
    lines.push(`  mapping: ${Object.entries(r.mapping).filter(([,v])=>v).map(([k,v])=>`${k}→${v}`).join(', ') || '—'}`);
    lines.push(`  notes: ${r.notes}`);
    lines.push('');
  }
  lines.push('======================================================================');
  lines.push(`Sources officielles: ${results.filter(r=>r.official).length}`);
  lines.push(`Sources avec PDF: ${results.filter(r=>r.quality.hasPDF).length}`);
  lines.push(`Sources avec sitemap/RSS/API: ${results.filter(r=> r.discovery.sitemap.ok || r.discovery.rssAtom.ok || r.discovery.api.ok).length}`);
  lines.push(`Sources utilisables MASTER: ${results.filter(r=> r.entityTypes.includes('MASTER')).length}`);
  lines.push(`Sources utilisables COMPETITION: ${results.filter(r=> r.entityTypes.includes('COMPETITION')).length}`);
  lines.push(`Sources nécessitant REVIEW: ${results.filter(r=> !r.official).length} (agrégateur)`);
  lines.push('DB writes = 0 | Supabase writes = 0 | Forms modified = 0');
  lines.push('======================================================================');
  writeFileSync(txtFile, lines.join('\n'), 'utf-8');

  return { total: results.length, official: results.filter(r=>r.official).length, withPDF: results.filter(r=>r.quality.hasPDF).length, jsonFile, txtFile, sourcesJsonFile };
}
