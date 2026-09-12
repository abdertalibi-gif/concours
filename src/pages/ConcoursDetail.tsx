// ============================================================
// CONCOURS MAROC — Fiche concours détaillée
// ============================================================
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Bell, CalendarDays, CheckCircle2, ClipboardList,
  ExternalLink, Eye, FileText, Flag, GraduationCap, Info, MapPin, Users, Wallet, ListChecks, BookOpen, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { createReport, getCompetitionBySlug, getRelatedCompetitions, incrementViews, isFollowing, loadDB, queryDocuments, queryExams, toggleFollow } from '../lib/db';
import { CompetitionCard, FavoriteButton } from '../components/cards';
import { Alert, Button, Chip, DemoBadge, Modal, OrgAvatar, StatusBadge, VerifiedBadge } from '../components/ui';
import { cn } from '../utils/cn';
import { formatDateFR, formatNumber, remainingLabel, statusFromCompetition, timeAgo } from '../lib/utils';

export default function ConcoursDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);

  const c = slug ? getCompetitionBySlug(slug) : undefined;

  useEffect(() => {
    if (c) incrementViews(c.id);
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (c) document.title = `${c.title} — ${c.organizationName} ${c.year} | Concours Maroc`;
    return () => { document.title = 'Concours Maroc — Tous les concours et examens du Maroc'; };
  }, [c]);

  if (!c || c.publishStatus !== 'PUBLISHED') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <p className="text-5xl">🔍</p>
        <h1 className="mt-4 text-2xl font-extrabold text-[#0B2A4A]">Ce concours n'est plus disponible</h1>
        <p className="mt-2 text-sm text-slate-500">Il a peut-être été archivé ou l'adresse est incorrecte.</p>
        <Link to="/concours" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-2.5 text-sm font-bold text-white"><ArrowLeft className="h-4 w-4" /> Retour aux concours</Link>
      </div>
    );
  }

  const status = statusFromCompetition(c);
  const rem = remainingLabel(c.registrationDeadline);
  const related = getRelatedCompetitions(c, 3);
  const exams = queryExams({ school: c.schoolId ?? '' }, 1, 3).items;
  const docs = queryDocuments({}, 1, 50).items.filter((d) => d.competitionId === c.id || d.schoolId === c.schoolId || d.ministryId === c.ministryId).slice(0, 4);
  const following = user ? isFollowing(user.id, c.id) : false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Fil d'Ariane */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-[13px] text-slate-500">
        <Link to="/" className="hover:text-[#0B63CE]">Accueil</Link><ChevronRight className="h-3.5 w-3.5" />
        <Link to="/concours" className="hover:text-[#0B63CE]">Concours</Link><ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate font-semibold text-[#0B2A4A]">{c.title}</span>
      </nav>

      {/* En-tête */}
      <div className="mt-4 rounded-2xl border border-[#E6ECF3] bg-white p-6 shadow-[0_1px_3px_rgba(11,42,74,0.06)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <OrgAvatar name={c.organizationName} color={c.logoColor} logoUrl={c.logoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-500">{c.organizationName}</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#0B2A4A] sm:text-3xl">{c.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              {c.verificationStatus === 'VERIFIED' ? <VerifiedBadge at={c.verifiedAt} /> : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                  <Info className="h-3.5 w-3.5" /> En cours de vérification
                </span>
              )}
              {c.isDemo && <DemoBadge />}
              <Chip>{c.year}</Chip>
              <Chip tone="blue">{c.level}</Chip>
              <Chip tone="orange">{c.city}</Chip>
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{formatNumber(c.views)} vues</span>
              <span>Publié {timeAgo(c.publishedAt)}</span>
              {c.verifiedAt && <span className="flex items-center gap-1 text-sky-700"><BadgeCheck className="h-3.5 w-3.5" />Informations vérifiées le {formatDateFR(c.verifiedAt)}</span>}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <button onClick={() => { if (!user) return nav('/connexion'); toggleFollow(user.id, c.id); }}
              className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold ring-1 ring-inset', following ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-[#0B63CE] text-white ring-[#0B63CE] hover:bg-[#0956B4]')}>
              <Bell className="h-4 w-4" />{following ? 'Concours suivi' : 'Suivre ce concours'}
            </button>
            <FavoriteButton type="CONCOURS" id={c.id} />
          </div>
        </div>

        {/* School + Ministry Logos */}
        {(c.schoolId || c.ministryId) && (() => {
          const db = loadDB();
          const school = c.schoolId ? db.schools.find(s => s.id === c.schoolId) : null;
          const ministry = c.ministryId ? db.ministries.find(m => m.id === c.ministryId) : null;
          if (!school && !ministry) return null;
          return (
            <div className="mt-4 flex flex-wrap items-center gap-6">
              {school && (
                <div className="flex items-center gap-3">
                  <OrgAvatar name={school.shortName} color={school.logoColor} logoUrl={school.logoUrl} size="md" />
                  <div>
                    <p className="text-xs font-bold text-slate-500">École</p>
                    <p className="text-sm font-semibold text-[#0B2A4A]">{school.shortName}</p>
                  </div>
                </div>
              )}
              {ministry && (
                <div className="flex items-center gap-3">
                  <OrgAvatar name={ministry.name} color={ministry.logoColor} logoUrl={ministry.logoUrl} size="md" />
                  <div>
                    <p className="text-xs font-bold text-slate-500">Ministère</p>
                    <p className="text-sm font-semibold text-[#0B2A4A]">{ministry.shortName}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Cartes infos */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <InfoTile icon={<GraduationCap className="h-4 w-4" />} label="Niveau" value={c.level} />
          <InfoTile icon={<MapPin className="h-4 w-4" />} label="Ville" value={c.city} />
          <InfoTile icon={<CalendarDays className="h-4 w-4" />} label="Date du concours" value={formatDateFR(c.competitionDate)} />
          <InfoTile icon={<CalendarDays className="h-4 w-4" />} label="Date limite" value={formatDateFR(c.registrationDeadline)} highlight />
          <InfoTile icon={<Users className="h-4 w-4" />} label="Places" value={formatNumber(c.places)} />
          <InfoTile icon={<FileText className="h-4 w-4" />} label="Type" value={c.category === 'ECOLE' ? 'École' : c.category === 'MINISTERE' ? 'Ministère' : 'Concours'} />
        </div>

        {rem.tone !== 'gray' && (
          <div className={cn('mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ring-1 ring-inset',
            rem.tone === 'green' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : rem.tone === 'orange' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-red-50 text-red-700 ring-red-200')}>
            <CalendarDays className="h-4 w-4" />{rem.text} — clôture le {formatDateFR(c.registrationDeadline)}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Colonne principale */}
        <div className="min-w-0 space-y-6">
          <Section icon={<Info className="h-5 w-5" />} title="Présentation"><p className="whitespace-pre-line">{c.description}</p></Section>
          <Section icon={<ListChecks className="h-5 w-5" />} title="Conditions d'accès">
            <ul className="space-y-2">{c.conditions.map((x, i) => <li key={i} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>{x}</span></li>)}</ul>
          </Section>
          {c.profil && <Section icon={<Users className="h-5 w-5" />} title="Profil demandé"><p>{c.profil}</p></Section>}
          <Section icon={<CalendarDays className="h-5 w-5" />} title="Dates importantes">
            <div className="grid gap-2 sm:grid-cols-3">
              <DateBox label="Ouverture" value={formatDateFR(c.registrationStart)} />
              <DateBox label="Clôture" value={formatDateFR(c.registrationDeadline)} hot />
              <DateBox label="Concours" value={formatDateFR(c.competitionDate)} />
            </div>
          </Section>
          {c.programme && <Section icon={<BookOpen className="h-5 w-5" />} title="Programme"><p>{c.programme}</p></Section>}
          {c.matieres.length > 0 && (
            <Section icon={<BookOpen className="h-5 w-5" />} title="Matières & épreuves">
              <div className="flex flex-wrap gap-2">{c.matieres.map((m) => <Chip key={m} tone="blue">{m}</Chip>)}</div>
              {c.epreuves.length > 0 && <ul className="mt-3 space-y-2">{c.epreuves.map((e, i) => <li key={i} className="flex items-start gap-2 text-[15px]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-xs font-extrabold text-[#0B63CE]">{i + 1}</span>{e}</li>)}</ul>}
            </Section>
          )}
          {c.documentsDemandes.length > 0 && (
            <Section icon={<ClipboardList className="h-5 w-5" />} title="Documents demandés">
              <ul className="grid gap-2 sm:grid-cols-2">{c.documentsDemandes.map((d, i) => <li key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-medium ring-1 ring-inset ring-slate-100"><FileText className="h-4 w-4 text-slate-400" />{d}</li>)}</ul>
            </Section>
          )}
          {c.procedure && <Section icon={<ListChecks className="h-5 w-5" />} title="Procédure d'inscription"><p>{c.procedure}</p></Section>}
          {c.frais && <Section icon={<Wallet className="h-5 w-5" />} title="Frais éventuels"><p>{c.frais}</p></Section>}
          {c.resultats && <Section icon={<BadgeCheck className="h-5 w-5" />} title="Résultats"><p>{c.resultats}</p></Section>}

          {exams.length > 0 && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
              <h2 className="text-lg font-extrabold text-[#0B2A4A]">Anciens examens</h2>
              <div className="mt-3 grid gap-2">
                {exams.map((e) => (
                  <Link key={e.id} to={`/examens/${e.slug}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-100 hover:bg-sky-50">
                    <span className="min-w-0"><span className="block truncate text-sm font-bold text-[#0B2A4A]">{e.title}</span><span className="text-xs text-slate-500">{e.subject} • {e.year}</span></span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#0B63CE]" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {docs.length > 0 && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
              <h2 className="text-lg font-extrabold text-[#0B2A4A]">Documents associés</h2>
              <div className="mt-3 grid gap-2">
                {docs.map((d) => (
                  <Link key={d.id} to="/documents" className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-100 hover:bg-sky-50">
                    <span className="min-w-0"><span className="block truncate text-sm font-bold text-[#0B2A4A]">{d.title}</span><span className="text-xs text-slate-500">{d.category} • {d.year}</span></span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#0B63CE]" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Colonne latérale */}
        <aside className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <h2 className="text-[15px] font-extrabold text-[#0B2A4A]">Source officielle</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Vérifiez toujours les informations sur les canaux officiels avant de candidater.</p>
            <div className="mt-3 grid gap-2">
              {c.officialWebsite ? <a href={c.officialWebsite} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0B2A4A] text-sm font-bold text-white hover:opacity-90"><ExternalLink className="h-4 w-4" /> Site officiel</a>
                : <span className="rounded-xl bg-slate-100 px-3 py-2.5 text-center text-[13px] font-semibold text-slate-500">Site officiel non renseigné</span>}
              {c.registrationUrl ? <a href={c.registrationUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#0B63CE] text-sm font-bold text-white hover:bg-[#0956B4]"><ExternalLink className="h-4 w-4" /> Inscription officielle</a>
                : <span className="rounded-xl bg-slate-100 px-3 py-2.5 text-center text-[13px] font-semibold text-slate-500">Lien d'inscription non renseigné</span>}
              <Link to="/documents" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-bold text-[#0B2A4A] ring-1 ring-inset ring-slate-200 hover:bg-slate-50"><FileText className="h-4 w-4" /> Voir les documents</Link>
            </div>
            {(c.sourceOrganization || c.sourceUrl) && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 ring-1 ring-inset ring-slate-100">
                <p className="font-bold text-[#0B2A4A]">Informations Concours Maroc</p>
                {c.sourceOrganization && <p className="mt-1">Source : {c.sourceOrganization}</p>}
                {c.sourceUrl && <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="break-all font-semibold text-[#0B63CE] hover:underline">Lien source</a>}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <h2 className="text-[15px] font-extrabold text-[#0B2A4A]">Une erreur ?</h2>
            <p className="mt-1 text-xs text-slate-500">Aidez-nous à maintenir des informations fiables.</p>
            <Button variant="outline" size="md" className="mt-3 w-full" onClick={() => setReportOpen(true)}><Flag className="h-4 w-4" /> Signaler une erreur</Button>
          </div>

          <Alert tone="info" message="Les informations sont fournies à titre indicatif. En cas de différence, les avis officiels font foi." />
        </aside>
      </div>

      {/* Concours similaires */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-[#0B2A4A]">Concours similaires</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((r) => <CompetitionCard key={r.id} c={r} />)}
          </div>
        </section>
      )}

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} competitionId={c.id} competitionTitle={`${c.title} — ${c.organizationName}`} />
    </div>
  );
}

function InfoTile({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-xl p-3 ring-1 ring-inset', highlight ? 'bg-sky-50 ring-sky-200' : 'bg-slate-50 ring-slate-100')}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{icon}{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold text-[#0B2A4A]" title={value}>{value}</p>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E6ECF3] bg-white p-6 shadow-[0_1px_3px_rgba(11,42,74,0.06)]">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#0B2A4A]"><span className="text-[#0B63CE]">{icon}</span>{title}</h2>
      <div className="mt-3 text-[15px] leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

function DateBox({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className={cn('rounded-xl p-3 ring-1 ring-inset', hot ? 'bg-red-50 ring-red-200' : 'bg-slate-50 ring-slate-100')}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-0.5 text-sm font-extrabold', hot ? 'text-red-700' : 'text-[#0B2A4A]')}>{value}</p>
    </div>
  );
}

export function ReportModal({ open, onClose, competitionId, competitionTitle }: { open: boolean; onClose: () => void; competitionId: string; competitionTitle: string }) {
  const { user } = useAuth();
  const [type, setType] = useState('Information incorrecte');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) return;
    createReport({ userId: user?.id, userName: user ? `${user.firstName} ${user.lastName}` : 'Visiteur', competitionId, competitionTitle, type: type as never, message: message.trim() });
    setDone(true);
    setMessage('');
    setTimeout(() => { setDone(false); onClose(); }, 1800);
  };

  return (
    <Modal open={open} onClose={onClose} title="Signaler une erreur">
      {done ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="mt-3 font-extrabold text-[#0B2A4A]">Merci pour votre signalement !</p>
          <p className="mt-1 text-sm text-slate-500">Notre équipe va vérifier ces informations.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-slate-500">Concours : <strong className="text-[#0B2A4A]">{competitionTitle}</strong></p>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Type de problème</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-full rounded-xl bg-white px-3.5 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]">
              <option>Date incorrecte</option>
              <option>Lien incorrect</option>
              <option>Information incorrecte</option>
              <option>Concours terminé</option>
              <option>Autre</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Message <span className="text-red-500">*</span></label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required minLength={10}
              placeholder="Décrivez l'erreur constatée (10 caractères minimum)..."
              className="w-full rounded-xl bg-white px-3.5 py-2.5 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]" />
          </div>
          <Button type="submit" className="w-full">Envoyer le signalement</Button>
        </form>
      )}
    </Modal>
  );
}

