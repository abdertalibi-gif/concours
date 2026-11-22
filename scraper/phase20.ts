/*
 * Phase 20: Official Sources Expansion + Multi-Source Competition Discovery
 * 
 * NOTES:
 * - Preserve existing Concours form contract (no modifications)
 * - Preserve existing BulkImportModal (no modifications)
 * - Preserve existing Admin Direct Import architecture
 * - NO AI/LLM/Agent in pipeline
 * - NO database writes (localStorage, Supabase, server/data)
 * - Bounded discovery limits per source
 * - Output: scraper/output/phase20-*.json and .txt
 * - Admin import file: only IMPORTABLE records
 */

// ============================================================
// TYPES & CONSTANTS
// ============================================================

import type { SourceMeta } from './registry';
import { OFFICIAL_SOURCES } from './registry';
import { mapToCompetition } from './mappers/competitionMapper';
import type { ScrapedItem } from '../lib/types';
import type { ValidatedPayload, FieldMeta, FieldStatus } from './mappers/types';
import { resolveOrganismeWithRefs } from '../organismeResolver';
import { EMPTY_REFS } from '../types';

// Limits par source (contrôlés, pas mass scraping)
const SOURCE_LIMITS = {
  maxPages: 20,        // nombre maximum de pages HTML à visiter
  maxPDFs: 10,         // nombre maximum de PDFs à télécharger
  maxTotalPages: 50,   // nombre total de pages across all sources
  timeoutMs: 30000,    // timeout par page/PDF en ms
};

// Statuts de candidat
const CANDIDATE_STATUSES = {
  IMPORTABLE: 'IMPORTABLE',
  REVIEW: 'REVIEW',
  BLOCKED: 'BLOCKED',
  NOT_A_COMPETITION: 'NOT_A_COMPETITION',
};

// Types de découverte
type PageType = 'HTML' | 'PDF';
type DiscoveryResult = {
  sourceId: string;
  sourceName: string;
  pagesVisited: number;
  pdfsDownloaded: number;
  candidates: Candidate[];
  status: 'success' | 'error';
  error?: string;
};

type Candidate = {
  id: string; // source URL + title hash
  title: string;
  sourceUrl: string;
  page: number;
  extracted: ScrapedItem;
  status: string; // IMPORTABLE | REVIEW | BLOCKED | NOT_A_COMPETITION
  statusReason: string;
  evidence: {
    raw: string;
    normalized: Record<string, unknown>;
    resolved?: Record<string, unknown>;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  };
};

// ============================================================
// DISCOVERY UTILITIES
// ============================================================

/**
 * Extrait les liens de concours depuis une page HTML
 * Recherche les motifs: concours, recrutement, mariage, épreuves, etc.
 */
function extractCompetitionLinks(html: string, baseUrl: string): Array<{ url: string; title: string; context: string }> {
  const links: Array<{ url: string; title: string; context: string }> = [];
  const lowered = html.toLowerCase();
  
  // Motifs de recherche de liens de concours
  const patterns = [
    /href=["'][^"']*["'][^>]*>(?:[^<]*concours[^<]*)/i,
    /href=["'][^"']*["'][^>]*>(?:[^<]*recrutement[^<]*)/i,
    /href=["'][^"']*["'][^>]*>(?:[^<]*mariage[^<]*)/i,
    /href=["'][^"']*["'][^>]*>(?:[^<]*bataille[^<]*)/i,
  ];
  
  // Simple extraction: find all <a> hrefs containing competition-related text
  const parser = new DOMParser();
  try {
    const doc = parser.parseFromString(html, 'text/html');
    const anchors = doc.querySelectorAll('a');
    
    for (const anchor of anchors) {
      const href = anchor.getAttribute('href');
      const text = anchor.textContent?.trim();
      if (!href || !text) continue;
      
      const lowerText = text.toLowerCase();
      const competitionKeywords = ['concours', 'recrutement', 'match', 'bataille', 'match', 'tournoi'];
      const isCompetitionRelated = competitionKeywords.some(k => lowerText.includes(k));
      
      if (isCompetitionRelated && text.length > 5 && text.length < 200) {
        // Construire l'URL absolue
        let absoluteUrl = href;
        try {
          const url = new URL(href, baseUrl);
          absoluteUrl = url.href;
        } catch {
          // Relative URL - garder tel quel si déjà absolu
          if (!href.startsWith('http')) {
            absoluteUrl = baseUrl + '/' + href;
          }
        }
        
        links.push({
          url: absoluteUrl,
          title: text,
          context: lowerText.substring(0, 100),
        });
      }
    }
  } catch {
    // DOMParser failed - fallback pattern matching
  }
  
  return links;
}

