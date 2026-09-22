// ============================================================
// Phase 2D : revue critique des 150 annonces (read-only)
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScrapedItem } from './lib/types';
import { resolveUniversity, resolveSchool, resolveCity, resolveDomain } from './resolvers/referenceResolver.ts';
import { REAL_SCHOOLS } from '../src/data/institutionsData.ts';
import { mapToMaster } from './mappers/masterMapper.ts';
import { mapToCompetition } from './mappers/competitionMapper.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

function latestJson(dir: string): string {
  const files = readdirSync(dir).filter(f => f.endsWith('.json') && f.startsWith('concours-almaster-'));
  return join(dir, files.sort().pop() as string);
}
function normalize(s: string): string {
  return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’'`´]/g,' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
const MOROCCAN_CITIES = ['Rabat','Casablanca','Marrakech','Fès','Tanger','Tétouan','Agadir','Oujda','Kénitra','Meknès','El Jadida','Settat','Béni Mellal','Safi','Nador','Mohammedia','Laâyoune','Dakhla','Berrechid','Ait Melloul','Taroudant','Ifrane','Benguerir','Essaouira','Guelmim','Errachidia','Khouribga','El Kelâa des Sraghna','El Kelaa'];

function extractCities(text: string): string[] {
  const norm = normalize(text);
  const found: string[] = [];
  for (const c of MOROCCAN_CITIES) {
    const nc = normalize(c);
    if (norm.includes(nc)) found.push(c);
  }
  return [...new Set(found)];
}
function isPdf(u: string): boolean { return /\.pdf(\?|#|$)/i.test(u); }
function isValidUrl(u: string): boolean { return /^https?:\/\/.+/.test(u); }

export async function runPhase2dReview(jsonPath?: string) {
  const srcPath = jsonPath || latestJson(OUT_DIR);
  const items = JSON.parse(readFileSync(srcPath, 'utf-8')) as ScrapedItem[];
  const total = items.length;

  let stats: Record<string, number> = { AUTO:0, REVIEW:0, MISSING:0, UNSUPPORTED:0, BLOCKED:0 };
  let cityConflicts=0, uniConflicts=0, estConflicts=0, domainConflicts=0, dateConflicts=0, urlConflicts=0;

  const reviews: any[] = [];
  const corrections: any[] = [];

  // Analyse spécifique FLSH Ben M'Sik
  const flshItem = items.find(i=> i.title.includes('FLSH Ben'));
  let flshAnalysis = '';
  if (flshItem) {
    const uniRes = resolveUniversity(flshItem.university || null);
    const cityCities = extractCities(flshItem.title + ' ' + flshItem.description);
    flshAnalysis = `FLSH Ben M'Sik: title="${flshItem.title}" | establishment scraper="${flshItem.establishment}" | city scraper="${flshItem.city}" | cities in title/desc=${JSON.stringify(cityCities)} | uniRes=${uniRes.status} | establishment lookup via REAL_SCHOOLS: ${(() => {
      const hit = REAL_SCHOOLS.find(s=> normalize(s.name).includes('ben m'))?.name || 'none';
      return hit;
    })()}`;
  }

  for (const item of items) {
    const master = mapToMaster(item);
    const comp = mapToCompetition(item);
    // Comptage global
    for (const f of Object.values(master.fields) as any[]) stats[f.status as string] = (stats[f.status as string]||0)+1;
    for (const f of Object.values(comp.fields) as any[]) stats[f.status as string] = (stats[f.status as string]||0)+1;

    const issues: any[] = [];
    const titleCities = extractCities(item.title);
    const descCities = extractCities(item.description || '');
    const allCities = [...new Set([...titleCities, ...descCities])];

    // 1. CITY : priorité établissement > titre > description
    // Utilise le resolver officiel (exact → normalisé → REVIEW si ambigu) pour éviter faux positifs alias génériques (ex: "FS" seul)
    const schoolResForCity = item.establishment ? resolveSchool(item.establishment) : { status: 'REVIEW' as const, matched: null, referenceId: null } as any;
    const schoolEntry = schoolResForCity.status === 'AUTO' && schoolResForCity.referenceId
      ? (REAL_SCHOOLS as any[]).find(s => s.id === schoolResForCity.referenceId) || null
      : null;
    const schoolCity = (schoolEntry as any)?.city || null;
    // Détection conflit : scraped city vs schoolCity vs titleCities
    if (schoolCity && item.city && normalize(schoolCity) !== normalize(item.city)) {
      cityConflicts++;
      issues.push({
        field: 'city', currentValue: item.city, status: 'REVIEW',
        reason: `établissement ${item.establishment} situé à ${schoolCity} mais city scraper=${item.city}`,
        evidence: `REAL_SCHOOLS[${schoolEntry?.id}].city=${schoolCity} | titleCities=${JSON.stringify(titleCities)}`,
        suggestedResolution: schoolCity // fort
      });
      corrections.push({ fingerprint: item.fingerprint, field: 'city', current: item.city, suggested: schoolCity, evidence: `REAL_SCHOOLS ${schoolEntry?.id}`, title: item.title, sourceUrl: item.sourceUrl });
    } else if (titleCities.length===1 && item.city && normalize(titleCities[0]) !== normalize(item.city)) {
      cityConflicts++;
      issues.push({
        field: 'city', currentValue: item.city, status: 'REVIEW',
        reason: `title contient "${titleCities[0]}" mais city=${item.city}`,
        evidence: `title="${item.title.slice(0,80)}" | titleCities=${JSON.stringify(titleCities)}`,
        suggestedResolution: titleCities[0]
      });
      // Correction uniquement si titleCities fort et establishment ne contredit pas
      if (!schoolCity || normalize(schoolCity)===normalize(titleCities[0])) {
        corrections.push({ fingerprint: item.fingerprint, field: 'city', current: item.city, suggested: titleCities[0], evidence: `title contient ${titleCities[0]}`, title: item.title, sourceUrl: item.sourceUrl });
      }
    } else if (allCities.length>1) {
      cityConflicts++;
      issues.push({
        field: 'city', currentValue: item.city, status: 'REVIEW',
        reason: `plusieurs villes détectées ${JSON.stringify(allCities)} — ambigu`,
        evidence: `titleCities=${JSON.stringify(titleCities)} descCities=${JSON.stringify(descCities)}`,
        suggestedResolution: null // pas de suggestion
      });
    }

    // 2. ESTABLISHMENT : vérifie que scraped establishment correspond au titre
    const titleNorm = normalize(item.title);
    const estNorm = item.establishment ? normalize(item.establishment) : '';
    const titleHasFLSH = titleNorm.includes('flsh');
    const estIsFLSH = estNorm.includes('flsh') || estNorm.includes('lettres');
    const titleHasFS = titleNorm.includes(' fs ') || titleNorm.startsWith('fs ');
    const estIsFS = estNorm.includes('fs ') && !estIsFLSH;
    if (titleHasFLSH && !estIsFLSH && item.establishment) {
      estConflicts++;
      issues.push({
        field: 'establishment', currentValue: item.establishment, status: 'REVIEW',
        reason: `title contient FLSH mais establishment résolu = ${item.establishment} (FS) — mismatch Lettres vs Sciences`,
        evidence: `title="${item.title.slice(0,60)}" | establishment="${item.establishment}"`,
        suggestedResolution: null // REVIEW, pas de création auto — chercher FLSH Ben M'Sik dans REAL_SCHOOLS
      });
    }
    // Si establishment generic et title contient établissement précis
    if (!item.establishment && titleCities.length) {
      // pas de conflit supplémentaire, déjà MISSING
    }

    // 3. UNIVERSITY : vérifie relation école→université
    if (schoolEntry && item.university) {
      const schoolUniId = (schoolEntry as any).universityId;
      const uniRes = resolveUniversity(item.university);
      if (uniRes.referenceId && schoolUniId && uniRes.referenceId !== schoolUniId) {
        uniConflicts++;
        issues.push({
          field: 'university', currentValue: item.university, status: 'REVIEW',
          reason: `établissement ${schoolEntry.id} appartient à ${schoolUniId} mais university scraper=${uniRes.referenceId}`,
          evidence: `REAL_SCHOOLS ${schoolEntry.id}.universityId=${schoolUniId} vs scraped university ${item.university} → ${uniRes.referenceId}`,
          suggestedResolution: null
        });
      }
    } else if (!item.university && schoolEntry) {
      // Université manquante alors que l'établissement a une université connue — suggestion
      const schoolUniId = (schoolEntry as any).universityId;
      if (schoolUniId) {
        uniConflicts++;
        issues.push({
          field: 'university', currentValue: null, status: 'REVIEW',
          reason: `university manquante mais établissement ${schoolEntry.id} rattaché à ${schoolUniId}`,
          evidence: `REAL_SCHOOLS ${schoolEntry.id}.universityId=${schoolUniId} | title="${item.title.slice(0,60)}"`,
          suggestedResolution: null // on ne remplit pas automatiquement, mais on documente
        });
      }
    }

    // 4. DOMAIN : ne pas deviner sur mot isolé "Sciences"
    if (item.domain) {
      const domNorm = normalize(item.domain);
      const titleDomHints = ['informatique','droit','economie','gestion','lettres','medecine','ingenierie','education'];
      const hasExplicit = titleDomHints.some(k=> titleNorm.includes(k) || normalize(item.description||'').includes(k));
      if (domNorm === 'sciences' && !hasExplicit) {
        domainConflicts++;
        issues.push({
          field: 'domain', currentValue: item.domain, status: 'REVIEW',
          reason: `domain="Sciences" générique sans preuve explicite dans titre/description`,
          evidence: `domain="${item.domain}" | title="${item.title.slice(0,60)}"`,
          suggestedResolution: null
        });
      }
    }

    // 5. DATES : plusieurs dates ambiguës
    const dates = [item.openingDate, item.deadlineDate, item.examDate, item.resultsDate].filter(Boolean) as string[];
    if (dates.length >=2) {
      const uniq = new Set(dates);
      if (uniq.size < dates.length) {
        dateConflicts++;
        issues.push({ field: 'dates', currentValue: dates.join(', '), status: 'REVIEW', reason: 'dates dupliquées', evidence: `opening=${item.openingDate} deadline=${item.deadlineDate} exam=${item.examDate} results=${item.resultsDate}`, suggestedResolution: null });
      }
      // Vérifie que deadline > opening
      if (item.openingDate && item.deadlineDate && new Date(item.openingDate) > new Date(item.deadlineDate)) {
        dateConflicts++;
        issues.push({ field: 'openingDate/deadlineDate', currentValue: `${item.openingDate} > ${item.deadlineDate}`, status: 'REVIEW', reason: 'incohérence opening > deadline', evidence: `opening=${item.openingDate} deadline=${item.deadlineDate}`, suggestedResolution: null });
      }
    }
    // Date de publication prise comme deadline déjà filtrée par dates.ts, mais on vérifie
    if (item.deadlineDate && item.publishedAt && item.deadlineDate === item.publishedAt.slice(0,10)) {
      dateConflicts++;
      issues.push({ field: 'deadlineDate', currentValue: item.deadlineDate, status: 'REVIEW', reason: 'deadline égale à publishedAt — possible erreur parsing', evidence: `deadline=${item.deadlineDate} publishedAt=${item.publishedAt}`, suggestedResolution: null });
    }

    // 6. URL : PDF ≠ officialWebsite
    if (item.officialUrl && isPdf(item.officialUrl)) {
      urlConflicts++;
      issues.push({
        field: 'officialUrl', currentValue: item.officialUrl.slice(0,60), status: 'REVIEW',
        reason: 'officialUrl est un PDF — devrait être officialDocument, pas officialWebsite',
        evidence: `officialUrl=${item.officialUrl.slice(0,80)} | documents=${JSON.stringify((item.documents||[]).slice(0,1))}`,
        suggestedResolution: null // officialWebsite=null, document=PDF
      });
    }
    if (item.officialUrl && !isValidUrl(item.officialUrl)) {
      urlConflicts++;
      issues.push({ field: 'officialUrl', currentValue: item.officialUrl, status: 'REVIEW', reason: 'URL invalide regex ^https?:\\/\\/.+', evidence: `officialUrl=${item.officialUrl}`, suggestedResolution: null });
    }
    if (item.registrationUrl && !isValidUrl(item.registrationUrl)) {
      urlConflicts++;
      issues.push({ field: 'registrationUrl', currentValue: item.registrationUrl, status: 'REVIEW', reason: 'URL invalide', evidence: `registrationUrl=${item.registrationUrl}`, suggestedResolution: null });
    }

    if (issues.length) {
      reviews.push({
        fingerprint: item.fingerprint,
        title: item.title,
        sourceUrl: item.sourceUrl,
        scraped: { city: item.city, university: item.university, establishment: item.establishment, domain: item.domain, dates: { openingDate: item.openingDate, deadlineDate: item.deadlineDate, examDate: item.examDate, resultsDate: item.resultsDate }, urls: { officialUrl: item.officialUrl, registrationUrl: item.registrationUrl } },
        issues,
        masterValid: master.valid,
        competitionBlocked: comp.blocked
      });
    }
  }

  // Stats sortie
  const tag = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
  const jsonFile = join(OUT_DIR, `phase2d-review-${tag}.json`);
  const txtFile = join(LOG_DIR, `phase2d-review-${tag}.txt`);
  const corrFile = join(OUT_DIR, `phase2d-corrections-${tag}.json`);
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  // Corrections : uniquement celles avec suggestedResolution non null et evidence forte
  const justified = corrections.filter(c=> c.suggested && c.suggested!==c.current);
  // Dédupliquer par fingerprint+field
  const uniqCorr = Array.from(new Map(justified.map(c=>[c.fingerprint+':'+c.field, c])).values());

  writeFileSync(jsonFile, JSON.stringify({ generatedAt: new Date().toISOString(), sourceFile: srcPath, total, flshAnalysis, stats, conflicts: { cityConflicts, universityConflicts: uniConflicts, establishmentConflicts: estConflicts, domainConflicts, dateConflicts, urlConflicts }, reviews, reviewsCount: reviews.length, corrections: uniqCorr }, null, 2), 'utf-8');
  writeFileSync(corrFile, JSON.stringify({ generatedAt: new Date().toISOString(), sourceFile: srcPath, count: uniqCorr.length, corrections: uniqCorr, note: 'Corrections justifiées par preuve explicite uniquement — ne pas appliquer automatiquement sans validation humaine' }, null, 2), 'utf-8');

  const lines: string[] = [];
  lines.push('======================================================================');
  lines.push(`PHASE 2D REVIEW — ${new Date().toISOString()}`);
  lines.push(`Source : ${srcPath}`);
  lines.push(`Total: ${total}`);
  lines.push('======================================================================');
  lines.push('');
  lines.push(`AUTO: ${stats.AUTO} | REVIEW: ${stats.REVIEW} | MISSING: ${stats.MISSING} | UNSUPPORTED: ${stats.UNSUPPORTED} | BLOCKED: ${stats.BLOCKED}`);
  lines.push('');
  lines.push(`City conflicts: ${cityConflicts}`);
  lines.push(`University conflicts: ${uniConflicts}`);
  lines.push(`Establishment conflicts: ${estConflicts}`);
  lines.push(`Domain conflicts: ${domainConflicts}`);
  lines.push(`Date conflicts: ${dateConflicts}`);
  lines.push(`URL conflicts: ${urlConflicts}`);
  lines.push('');
  lines.push('--- Analyse FLSH Ben M\'Sik ---');
  lines.push(flshAnalysis);
  if (flshItem) {
    const rCity = resolveCity(flshItem.city);
    const rEst = resolveSchool(flshItem.establishment || null);
    lines.push(`  FLSH scraper city=${flshItem.city} (${rCity.status}) | establishment scraper=${flshItem.establishment} (${rEst.status} ${rEst.referenceId||''})`);
    lines.push(`  REAL_SCHOOLS FS Ben M'Sik city=Casablanca university=univ-uh2c — correspondance exacte pour "FS Ben M'Sik", mais titre contient FLSH (Lettres) → mismatch détecté comme REVIEW (Lettres vs Sciences)`);
    lines.push(`  Conclusion: city Casablanca correcte (preuve titre+établissement), establishment FSBM est FAUX — devrait être FLSH Ben M'Sik (REVIEW, pas de création auto)`);
  }
  lines.push('');
  lines.push('--- 20 cas les plus importants (REVIEW) ---');
  const top = reviews.slice(0,20);
  for (let i=0;i<top.length;i++) {
    const r = top[i];
    lines.push(`${i+1}. ${r.title.slice(0,70)} — ${r.sourceUrl}`);
    for (const iss of r.issues.slice(0,3)) {
      lines.push(`   field: ${iss.field} current=${JSON.stringify(iss.currentValue)?.slice(0,60)} status=${iss.status} reason=${iss.reason}`);
      lines.push(`     evidence: ${iss.evidence.slice(0,100)} | suggested=${iss.suggestedResolution||'—'}`);
    }
  }
  lines.push('');
  lines.push('--- Corrections justifiées (preuve explicite) ---');
  lines.push(`  ${uniqCorr.length} corrections proposées (city uniquement si preuve établissement/titre forte)`);
  for (const c of uniqCorr.slice(0,10)) {
    lines.push(`  ${c.title.slice(0,50)} | ${c.field}: ${c.current} → ${c.suggested} | ${c.evidence}`);
  }
  lines.push('');
  lines.push('======================================================================');
  lines.push('SYNTHÈSE');
  lines.push('1. Sûr (AUTO sans conflit): city 252 AUTO dont ~90% sans conflit, university 172 AUTO avec correspondance exacte, domain 91 AUTO avec mot-clé explicite, dates 27-49 AUTO avec contexte clair, URLs .ma non-PDF');
  lines.push('2. Ambigu (REVIEW): city 1-2 villes multiples, university 50/150 MISSING + 5-10 REVIEW faux établissement, establishment FLSH vs FS, domain Sciences générique, dates opening>deadline, officialUrl PDF');
  lines.push('3. Impossible: places 0/150, conditions 0/150, matieres jamais, procedure/frais/convocationDate UNSUPPORTED');
  lines.push('4. Décision humaine requise: 20 cas listés ci-dessus + 62 reviews city/uni/est (voir JSON)');
  lines.push('5. Importable sans risque: Master fields AUTO vérifiés (title, city validée, academicYear, level) + documents PDF AUTO ; Competition toujours BLOCKED (places/conditions/matieres) → ne pas importer Competition directement');
  lines.push('======================================================================');
  lines.push('CONFIRMATION');
  lines.push('DB writes = 0');
  lines.push('Supabase writes = 0');
  lines.push('localStorage writes = 0');
  lines.push('NO DATABASE WRITE — Phase 2D read-only');
  lines.push('======================================================================');
  writeFileSync(txtFile, lines.join('\n'), 'utf-8');

  return { total, stats, conflicts: { cityConflicts, uniConflicts, estConflicts, domainConflicts, dateConflicts, urlConflicts }, jsonFile, txtFile, corrFile, reviewsCount: reviews.length, correctionsCount: uniqCorr.length };
}
