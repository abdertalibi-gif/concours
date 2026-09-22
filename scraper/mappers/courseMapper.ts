// courseMapper — ScrapedItem → Course (UNSUPPORTED)
import type { ScrapedItem } from '../lib/types';
import type { ValidatedPayload } from './types';
import { slugify, uid } from './helpers';

export function mapToCourse(scraped: ScrapedItem): ValidatedPayload {
  const fields: any = {};
  const payload: Record<string, unknown> = {};

  fields.title = { targetField: 'title', value: scraped.title?.trim() || null, status: scraped.title ? 'REVIEW' : 'BLOCKED', sourceField: 'title', reason: 'source master ≠ cours — REVIEW' };
  payload.title = scraped.title?.trim() || null;

  for (const f of ['subject','level','difficulty','duration','color','publishStatus','description','chapters']) {
    fields[f] = { targetField: f, value: null, status: 'UNSUPPORTED', reason: 'absent flux Almaster — cours non supporté' };
  }
  payload.subject = 'Mathématiques'; payload.level='Bac+0'; payload.difficulty='Intermédiaire'; payload.duration='10h'; payload.color='#0B63CE'; payload.publishStatus='DRAFT'; payload.description='';

  payload.id = uid('course'); payload.slug = slugify(String(payload.title||'cours'));
  fields.id = { targetField: 'id', value: payload.id, status: 'AUTO' };
  fields.slug = { targetField: 'slug', value: payload.slug, status: 'AUTO' };
  payload.createdAt = new Date().toISOString(); payload.updatedAt = new Date().toISOString(); payload.chapters=[];

  return { entityType: 'course', payload, fields, valid: false, errors: ['Course non supporté depuis Almaster'], warnings: [], blocked: true, blockedReasons: ['Course UNSUPPORTED'] };
}
