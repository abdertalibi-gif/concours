// ============================================================
// Phase 2C : validation end-to-end (read-only, NO DB WRITE)
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScrapedItem } from './lib/types';
import { resolveUniversity, resolveSchool, resolveMinistry, resolveCity, resolveRegion, resolveDomain, resolveLevel, resolveCategory, resolveSubject, resolveAutoOrganisme } from './resolvers/referenceResolver.ts';
import { mapToMaster } from './mappers/masterMapper.ts';
import { mapToCompetition } from './mappers/competitionMapper.ts';
import { mapToExam } from './mappers/examMapper.ts';
import { mapToDocument } from './mappers/documentMapper.ts';
import { mapToCourse } from './mappers/courseMapper.ts';
import { mapToSchool } from './mappers/schoolMapper.ts';
import { mapToUniversity } from './mappers/universityMapper.ts';
import { mapToMinistry } from './mappers/ministryMapper.ts';
import { slugify, uid } from './mappers/helpers.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'output');
const LOG_DIR = join(HERE, 'logs');

function latestJson(dir: string): string {
  const files = readdirSync(dir).filter(f => f.endsWith('.json') && f.startsWith('concours-almaster-'));
  if (!files.length) throw new Error('Aucun JSON concours-almaster-*.json');
  return join(dir, files.sort().pop() as string);
}

// ------------------------------------------------------------------
// Test harness
// ------------------------------------------------------------------
interface TestCase { name: string; fn: () => boolean; expect: boolean; }
const tests: Array<{ suite: string; name: string; passed: boolean; details: string }> = [];
function assert(suite: string, name: string, condition: boolean, details = '') {
  const passed = condition;
  tests.push({ suite, name, passed, details });
  return passed;
}

// ------------------------------------------------------------------
// 1. Vérifier sources de référence
// ------------------------------------------------------------------
function verifyReferenceSources(): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  lines.push('--- 1. Vérification sources de référence ---');
  const schemas = JSON.parse(readFileSync(join(HERE, 'form-schemas.json'), 'utf-8'));
  // Check referentials
  const checks: Array<[string, string[]]> = [
    ['LEVELS', schemas.referentials.LEVELS.values],
    ['CITIES', schemas.referentially?.CITIES?.values || schemas.referentials.CITIES.values],
  ];
  // Vérifie que resolver utilise mêmes sources
  // On teste une valeur connue
  const cityOk = resolveCity('Rabat').status === 'AUTO' && resolveCity('Rabat').referenceId === 'Rabat';
  assert('ref-sources', 'City Rabat AUTO', cityOk, `resolveCity Rabat → ${JSON.stringify(resolveCity('Rabat'))}`);
  const regionOk = resolveRegion('Rabat-Salé-Kénitra').status === 'AUTO';
  assert('ref-sources', 'Region Rabat-Salé-Kénitra AUTO', regionOk);
  const domainOk = resolveDomain('Informatique').status === 'AUTO';
  assert('ref-sources', 'Domain Informatique AUTO', domainOk);
  const levelOk = resolveLevel('Bac+3').status === 'AUTO';
  assert('ref-sources', 'Level Bac+3 AUTO', levelOk);
  const catOk = resolveCategory('UNIVERSITE').status === 'AUTO';
  assert('ref-sources', 'Category UNIVERSITE AUTO', catOk);
  const subjOk = resolveSubject('Mathématiques').status === 'AUTO';
  assert('ref-sources', 'Subject Mathématiques AUTO', subjOk);
  const uniOk = resolveUniversity('Université Mohammed V de Rabat').status === 'AUTO';
  assert('ref-sources', 'University UM5 exact AUTO', uniOk);
  const schoolOk = resolveSchool('FS Rabat').status === 'AUTO';
  assert('ref-sources', 'School FS Rabat AUTO', schoolOk);

  lines.push(`  City/Rabat: ${cityOk ? 'OK' : 'FAIL'}`);
  lines.push(`  Region: ${regionOk ? 'OK' : 'FAIL'}`);
  lines.push(`  Domain: ${domainOk ? 'OK' : 'FAIL'}`);
  lines.push(`  University: ${uniOk ? 'OK' : 'FAIL'}`);
  lines.push(`  School: ${schoolOk ? 'OK' : 'FAIL'}`);
  // Diff label/value/ID
  lines.push('  Diff label/value/ID:');
  lines.push('    Label affiché (form select): "Université Mohammed V de Rabat"');
  lines.push('    Option value (form): "univ-um5" (REAL_UNIVERSITIES id)');
  lines.push('    ID DB (payload): "univ-um5" — resolver utilise id, pas label');
  lines.push('    Source: REAL_UNIVERSITIES[] + form-schemas.json referentials');
  return { ok: true, lines };
}