/**
 * Détermine le statut d'un candidat extrait
 */
function classifyCandidate(
  item: ScrapedItem,
  formFieldSpecs: Record<string, any>,
  refs: any
): { status: string; reason: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } {
  // Vérifier les champs REQUIRES du formulaire
  const requiredFields = ['title', 'organizationName', 'places', 'description', 'organizationType'];
  const missing = requiredFields.filter(f => !item[f]);
  
  if (missing.length > 0) {
    // Si des champs requis sont totalement absents → BLOCKED
    // Mais si seulement quelques champs manquent, on peut quand même extraire ce qui reste
    const hasEssential = ['title', 'organizationName'].some(f => item[f]);
    if (!hasEssential) {
      return { status: 'BLOCKED', reason: `Champs requis manquants: ${missing.join(', ')}`, confidence: 'HIGH' };
    }
    // Sinon, on peut extraire partiellement → REVIEW
    return { status: 'REVIEW', reason: `Champs requis partiellement présents: ${missing.join(', ')}`, confidence: 'MEDIUM' };
  }
  
  // Vérifier organizationType
  if (!item.organizationType || !['MINISTERE', 'ECOLE', 'INSTITUTION'].includes(item.organizationType)) {
    return { status: 'REVIEW', reason: `organizationType invalide ou manquant: ${item.organizationType}`, confidence: 'MEDIUM' };
  }
  
  // Vérifier places
  if (item.places === null || item.places === undefined || item.places < 1) {
    return { status: 'REVIEW', reason: `places invalide ou manquant: ${item.places}`, confidence: 'MEDIUM' };
  }
  
  // Vérifier description (doit faire minimum 50 caractères selon la form)
  if (item.description && item.description.length < 50) {
    return { status: 'REVIEW', reason: `description trop courte (${item.description.length} chars)`, confidence: 'MEDIUM' };
  }
  
  // Vérifier matieres/epreuves/documentsDemandes
  if (!item.matieres && !item.epreuves && !item.documentsDemandes) {
    return { status: 'REVIEW', reason: 'Aucun contenu pédagogique (matieres/epreuves/documentsDemandes)', confidence: 'LOW' };
  }
  
  // Tous les champs requis présents et valides → IMPORTABLE
  return { status: 'IMPORTABLE', reason: 'Tous les champs requis présents et valides', confidence: 'HIGH' };
}

// ============================================================
// SOURCE DISCOVERY PIPELINE
// ============================================================

/**
 * Découvre les competitions depuis une source officielle
 * Avec des limites strictement contrôlées
 */
