// ============================================================
// CONCOURS MAROC — Connexion / Inscription / Mot de passe oublié
// ============================================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User as UserIcon } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { CITIES, LEVELS } from '../lib/utils';
import { Alert, Button, Field, Input } from '../components/ui';

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B2A4A] to-[#0B63CE] lg:block">
        <img src="/images/hero-morocco.jpg" alt="Campus universitaire marocain" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B2A4A] via-[#0B2A4A]/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-8">
          <p className="text-2xl font-extrabold leading-snug text-white">Votre avenir commence par le bon concours.</p>
          <p className="mt-2 text-sm text-sky-200">Suivez les dates limites, sauvegardez vos favoris et préparez-vous efficacement.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-[#E6ECF3] bg-white p-6 shadow-[0_1px_3px_rgba(11,42,74,0.06)] sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0B2A4A]">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.ok) nav(r.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard');
    else setError(r.error ?? 'Erreur de connexion.');
  };

  return (
    <AuthShell title="Connexion" subtitle="Retrouvez vos concours suivis et votre progression.">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="error" message={error} />}
        <Field label="Adresse e-mail" required>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@example.ma" className="pl-9" autoComplete="email" />
          </div>
        </Field>
        <Field label="Mot de passe" required>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input type={show ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9 pr-10" autoComplete="current-password" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Link to="/mot-de-passe-oublie" className="text-[13px] font-bold text-[#0B63CE] hover:underline">Mot de passe oublié ?</Link>
        </div>
        <Button type="submit" loading={loading} className="w-full" size="lg">Se connecter <ArrowRight className="h-4 w-4" /></Button>
        <p className="text-center text-sm text-slate-500">Pas encore de compte ? <Link to="/inscription" className="font-bold text-[#0B63CE] hover:underline">Créer un compte</Link></p>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '', city: '', level: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    const r = await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, city: form.city || undefined, level: form.level || undefined });
    setLoading(false);
    if (r.ok) nav(r.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard');
    else setError(r.error ?? "Erreur lors de l'inscription.");
  };

  return (
    <AuthShell title="Créer un compte" subtitle="Gratuit — suivez vos concours et votre préparation.">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="error" message={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" required>
            <div className="relative"><UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Yasmine" className="pl-9" autoComplete="given-name" /></div>
          </Field>
          <Field label="Nom" required>
            <Input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Bennani" autoComplete="family-name" />
          </Field>
        </div>
        <Field label="Adresse e-mail" required>
          <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="vous@example.ma" className="pl-9" autoComplete="email" /></div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville">
            <select value={form.city} onChange={(e) => set('city', e.target.value)} className="h-10 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]">
              <option value="">Sélectionner…</option>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Niveau d'études">
            <select value={form.level} onChange={(e) => set('level', e.target.value)} className="h-10 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]">
              <option value="">Sélectionner…</option>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mot de passe" required hint="8 caractères minimum">
            <Input type="password" required minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <Field label="Confirmer" required>
            <Input type="password" required value={form.confirm} onChange={(e) => set('confirm', e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </Field>
        </div>
        <Button type="submit" loading={loading} className="w-full" size="lg">Créer mon compte <ArrowRight className="h-4 w-4" /></Button>
        <p className="text-center text-sm text-slate-500">Déjà inscrit ? <Link to="/connexion" className="font-bold text-[#0B63CE] hover:underline">Se connecter</Link></p>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <AuthShell title="Mot de passe oublié" subtitle="Recevez un lien de réinitialisation par e-mail.">
      {sent ? (
        <Alert tone="success" title="E-mail envoyé !" message={`Si un compte existe avec ${email}, vous recevrez un lien de réinitialisation. (Démonstration : aucun e-mail réel n'est envoyé.)`} />
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
          <Field label="Adresse e-mail" required>
            <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@example.ma" className="pl-9" /></div>
          </Field>
          <Button type="submit" className="w-full" size="lg">Envoyer le lien</Button>
          <p className="text-center text-sm text-slate-500"><Link to="/connexion" className="font-bold text-[#0B63CE] hover:underline">Retour à la connexion</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
