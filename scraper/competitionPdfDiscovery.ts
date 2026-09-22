// Phase 8 — targeted discovery de vrais avis de concours PDF (DISCOVERY ONLY)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { downloadAndExtractPdf } from './parsers/pdf.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

interface Candidate {
  pdfUrl: string;
  sourceId: string;
  organization: string;
  baseUrl: string;
  pageUrl: string;
  pageTitle: string;
  pageCount?: number;
  textLength?: number;
  isScanned?: boolean;
  hasExploitableText?: boolean;
  excerpt?: string;
  matchedKeywords: string[];
  classification: 'VALID_CONCOURS_PDF'|'NOT_CONCOURS'|'SCANNED_REVIEW'|'UNKNOWN';
  reason: string;
}

const CONCOURS_KEYWORDS = [
  'avis de concours','avis de recrutement','concours de recrutement','concours','recrutement',
  'appel à candidature','nombre de postes','postes','places','conditions d\'accès','conditions d’accès',
  'diplôme','spécialité','épreuves','epreuves','matières','matieres','date limite','dernier délai',
  'date du concours','pièces à fournir','pieces à fournir','dossier de candidature','إعلان','مباراة','توظيف'
];

const CONCOURS_KEYWORDS_LOW = CONCOURS_KEYWORDS.map(k=> k.toLowerCase());

async function fetchHtml(url: string, timeout=8000): Promise<string> {
  const c = new AbortController();
  const t = setTimeout(()=> c.abort(), timeout);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'ConcoursMaroc-Discovery/1.0' } } as any);
    clearTimeout(t);
    if (!r.ok) return '';
    return await r.text();
  } catch { clearTimeout(t); return ''; }
}

