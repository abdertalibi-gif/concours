// ============================================================
// CLI du scraper — Phase 1 (source unique : Almaster)
//
//   npm run scrape                     → limit 150
//   npm run scrape -- --limit 20
//   npm run scrape -- --refresh        → ignore la mémoire des doublons
//   npm run scrape -- --delay 500      → délai entre pages (ms)
//   npm run scrape -- --validate       → lance la validation après scraping
//
// Sortie :
//   scraper/output/concours-{source}-{timestamp}.json
//   scraper/output/concours-{source}-{timestamp}.csv
//   scraper/logs/summary-{source}-{timestamp}.txt
//   scraper/logs/errors-{source}-{timestamp}.jsonl (si erreurs)
//   scraper/logs/validation-{timestamp}.txt        (si --validate)
// ============================================================

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Logger } from './lib/logger';
import type { ScrapedItem, SourceRunner } from './lib/types';
import { getSource, listSources } from './sources/registry';
import { buildItem } from './sources/almaster';
import { finalizeItem } from './normalizers/normalize';
import { Deduplicator } from './deduplication/dedupe';
import { exportJson } from './exporters/json';
import { exportCsv } from './exporters/csv';
import { runValidation } from './validation';
import { runPhase2cValidation } from './phase2cValidation';
import { runMasterImportDryRun, runMasterImport } from './masterImport';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = `${HERE}/output`;
const LOG_DIR = `${HERE}/logs`;
const STATE_DIR = `${HERE}/state`;
const MASTERS_FILE = join(HERE, '..', 'server', 'data', 'masters.json');

for (const dir of [OUT_DIR, LOG_DIR, STATE_DIR]) mkdirSync(dir, { recursive: true });

interface CliOptions {
  source: string;
  limit: number;
  delayMs: number;
  refresh: boolean;
  validate: boolean;
  map: boolean;
  masterImport: boolean;
  dryRun: boolean;
}

function parseArgs(raw: string[]): CliOptions {
  const read = (key: string): string | undefined => {
    const i = raw.indexOf(key);
    return i >= 0 && i + 1 < raw.length ? raw[i + 1] : undefined;
  };
  if (raw.includes('--help') || raw.includes('-h')) {
    console.log(
      [
        'Usage: tsx main.ts [options]',
        '',
        '  --source <name>   source à scraper (défaut: almaster)',
        '  --limit <n>       nombre max d’annonces (défaut: 150)',
        '  --delay <ms>      délai entre pages (défaut: 300)',
        '  --refresh         ignorer la mémoire des doublons inter-runs',
        '  --validate        lancer la validation automatique après scraping',
        '  --map             lancer Phase 2C mapping validation',
        '  --master-import   import réel des Masters IMPORTABLE (Phase 4)',
        '  --dry-run         avec --master-import : simulation sans écriture',
        '',
        `Sources disponibles: ${listSources().join(', ')}`,
      ].join('\n'),
    );
    process.exit(0);
  }
  return {
    source: read('--source') ?? 'almaster',
    limit: Math.max(1, Number.parseInt(read('--limit') ?? '150', 10) || 150),
    delayMs: Math.max(0, Number.parseInt(read('--delay') ?? '300', 10) || 300),
    refresh: raw.includes('--refresh'),
    validate: raw.includes('--validate'),
    map: raw.includes('--map'),
    masterImport: raw.includes('--master-import'),
    dryRun: raw.includes('--dry-run'),
  };
}

