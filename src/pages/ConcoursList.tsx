// ============================================================
// CONCOURS MAROC — Liste des concours (filtres + tri + pagination)
// Filtres synchronisés avec l'URL (?q=&ministere=&annee=...)
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Landmark, Trophy, SlidersHorizontal, FilterX } from 'lucide-react';
import { cn } from '../utils/cn';
import { loadDB, queryCompetitions } from '../lib/db';
import type { CompetitionFilters } from '../lib/db';
import { CITIES, DOMAINS, LEVELS, statusFromCompetition } from '../lib/utils';
import { CompetitionCard } from '../components/cards';
import { Container, InfoBar, PageHero } from '../components/layout';
import { Button, EmptyState, FilterPanel, FilterSelect, Pagination, SearchInput, Select } from '../components/ui';

const PER_PAGE = 12;

export default function ConcoursList() {
  const [params, setParams] = useSearchParams();
  const db = loadDB();

  const filters: CompetitionFilters = useMemo(() => ({
    q: params.get('q') ?? '',
    ministry: params.get('ministere') ?? '',
    school: params.get('ecole') ?? '',
    year: params.get('annee') ?? '',
    level: params.get('niveau') ?? '',
    city: params.get('ville') ?? '',
    domaine: params.get('domaine') ?? '',
    status: params.get('statut') ?? '',
    category: params.get('categorie') ?? '',
    sort: params.get('tri') ?? 'deadline',
  }), [params]);

  const [q, setQ] = useState(filters.q ?? '');
  useEffect(() => { setQ(filters.q ?? ''); }, [params]);

  // Recherche dynamique (debounce)
  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== (params.get('q') ?? '')) {
        const next = new URLSearchParams(params);
        if (q.trim()) next.set('q', q.trim()); else next.delete('q');
        next.delete('page');
        setParams(next, { replace: true });
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);
  const result = queryCompetitions(filters, page, PER_PAGE);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  const reset = () => { setParams({}); setQ(''); };
  const hasFilters = [filters.q, filters.ministry, filters.school, filters.year, filters.level, filters.city, filters.domaine, filters.status, filters.category].some(Boolean);

  const years = useMemo(() => [...new Set(db.competitions.map((c) => c.year))].sort((a, b) => b - a), [db]);

  const stats = useMemo(() => {
    const pub = db.competitions.filter(c => c.publishStatus === 'PUBLISHED');
    return {
      total: pub.length,
      ouvert: pub.filter(c => statusFromCompetition(c) === 'Ouvert').length,
      bientot: pub.filter(c => statusFromCompetition(c) === 'Bientot').length,
      ferme: pub.filter(c => statusFromCompetition(c) === 'Ferme').length,
    };
  }, [db]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const openCount = db.competitions.filter((c) => c.publishStatus === 'PUBLISHED').length;

  return (
    <div>
      <PageHero badge="Concours" title="Trouvez votre prochain concours"
        subtitle="Découvrez les concours de tous les ministères, écoles et universités du Maroc. Dates d'inscription, conditions d'accès et postes disponibles mis à jour quotidiennement." />
      <Container className="-mt-6 relative z-10">
        
        {/* Badges compteurs */}
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {stats.ouvert} ouverts
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> {stats.bientot} bientôt
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> {stats.ferme} fermés
          </span>
        </div>

        {/* Bouton mobile */}
        <div className="mb-4 lg:hidden">
          <Button variant="outline" onClick={() => setFiltersOpen(!filtersOpen)} className="w-full justify-between">
            <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filtres & Recherche</span>
            {hasFilters && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0B63CE] text-[10px] text-white">!</span>}
          </Button>
        </div>

        {/* Barre de filtres — composant partagé (cf. design system) */}
        <div className={cn("transition-all duration-300 lg:block", filtersOpen ? "block" : "hidden")}>
          <FilterPanel>
            <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr_0.8fr_1fr_1fr]">
              <div>
                <span className="mb-1 block text-xs font-bold text-slate-500">Recherche</span>
                <SearchInput value={q} onChange={setQ} placeholder="Ex: Médecine, ENSA, Rabat..." label="Rechercher un concours" />
              </div>
              <FilterSelect label="Ministère" value={filters.ministry ?? ''} onChange={(v) => set('ministere', v)} options={[{ v: '', l: 'Tous les ministères' }, ...db.ministries.map((m) => ({ v: m.id, l: m.name }))]} />
              <FilterSelect label="Année" value={filters.year ?? ''} onChange={(v) => set('annee', v)} options={[{ v: '', l: 'Toutes' }, ...years.map((y) => ({ v: String(y), l: String(y) }))]} />
              <FilterSelect label="Niveau" value={filters.level ?? ''} onChange={(v) => set('niveau', v)} options={[{ v: '', l: 'Tous' }, ...LEVELS.map((l) => ({ v: l, l }))]} />
              <FilterSelect label="Statut" value={filters.status ?? ''} onChange={(v) => set('statut', v)} options={[{ v: '', l: 'Tous' }, { v: 'Ouvert', l: 'Ouvert' }, { v: 'Bientot', l: 'Bientôt' }, { v: 'Ferme', l: 'Fermé' }, { v: 'Suspendu', l: 'Suspendu' }]} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <FilterSelect label="École" value={filters.school ?? ''} onChange={(v) => set('ecole', v)} options={[{ v: '', l: 'Toutes les écoles' }, ...db.schools.map((s) => ({ v: s.id, l: s.shortName }))]} />
              <FilterSelect label="Ville" value={filters.city ?? ''} onChange={(v) => set('ville', v)} options={[{ v: '', l: 'Toutes les villes' }, ...CITIES.map((c) => ({ v: c, l: c }))]} />
              <FilterSelect label="Domaine" value={filters.domaine ?? ''} onChange={(v) => set('domaine', v)} options={[{ v: '', l: 'Tous les domaines' }, ...DOMAINS.map((d) => ({ v: d, l: d }))]} />
              <FilterSelect label="Catégorie" value={filters.category ?? ''} onChange={(v) => set('categorie', v)} options={[{ v: '', l: 'Toutes' }, { v: 'MINISTERE', l: 'Ministères' }, { v: 'ECOLE', l: 'Écoles' }, { v: 'UNIVERSITE', l: 'Universités' }, { v: 'RECRUTEMENT', l: 'Recrutement' }]} />
              {hasFilters && (
                <div className="flex items-end">
                  <Button variant="outline" onClick={reset} className="w-full lg:w-auto text-red-600 hover:bg-red-50 hover:text-red-700 ring-red-200">
                    <FilterX className="h-4 w-4" /> Effacer
                  </Button>
                </div>
              )}
            </div>
          </FilterPanel>
        </div>

        {/* En-tête résultats */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#0B2A4A]">
            <Landmark className="h-5 w-5 text-[#0B63CE]" /> Ministères et institutions
            <span className="rounded-lg bg-sky-50 px-2 py-0.5 text-xs font-bold text-[#0B63CE] ring-1 ring-inset ring-sky-100">{result.total} concours</span>
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="sort" className="font-semibold text-slate-500">Trier par :</label>
            <Select id="sort" value={filters.sort} onChange={(e) => set('tri', e.target.value)} className="!h-9 !w-auto text-[13px]">
              <option value="deadline">Date limite</option>
              <option value="recent">Plus récents</option>
              <option value="oldest">Plus anciens</option>
              <option value="name">Nom</option>
              <option value="places">Places</option>
              <option value="views">Popularité</option>
            </Select>
          </div>
        </div>

        {/* Grille */}
        {result.items.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={<Trophy className="h-6 w-6" />} title="Aucun concours trouvé"
              message="Essayez d'ajuster vos filtres ou votre recherche. De nouveaux concours sont ajoutés régulièrement."
              action={<button onClick={reset} className="rounded-xl bg-[#0B63CE] px-5 py-2.5 text-sm font-bold text-white">Réinitialiser les filtres</button>} />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {result.items.map((c) => <CompetitionCard key={c.id} c={c} />)}
          </div>
        )}

        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} label="concours"
          onPage={(p) => { const next = new URLSearchParams(params); next.set('page', String(p)); setParams(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />

        <div className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-[13px] text-sky-900 ring-1 ring-inset ring-sky-100">
          <p><strong>{openCount} concours publiés</strong> sur la plateforme. Les informations sont fournies à titre indicatif — consultez toujours les sites officiels des ministères.</p>
          <p className="mt-1">Un concours manque ? <Link to="/contact" className="font-bold text-[#0B63CE] hover:underline">Contactez-nous</Link> ou signalez-le depuis la fiche du concours.</p>
        </div>
      </Container>
      <InfoBar />
    </div>
  );
}
