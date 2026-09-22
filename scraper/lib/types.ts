// ============================================================
// Scraper indépendant — Types partagés
// Format NEUTRE : compatible avec les futures structures
// Competition / MasterItem du site, mais sans aucune dépendance.
// ============================================================

/** Annonce brute extraite d'une source (avant normalisation). */
export interface FeedEntryMeta {
  sourceUrl: string;
  title: string;
  publishedAt?: string;
  tags: string[];
  contentHtml: string;
  contentText: string;
  links: string[];
}

/** Donnée structurée (sortie du scraper, un par concours/master). */
export interface ScrapedItem {
  title: string;
  organization?: string;
  university?: string;
  establishment?: string;
  city?: string;
  region?: string;
  domain?: string;
  level?: string;
  academicYear?: string;
  description?: string;
  conditions?: string[];
  documents?: string[];
  places?: number;
  openingDate?: string;
  deadlineDate?: string;
  examDate?: string;
  resultsDate?: string;
  officialUrl?: string;
  registrationUrl?: string;
  sourceUrl: string;
  category?: string;
  source: string;
  publishedAt?: string;
  originalTitle?: string;
  tags?: string[];
  fingerprint: string;
  scrapedAt: string;
}

/** Brouillon intermédiaire produit par une source avant finalisation. */
export interface ItemDraft {
  title: string;
  organization?: string;
  university?: string;
  establishment?: string;
  city?: string;
  region?: string;
  domain?: string;
  level?: string;
  academicYear?: string;
  description?: string;
  conditions?: string[];
  documents?: string[];
  places?: number;
  openingDate?: string;
  deadlineDate?: string;
  examDate?: string;
  resultsDate?: string;
  officialUrl?: string;
  registrationUrl?: string;
  sourceUrl: string;
  category?: string;
  publishedAt?: string;
  originalTitle?: string;
  tags?: string[];
}

export interface ScrapeOptions {
  limit: number;
  delayMs: number;
}

export interface ScrapeResult {
  entries: FeedEntryMeta[];
  pagesAnalyzed: number;
  errors: string[];
}

export interface SourceRunner {
  name: string;
  label: string;
  baseUrl: string;
  scrape(opts: ScrapeOptions): Promise<ScrapeResult>;
}