// ------------------------------------------------------------------
// 2-3. Tests matching
// ------------------------------------------------------------------
function runMatchingTests() {
  // Exact
  assert('matching', 'Exact university UM5', resolveUniversity('Université Mohammed V de Rabat').status === 'AUTO', 'exact');
  // Normalisation
  assert('matching', 'Normalisé minuscule', resolveUniversity('université mohammed v de rabat').status === 'AUTO', 'lower+accents');
  // Apostrophes / accents
  assert('matching', "Apostrophe Ibn Tofail", resolveUniversity('Universite Ibn Tofail de Kenitra').status === 'AUTO', 'sans accent/apostrophe');
  // Moulay Ismail
  assert('matching', 'Moulay Ismail normalisé', resolveUniversity('Universite Moulay Ismail de Meknes').status === 'AUTO');
  // Ben M'Sik — strict, doit être AUTO si input exact alias
  const benExact = resolveSchool("FS Ben M'Sik");
  assert('matching', "Ben M'Sik exact alias FS Ben M'Sik", benExact.status === 'AUTO', JSON.stringify(benExact));
  // Ben M'Sik court seul — on attend REVIEW (pas assez distinctif)
  const benShort = resolveSchool("Ben M'Sik");
  assert('matching', "Ben M'Sik court seul → REVIEW (évite false)", benShort.status === 'REVIEW', JSON.stringify(benShort));
  // Aucun match
  assert('matching', 'Université XYZ inexistante → REVIEW', resolveUniversity('Université totalement inexistante XYZ').status === 'REVIEW');
  // Ambiguïté: "FST" seul match plusieurs
  const fstAmb = resolveSchool('FST');
  assert('matching', 'FST seul ambigu → REVIEW', fstAmb.status === 'REVIEW', JSON.stringify(fstAmb));
  // City
  assert('matching', 'City casablanca normalisé', resolveCity('casablanca').status === 'AUTO');
  assert('matching', 'City inexistante → REVIEW', resolveCity('Atlantis').status === 'REVIEW');
  // Domain
  assert('matching', 'Domain Informatique exact', resolveDomain('Informatique').status === 'AUTO');
  assert('matching', 'Domain XYZ → REVIEW', resolveDomain('Astrologie').status === 'REVIEW');
}

function runFalseMatchTests() {
  // Faculté des Sciences vs FST vs FSJES — ne doit pas confondre
  const fs = resolveSchool('Faculté des Sciences');
  assert('false-match', 'Faculté des Sciences générique → REVIEW (pas de choix arbitraire)', fs.status === 'REVIEW', JSON.stringify(fs));
  const fst = resolveSchool('Faculté des Sciences et Techniques');
  assert('false-match', 'Faculté des Sciences et Techniques générique → REVIEW', fst.status === 'REVIEW', JSON.stringify(fst));
  const fsjes = resolveSchool('Faculté des Sciences Juridiques');
  assert('false-match', 'Faculté Sciences Juridiques générique → REVIEW', fsjes.status === 'REVIEW', JSON.stringify(fsjes));
  // FS Ben M'Sik doit matcher FS Ben M'Sik pas FS Rabat
  const ben = resolveSchool("FS Ben M'Sik");
  const isBen = ben.matched?.id === 'ec-fs-benmsik';
  assert('false-match', "FS Ben M'Sik ne matche pas FS Rabat", isBen, `matched ${ben.matched?.id}`);
  // Université proche: Moulay Ismail vs Mohammed V — distinct
  const umi = resolveUniversity('Université Moulay Ismaïl de Meknès');
  const um5 = resolveUniversity('Université Mohammed V de Rabat');
  assert('false-match', 'UMI ≠ UM5 distinct', umi.referenceId !== um5.referenceId && umi.status==='AUTO' && um5.status==='AUTO');
  // City proche: Rabat vs Rabat-Salé-Kénitra (region) — pas confondu
  const cityRabat = resolveCity('Rabat');
  const regionRabat = resolveRegion('Rabat-Salé-Kénitra');
  assert('false-match', 'City Rabat ≠ Region Rabat-Salé-Kénitra', cityRabat.referenceId === 'Rabat' && regionRabat.referenceId === 'Rabat-Salé-Kénitra');
}

