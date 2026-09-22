// scraper/parsers/pdf.ts — extracteur PDF (Phase 7, NO DB WRITE)
import { readFileSync } from 'node:fs';

export interface PdfExtraction {
  url: string;
  pageCount: number;
  text: string;
  isScanned: boolean;
  hasExploitableText: boolean;
  error?: string;
}

export async function downloadAndExtractPdf(url: string, timeout = 15000): Promise<PdfExtraction> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'ConcoursMaroc-Pilot-PDF/1.0' } } as any);
    clearTimeout(t);
    if (!res.ok) return { url, pageCount: 0, text: '', isScanned: false, hasExploitableText: false, error: `HTTP ${res.status}` };
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('pdf') && !url.toLowerCase().endsWith('.pdf')) {
      // still try
    }
    const buf = Buffer.from(await res.arrayBuffer());
    // pdf-parse dynamic import (ESM)
    let pdfParse: any;
    let PDFParse: any;
    try {
      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);
      const mod: any = require('pdf-parse');
      PDFParse = mod.PDFParse || mod.default?.PDFParse || mod;
      if (!PDFParse || typeof PDFParse !== 'function') throw new Error(`PDFParse not found, keys=${Object.keys(mod).join(',')}`);
    } catch (e:any) {
      return { url, pageCount: 0, text: '', isScanned: false, hasExploitableText: false, error: `pdf-parse load fail: ${e.message}` };
    }
    try {
      const parser = new PDFParse({ data: buf });
      const data: any = await parser.getText();
      const text = ((data as any)?.text || '').trim();
      const pageCount = (data as any)?.numpages || (data as any)?.total || 1;
      const isScanned = text.length < 80 || (text.length / pageCount) < 50;
      const hasExploitableText = !isScanned && text.length >= 80;
      return { url, pageCount, text, isScanned, hasExploitableText };
    } catch (e:any) {
      return { url, pageCount: 0, text: '', isScanned: false, hasExploitableText: false, error: `parse fail: ${e.message}` };
    }
  } catch (e:any) {
    clearTimeout(t);
    return { url, pageCount: 0, text: '', isScanned: false, hasExploitableText: false, error: e.message || String(e) };
  }
}

// Détection champs dans texte PDF avec evidence
export interface FieldEvidence {
  value: unknown;
  status: 'AUTO'|'REVIEW'|'MISSING'|'UNSUPPORTED';
  rawText?: string;
  page?: number;
  confidence?: string;
  reason?: string;
}

export function detectPlaces(text: string): FieldEvidence {
  // Cherche "Nombre de postes : 25" / "25 postes" / "20 places"
  // Évite "page 25", "article 25", "2025", "25 candidats par salle"
  const lines = text.split(/\n/);
  for (let i=0;i<lines.length;i++) {
    const line = lines[i].trim();
    // Pattern fort : "Nombre de postes : 25" / "Nombre de places : 25"
    let m = line.match(/(?:nombre\s+de\s+postes|nombre\s+de\s+places|postes\s*:\s*|places\s*:\s*)\s*(\d{1,3})\b/i);
    if (m) {
      const n = parseInt(m[1],10);
      if (n>=1 && n<=500) return { value: n, status: 'AUTO', rawText: line, page: 1, confidence: 'fort', reason: 'formulation explicite nombre de postes' };
    }
    // Pattern "25 postes" mais pas "par salle"
    m = line.match(/\b(\d{1,3})\s+(?:postes|places)\b/i);
    if (m && !/par\s+salle/i.test(line) && !/page\s+\d+/i.test(line)) {
      const n = parseInt(m[1],10);
      if (n>=1 && n<=500) {
        // Vérifie que le nombre n'est pas une année 2025
        if (n===2025 || n===2026) continue;
        return { value: n, status: 'AUTO', rawText: line, page: 1, confidence: 'moyen', reason: 'X postes/places' };
      }
    }
  }
  // Si plusieurs nombres possibles, REVIEW
  const allNums = [...text.matchAll(/\b(\d{1,3})\s+(?:postes|places)\b/gi)];
  if (allNums.length>1) return { value: null, status: 'REVIEW', reason: 'plusieurs nombres postes possibles' };
  return { value: null, status: 'MISSING', reason: 'aucun nombre de postes clairement associé' };
}

export function detectConditions(text: string): FieldEvidence {
  // Cherche section conditions
  const lower = text.toLowerCase();
  const markers = ['conditions d\'accès','conditions d’accès','conditions de candidature','conditions requises','profil requis','conditions d\'admission'];
  let start = -1;
  for (const m of markers) {
    const idx = lower.indexOf(m);
    if (idx!==-1) { start = idx; break; }
  }
  if (start===-1) return { value: null, status: 'MISSING', reason: 'section conditions non trouvée' };
  const snippet = text.slice(start, start+800);
  const lines = snippet.split(/\n/).map(s=>s.trim()).filter(Boolean).slice(1,6);
  const conds = lines.filter(l=> l.length>10 && l.length<200).map(l=> l.replace(/^[-•\d\.\)\s]+/, '').trim()).filter(Boolean);
  if (conds.length>=1) {
    return { value: conds, status: 'AUTO', rawText: snippet.slice(0,120), reason: 'section conditions identifiée' };
  }
  return { value: null, status: 'REVIEW', reason: 'conditions section trouvée mais extraction incertaine' };
}