async function discoverSource(
  source: SourceMeta,
  limits: typeof SOURCE_LIMITS
): Promise<DiscoveryResult> {
  const candidates: Candidate[] = [];
  let pagesVisited = 0;
  let pdfsDownloaded = 0;
  let error: string | undefined;
  
  console.log(`🔍 Discovery source: ${source.sourceId} (${source.name})`);
  
  try {
    // Visiter la page de découverte d'abord
    const discoveryUrl = source.discoveryUrl || source.baseUrl;
    const discoveryHtml = await fetchPage(discoveryUrl, limits.timeoutMs);
    if (!discoveryHtml) {
      return { 
        sourceId: source.sourceId, 
        sourceName: source.name, 
        pagesVisited: 0, 
        pdfsDownloaded: 0, 
        candidates: [],
        status: 'error',
        error: 'Impossible de récupérer la page de découverte'
      };
    }
    
    pagesVisited++;
    
    // Extraire les liens de concours
    const links = extractCompetitionLinks(discoveryHtml, source.baseUrl);
    console.log(`  📄 ${links.length} liens de concours trouvés`);
    
    // Traiter chaque lien avec des limites
    for (let i = 0; i < Math.min(links.length, limits.maxPages); i++) {
      const link = links[i];
      
      try {
        // Empêcher les boucles infinies - vérifier si déjà visité
        const alreadyVisited = candidates.some(c => c.sourceUrl === link.url);
        if (alreadyVisited) continue;
        
        const pdf = await fetchPage(link.url, limits.timeoutMs);
        if (!pdf) {
          candidates.push({
            id: hashUrl(link.url),
            title: link.title || 'Concours inconnu',
            sourceUrl: link.url,
            page: pagesVisited,
            extracted: {},
            status: 'NOT_A_COMPETITION',
            statusReason: 'Page inaccessible ou format non supporté',
            evidence: {
              raw: '',
              normalized: {},
              confidence: 'LOW',
              reason: 'Page inaccessible'
            }
          });
          pagesVisited++;
          continue;
        }
        
        pagesVisited++;
        
        // Détecter le type de contenu
        const isPDF = link.url.toLowerCase().endsWith('.pdf') || 
                      (pdf && pdf.includes('%PDF'));
        
        let extracted: ScrapedItem;
        
        if (isPDF) {
          pdfsDownloaded++;
          // Extraire le texte d'un PDF (simulé - en vrai utiliser pdf-parse)
          // Pour l'instant, on extrait ce qu'on peut du HTML ou du texte du PDF
          extracted = extractTextFromPdfContent(pdf);
        } else {
          extracted = extractFromHtmlContent(pdf || html);
        }
        
        // Classer le candidat
        const classification = classifyCandidate(extracted, {}, EMPTY_REFS);
        
        candidates.push({
          id: hashUrl(link.url),
          title: link.title || extracted.title || 'Concours extrait',
          sourceUrl: link.url,
          page: pagesVisited,
          extracted,
          status: classification.status,
          statusReason: classification.reason,
          evidence: {
            raw: link.title || pdf?.substring(0, 500) || '',
            normalized: { ...extracted },
            resolved: classification.status === 'IMPORTABLE' ? await resolveReference(extracted) : undefined,
            confidence: classification.confidence,
            reason: classification.reason
          }
        });
      } catch (e) {
        console.error(`  ❌ Erreur sur ${link.url}:`, e.message);
        candidates.push({
          id: hashUrl(link.url),
          title: link.title || 'Concours erreur',
          sourceUrl: link.url,
          page: pagesVisited,
          extracted: {},
          status: 'ERROR',
          statusReason: e.message,
          evidence: {
            raw: '',
            normalized: {},
            confidence: 'LOW',
            reason: 'Erreur lors de l extraction'
          }
        });
      }
    }
    
  } catch (e) {
    error = e.message;
    console.error(`  ❌ Erreur découverte source ${source.sourceId}:`, e);
  }
  
  return {
    sourceId: source.sourceId,
    sourceName: source.name,
    pagesVisited,
    pdfsDownloaded,
    candidates,
    status: error ? 'error' : 'success',
    error,
  };
}

/**
 * Extrait les données concoures depuis du contenu HTML
 */
