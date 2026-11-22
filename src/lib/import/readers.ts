// ============================================================
// CONCOURS MAROC — Lecteurs de fichiers (JSON / CSV / XLSX / XLS)
//
// Tout est lu dans le navigateur. Aucun envoi réseau, aucun
// service externe, aucun client IA. `xlsx` est importé
// dynamiquement afin de ne pas l'inclure dans le graphe de modules
// des tests unitaires du parseur CSV.
// ============================================================

import { parseCsv, stripBom } from './csv';
import type { ImportEntity, RawTable } from './types';

export const SUPPORTED_EXTENSIONS = ['.json', '.csv', '.xlsx', '.xls'] as const;

export type ImportFormat = 'json' | 'csv' | 'xlsx';

export class ImportReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportReadError';
  }
}

/** Déduit le format du fichier à partir de son nom. */
export function detectFormat(fileName: string): ImportFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.csv') || lower.endsWith('.txt') || lower.endsWith('.tsv')) return 'csv';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'xlsx';
  throw new ImportReadError(
    `Format non supporté : « ${fileName} ». Formats acceptés : ${SUPPORTED_EXTENSIONS.join(', ')}.`,
  );
}

function matrixToTable(matrix: unknown[][]): RawTable {
  const rows = matrix.filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== ''));
  if (rows.length === 0) {
    throw new ImportReadError('Le fichier ne contient aucune donnée exploitable.');
  }

  const headerCells = rows[0].map((c, i) => {
    const raw = stripBom(String(c ?? '')).trim();
    return raw === '' ? `colonne_${i + 1}` : raw;
  });

  const seen = new Map<string, number>();
  const headers = headerCells.map((name) => {
    const key = name.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? name : `${name}__${n}`;
  });

  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    const record: Record<string, string> = {};
    for (let c = 0; c < headers.length; c += 1) {
      record[headers[c]] = cells[c] === undefined || cells[c] === null ? '' : String(cells[c]);
    }
    for (let c = headers.length; c < cells.length; c += 1) {
      record[`colonne_${c + 1}__extra`] = cells[c] === null || cells[c] === undefined ? '' : String(cells[c]);
    }
    out.push(record);
  }

  return { headers, rows: out };
}

const JSON_ARRAY_KEYS = ['concours', 'competitions', 'masters', 'items', 'data', 'rows'];

/**
 * Lit un JSON : tableau direct, ou objet contenant l'un des
 * conteneurs `concours` / `competitions` / `masters` / `items` /
 * `data` / `rows`.
 */
export function readJson(text: string, entity?: ImportEntity): RawTable {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripBom(text));
  } catch (err) {
    throw new ImportReadError(`JSON invalide : ${(err as Error).message}`);
  }

  let list: unknown[] | null = null;

  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const keys = entity === 'CONCOURS' ? ['concours', 'competitions', ...JSON_ARRAY_KEYS] : ['masters', ...JSON_ARRAY_KEYS];
    for (const key of keys) {
      if (Array.isArray(obj[key])) {
        list = obj[key] as unknown[];
        break;
      }
    }
  }

  if (!list) {
    throw new ImportReadError(
      'Structure JSON non reconnue. Attendu : un tableau, ou un objet contenant "concours"/"competitions"/"masters"/"items".',
    );
  }
  if (list.length === 0) {
    throw new ImportReadError('Le tableau JSON est vide.');
  }

  const headerSet: string[] = [];
  for (const item of list) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      for (const key of Object.keys(item as Record<string, unknown>)) {
        if (!headerSet.includes(key)) headerSet.push(key);
      }
    }
  }
  if (headerSet.length === 0) {
    throw new ImportReadError('Aucun champ exploitable dans le JSON (objets vides ?).');
  }

  const rows = list.map((item) => {
    const record: Record<string, string> = {};
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;
      for (const key of headerSet) {
        const v = obj[key];
        record[key] =
          v === null || v === undefined
            ? ''
            : Array.isArray(v)
              ? v.join('\n')
              : v instanceof Date
                ? v.toISOString()
                : String(v);
      }
    } else {
      for (const key of headerSet) record[key] = '';
    }
    return record;
  });

  return { headers: headerSet, rows };
}

/** Lit un classeur Excel (xlsx/xls) et renvoie la première feuille non vide. */
export async function readSpreadsheet(buffer: ArrayBuffer): Promise<RawTable> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array' });
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    });
    if (matrix.length > 0) {
      return matrixToTable(matrix);
    }
  }
  throw new ImportReadError('Le classeur ne contient aucune feuille exploitable.');
}

/** Point d'entrée unique : lit un File et renvoie la table brute. */
export async function readFileToTable(file: File, entity?: ImportEntity): Promise<{ table: RawTable; format: ImportFormat }> {
  const format = detectFormat(file.name);
  if (format === 'json') {
    const text = await file.text();
    return { table: readJson(text, entity), format };
  }
  if (format === 'csv') {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.headers.length === 0) {
      throw new ImportReadError('Aucun en-tête détecté dans le fichier CSV.');
    }
    return { table: { headers: parsed.headers, rows: parsed.rows }, format };
  }
  const buffer = await file.arrayBuffer();
  return { table: await readSpreadsheet(buffer), format };
}