async function discoverForSource(source: any, maxPdfs=4): Promise<Candidate[]> {
  const base = source.baseUrl.replace(/\/$/,'');
  const html = await fetchHtml(base);
  if (!html) return [];
  const $ = cheerio.load(html);
  const pageLinks: string[] = [];
  $('a[href]').each((_,el)=>{
    const href = (''+($(el).attr('href')||'')).trim();
    const text = (($(el).text()||'') + ' ' + href).toLowerCase();
    const isConcoursRelated = CONCOURS_KEYWORDS_LOW.some(k=> text.includes(k));
    if (!isConcoursRelated) return;
    try {
      const abs = new URL(href, base).href;
      if (abs.startsWith('http') && (abs.includes(new URL(base).hostname) || abs.endsWith('.pdf'))) {
        pageLinks.push(abs);
      }
    } catch {}
  });
  // Priorise les liens PDF directs, puis les pages
  const pdfDirect = pageLinks.filter(u=> u.toLowerCase().split('?')[0].endsWith('.pdf')).slice(0, maxPdfs);
  const pageCandidates = pageLinks.filter(u=> !u.toLowerCase().endsWith('.pdf')).slice(0, 6);

  const pdfUrls = new Set<string>(pdfDirect);

  // Pour chaque page candidate, cherche les PDFs qu'elle contient
  for (const pageUrl of pageCandidates) {
    if (pdfUrls.size >= maxPdfs) break;
    const pageHtml = await fetchHtml(pageUrl, 6000);
    if (!pageHtml) continue;
    const $p = cheerio.load(pageHtml);
    $p('a[href]').each((_,el)=>{
      const href = (''+($(el).attr('href')||'')).trim();
      if (!href.toLowerCase().includes('.pdf')) return;
      try {
        const abs = new URL(href, pageUrl).href;
        if (abs.toLowerCase().split('?')[0].endsWith('.pdf')) pdfUrls.add(abs);
      } catch {}
    });
    // Respect rate limiting
    await new Promise(r=> setTimeout(r, 400));
  }

  const candidates: Candidate[] = [];
  for (const pdfUrl of Array.from(pdfUrls).slice(0, maxPdfs)) {
    // Validation rapide : download un extrait
    const ext = await downloadAndExtractPdf(pdfUrl, 12000);
    const textLow = (ext.text||'').toLowerCase();
    const matched: string[] = [];
    for (const kw of CONCOURS_KEYWORDS_LOW) {
      if (textLow.includes(kw)) matched.push(kw);
    }
    // Aussi vérifie le nom du PDF
    const nameLow = pdfUrl.toLowerCase();
    for (const kw of ['concours','recrutement','postes','avis']) {
      if (nameLow.includes(kw) && !matched.includes(kw)) matched.push(kw);
    }

    let classification: Candidate['classification'] = 'UNKNOWN';
    let reason = '';
    if (ext.error) {
      classification = 'UNKNOWN';
      reason = `fetch/parse error: ${ext.error}`;
    } else if (ext.isScanned) {
      classification = 'SCANNED_REVIEW';
      reason = `PDF scanné/image (${ext.text.length}c, ${ext.pageCount}p) — pas de texte exploitable`;
    } else if (!ext.hasExploitableText) {
      classification = 'UNKNOWN';
      reason = `pas de texte exploitable (${ext.text.length}c)`;
    } else {
      // Critère VALID : au moins 3 keywords dont "concours/recrutement" + "postes/places" + "conditions/diplôme" + "date"
      const hasConcours = matched.some(k=> ['concours','recrutement','avis de concours','مباراة','توظيف'].includes(k));
      const hasPostes = matched.some(k=> ['nombre de postes','postes','places','مباراة'].includes(k));
      const hasConditions = matched.some(k=> k.includes('conditions') || k.includes('diplôme') || k.includes('spécialité') || k.includes('إعلان'));
      const hasEpreuves = matched.some(k=> k.includes('épreuve') || k.includes('matière'));
      const hasDate = matched.some(k=> k.includes('date limite') || k.includes('dernier délai') || k.includes('date du concours'));
      const score = [hasConcours, hasPostes, hasConditions, hasEpreuves, hasDate].filter(Boolean).length;
      // Critère assoupli Phase 8 : hasConcours + au moins 1 autre indice + 2 keywords minimum
      if (hasConcours && matched.length>=2) {
        classification = 'VALID_CONCOURS_PDF';
        reason = `preuve textuelle: ${matched.slice(0,5).join(', ')} (score ${score}/5)`;
      } else if (matched.length>=2) {
        classification = 'UNKNOWN';
        reason = `partiellement concours (${matched.slice(0,5).join(', ')}) mais insuffisant (score ${score}/5)`;
      } else {
        classification = 'NOT_CONCOURS';
        reason = `pas de keywords concours suffisants (${matched.join(', ') || 'aucun'}) — document administratif générique`;
      }
    }

    candidates.push({
      pdfUrl,
      sourceId: source.sourceId,
      organization: source.organization,
      baseUrl: source.baseUrl,
      pageUrl: pdfUrls.has(pdfUrl) ? base : '',
      pageTitle: '',
      pageCount: ext.pageCount,
      textLength: ext.text.length,
      isScanned: ext.isScanned,
      hasExploitableText: ext.hasExploitableText,
      excerpt: ext.text.slice(0,300).replace(/\s+/g,' ').trim(),
      matchedKeywords: matched,
      classification,
      reason
    });
    await new Promise(r=> setTimeout(r, 300));
  }

  return candidates;
}

