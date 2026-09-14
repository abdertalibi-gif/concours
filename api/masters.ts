// ============================================================
// Vercel Serverless Function — GET /api/masters
// Le serveur Express local n'est pas exécuté sur Vercel (déploiement
// statique). Cette fonction fournit la même route /api/masters en
// production. Les données proviennent de ./_mastersData.ts (inclus
// dans la lambda) — ne jamais importer depuis src/ (non inclus par
// le builder @vercel/node).
// ============================================================

import { SEED_MASTERS_FALLBACK } from './_mastersData.js';

type MasterItem = {
  status: string;
  university: string;
  city: string;
  domain: string;
  name: string;
  establishment: string;
};

export default function handler(req: any, res: any) {
  const { status, university, city, domain, search, q } = req.query || {};

  let masters: MasterItem[] = [...SEED_MASTERS_FALLBACK];

  if (status && typeof status === 'string' && status !== 'TOUS') {
    masters = masters.filter((m) => m.status.toUpperCase() === status.toUpperCase());
  }
  if (university && typeof university === 'string') {
    const u = university.toLowerCase();
    masters = masters.filter((m) => m.university.toLowerCase().includes(u));
  }
  if (city && typeof city === 'string') {
    const c = city.toLowerCase();
    masters = masters.filter((m) => m.city.toLowerCase().includes(c));
  }
  if (domain && typeof domain === 'string') {
    const d = domain.toLowerCase();
    masters = masters.filter((m) => m.domain.toLowerCase().includes(d));
  }

  const searchQuery = typeof search === 'string' ? search : typeof q === 'string' ? q : '';
  if (searchQuery.trim()) {
    const term = searchQuery.toLowerCase().trim();
    masters = masters.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        m.establishment.toLowerCase().includes(term) ||
        m.university.toLowerCase().includes(term) ||
        m.city.toLowerCase().includes(term) ||
        m.domain.toLowerCase().includes(term)
    );
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
  res.status(200).json(masters);
}