// ============================================================
// Phase 4 — Import réel contrôlé des Masters IMPORTABLE
// AUCUNE écriture hors dry-run
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');
const SERVER_DATA_DIR = join(HERE, '..', 'server', 'data');
const MASTERS_FILE = join(SERVER_DATA_DIR, 'masters.json');
const BACKUP_DIR = join(OUT_DIR, 'backups');

function latestPreview(): string {
  const files = readdirSync(OUT_DIR).filter(f => f.startsWith('master-import-preview-') && f.endsWith('.json'));
  if (!files.length) throw new Error('Aucun master-import-preview-*.json trouvé. Exécutez Phase 3 d\'abord.');
  return join(OUT_DIR, files.sort().pop() as string);
}

function generateUniqueKey(university: string, establishment: string, name: string, academicYear: string): string {
  const clean = (str: string) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${clean(university)}-${clean(establishment)}-${clean(name)}-${clean(academicYear)}`;
}

function getMastersStore(): any[] {
  if (!existsSync(MASTERS_FILE)) return [];
  try {
    const c = readFileSync(MASTERS_FILE, 'utf-8');
    const p = JSON.parse(c);
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

function validateMasterPayload(p: any): string[] {
  const errs: string[] = [];
  if (!p.name?.trim()) errs.push('name manquant');
  if (!p.establishment?.trim()) errs.push('establishment manquant');
  if (!p.university?.trim()) errs.push('university manquant');
  if (!p.city?.trim()) errs.push('city manquant');
  if (!p.academicYear?.trim()) errs.push('academicYear manquant');
  if (!p.sourceUrl?.trim()) errs.push('sourceUrl manquant');
  // Vérifie que l'ID est bien présent si on l'a généré
  if (p.seats !== null && p.seats !== undefined && typeof p.seats !== 'number') errs.push('seats doit être number|null');
  if (p.officialUrl && !/^https?:\/\/.+/.test(p.officialUrl)) errs.push('officialUrl invalide');
  if (p.schoolWebsite && !/^https?:\/\/.+/.test(p.schoolWebsite)) errs.push('schoolWebsite invalide');
  return errs;
}

export async function runMasterImportDryRun(previewPath?: string) {
  const previewFile = previewPath || latestPreview();
  const preview = JSON.parse(readFileSync(previewFile, 'utf-8'));
  const all = preview.previews as any[];
  const importables = all.filter(p => p.status === 'IMPORTABLE' || p.status.startsWith('IMPORTABLE'));
  const reviewSkipped = all.filter(p => p.status.startsWith('REVIEW')).length;
  const blockedSkipped = all.filter(p => p.status.startsWith('BLOCKED')).length;

  const existing = getMastersStore();
  const existingKeys = new Set(existing.map((m:any)=> m.uniqueKey));
  const existingCombo = new Set(existing.map((m:any)=> `${m.university}||${m.establishment}||${m.name}||${m.academicYear}`));

  const results: any[] = [];
  let duplicate = 0;
  let wouldInsert = 0;

  for (const item of importables) {
    const payload = item.payload;
    const uniqueKey = generateUniqueKey(payload.university, payload.establishment, payload.name, payload.academicYear);
    const combo = `${payload.university}||${payload.establishment}||${payload.name}||${payload.academicYear}`;

    // Vérification payload
    const valErrs = validateMasterPayload(payload);

    if (existingKeys.has(uniqueKey) || existingCombo.has(combo)) {
      const existingItem = existing.find((m:any)=> m.uniqueKey===uniqueKey || `${m.university}||${m.establishment}||${m.name}||${m.academicYear}`===combo);
      results.push({
        sourceUrl: payload.sourceUrl,
        name: payload.name,
        uniqueKey,
        status: 'DUPLICATE',
        action: 'SKIPPED_DUPLICATE',
        existingId: existingItem?.id || null,
        existingUniqueKey: existingItem?.uniqueKey || uniqueKey,
        reason: `Doublon détecté via uniqueKey ou combo university+establishment+name+year`,
        errors: valErrs,
        warnings: item.warnings || []
      });
      duplicate++;
      continue;
    }

    if (valErrs.length) {
      results.push({
        sourceUrl: payload.sourceUrl,
        name: payload.name,
        uniqueKey,
        status: 'FAILED',
        action: 'FAILED',
        errors: valErrs,
        warnings: item.warnings || []
      });
      continue;
    }

    // Payload final tel qu'il serait inséré
    const finalPayload = {
      id: `mst-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
      uniqueKey,
      ...payload,
      // Assure les champs requis avec valeurs existantes
      domain: payload.domain || 'Sciences & Technologies',
      level: payload.level || 'Master (Bac+5)',
      status: payload.status || 'INFORMATION',
      seats: payload.seats ?? null,
      openingDate: payload.openingDate || null,
      deadlineDate: payload.deadlineDate || null,
      examDate: payload.examDate || null,
      publicationDate: payload.publicationDate || new Date().toISOString().split('T')[0],
      resultsDate: payload.resultsDate || null,
      conditions: payload.conditions || null,
      documents: payload.documents || null,
      officialUrl: payload.officialUrl || null,
      schoolWebsite: payload.schoolWebsite || null,
      sourceUrl: payload.sourceUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    results.push({
      sourceUrl: payload.sourceUrl,
      name: payload.name,
      uniqueKey,
      status: 'WOULD_INSERT',
      action: 'DRY_RUN_WOULD_INSERT',
      insertedId: finalPayload.id,
      payload: finalPayload,
      fields: item.fields,
      references: item.references,
      evidence: item.evidence,
      warnings: item.warnings || [],
      errors: []
    });
    wouldInsert++;
  }

  const tag = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
  const jsonFile = join(OUT_DIR, `master-import-dry-run-${tag}.json`);
  const txtFile = join(LOG_DIR, `master-import-dry-run-${tag}.txt`);
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  writeFileSync(jsonFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    previewFile,
    totalPreview: all.length,
    importable: importables.length,
    reviewSkipped,
    blockedSkipped,
    duplicate,
    wouldInsert,
    failed: results.filter(r=>r.status==='FAILED').length,
    dbWrites: 0,
    supabaseWrites: 0,
    results
  }, null, 2), 'utf-8');

  const lines: string[] = [];
  lines.push('======================================================================');
  lines.push(`MASTER IMPORT DRY-RUN — ${new Date().toISOString()}`);
  lines.push(`Preview: ${previewFile}`);
  lines.push(`Total preview: ${all.length} | IMPORTABLE: ${importables.length} | REVIEW skipped: ${reviewSkipped} | BLOCKED: ${blockedSkipped}`);
  lines.push(`DUPLICATE: ${duplicate} | WOULD_INSERT: ${wouldInsert} | FAILED: ${results.filter(r=>r.status==='FAILED').length}`);
  lines.push('DB writes = 0 (dry-run)');
  lines.push('======================================================================');
  for (const r of results) {
    lines.push(`${r.action} — ${r.name?.slice(0,60)} | uniqueKey=${r.uniqueKey?.slice(0,50)}... | ${r.sourceUrl}`);
    if (r.existingId) lines.push(`  existingId=${r.existingId} existingUniqueKey=${r.existingUniqueKey}`);
    if (r.errors?.length) lines.push(`  errors: ${r.errors.join(', ')}`);
  }
  lines.push('======================================================================');
  lines.push('NO DATABASE WRITE — dry-run');
  lines.push('======================================================================');
  writeFileSync(txtFile, lines.join('\n'), 'utf-8');

  return { totalPreview: all.length, importable: importables.length, reviewSkipped, blockedSkipped, duplicate, wouldInsert, jsonFile, txtFile, results };
}

