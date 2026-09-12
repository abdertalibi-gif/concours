// ============================================================
// CONCOURS MAROC — Examens (anciens sujets + fiche)
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ChevronRight, Clock, Download, Eye, FileText, Heart } from 'lucide-react';
import { useAuth } from '../lib/auth';
import type { Exam } from '../lib/types';
import { adminUpdate, getExamBySlug, isFavorite, loadDB, queryExams, toggleFavorite } from '../lib/db';
import { LEVELS, SUBJECTS, formatNumber } from '../lib/utils';
import { downloadDemo, ExamCard } from '../components/cards';
import { Container, InfoBar, PageHero } from '../components/layout';
import { Button, Chip, DemoBadge, EmptyState, FilterPanel, FilterSelect, Pagination, SearchInput, VerifiedBadge } from '../components/ui';
import { cn } from '../utils/cn';

// ==================== LISTE ====================
export function ExamensList() {
  const [params, setParams] = useSearchParams();
  const db = loadDB();
  const [q, setQ] = useState(params.get('q') ?? '');

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

  const f = {
    q: params.get('q') ?? '', school: params.get('ecole') ?? '', year: params.get('annee') ?? '',
    level: params.get('niveau') ?? '', subject: params.get('matiere') ?? '', type: params.get('type') ?? '',
  };
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1);
  const result = queryExams(f, page, 12);
  const years = useMemo(() => [...new Set(db.exams.map((e) => e.year))].sort((a, b) => b - a), [db]);
  const types = useMemo(() => [...new Set(db.exams.map((e) => e.type))], [db]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  return (
    <div>
      <PageHero badge="Examens" title="Anciens examens et sujets de concours" compact
        subtitle="Entraînez-vous avec les sujets des années précédentes : mathématiques, physique, TAFEM, culture générale et plus." />
      <Container>
        <FilterPanel>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-[1.5fr_1fr_0.7fr_1fr_1fr_0.9fr]">
            <div>
              <span className="mb-1 block text-xs font-bold text-slate-500">Recherche</span>
              <SearchInput value={q} onChange={setQ} placeholder="Rechercher un examen..." label="Rechercher un examen" />
            </div>
            <FilterSelect label="École" value={f.school} onChange={(v) => set('ecole', v)} options={[{ v: '', l: 'Toutes' }, ...db.schools.map((s) => ({ v: s.id, l: s.shortName }))]} />
            <FilterSelect label="Année" value={f.year} onChange={(v) => set('annee', v)} options={[{ v: '', l: 'Toutes' }, ...years.map((y) => ({ v: String(y), l: String(y) }))]} />
            <FilterSelect label="Matière" value={f.subject} onChange={(v) => set('matiere', v)} options={[{ v: '', l: 'Toutes' }, ...SUBJECTS.map((s) => ({ v: s, l: s }))]} />
            <FilterSelect label="Niveau" value={f.level} onChange={(v) => set('niveau', v)} options={[{ v: '', l: 'Tous' }, ...LEVELS.map((l) => ({ v: l, l }))]} />
            <FilterSelect label="Type" value={f.type} onChange={(v) => set('type', v)} options={[{ v: '', l: 'Tous' }, ...types.map((t) => ({ v: t, l: t }))]} />
          </div>
        </FilterPanel>

        {result.items.length === 0 ? (
          <div className="mt-4"><EmptyState icon={<FileText className="h-6 w-6" />} title="Aucun examen disponible" message="Essayez d'ajuster vos filtres." /></div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {result.items.map((e) => <ExamCard key={e.id} e={e} />)}
          </div>
        )}
        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} label="examens"
          onPage={(p) => { const next = new URLSearchParams(params); next.set('page', String(p)); setParams(next); }} />
      </Container>
      <InfoBar />
    </div>
  );
}

