// ============================================================
// Export JSON (obligatoire)
// ============================================================

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ScrapedItem } from '../lib/types';

export function exportJson(items: ScrapedItem[], file: string): string {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(items, null, 2), 'utf-8');
  return file;
}