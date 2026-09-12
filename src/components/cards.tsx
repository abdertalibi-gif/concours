// ============================================================
// CONCOURS MAROC — Cartes métier (même base visuelle partout)
// Toutes les cartes partagent CARD_BASE : fond blanc, bordure
// 1px #E6ECF3, rayon 16px, ombre subtile, hover identique.
// Modèle : CompetitionCard (fidèle à la capture de référence).
// ============================================================
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, BellRing, BookOpen, CalendarDays, Download, Eye, FileText, GraduationCap, Heart, MapPin, Users } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Competition, Course, DocItem, Exam, School } from '../lib/types';
import { courseLessonsCount, followersCount, isFavorite, isFollowing, toggleFavorite, toggleFollow, resolveOrgLogo } from '../lib/db';
import { useAuth } from '../lib/auth';
import { CardCTA, Chip, DemoBadge, OrgAvatar, StatusBadge, VerifiedBadge } from './ui';
import { formatDateFR, formatNumber, remainingLabel, statusFromCompetition } from '../lib/utils';

/** Base partagée — NE PAS modifier par carte */
const CARD_BASE =
  'group flex flex-col rounded-2xl border border-[#E6ECF3] bg-white p-4 shadow-[0_1px_3px_rgba(11,42,74,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(11,99,206,0.12)]';
const CARD_TITLE = 'line-clamp-2 text-[15px] font-extrabold leading-snug text-[#0B2A4A]';
const CARD_SUB = 'mt-1 text-[13px] text-slate-500';
const INFO_ROW = 'flex items-center gap-1.5 text-[13px] text-slate-600';
const INFO_ICON = 'h-3.5 w-3.5 shrink-0 text-slate-400';
const CARD_FOOTER = 'mt-3 border-t border-slate-100 pt-3';

