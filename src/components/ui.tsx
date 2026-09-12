// ============================================================
// CONCOURS MAROC — DESIGN SYSTEM : composants réutilisables
// UNIQUE source de composants pour TOUTE l'app (public,
// dashboard étudiant, admin). Ne pas dupliquer ces styles
// dans les pages — toujours importer depuis ce fichier.
// Référence visuelle : page /concours (capture approuvée).
// ============================================================
import { createContext, useCallback, useContext, useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, BadgeCheck, CheckCircle2, ChevronLeft, ChevronRight,
  FlaskConical, Info, Loader2, Search, SearchX, X, Landmark, GraduationCap, Building2
} from 'lucide-react';
import { cn } from '../utils/cn';
import { STATUS_META } from '../lib/utils';

// ================= BOUTONS =================
type BtnVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'dark';
type BtnSize = 'sm' | 'md' | 'lg';

const BTN_STYLES: Record<BtnVariant, string> = {
  primary: 'bg-[#0B63CE] text-white hover:bg-[#0956B4] shadow-sm',
  secondary: 'bg-[#FFF3E6] text-[#C25E00] hover:bg-[#FFE8D1] ring-1 ring-inset ring-orange-200',
  outline: 'bg-white text-[#0B2A4A] ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  dark: 'bg-[#0B2A4A] text-white hover:bg-[#12365e] shadow-sm',
};
const BTN_SIZES: Record<BtnSize, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-[15px] rounded-xl gap-2',
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; size?: BtnSize; loading?: boolean;
}
export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      className={cn('inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap', BTN_STYLES[variant], BTN_SIZES[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = 'primary', size = 'md', className, children }: { to: string; variant?: BtnVariant; size?: BtnSize; className?: string; children: ReactNode }) {
  return <Link to={to} className={cn('inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 whitespace-nowrap', BTN_STYLES[variant], BTN_SIZES[size], className)}>{children}</Link>;
}

/** CTA bleu des cartes — identique partout ("Voir le concours →") */
export function CardCTA({ to, children, onClick }: { to?: string; children: ReactNode; onClick?: () => void }) {
  const cls = 'inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0B63CE] px-3.5 text-[13px] font-bold text-white transition-colors hover:bg-[#0956B4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2';
  if (to) return <Link to={to} className={cls}>{children}</Link>;
  return <button onClick={onClick} className={cls}>{children}</button>;
}

// ================= BADGES =================
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const m = STATUS_META[status] ?? STATUS_META.Ouvert;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', m.classes, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  );
}

export function VerifiedBadge({ at, compact }: { at?: string; compact?: boolean }) {
  return (
    <span title={at ? `Informations vérifiées le ${new Date(at).toLocaleDateString('fr-MA')}` : 'Vérifié'} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
      <BadgeCheck className="h-3.5 w-3.5" />
      {!compact && 'Vérifié'}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span title="Données de démonstration — ne pas considérer comme officielles" className={cn('inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-inset ring-violet-200', className)}>
      <FlaskConical className="h-3 w-3" /> Démo
    </span>
  );
}

export function Chip({ children, tone = 'slate', className }: { children: ReactNode; tone?: 'slate' | 'blue' | 'orange' | 'green'; className?: string }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
    green: 'bg-emerald-50 text-emerald-700',
  };
  return <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold', tones[tone], className)}>{children}</span>;
}

// ================= CARTE / SECTION =================
/** Carte standard du design system */
export function Card({ className, children, hover }: { className?: string; children: ReactNode; hover?: boolean }) {
  return (
    <div className={cn(
      'rounded-2xl border border-[#E6ECF3] bg-white shadow-[0_1px_3px_rgba(11,42,74,0.06)]',
      hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(11,99,206,0.12)]',
      className
    )}>
      {children}
    </div>
  );
}

