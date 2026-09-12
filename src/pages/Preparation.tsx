// ============================================================
// CONCOURS MAROC — Préparation (cours + interface d'apprentissage)
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight, Circle, Clock,
  FileText, MonitorPlay, PenLine,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { courseLessonsCount, getCourseBySlug, getProgress, loadDB, queryCourses, toggleLessonComplete } from '../lib/db';
import type { Course, Lesson } from '../lib/types';
import { CourseCard } from '../components/cards';
import { Container, InfoBar, PageHero } from '../components/layout';
import { Card, Chip, DemoBadge, EmptyState, FilterPanel, FilterSelect, ProgressBar, SearchInput } from '../components/ui';
import { cn } from '../utils/cn';

// ==================== LISTE ====================
export function PreparationList() {
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const { user } = useAuth();
  const courses = queryCourses(q, subject);
  const subjects = useMemo(() => [...new Set(loadDB().courses.map((c) => c.subject))], []);

  const cats = [
    { icon: <BookOpen className="h-5 w-5" />, label: 'Cours', desc: 'Leçons structurées par chapitre' },
    { icon: <PenLine className="h-5 w-5" />, label: 'Exercices', desc: 'Avec corrections détaillées' },
    { icon: <CheckCircle2 className="h-5 w-5" />, label: 'Quiz', desc: 'QCM chronométrés' },
    { icon: <Clock className="h-5 w-5" />, label: 'Concours blancs', desc: 'En conditions réelles' },
    { icon: <FileText className="h-5 w-5" />, label: 'Fiches', desc: "L'essentiel à retenir" },
    { icon: <MonitorPlay className="h-5 w-5" />, label: 'Vidéos', desc: 'Explications pas à pas' },
  ];

  return (
    <div>
      <PageHero badge="Préparation" title="Préparez vos concours efficacement" compact
        subtitle="Cours complets, exercices corrigés, quiz chronométrés et concours blancs pour chaque filière." />
      <Container>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cats.map((c) => (
            <Card key={c.label} className="p-4 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-[#0B63CE] ring-1 ring-inset ring-sky-100">{c.icon}</span>
              <p className="mt-2 text-sm font-extrabold text-[#0B2A4A]">{c.label}</p>
              <p className="text-xs text-slate-500">{c.desc}</p>
            </Card>
          ))}
        </div>

        <div className="mt-6">
          <FilterPanel>
            <div className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
              <div>
                <span className="mb-1 block text-xs font-bold text-slate-500">Recherche</span>
                <SearchInput value={q} onChange={setQ} placeholder="Rechercher un cours..." label="Rechercher un cours" />
              </div>
              <FilterSelect label="Matière" value={subject} onChange={setSubject} options={[{ v: '', l: 'Toutes les matières' }, ...subjects.map((s) => ({ v: s, l: s }))]} />
            </div>
          </FilterPanel>
        </div>

        {courses.length === 0 ? (
          <div className="mt-4"><EmptyState icon={<BookOpen className="h-6 w-6" />} title="Aucun cours trouvé" message="Essayez d'ajuster votre recherche." /></div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((c) => {
              const p = user ? getProgress(user.id, c.id) : undefined;
              return <CourseCard key={c.id} c={c} progress={p?.percent} />;
            })}
          </div>
        )}
      </Container>
      <InfoBar />
    </div>
  );
}

