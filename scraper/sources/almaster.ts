// ============================================================
// Source : Almaster Maroc (https://www.almaster-maroc.com)
// Récupération via le flux Atom JSON de Blogger.
//   GET /feeds/posts/default?alt=json&max-results=150&start-index=N
// Pagination : boucle sur start-index jusqu'à la limite demandée.
// Extraction : titre, tags, contenu HTML → texte + liens, dates FR.
// ============================================================

import { fetchWithRetry, sleep } from '../lib/fetch';
import { parseHtml } from '../parsers/html';
import { extractDates } from '../parsers/dates';
import { cleanTitle, normalizeStr } from '../normalizers/normalize';
import {
  extractAcademicYear,
  inferCity,
  inferDomain,
  inferEstablishment,
  inferLevel,
  inferRegion,
  inferUniversity,
} from '../normalizers/infer';
import type {
  FeedEntryMeta,
  ItemDraft,
  ScrapeOptions,
  ScrapeResult,
  SourceRunner,
} from '../lib/types';

const FEED_TEMPLATE =
  'https://www.almaster-maroc.com/feeds/posts/default?alt=json&max-results=150&start-index=';

/** Pertinence : le post concerne-t-il un concours/master ? */
export function isRelevant(title: string): boolean {
  const t = normalizeStr(title);
  return (
    t.includes('master') ||
    t.includes('concours') ||
    t.includes('inscription') ||
    t.includes('preinscription') ||
    t.includes('candidature') ||
    t.includes('appel') ||
    t.includes('resultat')
  );
}

interface BloggerValue {
  $t?: string;
}

function mapEntry(e: Record<string, unknown>): FeedEntryMeta {
  const links = ((e.link as Array<Record<string, string>>) || []).filter(
    (l) => l?.rel === 'alternate',
  );
  const sourceUrl = links?.[0]?.href || String((e.id as BloggerValue)?.$t ?? '');
  const contentHtml =
    typeof (e.content as BloggerValue | undefined)?.$t === 'string'
      ? String((e.content as BloggerValue).$t)
      : '';
  const { text, links: hrefs } = parseHtml(contentHtml);
  const published = (e.published as BloggerValue | undefined)?.$t || undefined;

  return {
    sourceUrl,
    title: String((e.title as BloggerValue | undefined)?.$t ?? ''),
    publishedAt: published,
    tags: Array.isArray(e.category)
      ? (e.category as Array<Record<string, string>>)
          .map((c) => c.term)
          .filter((t): t is string => Boolean(t))
      : [],
    contentHtml,
    contentText: text,
    links: hrefs,
  };
}

async function fetchFeedPage(startIndex: number): Promise<{
  items: FeedEntryMeta[];
  total: number;
}> {
  const res = await fetchWithRetry(FEED_TEMPLATE + startIndex);
  const json: unknown = await res.json();
  const feed = (json as Record<string, any>)?.feed;
  const total = Number((feed as any)?.openSearch$totalResults?.$t) || 0;
  const rawEntry = feed?.entry;
  const entries: Array<Record<string, unknown>> = Array.isArray(rawEntry)
    ? rawEntry
    : rawEntry
      ? [rawEntry]
      : [];
  return { items: entries.map(mapEntry), total };
}

async function scrape(opts: ScrapeOptions): Promise<ScrapeResult> {
  const limit = opts.limit > 0 ? opts.limit : 150;
  const allEntries: FeedEntryMeta[] = [];
  const errors: string[] = [];
  let pagesAnalyzed = 0;

  let startIndex = 1;
  let totalKnown = 0;

  // Pagination : on s'arrête à la limite demandée, ou quand le flux est épuisé.
  while (allEntries.length < limit) {
    try {
      const page = await fetchFeedPage(startIndex);
      pagesAnalyzed++;
      totalKnown = page.total;

      const remaining = limit - allEntries.length;
      const taken = page.items.slice(0, remaining);
      allEntries.push(...taken);

      const pageSize = page.items.length;
      const reachedTotal = totalKnown > 0 && startIndex + pageSize > totalKnown;
      if (pageSize === 0 || reachedTotal || taken.length < page.items.length) break;

      startIndex += pageSize;
      if (opts.delayMs > 0) await sleep(opts.delayMs);
    } catch (err) {
      errors.push(`fetch page start-index=${startIndex}: ${(err as Error).message}`);
      break;
    }
  }

  const relevant = allEntries.filter((e) => isRelevant(e.title));

  return { entries: relevant, pagesAnalyzed, errors };
}