export function SectionTitle({ icon, title, subtitle, action }: { icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-[#0B2A4A] sm:text-2xl">
          {icon && <span className="text-[#0B63CE]">{icon}</span>}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Carte statistique — même style public / dashboard / admin */
export function StatCard({ icon, value, label, to, color = 'bg-sky-50 text-[#0B63CE]' }: { icon: ReactNode; value: number | string; label: string; to?: string; color?: string }) {
  const inner = (
    <>
      <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl', color)}>{icon}</span>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#0B2A4A]">{value}</p>
      <p className="text-[13px] font-semibold text-slate-500">{label}</p>
    </>
  );
  const cls = 'rounded-2xl border border-[#E6ECF3] bg-white p-4 shadow-[0_1px_3px_rgba(11,42,74,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(11,99,206,0.12)]';
  if (to) return <Link to={to} className={cn(cls, 'block')}>{inner}</Link>;
  return <div className={cls}>{inner}</div>;
}

// ================= CHAMPS =================
export function Field({ label, required, error, hint, children, className }: { label?: string; required?: boolean; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { error?: boolean }
export function Input({ className, error, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-xl bg-white px-3.5 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B63CE] disabled:bg-slate-50',
        error && 'ring-red-300 focus:ring-red-500',
        className
      )}
      {...rest}
    />
  );
}

/** Champ de recherche avec icône — style unique */
export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} aria-label={label}
        className="h-10 w-full rounded-xl bg-white pl-9 pr-3 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]"
      />
    </div>
  );
}

export function Textarea({ className, error, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      className={cn('w-full rounded-xl bg-white px-3.5 py-2.5 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B63CE]', error && 'ring-red-300 focus:ring-red-500', className)}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn('h-10 w-full appearance-none rounded-xl bg-white px-3.5 pr-9 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B63CE] disabled:bg-slate-50', 'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E")] bg-[position:right_0.7rem_center] bg-no-repeat', className)} {...rest}>
      {children}
    </select>
  );
}

/** Panneau de filtres — carte blanche standard (cf. référence) */
export function FilterPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E6ECF3] bg-white p-4 shadow-[0_1px_3px_rgba(11,42,74,0.06)]">
      {children}
    </div>
  );
}

/** Select de filtre avec label — style unique */
export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((o) => <option key={o.v + o.l} value={o.v}>{o.l}</option>)}
      </Select>
    </label>
  );
}

// ================= TABS =================
export function Tabs<T extends string>({ tabs, active, onChange, counts }: { tabs: readonly T[]; active: T; onChange: (t: T) => void; counts?: Partial<Record<T, number>> }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
      {tabs.map((t) => (
        <button key={t} role="tab" aria-selected={active === t} onClick={() => onChange(t)}
          className={cn('whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors', active === t ? 'border-[#0B63CE] text-[#0B63CE]' : 'border-transparent text-slate-500 hover:text-[#0B2A4A]')}>
          {t}
          {counts?.[t] !== undefined && <span className="ml-1.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px]">{counts[t]}</span>}
        </button>
      ))}
    </div>
  );
}

// ================= ÉTATS =================
export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
        {icon ?? <SearchX className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-bold text-[#0B2A4A]">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-[#0B63CE]" /> {label}
    </div>
  );
}

export function Alert({ tone = 'info', title, message }: { tone?: 'info' | 'success' | 'warning' | 'error'; title?: string; message: string }) {
  const conf = {
    info: { cls: 'bg-sky-50 ring-sky-200 text-sky-900', Icon: Info, ic: 'text-sky-600' },
    success: { cls: 'bg-emerald-50 ring-emerald-200 text-emerald-900', Icon: CheckCircle2, ic: 'text-emerald-600' },
    warning: { cls: 'bg-amber-50 ring-amber-200 text-amber-900', Icon: AlertCircle, ic: 'text-amber-600' },
    error: { cls: 'bg-red-50 ring-red-200 text-red-900', Icon: AlertCircle, ic: 'text-red-600' },
  }[tone];
  return (
    <div className={cn('flex items-start gap-3 rounded-xl px-4 py-3 text-sm ring-1 ring-inset', conf.cls)}>
      <conf.Icon className={cn('mt-0.5 h-4 w-4 shrink-0', conf.ic)} />
      <div>
        {title && <p className="font-bold">{title}</p>}
        <p>{message}</p>
      </div>
    </div>
  );
}

