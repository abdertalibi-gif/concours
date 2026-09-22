// Helpers — réutilise exactement les transformations du site
import { slugify as siteSlugify, uid as siteUid } from '../../src/lib/utils.ts';

export function slugify(text: string): string {
  return siteSlugify(text);
}
export function uid(prefix = 'id'): string {
  return siteUid(prefix);
}
export function toISODate(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}
export function splitLines(v: string | string[] | null | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
  return String(v).split('\n').map(s => s.trim()).filter(Boolean);
}
export function splitComma(v: string | string[] | null | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}
export function parseIntSafe(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
}
export function isValidUrl(v: string | null | undefined): boolean {
  if (!v) return false;
  return /^https?:\/\/.+/.test(String(v).trim());
}
export function cleanString(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s || undefined;
}
