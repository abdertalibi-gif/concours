// scraper/tests/competitionTable.test.ts — tests unitaires Phase 11 (NO DB WRITE)
import assert from 'node:assert';
import { extractCompetitionTable, buildCompetitionPreview } from '../parsers/competitionTable.ts';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok — ${name}`);
  } catch (e: any) {
    failed++;
    failures.push(`${name}: ${e.message}`);
    console.log(`  FAIL — ${name}: ${e.message}`);
  }
}

// ---------------------------------------------------------------
// 1. Tableau arabe UCA (régression Phase 10)
// ---------------------------------------------------------------
test('1. tableau arabe UCA — 29 lignes, total 33, REVIEW, sans faux positif 2026', () => {
  const uca = [
    'المملكة المغربية جامعة القاضي عياض - مراكش',
    'إعلان عن مباريات توظيف بتاريخ 11 / 10 / 2026',
    'المؤسسة',
    'عدد',
    'المناصب',
    'التخصص المطلوب\tالإطار المطلوب',
    'كلية العلوم القانونية\tوالسياسية مراكش',
    '1\tGestion des Ressources Humaines\tمتصرف من الدرجة الثانية',
    '1\tFinance\tمتصرف من الدرجة الثانية',
    'كلية الاقتصاد\tوالتدبير\tمراكش',
    '1\tFinance\tمتصرف من الدرجة الثانية',
    '1\tComptabilité et Finance\tتقني من الدرجة الثالثة',
    '3\tSecrétariat de Direction\tتقني من الدرجة الثالثة',
    'كلية العلوم\tالقانونية\tوالسياسية قلعة\tالسراغنة',
    '2\tالقانون العام\tمتصرف من الدرجة الثانية',
    '1\tDéveloppement Informatique\tتقني من الدرجة الثالثة',
    'كلية الاقتصاد\tوالتدبير\tقلعة السراغنة',
    '1\tFinance\tمتصرف من الدرجة الثانية',
    '1\tSecrétariat de Direction\tتقني من الدرجة الثالثة',
    '1\tGestion des entreprises\tتقني من الدرجة الثالثة',
    'كلية العلوم التطبيقية اسفي',
    '1\tSecrétariat de Direction\tتقني من الدرجة الثالثة',
    '1\tDéveloppement Informatique\tتقني من الدرجة الثالثة',
    '2\tSciences Economiques et Gestion\tمتصرف من الدرجة الثالثة',
    'كلية العلوم الانسانية\tوالاجتماعية\tاسفي',
    '1\tGestion des entreprises\tتقني من الدرجة الثالثة',
    '1\tSecrétariat de Direction\tتقني من الدرجة الثالثة',
    '1\tInformatique\tمتصرف من الدرجة الثالثة',
    '1\tComptabilité et Finance\tتقني من الدرجة الثالثة',
    'كلية اللغات والاداب والفنون اسفي',
    '1\tGestion des entreprises\tتقني من الدرجة الثالثة',
    '1\tSecrétariat de Direction\tتقني من الدرجة الثالثة',
    '1\tDéveloppement Informatique\tمتصرف من الدرجة الثانية',
    '1\tSciences Economiques et Gestion\tمتصرف من الدرجة الثالثة',
    'كلية العلوم القانونية والسياسية اسفي',
    '1\tGestion des entreprises\tتقني من الدرجة الثالثة',
    '1\tSecrétariat de Direction\tتقني من الدرجة الثالثة',
    '1\tInformatique\tمتصرف من الدرجة الثالثة',
    '1\tSciences Economiques et Gestion\tمتصرف من الدرجة الثالثة',
    'كلية\tالاقتصاد والتدبير اسفي',
    '1\tGestion des entreprises\tتقني من الدرجة الثالثة',
    '1\tSecrétariat de Direction\tتقني من الدرجة الثالثة',
    '1\tInformatique\tمتصرف من الدرجة الثالثة',
    '1\tSciences Economiques et Gestion\tمتصرف من الدرجة الثالثة',
    '',
    '-- 1 of 3 --',
  ].join('\n');

  const r = extractCompetitionTable(uca);
  assert.equal(r.detected, true, 'table détectée');
  assert.equal(r.rows.length, 29, `29 lignes attendues, got ${r.rows.length}`);
  assert.equal(r.places.values.length, 29, '29 valeurs confirmées');
  assert.equal(r.places.values.includes(2026), false, '2026 ne doit pas être compté');
  const sum = r.places.values.reduce((a, b) => a + b, 0);
  assert.equal(sum, 33, `1+1+…=33 attendu, got ${sum}`);
  assert.equal(r.places.total, 33, 'total 33');
  assert.equal(r.places.status, 'REVIEW', 'status REVIEW (pas AUTO forcé)');
  assert.ok(r.places.evidence.every((e) => e.page === 1), 'evidence page 1');
  assert.ok(r.rows.every((row) => row.grade), 'chaque ligne a un grade');
});

// ---------------------------------------------------------------
// 2. Tableau français propre → AUTO (critères objectifs remplis)
// ---------------------------------------------------------------
test('2. tableau français — en-tête explicite ligne unique → AUTO', () => {
  const fr = [
    'AVIS DE CONCOURS — Ministère de l\'Education',
    'Institution\tNombre de postes\tSpécialité\tGrade',
    'Faculté des Sciences Rabat\t5\tInformatique\tIngénieur',
    'Faculté des Lettres Fès\t2\tLangues\tCadre',
    'Faculté de Droit\t3\tDroit public\tIngénieur',
  ].join('\n');
  const r = extractCompetitionTable(fr);
  assert.equal(r.detected, true);
  assert.equal(r.rows.length, 3, '3 lignes');
  assert.equal(r.places.total, 10, '5+2+3=10');
  assert.equal(r.places.status, 'AUTO', 'critères AUTO objectifs remplis (header une ligne, lignes propres, institution partout)');
});

// ---------------------------------------------------------------
// 3. Espaces multiples (colonnes non tabulées)
// ---------------------------------------------------------------
test('3. espaces multiples — reconstruction', () => {
  const txt = [
    'Institution    Nombre de postes    Spécialité    Grade',
    'Faculté des Sciences    2    Math    Ingénieur',
    'Faculté des Lettres    1    Histoire    Cadre',
  ].join('\n');
  const r = extractCompetitionTable(txt);
  assert.equal(r.rows.length, 2);
  assert.equal(r.places.total, 3);
  assert.equal(r.places.values[0], 2);
  assert.equal(r.places.values[1], 1);
});

// ---------------------------------------------------------------
// 4. Institutions sur plusieurs lignes (arabe fusionné)
// ---------------------------------------------------------------
test('4. institutions multi-lignes — fusion → REVIEW, valeurs correctes', () => {
  const txt = [
    'المؤسسة',
    'عدد',
    'المناصب',
    'التخصص المطلوب\tالإطار المطلوب',
    'كلية العلوم',
    'القانونية والسياسية',
    'مراكش',
    '1\tFinance\tمتصرف من الدرجة الثانية',
    '1\tDroit\tتقني من الدرجة الثالثة',
  ].join('\n');
  const r = extractCompetitionTable(txt);
  assert.equal(r.detected, true);
  assert.equal(r.rows.length, 2);
  assert.equal(r.places.total, 2);
  assert.equal(r.places.status, 'REVIEW', 'institutions fusionnées → REVIEW');
  assert.ok(r.rows[0].institution.includes('كلية العلوم'), `institution reconstruite: ${r.rows[0].institution}`);
});

// ---------------------------------------------------------------
// 5. Dates — jamais comptées
// ---------------------------------------------------------------
test('5. dates (04/10/2026, 11/10/2026) exclues', () => {
  const txt = [
    'عدد المناصب',
    'المؤسسة\tالعدد\tالتخصص\tالإطار',
    'كلية العلوم مراكش',
    '1\tFinance\tمتصرف',
    '04\t/\t10\t/\t2026',
    '11/10/2026',
    '1\tDroit\tتقني',
  ].join('\n');
  const r = extractCompetitionTable(txt);
  assert.equal(r.rows.length, 2, 'seules les lignes avec spécialité+grade comptent');
  assert.equal(r.places.total, 2, 'dates non comptées');
  assert.ok(r.places.values.every((v) => v === 1), 'aucune valeur 0 (04) ou 2026');
});

// ---------------------------------------------------------------
// 6. Années — jamais comptées
// ---------------------------------------------------------------
test('6. années (2026, 2025) exclues', () => {
  const txt = [
    'عدد المناصب',
    'المؤسسة\tالعدد\tالتخصص\tالإطار',
    '2026',
    '2025',
    'كلية العلوم مراكش',
    '3\tFinance\tمتصرف',
  ].join('\n');
  const r = extractCompetitionTable(txt);
  assert.equal(r.rows.length, 1);
  assert.equal(r.places.total, 3);
  assert.equal(r.places.values.includes(2026), false);
});

// ---------------------------------------------------------------
// 7. Numéros de page — jamais comptés
// ---------------------------------------------------------------
test('7. numéros de page (-- 1 of 3 --, page 3, 3 pages) exclus', () => {
  const txt = [
    'Document — 3 pages',
    'page 3',
    'عدد المناصب',
    'المؤسسة\tالعدد\tالتخصص\tالإطار',
    'كلية العلوم مراكش',
    '2\tFinance\tمتصرف',
    '',
    '-- 1 of 3 --',
    'page 2',
    'كلية الآداب فاس',
    '1\tHistoire\tمتصرف',
  ].join('\n');
  const r = extractCompetitionTable(txt);
  assert.equal(r.rows.length, 2);
  assert.equal(r.places.total, 3, 'les numéros de page ne sont pas des postes');
});

// ---------------------------------------------------------------
// 8. Tableau sans nombre de postes → MISSING
// ---------------------------------------------------------------
test('8. tableau sans nombre de postes → MISSING', () => {
  const txt = [
    'المؤسسة\tالعدد\tالتخصص\tالإطار',
    'كلية العلوم مراكش\t1\tMath\tIngénieur',
    'كلية الآداب فاس\t2\tArabe\tCadre',
  ].join('\n');
  const r = extractCompetitionTable(txt);
  assert.equal(r.detected, false, 'pas de header places → non détecté');
  assert.equal(r.rows.length, 0);
  assert.equal(r.places.status, 'MISSING');
});

// ---------------------------------------------------------------
// 9. Tableau ambigu (nombres dans une autre colonne) → MISSING
// ---------------------------------------------------------------
test('9. tableau ambigu — nombres sans grade/spécialité → MISSING', () => {
  const txt = [
    'عدد المناصب',
    'المؤسسة\tSalle\tDate',
    'كلية العلوم مراكش\t12\t15',
    'كلية الآداب فاس\t14\t13',
  ].join('\n');
  const r = extractCompetitionTable(txt);
  assert.equal(r.rows.length, 0, 'aucune ligne places fiable');
  assert.equal(r.places.status, 'MISSING');
});

// ---------------------------------------------------------------
// 10. PDF scanné → SCANNED_REVIEW (aucun texte exploitable)
// ---------------------------------------------------------------
test('10. PDF scanné → MISSING/SCANNED_REVIEW', () => {
  const scannedText = '-- 1 of 16 -- -- 2 of 16 -- -- 3 of 16 --';
  const r = extractCompetitionTable(scannedText, { scanned: true, pageCount: 16 });
  assert.equal(r.detected, false);
  assert.equal(r.rows.length, 0);
  assert.equal(r.places.status, 'MISSING');
  assert.ok(r.warnings.some((w) => w.includes('scanné')));
});

// ---------------------------------------------------------------
// 11. Anti-faux-positifs génériques (batterie complète)
// ---------------------------------------------------------------
test('11. anti-faux-positifs — 2026, dates, pages, niveau, bac+3, N°, références', () => {
  const txt = [
    'عدد المناصب',
    'Année 2026',
    '2026',
    '3 pages',
    'page 3',
    'niveau 3',
    'bac+3',
    'N° 12',
    'Référence 45/2026',
    'Concours N° 2025/07',
    'كلية العلوم مراكش',
    '1\tFinance\tمتصرف',
    '2\tMath\tIngénieur',
  ].join('\n');
  const r = extractCompetitionTable(txt);
  assert.equal(r.rows.length, 2, 'seules lignes nombre+spécialité+grade');
  assert.equal(r.places.total, 3);
  assert.ok(!r.places.values.some((v) => v >= 2000), 'aucune année');
});

// ---------------------------------------------------------------
// 12. Lignes multiples : spécialité/grade scindés sur lignes suivantes → fusion, REVIEW
// ---------------------------------------------------------------
test('12. lignes multi-lignes (grade sur la ligne suivante) — fusion → REVIEW, valeurs correctes', () => {
  const txt = [
    'المؤسسة',
    'عدد',
    'المناصب',
    'التخصص المطلوب',
    'الإطار المطلوب',
    'كلية العلوم مراكش',
    '1\tFinance\tمتصرف',
    'من الدرجة الثانية',
    '2\tDroit\tتقني',
    'من الدرجة الثالثة',
  ].join('\n');
  const r = extractCompetitionTable(txt);
  assert.equal(r.rows.length, 2);
  assert.equal(r.places.total, 3);
  assert.equal(r.places.status, 'REVIEW', 'lignes fusionnées → REVIEW');
  assert.ok(r.rows[0].grade.includes('الدرجة الثانية'), `grade fusionné: ${r.rows[0].grade}`);
});

// ---------------------------------------------------------------
// 13. Pipeline (section 9) : REVIEW reste REVIEW, jamais REVIEW→AUTO
// ---------------------------------------------------------------
test('13. pipeline — places REVIEW → champ places REVIEW (jamais REVIEW→AUTO), MISSING → BLOCKED', () => {
  const scraped: any = {
    title: 'Test concours',
    organization: 'Université Cadi Ayyad de Marrakech',
    establishment: 'Université Cadi Ayyad de Marrakech',
    university: 'Université Cadi Ayyad de Marrakech',
    city: 'Marrakech',
    region: 'Marrakech-Safi',
    academicYear: '2026-2027',
    level: 'Bac+3',
    description: 'Description suffisamment longue pour le test du pipeline phase 11 preview.',
    conditions: ['Diplôme'],
    documents: ['CNI'],
    sourceUrl: 'https://www.uca.ma/uploads/documents/concours/test.pdf',
    source: 'univ-uca-test',
    fingerprint: 'phase11-test',
    scrapedAt: new Date().toISOString(),
  };

  // Tableau français propre → AUTO
  const auto = extractCompetitionTable([
    'Institution\tNombre de postes\tSpécialité\tGrade',
    'Faculté des Sciences Rabat\t5\tInformatique\tIngénieur',
    'Faculté de Droit\t3\tDroit public\tIngénieur',
  ].join('\n'));
  const previewAuto = buildCompetitionPreview(scraped, auto);
  assert.equal((previewAuto as any).placesOverride.status, 'AUTO', 'AUTO préservé');
  assert.equal((previewAuto.fields as any).places.status, 'AUTO');

  // Tableau UCA (heuristic, multi-ligne) → REVIEW
  const review = extractCompetitionTable([
    'المؤسسة',
    'عدد',
    'المناصب',
    'التخصص المطلوب\tالإطار المطلوب',
    'كلية العلوم مراكش',
    '1\tFinance\tمتصرف من الدرجة الثانية',
  ].join('\n'));
  assert.equal(review.places.status, 'REVIEW');
  const previewReview = buildCompetitionPreview(scraped, review);
  assert.equal((previewReview as any).placesOverride.status, 'REVIEW', 'REVIEW doit rester REVIEW');
  assert.equal((previewReview.fields as any).places.status, 'REVIEW', 'champ places REVIEW, jamais converti en AUTO');
  assert.notEqual((previewReview as any).placesOverride.status, 'AUTO', 'violation: REVIEW→AUTO');

  // Aucun header → MISSING → BLOCKED, aucune valeur inventée
  const missing = extractCompetitionTable([
    'المؤسسة\tSalle\tDate',
    'كلية العلوم مراكش\t12\t15',
  ].join('\n'));
  assert.equal(missing.places.status, 'MISSING');
  const previewMissing = buildCompetitionPreview(scraped, missing);
  assert.equal((previewMissing.fields as any).places.status, 'BLOCKED');
  assert.equal((previewMissing.payload as any).places, null, 'aucun places inventé');
});

// ---------------------------------------------------------------
// 14. Header français répété en page 2 — ignoré, pas de fausse ligne
// ---------------------------------------------------------------
test('14. header répété (page suivante) ignoré — 2 lignes, total 7, AUTO', () => {
  const txt = [
    'Institution\tNombre de postes\tSpécialité\tGrade',
    'Faculté des Sciences\t5\tInformatique\tIngénieur',
    '',
    '-- 1 of 1 --',
    'Institution\tNombre de postes\tSpécialité\tGrade',
    'Faculté des Lettres\t2\tLangues\tCadre',
  ].join('\n');
  const r = extractCompetitionTable(txt);
  assert.equal(r.detected, true);
  assert.equal(r.rows.length, 2, 'le header répété ne doit pas créer de ligne');
  assert.equal(r.places.total, 7, '5+2=7');
  assert.equal(r.rows[1].page, 2, 'page suivante trackée');
  assert.equal(r.places.status, 'AUTO', 'structure stable, aucune ambiguïté');
});

// ---------------------------------------------------------------
// Résumé
// ---------------------------------------------------------------
console.log('\n========================================');
console.log(`competitionTable tests — ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('Failures:');
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('OK');