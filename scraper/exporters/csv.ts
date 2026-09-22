// ============================================================
// Export CSV (obligatoire) — séparateur ';', BOM UTF-8 pour Excel
// ============================================================
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ScrapedItem } from '../lib/types';
const FIELDS: Array<keyof ScrapedItem> = [
  'title',
  'organization',
  'university',
  'establishment',
  'city',
  'region',
  'domain',
  'level',
  'academicYear',
  'category',
  'description',
  'conditions',
  'documents',
  'places',
  'openingDate',
  'deadlineDate',
  'examDate',
  'resultsDate',
  'officialUrl',
  'registrationUrl',
  'sourceUrl',
  'publishedAt',
  'originalTitle',
  'tags',
  'source',
  'fingerprint',
];

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s: string;
  if (Array.isArray(value)) {
    s = value.join(' | ');
  } else {
    s = String(value);
  }
  s = s.replace(/\r\n/g, ' ').replace(/[\r\n\t]+/g, ' ').replace(/"/g, '""');
  if (/[;"\n]/.test(s)) s = `"${s}"`;
  return s;
}

export function exportCsv(items: ScrapedItem[], file: string): string {
  mkdirSync(dirname(file), { recursive: true });
  const header = FIELDS.join(';');
  const lines = items.map((item) =>
    FIELDS.map((f) => cell((item as unknown as Record<string, unknown>)[f])).join(';'),
  );
  writeFileSync(file, `\uFEFF${header}\n${lines.join('\n')}\n`, 'utf-8');
  return file;
}