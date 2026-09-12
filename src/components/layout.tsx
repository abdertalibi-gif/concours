// ============================================================
// CONCOURS MAROC — Layouts (même design system partout)
// Header 64px blanc + bordure fine, nav centrée, conteneur 1280px.
// Public, dashboard étudiant et admin partagent les mêmes
// couleurs, cartes, boutons, badges, rayons et ombres.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, BookOpen, Building2, ChevronDown, Contact, FileText,  GraduationCap,
  HelpCircle, Home, Landmark, LayoutDashboard, LogOut, Menu, Search, Settings,
  Star, Trophy, User as UserIcon, Users, X,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../lib/auth';
import { globalSearch, markAllRead, markNotificationRead, unreadCount, userNotifications } from '../lib/db';
import { timeAgo } from '../lib/utils';

export const NAV = [
  { to: '/concours', label: 'Concours' },
  { to: '/examens', label: 'Examens' },
  { to: '/ecoles', label: 'Écoles' },
  { to: '/ecoles?section=universites', label: 'Universités' },
  { to: '/ecoles?section=ministeres', label: 'Ministères' },
  { to: '/ecoles?type=institute', label: 'Instituts' },
  { to: '/preparation', label: 'Formations' },
  { to: '/documents', label: 'Documents' },
  { to: '/preparation', label: 'Préparation' },
];

/** Conteneur global — 1280px centré (cf. référence) */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1280px] px-4 sm:px-6', className)}>{children}</div>;
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Concours Maroc — Accueil">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B63CE] text-sm font-extrabold text-white shadow-sm">CM</span>
      {!compact && (
        <span className="text-[17px] font-extrabold tracking-tight">
          <span className="text-[#0B2A4A]">Concours </span>
          <span className="text-[#F59E0B]">Maroc</span>
        </span>
      )}
    </Link>
  );
}

// ---------------- Recherche globale ----------------
export function GlobalSearch({ mobile }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const results = globalSearch(q);
  const hasResults = results.competitions.length + results.schools.length + results.exams.length + results.documents.length + results.courses.length > 0;

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} className={cn('relative', mobile ? 'w-full' : 'w-56 lg:w-64')}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) { setOpen(false); nav(`/concours?q=${encodeURIComponent(q.trim())}`); } }}
          placeholder="Rechercher…"
          aria-label="Recherche globale"
          className="h-10 w-full rounded-xl bg-slate-100/80 pl-9 pr-3 text-sm text-[#0B2A4A] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
        />
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute right-0 top-12 z-[70] max-h-[70vh] w-[min(92vw,440px)] overflow-y-auto rounded-2xl border border-[#E6ECF3] bg-white p-2 shadow-[0_12px_40px_rgba(11,42,74,0.16)]">
          {!hasResults && <p className="px-3 py-6 text-center text-sm text-slate-500">Aucun résultat pour « {q} »</p>}
          {results.competitions.length > 0 && (
            <Group title="Concours">{results.competitions.map((c) => (
              <Row key={c.id} to={`/concours/${c.slug}`} title={c.title} sub={c.organizationName} onClick={() => setOpen(false)} />
            ))}</Group>
          )}
          {results.schools.length > 0 && (
            <Group title="Écoles">{results.schools.map((s) => (
              <Row key={s.id} to={`/ecoles/${s.slug}`} title={s.shortName} sub={s.city} onClick={() => setOpen(false)} />
            ))}</Group>
          )}
          {results.exams.length > 0 && (
            <Group title="Examens">{results.exams.map((e) => (
              <Row key={e.id} to={`/examens/${e.slug}`} title={e.title} sub={`${e.schoolName} • ${e.year}`} onClick={() => setOpen(false)} />
            ))}</Group>
          )}
          {results.documents.length > 0 && (
            <Group title="Documents">{results.documents.map((d) => (
              <Row key={d.id} to="/documents" title={d.title} sub={d.category} onClick={() => setOpen(false)} />
            ))}</Group>
          )}
          {results.courses.length > 0 && (
            <Group title="Cours">{results.courses.map((c) => (
              <Row key={c.id} to={`/preparation/cours/${c.slug}`} title={c.title} sub={c.subject} onClick={() => setOpen(false)} />
            ))}</Group>
          )}
        </div>
      )}
    </div>
  );
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  return <div className="mb-1"><p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>{children}</div>;
}
function Row({ to, title, sub, onClick }: { to: string; title: string; sub: string; onClick: () => void }) {
  return <Link to={to} onClick={onClick} className="block rounded-xl px-3 py-2 hover:bg-slate-50"><p className="truncate text-sm font-semibold text-[#0B2A4A]">{title}</p><p className="truncate text-xs text-slate-500">{sub}</p></Link>;
}

