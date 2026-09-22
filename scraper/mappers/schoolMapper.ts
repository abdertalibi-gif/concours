// schoolMapper — ScrapedItem → School (UNSUPPORTED — ne pas créer)
import type { ScrapedItem } from '../lib/types';
import type { ValidatedPayload } from './types';
import { slugify, uid } from './helpers';

export function mapToSchool(scraped: ScrapedItem): ValidatedPayload {
  const fields: any = {};
  const payload: Record<string, unknown> = {};

  if (!scraped.establishment?.trim()) {
    fields.name = { targetField: 'name', value: null, status: 'MISSING', sourceField: 'establishment', reason: '29/150 sans établissement' };
    fields.shortName = { targetField: 'shortName', value: null, status: 'MISSING', sourceField: 'establishment' };
  } else {
    fields.name = { targetField: 'name', value: scraped.establishment.trim(), status: 'REVIEW', sourceField: 'establishment', reason: 'ne jamais créer école automatiquement — REVIEW' };
    fields.shortName = { targetField: 'shortName', value: scraped.establishment.trim(), status: 'REVIEW', sourceField: 'establishment' };
    payload.name = scraped.establishment.trim(); payload.shortName = scraped.establishment.trim();
  }

  for (const f of ['universityId','ministryId','city','region','type','isActive','domains','levels','website','email','phone','description','logoUrl']) {
    fields[f] = { targetField: f, value: null, status: 'UNSUPPORTED', reason: 'école création interdite depuis Almaster' };
  }

  payload.id = uid('ec'); payload.slug = slugify(String(payload.shortName||'ecole'));
  fields.id = { targetField: 'id', value: payload.id, status: 'REVIEW', reason: "ne pas générer — école existante obligatoire" };
  fields.slug = { targetField: 'slug', value: payload.slug, status: 'REVIEW' };

  return { entityType: 'school', payload, fields, valid: false, errors: ['School creation interdite — REVIEW'], warnings: ['Ne jamais créer école depuis Almaster'], blocked: true, blockedReasons: ['School UNSUPPORTED — utiliser école existante'] };
}
