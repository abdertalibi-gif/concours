// ministryMapper — ScrapedItem → Ministry (UNSUPPORTED)
import type { ScrapedItem } from '../lib/types';
import type { ValidatedPayload } from './types';
import { slugify, uid } from './helpers';

export function mapToMinistry(scraped: ScrapedItem): ValidatedPayload {
  const fields: any = {};
  const payload: Record<string, unknown> = {};

  fields.name = { targetField: 'name', value: null, status: 'UNSUPPORTED', sourceField: 'organization', reason: 'Almaster ne fournit pas de ministères — UNSUPPORTED' };
  fields.shortName = { targetField: 'shortName', value: null, status: 'UNSUPPORTED', sourceField: 'organization' };
  for (const f of ['website','isActive','description','logoUrl']) {
    fields[f] = { targetField: f, value: null, status: 'UNSUPPORTED', reason: 'ministry non supporté' };
  }
  payload.id = uid('min'); payload.slug = slugify('ministere');
  fields.id = { targetField: 'id', value: payload.id, status: 'REVIEW' };
  fields.slug = { targetField: 'slug', value: payload.slug, status: 'REVIEW' };

  return { entityType: 'ministry', payload, fields, valid: false, errors: ['Ministry non supporté depuis Almaster'], warnings: [], blocked: true, blockedReasons: ['Ministry UNSUPPORTED'] };
}
