// ============================================================
// CONCOURS MAROC — Parseur CSV déterministe (sans dépendance)
//
// Objectif : remplacer un futur PapaParse sans changer le
// workflow d'import. Scanner caractère par caractère, aucun
// splitting par regex (les champs quotés contenant des virgules,
// des points-virgules ou des retours à la ligne doivent survivre).
//
// Supporte : BOM UTF-8, délimiteur , ou ; auto-détecté, champs
// quotés, guillemets échappés ("), champs vides, CRLF / LF / CR,
// retours à la ligne dans un champ quoté, et rejet explicite des
// guillemets non équilibrés avec numéro de ligne.
// ============================================================

import type { ParsedCsvResult } from './types';

const BOM = '\uFEFF';
const MAX_DETECT_LINES = 20;

export class CsvParseError extends Error {
  readonly line: number;
  constructor(message: string, line: number) {
    super(message);
    this.name = 'CsvParseError';
    this.line = line;
  }
}

/** Retire un éventuel BOM UTF-8 en début de chaîne. */
export function stripBom(text: string): string {
  return text.startsWith(BOM) ? text.slice(BOM.length) : text;
}

function isMeaningful(line: string): boolean {
  return line.trim().length > 0;
}

/**
 * Parcourt le texte en respectant les guillemets et renvoie, pour
 * chaque candidat, le nombre de séparateurs hors guillemets par
 * ligne significative.
 */
function countSeparatorsPerLine(
  text: string,
  delimiter: string,
): { line: number; count: number }[] {
  const out: { line: number; count: number }[] = [];
  let inQuotes = false;
  let count = 0;
  let line = 1;
  let lineHasContent = false;
  let i = 0;

  const flush = () => {
    if (isMeaningful(String(count)) || lineHasContent) {
      out.push({ line, count });
    }
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (ch === '\n') line += 1;
      i += 1;
      continue;
    }
    if (ch === '"' && count === 0) {
      inQuotes = true;
      lineHasContent = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      count += 1;
      lineHasContent = true;
      i += 1;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      i += 1;
      if (lineHasContent) flush();
      count = 0;
      lineHasContent = false;
      line += 1;
      continue;
    }
    if (ch.trim().length > 0) lineHasContent = true;
    i += 1;
  }
  if (lineHasContent) flush();
  return out;
}

/**
 * Détection déterministe du délimiteur.
 * Pour chaque candidat on prend la valeur modale (la plus fréquente)
 * du nombre de séparateurs par ligne significative. Le candidat dont
 * la valeur modale est la plus grande gagne. Égalité => ','.
 */
export function detectDelimiter(text: string): ',' | ';' {
  const clean = stripBom(text);
  const candidates: Array<',' | ';'> = [',', ';'];

  let best: ',' | ';' = ',';
  let bestScore = -1;

  for (const candidate of candidates) {
    const perLine = countSeparatorsPerLine(clean, candidate).slice(0, MAX_DETECT_LINES);
    if (perLine.length === 0) continue;

    const freq = new Map<number, number>();
    for (const { count } of perLine) {
      if (count <= 0) continue;
      freq.set(count, (freq.get(count) ?? 0) + 1);
    }
    if (freq.size === 0) continue;

    let modal = -1;
    let modalFreq = -1;
    // Parcours déterministe : on départage par la fréquence puis par
    // la plus petite valeur (déterministe en cas d'égalité).
    for (const value of Array.from(freq.keys()).sort((a, b) => a - b)) {
      const f = freq.get(value) ?? 0;
      if (f > modalFreq) {
        modalFreq = f;
        modal = value;
      }
    }
    if (modal > bestScore) {
      bestScore = modal;
      best = candidate;
    }
  }

  return best;
}

/**
 * Découpe le texte en tableau de cellules.
 * @throws {CsvParseError} si un guillemet n'est jamais refermé.
 */
function scanRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  /** Ligne d'ouverture du champ quoté non refermé (pour un message d'erreur utile). */
  let quoteStartLine = 1;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (ch === '\n') line += 1;
      field += ch;
      i += 1;
      continue;
    }

    // Un guillemet n'ouvre un champ que s'il est en début de champ.
    if (ch === '"' && field === '') {
      inQuotes = true;
      quoteStartLine = line;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      i += 1;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      line += 1;
      continue;
    }

    field += ch;
    i += 1;
  }

  if (inQuotes) {
    throw new CsvParseError(
      `Guillemets non équilibrés : guillemet ouvert ligne ${quoteStartLine} jamais refermé.`,
      quoteStartLine,
    );
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function isBlankRow(cells: string[]): boolean {
  return cells.every((c) => c.trim() === '');
}

/** Rend uniques les en-têtes dupliqués en suffixant `__2`, `__3`… */
function uniquifyHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((raw, idx) => {
    let name = raw;
    if (idx === 0) name = stripBom(name);
    name = name.trim();
    if (name === '') name = `colonne_${idx + 1}`;
    const key = name.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? name : `${name}__${n}`;
  });
}

/**
 * Parse un CSV en `{ headers, rows, delimiter }`.
 * La première ligne non vide fournit les en-têtes.
 * Les lignes entièrement vides sont ignorées.
 */
export function parseCsv(input: string): ParsedCsvResult {
  const text = stripBom(input);
  const delimiter = detectDelimiter(text);
  const matrix = scanRows(text, delimiter);

  const firstMeaningful = matrix.findIndex((r) => !isBlankRow(r));
  if (firstMeaningful === -1) {
    return { headers: [], rows: [], delimiter };
  }

  const headerCells = matrix[firstMeaningful];
  const headers = uniquifyHeaders(
    headerCells.map((h) => (h === '' ? '' : h)),
  );

  const rows: Record<string, string>[] = [];
  for (let r = firstMeaningful + 1; r < matrix.length; r += 1) {
    const cells = matrix[r];
    if (isBlankRow(cells)) continue;
    const record: Record<string, string> = {};
    for (let c = 0; c < headers.length; c += 1) {
      record[headers[c]] = cells[c] ?? '';
    }
    // Colonnes excédentaires non nommées : conservées pour diagnostic.
    for (let c = headers.length; c < cells.length; c += 1) {
      record[`colonne_${c + 1}__extra`] = cells[c];
    }
    rows.push(record);
  }

  return { headers, rows, delimiter };
}
