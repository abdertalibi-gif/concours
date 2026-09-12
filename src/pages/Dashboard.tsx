// ============================================================
// CONCOURS MAROC — Espace utilisateur
// Dashboard professionnel avec navigation horizontale défilable,
// vraies statistiques, alertes de dates limites et favoris réels
// ============================================================
import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  Bell, BookOpen, CheckCircle2, ChevronRight, LayoutDashboard,
  Settings, Star, Trophy, UserIcon, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  getProgress, loadDB, markAllRead, markNotificationRead, unreadCount,
  userFavorites, userFollows, userNotifications
} from '../lib/db';
import { CompetitionCard, CourseCard, DocumentCard, ExamCard } from '../components/cards';
import { Alert, Button, EmptyState, Field, Input, ProgressBar, StatCard } from '../components/ui';
import { CITIES, LEVELS, remainingLabel, timeAgo } from '../lib/utils';
import { cn } from '../utils/cn';

function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/connexion" replace />;
  return <>{children}</>;
}

// ---------------- Navigation horizontale défilable pour le Dashboard ----------------
export function DashHorizontalNav() {
  const loc = useLocation();
  const { user } = useAuth();
  const db = loadDB();

  const followsCount = user ? userFollows(user.id).length : 0;
  const favsCount = user ? userFavorites(user.id).length : 0;
  const notifCount = user ? unreadCount(user.id) : 0;
  const coursesCount = user ? db.progress.filter((p) => p.userId === user.id).length : 0;

  const items = [
    { to: '/dashboard', label: 'Vue d’ensemble', icon: LayoutDashboard, exact: true },
    { to: '/dashboard/concours', label: 'Mes concours', icon: Trophy, count: followsCount },
    { to: '/dashboard/cours', label: 'Mes cours & Révisions', icon: BookOpen, count: coursesCount },
    { to: '/dashboard/favoris', label: 'Mes favoris', icon: Star, count: favsCount },
    { to: '/dashboard/notifications', label: 'Notifications', icon: Bell, count: notifCount, alert: notifCount > 0 },
    { to: '/dashboard/profil', label: 'Mon profil', icon: UserIcon },
    { to: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
  ];

  return (
    <div className="mb-6 overflow-x-auto pb-1.5 scrollbar-none">
      <div className="flex items-center gap-2 min-w-max p-1 bg-white rounded-2xl border border-[#E6ECF3] shadow-xs">
        {items.map((item) => {
          const active = item.exact ? loc.pathname === item.to : loc.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all',
                active
                  ? 'bg-[#0B63CE] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0B2A4A] hover:bg-slate-50'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-black',
                    active
                      ? 'bg-white/20 text-white'
                      : item.alert
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-700'
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ==================== ACCUEIL DASHBOARD ====================
export function DashHome() {
  return <Guard><DashHomeInner /></Guard>;
}

function DashHomeInner() {
  const { user } = useAuth();
  const db = loadDB();
  const follows = user ? userFollows(user.id) : [];
  const favs = user ? userFavorites(user.id) : [];
  const notifUnread = user ? unreadCount(user.id) : 0;
  const myProgress = user ? db.progress.filter((p) => p.userId === user.id) : [];

  const followedConcours = follows
    .map((f) => db.competitions.find((c) => c.id === f.competitionId))
    .filter(Boolean);

  const inProgressCourses = myProgress
    .map((p) => ({ course: db.courses.find((c) => c.id === p.courseId), percent: p.percent }))
    .filter((x) => x.course);

  // Concours urgents (deadline dans moins de 30 jours)
  const urgentCompetitions = followedConcours.filter((c) => {
    if (!c?.registrationDeadline) return false;
    const days = Math.ceil((new Date(c.registrationDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  });

  return (
    <div>
      <DashHorizontalNav />

      {/* En-tête de bienvenue */}
      <div className="rounded-2xl border border-[#E6ECF3] bg-gradient-to-r from-[#0B2A4A] via-[#0B3D75] to-[#0B63CE] p-6 text-white shadow-xs sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-md bg-white/15 px-2.5 py-0.5 text-xs font-bold text-sky-200">
                Espace Candidat
              </span>
              <span className="text-xs text-sky-200">Royaume du Maroc</span>
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Bienvenue, {user?.firstName} 👋
            </h1>
            <p className="mt-1 text-sm text-sky-100 max-w-xl">
              Suivez vos candidatures aux grandes écoles et concours administratifs en temps réel.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to="/concours"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#0B2A4A] hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Trophy className="h-4 w-4 text-[#0B63CE]" />
              Explorer les concours
            </Link>
          </div>
        </div>
      </div>

      {/* Cartes statistiques */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          value={follows.length}
          label="Concours suivis"
          to="/dashboard/concours"
          color="bg-sky-50 text-[#0B63CE]"
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          value={favs.length}
          label="Favoris enregistrés"
          to="/dashboard/favoris"
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          value={myProgress.length}
          label="Cours en cours"
          to="/dashboard/cours"
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={<Bell className="h-5 w-5" />}
          value={notifUnread}
          label="Notifications"
          to="/dashboard/notifications"
          color="bg-violet-50 text-violet-600"
        />
      </div>

      {/* Alerte dates limites imminentes */}
      {urgentCompetitions.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-black text-amber-950">
                Dates limites d'inscription imminentes !
              </h2>
              <p className="mt-0.5 text-xs text-amber-800">
                {urgentCompetitions.length} concours suivi{urgentCompetitions.length > 1 ? 's' : ''} clôture ses candidatures dans moins de 30 jours :
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {urgentCompetitions.map((c) => {
                  const rem = remainingLabel(c!.registrationDeadline);
                  return (
                    <Link
                      key={c!.id}
                      to={`/concours/${c!.slug}`}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 text-xs ring-1 ring-amber-200 hover:shadow-xs transition-shadow"
                    >
                      <span className="font-bold text-[#0B2A4A] truncate">{c!.title}</span>
                      <span className="shrink-0 font-black text-amber-700">{rem.text}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mes concours suivis */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[#0B2A4A]">Mes concours suivis</h2>
            <p className="text-xs text-slate-500">Avis officiels, dates d’épreuves et procédures</p>
          </div>
          <Link to="/dashboard/concours" className="text-xs font-bold text-[#0B63CE] hover:underline flex items-center gap-1">
            Voir tous mes concours <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {followedConcours.length === 0 ? (
          <EmptyState
            icon={<Trophy className="h-6 w-6" />}
            title="Aucun concours suivi pour le moment"
            message="Cliquez sur 'Suivre' sur n'importe quelle fiche de concours pour recevoir les alertes de dates limites."
            action={
              <Link to="/concours" className="rounded-xl bg-[#0B63CE] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0956B4]">
                Découvrir les concours ouverts
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {followedConcours.slice(0, 3).map((c) => (
              <CompetitionCard key={c!.id} c={c!} />
            ))}
          </div>
        )}
      </div>

      {/* Cours et révisions en cours */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[#0B2A4A]">Progression des cours</h2>
            <p className="text-xs text-slate-500">Parcours d’entraînement aux concours d’ingénieurs et de commerce</p>
          </div>
          <Link to="/preparation" className="text-xs font-bold text-[#0B63CE] hover:underline flex items-center gap-1">
            Catalogue complet <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {inProgressCourses.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title="Aucun cours commencé"
            message="Renforcez vos chances en suivant nos modules officiels de mathématiques, logique et culture générale."
            action={
              <Link to="/preparation" className="rounded-xl bg-[#0B63CE] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0956B4]">
                Explorer les cours
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {inProgressCourses.slice(0, 3).map(({ course, percent }) => (
              <CourseCard key={course!.id} c={course!} progress={percent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== MES CONCOURS ====================
export function DashConcours() {
  return <Guard><DashConcoursInner /></Guard>;
}

function DashConcoursInner() {
  const { user } = useAuth();
  const db = loadDB();
  const follows = user ? userFollows(user.id) : [];
  const list = follows
    .map((f) => db.competitions.find((c) => c.id === f.competitionId))
    .filter(Boolean);

  return (
    <div>
      <DashHorizontalNav />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-[#0B2A4A]">Mes concours suivis</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {list.length} concours sous surveillance active.
          </p>
        </div>
        <Link
          to="/concours"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B63CE] px-4 py-2 text-xs font-bold text-white hover:bg-[#0956B4]"
        >
          <Trophy className="h-4 w-4" />
          Ajouter un concours
        </Link>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="Aucun concours suivi"
          message="Recherchez un concours pour l’ajouter à votre liste de suivi personnel."
          action={
            <Link to="/concours" className="rounded-xl bg-[#0B63CE] px-5 py-2.5 text-xs font-bold text-white">
              Découvrir les concours
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <CompetitionCard key={c!.id} c={c!} />
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== MES COURS ====================
export function DashCours() {
  return <Guard><DashCoursInner /></Guard>;
}

function DashCoursInner() {
  const { user } = useAuth();
  const db = loadDB();
  const myProgress = user ? db.progress.filter((p) => p.userId === user.id) : [];
  const avg = myProgress.length
    ? Math.round(myProgress.reduce((n, p) => n + p.percent, 0) / myProgress.length)
    : 0;

  return (
    <div>
      <DashHorizontalNav />
      <div className="rounded-2xl border border-[#E6ECF3] bg-white p-6 shadow-xs mb-6">
        <h1 className="text-2xl font-black text-[#0B2A4A]">Mes cours de préparation</h1>
        <p className="mt-1 text-xs text-slate-500">
          Progression moyenne : <strong className="text-[#0B63CE]">{avg}%</strong>
        </p>
        <div className="mt-3 max-w-md">
          <ProgressBar value={avg} />
        </div>
      </div>

      {myProgress.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Aucun cours commencé"
          message="Commencez un parcours pour réviser méthodiquement."
          action={
            <Link to="/preparation" className="rounded-xl bg-[#0B63CE] px-5 py-2.5 text-xs font-bold text-white">
              Explorer les cours
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {myProgress.map((p) => {
            const c = db.courses.find((x) => x.id === p.courseId);
            if (!c) return null;
            return <CourseCard key={p.id} c={c} progress={p.percent} />;
          })}
        </div>
      )}
    </div>
  );
}

// ==================== FAVORIS ====================
export function DashFavoris() {
  return <Guard><DashFavorisInner /></Guard>;
}

function DashFavorisInner() {
  const { user } = useAuth();
  const db = loadDB();
  const [tab, setTab] = useState<'ALL' | 'CONCOURS' | 'EXAMEN' | 'DOCUMENT' | 'COURS'>('ALL');
  const favs = user
    ? userFavorites(user.id).filter((f) => tab === 'ALL' || f.targetType === tab)
    : [];

  return (
    <div>
      <DashHorizontalNav />
      <h1 className="text-2xl font-black text-[#0B2A4A]">Mes favoris</h1>
      <p className="mt-0.5 text-xs text-slate-500">
        Tous vos éléments enregistrés au même endroit.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(['ALL', 'CONCOURS', 'EXAMEN', 'DOCUMENT', 'COURS'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'h-9 rounded-xl px-4 text-xs font-bold ring-1 ring-inset transition-colors',
              tab === t
                ? 'bg-[#0B2A4A] text-white ring-[#0B2A4A]'
                : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
            )}
          >
            {t === 'ALL'
              ? 'Tous'
              : t === 'CONCOURS'
              ? 'Concours'
              : t === 'EXAMEN'
              ? 'Examens'
              : t === 'DOCUMENT'
              ? 'Documents'
              : 'Cours'}
          </button>
        ))}
      </div>

      {favs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Star className="h-6 w-6" />}
            title="Aucun favori dans cette catégorie"
            message="Cliquez sur l’icône cœur pour sauvegarder des fiches d’examens, concours ou documents."
            action={
              <Link to="/concours" className="rounded-xl bg-[#0B63CE] px-5 py-2.5 text-xs font-bold text-white">
                Explorer
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {favs.map((f) => {
            if (f.targetType === 'CONCOURS') {
              const c = db.competitions.find((x) => x.id === f.targetId);
              return c ? <CompetitionCard key={f.id} c={c} /> : null;
            }
            if (f.targetType === 'EXAMEN') {
              const e = db.exams.find((x) => x.id === f.targetId);
              return e ? <ExamCard key={f.id} e={e} /> : null;
            }
            if (f.targetType === 'DOCUMENT') {
              const d = db.documents.find((x) => x.id === f.targetId);
              return d ? <DocumentCard key={f.id} d={d} /> : null;
            }
            if (f.targetType === 'COURS') {
              const c = db.courses.find((x) => x.id === f.targetId);
              return c ? (
                <CourseCard
                  key={f.id}
                  c={c}
                  progress={user ? getProgress(user.id, c.id)?.percent : 0}
                />
              ) : null;
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

// ==================== NOTIFICATIONS ====================
export function DashNotifications() {
  return <Guard><DashNotifInner /></Guard>;
}

function DashNotifInner() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const notifs = user
    ? userNotifications(user.id).filter((n) => filter === 'all' || !n.readBy.includes(user.id))
    : [];

  const tone = (t: string) =>
    t === 'success'
      ? 'bg-emerald-50 text-emerald-700'
      : t === 'warning' || t === 'deadline'
      ? 'bg-amber-50 text-amber-700'
      : t === 'result'
      ? 'bg-violet-50 text-violet-700'
      : 'bg-sky-50 text-sky-700';

  return (
    <div>
      <DashHorizontalNav />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0B2A4A]">Notifications</h1>
          <p className="mt-0.5 text-xs text-slate-500">Alertes officielles et actualités de vos concours</p>
        </div>
        {user && (
          <Button variant="outline" size="sm" onClick={() => markAllRead(user.id)}>
            <CheckCircle2 className="h-4 w-4" /> Tout marquer comme lu
          </Button>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'h-9 rounded-xl px-4 text-xs font-bold ring-1 ring-inset',
            filter === 'all'
              ? 'bg-[#0B2A4A] text-white ring-[#0B2A4A]'
              : 'bg-white text-slate-600 ring-slate-200'
          )}
        >
          Toutes
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'h-9 rounded-xl px-4 text-xs font-bold ring-1 ring-inset',
            filter === 'unread'
              ? 'bg-[#0B2A4A] text-white ring-[#0B2A4A]'
              : 'bg-white text-slate-600 ring-slate-200'
          )}
        >
          Non lues
        </button>
      </div>

      {notifs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title="Aucune notification"
            message="Vous recevrez ici les annonces officielles dès parution."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {notifs.map((n) => {
            const read = user ? n.readBy.includes(user.id) : true;
            return (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-4 rounded-2xl border p-4 transition-colors',
                  read
                    ? 'border-slate-200/70 bg-white'
                    : 'border-sky-200 bg-sky-50/70 shadow-xs'
                )}
              >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone(n.type))}>
                  <Bell className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#0B2A4A]">{n.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.message}</p>
                  <p className="mt-1.5 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {n.link && (
                    <Link
                      to={n.link}
                      className="rounded-lg bg-[#0B63CE] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0956B4]"
                    >
                      Consulter
                    </Link>
                  )}
                  {!read && user && (
                    <button
                      onClick={() => markNotificationRead(user.id, n.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#0B63CE] ring-1 ring-inset ring-sky-200 hover:bg-sky-50"
                    >
                      Marquer lue
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== PROFIL ====================
export function DashProfil() {
  return <Guard><DashProfilInner /></Guard>;
}

function DashProfilInner() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    city: user?.city ?? '',
    level: user?.level ?? '',
    phone: user?.phone ?? '',
    bio: user?.bio ?? '',
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = await updateProfile(form);
    setLoading(false);
    setMsg(r.ok ? { ok: true, text: 'Profil mis à jour avec succès.' } : { ok: false, text: r.error ?? 'Erreur.' });
  };

  return (
    <div className="max-w-2xl">
      <DashHorizontalNav />
      <h1 className="text-2xl font-black text-[#0B2A4A]">Mon profil candidat</h1>
      <p className="mt-0.5 text-xs text-slate-500">{user?.email} • Compte {user?.role}</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        {msg && <Alert tone={msg.ok ? 'success' : 'error'} message={msg.text} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" required>
            <Input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
          </Field>
          <Field label="Nom" required>
            <Input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville">
            <select
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              className="h-10 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
            >
              <option value="">— Sélectionner une ville —</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Niveau d'études">
            <select
              value={form.level}
              onChange={(e) => set('level', e.target.value)}
              className="h-10 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
            >
              <option value="">— Niveau actuel —</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Téléphone">
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+212 6 XX XX XX XX" />
        </Field>
        <Field label="Objectif & Parcours">
          <textarea
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
            rows={3}
            className="w-full rounded-xl p-3 text-xs ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
            placeholder="Ex : Préparation au concours ENSA et CNC filière MP..."
          />
        </Field>
        <Button type="submit" loading={loading}>
          Enregistrer le profil
        </Button>
      </form>
    </div>
  );
}

// ==================== PARAMÈTRES ====================
export function DashParametres() {
  return <Guard><DashParamInner /></Guard>;
}

function DashParamInner() {
  const { changePassword } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.confirm) {
      setMsg({ ok: false, text: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    setLoading(true);
    const r = await changePassword(form.current, form.next);
    setLoading(false);
    setMsg(r.ok ? { ok: true, text: 'Mot de passe modifié avec succès.' } : { ok: false, text: r.error ?? 'Erreur.' });
    if (r.ok) setForm({ current: '', next: '', confirm: '' });
  };

  return (
    <div className="max-w-2xl">
      <DashHorizontalNav />
      <h1 className="text-2xl font-black text-[#0B2A4A]">Paramètres de sécurité</h1>
      <p className="mt-0.5 text-xs text-slate-500">Mettez à jour vos identifiants d'accès</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-base font-black text-[#0B2A4A]">Changer le mot de passe</h2>
        {msg && <Alert tone={msg.ok ? 'success' : 'error'} message={msg.text} />}
        <Field label="Mot de passe actuel" required>
          <Input type="password" required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nouveau mot de passe" required hint="8 caractères minimum">
            <Input type="password" required minLength={8} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
          </Field>
          <Field label="Confirmer" required>
            <Input type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </Field>
        </div>
        <Button type="submit" loading={loading}>
          Modifier le mot de passe
        </Button>
      </form>
    </div>
  );
}
