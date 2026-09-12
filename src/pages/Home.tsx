// ============================================================
// CONCOURS MAROC — Page d'accueil
// ============================================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Building2, CalendarCheck2, ClipboardList,
  FileQuestion, FileText, GraduationCap, Landmark, Layers, Search, ShieldCheck,
  Sparkles, Trophy,
} from 'lucide-react';
import { loadDB, publicStats, queryCompetitions, queryCourses, queryExams, queryDocuments, schoolStats } from '../lib/db';
import { CompetitionCard, CourseCard, ExamCard, SchoolCard, DocumentCard } from '../components/cards';
import { LinkButton, SectionTitle } from '../components/ui';

export default function Home() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const db = loadDB();
  const stats = publicStats();

  const recent = queryCompetitions({ sort: 'recent' }, 1, 8).items;
  const exams = queryExams({}, 1, 4).items;
  const courses = queryCourses().slice(0, 3);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    nav(q.trim() ? `/concours?q=${encodeURIComponent(q.trim())}` : '/concours');
  };

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/hero-morocco.jpg" alt="Université marocaine — campus avec minaret et palmiers" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#F4F7FB] via-[#F4F7FB]/90 to-[#F4F7FB]/10" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16">
          <span className="inline-block rounded-lg bg-[#0B63CE] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white">Concours</span>
          <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-[#0B2A4A] sm:text-[44px] sm:leading-[1.1]">
            Tous les concours et examens du Maroc au même endroit
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
            Découvrez les concours, examens, dates d'inscription, conditions d'accès et ressources de préparation.
          </p>
          <form onSubmit={submit} className="mt-6 flex max-w-xl flex-col gap-2 sm:flex-row" role="search">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher un concours, une école ou un examen..."
                aria-label="Rechercher un concours, une école ou un examen"
                className="h-12 w-full rounded-xl bg-white pl-11 pr-4 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
              />
            </div>
            <button type="submit" className="h-12 shrink-0 rounded-xl bg-[#0B63CE] px-6 text-sm font-bold text-white shadow-sm hover:bg-[#0956B4]">
              Rechercher
            </button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <LinkButton to="/concours" size="lg">Voir les concours <ArrowRight className="h-4 w-4" /></LinkButton>
            <LinkButton to="/ecoles" size="lg" variant="outline">Explorer les écoles</LinkButton>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-10 sm:px-6">
        
        {/* ============ STATISTIQUES ============ */}
        <section aria-labelledby="stats">
          <div id="stats"><SectionTitle icon={<ShieldCheck className="h-6 w-6" />} title="Statistiques" subtitle="La plateforme numéro 1 au Maroc" /></div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat value={stats.concours} label="Concours disponibles" icon={<Trophy className="h-4 w-4" />} />
            <Stat value={stats.ecoles} label="Écoles & Institutions" icon={<GraduationCap className="h-4 w-4" />} />
            <Stat value={stats.examens} label="Anciens Examens" icon={<FileText className="h-4 w-4" />} />
            <Stat value={stats.documents} label="Documents & Fiches" icon={<BookOpen className="h-4 w-4" />} />
          </dl>
        </section>

        {/* ============ CONCOURS ============ */}
        <section aria-labelledby="concours">
          <div id="concours"><SectionTitle icon={<CalendarCheck2 className="h-6 w-6" />} title="Concours" subtitle="Les derniers concours ouverts"
            action={<Link to="/concours" className="inline-flex items-center gap-1 text-sm font-bold text-[#0B63CE] hover:underline">Tout voir <ArrowRight className="h-4 w-4" /></Link>} /></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {recent.slice(0, 4).map((c) => <CompetitionCard key={c.id} c={c} />)}
          </div>
        </section>

        {/* ============ EXAMENS ============ */}
        <section aria-labelledby="exams">
          <div id="exams"><SectionTitle icon={<FileText className="h-6 w-6" />} title="Examens" subtitle="Sujets des années précédentes pour vous entraîner"
            action={<Link to="/examens" className="inline-flex items-center gap-1 text-sm font-bold text-[#0B63CE] hover:underline">Tout voir <ArrowRight className="h-4 w-4" /></Link>} /></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {exams.map((e) => <ExamCard key={e.id} e={e} />)}
          </div>
        </section>

        {/* ============ ÉCOLES ============ */}
        <section aria-labelledby="schools">
          <div id="schools"><SectionTitle icon={<GraduationCap className="h-6 w-6" />} title="Écoles" subtitle="Grandes écoles d'ingénieurs et de commerce" /></div>
          <div className="grid gap-4 md:grid-cols-3">
            {db.schools.filter(s => s.type !== 'institute' && s.type !== 'ofppt').map((s) => <SchoolCard key={s.id} s={s} stats={schoolStats(s.id)} />)}
          </div>
        </section>

        {/* ============ UNIVERSITÉS ============ */}
        <section aria-labelledby="universities">
          <div id="universities"><SectionTitle icon={<Building2 className="h-6 w-6" />} title="Universités" subtitle="Les universités publiques marocaines" /></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {db.universities.map((u) => (
              <Link key={u.id} to={`/ecoles/${u.slug}`} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                {u.logoUrl ? (
                  <img src={u.logoUrl} alt={`Logo de ${u.name}`} className="h-10 w-10 shrink-0 object-contain" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white" style={{ background: u.logoColor }}>{u.shortName?.slice(0, 2)}</span>
                )}
                <span className="line-clamp-2 text-[13px] font-bold leading-tight text-[#0B2A4A]">{u.shortName || u.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ============ MINISTÈRES ============ */}
        <section aria-labelledby="ministries">
          <div id="ministries"><SectionTitle icon={<Landmark className="h-6 w-6" />} title="Ministères" subtitle="Toutes les catégories de concours publics" /></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {db.ministries.map((m) => (
              <Link key={m.id} to={`/concours?ministere=${m.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                {m.logoUrl ? (
                  <img src={m.logoUrl} alt={`Logo de ${m.name}`} className="h-10 w-10 shrink-0 object-contain" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white" style={{ background: m.logoColor }}>{m.shortName.slice(0, 2)}</span>
                )}
                <span className="line-clamp-2 text-[13px] font-bold leading-tight text-[#0B2A4A]">{m.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ============ INSTITUTS ============ */}
        <section aria-labelledby="institutes">
          <div id="institutes"><SectionTitle icon={<Building2 className="h-6 w-6" />} title="Instituts" subtitle="Instituts supérieurs et spécialisés" /></div>
          <div className="grid gap-4 md:grid-cols-3">
            {db.schools.filter(s => s.type === 'institute' || s.type === 'ofppt').map((s) => (
              <SchoolCard key={s.id} s={s} stats={schoolStats(s.id)} />
            ))}
          </div>
        </section>

        {/* ============ FORMATIONS ============ */}
        <section aria-labelledby="formations">
          <div id="formations"><SectionTitle icon={<BookOpen className="h-6 w-6" />} title="Formations" subtitle="Découvrez les formations disponibles"
            action={<Link to="/preparation" className="inline-flex items-center gap-1 text-sm font-bold text-[#0B63CE] hover:underline">Tout voir <ArrowRight className="h-4 w-4" /></Link>} /></div>
          <div className="grid gap-4 md:grid-cols-3">
            {courses.map((c) => <CourseCard key={c.id} c={c} />)}
          </div>
        </section>

        {/* ============ DOCUMENTS ============ */}
        <section aria-labelledby="documents">
          <div id="documents"><SectionTitle icon={<BookOpen className="h-6 w-6" />} title="Documents" subtitle="Avis, arrêtés et documents officiels"
            action={<Link to="/documents" className="inline-flex items-center gap-1 text-sm font-bold text-[#0B63CE] hover:underline">Tout voir <ArrowRight className="h-4 w-4" /></Link>} /></div>
          <div className="grid gap-4 md:grid-cols-3">
            {queryDocuments({}, 1, 3).items.map((d) => <DocumentCard key={d.id} d={d} />)}
          </div>
        </section>

        {/* ============ PRÉPARATION ============ */}
        <section aria-labelledby="prep" className="rounded-2xl bg-[#0B2A4A] p-6 sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">Préparation</h2>
              <p className="mt-1 text-sm text-sky-200">Cours, exercices, quiz et concours blancs pour maximiser vos chances.</p>
            </div>
            <Link to="/preparation" className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0B2A4A] hover:bg-sky-50">Explorer <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <PrepTile icon={<BookOpen className="h-5 w-5" />} label="Cours" desc="Leçons structurées" />
            <PrepTile icon={<ClipboardList className="h-5 w-5" />} label="Exercices" desc="Corrigés détaillés" />
            <PrepTile icon={<FileQuestion className="h-5 w-5" />} label="Quiz" desc="QCM chronométrés" />
            <PrepTile icon={<Layers className="h-5 w-5" />} label="Concours blancs" desc="Conditions réelles" />
            <PrepTile icon={<FileText className="h-5 w-5" />} label="Anciens examens" desc="Sujets + corrigés" />
            <PrepTile icon={<Sparkles className="h-5 w-5" />} label="Fiches de révision" desc="L'essentiel" />
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B63CE] to-[#084e9e] p-8 text-center sm:p-12">
          <h2 className="mx-auto max-w-xl text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Ne ratez plus aucune date limite</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-sky-100">Créez un compte gratuit, suivez vos concours et recevez des alertes avant la clôture des inscriptions.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/inscription" className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#0B63CE] hover:bg-sky-50">Créer un compte gratuit</Link>
            <Link to="/concours" className="rounded-xl px-6 py-3 text-sm font-bold text-white ring-1 ring-inset ring-white/40 hover:bg-white/10">Voir les concours</Link>
          </div>
        </section>

      </div>
    </div>
  );
}
function Stat({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/90 p-3.5 shadow-sm ring-1 ring-slate-200/60 backdrop-blur">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500"><span className="text-[#0B63CE]">{icon}</span>{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-[#0B2A4A]">{value}</p>
    </div>
  );
}

function PrepTile({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <Link to="/preparation" className="rounded-2xl bg-white/10 p-4 text-left ring-1 ring-inset ring-white/15 backdrop-blur transition-colors hover:bg-white/15">
      <span className="text-amber-300">{icon}</span>
      <p className="mt-2 text-sm font-extrabold text-white">{label}</p>
      <p className="text-xs text-sky-200">{desc}</p>
    </Link>
  );
}