function extractFromHtmlContent(html: string): ScrapedItem {
  const item: ScrapedItem = {
    title: '',
    organization: '',
    university: '',
    establishment: '',
    city: '',
    region: '',
    domain: '',
    level: '',
    academicYear: '',
    description: '',
    conditions: [],
    documents: [],
    places: null,
    openingDate: '',
    deadlineDate: '',
    examDate: '',
    resultsDate: '',
    officialUrl: '',
    registrationUrl: '',
    sourceUrl: '',
    category: '',
    source: '',
    publishedAt: '',
  };
  
  // Extraire le titre (recherche heuristique)
  const titleMatch = html.match(/<[^>]*title[^>]*>[^<]*<\/[^>]*>/i);
  if (titleMatch) {
    item.title = stripHtmlTags(titleMatch[0]);
  }
  
  // Extraire les champs clés avec des expressions rationnelles
  const extractField = (pattern: string, fallback: string = ''): string => {
    const match = html.match(new RegExp(pattern, 'i'));
    return match ? stripHtmlTags(match[0]) : fallback;
  };
  
  item.organization = extractField(/organisme[^<]*<[^>]*>([^<]*)<\/[^>]*>/i);
  item.establishment = extractField(/facult[^<]*|établiss[^<]*|facult[^<]*/i);
  item.city = extractField(/ville[^<]*>([^<]*)<\/[^>]*>/i);
  item.region = extractField(/région[^<]*>([^<]*)<\/[^>]*>/i);
  item.domain = extractField(/domaine[^<]*>([^<]*)<\/[^>]*>/i);
  item.level = extractField(/niveau[^<]*>([^<]*)<\/[^>]*>/i);
  item.academicYear = extractField(/année[^<]*>([^<]*)<\/[^>]*>/i| /année universitaire[^<]*>([^<]*)<\/[^>]*>/i);
  item.places = extractNumberField(/places[^<]*>([^<]*)<\/[^>]*>/i);
  item.description = extractField(/description[^<]*>([\s\S]{50,200})<\/[^>]*>/i);
  item.officialUrl = extractField(/site officiel[^<]*>([^<]*)<\/[^>]*>/i| /url[^<]*>([^<]*)<\/[^>]*>/i);
  item.registrationUrl = extractField(/inscription[^<]*>([^<]*)<\/[^>]*>/i| /url d\'inscription[^<]*>([^<]*)<\/[^>]*>/i);
  item.sourceUrl = extractField(/source[^<]*>([^<]*)<\/[^>]*>/i| /lien source[^<]*>([^<]*)<\/[^>]*>/i);
  
  return item;
}

/**
 * Extrait le texte d'un PDF (simulé - en vrai utiliser pdf-parse)
 */
function extractTextFromPdfContent(pdfContent: string): ScrapedItem {
  const item: ScrapedItem = {
    title: 'Concours extrait du PDF',
    organization: '',
    establishment: '',
    city: '',
    region: '',
    domain: '',
    level: '',
    academicYear: '',
    description: '',
    conditions: [],
    documents: [],
    places: null,
    openingDate: '',
    deadlineDate: '',
    examDate: '',
    resultsDate: '',
    officialUrl: '',
    registrationUrl: '',
    sourceUrl: '',
    category: '',
    source: '',
    publishedAt: '',
  };
  
  // Extraire quelques motifs de base du texte du PDF
  const text = pdfContent.substring(0, 2000);
  
  const titleMatch = text.match(/concours[^\n]{10,200}/i);
  if (titleMatch) item.title = titleMatch[0].substring(0, 150);
  
  const placesMatch = text.match(/places?\s*[:=]\s*(\d+)/i);
  if (placesMatch) item.places = parseInt(placesMatch[1]);
  
  const dateMatch = text.match(/année\s*[:=]\s*(\d{4})/i);
  if (dateMatch) item.academicYear = dateMatch[1];
  
  return item;
}

// ============================================================
// CORE PIPELINE: Process a single candidate
// ============================================================

/**
 * Traite un candidat extrait et génère le payload compatible avec le formulaire Admin
 */
async function processCandidate(
  candidate: Candidate,
  source: SourceMeta
): Promise<Candidate> {
  const { extracted } = candidate;
  
  // 1. mapper vers le format Competition via le mapper existant
  let payload: ValidatedPayload;
  try {
    payload = mapToCompetition(extracted as unknown as ScrapedItem);
  } catch (e) {
    console.error('  ❌ Erreur mapToCompetition:', e.message);
    candidate.status = 'BLOCKED';
    candidate.statusReason = 'Erreur mapper: ' + (e as Error).message;
    return candidate;
  }
  
  // 2. Vérifier que le payload a les champs requis
  const requiredFormFields = ['title', 'organizationName', 'places', 'description', 'organizationType'];
  const missing = requiredFormFields.filter(f => !payload.payload[f]);
  
  if (missing.length > 0 && !['title', 'organizationName'].some(m => payload.payload[m])) {
    candidate.status = 'BLOCKED';
    candidate.statusReason = `Champs requis manquants: ${missing.join(', ')}`;
    return candidate;
  }
  
  // 3. Résolution des références d'organisme
  if (payload.fields.organizationName?.resolved || payload.fields.schoolId?.resolved) {
    // Les références ont été résolues avec succès
    candidate.evidence.resolved = payload.fields.organizationName?.resolved || payload.fields.schoolId?.resolved;
  } else {
    // Essayer de résoudre avec refs existants
    const orgRefs = { schools: [], universities: [], ministries: [] };
    const resolution = resolveOrganismeWithRefs(orgRefs, {
      organizationName: extracted.organizationName || '',
      title: extracted.title || '',
      description: extracted.description || '',
      sourceUrl: extracted.sourceUrl || '',
      officialWebsite: extracted.officialUrl || '',
    });
    
    if (resolution.requiresManualSelection) {
      candidate.status = 'REVIEW';
      candidate.statusReason = 'Organisme non résolu de façon univoque - administration requise';
      candidate.evidence.resolved = resolution;
    } else {
      candidate.evidence.resolved = resolution;
      candidate.status = 'IMPORTABLE';
      candidate.statusReason = 'Organisme résolu avec succès';
    }
  }
  
  // 4. Mettre à jour le statut final
  if (candidate.status !== 'BLOCKED' && candidate.status !== 'REVIEW') {
    candidate.status = 'IMPORTABLE';
    candidate.statusReason = 'Extraction et validation réussies';
  }
  
  return candidate;
}

// ============================================================
// DÉDUPLICATION
// ============================================================

/**
 * Vérifie si un candidat est en doublon avec un autre
 */
function isDuplicate(
  candidate: Candidate,
  existing: Candidate
): boolean {
  // Comparer title + organizationName + year (si disponible)
  const titleMatch = candidate.extracted.title?.toLowerCase() === existing.extracted.title?.toLowerCase();
  const orgMatch = candidate.extracted.organizationName?.toLowerCase() === existing.extracted.organizationName?.toLowerCase();
  
  return titleMatch && orgMatch;
}

// ============================================================
// GÉNÉRATION DE SORTIES
// ============================================================

/**
 * Génère le fichier de JSON de découverte Phase 20
 */
function generateDiscoveryJson(
  results: DiscoveryResult[],
  limits: typeof SOURCE_LIMITS
): any {
  const totalCandidates = results.reduce((sum, r) => sum + r.candidates.length, 0);
  const statusCounts: Record<string, number> = {
    IMPORTABLE: 0,
    REVIEW: 0,
    BLOCKED: 0,
    NOT_A_COMPETITION: 0,
  };
  
  results.forEach(r => {
    r.candidates.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });
  });
  
  return {
    phase: 20,
    generatedAt: new Date().toISOString(),
    limits,
    sourcesVisited: results.length,
    pagesVisited: results.reduce((sum, r) => sum + r.pagesVisited, 0),
    candidatesFound: totalCandidates,
    summary: {
      sourcesVisited: results.length,
      pagesVisited: results.reduce((sum, r) => sum + r.pagesVisited, 0),
      candidatesFound: totalCandidates,
      importable: statusCounts.IMPORTABLE,
      review: statusCounts.REVIEW,
      blocked: statusCounts.BLOCKED,
      notCompetition: statusCounts.NOT_A_COMPETITION,
      duplicates: 0, // à calculer après analyse ultérieure
    },
    sources: results.map(r => ({
      sourceId: r.sourceId,
      sourceName: r.sourceName,
      pagesVisited: r.pagesVisited,
      pdfsDownloaded: r.pdfsDownloaded,
      status: r.status,
      error: r.error,
    }),
    candidates: results.flatMap(r => r.candidates),
  };
}

