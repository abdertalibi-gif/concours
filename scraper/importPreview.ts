// ============================================================
// Import Preview — Phase intermédiaire (aucune écriture DB/site)
// Génère scraper/output/import-preview-*.json + scraper/logs/import-preview-*.txt
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(import.meta.dirname, 'output');
const LOG_DIR = join(import.meta.dirname, 'logs');

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
function latestJson(dir: string): string {
  const files = readdirSync(dir).filter(f => f.endsWith('.json') && f.startsWith('concours-almaster-'));
  if (!files.length) throw new Error('Aucun JSON concours-almaster-*.json dans ' + dir);
  return join(dir, files.sort().pop() as string);
}
function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
}
type FieldStatus = 'AUTO' | 'REVIEW' | 'MISSING' | 'UNSUPPORTED';
interface FieldPreview {
  sourceField: string;
  destField: string;
  sourceValue: unknown;
  transformedValue: unknown;
  status: FieldStatus;
  note?: string;
}

// Description clean : supprime répétitions SEO, titres répétés, espaces
function cleanDescription(raw: string, title: string): string {
  if (!raw) return '';
  let s = raw.replace(/\s+/g, ' ').trim();
  // Coupe le bloc SEO initial (répétitions du titre sans ponctuation) : cherche "La " / "Le " / "L'" suivi d'une phrase
  const m = s.match(/(La Facult[ée]|Le Doyen|La Facult|Master en |Liste des |Important :|Note importante|Modalit)/i);
  if (m && m.index !== undefined && m.index > 80 && m.index < 800) {
    s = s.slice(m.index).trim();
  }
  // Déduplication de phrases (split par " .")
  const parts = s.split(/(?<=[.!؟])\s+/);
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const p of parts) {
    const n = p.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ').trim().slice(0, 80);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    dedup.push(p.trim());
  }
  s = dedup.join(' ').replace(/\s{2,}/g, ' ').trim();
  // Tronque à ~800 car. sans couper un mot
  if (s.length > 800) s = s.slice(0, 800).replace(/\s+\S*$/, '') + '…';
  return s;
}

