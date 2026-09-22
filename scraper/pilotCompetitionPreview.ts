// Pilot competition preview — min-sup — NO DB WRITE
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pilotEnssupSource } from './sources/pilotEnssup.ts';
import { buildItem } from './sources/almaster.ts';
import { finalizeItem } from './normalizers/normalize.ts';
import { mapToCompetition } from './mappers/competitionMapper.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

export async function runPilotCompetitionPreview() {
  const opts = { limit: 10, delayMs: 600 };
  console.log(`[Pilot] Source: ${pilotEnssupSource.label} (${pilotEnssupSource.baseUrl})`);
  console.log(`[Pilot] Discovery URL: ${pilotEnssupSource.baseUrl} — ${new Date().toISOString()}`);

  const result = await pilotEnssupSource.scrape(opts);
  console.log(`[Pilot] Pages analysées: ${result.pagesAnalyzed}, annonces trouvées: ${result.entries.length}, erreurs: ${result.errors.length}`);

  const items: any[] = [];
  for (const entry of result.entries) {
    try {
      const draft = buildItem(entry as any);
      const scraped: any = finalizeItem(draft as any, pilotEnssupSource.name);
      if (!scraped) continue;
      // Pour pilot compétition, on force category COMPETITION et on garde les champs extraits
      items.push(scraped);
    } catch (e:any) { console.warn('buildItem fail', e.message); }
  }

  const previews: any[] = [];
  let stats = { IMPORTABLE:0, REVIEW:0, BLOCKED:0 };
  let coverage: Record<string,number> = { places:0, conditions:0, matieres:0, epreuves:0, deadline:0, competitionDate:0, registrationUrl:0, officialDocument:0, officialWebsite:0 };

  for (const scraped of items) {
    const mapped = mapToCompetition(scraped);
    // Détermine statut final selon mapper (BLOCKED si places/conditions/matieres manquants)
    let status: string = mapped.blocked ? 'BLOCKED' : (mapped.valid ? 'IMPORTABLE' : 'REVIEW');
    // Mais pour pilot, on considère que si mapped.blocked due à places/conditions/matieres, c'est BLOCKED (attendu)
    // Si seulement REVIEW (ex: schoolId), alors REVIEW
    if (mapped.fields.places?.status==='BLOCKED' || mapped.fields.conditions?.status==='BLOCKED' || mapped.fields.matieres?.status==='BLOCKED') {
      status = 'BLOCKED';
    } else if (Object.values(mapped.fields).some((f:any)=> f.status==='REVIEW')) {
      status = mapped.valid ? 'REVIEW' : 'REVIEW';
      if (status==='IMPORTABLE' && !mapped.valid) status='REVIEW';
    }
    // Stats
    if (status==='IMPORTABLE') stats.IMPORTABLE++; else if (status==='BLOCKED') stats.BLOCKED++; else stats.REVIEW++;

    // Couverture
    if (mapped.payload.places) coverage.places++;
    if (mapped.payload.conditions) coverage.conditions++;
    if (mapped.payload.matieres) coverage.matieres++;
    if (mapped.payload.epreuves) coverage.epreuves++;
    if (mapped.payload.registrationDeadline) coverage.deadline++;
    if (mapped.payload.competitionDate) coverage.competitionDate++;
    if (mapped.payload.registrationUrl) coverage.registrationUrl++;
    if (mapped.payload.documentsDemandes) coverage.officialDocument++;
    if (mapped.payload.officialWebsite) coverage.officialWebsite++;

    previews.push({
      source: {
        sourceId: 'min-sup',
        organization: 'Ministère de l\'Enseignement Supérieur',
        baseUrl: pilotEnssupSource.baseUrl,
        page: scraped.sourceUrl,
        dateTest: new Date().toISOString()
      },
      entityType: 'COMPETITION',
      status,
      payload: mapped.payload,
      fields: mapped.fields,
      references: {
        schoolId: (mapped.fields as any).schoolId?.referenceId || null,
        universityId: (mapped.fields as any).universityId?.referenceId || null,
        city: (mapped.fields as any).city?.referenceId || null
      },
      warnings: mapped.warnings,
      errors: mapped.errors,
      evidence: [`sourceUrl=${scraped.sourceUrl}`, `title="${scraped.title.slice(0,60)}"`, `establishment=${scraped.establishment||'—'}`, `city=${scraped.city||'—'}`]
    });
  }

  const tag = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
  const jsonFile = join(OUT_DIR, `competition-pilot-preview-${tag}.json`);
  const txtFile = join(LOG_DIR, `competition-pilot-preview-${tag}.txt`);
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  writeFileSync(jsonFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: { sourceId: 'min-sup', organization: 'Ministère de l\'Enseignement Supérieur', baseUrl: pilotEnssupSource.baseUrl, page: pilotEnssupSource.baseUrl, dateTest: new Date().toISOString() },
    totalFound: result.entries.length,
    parsed: items.length,
    valid: previews.length,
    stats,
    coverage,
    previews
  }, null, 2), 'utf-8');

  const lines: string[] = [];
  lines.push('======================================================================');
  lines.push(`COMPETITION PILOT PREVIEW — ${new Date().toISOString()}`);
  lines.push(`Source testée: min-sup — Ministère de l'Enseignement Supérieur — ${pilotEnssupSource.baseUrl}`);
  lines.push(`Page utilisée: ${pilotEnssupSource.baseUrl}`);
  lines.push(`Date du test: ${new Date().toISOString()}`);
  lines.push('======================================================================');
  lines.push(`Nombre d'annonces trouvées: ${result.entries.length}`);
  lines.push(`Nombre parsées: ${items.length}`);
  lines.push(`Nombre valides: ${previews.length}`);
  lines.push(`IMPORTABLE: ${stats.IMPORTABLE} | REVIEW: ${stats.REVIEW} | BLOCKED: ${stats.BLOCKED}`);
  lines.push('');
  lines.push('Couverture:');
  lines.push(`  places: ${coverage.places}/${previews.length}`);
  lines.push(`  conditions: ${coverage.conditions}/${previews.length}`);
  lines.push(`  matieres: ${coverage.matieres}/${previews.length}`);
  lines.push(`  epreuves: ${coverage.epreuves}/${previews.length}`);
  lines.push(`  deadline: ${coverage.deadline}/${previews.length}`);
  lines.push(`  competitionDate: ${coverage.competitionDate}/${previews.length}`);
  lines.push(`  registrationUrl: ${coverage.registrationUrl}/${previews.length}`);
  lines.push(`  officialDocument: ${coverage.officialDocument}/${previews.length}`);
  lines.push(`  officialWebsite: ${coverage.officialWebsite}/${previews.length}`);
  lines.push('');
  lines.push('Exemples payloads (3):');
  for (const p of previews.slice(0,3)) {
    lines.push(`- ${p.payload.title?.slice(0,60)} | status=${p.status} | places=${p.payload.places||'—'} conditions=${p.payload.conditions?'oui':'—'} matieres=${p.payload.matieres?'oui':'—'}`);
    lines.push(`  payload: ${JSON.stringify({ title:p.payload.title, organizationName:p.payload.organizationName, city:p.payload.city, places:p.payload.places, deadline:p.payload.registrationDeadline, officialWebsite:p.payload.officialWebsite, officialDocument:p.payload.documentsDemandes?.[0]?.slice(0,40) }).slice(0,200)}`);
  }
  lines.push('');
  lines.push('======================================================================');
  lines.push('CONFIRMATION');
  lines.push('DB writes = 0');
  lines.push('Supabase writes = 0');
  lines.push('localStorage writes = 0');
  lines.push('Forms modified = 0');
  lines.push('NO DATABASE WRITE — PILOT PREVIEW ONLY');
  lines.push('======================================================================');
  writeFileSync(txtFile, lines.join('\n'), 'utf-8');

  return { source: 'min-sup', totalFound: result.entries.length, parsed: items.length, valid: previews.length, stats, coverage, jsonFile, txtFile, previews };
}