/**
 * Génère le fichier d'import Admin (uniquement IMPORTABLE)
 */
function generateAdminImportJson(candidates: Candidate[]): any {
  const importable = candidates.filter(c => c.status === 'IMPORTABLE');
  
  const records = importable.map(c => {
    const payload = c.extracted;
    // Ne garder que les champs compatibles avec le formulaire Admin
    const filtered: Record<string, any> = {
      title: payload.title,
      organizationName: payload.organizationName,
      organizationType: payload.organizationType,
      category: payload.category,
      year: payload.year,
      level: payload.level,
      city: payload.city,
      region: payload.region,
      domaine: payload.domaine,
      places: payload.places,
      description: payload.description,
      conditions: payload.conditions?.join ? payload.conditions.join('\n') : payload.conditions,
      epreuves: payload.epreuves?.join ? payload.epreuves.join('\n') : payload.epreuves,
      matieres: payload.matieres?.join ? payload.matieres.join(', ') : payload.matieres,
      documentsDemandes: payload.documentsDemandes?.join ? payload.documentsDemandes.join('\n') : payload.documentsDemandes,
      registrationStart: payload.registrationStart,
      registrationDeadline: payload.registrationDeadline,
      competitionDate: payload.competitionDate,
      resultsDate: payload.resultsDate,
      officialWebsite: payload.officialWebsite,
      registrationUrl: payload.registrationUrl,
      sourceUrl: payload.sourceUrl,
      sourceOrganization: payload.sourceOrganization,
      category: payload.category,
    };
    
    // Ajouter les champs générés (slug, id, etc.)
    filtered.slug = payload.slug || generateSlug(payload.title, payload.year);
    filtered.id = payload.id || generateId();
    filtered.publishStatus = payload.publishStatus || 'DRAFT';
    filtered.verificationStatus = payload.verificationStatus || 'UNVERIFIED';
    filtered.publishedAt = payload.publishedAt || new Date().toISOString();
    filtered.views = payload.views || 0;
    filtered.isDemo = payload.isDemo || false;
    filtered.createdAt = payload.createdAt || new Date().toISOString();
    filtered.updatedAt = payload.updatedAt || new Date().toISOString();
    
    return filtered;
  });
  
  return {
    phase: 20,
    generatedAt: new Date().toISOString(),
    totalCandidates: candidates.length,
    importableCount: importable.length,
    records,
  };
}

