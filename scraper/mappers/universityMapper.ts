// universityMapper — ScrapedItem → University (UNSUPPORTED)
import type { ScrapedItem } from '../lib/types';
import type { ValidatedPayload } from './types';
import { slugify, uid } from './helpers';

export function mapToUniversity(scraped: ScrapedItem): ValidatedPayload {
  const fields: any = {};
  const payload: Record<string, unknown> = {};

  if (!scraped.university?.trim()) {
    fields.name = { targetField: 'name', value: null, status: 'MISSING', sourceField: 'university', reason: '50/150 sans université' };
    fields.shortName = { targetField: 'shortName', value: null, status: 'MISSING', sourceField: 'university' };
  } else {
    fields.name = { targetField: 'name', value: scraped.university.trim(), status: 'REVIEW', sourceField: 'university', reason: 'ne jamais créer université — REVIEW' };
    fields.shortName = { targetField: 'shortName', value: scraped.university.trim(), status: 'REVIEW', sourceField: 'university' };
    payload.name = scraped.university.trim(); payload.shortName = scraped.university.trim();
  }

  for (const f of ['nameAr','city','region','website','description','logoUrl','isActive']) {
    fields[f] = { targetField: f, value: null, status: 'UNSUPPORTED', reason: 'université création interdite' };
  }

  payload.id = uid('univ'); payload.slug = slugify(String(payload.shortName||'univ'));
  fields.id = { targetField: 'id', value: payload.id, status: 'REVIEW' };
  fields.slug = { targetField: 'slug', value: payload.slug, status: 'REVIEW' };

  return { entityType: 'university', payload, fields, valid: false, errors: ['University creation interdite'], warnings: [], blocked: true, blockedReasons: ['University UNSUPPORTED'] };
}
