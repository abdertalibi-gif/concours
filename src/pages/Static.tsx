// ============================================================
// CONCOURS MAROC — Pages statiques & erreurs
// ============================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronDown, Send } from 'lucide-react';
import { StaticPage } from '../components/layout';
import { Alert, Button, Field, Input } from '../components/ui';
import { cn } from '../utils/cn';

export function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <p className="text-7xl font-extrabold text-[#0B63CE]">404</p>
      <h1 className="mt-4 text-2xl font-extrabold text-[#0B2A4A]">Page introuvable</h1>
      <p className="mt-2 text-sm text-slate-500">La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-2.5 text-sm font-bold text-white"><ArrowLeft className="h-4 w-4" /> Retour à l'accueil</Link>
        <Link to="/concours" className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-[#0B2A4A] ring-1 ring-inset ring-slate-200">Voir les concours</Link>
      </div>
    </div>
  );
}

export function APropos() {
  return (
    <StaticPage title="À propos de Concours Maroc">
      <p><strong className="text-[#0B2A4A]">Concours Maroc</strong> est une plateforme éducative qui centralise les concours d'accès aux écoles et universités, les concours de recrutement des ministères et institutions publiques, les anciens examens et les ressources de préparation.</p>
      <p>Notre mission : aider chaque candidat marocain à trouver le bon concours, respecter les dates limites et se préparer efficacement — au même endroit.</p>
      <h3 className="pt-2 text-lg font-extrabold text-[#0B2A4A]">Nos engagements</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>Centraliser des informations utiles et structurées.</li>
        <li>Indiquer systématiquement les sources officielles.</li>
        <li>Distinguer clairement les informations vérifiées.</li>
        <li>Ne jamais présenter des données de démonstration comme officielles.</li>
      </ul>
      <p className="rounded-xl bg-sky-50 p-4 text-sm ring-1 ring-inset ring-sky-100">Les contenus marqués « DÉMO » sont des exemples de démonstration. Seules les informations vérifiées avec lien officiel font référence — et en cas de différence, les avis officiels priment toujours.</p>
    </StaticPage>
  );
}

const FAQS = [
  { q: "Les informations publiées sont-elles officielles ?", a: "Concours Maroc centralise et structure l'information, mais seuls les avis publiés par les organismes (ministères, écoles) font foi. Chaque fiche concours indique sa source officielle et son statut de vérification. Consultez toujours le site officiel avant de candidater." },
  { q: "Que signifie le badge « DÉMO » ?", a: "Les contenus marqués DÉMO sont des exemples de démonstration utilisés pour présenter la plateforme. Ils ne constituent pas des informations officielles. Les administrateurs les remplacent progressivement par des données réelles vérifiées." },
  { q: "Comment suivre un concours ?", a: "Créez un compte gratuit, ouvrez la fiche du concours puis cliquez sur « Suivre ce concours ». Vous recevrez des notifications avant la date limite de clôture." },
  { q: "Comment signaler une erreur ?", a: "Sur chaque fiche concours, cliquez sur « Signaler une erreur » et décrivez le problème. Notre équipe vérifie et corrige rapidement." },
  { q: "Les anciens examens sont-ils gratuits ?", a: "Oui, tous les examens et documents publiés sur la plateforme sont accessibles gratuitement." },
  { q: "Comment sont calculés les jours restants ?", a: "Ils sont calculés automatiquement à partir de la date limite d'inscription. Si la date est dépassée, le concours passe au statut « Fermé »." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0B2A4A]">Questions fréquentes</h1>
      <div className="mt-6 space-y-2.5">
        {FAQS.map((f, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[15px] font-bold text-[#0B2A4A]">
              {f.q}<ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i && <p className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#0B2A4A]">Contact</h1>
      <p className="mt-2 text-sm text-slate-500">Une question, un concours manquant, un partenariat ? Écrivez-nous.</p>
      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8">
        {sent ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <p className="mt-3 font-extrabold text-[#0B2A4A]">Message envoyé !</p>
            <p className="mt-1 text-sm text-slate-500">Nous vous répondrons dans les plus brefs délais. (Démonstration)</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet" required><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="E-mail" required><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </div>
            <Field label="Sujet" required><Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Ex : Concours manquant" /></Field>
            <Field label="Message" required><textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-xl px-3.5 py-2.5 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]" /></Field>
            <Button type="submit"><Send className="h-4 w-4" /> Envoyer le message</Button>
          </form>
        )}
      </div>
    </div>
  );
}

export function Confidentialite() {
  return (
    <StaticPage title="Politique de confidentialité">
      <p>Concours Maroc respecte votre vie privée. Cette page décrit les données collectées et leur usage (version de démonstration).</p>
      <h3 className="pt-2 text-lg font-extrabold text-[#0B2A4A]">Données collectées</h3>
      <ul className="list-disc space-y-1 pl-5"><li>Informations de compte : nom, e-mail, ville, niveau.</li><li>Activité : concours suivis, favoris, progression.</li></ul>
      <h3 className="pt-2 text-lg font-extrabold text-[#0B2A4A]">Usage</h3>
      <p>Vos données servent uniquement à personnaliser votre expérience (suivis, favoris, notifications). Elles ne sont ni vendues ni partagées.</p>
      <h3 className="pt-2 text-lg font-extrabold text-[#0B2A4A]">Sécurité</h3>
      <p>Les mots de passe ne sont jamais stockés en clair. En production, les données sont hébergées sur une infrastructure sécurisée (PostgreSQL, chiffrement, sauvegardes).</p>
      <Alert tone="info" message="Démonstration : dans cette version, vos données sont stockées localement dans votre navigateur." />
    </StaticPage>
  );
}

export function Conditions() {
  return (
    <StaticPage title="Conditions d'utilisation">
      <p>En utilisant Concours Maroc, vous acceptez les présentes conditions (version de démonstration).</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Les informations sont fournies à titre indicatif ; les avis officiels priment.</li>
        <li>Les contenus « DÉMO » sont des exemples sans valeur officielle.</li>
        <li>Vous êtes responsable de vérifier les dates et conditions sur les sites officiels.</li>
        <li>Tout usage abusif (spam, signalements mensongers) peut entraîner la suspension du compte.</li>
      </ul>
      <p>Pour toute question, consultez la page <Link to="/contact" className="font-bold text-[#0B63CE] hover:underline">Contact</Link>.</p>
    </StaticPage>
  );
}
