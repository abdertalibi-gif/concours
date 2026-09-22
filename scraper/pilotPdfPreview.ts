// Pilot PDF preview — min-sup PDFs — NO DB WRITE
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { pilotEnssupSource } from './sources/pilotEnssup.ts';
import { downloadAndExtractPdf, detectPlaces, detectConditions, detectMatieres, detectEpreuves, detectDatesWithContext, detectDocuments } from './parsers/pdf.ts';
import { mapToCompetition } from './mappers/competitionMapper.ts';
import type { ScrapedItem } from './lib/types';
import { buildItem } from './sources/almaster.ts';
import { finalizeItem } from './normalizers/normalize.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

async function discoverPdfUrls(limit = 10): Promise<string[]> {
  // Réutilise les URLs réellement découvertes par le pilot précédent si disponible
  const pilotFiles = readdirSync(OUT_DIR).filter(f=> f.startsWith('competition-pilot-preview-') && f.endsWith('.json'));
  if (pilotFiles.length) {
    const latest = pilotFiles.sort().pop()!;
    try {
      const data = JSON.parse(readFileSync(join(OUT_DIR, latest), 'utf-8'));
      const urls: string[] = [];
      for (const p of (data.previews||[])) {
        const u = p.payload?.sourceUrl || p.source?.page;
        if (u && u.endsWith('.pdf')) urls.push(u);
        // aussi chercher dans payload registrationUrl etc. si PDF
        if (p.payload?.registrationUrl?.endsWith('.pdf')) urls.push(p.payload.registrationUrl);
      }
      if (urls.length) return [...new Set(urls)].slice(0, limit);
    } catch {}
  }
  // Sinon, scrape le site pour trouver des PDFs
  const baseHtml = await fetch(pilotEnssupSource.baseUrl).then(r=> r.text()).catch(()=> '');
  const $ = cheerio.load(baseHtml);
  const pdfs = new Set<string>();
  $('a[href]').each((_,el)=>{
    const href = (''+($(el).attr('href')||'')).trim();
    if (href.toLowerCase().includes('.pdf')) {
      let abs: string;
      try { abs = new URL(href, pilotEnssupSource.baseUrl).href; } catch { abs = href; }
      // Nettoie et vérifie que c'est bien un PDF
      if (abs.toLowerCase().split('?')[0].endsWith('.pdf')) pdfs.add(abs);
    }
  });
  // Si toujours rien, fallback sur des PDFs connus du pilot précédent (les 10 liens génériques ne contiennent pas de PDF, on utilise des PDFs d'exemple du site)
  // On va directement chercher sur la page d'accueil les PDFs visibles
  if (pdfs.size===0) {
    // On sait que enssup a des PDFs d'appels, on tente une URL d'exemple si disponible
    // Sinon on retourne vide — le preview montrera 0 PDF et expliquera
  }
  return Array.from(pdfs).slice(0, limit);
}

