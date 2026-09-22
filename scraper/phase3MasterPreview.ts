// Phase 3 — Master Import Preview (read-only)
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScrapedItem } from './lib/types';
import { mapToMaster } from './mappers/masterMapper.ts';
import { REAL_SCHOOLS } from '../src/data/institutionsData.ts';
import { SEED_MASTERS_FALLBACK } from '../src/lib/mastersSeed.ts';

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

export async function runPhase3MasterPreview(jsonPath?: string) {
  const srcPath = jsonPath || latestJson(OUT_DIR);
  const items = JSON.parse(readFileSync(srcPath, 'utf-8')) as ScrapedItem[];

  // Load corrections Phase 2D (14 justified)
  let corrections: any[] = [];
  try {
    const corrFiles = readdirSync(OUT_DIR).filter(f=> f.startsWith('phase2d-corrections-'));
    if (corrFiles.length) {
      const latestCorr = corrFiles.sort().pop()!;
      corrections = JSON.parse(readFileSync(join(OUT_DIR, latestCorr), 'utf-8')).corrections || [];
    }
  } catch {}

  const existingKeys = new Set(SEED_MASTERS_FALLBACK.map(m=> m.uniqueKey));
  const previewKeys = new Map<string, number>();

  const previews: any[] = [];
  let counts = { IMPORTABLE:0, REVIEW:0, BLOCKED:0, DUPLICATE:0 };

  for (const item of items) {
    const base = mapToMaster(item);
    // Clone to allow Phase 3 overrides
    let payload: any = { ...base.payload };
    let fields: any = JSON.parse(JSON.stringify(base.fields));
    let warnings: string[] = [...base.warnings];
    let errors: string[] = [...base.errors];
    const evidence: string[] = [];

    // 1. Apply city corrections (14 justifiées)
    const corr = corrections.find(c=> c.fingerprint===item.fingerprint && c.field==='city');
    if (corr && corr.suggested && normalize(corr.suggested) !== normalize(String(payload.city||''))) {
      evidence.push(`city correction Phase2D: ${payload.city} → ${corr.suggested} | ${corr.evidence}`);
      payload.city = corr.suggested;
      fields.city = { targetField: 'city', value: corr.suggested, status: 'AUTO', sourceField: 'city', reason: `Phase2D correction justifiée: ${corr.evidence}`, referenceId: corr.suggested, evidence: corr.evidence };
    }

    // 2. Establishment FLSH vs FS : si titre contient FLSH mais establishment est FS, -> REVIEW null
    const titleNorm = normalize(item.title);
    const estVal = String(payload.establishment||'');
    const estNorm = normalize(estVal);
    if (titleNorm.includes('flsh') && estVal && !estNorm.includes('flsh') && (estNorm.includes(' fs ') || estNorm.startsWith('fs ') || estNorm.includes('faculte des sciences'))) {
      // Vérifie que FLSH Ben M'Sik existerait mais n'a pas été matché
      evidence.push(`establishment mismatch: title FLSH vs establishment FS (${estVal})`);
      fields.establishment = { targetField: 'establishment', value: null, status: 'REVIEW', sourceField: 'establishment', reason: 'FS ≠ FLSH (Sciences ≠ Lettres) — titre FLSH mais établissement FS', evidence: `title="${item.title.slice(0,60)}" establishment="${estVal}"` };
      payload.establishment = null;
      warnings.push('establishment REVIEW: FS vs FLSH mismatch');
    }

    // 3. University depuis établissement fiable (si university MISSING et school AUTO)
    if ((!payload.university || fields.university?.status==='MISSING') && fields.establishment?.status==='AUTO' && fields.establishment.referenceId) {
      const school = (REAL_SCHOOLS as any[]).find(s=> s.id===fields.establishment.referenceId);
      if (school?.universityId) {
        // Trouver université correspondante
        const uniName = (() => {
          // Cherche dans SEED ou REAL_UNIVERSITIES via id
          // On utilise le label déjà résolu si possible
          // Pour simplifier, on prend le school.universityId et on le mappe via un lookup rapide
          // On ne peut pas facilement récupérer le nom sans importer REAL_UNIVERSITIES, mais on peut utiliser l'id
          return null;
        })();
        // On ne remplit pas automatiquement sans preuve explicite université dans source — on laisse REVIEW mais on ajoute evidence
        evidence.push(`university manquante mais établissement ${school.id} lié à ${school.universityId} — relation existante non utilisée sans preuve source`);
      }
    }

    // 4. Domain/Level/Year : déjà via resolver, pas d'invention

    // 5. Détermination status
    let status: 'IMPORTABLE'|'REVIEW'|'BLOCKED' = 'IMPORTABLE';
    let duplicate = false;

    // Vérifie champs obligatoires Master : name, establishment, university, city, academicYear, sourceUrl
    const critical = ['name','establishment','university','city','academicYear','sourceUrl'];
    const hasReviewCritical = critical.some(k=> fields[k]?.status==='REVIEW' || fields[k]?.status==='MISSING');
    const hasBlockedCritical = critical.some(k=> fields[k]?.status==='BLOCKED');
    if (hasBlockedCritical || !payload.name || !payload.city || !payload.academicYear) {
      status = 'BLOCKED';
    } else if (hasReviewCritical) {
      status = 'REVIEW';
    }

    // 6. Duplicates via uniqueKey
    const uniqueKey = `${normalize(String(payload.university||''))}-${normalize(String(payload.establishment||''))}-${normalize(String(payload.name||''))}-${String(payload.academicYear||'')}`.slice(0,120);
    if (existingKeys.has(uniqueKey)) {
      duplicate = true;
      warnings.push(`DUPLICATE existing uniqueKey=${uniqueKey.slice(0,40)}`);
      if (status==='IMPORTABLE') status='REVIEW'; // duplicate → REVIEW pas BLOCKED
    }
    if (previewKeys.has(uniqueKey)) {
      duplicate = true;
      warnings.push(`DUPLICATE preview duplicate`);
      if (status==='IMPORTABLE') status='REVIEW';
    }
    previewKeys.set(uniqueKey, 1);

    // Competition interdit — on documente mais on ne propose pas
    // Master uniquement

    counts[status]++;
    if (duplicate) counts.DUPLICATE++;

    previews.push({
      source: { title: item.title, fingerprint: item.fingerprint, sourceUrl: item.sourceUrl, city: item.city, establishment: item.establishment, university: item.university },
      entityType: 'MASTER',
      status: duplicate ? `${status} (DUPLICATE)` : status,
      payload,
      fields,
      references: {
        university: fields.university?.referenceId || null,
        school: fields.establishment?.referenceId || null,
        city: fields.city?.referenceId || null,
      },
      warnings,
      errors,
      evidence,
      duplicate
    });
  }

  const tag = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
  const jsonFile = join(OUT_DIR, `master-import-preview-${tag}.json`);
  const txtFile = join(LOG_DIR, `master-import-preview-${tag}.txt`);
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  writeFileSync(jsonFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    sourceFile: srcPath,
    total: items.length,
    counts,
    note: 'MASTER preview only — COMPETITION/EXAM/DOCUMENT/COURSE/SCHOOL/UNIVERSITY/MINISTRY interdits. NO DB WRITE',
    previews
  }, null, 2), 'utf-8');

  const lines: string[] = [];
  lines.push('======================================================================');
  lines.push(`MASTER IMPORT PREVIEW — ${new Date().toISOString()}`);
  lines.push(`Source : ${srcPath}`);
  lines.push(`Total: ${items.length} | IMPORTABLE: ${counts.IMPORTABLE} | REVIEW: ${counts.REVIEW} | BLOCKED: ${counts.BLOCKED} | DUPLICATE: ${counts.DUPLICATE}`);
  lines.push('======================================================================');
  lines.push('');
  lines.push('MASTER payloads validés (exemples IMPORTABLE):');
  const importables = previews.filter(p=> p.status.startsWith('IMPORTABLE')).slice(0,3);
  for (const p of importables) {
    lines.push(`- ${p.source.title.slice(0,60)} | payload.name=${JSON.stringify(p.payload.name)} city=${p.payload.city} university=${p.payload.university||'—'} establishment=${p.payload.establishment||'—'}`);
  }
  lines.push('');
  lines.push('REVIEW (20 premiers):');
  const reviews = previews.filter(p=> p.status.startsWith('REVIEW')).slice(0,20);
  for (let i=0;i<reviews.length;i++) {
    const r = reviews[i];
    lines.push(`${i+1}. ${r.source.title.slice(0,60)} — ${r.status}`);
    lines.push(`   establishment: ${r.fields.establishment?.status} ${JSON.stringify(r.fields.establishment?.value)?.slice(0,60)} reason=${r.fields.establishment?.reason||''}`);
    lines.push(`   university: ${r.fields.university?.status} ${JSON.stringify(r.fields.university?.value)?.slice(0,60)}`);
    lines.push(`   city: ${r.fields.city?.status} ${r.fields.city?.value}`);
  }
  lines.push('');
  lines.push('======================================================================');
  lines.push('CONFIRMATION');
  lines.push('DB writes = 0');
  lines.push('Supabase writes = 0');
  lines.push('localStorage writes = 0');
  lines.push('MASTER preview only — COMPETITION interdits');
  lines.push('NO DATABASE WRITE');
  lines.push('======================================================================');
  writeFileSync(txtFile, lines.join('\n'), 'utf-8');

  return { total: items.length, counts, jsonFile, txtFile };
}