export function detectMatieres(text: string): FieldEvidence {
  // Cherche matières
  const lower = text.toLowerCase();
  if (!lower.includes('matière') && !lower.includes('matiere') && !lower.includes('epreuve') && !lower.includes('épreuve')) {
    return { value: null, status: 'MISSING', reason: 'aucune mention matière/épreuve' };
  }
  // Tente d'extraire liste après "Matières:" ou "Épreuves:"
  const m = text.match(/(?:matières|matieres|épreuves|epreuves)\s*[:\-]\s*([^\n]{10,300})/i);
  if (m) {
    const raw = m[1].trim();
    const parts = raw.split(/[,;]/).map(s=>s.trim()).filter(Boolean);
    if (parts.length) return { value: parts, status: 'AUTO', rawText: m[0].slice(0,120), reason: 'liste matières/épreuves explicite' };
  }
  // Si mention générique sans liste
  return { value: null, status: 'REVIEW', reason: 'épreuves/matières mentionnées sans liste fiable' };
}

export function detectEpreuves(text: string): FieldEvidence {
  return detectMatieres(text); // même logique, le modèle attend epreuves[]
}

export function detectDatesWithContext(text: string): Record<string, FieldEvidence> {
  const result: Record<string, FieldEvidence> = {
    deadline: { value: null, status: 'MISSING', reason: 'non trouvé' },
    competitionDate: { value: null, status: 'MISSING', reason: 'non trouvé' },
    registrationStart: { value: null, status: 'MISSING', reason: 'non trouvé' },
    convocationDate: { value: null, status: 'MISSING', reason: 'non trouvé' },
    resultsDate: { value: null, status: 'MISSING', reason: 'non trouvé' }
  };
  const dateRe = /(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})|(\d{1,2})\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre)\s+(20\d{2})/gi;
  const lines = text.split(/\n/);
  for (const line of lines) {
    const low = line.toLowerCase();
    let m: RegExpExecArray | null;
    const re = new RegExp(dateRe.source, 'gi');
    while ((m = re.exec(line))) {
      const raw = m[0];
      let iso: string | null = null;
      try {
        // Normalise en ISO via Date parse simple
        if (m[1]) {
          const d = parseInt(m[1],10), mo = parseInt(m[2],10), y = parseInt(m[3],10);
          iso = new Date(y, mo-1, d).toISOString().slice(0,10);
        } else if (m[4]) {
          // Mois en lettre — approx
          const d = parseInt(m[4],10), y = parseInt(m[6],10);
          const months: Record<string,number> = { janvier:1, fevrier:2, mars:3, avril:4, mai:5, juin:6, juillet:7, aout:8, septembre:9, octobre:10, novembre:11, decembre:12, février:2, août:8 };
          const moStr = (m[5]||'').toLowerCase();
          const mo = months[moStr] || 1;
          iso = new Date(y, mo-1, d).toISOString().slice(0,10);
        }
      } catch {}
      if (!iso) continue;
      if (low.includes('date limite') || low.includes('dernier délai') || low.includes('clôture') || low.includes('cloture')) {
        if (!result.deadline.value) result.deadline = { value: iso, status: 'AUTO', rawText: line.trim().slice(0,100), reason: 'contexte deadline' };
        else result.deadline = { value: null, status: 'REVIEW', reason: 'plusieurs deadlines' };
      } else if (low.includes('concours') && (low.includes('date') || low.includes('épreuve'))) {
        if (!result.competitionDate.value) result.competitionDate = { value: iso, status: 'AUTO', rawText: line.trim().slice(0,100), reason: 'contexte concours' };
      } else if (low.includes('convocation')) {
        if (!result.convocationDate.value) result.convocationDate = { value: iso, status: 'AUTO', rawText: line.trim().slice(0,100), reason: 'contexte convocation' };
      } else if (low.includes('résultat') || low.includes('resultat')) {
        if (!result.resultsDate.value) result.resultsDate = { value: iso, status: 'AUTO', rawText: line.trim().slice(0,100), reason: 'contexte résultats' };
      } else if (low.includes('inscription') || low.includes('dépôt') || low.includes('ouverture')) {
        if (!result.registrationStart.value) result.registrationStart = { value: iso, status: 'AUTO', rawText: line.trim().slice(0,100), reason: 'contexte inscription' };
      } else {
        // Date sans contexte → REVIEW
      }
    }
  }
  // Si date sans contexte, on laisse MISSING
  return result;
}

export function detectDocuments(text: string): FieldEvidence {
  const lower = text.toLowerCase();
  const markers = ['pièces demandées','pieces demandees','dossier','documents','pièces à fournir'];
  for (const m of markers) {
    if (lower.includes(m)) {
      const idx = lower.indexOf(m);
      const snippet = text.slice(idx, idx+600);
      const lines = snippet.split(/\n/).map(s=>s.trim()).filter(l=> l.length>10).slice(1,6);
      if (lines.length) return { value: lines, status: 'AUTO', rawText: snippet.slice(0,120), reason: 'liste pièces identifiée' };
    }
  }
  return { value: null, status: 'MISSING', reason: 'pièces non listées explicitement' };
}