export async function runPilotPdfPreview() {
  const pdfUrls = await discoverPdfUrls(10);
  console.log(`[PDF Pilot] PDF URLs découvertes: ${pdfUrls.length}`);

  // Si aucun PDF trouvé via discovery, on essaie de récupérer les 10 liens du pilot HTML et d'en extraire les PDFs des pages détaillées
  let urlsToTest = [...pdfUrls];
  if (urlsToTest.length===0) {
    console.log('[PDF Pilot] Aucun PDF direct sur la page d\'accueil, tentative via pages détaillées du pilot');
    // Récupère les 10 annonces du pilot HTML et cherche les PDFs dans chaque page
    const pilotResult = await pilotEnssupSource.scrape({ limit: 10, delayMs: 400 });
    for (const entry of pilotResult.entries) {
      if (urlsToTest.length>=10) break;
      try {
        if (entry.sourceUrl.endsWith('.pdf')) { urlsToTest.push(entry.sourceUrl); continue; }
        const html = await fetch(entry.sourceUrl).then(r=> r.text()).catch(()=> '');
        const $ = cheerio.load(html);
        $('a[href$=".pdf"], a[href*=".pdf"]').each((_,el)=>{
          const href = (''+($(el).attr('href')||'')).trim();
          if (!href) return;
          let abs: string;
          try { abs = new URL(href, entry.sourceUrl).href; } catch { abs = href; }
          if (abs.toLowerCase().split('?')[0].endsWith('.pdf')) urlsToTest.push(abs);
        });
      } catch {}
    }
    urlsToTest = [...new Set(urlsToTest)].slice(0,10);
    console.log(`[PDF Pilot] Après scan détaillé: ${urlsToTest.length} PDFs`);
  }

  // Limite à 10 max
  urlsToTest = urlsToTest.slice(0,10);

  const previews: any[] = [];
  let stats = { IMPORTABLE:0, REVIEW:0, BLOCKED:0 };

  for (const pdfUrl of urlsToTest) {
    console.log(`[PDF] download ${pdfUrl.slice(0,80)}`);
    const extraction = await downloadAndExtractPdf(pdfUrl);
    const text = extraction.text;

    // Détection champs
    const placesEv = extraction.hasExploitableText ? detectPlaces(text) : { value:null, status:'REVIEW' as const, reason:'PDF scanné/image — pas de texte exploitable' };
    const condEv = extraction.hasExploitableText ? detectConditions(text) : { value:null, status:'REVIEW' as const, reason:'PDF scanné' };
    const matEv = extraction.hasExploitableText ? detectMatieres(text) : { value:null, status:'REVIEW' as const, reason:'PDF scanné' };
    const eprEv = extraction.hasExploitableText ? detectEpreuves(text) : { value:null, status:'REVIEW' as const, reason:'PDF scanné' };
    const datesEv = extraction.hasExploitableText ? detectDatesWithContext(text) : { deadline:{value:null,status:'REVIEW',reason:'PDF scanné'}, competitionDate:{value:null,status:'REVIEW',reason:'PDF scanné'}, registrationStart:{value:null,status:'REVIEW',reason:'PDF scanné'}, convocationDate:{value:null,status:'REVIEW',reason:'PDF scanné'}, resultsDate:{value:null,status:'REVIEW',reason:'PDF scanné'} } as any;
    const docsEv = extraction.hasExploitableText ? detectDocuments(text) : { value:null, status:'REVIEW' as const, reason:'PDF scanné' };

    // Construit un ScrapedItem minimal à partir du PDF
    const fakeEntry = {
      sourceUrl: pdfUrl,
      title: `Concours PDF ${pdfUrl.split('/').pop()?.slice(0,40) || 'PDF'}`,
      publishedAt: new Date().toISOString(),
      tags: ['pdf','concours'],
      contentHtml: `<a href="${pdfUrl}">PDF</a>`,
      contentText: text.slice(0,5000),
      links: [pdfUrl]
    };
    let scraped: any = null;
    try {
      const draft: any = buildItem(fakeEntry as any);
      scraped = finalizeItem(draft, 'pilot-enssup-pdf');
      if (!scraped) scraped = { title: fakeEntry.title, sourceUrl: pdfUrl, description: text.slice(0,800), city: 'Rabat', region: 'Rabat-Salé-Kénitra', academicYear: '2026-2027', level: 'Bac+3', source: 'pilot-enssup-pdf' } as any;
    } catch {
      scraped = { title: fakeEntry.title, sourceUrl: pdfUrl, description: text.slice(0,800), city: 'Rabat', region: 'Rabat-Salé-Kénitra', academicYear: '2026-2027', level: 'Bac+3', source: 'pilot-enssup-pdf' } as any;
    }

    // Enrichit scraped avec les détections PDF pour le mapper
    if (placesEv.value) (scraped as any).places = placesEv.value;
    if (condEv.value) (scraped as any).conditions = condEv.value;
    if (matEv.value) (scraped as any).matieres = matEv.value;
    if (eprEv.value) (scraped as any).epreuves = eprEv.value;
    if (datesEv.deadline.value) (scraped as any).deadlineDate = datesEv.deadline.value;
    if (datesEv.competitionDate.value) (scraped as any).examDate = datesEv.competitionDate.value;
    if (datesEv.registrationStart.value) (scraped as any).openingDate = datesEv.registrationStart.value;
    if (datesEv.resultsDate.value) (scraped as any).resultsDate = datesEv.resultsDate.value;
    if (docsEv.value) (scraped as any).documents = docsEv.value;

    // Mappe vers Competition
    const mapped = mapToCompetition(scraped as any);

    // Override avec les evidences PDF
    // places
    if (placesEv.status!=='MISSING') {
      (mapped.fields as any).places = { targetField: 'places', value: placesEv.value, status: placesEv.status, sourceField: 'pdf places', reason: placesEv.reason, rawText: (placesEv as any).rawText, evidence: `pdfUrl=${pdfUrl} page=${(placesEv as any).page||1}` };
      if (placesEv.value) mapped.payload.places = placesEv.value;
    }
    // conditions
    if (condEv.value) {
      (mapped.fields as any).conditions = { targetField: 'conditions', value: condEv.value, status: condEv.status, sourceField: 'pdf conditions', rawText: (condEv as any).rawText };
      mapped.payload.conditions = condEv.value;
    }
    // matieres
    if (matEv.value) {
      (mapped.fields as any).matieres = { targetField: 'matieres', value: matEv.value, status: matEv.status, sourceField: 'pdf matieres', rawText: (matEv as any).rawText };
      mapped.payload.matieres = matEv.value;
    }
    // dates
    for (const k of ['registrationStart','registrationDeadline','competitionDate','convocationDate','resultsDate'] as const) {
      const evKey = k==='registrationDeadline' ? 'deadline' : k==='competitionDate' ? 'competitionDate' : k==='registrationStart' ? 'registrationStart' : k==='convocationDate' ? 'convocationDate' : 'resultsDate';
      const ev = (datesEv as any)[evKey];
      if (ev && ev.value) {
        (mapped.fields as any)[k] = { targetField: k, value: ev.value, status: ev.status, sourceField: `pdf ${evKey}`, rawText: ev.rawText, reason: ev.reason };
        (mapped.payload as any)[k] = new Date(ev.value).toISOString();
      }
    }

    // URLs : PDF reste officialDocument
    mapped.payload.officialDocument = pdfUrl;
    mapped.payload.officialWebsite = null; // ne jamais mettre PDF en officialWebsite
    (mapped.fields as any).officialWebsite = { targetField: 'officialWebsite', value: null, status: 'REVIEW', sourceField: 'officialWebsite', reason: 'PDF officiel → officialDocument, pas officialWebsite', evidence: `pdfUrl=${pdfUrl}` };
    (mapped.fields as any).officialDocument = { targetField: 'officialDocument', value: pdfUrl, status: extraction.hasExploitableText ? 'AUTO' : 'REVIEW', sourceField: 'pdfUrl', reason: extraction.hasExploitableText ? 'PDF officiel' : (extraction.error || 'PDF scanné'), evidence: `pdfUrl=${pdfUrl} pages=${extraction.pageCount} scanned=${extraction.isScanned}` };

    let status: string = 'BLOCKED';
    if (mapped.blocked) status = 'BLOCKED';
    else if (Object.values(mapped.fields).some((f:any)=> f.status==='REVIEW')) status = 'REVIEW';
    else if (mapped.valid) status = 'IMPORTABLE';

    // Si PDF scanné, force REVIEW
    if (extraction.isScanned) status = 'REVIEW';

    if (status==='IMPORTABLE') stats.IMPORTABLE++; else if (status==='BLOCKED') stats.BLOCKED++; else stats.REVIEW++;

    previews.push({
      source: { sourceId: 'min-sup', baseUrl: 'https://www.enssup.gov.ma', pdfUrl, page: 1 },
      pdfUrl,
      entityType: 'COMPETITION',
      status,
      extraction: { pageCount: extraction.pageCount, hasExploitableText: extraction.hasExploitableText, isScanned: extraction.isScanned, textLength: text.length, error: extraction.error },
      payload: mapped.payload,
      fields: mapped.fields,
      references: { schoolId: (mapped.fields as any).schoolId?.referenceId || null },
      warnings: [...mapped.warnings, ...(extraction.isScanned ? ['PDF scanné/image — REVIEW'] : [])],
      errors: mapped.errors,
      evidence: [
        { field: 'places', ...placesEv, pdfUrl, page: 1 },
        { field: 'conditions', ...condEv, pdfUrl },
        { field: 'matieres', ...matEv, pdfUrl },
        { field: 'epreuves', ...eprEv, pdfUrl },
        { field: 'deadline', ...(datesEv as any).deadline, pdfUrl },
        { field: 'competitionDate', ...(datesEv as any).competitionDate, pdfUrl },
        { field: 'documents', ...docsEv, pdfUrl }
      ]
    });
  }

  // Si aucun PDF trouvé, crée un preview vide explicatif
  if (urlsToTest.length===0) {
    previews.push({
      source: { sourceId: 'min-sup', baseUrl: 'https://www.enssup.gov.ma', pdfUrl: null },
      entityType: 'COMPETITION',
      status: 'REVIEW',
      payload: null,
      fields: {},
      warnings: ['Aucun PDF officiel trouvé sur la page pilote — à vérifier manuellement'],
      errors: [],
      evidence: []
    });
    stats.REVIEW = 1;
  }

  const tag = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
  const jsonFile = join(OUT_DIR, `competition-pdf-preview-${tag}.json`);
  const txtFile = join(LOG_DIR, `competition-pdf-preview-${tag}.txt`);
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  writeFileSync(jsonFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: { sourceId: 'min-sup', baseUrl: 'https://www.enssup.gov.ma', officialDomain: 'enssup.gov.ma' },
    totalPdf: urlsToTest.length,
    stats,
    previews
  }, null, 2), 'utf-8');

  const lines: string[] = [];
  lines.push('======================================================================');
  lines.push(`COMPETITION PDF PREVIEW — ${new Date().toISOString()}`);
  lines.push(`Source: min-sup — https://www.enssup.gov.ma`);
  lines.push(`PDF testés: ${urlsToTest.length} (max 10)`);
  lines.push(`IMPORTABLE: ${stats.IMPORTABLE} | REVIEW: ${stats.REVIEW} | BLOCKED: ${stats.BLOCKED}`);
  lines.push('======================================================================');
  for (let i=0;i<previews.length;i++) {
    const p = previews[i];
    lines.push(`${i+1}. ${p.pdfUrl?.slice(0,80) || '—'} — ${p.status}`);
    lines.push(`   extraction: pages=${p.extraction?.pageCount||'—'} scanned=${p.extraction?.isScanned} exploitable=${p.extraction?.hasExploitableText} len=${p.extraction?.textLength||0} ${p.extraction?.error||''}`);
    if (p.payload) {
      lines.push(`   places: ${p.fields?.places?.value ?? '—'} (${p.fields?.places?.status}) evidence=${(p.fields?.places as any)?.rawText?.slice(0,40)||'—'}`);
      lines.push(`   conditions: ${Array.isArray(p.fields?.conditions?.value) ? (p.fields.conditions.value as any[]).slice(0,2).join(' | ').slice(0,60) : '—'} (${p.fields?.conditions?.status})`);
      lines.push(`   matieres: ${JSON.stringify(p.fields?.matieres?.value)?.slice(0,60)||'—'} (${p.fields?.matieres?.status})`);
      lines.push(`   deadline: ${p.fields?.registrationDeadline?.value || p.fields?.deadline?.value || '—'} (${p.fields?.registrationDeadline?.status||'—'})`);
      lines.push(`   officialDocument: ${p.payload.officialDocument?.slice(0,60)||'—'} officialWebsite: ${p.payload.officialWebsite||'—'}`);
    }
    if (p.warnings?.length) lines.push(`   warnings: ${p.warnings.join('; ').slice(0,120)}`);
  }
  lines.push('======================================================================');
  lines.push('CONFIRMATION');
  lines.push('DB writes = 0');
  lines.push('Supabase writes = 0');
  lines.push('localStorage writes = 0');
  lines.push('Forms modified = 0');
  lines.push('PDF → preview only, no import');
  lines.push('======================================================================');
  writeFileSync(txtFile, lines.join('\n'), 'utf-8');

  return { totalPdf: urlsToTest.length, stats, jsonFile, txtFile, previews };
}
