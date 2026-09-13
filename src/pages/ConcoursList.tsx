// ============================================================
// CONCOURS MAROC — Liste des concours (filtres + tri + pagination)
// Filtres synchronisés avec l'URL (?q=&ministere=&annee=...)
// Inclut les concours d'État, grandes écoles et les masters universitaires
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Landmark, Trophy, SlidersHorizontal, FilterX, GraduationCap } from 'lucide-react';
import { cn } from '../utils/cn';
import { loadDB, queryCompetitions } from '../lib/db';
import type { CompetitionFilters } from '../lib/db';
import { CITIES, DOMAINS, LEVELS, statusFromCompetition } from '../lib/utils';
import { CompetitionCard } from '../components/cards';
import { Container, InfoBar, PageHero } from '../components/layout';
import { Button, EmptyState, FilterPanel, FilterSelect, Pagination, SearchInput, Select } from '../components/ui';
import { fetchAndCacheMasters } from '../lib/mastersAdapter';

const PER_PAGE = 12;

export default function ConcoursList() {
  const [params, setParams] = useSearchParams();
  const [mastersVersion, setMastersVersion] = useState(0);
  const db = loadDB();

  // Synchronisation des masters depuis le backend en arrière-plan
  useEffect(() => {
    fetchAndCacheMasters().then(() => {
      setMastersVersion((v) => v + 1);
    });
  }, []);

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
    includeMasters: true,
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
  const result = useMemo(() => {
    return queryCompetitions(filters, page, PER_PAGE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, mastersVersion]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  const reset = () => { setParams({}); setQ(''); };
  const hasFilters = [filters.q, filters.ministry, filters.school, filters.year, filters.level, filters.city, filters.domaine, filters.status, filters.category].some(Boolean);

  const years = useMemo(() => {
    const list = [...new Set(db.competitions.map((c) => c.year))];
    if (!list.includes(2026)) list.push(2026);
    return list.sort((a, b) => b - a);
  }, [db]);

  const stats = useMemo(() => {
    const all = queryCompetitions({ includeMasters: true }, 1, 1000).items;
    return {
      total: all.length,
      ouvert: all.filter(c => statusFromCompetition(c) === 'Ouvert').length,
      bientot: all.filter(c => statusFromCompetition(c) === 'Bientot').length,
      ferme: all.filter(c => statusFromCompetition(c) === 'Ferme').length,
      masters: all.filter(c => c.id.startsWith('mst-') || c.category === 'UNIVERSITE' || c.level.toLowerCase().includes('master')).length,
      stateComps: all.filter(c => !c.id.startsWith('mst-') && c.category !== 'UNIVERSITE').length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, mastersVersion]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Déterminer l'onglet actif (Tous / Ministères & Écoles / Masters)
  const activeTab = filters.category === 'MASTER'
    ? 'MASTERS'
    : (filters.category === 'MINISTERE' || filters.category === 'ECOLE' || filters.category === 'RECRUTEMENT')
    ? 'ETAT'
    : 'TOUS';

  const selectTab = (tab: 'TOUS' | 'ETAT' | 'MASTERS') => {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (tab === 'MASTERS') {
      next.set('categorie', 'MASTER');
    } else if (tab === 'ETAT') {
      next.delete('categorie');
      next.set('categorie', 'ECOLE');
    } else {
      next.delete('categorie');
    }
    setParams(next);
  };

  return (
    <div>
      <PageHero
        badge="Concours & Masters"
        title="Trouvez votre prochain concours"
        subtitle="Découvrez tous les concours du Maroc : Ministères, Grandes Écoles et Concours d'accès aux Masters Universitaires 2026-2027. Dates limites, conditions d'accès et inscriptions officielles."
      />
      <Container className="-mt-6 relative z-10">
        
        {/* Barre de sélection d'onglets de catégorie */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#E6ECF3] bg-white p-2 shadow-sm">
          <button
            type="button"
            onClick={() => selectTab('TOUS')}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all",
              activeTab === 'TOUS'
                ? "bg-[#0B63CE] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Trophy className="h-4 w-4" />
            Tous les concours
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-extrabold",
              activeTab === 'TOUS' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            )}>
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectTab('MASTERS')}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all",
              activeTab === 'MASTERS'
                ? "bg-purple-600 text-white shadow-sm"
                : "text-purple-700 bg-purple-50 hover:bg-purple-100"
            )}
          >
            <GraduationCap className="h-4 w-4" />
            Concours de Masters (Universités)
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-extrabold",
              activeTab === 'MASTERS' ? "bg-white/20 text-white" : "bg-purple-200 text-purple-900"
            )}>
              {stats.masters}
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectTab('ETAT')}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all",
              activeTab === 'ETAT'
                ? "bg-[#0B2A4A] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Landmark className="h-4 w-4" />
            Grandes Écoles & Recrutement
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-extrabold",
              activeTab === 'ETAT' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            )}>
              {stats.stateComps}
            </span>
          </button>
        </div>

        {/* Badges compteurs d'état */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {stats.ouvert} ouverts
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> {stats.bientot} bientôt
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> {stats.ferme} fermés
          </span>
          <button
            type="button"
            onClick={() => set('categorie', filters.category === 'MASTER' ? '' : 'MASTER')}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-inset transition-all",
              filters.category === 'MASTER'
                ? "bg-purple-600 text-white ring-purple-600"
                : "bg-purple-50 text-purple-700 ring-purple-200 hover:bg-purple-100"
            )}
          >
            <GraduationCap className="h-4 w-4" /> {stats.masters} masters universitaires {filters.category === 'MASTER' ? '(filtré)' : ''}
          </button>
        </div>

        {/* Bouton mobile filtres */}
        <div className="mb-4 lg:hidden">
          <Button variant="outline" onClick={() => setFiltersOpen(!filtersOpen)} className="w-full justify-between">
            <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Filtres & Recherche</span>
            {hasFilters && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0B63CE] text-[10px] text-white">!</span>}
          </Button>
        </div>

        {/* Barre de filtres — composant partagé */}
        <div className={cn("transition-all duration-300 lg:block", filtersOpen ? "block" : "hidden")}>
          <FilterPanel>
            <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr_0.8fr_1fr_1fr]">
              <div>
                <span className="mb-1 block text-xs font-bold text-slate-500">Recherche</span>
                <SearchInput value={q} onChange={setQ} placeholder="Ex: Master IA, ENSA, Médecine, Rabat..." label="Rechercher un concours" />
              </div>
              <FilterSelect label="Ministère" value={filters.ministry ?? ''} onChange={(v) => set('ministere', v)} options={[{ v: '', l: 'Tous les ministères' }, ...db.ministries.map((m) => ({ v: m.id, l: m.name }))]} />
              <FilterSelect label="Année" value={filters.year ?? ''} onChange={(v) => set('annee', v)} options={[{ v: '', l: 'Toutes' }, ...years.map((y) => ({ v: String(y), l: String(y) }))]} />
              <FilterSelect label="Niveau" value={filters.level ?? ''} onChange={(v) => set('niveau', v)} options={[{ v: '', l: 'Tous les niveaux' }, { v: 'Master', l: 'Master / MST' }, ...LEVELS.map((l) => ({ v: l, l }))]} />
              <FilterSelect label="Statut" value={filters.status ?? ''} onChange={(v) => set('statut', v)} options={[{ v: '', l: 'Tous les statuts' }, { v: 'Ouvert', l: 'Ouvert' }, { v: 'Bientot', l: 'Bientôt' }, { v: 'Ferme', l: 'Fermé' }, { v: 'Suspendu', l: 'Suspendu' }]} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <FilterSelect label="École" value={filters.school ?? ''} onChange={(v) => set('ecole', v)} options={[{ v: '', l: 'Toutes les écoles' }, ...db.schools.map((s) => ({ v: s.id, l: s.shortName }))]} />
              <FilterSelect label="Ville" value={filters.city ?? ''} onChange={(v) => set('ville', v)} options={[{ v: '', l: 'Toutes les villes' }, ...CITIES.map((c) => ({ v: c, l: c }))]} />
              <FilterSelect label="Domaine" value={filters.domaine ?? ''} onChange={(v) => set('domaine', v)} options={[{ v: '', l: 'Tous les domaines' }, ...DOMAINS.map((d) => ({ v: d, l: d }))]} />
              <FilterSelect
                label="Catégorie"
                value={filters.category ?? ''}
                onChange={(v) => set('categorie', v)}
                options={[
                  { v: '', l: 'Toutes les catégories' },
                  { v: 'MASTER', l: 'Concours de Masters (Universités)' },
                  { v: 'MINISTERE', l: 'Ministères & Fonction Publique' },
                  { v: 'ECOLE', l: 'Grandes Écoles (Ingénieurs / Commerce)' },
                  { v: 'RECRUTEMENT', l: 'Recrutement & Emploi Public' },
                  { v: 'UNIVERSITE', l: 'Universités & Facultés' },
                ]}
              />
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
            {filters.category === 'MASTER' ? (
              <>
                <GraduationCap className="h-5 w-5 text-purple-600" /> Concours de Masters Universitaires
              </>
            ) : (
              <>
                <Landmark className="h-5 w-5 text-[#0B63CE]" /> Tous les concours et masters
              </>
            )}
            <span className="rounded-lg bg-sky-50 px-2 py-0.5 text-xs font-bold text-[#0B63CE] ring-1 ring-inset ring-sky-100">
              {result.total} concours
            </span>
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

        {/* Grille des concours et masters */}
        {result.items.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={<Trophy className="h-6 w-6" />} title="Aucun concours trouvé"
              message="Essayez d'ajuster vos filtres ou votre recherche. De nouveaux concours et masters sont ajoutés régulièrement."
              action={<button onClick={reset} className="rounded-xl bg-[#0B63CE] px-5 py-2.5 text-sm font-bold text-white">Réinitialiser les filtres</button>} />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {result.items.map((c) => <CompetitionCard key={c.id} c={c} />)}
          </div>
        )}

        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          label="concours"
          onPage={(p) => {
            const next = new URLSearchParams(params);
            next.set('page', String(p));
            setParams(next);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        <div className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-[13px] text-sky-900 ring-1 ring-inset ring-sky-100">
          <p>
            <strong>{stats.total} concours répertoriés</strong> sur la plateforme (incluant les ministères, écoles d'ingénieurs, de commerce et les concours d'accès aux masters universitaires 2026-2027). Les informations sont synchronisées pour vous aider à préparer et postuler dans les délais.
          </p>
          <p className="mt-1">
            Un concours ou un master manque ? <Link to="/contact" className="font-bold text-[#0B63CE] hover:underline">Contactez-nous</Link> ou signalez-le depuis sa fiche.
          </p>
        </div>
      </Container>
      <InfoBar />
    </div>
  );
}