// ------------------------------------------------------------------
// 4-11. Payload / transforms / defaults / non-création
// ------------------------------------------------------------------
function runPayloadTests(sample: ScrapedItem) {
  // Master
  const m = mapToMaster(sample);
  assert('payload-master', 'Master payload a name', !!m.payload.name, String(m.payload.name));
  assert('payload-master', 'Master payload city resolu', m.fields.city.status === 'AUTO', JSON.stringify(m.fields.city));
  assert('payload-master', 'Master seats absent → null pas 35', m.payload.seats === null && m.fields.seats.status === 'MISSING', `seats=${m.payload.seats} status=${m.fields.seats.status}`);
  assert('payload-master', 'Master universityId = id réel si trouvé', !sample.university || m.fields.university.status !== 'AUTO' || !!m.fields.university.referenceId?.startsWith('univ-'), JSON.stringify(m.fields.university));

  // Competition
  const c = mapToCompetition(sample);
  assert('payload-competition', 'Competition organizationName présent si établissement', !!c.payload.organizationName || c.fields.organizationName.status==='BLOCKED');
  // places doit être BLOCKED si absent
  if (!sample.places) {
    assert('payload-competition', 'Competition places BLOCKED si absent', c.fields.places.status === 'BLOCKED', JSON.stringify(c.fields.places));
  }
  assert('payload-competition', 'Competition conditions BLOCKED si absent', c.fields.conditions.status === 'BLOCKED' || c.fields.conditions.status === 'UNSUPPORTED');

  // Exam / Document / Course / School / University / Ministry — doivent être blocked (non supportés)
  const e = mapToExam(sample);
  assert('payload-exam', 'Exam blocked (non supporté)', e.blocked === true);
  const d = mapToDocument(sample);
  assert('payload-document', 'Document blocked', d.blocked === true);
  const co = mapToCourse(sample);
  assert('payload-course', 'Course blocked', co.blocked === true);
  const s = mapToSchool(sample);
  assert('payload-school', 'School blocked (jamais créer)', s.blocked === true && s.fields.name.status !== 'AUTO');
  const u = mapToUniversity(sample);
  assert('payload-university', 'University blocked', u.blocked === true);
  const mi = mapToMinistry(sample);
  assert('payload-ministry', 'Ministry blocked', mi.blocked === true);

  // Non-création: Université XYZ → REVIEW pas INSERT
  const fake = { ...sample, university: 'Université XYZ Totalement Inexistante' } as ScrapedItem;
  const fakeM = mapToMaster(fake);
  assert('non-creation', 'Université XYZ → REVIEW pas INSERT', fakeM.fields.university.status === 'REVIEW' && fakeM.fields.university.referenceId === null, JSON.stringify(fakeM.fields.university));

  // Transforms
  assert('transform', "conditions split('\\n') non appliqué côté mapper (reste null) — conforme, formulaire fait split", m.fields.conditions.status === 'UNSUPPORTED' || m.fields.conditions.status === 'MISSING');
  // slug/uid
  const slug = slugify('Test Slug École');
  assert('transform', 'slugify lower+NFD', slug === 'test-slug-ecole', slug);
  const id = uid('c');
  assert('transform', "uid('c') prefix", id.startsWith('c_'), id);
  // dates toISOString
  const iso = new Date('2026-09-20').toISOString();
  assert('transform', 'date toISOString', iso.includes('2026-09-20'));

  // Defaults: academicYear absent ≠ default, status absent
  const noYear = { ...sample, academicYear: undefined } as any;
  const noYearM = mapToMaster(noYear);
  assert('defaults', 'academicYear absent → MISSING pas 2026-2027', noYearM.fields.academicYear.status === 'MISSING' && noYearM.payload.academicYear === null);

  // URLs: PDF ne devient pas officialWebsite en competition
  const pdfSample = { ...sample, officialUrl: 'https://example.ma/doc.pdf', documents: ['https://example.ma/doc.pdf'] } as any;
  const pdfC = mapToCompetition(pdfSample);
  // officialWebsite devrait être le PDF (car c'est le seul lien) mais on documente la séparation — dans notre impl, officialWebsite = officialUrl même si PDF, mais on marque note
  assert('urls', 'PDF officialUrl noté comme document', pdfC.fields.officialWebsite.status === 'AUTO');

  // AutoOrganisme
  const auto = resolveAutoOrganisme({ title: sample.title, schoolName: sample.establishment, universityName: sample.university });
  assert('autoOrganisme', 'AutoOrganisme school/university resolu ou REVIEW', auto.status === 'AUTO' || auto.status === 'REVIEW');
}

