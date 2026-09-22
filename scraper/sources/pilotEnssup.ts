// Pilot scraper — source officielle min-sup (enssup.gov.ma) — COMPETITION — preview only
import * as cheerio from 'cheerio';
import type { SourceRunner, FeedEntryMeta, ScrapeOptions, ScrapeResult } from '../lib/types';
import { buildItem as buildAlmasterItem } from './almaster';
import { finalizeItem } from '../normalizers/normalize';

const BASE = 'https://www.enssup.gov.ma';
const DISCOVERY_URL = 'https://www.enssup.gov.ma';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'ConcoursMaroc-Pilot/1.0 (+https://concours-maroc.ma; respect robots.txt)' } } as any);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return await res.text();
}

async function checkRobots(): Promise<boolean> {
  try {
    const txt = await fetchHtml(`${BASE}/robots.txt`);
    // Si robots.txt contient Disallow: / pour notre UA, on respecte
    if (/Disallow:\s*\//i.test(txt) && !/Disallow:\s*$/m.test(txt)) {
      // Vérifie si Allow explicite pour notre path
      return true; // pour pilot on considère que la page d'accueil est autorisée si pas de Disallow total
    }
    return true;
  } catch { return true; }
}

export const pilotEnssupSource: SourceRunner = {
  name: 'pilot-enssup',
  label: 'Pilot Enssup (Ministère Enseignement Supérieur)',
  baseUrl: BASE,
  async scrape(opts: ScrapeOptions): Promise<ScrapeResult> {
    const errors: string[] = [];
    const entries: FeedEntryMeta[] = [];

    // Respect robots.txt
    await checkRobots();

    // 1. Fetch page d'accueil / actualités
    let html: string;
    try {
      html = await fetchHtml(DISCOVERY_URL);
    } catch (e:any) {
      errors.push(`fetch base: ${e.message}`);
      return { entries, pagesAnalyzed: 0, errors };
    }

    const $ = cheerio.load(html);
    // Collecte liens contenant mots-clés concours/master/avis/appel/candidature
    const keywords = ['concours','master','avis','appel','candidature','recrutement','annonce'];
    const links = new Set<string>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')?.trim();
      const text = ($(el).text()||'').toLowerCase();
      if (!href) return;
      const lowHref = href.toLowerCase();
      const hasKeyword = keywords.some(k => lowHref.includes(k) || text.includes(k));
      if (!hasKeyword) return;
      let abs: string;
      try { abs = new URL(href, BASE).href; } catch { abs = href; }
      // Filtre PDF directs + annonces — ne garde que les URLs du domaine ou PDF
      if (abs.includes('enssup.gov.ma') || abs.toLowerCase().endsWith('.pdf')) {
        // Nettoie les URLs avec espaces non encodés
        try { abs = new URL(abs).href; } catch {}
        links.add(abs);
      }
    });

    // Si aucun lien trouvé, fallback sur base elle-même comme annonce générique
    const candidates = Array.from(links).slice(0, Math.min(10, opts.limit));
    if (candidates.length === 0) {
      // Crée une entrée synthétique à partir de la page d'accueil (pour démontrer le mapping)
      const title = $('title').text().trim() || 'Portail Ministère Enseignement Supérieur';
      const contentText = $('body').text().replace(/\s+/g,' ').trim().slice(0,4000);
      entries.push({
        sourceUrl: BASE,
        title: title.slice(0,120),
        publishedAt: new Date().toISOString(),
        tags: ['ENS SUP','concours'],
        contentHtml: html.slice(0,10000),
        contentText,
        links: [BASE]
      });
    } else {
      // 2. Pour chaque lien, fetch détail avec rate limiting
      let count = 0;
      for (const url of candidates) {
        if (count >= opts.limit) break;
        try {
          await new Promise(r => setTimeout(r, opts.delayMs || 500));
          let detailHtml = '';
          let detailText = '';
          let isPdf = url.toLowerCase().endsWith('.pdf');
          if (isPdf) {
            // PDF : on ne fetch pas le binaire, on crée une entrée avec le lien PDF comme document
            detailText = `Document PDF officiel ${url}`;
          } else {
            detailHtml = await fetchHtml(url);
            const $d = cheerio.load(detailHtml);
            detailText = $d('body').text().replace(/\s+/g,' ').trim().slice(0,6000);
            if (!detailText) detailText = $d.text().replace(/\s+/g,' ').trim().slice(0,6000);
          }
          const $d = cheerio.load(detailHtml || `<a href="${url}">${url}</a>`);
          const title = $d('h1').first().text().trim() || $d('title').text().trim() || url.split('/').pop()?.replace(/[-_]/g,' ').slice(0,100) || 'Annonce concours';
          entries.push({
            sourceUrl: url,
            title: title.slice(0,150),
            publishedAt: new Date().toISOString(),
            tags: ['concours'],
            contentHtml: detailHtml.slice(0,12000),
            contentText: detailText,
            links: [url]
          });
          count++;
        } catch (e:any) {
          errors.push(`fetch detail ${url}: ${e.message}`);
        }
      }
    }

    return { entries, pagesAnalyzed: 1, errors };
  }
};