// ==================== DÉTAIL ====================
export function ExamenDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const e = slug ? getExamBySlug(slug) : undefined;

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  useEffect(() => {
    if (e) document.title = `${e.title} ${e.year} | Concours Maroc`;
    return () => { document.title = 'Concours Maroc — Tous les concours et examens du Maroc'; };
  }, [e]);

  if (!e || e.publishStatus !== 'PUBLISHED') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-[#0B2A4A]">Examen introuvable</h1>
        <Link to="/examens" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-2.5 text-sm font-bold text-white"><ArrowLeft className="h-4 w-4" /> Retour aux examens</Link>
      </div>
    );
  }

  const fav = user ? isFavorite(user.id, 'EXAMEN', e.id) : false;
  const related = loadDB().exams.filter((x) => x.id !== e.id && x.publishStatus === 'PUBLISHED' && (x.schoolId === e.schoolId || x.subject === e.subject)).slice(0, 4);

  const download = () => {
    adminUpdate<Exam>('exams', e.id, { downloads: e.downloads + 1 });
    downloadDemo(e.title);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-[13px] text-slate-500">
        <Link to="/" className="hover:text-[#0B63CE]">Accueil</Link><ChevronRight className="h-3.5 w-3.5" />
        <Link to="/examens" className="hover:text-[#0B63CE]">Examens</Link><ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate font-semibold text-[#0B2A4A]">{e.title}</span>
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="rounded-2xl border border-[#E6ECF3] bg-white p-6 shadow-[0_1px_3px_rgba(11,42,74,0.06)] sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-inset ring-red-100">
                <FileText className="h-7 w-7" />
              </span>
              <div className="flex items-center gap-2">
                {e.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                {e.isDemo && <DemoBadge />}
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#0B2A4A] sm:text-3xl">{e.title}</h1>
            <p className="mt-1 text-[15px] font-semibold text-slate-500">{e.schoolName}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip>{e.year}</Chip><Chip tone="blue">{e.subject}</Chip><Chip tone="orange">{e.level}</Chip>
              <Chip tone="green">{e.type}</Chip>{e.hasCorrection && <Chip tone="green">Corrigé inclus</Chip>}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />Session {e.year}</span>
              {e.duration && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />Durée : {e.duration}</span>}
              {e.pages && <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" />{e.pages} pages</span>}
              <span className="flex items-center gap-1.5"><Download className="h-4 w-4" />{formatNumber(e.downloads)} téléchargements</span>
            </div>
            {e.description && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-600 ring-1 ring-inset ring-slate-100">{e.description}</p>}

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button onClick={download}><Eye className="h-4 w-4" /> Voir le PDF</Button>
              <Button variant="dark" onClick={download}><Download className="h-4 w-4" /> Télécharger</Button>
              <button onClick={() => { if (!user) return nav('/connexion'); toggleFavorite(user.id, 'EXAMEN', e.id); }}
                className={cn('inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold ring-1 ring-inset', fav ? 'bg-red-50 text-red-600 ring-red-200' : 'bg-white text-[#0B2A4A] ring-slate-200 hover:bg-slate-50')}>
                <Heart className={cn('h-4 w-4', fav && 'fill-current')} />{fav ? 'Sauvegardé' : 'Ajouter aux favoris'}
              </button>
            </div>
          </div>

          {/* Aperçu */}
          <div className="mt-6 rounded-2xl border border-[#E6ECF3] bg-white p-6 shadow-[0_1px_3px_rgba(11,42,74,0.06)] sm:p-8">
            <h2 className="text-lg font-extrabold text-[#0B2A4A]">Aperçu du sujet</h2>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-10">
              <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow-md ring-1 ring-slate-200">
                <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">{e.schoolName} — {e.year} (DÉMO)</p>
                <p className="mt-2 text-center text-lg font-extrabold text-[#0B2A4A]">{e.title}</p>
                <p className="mt-1 text-center text-sm text-slate-500">Épreuve de {e.subject} — Durée : {e.duration ?? '2h'}</p>
                <div className="mt-6 space-y-3">
                  <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-500"><strong className="text-slate-700">Exercice 1.</strong> Énoncé de démonstration : montrez que… (le PDF complet serait affiché ici en production).</div>
                  <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-500"><strong className="text-slate-700">Exercice 2.</strong> Énoncé de démonstration : calculez…</div>
                  <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-500"><strong className="text-slate-700">Exercice 3.</strong> QCM de démonstration (10 questions).</div>
                </div>
                <button onClick={download} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0B63CE] text-sm font-bold text-white hover:bg-[#0956B4]">
                  <Download className="h-4 w-4" /> Télécharger le sujet complet (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <h2 className="text-[15px] font-extrabold text-[#0B2A4A]">Détails</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Organisme</dt><dd className="font-bold text-[#0B2A4A]">{e.organizationName}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Matière</dt><dd className="font-bold text-[#0B2A4A]">{e.subject}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Année</dt><dd className="font-bold text-[#0B2A4A]">{e.year}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Niveau</dt><dd className="font-bold text-[#0B2A4A]">{e.level}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Corrigé</dt><dd className="font-bold text-[#0B2A4A]">{e.hasCorrection ? 'Oui' : 'Non'}</dd></div>
            </dl>
          </div>
          {e.schoolId && (
            <Link to={`/ecoles/${loadDB().schools.find((s) => s.id === e.schoolId)?.slug}`} className="block rounded-2xl bg-[#0B2A4A] p-5 text-white hover:opacity-95">
              <p className="text-sm font-extrabold">Voir l'école</p>
              <p className="mt-1 text-[13px] text-sky-200">Découvrez les concours de {e.schoolName}.</p>
            </Link>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-[#0B2A4A]">Examens similaires</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((r) => <ExamCard key={r.id} e={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