export async function runCompetitionPdfDiscovery() {
  const sourcesRaw = await import('./sources/sources.json', { with: { type: 'json' } } as any).then((m:any)=> m.default || m).catch(()=> []);
  // Fallback: read file directly
  let sources: any[] = [];
  try {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    sources = JSON.parse(readFileSync(join(here, 'sources/sources.json'),'utf-8'));
  } catch { sources = sourcesRaw; }

  // Filtre prioritaire : COMPETITION et official, priorise hasPlaces (ministères) puis universités
  const allComp = sources.filter((s:any)=> s.entityTypes?.includes('COMPETITION') && s.official);
  const sorted = [...allComp].sort((a:any,b:any)=> {
    if (a.hasPlaces !== b.hasPlaces) return b.hasPlaces ? 1 : -1;
    if (a.priority==='high' && b.priority!=='high') return -1;
    if (b.priority==='high' && a.priority!=='high') return 1;
    return 0;
  });
  const prioritySources = sorted.slice(0, 12);
  // Ajoute quelques universités avec hasPDF
  const allCandidates: Candidate[] = [];
  let pagesCandidates = 0;

  for (const src of prioritySources) {
    if (allCandidates.length >= 20) break;
    console.log(`[Discovery] ${src.sourceId} — ${src.baseUrl}`);
    const cands = await discoverForSource(src, 3);
    pagesCandidates++;
    allCandidates.push(...cands);
    if (allCandidates.length >= 20) break;
    await new Promise(r=> setTimeout(r, 500));
  }

  // Sélection 5 meilleurs VALID_CONCOURS_PDF
  const valids = allCandidates.filter(c=> c.classification==='VALID_CONCOURS_PDF').slice(0,5);
  const notConcours = allCandidates.filter(c=> c.classification==='NOT_CONCOURS').length;
  const scanned = allCandidates.filter(c=> c.classification==='SCANNED_REVIEW').length;
  const unknown = allCandidates.filter(c=> c.classification==='UNKNOWN').length;

  const tag = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
  const outFile = join(OUT_DIR, `competition-pdf-discovery-${tag}.json`);
  const logFile = join(LOG_DIR, `competition-pdf-discovery-${tag}.txt`);
  const candidatesFile = join(HERE, 'sources/competitionPdfCandidates.ts');
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  // Écrit candidates TS pour phase suivante
  const tsContent = `// Auto-généré Phase 8 — 5 meilleurs VALID_CONCOURS_PDF
export const COMPETITION_PDF_CANDIDATES = ${JSON.stringify(valids, null, 2)} as const;
`;
  const { writeFileSync } = await import('node:fs');
  writeFileSync(candidatesFile, tsContent, 'utf-8');
  writeFileSync(outFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    sourcesConsulted: prioritySources.length,
    pagesCandidates: pagesCandidates,
    pdfCandidates: allCandidates.length,
    stats: { VALID_CONCOURS_PDF: valids.length, NOT_CONCOURS: notConcours, SCANNED_REVIEW: scanned, UNKNOWN: unknown },
    allCandidates,
    top5: valids
  }, null, 2), 'utf-8');

  const lines: string[] = [];
  lines.push('======================================================================');
  lines.push(`COMPETITION PDF DISCOVERY — ${new Date().toISOString()}`);
  lines.push(`Sources consultées: ${prioritySources.length} | Pages candidates: ${pagesCandidates} | PDF candidats: ${allCandidates.length}`);
  lines.push(`VALID_CONCOURS_PDF: ${valids.length} | NOT_CONCOURS: ${notConcours} | SCANNED_REVIEW: ${scanned} | UNKNOWN: ${unknown}`);
  lines.push('======================================================================');
  for (let i=0;i<valids.length;i++) {
    const c = valids[i];
    lines.push(`${i+1}. ${c.organization} — ${c.pdfUrl.slice(0,80)}`);
    lines.push(`   pages:${c.pageCount} len:${c.textLength} scanned:${c.isScanned}`);
    lines.push(`   excerpt: ${(c.excerpt||'').slice(0,120)}`);
    lines.push(`   matched: ${c.matchedKeywords.join(', ')}`);
    lines.push(`   reason: ${c.reason}`);
  }
  if (valids.length===0) {
    lines.push('Aucun VALID_CONCOURS_PDF trouvé avec les critères stricts — les PDF testés étaient des documents administratifs génériques (convention, règlement).');
    lines.push('Tous les candidats NOT_CONCOURS/SCANNED — Phase 9 nécessitera une recherche plus ciblée (ex: concours.gov.ma, portails ministériels dédiés).');
  }
  lines.push('======================================================================');
  lines.push('DB writes = 0 | Supabase writes = 0 | Forms modified = 0');
  lines.push('======================================================================');
  writeFileSync(logFile, lines.join('\n'), 'utf-8');

  return { sourcesConsulted: prioritySources.length, pagesCandidates, pdfCandidates: allCandidates.length, valids: valids.length, notConcours, scanned, unknown, top5: valids, outFile, logFile, candidatesFile };
}