// ================= PAGINATION =================
export function Pagination({ page, totalPages, total, onPage, label = 'éléments' }: { page: number; totalPages: number; total: number; onPage: (p: number) => void; label?: string }) {
  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let i = start; i <= Math.min(totalPages, start + 4); i++) pages.push(i);
  return (
    <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
      <p className="text-sm text-slate-500">
        <span className="font-bold text-[#0B2A4A]">{total}</span> {label} trouvé{total > 1 ? 's' : ''}
      </p>
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1.5">
          <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40" aria-label="Page précédente">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pages.map((p) => (
            <button key={p} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined} className={cn('h-9 min-w-9 rounded-lg px-2 text-sm font-semibold ring-1', p === page ? 'bg-[#0B63CE] text-white ring-[#0B63CE]' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
              {p}
            </button>
          ))}
          <button onClick={() => onPage(page + 1)} disabled={page >= totalPages} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40" aria-label="Page suivante">
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
}

export function OrgAvatar({
  name,
  color = '#0B63CE',
  logoUrl,
  size = 'md',
  className,
}: {
  name: string;
  color?: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = {
    sm: 'h-9 w-9 text-[11px] rounded-lg p-1',
    md: 'h-12 w-12 text-sm rounded-xl p-1.5',
    lg: 'h-16 w-16 text-lg rounded-2xl p-2',
    xl: 'h-20 w-20 text-xl rounded-2xl p-2.5',
  };
  const iconSizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7', xl: 'h-9 w-9' };
  const [imgError, setImgError] = useState(false);

  // Resolution is handled upstream by resolveInstitutionLogo or DB sync.
  // We just use the provided logoUrl.
  const activeLogo = !imgError && logoUrl;

  if (activeLogo) {
    return (
      <div className={cn('flex shrink-0 items-center justify-center bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden', sizes[size], className)} aria-hidden>
        <img
          src={activeLogo}
          alt={`Logo officiel de ${name}`}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }}
          loading="lazy"
        />
      </div>
    );
  }

  const nameLower = (name || '').toLowerCase();
  const isMinistry = nameLower.includes('ministère') || nameLower.includes('ministry');
  const isSchool = nameLower.includes('école') || nameLower.includes('ecole') || nameLower.includes('institut') || nameLower.includes('université') || nameLower.includes('ensa') || nameLower.includes('fst');

  const Icon = isMinistry ? Landmark : isSchool ? GraduationCap : Building2;
  const resolvedColor = color || '#0B63CE';

  return (
    <div
      className={cn('flex shrink-0 items-center justify-center text-white shadow-sm', sizes[size], className)}
      style={{ background: `linear-gradient(135deg, ${resolvedColor}, ${resolvedColor}CC)` }}
      aria-hidden
    >
      <Icon className={iconSizes[size]} />
    </div>
  );
}

// ================= PROGRESS =================
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-slate-100', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-[#0B63CE] transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

// ================= MODAL =================
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[#0B2A4A]/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn('relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-[#0B2A4A]">{title}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Fermer"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ================= TOAST =================
interface Toast { id: number; tone: 'success' | 'error' | 'info'; message: string }
const ToastCtx = createContext<{ toast: (message: string, tone?: Toast['tone']) => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[90] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cn('pointer-events-auto flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg',
            t.tone === 'success' ? 'bg-[#0B2A4A]' : t.tone === 'error' ? 'bg-red-600' : 'bg-[#0B63CE]')}>
            {t.tone === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : t.tone === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : <Info className="h-4 w-4 shrink-0" />}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
