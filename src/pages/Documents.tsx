// ============================================================
// CONCOURS MAROC — Documents
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { loadDB, queryDocuments } from '../lib/db';
import { DocumentCard } from '../components/cards';
import { Container, InfoBar, PageHero } from '../components/layout';
import { EmptyState, FilterPanel, FilterSelect, Pagination, SearchInput } from '../components/ui';
import { cn } from '../utils/cn';

const CATS = ['Avis de concours', 'Convocation', 'Résultats', 'Liste des candidats', 'Programme', 'Guide', 'Cours', 'Fiche de révision', 'Ancien examen', 'Autre'] as const;

export default function Documents() {
  const [params, setParams] = useSearchParams();
  const db = loadDB();
  const [q, setQ] = useState(params.get('q') ?? '');
  const cat = params.get('cat') ?? '';

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

  const year = params.get('annee') ?? '';
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);
  const result = queryDocuments({ q: params.get('q') ?? '', category: cat, year }, page, 12);
  const years = useMemo(() => [...new Set(db.documents.map((d) => d.year))].sort((a, b) => b - a), [db]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  return (
    <div>
      <PageHero badge="Documents" title="Documents, avis et ressources officielles" compact
        subtitle="Avis de concours, convocations, résultats, programmes, guides et fiches de révision." />
      <Container>
        <FilterPanel>
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
            <div>
              <span className="mb-1 block text-xs font-bold text-slate-500">Recherche</span>
              <SearchInput value={q} onChange={setQ} placeholder="Rechercher un document..." label="Rechercher un document" />
            </div>
            <FilterSelect label="Année" value={year} onChange={(v) => set('annee', v)} options={[{ v: '', l: 'Toutes les années' }, ...years.map((y) => ({ v: String(y), l: String(y) }))]} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Catégories de documents">
            <CatBtn active={cat === ''} label="Tous" onClick={() => set('cat', '')} />
            {CATS.map((c) => <CatBtn key={c} active={cat === c} label={c} onClick={() => set('cat', c)} />)}
          </div>
        </FilterPanel>

        {result.items.length === 0 ? (
          <div className="mt-4"><EmptyState icon={<FileText className="h-6 w-6" />} title="Aucun document trouvé" message="Essayez d'ajuster vos filtres." /></div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {result.items.map((d) => <DocumentCard key={d.id} d={d} />)}
          </div>
        )}
        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} label="documents"
          onPage={(p) => { const next = new URLSearchParams(params); next.set('page', String(p)); setParams(next); }} />
      </Container>
      <InfoBar />
    </div>
  );
}

function CatBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={cn('h-9 rounded-xl px-3.5 text-[13px] font-bold ring-1 ring-inset transition-colors',
        active ? 'bg-[#0B2A4A] text-white ring-[#0B2A4A]' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
      {label}
    </button>
  );
}
