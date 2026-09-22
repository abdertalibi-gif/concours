// ============================================================
// Logger minimal : console + fichiers résumé / erreurs
// ============================================================

import { appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export class Logger {
  private errorLines: string[] = [];

  constructor(private logDir: string) {}

  info(message: string): void {
    console.log(message);
  }

  recordError(message: string, context?: unknown): void {
    const line = JSON.stringify({
      at: new Date().toISOString(),
      message,
      context: context ?? undefined,
    });
    this.errorLines.push(line);
    console.error(`  ✗ ${message}`);
  }

  persistErrors(tag: string): string | null {
    if (this.errorLines.length === 0) return null;
    const file = join(this.logDir, `errors-${tag}.jsonl`);
    appendFileSync(file, this.errorLines.join('\n') + '\n', 'utf-8');
    return file;
  }

  persistSummary(tag: string, content: string): string {
    const file = join(this.logDir, `summary-${tag}.txt`);
    writeFileSync(file, content, 'utf-8');
    return file;
  }
}