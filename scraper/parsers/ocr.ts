// OCR adapter - isolated OCR engine wrapper for Phase 13
// PREVIEW ONLY - NO DB WRITE, no modification of existing parsers
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync, readdirSync } from 'node:fs';
import { execFile } from 'node:child_process';

export interface OcrPageResult {
  page: number;
  text: string;
  confidence?: number;
}

export interface OcrResult {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  pages: OcrPageResult[];
  warnings: string[];
}

interface TesseractWorker {
  recognize: (image: string) => Promise<{ data: { text: string; confidence: number } }>;
  terminate: () => Promise<void>;
}

let _worker: TesseractWorker | null = null;
let _initPromise: Promise<TesseractWorker> | null = null;

async function getWorker(): Promise<TesseractWorker> {
  if (_worker) return _worker;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const tesseract = await import('tesseract.js');
    const worker = await tesseract.createWorker('ara+fra+eng');
    const wrapped: TesseractWorker = {
      async recognize(image) {
        const result = await worker.recognize(image);
        return { data: { text: result.data.text, confidence: result.data.confidence } };
      },
      async terminate() {
        await worker.terminate();
      }
    };
    _worker = wrapped;
    return wrapped;
  })();
  return _initPromise;
}

export async function ocrPdf(pdfPathOrUrl: string, maxPages: number = 2, dpi: number = 150): Promise<OcrResult> {
  const warnings: string[] = [];
  let worker: TesseractWorker | null = null;
  try {
    let pdfBuffer: Buffer;
    if (pdfPathOrUrl.startsWith('http')) {
      const res = await fetch(pdfPathOrUrl, { headers: { 'User-Agent': 'ConcoursMaroc-Pilot-PDF/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      pdfBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      const fs = await import('node:fs');
      pdfBuffer = fs.readFileSync(pdfPathOrUrl);
    }

    const tmpDir = join(tmpdir(), 'ocr-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    mkdirSync(tmpDir, { recursive: true });

    const pdftoppm = 'C:\\Users\\Abde\\AppData\\Local\\Programs\\MiKTeX\\miktex\\bin\\x64\\pdftoppm.exe';

    await new Promise<void>((resolve, reject) => {
      const args = ['-png', '-r', String(dpi), '-', join(tmpDir, 'page')];
      const child = execFile(pdftoppm, args, { maxBuffer: 1024 * 1024 * 20 }, (err) => {
        if (err) return reject(new Error('pdftoppm failed: ' + err.message));
        resolve();
      });
      child.stdin?.write(pdfBuffer);
      child.stdin?.end();
    });

    const imageFiles = readdirSync(tmpDir).filter(f => f.endsWith('.png')).sort();
    const limited = maxPages > 0 ? imageFiles.slice(0, maxPages) : imageFiles;
    if (limited.length === 0) {
      rmSync(tmpDir, { recursive: true, force: true });
      return { status: 'FAILED', pages: [], warnings: ['pdftoppm produced no images'] };
    }

    worker = await getWorker();
    const pages: OcrPageResult[] = [];
    for (let i = 0; i < limited.length; i++) {
      const pageNum = i + 1;
      const imgPath = join(tmpDir, limited[i]);
      try {
        const result = await worker.recognize(imgPath);
        const text = result.data.text || '';
        const confidence = result.data.confidence ?? 0;
        pages.push({ page: pageNum, text, confidence });
        if (confidence < 50) warnings.push(`page ${pageNum} low confidence: ${confidence}`);
      } catch (e: any) {
        warnings.push(`page ${pageNum} OCR failed: ${e.message}`);
        pages.push({ page: pageNum, text: '', confidence: 0 });
      }
    }

    await worker.terminate();
    _worker = null;
    _initPromise = null;
    rmSync(tmpDir, { recursive: true, force: true });

    const hasText = pages.some(p => p.text.trim().length > 0);
    const avgConf = pages.length ? pages.reduce((s, p) => s + (p.confidence || 0), 0) / pages.length : 0;
    let status: OcrResult['status'] = hasText ? (avgConf >= 50 ? 'SUCCESS' : 'PARTIAL') : 'FAILED';
    if (warnings.some(w => w.includes('low confidence'))) status = 'PARTIAL';

    return { status, pages, warnings };
  } catch (e: any) {
    if (worker) { try { await worker.terminate(); } catch {} _worker = null; _initPromise = null; }
    return { status: 'FAILED', pages: [], warnings: ['OCR pipeline error: ' + (e.message || String(e))] };
  }
}

export async function ocrPdfTargeted(pdfPathOrUrl: string): Promise<OcrResult> {
  return ocrPdf(pdfPathOrUrl, 1, 150);
}

export function normalizeArabicDigits(input: string): string {
  const map: Record<string, string> = {
    '\u0660': '0', '\u0661': '1', '\u0662': '2', '\u0663': '3', '\u0664': '4',
    '\u0665': '5', '\u0666': '6', '\u0667': '7', '\u0668': '8', '\u0669': '9',
  };
  return input.replace(/[\u0660-\u0669]/g, (ch) => map[ch] || ch);
}

export { getWorker };