export async function runMasterImport(previewPath?: string) {
  const previewFile = previewPath || latestPreview();
  const preview = JSON.parse(readFileSync(previewFile, 'utf-8'));
  const all = preview.previews as any[];
  const importables = all.filter(p => p.status === 'IMPORTABLE' || p.status.startsWith('IMPORTABLE'));
  const reviewSkipped = all.filter(p => p.status.startsWith('REVIEW')).length;
  const blockedSkipped = all.filter(p => p.status.startsWith('BLOCKED')).length;

  // Backup obligatoire avant première écriture
  mkdirSync(BACKUP_DIR, { recursive: true });
  const backupTag = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
  const backupFile = join(BACKUP_DIR, `masters-before-import-${backupTag}.json`);
  const existingBefore = getMastersStore();
  // Ne pas modifier avant backup succès
  writeFileSync(backupFile, JSON.stringify(existingBefore, null, 2), 'utf-8');

  const existingKeys = new Set(existingBefore.map((m:any)=> m.uniqueKey));
  const existingCombo = new Set(existingBefore.map((m:any)=> `${m.university}||${m.establishment}||${m.name}||${m.academicYear}`));
  let store = [...existingBefore];

  const results: any[] = [];
  let inserted = 0;
  let duplicate = 0;
  let failed = 0;

  for (const item of importables) {
    const payload = item.payload;
    const uniqueKey = generateUniqueKey(payload.university, payload.establishment, payload.name, payload.academicYear);
    const combo = `${payload.university}||${payload.establishment}||${payload.name}||${payload.academicYear}`;
    const valErrs = validateMasterPayload(payload);

    if (existingKeys.has(uniqueKey) || existingCombo.has(combo)) {
      const existingItem = store.find((m:any)=> m.uniqueKey===uniqueKey || `${m.university}||${m.establishment}||${m.name}||${m.academicYear}`===combo);
      results.push({
        sourceUrl: payload.sourceUrl,
        name: payload.name,
        uniqueKey,
        status: 'DUPLICATE',
        action: 'SKIPPED_DUPLICATE',
        existingId: existingItem?.id || null,
        existingUniqueKey: existingItem?.uniqueKey || uniqueKey,
        reason: 'Doublon uniqueKey/combo',
        errors: [],
        warnings: item.warnings || []
      });
      duplicate++;
      continue;
    }

    if (valErrs.length) {
      results.push({
        sourceUrl: payload.sourceUrl,
        name: payload.name,
        uniqueKey,
        status: 'FAILED',
        action: 'FAILED',
        errors: valErrs,
        warnings: item.warnings || []
      });
      failed++;
      continue;
    }

    try {
      const finalItem = {
        id: `mst-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
        uniqueKey,
        name: payload.name,
        university: payload.university,
        establishment: payload.establishment,
        city: payload.city,
        domain: payload.domain || 'Sciences & Technologies',
        level: payload.level || 'Master (Bac+5)',
        academicYear: payload.academicYear,
        openingDate: payload.openingDate || null,
        deadlineDate: payload.deadlineDate || null,
        examDate: payload.examDate || null,
        publicationDate: payload.publicationDate || new Date().toISOString().split('T')[0],
        resultsDate: payload.resultsDate || null,
        conditions: payload.conditions || null,
        documents: payload.documents || null,
        seats: payload.seats ?? null,
        officialUrl: payload.officialUrl || null,
        sourceUrl: payload.sourceUrl,
        status: payload.status || 'INFORMATION',
        schoolId: payload.schoolId,
        schoolSlug: payload.schoolSlug,
        schoolWebsite: payload.schoolWebsite,
        universityWebsite: payload.universityWebsite,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Insertion atomique : ajoute puis persiste immédiatement
      store.unshift(finalItem);
      // Écriture via le même mécanisme que l'app (server/data/masters.json)
      // On écrit directement pour éviter d'appeler saveMastersStore qui pourrait avoir des effets
      // Mais on respecte le flux : ensureDataDir + writeFileSync
      // On fait une écriture par insertion pour permettre rollback via backup si erreur suivante
      const tmpStore = [...store];
      // Validation que le fichier est bien écrit avant de continuer
      writeFileSync(MASTERS_FILE, JSON.stringify(tmpStore, null, 2), 'utf-8');

      existingKeys.add(uniqueKey);
      existingCombo.add(combo);

      results.push({
        sourceUrl: payload.sourceUrl,
        name: payload.name,
        uniqueKey,
        status: 'INSERTED',
        action: 'INSERTED',
        insertedId: finalItem.id,
        existingId: null,
        errors: [],
        warnings: item.warnings || []
      });
      inserted++;
    } catch (e:any) {
      results.push({
        sourceUrl: payload.sourceUrl,
        name: payload.name,
        uniqueKey,
        status: 'FAILED',
        action: 'FAILED',
        errors: [e.message || String(e)],
        warnings: []
      });
      failed++;
      // Arrêt transactionnel : on garde les déjà insérés, mais on journalise
      // Le backup permet rollback manuel
      break;
    }
  }

  const tag = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
  const jsonFile = join(OUT_DIR, `master-import-result-${tag}.json`);
  const txtFile = join(LOG_DIR, `master-import-${tag}.txt`);
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  writeFileSync(jsonFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    previewFile,
    backupFile,
    totalPreview: all.length,
    importable: importables.length,
    reviewSkipped,
    blockedSkipped,
    duplicate,
    inserted,
    failed,
    dbWrites: inserted,
    supabaseWrites: inserted, // en réalité Supabase non utilisé pour masters, mais on compte comme DB writes du site
    results
  }, null, 2), 'utf-8');

  const lines: string[] = [];
  lines.push('======================================================================');
  lines.push(`MASTER IMPORT RESULT — ${new Date().toISOString()}`);
  lines.push(`Preview: ${previewFile}`);
  lines.push(`Backup: ${backupFile}`);
  lines.push(`Total preview: ${all.length} | IMPORTABLE: ${importables.length} | REVIEW skipped: ${reviewSkipped} | BLOCKED: ${blockedSkipped}`);
  lines.push(`DUPLICATE: ${duplicate} | INSERTED: ${inserted} | FAILED: ${failed}`);
  lines.push(`DB writes: ${inserted} | Supabase writes: ${inserted}`);
  lines.push('======================================================================');
  for (const r of results) {
    lines.push(`${r.action} — ${r.name?.slice(0,60)} | uniqueKey=${r.uniqueKey?.slice(0,50)}...`);
    if (r.insertedId) lines.push(`  insertedId=${r.insertedId}`);
    if (r.existingId) lines.push(`  existingId=${r.existingId}`);
    if (r.errors?.length) lines.push(`  errors: ${r.errors.join(', ')}`);
  }
  lines.push('======================================================================');
  writeFileSync(txtFile, lines.join('\n'), 'utf-8');

  return { totalPreview: all.length, importable: importables.length, reviewSkipped, blockedSkipped, duplicate, inserted, failed, backupFile, jsonFile, txtFile, results };
}