// ============================================================
// UTILITAIRES
// ============================================================

function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .trim();
}

function extractNumberField(pattern: string): number | null {
  const match = pattern.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function generateSlug(title: string, year: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '') +
    '-' + year;
}

function generateId(): string {
  return 'c_' + Math.random().toString(36).substring(2, 11);
}

function hashUrl(url: string): string {
  // Hash simple pour l'identification de doublons
  return 'c_' + btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
}

// ==========================================================//
// EXPORT POUR LA PHASE 20
// ============================================================

/**
 * Exécute la découverte Phase 20 sur une liste de sources
 */
export async function runPhase20Discovery(
  selectedSources: SourceMeta[],
  customLimits?: typeof SOURCE_LIMITS
): Promise<{
  discoveryJson: any;
  adminImportJson: any;
  logs: string[];
}> {
  const limits = customLimits || SOURCE_LIMITS;
  const results: DiscoveryResult[] = [];
  const logs: string[] = [];
  
  for (const source of selectedSources) {
    try {
      const result = await discoverSource(source, limits);
      results.push(result);
      
      // Classifier les candidats
      for (const candidate of result.candidates) {
        await processCandidate(candidate, source);
      }
      
      logs.push(`✅ ${source.sourceId}: ${result.pagesVisited} pages, ${result.pdfsDownloaded} PDFs, ${result.candidates.length} candidats`);
    } catch (e) {
      logs.push(`❌ ${source.sourceId}: Erreur - ${(e as Error).message}`);
      results.push({
        sourceId: source.sourceId,
        sourceName: source.name,
        pagesVisited: 0,
        pdfsDownloaded: 0,
        candidates: [],
        status: 'error',
        error: (e as Error).message,
      });
    }
  }
  
  // Classifier tous les candidats qui ne l'ont pas encore été
  for (const result of results) {
    for (const candidate of result.candidates) {
      if (candidate.status === 'REVIEW' || candidate.status === 'BLOCKED' || candidate.status === 'NOT_A_COMPETITION') {
        // Classifier davantage si nécessaire
        // (le classifyCandidate ci-dessus a déjà été appelé dans discoverSource)
      }
    }
  }
  
  // Générer les fichiers de sortie
  const discoveryJson = generateDiscoveryJson(results, limits);
  const adminImportJson = generateAdminImportJson(results.flatMap(r => r.candidates));
  
  return { discoveryJson, adminImportJson, logs };
}

// ============================================================
// EXÉCUTION EXEMPLE: 5 sources de test
// ============================================================

// Sources prioritaires pour la Phase 20 (5 sources couvrant différentes régions)
const PHASE20_SOURCES = [
  OFFICIAL_SOURCES.find(s => s.sourceId === 'univ-um5'),           // UM5 - Rabat (regression)
  OFFICIAL_SOURCES.find(s => s.sourceId === 'univ-uca'),           // UCA - Marrakech (déjà testé)
  OFFICIAL_SOURCES.find(s => s.sourceId === 'univ-usmba'),         // Fès
  OFFICIAL_SOURCES.find(s => s.sourceId === 'min-education'),      // Ministère de l'Éducation
  OFFICIAL_SOURCES.find(s => s.sourceId === 'min-sante'),          // Ministère de la Santé
].filter(Boolean) as SourceMeta[];

// Exécution (à décommenter dans un environnement de test)
// runPhasePhase20Discovery(PHASE20_SOURCES).then(({ discoveryJson, adminImportJson, logs }) => {
//   // Écrire les fichiers de sortie
//   const fs = require('fs');
//   fs.writeFileSync('scraper/output/phase20-competition-discovery-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json', JSON.stringify(discoveryJson, null, 2));
//   fs.writeFileSync('scraper/logs/phase20-competition-discovery-' + new Date().toISOString().replace(/[:.]/g, '-') + '.txt', logs.join('\n'));
//   fs.writeFileSync('scraper/output/phase20-admin-import-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json', JSON.stringify(adminImportJson, null, 2));
//   
//   console.log('📤 Fichiers générés:');
//   console.log('  - scraper/output/phase20-competition-discovery-*.json');
//   console.log('  - scraper/logs/phase20-competition-discovery-*.txt');
//   console.log('  - scraper/output/phase20-admin-import-*.json (uniquement IMPORTABLE)');
// }).catch(e => console.error('Erreur Phase 20:', e));