function isPdfUrl(u: string): boolean {
  return /\.pdf(\?|#|$)/i.test(u);
}

// ------------------------------------------------------------------
// Classification (réutilise logique validation)
// ------------------------------------------------------------------
const FIELDS = ['title','organization','university','establishment','city','region','domain','level','academicYear','description','conditions','documents','places','openingDate','deadlineDate','examDate','resultsDate','officialUrl','registrationUrl','sourceUrl'];
function completeness(filled: Set<string>, item: Record<string, unknown>): number {
  const dates = ['openingDate','deadlineDate','examDate','resultsDate'].filter(f => filled.has(f)).length;
  const links = ['officialUrl','registrationUrl','sourceUrl','documents'].filter(f => filled.has(f)).length;
  return filled.size*2 + dates*3 + links;
}
type Cat = 'full'|'medium'|'sparse';
function classify(filled: Set<string>, item: Record<string, unknown>): Cat {
  const n = filled.size;
  if (n >= 10) return 'full';
  if (n <= 6 || (!item.establishment && !item.university && !item.deadlineDate)) return 'sparse';
  return 'medium';
}

// ------------------------------------------------------------------
// Build previews for one item
// ------------------------------------------------------------------
function buildMasterPreview(item: Record<string, unknown>) {
  const fields: FieldPreview[] = [];
  const add = (src: string, dest: string, srcVal: unknown, transVal: unknown, status: FieldStatus, note?: string) => {
    fields.push({ sourceField: src, destField: dest, sourceValue: srcVal ?? null, transformedValue: transVal ?? null, status, note });
  };

  // title -> name
  add('title', 'name', item.title, item.title, isEmpty(item.title) ? 'MISSING' : 'AUTO');
  // organization -> (non mappé MasterItem)
  add('organization', '(non mappé)', item.organization, null, 'UNSUPPORTED', 'MasterItem n’a pas organization');
  // university
  if (isEmpty(item.university)) add('university', 'university', null, null, 'MISSING', 'REQUIRES_REVIEW — university manquante (50/150)');
  else add('university', 'university', item.university, item.university, 'AUTO');
  // establishment
  if (isEmpty(item.establishment)) add('establishment', 'establishment', null, null, 'MISSING', '29/150 vides');
  else add('establishment', 'establishment', item.establishment, item.establishment, 'AUTO');
  // city / region
  add('city', 'city', item.city, item.city, isEmpty(item.city) ? 'MISSING' : 'AUTO');
  add('region', '(dérivé region)', item.region, item.region, isEmpty(item.region) ? 'MISSING' : 'AUTO', 'inferRegion(city)');
  // domain
  if (isEmpty(item.domain)) add('domain', 'domain', null, null, 'MISSING', '60/150 vides');
  else add('domain', 'domain', item.domain, item.domain, 'AUTO');
  // level
  add('level', 'level', item.level, item.level, isEmpty(item.level) ? 'MISSING' : 'AUTO');
  // academicYear
  add('academicYear', 'academicYear', item.academicYear, item.academicYear, isEmpty(item.academicYear) ? 'MISSING' : 'AUTO');
  // description -> non stocké tel quel (MasterItem n’a pas description)
  const rawDesc = String(item.description || '');
  const cleanDesc = cleanDescription(rawDesc, String(item.title || ''));
  add('description', '(non mappé → audit)', rawDesc.slice(0, 120) + (rawDesc.length>120?'…':''), cleanDesc.slice(0, 120) + (cleanDesc.length>120?'…':''), 'UNSUPPORTED', 'MasterItem n’a pas description ; conservée en audit');
  // conditions -> UNSUPPORTED (0/150)
  add('conditions', 'conditions', item.conditions ?? null, null, 'UNSUPPORTED', '0/150 — jamais structuré');
  // documents -> documents (string|null)
  if (Array.isArray(item.documents) && item.documents.length) {
    const joined = (item.documents as string[]).join(', ');
    add('documents', 'documents', item.documents, joined, 'AUTO', `${(item.documents as string[]).length} PDF`);
  } else add('documents', 'documents', null, null, 'MISSING', '98/150 sans PDF — normal');
  // places -> seats (UNSUPPORTED 0/150)
  add('places', 'seats', item.places ?? null, null, 'UNSUPPORTED', '0/150 — jamais annoncé');
  // dates
  const dateStatus = (v: unknown): FieldStatus => isEmpty(v) ? 'MISSING' : 'AUTO';
  // Note: dates ambiguës déjà filtrées par dates.ts → null = MISSING, pas REVIEW
  add('openingDate', 'openingDate', item.openingDate ?? null, item.openingDate ?? null, dateStatus(item.openingDate), isEmpty(item.openingDate) ? '123/150 vides' : 'ISO YYYY-MM-DD, plage du→au : début');
  add('deadlineDate', 'deadlineDate', item.deadlineDate ?? null, item.deadlineDate ?? null, dateStatus(item.deadlineDate), isEmpty(item.deadlineDate) ? '101/150 vides' : 'ISO, plage→fin, plausibilité vs publishedAt');
  add('examDate', 'examDate', item.examDate ?? null, item.examDate ?? null, dateStatus(item.examDate), isEmpty(item.examDate) ? '128/150 vides' : 'mot-clé concours/épreuve');
  add('resultsDate', 'resultsDate', item.resultsDate ?? null, item.resultsDate ?? null, dateStatus(item.resultsDate), isEmpty(item.resultsDate) ? '120/150 vides' : 'mot-clé résultats/affichage');
  // URLs — séparation stricte
  const off = item.officialUrl as string | undefined;
  const reg = item.registrationUrl as string | undefined;
  // officialUrl -> officialUrl (site institutionnel, pas PDF si possible mais PDF autorisé si seul lien)
  if (off) {
    const isPdf = isPdfUrl(off);
    add('officialUrl', 'officialUrl', off, off, 'AUTO', isPdf ? 'PDF — document officiel, pas site institutionnel' : 'site institutionnel .ma');
  } else add('officialUrl', 'officialUrl', null, null, 'MISSING', '27/150 sans official — légitime résultats');
  if (reg) {
    const isPdf = isPdfUrl(reg);
    add('registrationUrl', 'officialUrl (fallback)', reg, reg, 'AUTO', isPdf ? 'PDF candidature' : 'lien candidature → replié sur officialUrl MasterItem');
  } else add('registrationUrl', 'officialUrl (fallback)', null, null, 'MISSING', '72/150 sans registration');
  // sourceUrl -> sourceUrl
  add('sourceUrl', 'sourceUrl', item.sourceUrl, item.sourceUrl, isEmpty(item.sourceUrl) ? 'MISSING' : 'AUTO', 'article Almaster');
  add('category', '(non mappé)', item.category ?? null, null, 'UNSUPPORTED', 'toujours MASTER');
  add('source', '(audit)', item.source ?? null, null, 'UNSUPPORTED', 'conservé hors MasterItem');
  add('publishedAt', 'publicationDate', item.publishedAt ?? null, item.publishedAt ?? null, isEmpty(item.publishedAt) ? 'MISSING' : 'AUTO');

  // Objet MasterItem tel qu'il serait envoyé (simulation)
  const wouldBe = {
    id: `mst-preview-${String(item.fingerprint || '').slice(0, 30)}`,
    uniqueKey: `${String(item.university||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,20)}-${String(item.establishment||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,20)}-${String(item.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,30)}-${String(item.academicYear||'2026-2027')}`,
    name: item.title,
    university: item.university || null,
    establishment: item.establishment || null,
    city: item.city,
    domain: item.domain || null,
    level: item.level,
    academicYear: item.academicYear,
    openingDate: item.openingDate || null,
    deadlineDate: item.deadlineDate || null,
    examDate: item.examDate || null,
    publicationDate: item.publishedAt || null,
    resultsDate: item.resultsDate || null,
    conditions: null as string | null, // UNSUPPORTED
    documents: Array.isArray(item.documents) ? (item.documents as string[]).join(', ') : null,
    seats: null as number | null, // UNSUPPORTED
    officialUrl: (off as string) || (reg as string) || null,
    officialDocument: Array.isArray(item.documents) && item.documents.length ? item.documents[0] : null,
    sourceUrl: item.sourceUrl,
    status: (() => {
      if (item.resultsDate) return 'RESULTATS';
      if (item.deadlineDate) return 'OUVERT';
      if (item.openingDate) return 'A_VENIR';
      return 'INFORMATION';
    })(),
  };

  // Master jamais BLOCKED (tout nullable sauf name/city/academicYear/sourceUrl qui sont 100%)
  const blocked = isEmpty(item.title) || isEmpty(item.city) || isEmpty(item.academicYear) || isEmpty(item.sourceUrl);
  return { fields, wouldBe, blocked, descriptionRaw: rawDesc, descriptionClean: cleanDesc };
}

function buildCompetitionPreview(item: Record<string, unknown>) {
  const fields: FieldPreview[] = [];
  const add = (src: string, dest: string, srcVal: unknown, transVal: unknown, status: FieldStatus, note?: string) => {
    fields.push({ sourceField: src, destField: dest, sourceValue: srcVal ?? null, transformedValue: transVal ?? null, status, note });
  };

  add('title', 'title', item.title, item.title, isEmpty(item.title) ? 'MISSING' : 'AUTO');
  // organization -> organizationName
  const orgName = (item.establishment as string) || (item.university as string) || (item.organization as string) || null;
  if (!orgName) add('organization/establishment/university', 'organizationName', null, null, 'MISSING', 'REQUIRES_REVIEW — 8/150 vides, obligatoire Competition');
  else add('organization/establishment/university', 'organizationName', orgName, orgName, 'AUTO', 'préférence establishment');
  add('organization', 'organizationType', item.organization ?? null, 'INSTITUTION', 'AUTO', 'Almaster universitaire → INSTITUTION (défaut)');
  // schoolId/universityId dérivés
  add('(dérivé)', 'schoolId/universityId', null, null, isEmpty(item.establishment) && isEmpty(item.university) ? 'MISSING' : 'REVIEW', 'resolveSchoolMeta/UniversityMeta — REVIEW si univ/étab manquent');
  add('city', 'city', item.city, item.city, isEmpty(item.city) ? 'MISSING' : 'AUTO');
  add('region', 'region', item.region, item.region, isEmpty(item.region) ? 'MISSING' : 'AUTO');
  add('domain', 'domaine', item.domain ?? null, item.domain ?? null, isEmpty(item.domain) ? 'MISSING' : 'AUTO', isEmpty(item.domain) ? '60/150 vides — optional' : '');
  add('level', 'level', item.level, item.level, isEmpty(item.level) ? 'MISSING' : 'AUTO');
  const year = item.academicYear ? parseInt(String(item.academicYear).split('-')[0], 10) : null;
  add('academicYear', 'year', item.academicYear ?? null, year, isEmpty(item.academicYear) ? 'MISSING' : 'AUTO', 'parseInt YYYY-YYYY → YYYY');
  // description
  const rawDesc = String(item.description || '');
  const cleanDesc = cleanDescription(rawDesc, String(item.title || ''));
  if (isEmpty(rawDesc) || rawDesc.trim().length < 50) add('description', 'description', rawDesc.slice(0,80), cleanDesc.slice(0,80), 'REVIEW', 'REQUIRES_REVIEW — description trop courte/invalide');
  else add('description', 'description', rawDesc.slice(0,80) + '…', cleanDesc.slice(0,80) + '…', 'AUTO', '150/150 présentes, version clean proposée');
  // conditions -> UNSUPPORTED + BLOCKED
  add('conditions', 'conditions', null, null, 'UNSUPPORTED', '0/150 — obligatoire Competition → REQUIRES_REVIEW');
  // documents -> documentsDemandes
  if (Array.isArray(item.documents) && item.documents.length) add('documents', 'documentsDemandes', item.documents, item.documents, 'AUTO', `${(item.documents as string[]).length} PDF`);
  else add('documents', 'documentsDemandes', null, null, 'MISSING', 'REQUIRES_REVIEW — 98/150 vides, obligatoire');
  // places -> places UNSUPPORTED BLOCKED
  add('places', 'places', null, null, 'UNSUPPORTED', '0/150 — obligatoire → REQUIRES_REVIEW, jamais inventer 35');
  // matieres UNSUPPORTED BLOCKED
  add('(aucun)', 'matieres', null, [], 'UNSUPPORTED', 'jamais fourni — obligatoire → REQUIRES_REVIEW');
  // epreuves dérivée examDate
  if (item.examDate) add('examDate', 'epreuves', item.examDate, [`Épreuve : ${item.examDate}`], 'AUTO');
  else add('examDate', 'epreuves', null, null, 'MISSING', 'générique 3 phases si import MasterItem, mais direct → REVIEW');
  // procedure/frais/convocationDate UNSUPPORTED optional
  add('(aucun)', 'procedure', null, null, 'UNSUPPORTED', 'absent flux — optional');
  add('(aucun)', 'frais', null, null, 'UNSUPPORTED', 'absent flux — optional');
  add('(aucun)', 'convocationDate', null, null, 'UNSUPPORTED', 'absent flux — optional');
  // dates
  const ds = (v: unknown): FieldStatus => isEmpty(v) ? 'MISSING' : 'AUTO';
  add('openingDate', 'registrationStart', item.openingDate ?? null, item.openingDate ?? null, ds(item.openingDate));
  add('deadlineDate', 'registrationDeadline', item.deadlineDate ?? null, item.deadlineDate ?? null, ds(item.deadlineDate));
  add('examDate', 'competitionDate', item.examDate ?? null, item.examDate ?? null, ds(item.examDate));
  add('resultsDate', 'resultsDate', item.resultsDate ?? null, item.resultsDate ?? null, ds(item.resultsDate));
  // URLs séparation stricte
  const off = item.officialUrl as string | undefined;
  const reg = item.registrationUrl as string | undefined;
  if (off) {
    const isPdf = isPdfUrl(off);
    add('officialUrl', 'officialWebsite', off, off, 'AUTO', isPdf ? '⚠ PDF — document officiel, pas website (ne pas confondre)' : 'site .ma');
  } else add('officialUrl', 'officialWebsite', null, null, 'MISSING', 'optional');
  if (reg) {
    const isPdf = isPdfUrl(reg);
    add('registrationUrl', 'registrationUrl', reg, reg, 'AUTO', isPdf ? 'PDF candidature' : 'lien candidature');
  } else add('registrationUrl', 'registrationUrl', null, null, 'MISSING', 'optional');
  add('sourceUrl', 'sourceUrl', item.sourceUrl, item.sourceUrl, isEmpty(item.sourceUrl) ? 'MISSING' : 'AUTO', 'article Almaster');
  add('category', 'category', item.category ?? null, 'UNIVERSITE', 'AUTO', 'master → UNIVERSITE');
  add('source', '(audit)', item.source ?? null, null, 'UNSUPPORTED', 'hors Competition');
  add('publishedAt', 'publishedAt', item.publishedAt ?? null, item.publishedAt ?? null, isEmpty(item.publishedAt) ? 'MISSING' : 'AUTO');

  const wouldBe = {
    id: `c-preview-${String(item.fingerprint||'').slice(0,30)}`,
    slug: String(item.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,80) + '-' + (year || '2026'),
    title: item.title,
    organizationName: orgName,
    organizationType: 'INSTITUTION' as const,
    category: 'UNIVERSITE' as const,
    city: item.city,
    region: item.region,
    domaine: item.domain || undefined,
    level: item.level,
    year,
    places: null as number | null, // REQUIRES_REVIEW
    description: cleanDesc,
    descriptionRaw: rawDesc,
    conditions: null as string[] | null, // REQUIRES_REVIEW
    documentsDemandes: Array.isArray(item.documents) ? item.documents : null,
    matieres: [] as string[], // REQUIRES_REVIEW
    epreuves: item.examDate ? [`Épreuve : ${item.examDate}`] : null,
    registrationStart: item.openingDate || undefined,
    registrationDeadline: item.deadlineDate || undefined,
    competitionDate: item.examDate || undefined,
    resultsDate: item.resultsDate || undefined,
    officialWebsite: off && !isPdfUrl(off) ? off : null,
    officialDocument: off && isPdfUrl(off) ? off : (Array.isArray(item.documents) && item.documents.length ? item.documents[0] : null),
    registrationUrl: reg || null,
    sourceUrl: item.sourceUrl,
    publishedAt: item.publishedAt,
    verificationStatus: 'UNVERIFIED' as const,
    publishStatus: 'DRAFT' as const,
  };

  // BLOCKED si obligatoire manquant et non inventable
  const blockedReasons: string[] = [];
  if (isEmpty(item.places) && true) blockedReasons.push('places manquant (0/150, obligatoire)');
  if (isEmpty(item.conditions)) blockedReasons.push('conditions manquant (0/150, obligatoire)');
  // matieres toujours vide -> bloquant selon spec
  blockedReasons.push('matieres manquant (jamais fourni, obligatoire)');
  if (!orgName) blockedReasons.push('organizationName manquant');
  if (isEmpty(rawDesc) || rawDesc.trim().length < 50) blockedReasons.push('description invalide');
  // documentsDemandes requis
  if (!Array.isArray(item.documents) || item.documents.length === 0) blockedReasons.push('documentsDemandes manquant (98/150)');
  const blocked = blockedReasons.length > 0;

  return { fields, wouldBe, blocked, blockedReasons, descriptionRaw: rawDesc, descriptionClean: cleanDesc };
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
function main() {
  const srcPath = latestJson(OUT_DIR);
  const items = JSON.parse(readFileSync(srcPath, 'utf-8')) as Array<Record<string, unknown>>;
  console.log(`Source: ${srcPath} (${items.length} items)`);

  // Sélection 10 représentatifs — même logique que validation (3 full, 3 medium, 2 sparse, 2 multi)
  const withInfo = items.map(item => {
    const filled = new Set(FIELDS.filter(f => !isEmpty(item[f])));
    return { item, filled, label: classify(filled, item), score: completeness(filled, item) };
  });
  const samples: Array<{ item: Record<string,unknown>, labels: Set<string> }> = [];
  const usedIdx = new Set<number>();
  const addCat = (cat: Cat, n: number) => {
    const arr = withInfo.map((x,i)=>({...x,i})).filter(x=>x.label===cat).sort((a,b)=>b.score-a.score);
    for (const s of arr) {
      if (usedIdx.has(s.i)) continue;
      usedIdx.add(s.i);
      samples.push({ item: s.item, labels: new Set([cat]) });
      if (--n <= 0) break;
    }
  };
  const addMulti = (n: number) => {
    const arr = withInfo.map((x,i)=>({...x,i})).filter(x=> ['openingDate','deadlineDate','examDate','resultsDate'].filter(d=>x.filled.has(d)).length>=2).sort((a,b)=>b.score-a.score);
    for (const s of arr) {
      if (n <= 0) break;
      const ex = samples.find(y=> y.item===s.item);
      if (ex) { ex.labels.add('multi'); n--; }
      else { samples.push({ item: s.item, labels: new Set(['multi'])}); usedIdx.add(s.i); n--; }
    }
  };
  addCat('full', 3);
  addCat('medium', 3);
  addCat('sparse', 2);
  addMulti(2);
  // Complète à 10 si besoin (au cas où multi recouvre)
  if (samples.length < 10) {
    const remaining = withInfo.map((x,i)=>({...x,i})).filter(x=> !usedIdx.has(x.i)).sort((a,b)=>b.score-a.score);
    for (const r of remaining) {
      if (samples.length >= 10) break;
      samples.push({ item: r.item, labels: new Set([r.label]) });
    }
  }
  const selected = samples.slice(0, 10);
  console.log(`Sélection: ${selected.map(s=> String(s.item.title).slice(0,40) + ' ['+[...s.labels].join('/')+']').join(' | ')}`);

  const previews = selected.map(({ item, labels }, idx) => {
    const master = buildMasterPreview(item);
    const competition = buildCompetitionPreview(item);
    return {
      index: idx + 1,
      labels: [...labels],
      fingerprint: item.fingerprint,
      sourceUrl: item.sourceUrl,
      scraped: item,
      master: {
        fields: master.fields,
        wouldBe: master.wouldBe,
        blocked: master.blocked,
        blockReason: master.blocked ? 'champ obligatoire MasterItem manquant (name/city/academicYear/sourceUrl)' : null,
        descriptionRaw: master.descriptionRaw.slice(0, 600),
        descriptionClean: master.descriptionClean.slice(0, 600),
      },
      competition: {
        fields: competition.fields,
        wouldBe: competition.wouldBe,
        blocked: competition.blocked,
        blockedReasons: competition.blockedReasons,
        importStatus: competition.blocked ? 'BLOCKED_REVIEW' : 'READY_REVIEW',
        descriptionRaw: competition.descriptionRaw.slice(0, 600),
        descriptionClean: competition.descriptionClean.slice(0, 600),
      }
    };
  });

  // Stats
  function countByStatus(fields: FieldPreview[][]): Record<FieldStatus, number> {
    const c: Record<FieldStatus, number> = { AUTO:0, REVIEW:0, MISSING:0, UNSUPPORTED:0 };
    for (const arr of fields) for (const f of arr) c[f.status]++;
    return c;
  }
  const masterCounts = countByStatus(previews.map(p=> p.master.fields));
  const compCounts = countByStatus(previews.map(p=> p.competition.fields));
  const masterBlocked = previews.filter(p=> p.master.blocked).length;
  const compBlocked = previews.filter(p=> p.competition.blocked).length;

  // JSON
  const tag = new Date().toISOString().replace(/[-:T]/g,'').slice(0,14);
  const jsonFile = join(OUT_DIR, `import-preview-${tag}.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceFile: srcPath,
    total: previews.length,
    summary: {
      master: { ...masterCounts, BLOCKED: masterBlocked },
      competition: { ...compCounts, BLOCKED: compBlocked },
    },
    notes: 'Simulation uniquement — NO DATABASE WRITE, NO SITE MODIFICATION',
    items: previews,
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(jsonFile, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`JSON: ${jsonFile}`);

  // TXT
  const lines: string[] = [];
  lines.push('======================================================================');
  lines.push(`IMPORT PREVIEW — ${new Date().toISOString()}`);
  lines.push(`Source : ${srcPath}`);
  lines.push(`Total annonces : ${previews.length}`);
  lines.push('======================================================================');
  lines.push('');
  lines.push('RÉSUMÉ');
  lines.push(`MASTER       AUTO:${masterCounts.AUTO}  REVIEW:${masterCounts.REVIEW}  MISSING:${masterCounts.MISSING}  UNSUPPORTED:${masterCounts.UNSUPPORTED}  BLOCKED:${masterBlocked}`);
  lines.push(`COMPETITION  AUTO:${compCounts.AUTO}  REVIEW:${compCounts.REVIEW}  MISSING:${compCounts.MISSING}  UNSUPPORTED:${compCounts.UNSUPPORTED}  BLOCKED:${compBlocked} (BLOCKED_REVIEW)`);
  lines.push('');
  lines.push('Légende: AUTO=fiable  REVIEW=validation humaine  MISSING=absent source  UNSUPPORTED=impossible Almaster');
  lines.push('COMPETITION BLOCKED_REVIEW = obligatoire manquant (places/conditions/matieres/documents/organizationName)');
  lines.push('');

  for (const p of previews) {
    lines.push('----------------------------------------------------------------------');
    lines.push(`${p.index}. ${String(p.scraped.title).slice(0,70)} [${p.labels.join('/')}]`);
    lines.push(`   fingerprint: ${p.fingerprint}`);
    lines.push(`   sourceUrl: ${p.sourceUrl}`);
    lines.push('');
    // Master
    lines.push(`   A. MasterItem  ${p.master.blocked ? '⛔ BLOCKED' : '✓ importable (avec REVIEW)'}  wouldBe.status=${(p.master.wouldBe as any).status}`);
    for (const f of p.master.fields) {
      const sv = f.sourceValue === null ? '—' : (typeof f.sourceValue === 'string' ? (String(f.sourceValue).length>60 ? String(f.sourceValue).slice(0,60)+'…' : String(f.sourceValue)) : JSON.stringify(f.sourceValue)?.slice(0,60));
      const tv = f.transformedValue === null ? '—' : (typeof f.transformedValue === 'string' ? (String(f.transformedValue).length>60 ? String(f.transformedValue).slice(0,60)+'…' : String(f.transformedValue)) : JSON.stringify(f.transformedValue)?.slice(0,60));
      lines.push(`      ${f.status.padEnd(11)} ${f.sourceField} → ${f.destField} | src: ${sv} | dst: ${tv}${f.note ? ' — '+f.note : ''}`);
    }
    lines.push(`      wouldBe.id=${(p.master.wouldBe as any).id}  uniqueKey=${String((p.master.wouldBe as any).uniqueKey).slice(0,60)}…`);
    lines.push(`      descriptionRaw  (${(p.master.descriptionRaw as string).length} car.): ${String(p.master.descriptionRaw).slice(0,100).replace(/\s+/g,' ')}…`);
    lines.push(`      descriptionClean(${(p.master.descriptionClean as string).length} car.): ${String(p.master.descriptionClean).slice(0,100).replace(/\s+/g,' ')}…`);
    lines.push('');
    // Competition
    lines.push(`   B. Competition ${p.competition.blocked ? '⛔ BLOCKED_REVIEW' : '✓ READY_REVIEW'} ${p.competition.blocked ? '('+ (p.competition.blockedReasons as string[]).join(', ') +')' : ''}`);
    for (const f of p.competition.fields) {
      const sv = f.sourceValue === null ? '—' : (typeof f.sourceValue === 'string' ? (String(f.sourceValue).length>60 ? String(f.sourceValue).slice(0,60)+'…' : String(f.sourceValue)) : JSON.stringify(f.sourceValue)?.slice(0,60) || '—');
      const tv = f.transformedValue === null ? '—' : (typeof f.transformedValue === 'string' ? (String(f.transformedValue).length>60 ? String(f.transformedValue).slice(0,60)+'…' : String(f.transformedValue)) : JSON.stringify(f.transformedValue)?.slice(0,60) || '—');
      // Pour Competition, afficher REQUIRES_REVIEW si UNSUPPORTED obligatoire
      const flag = (f.status==='UNSUPPORTED' && ['places','conditions','matieres'].some(k=> f.destField.includes(k))) ? ' → REQUIRES_REVIEW' : '';
      lines.push(`      ${f.status.padEnd(11)} ${f.sourceField} → ${f.destField} | src: ${sv} | dst: ${tv}${f.note ? ' — '+f.note : ''}${flag}`);
    }
    lines.push(`      wouldBe.slug=${(p.competition.wouldBe as any).slug.slice(0,60)}…  year=${(p.competition.wouldBe as any).year}`);
    lines.push(`      officialWebsite: ${(p.competition.wouldBe as any).officialWebsite || '—'}  officialDocument: ${String((p.competition.wouldBe as any).officialDocument||'—').slice(0,60)}…`);
    lines.push('');
  }
  lines.push('======================================================================');
  lines.push('CONFIRMATION');
  lines.push('NO DATABASE WRITE');
  lines.push('NO SITE MODIFICATION');
  lines.push('NO FORM MODIFICATION');
  lines.push('Simulation uniquement — aucune donnée injectée dans Supabase/localStorage/server/api/src');
  lines.push('======================================================================');

  const logFile = join(LOG_DIR, `import-preview-${tag}.txt`);
  mkdirSync(LOG_DIR, { recursive: true });
  writeFileSync(logFile, lines.join('\n'), 'utf-8');
  console.log(`TXT: ${logFile}`);
  console.log('');
  console.log(`Total annonces : ${previews.length}`);
  console.log(`MASTER       AUTO:${masterCounts.AUTO} REVIEW:${masterCounts.REVIEW} MISSING:${masterCounts.MISSING} UNSUPPORTED:${masterCounts.UNSUPPORTED} BLOCKED:${masterBlocked}`);
  console.log(`COMPETITION  AUTO:${compCounts.AUTO} REVIEW:${compCounts.REVIEW} MISSING:${compCounts.MISSING} UNSUPPORTED:${compCounts.UNSUPPORTED} BLOCKED:${compBlocked}`);
  console.log('NO DATABASE WRITE / NO SITE MODIFICATION / NO FORM MODIFICATION');
}

main();
