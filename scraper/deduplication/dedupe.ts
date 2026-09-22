// ============================================================
// Déduplication persistante basée sur un fingerprint
// (slug(titre)|slug(organisme)|année).
// - intra-run : évite les doublons dans une même exécution
// - inter-run : mémorise dans scraper/state/fingerprints.json
//   (option --refresh pour ignorer la mémoire inter-run)
// ============================================================

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface FingerprintRecord {
  sourceUrl: string;
  seenAt: string;
}

export class Deduplicator {
  private seen = new Map<string, FingerprintRecord>();
  private run = new Set<string>();

  constructor(private stateDir: string) {
    const file = join(stateDir, 'fingerprints.json');
    try {
      const data = JSON.parse(readFileSync(file, 'utf-8')) as Record<
        string,
        FingerprintRecord
      >;
      for (const [key, value] of Object.entries(data)) this.seen.set(key, value);
    } catch {
      // état absent ou corrompu → on repart de zéro
    }
  }

  /**
   * Vérifie et (si nouveau) enregistre un fingerprint.
   * Retourne true si l'item est un doublon à ignorer.
   */
  isDuplicate(fingerprint: string, sourceUrl: string, refresh: boolean): boolean {
    if (this.run.has(fingerprint)) return true;
    if (!refresh && this.seen.has(fingerprint)) return true;
    this.run.add(fingerprint);
    this.seen.set(fingerprint, { sourceUrl, seenAt: new Date().toISOString() });
    return false;
  }

  /** Persiste l'état (union historique + run courant). */
  save(): void {
    mkdirSync(this.stateDir, { recursive: true });
    const obj: Record<string, FingerprintRecord> = {};
    for (const [key, value] of [...this.seen.entries()].sort()) obj[key] = value;
    writeFileSync(join(this.stateDir, 'fingerprints.json'), JSON.stringify(obj, null, 2), 'utf-8');
  }
}