// ---------------- Concours (CARTE DE RÉFÉRENCE) ----------------
export function CompetitionCard({ c }: { c: Competition }) {
  const status = statusFromCompetition(c);
  const rem = remainingLabel(c.registrationDeadline);
  const remTone = rem.tone === 'green' ? 'text-emerald-600' : rem.tone === 'orange' ? 'text-orange-600' : rem.tone === 'red' ? 'text-red-600' : 'text-slate-500';
  const dotTone = rem.tone === 'green' ? 'bg-emerald-500' : rem.tone === 'orange' ? 'bg-orange-500' : rem.tone === 'red' ? 'bg-red-500' : 'bg-slate-400';
  const org = resolveOrgLogo(c);

  return (
    <article className={CARD_BASE}>
      <div className="flex items-start gap-3">
        <OrgAvatar name={org.name} color={org.logoColor} logoUrl={org.logoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[13px] font-extrabold text-[#0B2A4A]" title={org.name}>{org.name}</p>
            <StatusBadge status={status} className="shrink-0" />
          </div>
          <Link to={`/concours/${c.slug}`} className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-slate-600 hover:text-[#0B63CE]">
            {c.title}
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Chip>{c.year}</Chip>
        <Chip tone="blue">{c.level}</Chip>
        <Chip tone="orange">{c.category === 'MINISTERE' ? 'Concours' : c.category === 'ECOLE' ? 'École' : c.category === 'UNIVERSITE' ? 'Université' : 'Concours'}</Chip>
        {c.verificationStatus === 'VERIFIED' && <VerifiedBadge at={c.verifiedAt} compact />}
        {c.isDemo && <DemoBadge />}
      </div>

      <div className="mt-3 space-y-1.5">
        <p className={INFO_ROW}><MapPin className={INFO_ICON} />{c.city}</p>
        <p className={INFO_ROW}><CalendarDays className={INFO_ICON} />
          {c.registrationDeadline ? <>Inscriptions jusqu'au <span className="font-semibold">{formatDateFR(c.registrationDeadline)}</span></> : 'Dates à confirmer'}
        </p>
        <p className={INFO_ROW}><Users className={INFO_ICON} />{formatNumber(c.places)} places</p>
      </div>

      <div className={cn(CARD_FOOTER, 'flex items-center justify-between')}>
        <p className={cn('flex items-center gap-1.5 text-[13px] font-bold', remTone)}>
          <span className={cn('h-2 w-2 rounded-full', dotTone)} />{rem.text}
        </p>
        <CardCTA to={`/concours/${c.slug}`}>Voir le concours <ArrowRight className="h-3.5 w-3.5" /></CardCTA>
      </div>
    </article>
  );
}

// ---------------- École (même base + même footer) ----------------
export function SchoolCard({ s, stats }: { s: School; stats?: { concours: number; examens: number; documents: number } }) {
  return (
    <article className={CARD_BASE}>
      <div className="flex items-start gap-3">
        <OrgAvatar name={s.shortName} color={s.logoColor} logoUrl={s.logoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[13px] font-extrabold text-[#0B2A4A]">{s.shortName}</h3>
            {s.isDemo && <DemoBadge />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-slate-600">{s.type}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Chip tone="blue">{s.city}</Chip>
        {s.domains.slice(0, 2).map((d) => <Chip key={d}>{d}</Chip>)}
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-[13px] leading-relaxed text-slate-600">{s.description}</p>
      {stats && (
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center ring-1 ring-inset ring-slate-100">
          <div><p className="text-base font-extrabold text-[#0B2A4A]">{stats.concours}</p><p className="text-[11px] text-slate-500">Concours</p></div>
          <div><p className="text-base font-extrabold text-[#0B2A4A]">{stats.examens}</p><p className="text-[11px] text-slate-500">Examens</p></div>
          <div><p className="text-base font-extrabold text-[#0B2A4A]">{stats.documents}</p><p className="text-[11px] text-slate-500">Docs</p></div>
        </div>
      )}
      <div className={cn(CARD_FOOTER, 'flex items-center justify-between')}>
        <p className={cn(INFO_ROW, 'font-bold text-slate-500')}><GraduationCap className={INFO_ICON} />{s.city}</p>
        <CardCTA to={`/ecoles/${s.slug}`}>Voir l'école <ArrowRight className="h-3.5 w-3.5" /></CardCTA>
      </div>
    </article>
  );
}

// ---------------- Examen (même base + même footer) ----------------
export function ExamCard({ e }: { e: Exam }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const fav = user ? isFavorite(user.id, 'EXAMEN', e.id) : false;
  const onFav = () => {
    if (!user) return nav('/connexion');
    toggleFavorite(user.id, 'EXAMEN', e.id);
  };
  return (
    <article className={CARD_BASE}>
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-inset ring-red-100">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[13px] font-extrabold text-[#0B2A4A]">{e.schoolName}</p>
            <button onClick={onFav} aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-colors', fav ? 'bg-red-50 text-red-500 ring-red-200' : 'text-slate-400 ring-slate-200 hover:bg-slate-50')}>
              <Heart className={cn('h-3.5 w-3.5', fav && 'fill-current')} />
            </button>
          </div>
          <Link to={`/examens/${e.slug}`} className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-slate-600 hover:text-[#0B63CE]">{e.title}</Link>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Chip>{e.year}</Chip>
        <Chip tone="blue">{e.subject}</Chip>
        <Chip tone="orange">{e.level}</Chip>
        {e.verificationStatus === 'VERIFIED' && <VerifiedBadge compact />}
        {e.isDemo && <DemoBadge />}
      </div>
      <div className="mt-3 space-y-1.5">
        <p className={INFO_ROW}><Download className={INFO_ICON} />{formatNumber(e.downloads)} téléchargements{e.hasCorrection ? ' • Corrigé inclus' : ''}</p>
        {(e.pages || e.duration) && (
          <p className={INFO_ROW}><FileText className={INFO_ICON} />{[e.pages ? `${e.pages} pages` : '', e.duration ?? ''].filter(Boolean).join(' • ')}</p>
        )}
      </div>
      <div className={cn(CARD_FOOTER, 'grid grid-cols-2 gap-2')}>
        <CardCTA to={`/examens/${e.slug}`}><span className="mx-auto flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Voir</span></CardCTA>
        <button onClick={() => downloadDemo(e.title)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold text-[#0B2A4A] ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" /> PDF
        </button>
      </div>
    </article>
  );
}

/** Téléchargement de démonstration : génère un fichier texte structuré. */
export function downloadDemo(title: string) {
  const content = `CONCOURS MAROC — Document de démonstration\n==========================================\n\nTitre : ${title}\n\nCeci est un fichier de démonstration généré par la plateforme.\nEn production, les PDF officiels seraient stockés via un service\nde stockage (S3 / Vercel Blob) et servis ici.\n\nConsultez toujours les sites officiels des organismes.\n`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 50) + '-demo.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------- Document (même base + même footer) ----------------
const DOC_COLORS: Record<string, string> = {
  'Avis de concours': 'bg-blue-50 text-blue-700 ring-blue-200',
  'Convocation': 'bg-violet-50 text-violet-700 ring-violet-200',
  'Résultats': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Liste des candidats': 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  'Programme': 'bg-amber-50 text-amber-700 ring-amber-200',
  'Guide': 'bg-orange-50 text-orange-700 ring-orange-200',
  'Cours': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'Fiche de révision': 'bg-pink-50 text-pink-700 ring-pink-200',
  'Ancien examen': 'bg-red-50 text-red-700 ring-red-200',
  'Autre': 'bg-slate-100 text-slate-700 ring-slate-200',
};

export function DocumentCard({ d }: { d: DocItem }) {
  return (
    <article className={CARD_BASE}>
      <div className="flex items-start gap-3">
        <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', DOC_COLORS[d.category] ?? DOC_COLORS.Autre)}>
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[13px] font-extrabold text-[#0B2A4A]">{d.category}</p>
            {d.isDemo && <DemoBadge />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-slate-600">{d.title}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Chip>{d.year}</Chip>
        <Chip tone="blue">PDF</Chip>
        {d.fileSize && <Chip>{d.fileSize}</Chip>}
      </div>
      <div className="mt-3 space-y-1.5">
        <p className={INFO_ROW}><BookOpen className={INFO_ICON} /><span className="truncate">{d.organizationName}</span></p>
        <p className={INFO_ROW}><Download className={INFO_ICON} />{formatNumber(d.downloads)} téléchargements</p>
      </div>
      <div className={cn(CARD_FOOTER, 'grid grid-cols-2 gap-2')}>
        <button onClick={() => downloadDemo(d.title)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0B63CE] text-[13px] font-bold text-white transition-colors hover:bg-[#0956B4]">
          <Eye className="h-3.5 w-3.5" /> Voir
        </button>
        <button onClick={() => downloadDemo(d.title)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold text-[#0B2A4A] ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" /> Télécharger
        </button>
      </div>
    </article>
  );
}

// ---------------- Cours (même base + bandeau, même footer) ----------------
export function CourseCard({ c, progress }: { c: Course; progress?: number }) {
  const lessons = courseLessonsCount(c);
  return (
    <article className={cn(CARD_BASE, 'overflow-hidden !p-0')}>
      <div className="relative flex h-24 items-center justify-center" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}99)` }}>
        <BookOpen className="h-9 w-9 text-white/90" />
        {c.isDemo && <span className="absolute right-3 top-3"><DemoBadge /></span>}
        <span className="absolute left-3 top-3 rounded-md bg-black/25 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">{c.subject}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className={CARD_TITLE}>{c.title}</h3>
        <p className={cn(CARD_SUB, 'line-clamp-2')}>{c.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip tone="blue">{c.level}</Chip>
          <Chip>{lessons} leçons</Chip>
          <Chip tone="orange">{c.duration}</Chip>
        </div>
        {progress !== undefined && progress > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>Progression</span><span>{progress}%</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0B63CE]" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        <div className={cn(CARD_FOOTER, 'flex items-center justify-between')}>
          <p className={cn(INFO_ROW, 'font-bold text-slate-500')}><BookOpen className={INFO_ICON} />{lessons} leçons</p>
          <CardCTA to={`/preparation/cours/${c.slug}`}>{progress ? 'Continuer' : 'Commencer'} <ArrowRight className="h-3.5 w-3.5" /></CardCTA>
        </div>
      </div>
    </article>
  );
}

// ---------------- Boutons Suivre / Favori concours ----------------
export function FollowButton({ competitionId, size = 'md' }: { competitionId: string; size?: 'sm' | 'md' }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const following = user ? isFollowing(user.id, competitionId) : false;
  const count = followersCount(competitionId);
  return (
    <button
      onClick={() => { if (!user) return nav('/connexion'); toggleFollow(user.id, competitionId); }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold ring-1 ring-inset transition-colors duration-200',
        size === 'md' ? 'h-11 px-5 text-sm' : 'h-9 px-3.5 text-[13px]',
        following ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100' : 'bg-white text-[#0B2A4A] ring-slate-200 hover:bg-slate-50'
      )}
    >
      {following ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {following ? 'Concours suivi' : 'Suivre ce concours'}
      <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[11px]">{count}</span>
    </button>
  );
}

export function FavoriteButton({ type, id, label }: { type: 'CONCOURS' | 'EXAMEN' | 'DOCUMENT' | 'COURS' | 'ECOLE'; id: string; label?: boolean }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const fav = user ? isFavorite(user.id, type, id) : false;
  return (
    <button
      onClick={() => { if (!user) return nav('/connexion'); toggleFavorite(user.id, type, id); }}
      className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold ring-1 ring-inset transition-colors duration-200', fav ? 'bg-red-50 text-red-600 ring-red-200 hover:bg-red-100' : 'bg-white text-[#0B2A4A] ring-slate-200 hover:bg-slate-50')}
    >
      <Heart className={cn('h-4 w-4', fav && 'fill-current')} />
      {label !== false && (fav ? 'Sauvegardé' : 'Sauvegarder')}
    </button>
  );
}
