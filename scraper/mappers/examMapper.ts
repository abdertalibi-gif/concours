// examMapper — ScrapedItem → ValidatedPayload Exam
// Almaster ne fournit pas d'examens (concours blancs) — mapping majoritairement UNSUPPORTED
import type { ScrapedItem } from '../lib/types';
import type { ValidatedPayload } from './types';
import { resolveSubject, resolveLevel } from '../resolvers/referenceResolver';
import { slugify, uid } from './helpers';

export function mapToExam(scraped: ScrapedItem): ValidatedPayload {
  const fields: any = {};
  const errors: string[] = [];
  const warnings: string[] = [];
  const payload: Record<string, unknown> = {};
  const blockedReasons: string[] = [];

  // title — on peut mapper, mais source master ≠ examen
  if (!scraped.title?.trim()) {
    fields.title = { targetField: 'title', value: null, status: 'BLOCKED', sourceField: 'title', reason: 'manquant obligatoire' };
    blockedReasons.push('title manquant'); errors.push('title manquant');
  } else {
    fields.title = { targetField: 'title', value: scraped.title.trim(), status: 'REVIEW', sourceField: 'title', reason: 'source master, type examen incertain — REVIEW' };
    payload.title = scraped.title.trim();
    warnings.push('Exam title depuis Master — vérifier type');
  }

  fields.schoolName = { targetField: 'schoolName', value: scraped.establishment || null, status: scraped.establishment ? 'REVIEW' : 'MISSING', sourceField: 'establishment', reason: 'mapping incertain' };
  payload.schoolName = scraped.establishment || null;

  const subjRes = resolveSubject(scraped.domain || null);
  fields.subject = { targetField: 'subject', value: scraped.domain || 'Mathématiques', status: scraped.domain && subjRes.status==='AUTO' ? 'AUTO' : 'REVIEW', sourceField: 'domain', referenceId: subjRes.referenceId, reason: subjRes.reason };
  payload.subject = subjRes.status==='AUTO' ? subjRes.matched!.label : 'Mathématiques';

  const lvlRes = resolveLevel(scraped.level || null);
  fields.level = { targetField: 'level', value: lvlRes.status==='AUTO' ? lvlRes.matched!.label : (scraped.level || 'Bac+0'), status: lvlRes.status==='AUTO' ? 'AUTO' : 'REVIEW', sourceField: 'level', reason: lvlRes.reason };
  payload.level = lvlRes.status==='AUTO' ? lvlRes.matched!.label : (scraped.level || 'Bac+0');

  fields.year = { targetField: 'year', value: scraped.academicYear ? parseInt(String(scraped.academicYear).split('-')[0],10) : new Date().getFullYear(), status: scraped.academicYear ? 'AUTO' : 'MISSING', sourceField: 'academicYear', reason: 'parseInt' };
  payload.year = fields.year.value;

  fields.type = { targetField: 'type', value: 'Concours', status: 'REVIEW', reason: 'Almaster master ≠ type examen — REVIEW' };
  payload.type = 'Concours';

  // Champs non fournis
  for (const f of ['duration','pages','pdfUrl','description','hasCorrection','isDemo','verificationStatus','publishStatus']) {
    fields[f] = { targetField: f, value: null, status: 'UNSUPPORTED', reason: 'absent flux Almaster' };
  }
  payload.duration = undefined; payload.pages = undefined; payload.pdfUrl = undefined;

  // Hidden
  payload.id = uid('ex'); payload.slug = slugify(String(payload.title||'examen') + '-' + payload.year);
  fields.id = { targetField: 'id', value: payload.id, status: 'AUTO', reason: "uid('ex')" };
  fields.slug = { targetField: 'slug', value: payload.slug, status: 'AUTO', reason: 'slugify(title-year)' };
  payload.organizationName = payload.schoolName;
  payload.downloads = 0; payload.createdAt = new Date().toISOString(); payload.updatedAt = new Date().toISOString();

  // Exam a besoin de title+schoolName — si REVIEW on bloque
  if (fields.title.status !== 'AUTO') { blockedReasons.push('Exam mapping depuis Master — REVIEW requis'); }

  return { entityType: 'exam', payload, fields, valid: false, errors: [...errors, 'Exam non supporté depuis Almaster — REVIEW obligatoire'], warnings, blocked: true, blockedReasons };
}