/** URLs interdites comme lien officiel (source elle-même, réseaux sociaux). */
function isForbiddenUrl(u: string): boolean {
  const l = u.toLowerCase();
  if (u.includes('almaster-maroc.com') || l.includes('blogger.com')) return true;
  return /facebook|fb\.|instagram|twitter|t\.co|x\.com|linkedin|youtube|whatsapp|wa\.me|t\.me|telegram|tiktok|snapchat|pinterest/.test(l);
}

/** Extrait les URLs en clair d'un texte (liens non enveloppés dans <a>). */
function extractUrlsFromText(text: string): string[] {
  const urls = text.match(/https?:\/\/[^\s"'<>)]+/gi) || [];
  return [...new Set(urls.map((u) => u.replace(/[,.…;]+$/, '')))];
}

/** Sélection du lien officiel / lien d'inscription parmi les URLs du post. */
function pickLinks(links: string[], contentText: string): {
  officialUrl?: string;
  registrationUrl?: string;
  documents?: string[];
} {
  const all = [...links, ...extractUrlsFromText(contentText)];
  const accepted = all.filter((u) => {
    if (!u.startsWith('http')) return false;
    if (isForbiddenUrl(u)) return false;
    if (/\.(jpe?g|png|gif|webp|svg|css|js|ico)([?#]|$)/i.test(u)) return false;
    if (/github\.io|wixsite|weebly|googleusercontent|drive\.google|docs\.google/.test(u)) return false;
    return true;
  });

  const host = (u: string): string => {
    try {
      return new URL(u).hostname;
    } catch {
      return '';
    }
  };
  const maLinks = accepted.filter((u) => host(u).endsWith('.ma'));
  const pdfLinks = accepted.filter((u) => /\.pdf$/i.test(u.split('?')[0]));

  let registrationUrl: string | undefined;
  for (const u of accepted) {
    const l = u.toLowerCase();
    if (/preinscri|inscri|candidat|tawdif|portail|eservice|application|dossier/.test(l)) {
      if (!registrationUrl) registrationUrl = u;
    }
  }

  // Lien officiel : dernier lien *.ma (hors domaines interdits), sinon le lien
  // d'inscription détecté, sinon un PDF.
  let officialUrl = maLinks.length > 0 ? maLinks[maLinks.length - 1] : undefined;
  if (!officialUrl) officialUrl = registrationUrl;
  if (!officialUrl && pdfLinks.length > 0) officialUrl = pdfLinks[0];

  return { officialUrl, registrationUrl, documents: pdfLinks.length ? pdfLinks : undefined };
}

/** Construction du brouillon d'item depuis une annonce Almaster. */
export function buildItem(entry: FeedEntryMeta): ItemDraft {
  const originalTitle = entry.title || '';
  const rawTagsTitle = `${entry.tags.join(' ')} ${originalTitle}`;
  const contentHead = entry.contentText.slice(0, 1200);
  const contentContext = entry.contentText.slice(0, 400);

  const { links: postLinks } = entry;

  const university = inferUniversity(rawTagsTitle, contentContext, postLinks);
  const establishment = inferEstablishment(rawTagsTitle, contentHead);
  const city = inferCity(rawTagsTitle, establishment?.city, university?.city);

  const dates = extractDates(entry.contentText, originalTitle, entry.publishedAt);
  const level = inferLevel(originalTitle);
  const domain = inferDomain(`${rawTagsTitle} ${entry.contentText.slice(0, 600)}`);
  const academicYear = extractAcademicYear(originalTitle, dates, entry.publishedAt);
  const region = inferRegion(city);

  const { officialUrl, registrationUrl, documents } = pickLinks(entry.links, entry.contentText);

  const isMaster = normalizeStr(originalTitle).includes('master');
  const category = isMaster
    ? 'MASTER'
    : normalizeStr(originalTitle).includes('resultat')
      ? 'RESULTATS'
      : 'CONCOURS';

  return {
    title: cleanTitle(originalTitle),
    organization: establishment?.name || university?.name,
    university: university?.name,
    establishment: establishment?.name,
    city,
    region,
    domain,
    level,
    academicYear,
    description: entry.contentText || undefined,
    openingDate: dates.openingDate,
    deadlineDate: dates.deadlineDate,
    examDate: dates.examDate,
    resultsDate: dates.resultsDate,
    officialUrl,
    registrationUrl,
    documents,
    sourceUrl: entry.sourceUrl,
    category,
    publishedAt: entry.publishedAt,
    originalTitle,
    tags: entry.tags.length ? entry.tags : undefined,
  };
}

export const almasterSource: SourceRunner = {
  name: 'almaster',
  label: 'Almaster Maroc',
  baseUrl: 'https://www.almaster-maroc.com/feeds/posts/default?alt=json',
  scrape,
};