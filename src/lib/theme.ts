// ============================================================
// CONCOURS MAROC — DESIGN SYSTEM (source unique de vérité)
// La page /concours (capture de référence) est la référence visuelle.
// TOUTE l'application (public, dashboard, admin) DOIT utiliser
// ces tokens. Ne pas introduire de couleurs/rayons/ombres ad hoc.
// ============================================================

/** Palette officielle */
export const COLORS = {
  navy: '#0B2A4A',        // Titres / texte principal
  primary: '#0B63CE',     // Bleu principal (boutons, liens)
  primaryHover: '#0956B4',
  primaryDark: '#084e9e',
  accent: '#F59E0B',      // Orange (logo "Maroc", accents)
  accentDark: '#C25E00',
  accentBg: '#FFF3E6',
  bg: '#F4F7FB',           // Fond de page (bleu-gris très clair)
  card: '#FFFFFF',         // Fond des cartes
  border: '#E6ECF3',       // Bordure fine des cartes
  muted: '#64748B',        // Texte secondaire
  faint: '#94A3B8',        // Texte atténué / placeholders
  success: '#059669',
  successBg: '#ECFDF5',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  infoBg: '#F0F7FF',
} as const;

/** Rayons — cartes 16px, contrôles 12px, badges pill */
export const RADIUS = {
  card: 'rounded-2xl',     // 16px — cartes, panneaux, filtres
  control: 'rounded-xl',   // 12px — boutons, inputs, selects
  small: 'rounded-lg',     // 8px — petits boutons, chips carrés
  pill: 'rounded-full',    // badges statut
} as const;

/** Ombres subtiles */
export const SHADOW = {
  card: 'shadow-[0_1px_3px_rgba(11,42,74,0.06)]',
  hover: 'hover:shadow-[0_8px_24px_rgba(11,99,206,0.12)]',
  pop: 'shadow-[0_12px_40px_rgba(11,42,74,0.16)]',
} as const;

/** Conteneur global : 1280px centré, padding latéral généreux */
export const CONTAINER = 'mx-auto w-full max-w-[1280px] px-4 sm:px-6';

/** Carte standard — À RÉUTILISER PARTOUT (ne pas dupliquer) */
export const CARD =
  'rounded-2xl border border-[#E6ECF3] bg-white shadow-[0_1px_3px_rgba(11,42,74,0.06)]';

/** Carte interactive (listing) */
export const CARD_HOVER =
  'rounded-2xl border border-[#E6ECF3] bg-white p-4 shadow-[0_1px_3px_rgba(11,42,74,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(11,99,206,0.12)]';

/** Champ standard (input / select) */
export const CONTROL =
  'h-10 w-full rounded-xl bg-white px-3.5 text-sm text-[#0B2A4A] ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B63CE] disabled:bg-slate-50';

/** Label de filtre */
export const FILTER_LABEL = 'mb-1 block text-xs font-bold text-slate-500';

/** Titre de page / section */
export const H1 = 'text-3xl font-extrabold tracking-tight text-[#0B2A4A] sm:text-4xl';
export const H2 = 'text-xl font-extrabold tracking-tight text-[#0B2A4A] sm:text-2xl';
export const SUBTITLE = 'mt-1 text-sm leading-relaxed text-slate-500';

/** Grilles de cartes — Desktop 4 / tablette 2 / mobile 1 */
export const GRID_4 = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4';
export const GRID_3 = 'grid gap-4 md:grid-cols-2 xl:grid-cols-3';
export const GRID_2 = 'grid gap-4 sm:grid-cols-2';

/** Ligne d'info avec icône (cartes) */
export const INFO_ROW = 'flex items-center gap-1.5 text-[13px] text-slate-600';
export const INFO_ICON = 'h-3.5 w-3.5 shrink-0 text-slate-400';

/** Bouton CTA bleu des cartes (référence : "Voir le concours →") */
export const CARD_CTA =
  'inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0B63CE] px-3.5 text-[13px] font-bold text-white transition-colors hover:bg-[#0956B4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2';