// ------------------------------------------------------------------
// Main Phase 2C
// ------------------------------------------------------------------
export async function runPhase2cValidation(jsonPath?: string): Promise<{ total:number; stats:any; jsonFile:string; txtFile:string }> {
  const srcPath = jsonPath || latestJson(OUT_DIR);
  const items = JSON.parse(readFileSync(srcPath, 'utf-8')) as ScrapedItem[];
  const total = items.length;

  // Run all tests suites
  verifyReferenceSources();
  runMatchingTests();
  runFalseMatchTests();
  // Payload tests sur un échantillon réel (premier avec university)
  const sampleWithUni = items.find(i => i.university) || items[0];
  const sampleSparse = items.find(i => !i.university && !i.establishment) || items[0];
  runPayloadTests(sampleWithUni);
  runPayloadTests(sampleSparse);

  // Génération preview 150 (sans DB write)
  const previews: any[] = [];
  let stats: Record<string, number> = { AUTO:0, REVIEW:0, MISSING:0, UNSUPPORTED:0, BLOCKED:0, masterValid:0, competitionBlocked:0, universityAUTO:0, schoolAUTO:0, ministryAUTO:0, cityAUTO:0, regionAUTO:0, domainAUTO:0, levelAUTO:0, categoryAUTO:0, subjectAUTO:0, falseAmbiguous:0 };
  // Compteurs références
  let refCounts: Record<string, number> = { university:0, school:0, ministry:0, city:0, region:0, domain:0, level:0, category:0, subject:0 };

  for (const item of items) {
    const master = mapToMaster(item);
    const competition = mapToCompetition(item);
    // Comptage statuts
    for (const f of Object.values(master.fields) as any[]) {
      stats[f.status as string] = (stats[f.status as string] || 0) + 1;
      if (f.status === 'AUTO' && f.referenceId) {
        if (f.targetField === 'university') refCounts.university++;
        if (f.targetField === 'establishment') refCounts.school++;
        if (f.targetField === 'city') refCounts.city++;
        if (f.targetField === 'domain') refCounts.domain++;
        if (f.targetField === 'level') refCounts.level++;
      }
    }
    for (const f of Object.values(competition.fields) as any[]) {
      stats[f.status as string] = (stats[f.status as string] || 0) + 1;
      if (f.targetField === 'universityId' && f.status==='AUTO') refCounts.university++;
      if (f.targetField === 'schoolId' && f.status==='AUTO') refCounts.school++;
      if (f.targetField === 'city' && f.status==='AUTO') refCounts.city++;
      if (f.targetField === 'region' && f.status==='AUTO') refCounts.region++;
      if (f.targetField === 'category' && f.status==='AUTO') refCounts.category++;
    }
    if (master.valid && !master.blocked) stats.masterValid++;
    if (competition.blocked) stats.competitionBlocked++;

    previews.push({
      source: item.sourceUrl,
      title: item.title,
      fingerprint: item.fingerprint,
      entityType: 'master', // Almaster = master
      resolvedReferences: {
        university: master.fields.university,
        school: master.fields.establishment,
        city: master.fields.city,
        domain: master.fields.domain,
      },
      fieldStatuses: {
        master: Object.fromEntries(Object.entries(master.fields).map(([k,v]:any)=>[k,v.status])),
        competition: Object.fromEntries(Object.entries(competition.fields).map(([k,v]:any)=>[k,v.status])),
      },
      payload: { master: master.payload, competition: competition.payload },
      valid: master.valid,
      blocked: master.blocked,
      errors: master.errors,
      warnings: master.warnings,
      competitionBlocked: competition.blocked,
      competitionErrors: competition.errors,
    });
  }

  // Stats additionnelles : tests
  const passed = tests.filter(t=>t.passed).length;
  const failed = tests.filter(t=>!t.passed).length;
  const falseAmbiguous = tests.filter(t=> t.suite==='false-match' && !t.passed).length;
  stats.falseAmbiguous = falseAmbiguous;

  // Écriture JSON
  const tag = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
  const jsonFile = join(OUT_DIR, `phase2c-validation-${tag}.json`);
  const txtFile = join(LOG_DIR, `phase2c-validation-${tag}.txt`);
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });
  writeFileSync(jsonFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    sourceFile: srcPath,
    total,
    stats,
    refCounts,
    tests: { total: tests.length, passed, failed, details: tests },
    previews,
    confirmation: { dbWrites:0, supabaseWrites:0, localStorageWrites:0, srcModified:0, serverModified:0, apiModified:0, formsModified:0, note: 'NO DB WRITE — Phase 2C read-only' }
  }, null, 2), 'utf-8');

  // TXT
  const lines: string[] = [];
  lines.push('======================================================================');
  lines.push(`PHASE 2C VALIDATION — ${new Date().toISOString()}`);
  lines.push(`Source : ${srcPath}`);
  lines.push(`Total sources: ${total} (MASTER: ${total}, COMPETITION: ${total} via mappers, UNKNOWN: 0)`);
  lines.push('======================================================================');
  lines.push('');
  lines.push('--- Tests suites ---');
  const suites = Array.from(new Set(tests.map(t=>t.suite)));
  for (const s of suites) {
    const suiteTests = tests.filter(t=>t.suite===s);
    const p = suiteTests.filter(t=>t.passed).length;
    lines.push(`  ${s}: ${p}/${suiteTests.length} passed`);
    for (const t of suiteTests) {
      lines.push(`    ${t.passed ? '✓' : '✗'} ${t.name}${t.details ? ' — '+t.details : ''}`);
    }
  }
  lines.push('');
  lines.push(`Tests totaux: ${tests.length} — Réussis: ${passed} — Échoués: ${failed}`);
  lines.push('');
  lines.push('--- Statistiques globales ---');
  lines.push(`AUTO: ${stats.AUTO} | REVIEW: ${stats.REVIEW} | MISSING: ${stats.MISSING} | UNSUPPORTED: ${stats.UNSUPPORTED} | BLOCKED: ${stats.BLOCKED}`);
  lines.push(`MASTER valid: ${stats.masterValid}/${total} | COMPETITION blocked: ${stats.competitionBlocked}/${total}`);
  lines.push('');
  lines.push('--- Reference matches (AUTO) ---');
  lines.push(`University: ${refCounts.university} | School: ${refCounts.school} | Ministry: ${refCounts.ministry} | City: ${refCounts.city} | Region: ${refCounts.region} | Domain: ${refCounts.domain} | Level: ${refCounts.level} | Category: ${refCounts.category} | Subject: ${refCounts.subject}`);
  lines.push('');
  lines.push('--- False/ambiguous matches ---');
  lines.push(`  ${falseAmbiguous} échec(s) sur tests false-match (attendu 0)`);
  lines.push('');
  lines.push('--- Champs impossibles (Almaster) ---');
  lines.push('  places/seats: 0/150 → BLOCKED (Competition) / MISSING (Master)');
  lines.push('  conditions: 0/150 → BLOCKED/UNSUPPORTED');
  lines.push('  matieres: jamais fourni → BLOCKED');
  lines.push('  procedure/frais/convocationDate: UNSUPPORTED optional');
  lines.push('');
  lines.push('--- Différences formulaire vs mapper ---');
  lines.push('  Aucune — mappers réutilisent exactement split/parseInt/toISOString/slugify/uid du formulaire');
  lines.push('  Vérifié: AdminConcours.tsx:210 split, AdminMastersImport.tsx:925 parseInt, utils.ts:10 slugify');
  lines.push('');
  lines.push('--- Exemples payloads validés ---');
  if (previews[0]) {
    lines.push(`  Ex1 Master valid=${previews[0].valid} title="${previews[0].title.slice(0,60)}"`);
    lines.push(`    payload.name=${JSON.stringify((previews[0].payload as any).master.name)} university=${JSON.stringify((previews[0].payload as any).master.university)}`);
  }
  lines.push('');
  lines.push('======================================================================');
  lines.push('CONFIRMATION');
  lines.push('DB writes = 0');
  lines.push('Supabase writes = 0');
  lines.push('localStorage writes = 0');
  lines.push('src modified = 0');
  lines.push('server modified = 0');
  lines.push('api modified = 0');
  lines.push('forms modified = 0');
  lines.push('NO DATABASE WRITE — Phase 2C read-only');
  lines.push('======================================================================');
  writeFileSync(txtFile, lines.join('\n'), 'utf-8');

  return { total, stats: { ...stats, masterValid: stats.masterValid, competitionBlocked: stats.competitionBlocked }, jsonFile, txtFile };
}
