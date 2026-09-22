// ============================================================
// Parseur HTML → texte propre + extraction des liens
// Indépendant (cheerio), aucun import depuis le projet principal
// ============================================================

import { load } from 'cheerio';

export interface HtmlResult {
  text: string;
  links: string[];
}

export function parseHtml(html: string): HtmlResult {
  const $ = load(html || '');

  $('script, style, noscript, iframe, nav, footer').remove();

  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim();
    if (href && /^https?:\/\//i.test(href)) links.push(href);
  });

  // Blocs → espaces (description = flux lisible sur une ligne)
  const text = $.root().text() || '';
  const cleaned = text.replace(/\s+/g, ' ').trim();

  return { text: cleaned, links: [...new Set(links)] };
}