function timestampTag(): string {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  // Mode import Masters contrôlé — ne fait pas de scraping
  if (opts.masterImport) {
    const logger = new Logger(LOG_DIR);
    if (opts.dryRun) {
      logger.info('=== MASTER IMPORT DRY-RUN ===');
      const r = await runMasterImportDryRun();
      logger.info(`Preview total      : ${r.totalPreview}`);
      logger.info(`IMPORTABLE         : ${r.importable}`);
      logger.info(`REVIEW skipped     : ${r.reviewSkipped}`);
      logger.info(`BLOCKED            : ${r.blockedSkipped}`);
      logger.info(`DUPLICATE          : ${r.duplicate}`);
      logger.info(`WOULD_INSERT       : ${r.wouldInsert}`);
      logger.info(`DB writes          : 0 (dry-run)`);
      logger.info(`JSON               : ${r.jsonFile}`);
      logger.info(`TXT                : ${r.txtFile}`);
      return;
    } else {
      logger.info('=== MASTER IMPORT RÉEL ===');
      const r = await runMasterImport();
      logger.info(`Preview total      : ${r.totalPreview}`);
      logger.info(`IMPORTABLE         : ${r.importable}`);
      logger.info(`REVIEW skipped     : ${r.reviewSkipped}`);
      logger.info(`BLOCKED            : ${r.blockedSkipped}`);
      logger.info(`DUPLICATE          : ${r.duplicate}`);
      logger.info(`INSERTED           : ${r.inserted}`);
      logger.info(`FAILED             : ${r.failed}`);
      logger.info(`DB writes          : ${r.inserted}`);
      logger.info(`Backup             : ${r.backupFile}`);
      logger.info(`JSON               : ${r.jsonFile}`);
      logger.info(`TXT                : ${r.txtFile}`);
      // Vérification que le nombre inséré correspond au nombre présent
      const after = JSON.parse(readFileSync(MASTERS_FILE, 'utf-8'));
      logger.info(`Vérification DB    : ${after.length} masters au total après import`);
      return;
    }
  }

  const source: SourceRunner | undefined = getSource(opts.source);
  if (!source) {
    console.error(`Source inconnue : "${opts.source}". Disponibles : ${listSources().join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const logger = new Logger(LOG_DIR);

  logger.info('');
  logger.info(`=== SCRAPER — ${source.label} ===`);
  logger.info(`URL        : ${source.baseUrl}`);
  logger.info(`Limite     : ${opts.limit} annonces`);
  logger.info(`Délai      : ${opts.delayMs} ms entre pages`);
  logger.info(`Dédup état : ${'inter-runs ' + (opts.refresh ? '(FORCÉE: ignorée)' : '(active)')}`);
  logger.info('');

  const dedup = new Deduplicator(STATE_DIR);

  // 1. Récupération des annonces
  const result = await source.scrape({ limit: opts.limit, delayMs: opts.delayMs });
  logger.info(`Pages analysées      ${result.pagesAnalyzed}`);
  logger.info(`Annonces pertinentes ${result.entries.length}`);
  for (const err of result.errors) logger.recordError('feed', err);

  // 2. Parsing → normalisation → dédup
  const items: ScrapedItem[] = [];
  let duplicates = 0;
  let invalid = 0;

  for (let i = 0; i < result.entries.length; i++) {
    const entry = result.entries[i];
    try {
      const draft = buildItem(entry);
      const item = finalizeItem(draft, source.name);
      if (!item) {
        invalid++;
        logger.recordError('item invalide', {
          url: entry.sourceUrl,
          title: entry.title,
          reason: 'titre ou URL source manquant',
        });
        continue;
      }
      if (dedup.isDuplicate(item.fingerprint, item.sourceUrl, opts.refresh)) {
        duplicates++;
        continue;
      }
      items.push(item);
    } catch (err) {
      invalid++;
      logger.recordError('parse', {
        url: entry.sourceUrl,
        title: entry.title,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    if ((i + 1) % 25 === 0) logger.info(`  … ${i + 1}/${result.entries.length} annonces traitées`);
  }
  dedup.save();

  const errorsTotal = result.errors.length + invalid;

  // 3. Export
  const tag = `concours-${source.name}-${timestampTag()}`;
  const jsonFile = exportJson(items, `${OUT_DIR}/${tag}.json`);
  const csvFile = exportCsv(items, `${OUT_DIR}/${tag}.csv`);
  const summaryFile = logger.persistSummary(
    `concours-${source.name}-${timestampTag()}`,
    [
      `Source            : ${source.label}`,
      `URL               : ${source.baseUrl}`,
      `Pages analysées   : ${result.pagesAnalyzed}`,
      `Annonces trouvées : ${result.entries.length}`,
      `Annonces valides  : ${items.length}`,
      `Doublons          : ${duplicates}`,
      `Erreurs           : ${errorsTotal}`,
      ``,
      `Fichiers :`,
      `  - ${jsonFile}`,
      `  - ${csvFile}`,
    ].join('\n'),
  );
  const errorFile = logger.persistErrors(`concours-${source.name}-${timestampTag()}`);

  // 4. Résumé console (format demandé)
  logger.info('');
  logger.info('---------------------------------------------');
  logger.info(`Source            : ${source.label}`);
  logger.info(`Pages analysées   : ${result.pagesAnalyzed}`);
  logger.info(`Annonces trouvées : ${result.entries.length}`);
  logger.info(`Annonces valides  : ${items.length}`);
  logger.info(`Doublons          : ${duplicates}`);
  logger.info(`Erreurs           : ${errorsTotal}`);
  logger.info('---------------------------------------------');
  logger.info(`Résumé   : ${summaryFile}`);
  logger.info(`JSON     : ${jsonFile}`);
  logger.info(`CSV      : ${csvFile}`);
  if (errorFile) logger.info(`Erreurs  : ${errorFile}`);
  logger.info('');

  // 5. Validation automatique (option --validate)
  if (opts.validate) {
    const finalJson = join(OUT_DIR, `${tag}.json`);
    logger.info(`Lancement de la validation sur ${finalJson}`);
    const r = runValidation(finalJson);
    logger.info('');
    logger.info('--- RÉSUMÉ VALIDATION ---');
    logger.info(`Total               : ${r.total}`);
    logger.info(`Valides             : ${r.valid}`);
    logger.info(`Doublons            : ${r.duplicates}`);
    logger.info(`Erreurs             : ${r.errors}`);
    const FIELDS = [
      'title', 'organization', 'university', 'establishment', 'city', 'region', 'domain',
      'level', 'academicYear', 'description', 'conditions', 'documents', 'places',
      'openingDate', 'deadlineDate', 'examDate', 'resultsDate', 'officialUrl',
      'registrationUrl', 'sourceUrl',
    ];
    const avg = FIELDS.reduce((s, f) => s + r.coverage[f], 0) / (r.total * FIELDS.length) * 100;
    logger.info(`Couverture moyenne  : ${avg.toFixed(1)}%`);
    logger.info(`Champs manquants    : ${r.missingTop.slice(0, 3).join(', ')}`);
    logger.info('----------------------');
  }

  // 6. Phase 2C mapping validation (option --map) — AUCUNE ÉCRITURE DB
  if (opts.map) {
    const finalJson = join(OUT_DIR, `${tag}.json`);
    logger.info(`Lancement Phase 2C mapping validation sur ${finalJson}`);
    const r2 = await runPhase2cValidation(finalJson);
    logger.info('');
    logger.info('--- RÉSUMÉ PHASE 2C ---');
    logger.info(`Total sources       : ${r2.total}`);
    logger.info(`MASTER valid        : ${r2.stats.masterValid}/${r2.total}`);
    logger.info(`COMPETITION blocked : ${r2.stats.competitionBlocked}/${r2.total}`);
    logger.info(`AUTO fields         : ${r2.stats.AUTO}`);
    logger.info(`REVIEW fields       : ${r2.stats.REVIEW}`);
    logger.info(`JSON                : ${r2.jsonFile}`);
    logger.info(`TXT                 : ${r2.txtFile}`);
    logger.info('NO DB WRITE — Phase 2C read-only');
    logger.info('----------------------');
  }
}

main();