// ==================== COURS ====================
export function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const course = slug ? getCourseBySlug(slug) : undefined;
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const allLessons = useMemo(() => course?.chapters.flatMap((ch) => ch.lessons.map((l) => ({ ...l, chapterTitle: ch.title }))) ?? [], [course]);

  useEffect(() => { window.scrollTo(0, 0); setActiveLessonId(null); }, [slug]);
  useEffect(() => {
    if (course) {
      document.title = `${course.title} | Concours Maroc`;
      if (!activeLessonId && allLessons.length > 0) setActiveLessonId(allLessons[0].id);
    }
    return () => { document.title = 'Concours Maroc — Tous les concours et examens du Maroc'; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course]);

  if (!course || course.publishStatus !== 'PUBLISHED') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-[#0B2A4A]">Cours introuvable</h1>
        <Link to="/preparation" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-2.5 text-sm font-bold text-white"><ArrowLeft className="h-4 w-4" /> Retour à la préparation</Link>
      </div>
    );
  }

  const progress = user ? getProgress(user.id, course.id) : undefined;
  const activeIndex = allLessons.findIndex((l) => l.id === activeLessonId);
  const active = allLessons[activeIndex] ?? allLessons[0];
  const completed = new Set(progress?.completedLessons ?? []);

  const markComplete = () => {
    if (!user) return nav('/connexion');
    if (active) toggleLessonComplete(user.id, course.id, active.id);
  };
  const goTo = (idx: number) => {
    if (idx >= 0 && idx < allLessons.length) {
      setActiveLessonId(allLessons[idx].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-[13px] text-slate-500">
        <Link to="/" className="hover:text-[#0B63CE]">Accueil</Link><ChevronRight className="h-3.5 w-3.5" />
        <Link to="/preparation" className="hover:text-[#0B63CE]">Préparation</Link><ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate font-semibold text-[#0B2A4A]">{course.title}</span>
      </nav>

      <div className="mt-4 rounded-2xl p-6 text-white sm:p-8" style={{ background: `linear-gradient(135deg, #0B2A4A, ${course.color})` }}>
        <div className="flex flex-wrap items-center gap-2">
          <Chip className="!bg-white/15 !text-white">{course.subject}</Chip>
          <Chip className="!bg-white/15 !text-white">{course.level}</Chip>
          <Chip className="!bg-white/15 !text-white">{courseLessonsCount(course)} leçons</Chip>
          <Chip className="!bg-white/15 !text-white">{course.duration}</Chip>
          {course.isDemo && <DemoBadge />}
        </div>
        <h1 className="mt-3 max-w-3xl text-2xl font-extrabold tracking-tight sm:text-3xl">{course.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">{course.description}</p>
        <div className="mt-4 max-w-md">
          <div className="flex items-center justify-between text-xs font-bold text-white/80"><span>Votre progression</span><span>{progress?.percent ?? 0}%</span></div>
          <ProgressBar value={progress?.percent ?? 0} className="mt-1.5 !bg-white/20 [&>div]:!bg-amber-400" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Sidebar chapitres */}
        <aside className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white lg:sticky lg:top-24">
            <p className="border-b border-slate-100 px-4 py-3 text-sm font-extrabold text-[#0B2A4A]">Chapitres du cours</p>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {course.chapters.map((ch, ci) => (
                <div key={ch.id} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">Chapitre {ci + 1} — {ch.title}</p>
                  {ch.lessons.map((l) => {
                    const done = completed.has(l.id);
                    const isActive = l.id === active?.id;
                    return (
                      <button key={l.id} onClick={() => setActiveLessonId(l.id)}
                        className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold',
                          isActive ? 'bg-sky-50 text-[#0B63CE]' : 'text-slate-600 hover:bg-slate-50')}>
                        {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
                        <span className="min-w-0 flex-1 truncate">{l.title}</span>
                        <LessonIcon type={l.type} />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Contenu leçon */}
        <div className="min-w-0">
          {active && (
            <article className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{(active as { chapterTitle?: string }).chapterTitle}</p>
              <h2 className="mt-1 text-xl font-extrabold text-[#0B2A4A] sm:text-2xl">{active.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <LessonBadge type={active.type} />
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{active.duration}</span>
                <span>Leçon {activeIndex + 1} / {allLessons.length}</span>
              </div>

              {active.type === 'VIDEO' && (
                <div className="mt-5 flex aspect-video items-center justify-center rounded-2xl bg-[#0B2A4A]">
                  <div className="text-center">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30"><MonitorPlay className="h-8 w-8" /></span>
                    <p className="mt-3 text-sm font-bold text-white">Vidéo de démonstration</p>
                    <p className="mt-1 text-xs text-sky-200">Le lecteur vidéo sera intégré ici en production.</p>
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-[15px] leading-relaxed text-slate-700 ring-1 ring-inset ring-slate-100">
                {active.content}
              </div>

              {active.type === 'QUIZ' && <QuizDemo />}

              <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4 hover:bg-slate-50">
                <input type="checkbox" checked={completed.has(active.id)} onChange={markComplete} className="h-5 w-5 accent-[#0B63CE]" />
                <span className="text-sm font-bold text-[#0B2A4A]">Marquer cette leçon comme terminée</span>
              </label>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <button onClick={() => goTo(activeIndex - 1)} disabled={activeIndex <= 0}
                  className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-[#0B2A4A] ring-1 ring-inset ring-slate-200 hover:bg-slate-50 disabled:opacity-40">
                  <ArrowLeft className="h-4 w-4" /> Leçon précédente
                </button>
                <button onClick={() => goTo(activeIndex + 1)} disabled={activeIndex >= allLessons.length - 1}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0B63CE] px-5 text-sm font-bold text-white hover:bg-[#0956B4] disabled:opacity-40">
                  Leçon suivante <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {!user && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-center text-[13px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"><Link to="/connexion" className="underline">Connectez-vous</Link> pour sauvegarder votre progression.</p>}
            </article>
          )}

          <RelatedCourses current={course} />
        </div>
      </div>
    </div>
  );
}

function LessonIcon({ type }: { type: Lesson['type'] }) {
  const cls = 'h-3.5 w-3.5 shrink-0 text-slate-400';
  if (type === 'VIDEO') return <MonitorPlay className={cls} />;
  if (type === 'QUIZ') return <CheckCircle2 className={cls} />;
  if (type === 'PDF') return <FileText className={cls} />;
  if (type === 'EXERCISE') return <PenLine className={cls} />;
  return <BookOpen className={cls} />;
}

function LessonBadge({ type }: { type: Lesson['type'] }) {
  const labels: Record<string, string> = { VIDEO: 'Vidéo', TEXT: 'Lecture', PDF: 'PDF', QUIZ: 'Quiz', EXERCISE: 'Exercice' };
  return <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-[#0B63CE] ring-1 ring-inset ring-sky-100">{labels[type]}</span>;
}

function QuizDemo() {
  const [picked, setPicked] = useState<number | null>(null);
  const options = ['Réponse A — démonstration', 'Réponse B — démonstration (correcte)', 'Réponse C — démonstration', 'Réponse D — démonstration'];
  return (
    <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50/50 p-5">
      <p className="text-sm font-extrabold text-[#0B2A4A]">Question de démonstration</p>
      <p className="mt-1 text-sm text-slate-600">Quelle est la bonne réponse ? (Quiz interactif de démonstration)</p>
      <div className="mt-3 grid gap-2">
        {options.map((o, i) => (
          <button key={i} onClick={() => setPicked(i)}
            className={cn('rounded-xl px-4 py-2.5 text-left text-sm font-semibold ring-1 ring-inset transition-colors',
              picked === i ? (i === 1 ? 'bg-emerald-50 text-emerald-800 ring-emerald-300' : 'bg-red-50 text-red-700 ring-red-300') : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <p className={cn('mt-3 text-sm font-bold', picked === 1 ? 'text-emerald-700' : 'text-red-600')}>
          {picked === 1 ? 'Bonne réponse ! 🎉' : 'Raté — la bonne réponse était la B.'}
        </p>
      )}
    </div>
  );
}

function RelatedCourses({ current }: { current: Course }) {
  const others = queryCourses().filter((c) => c.id !== current.id).slice(0, 2);
  if (others.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="text-lg font-extrabold text-[#0B2A4A]">Continuer avec d'autres cours</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {others.map((c) => <CourseCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}