// ---------------- Notifications ----------------
function NotifBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  const notifs = user ? userNotifications(user.id) : [];
  const unread = user ? unreadCount(user.id) : 0;

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  if (!user) return null;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label={`Notifications (${unread} non lues)`}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-[70] w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-[#E6ECF3] bg-white shadow-[0_12px_40px_rgba(11,42,74,0.16)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-extrabold text-[#0B2A4A]">Notifications</p>
            <button onClick={() => markAllRead(user.id)} className="text-xs font-semibold text-[#0B63CE] hover:underline">Tout marquer comme lues</button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            {notifs.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">Aucune notification.</p>}
            {notifs.slice(0, 10).map((n) => {
              const read = n.readBy.includes(user.id);
              return (
                <button key={n.id} onClick={() => { markNotificationRead(user.id, n.id); setOpen(false); if (n.link) nav(n.link); }}
                  className={cn('block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50', !read && 'bg-sky-50/50')}>
                  <p className="text-[13px] font-bold text-[#0B2A4A]">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                </button>
              );
            })}
          </div>
          <Link to="/dashboard/notifications" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-center text-[13px] font-bold text-[#0B63CE] hover:bg-slate-50">Voir toutes les notifications</Link>
        </div>
      )}
    </div>
  );
}

// ---------------- Menu utilisateur ----------------
function UserMenu() {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  if (!user) {
    return null;
  }
  const init = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded-xl p-1 hover:bg-slate-100" aria-label="Menu du compte" aria-haspopup="true">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-[13px] font-extrabold text-[#0B63CE]">{init}</span>
        <ChevronDown className="hidden h-4 w-4 text-slate-500 md:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-[70] w-60 overflow-hidden rounded-2xl border border-[#E6ECF3] bg-white shadow-[0_12px_40px_rgba(11,42,74,0.16)]">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-extrabold text-[#0B2A4A]">{user.firstName} {user.lastName}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">{user.role}</span>
          </div>
          <div className="p-1.5">
            <MenuLink to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Tableau de bord" onClick={() => setOpen(false)} />
            <MenuLink to="/dashboard/favoris" icon={<Star className="h-4 w-4" />} label="Mes favoris" onClick={() => setOpen(false)} />
            <MenuLink to="/dashboard/profil" icon={<UserIcon className="h-4 w-4" />} label="Profil" onClick={() => setOpen(false)} />
            {isAdmin && <MenuLink to="/admin" icon={<Settings className="h-4 w-4" />} label="Administration" onClick={() => setOpen(false)} />}
            <button onClick={() => { logout(); setOpen(false); nav('/'); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function MenuLink({ to, icon, label, onClick }: { to: string; icon: ReactNode; label: string; onClick: () => void }) {
  return <Link to={to} onClick={onClick} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">{icon}{label}</Link>;
}

// ---------------- Header public (référence : 64px, blanc, nav centrée) ----------------
export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();
  const { user, logout } = useAuth();
  useEffect(() => { setMobileOpen(false); }, [loc.pathname, loc.search]);

  const isActive = (to: string) => {
    if (to.includes('?')) return loc.pathname + loc.search === to;
    if (to === '/preparation' && loc.pathname === '/preparation') return true;
    if (to === '/documents' && loc.pathname === '/documents') return true;
    if (to === '/concours' && loc.pathname.startsWith('/concours')) return true;
    if (to === '/examens' && loc.pathname.startsWith('/examens')) return true;
    if (to === '/ecoles' && loc.pathname.startsWith('/ecoles') && !loc.search.includes('section=') && !loc.search.includes('type=')) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-[60] border-b border-[#E6ECF3] bg-white/95 backdrop-blur shadow-sm">
      <Container className="flex h-16 items-center justify-between gap-3 md:gap-4 overflow-hidden">
        {/* Logo */}
        <Logo compact />

        {/* Desktop & Tablet Layout (Hidden on Mobile) */}
        <div className="hidden md:flex flex-1 items-center justify-between min-w-0">
          
          {/* Navigation - Scrollable horizontally if tight on tablets */}
          <div className="flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <nav className="flex items-center gap-1 min-w-max px-2" aria-label="Navigation principale">
              {NAV.map((n) => {
                const active = isActive(n.to);
                return (
                  <Link key={n.to + n.label} to={n.to}
                    className={cn('relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[14px] font-semibold transition-colors', active ? 'text-[#0B63CE]' : 'text-[#0B2A4A] hover:text-[#0B63CE] hover:bg-slate-50')}>
                    {n.label}
                    {active && <span className="absolute inset-x-2.5 -bottom-[17px] h-[3px] rounded-t-full bg-[#0B63CE]" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Auth */}
          <div className="flex items-center gap-2 shrink-0 pl-2 lg:pl-4">
            {!user ? (
              <>
                <Link to="/connexion" className="flex h-10 items-center justify-center rounded-xl px-4 text-[14px] font-bold text-[#0B2A4A] ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors">Connexion</Link>
                <Link to="/inscription" className="flex h-10 items-center justify-center rounded-xl bg-[#0B63CE] px-4 text-[14px] font-bold text-white hover:bg-[#0956B4] transition-colors shadow-sm">S'inscrire</Link>
              </>
            ) : (
              <UserMenu />
            )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#0B2A4A] hover:bg-slate-100 md:hidden" aria-label="Ouvrir le menu" aria-expanded={mobileOpen}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </Container>
      
      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden shadow-lg absolute w-full left-0">
          <nav className="grid gap-2" aria-label="Navigation secondaire mobile">
            {NAV.map((n) => {
              const active = isActive(n.to);
              return (
                <Link key={n.to + n.label} to={n.to}
                  className={cn('block rounded-xl px-4 py-3 text-[15px] font-bold transition-colors', active ? 'bg-sky-50 text-[#0B63CE]' : 'text-[#0B2A4A] hover:bg-slate-50')}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          
          <div className="mt-6 border-t border-slate-100 pt-6 flex flex-col gap-3">
            {!user ? (
              <>
                <Link to="/connexion" className="flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-bold text-[#0B2A4A] ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors">Connexion</Link>
                <Link to="/inscription" className="flex h-12 w-full items-center justify-center rounded-xl bg-[#0B63CE] text-[15px] font-bold text-white hover:bg-[#0956B4] shadow-sm transition-colors">S'inscrire</Link>
              </>
            ) : (
              <button onClick={() => logout()} className="flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-bold text-red-600 ring-1 ring-inset ring-red-100 bg-red-50 hover:bg-red-100 transition-colors">Déconnexion</button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// ---------------- Footer ----------------
export function Footer() {
  return (
    <footer className="mt-16 border-t border-[#E6ECF3] bg-[#0B2A4A] text-slate-300">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-[#0B63CE]">CM</span>
            <span className="text-lg font-extrabold text-white">Concours <span className="text-[#F59E0B]">Maroc</span></span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
            La plateforme qui centralise les concours, examens, écoles et ressources de préparation du Maroc.
          </p>
          <p className="mt-3 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-slate-400 ring-1 ring-inset ring-white/10">
            Les informations sont fournies à titre indicatif. Consultez toujours les sites officiels des organismes.
          </p>
        </div>
        <FooterCol title="Plateforme" links={[{ to: '/', label: 'Accueil' }, { to: '/ecoles', label: 'Écoles' }, { to: '/concours', label: 'Concours' }, { to: '/examens', label: 'Examens' }, { to: '/documents', label: 'Documents' }, { to: '/preparation', label: 'Préparation' }]} />
        <FooterCol title="Informations" links={[{ to: '/a-propos', label: 'À propos' }, { to: '/faq', label: 'FAQ' }, { to: '/contact', label: 'Contact' }]} />
        <FooterCol title="Légal" links={[{ to: '/confidentialite', label: 'Politique de confidentialité' }, { to: '/conditions', label: "Conditions d'utilisation" }]} />
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} Concours Maroc — Tous droits réservés.</p>
          <p>Données de démonstration marquées « DÉMO » — vérifiez les sources officielles.</p>
        </Container>
      </div>
    </footer>
  );
}
function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="text-sm font-extrabold uppercase tracking-wider text-white">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => <li key={l.to + l.label}><Link to={l.to} className="text-sm text-slate-400 hover:text-white">{l.label}</Link></li>)}
      </ul>
    </div>
  );
}

export function PublicLayout() {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F7FB]">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}

// ---------------- Dashboard étudiant (même design system) ----------------
const DASH_NAV = [
  { to: '/dashboard', label: 'Tableau de bord', icon: Home, end: true },
  { to: '/dashboard/concours', label: 'Mes concours', icon: Trophy },
  { to: '/dashboard/cours', label: 'Mes cours', icon: BookOpen },
  { to: '/dashboard/favoris', label: 'Mes favoris', icon: Star },
  { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { to: '/dashboard/profil', label: 'Profil', icon: UserIcon },
  { to: '/dashboard/parametres', label: 'Paramètres', icon: Settings },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F7FB]">
      <Header />
      <Container className="flex flex-1 gap-6 py-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-[#E6ECF3] bg-white p-3 shadow-[0_1px_3px_rgba(11,42,74,0.06)]">
            <div className="mb-2 rounded-xl bg-gradient-to-br from-[#0B2A4A] to-[#0B63CE] p-4 text-white">
              <p className="text-sm font-extrabold">{user?.firstName} {user?.lastName}</p>
              <p className="truncate text-xs text-sky-200">{user?.email}</p>
            </div>
            <DashNav onNav={() => {}} logout={logout} />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <button onClick={() => setOpen(!open)} className="mb-4 flex w-full items-center justify-between rounded-xl border border-[#E6ECF3] bg-white px-4 py-3 text-sm font-bold text-[#0B2A4A] lg:hidden">
            <span className="flex items-center gap-2"><Menu className="h-4 w-4" /> Menu du tableau de bord</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </button>
          {open && <div className="mb-4 rounded-2xl border border-[#E6ECF3] bg-white p-3 lg:hidden"><DashNav onNav={() => setOpen(false)} logout={logout} /></div>}
          <Outlet />
        </div>
      </Container>
      <Footer />
    </div>
  );
}
function DashNav({ onNav, logout }: { onNav: () => void; logout: () => void }) {
  const nav = useNavigate();
  return (
    <nav className="grid gap-1" aria-label="Menu utilisateur">
      {DASH_NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} onClick={onNav}
          className={({ isActive }) => cn('flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold', isActive ? 'bg-sky-50 text-[#0B63CE]' : 'text-slate-600 hover:bg-slate-50')}>
          <n.icon className="h-4 w-4" /> {n.label}
        </NavLink>
      ))}
      <button onClick={() => { logout(); nav('/'); }} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
        <LogOut className="h-4 w-4" /> Déconnexion
      </button>
    </nav>
  );
}

// ---------------- Admin (MÊME design system, layout data) ----------------

export function AdminLayout() {
  const { user, logout, isAdmin } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  
  const init = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4F7FB] p-6 text-center">
        <p className="text-xl font-extrabold text-[#0B2A4A]">Accès réservé à l'administration</p>
        <p className="text-sm text-slate-500">Connectez-vous avec un compte éditeur ou administrateur.</p>
        <Link to="/connexion" className="rounded-xl bg-[#0B63CE] px-5 py-2.5 text-sm font-bold text-white">Se connecter</Link>
      </div>
    );
  }

  // Define new admin navigation mapping strictly requested items
  const NEW_ADMIN_NAV = [
    { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
    { to: '/admin/concours', label: 'Concours', icon: Trophy },
    { to: '/admin/ecoles', label: 'Écoles', icon: GraduationCap },
    { to: '/admin/universites', label: 'Universités', icon: Building2 },
    { to: '/admin/ministeres', label: 'Ministères', icon: Landmark },
    { to: '/admin/examens', label: 'Examens', icon: FileText },
    { to: '/admin/documents', label: 'Documents', icon: BookOpen },
    { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users },
    { to: '/admin/rapports', label: 'Rapports', icon: FileText },
    { to: '/admin/parametres', label: 'Paramètres', icon: Settings },
  ];

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen().catch(err => console.error(err));
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F4F7FB]">
      
      {/* Sidebar Sombre */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0B2A4A] text-white transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo & En-tête */}
        <div className="flex shrink-0 items-center gap-3 px-5 py-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B63CE] text-sm font-extrabold text-white shadow-lg">CM</span>
          <div className="flex flex-col">
            <span className="text-[17px] font-extrabold tracking-tight text-white">Concours Maroc</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-200">Espace Administrateur</span>
          </div>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <nav className="space-y-1">
            {NEW_ADMIN_NAV.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive ? "bg-[#0B63CE] text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-[18px] w-[18px] opacity-90" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bas de Sidebar : Carte Super Admin & Logout */}
        <div className="p-4">
          <div className="mb-3 rounded-xl bg-gradient-to-br from-[#0B63CE]/20 to-[#0B63CE]/40 p-4 ring-1 ring-[#0B63CE]/50">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-[#F59E0B]" />
              <p className="text-[13px] font-bold text-white">Mode Super Admin</p>
            </div>
            <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-sky-100">
              Accès complet à toutes les fonctionnalités
            </p>
          </div>
          <button onClick={() => { logout(); nav('/'); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
            <LogOut className="h-[18px] w-[18px] opacity-90" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar Blanche */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-[#E6ECF3] bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex flex-1 items-center gap-4">
            <button onClick={() => setOpen(true)} className="text-slate-500 lg:hidden">
              <Menu className="h-6 w-6" />
            </button>
            <div className="relative hidden max-w-md flex-1 sm:block">
              <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher un concours, une école, un ministère..."
                className="h-10 w-full rounded-xl bg-slate-100/50 pl-10 pr-4 text-sm text-[#0B2A4A] placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={handleFullscreen} className="text-slate-400 hover:text-slate-600 hidden sm:block">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              </button>
              <NotifBell />
            </div>
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-[13px] font-bold text-[#0B2A4A]">Admin</span>
                <span className="text-[11px] font-medium text-slate-500">Super Administrateur</span>
              </div>
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 ring-2 ring-white hover:ring-sky-200">
                <span className="text-sm font-extrabold text-[#0B63CE]">{init}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Zone de rendu (Outlet) */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 z-40 bg-[#0B2A4A]/60 lg:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}

// ---------------- Hero (fidèle à la référence) ----------------
export function PageHero({ badge, title, subtitle, children, compact }: { badge: string; title: string; subtitle?: string; children?: ReactNode; compact?: boolean }) {
  return (
    <div className="relative overflow-hidden bg-[#E9F1FB]">
      {/* Visuel marocain à droite, fondu vers la gauche */}
      <div className="absolute inset-0" aria-hidden>
        <img
          src="/images/hero-morocco.jpg" alt=""
          className="absolute inset-y-0 right-0 h-full w-full object-cover object-center lg:left-auto lg:w-[62%]"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#F4F7FB] via-[#F4F7FB]/95 to-[#F4F7FB]/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#F4F7FB] via-transparent to-transparent" />
      </div>
      <Container className={cn('relative', compact ? 'pb-10 pt-10' : 'pb-14 pt-12 sm:pb-20 sm:pt-14')}>
        <span className="inline-block rounded-lg bg-[#0B63CE] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white">{badge}</span>
        <h1 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-[#0B2A4A] sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">{subtitle}</p>}
        {children}
      </Container>
    </div>
  );
}

export function InfoBar() {
  return (
    <Container className="mt-6">
      <div className="flex items-start gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-[13px] leading-relaxed text-sky-900 ring-1 ring-inset ring-sky-100">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <p>Les informations sont fournies à titre indicatif et peuvent être sujettes à modification. Consultez toujours les sites officiels des organismes pour les informations les plus récentes.</p>
      </div>
    </Container>
  );
}

export function StaticPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0B2A4A]">{title}</h1>
      <div className="mt-5 space-y-4 rounded-2xl border border-[#E6ECF3] bg-white p-6 text-[15px] leading-relaxed text-slate-600 shadow-[0_1px_3px_rgba(11,42,74,0.06)] sm:p-8">{children}</div>
    </div>
  );
}

// Re-export utile
export { Building2, Contact };
