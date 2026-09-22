// documentMapper — ScrapedItem → ValidatedPayload DocItem
import type { ScrapedItem } from '../lib/types';
import type { ValidatedPayload } from './types';
import { slugify, uid } from './helpers';

export function mapToDocument(scraped: ScrapedItem): ValidatedPayload {
  const fields: any = {};
  const warnings: string[] = [];
  const payload: Record<string, unknown> = {};

  if (!scraped.title?.trim()) {
    fields.title = { targetField: 'title', value: null, status: 'BLOCKED', sourceField: 'title', reason: 'manquant' };
  } else {
    fields.title = { targetField: 'title', value: scraped.title.trim(), status: 'REVIEW', sourceField: 'title', reason: 'source master, document incertain — REVIEW' };
    payload.title = scraped.title.trim();
  }

  const org = scraped.establishment || scraped.university || scraped.organization || null;
  fields.organizationName = { targetField: 'organizationName', value: org, status: org ? 'REVIEW' : 'MISSING', sourceField: 'establishment', reason: 'AutoOrganismeField requis' };
  payload.organizationName = org;

  fields.category = { targetField: 'category', value: 'Avis de concours', status: 'REVIEW', sourceField: 'category', reason: 'Almaster → Avis de concours par défaut — REVIEW' };
  payload.category = 'Avis de concours';

  fields.year = { targetField: 'year', value: scraped.academicYear ? parseInt(String(scraped.academicYear).split('-')[0],10) : new Date().getFullYear(), status: scraped.academicYear ? 'AUTO' : 'MISSING', sourceField: 'academicYear' };
  payload.year = fields.year.value;

  const docUrl = Array.isArray(scraped.documents) && scraped.documents[0] ? scraped.documents[0] : null;
  fields.fileUrl = { targetField: 'fileUrl', value: docUrl, status: docUrl ? 'AUTO' : 'MISSING', sourceField: 'documents[0]', reason: docUrl ? 'PDF Almaster' : '98/150 sans PDF' };
  payload.fileUrl = docUrl || undefined;

  fields.fileSize = { targetField: 'fileSize', value: null, status: 'UNSUPPORTED', reason: 'taille non fournie' };
  fields.sourceUrl = { targetField: 'sourceUrl', value: scraped.sourceUrl || null, status: scraped.sourceUrl ? 'AUTO' : 'MISSING', sourceField: 'sourceUrl' };
  payload.sourceUrl = scraped.sourceUrl || undefined;

  fields.description = { targetField: 'description', value: scraped.description ? String(scraped.description).slice(0,500) : null, status: scraped.description ? 'REVIEW' : 'MISSING', sourceField: 'description' };
  payload.description = fields.description.value || undefined;

  fields.publishStatus = { targetField: 'publishStatus', value: 'DRAFT', status: 'AUTO', reason: 'default DRAFT' };
  payload.publishStatus = 'DRAFT';
  fields.isDemo = { targetField: 'isDemo', value: false, status: 'AUTO' };
  payload.isDemo = false;

  payload.id = uid('d'); payload.slug = slugify(String(payload.title||'document') + '-' + Date.now());
  fields.id = { targetField: 'id', value: payload.id, status: 'AUTO', reason: "uid('d')" };
  fields.slug = { targetField: 'slug', value: payload.slug, status: 'AUTO' };
  payload.downloads = 0; payload.createdAt = new Date().toISOString(); payload.updatedAt = new Date().toISOString();

  return { entityType: 'document', payload, fields, valid: false, errors: ['Document mapping depuis Master — REVIEW obligatoire'], warnings, blocked: true, blockedReasons: ['Document non supporté fiablement depuis Almaster'] };
}
