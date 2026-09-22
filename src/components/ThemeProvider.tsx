// ============================================================
// CONCOURS MAROC — SOURCE UNIQUE DE THÈME (light / dark / system)
// Le thème est appliqué via la classe "dark" sur <html>.
// La couche CSS (src/index.css) transforme les utilitaires clairs
// en sombre lorsqu'elle est présente — aucune logique par page.
// Choix persisté dans localStorage (clé "cm-theme").
// Anti-flash : un <script> inline dans index.html applique le
// thème avant le premier rendu.
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const DEFAULT_STORAGE_KEY = 'cm-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(storageKey: string, fallback: Theme): Theme {
  try {
    const v = window.localStorage.getItem(storageKey);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* stockage indisponible → thème par défaut */
  }
  return fallback;
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

const initialState: ThemeProviderState = {
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
};

export const ThemeContext = createContext<ThemeProviderState>(initialState);
export const THEME_STORAGE_KEY = DEFAULT_STORAGE_KEY;

export function ThemeProvider({ children, defaultTheme = 'system', storageKey = DEFAULT_STORAGE_KEY }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme(storageKey, defaultTheme));

  const resolvedTheme = useMemo<ResolvedTheme>(() => resolve(theme), [theme]);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Suit le thème système si l'utilisateur a choisi "system".
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(getSystemTheme());
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      // Transition légère uniquement lors d'un basculement explicite.
      const root = document.documentElement;
      root.classList.add('theme-transition');
      void root.offsetWidth;
      setThemeState(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        /* ignore */
      }
      window.setTimeout(() => root.classList.remove('theme-transition'), 320);
    },
    [storageKey]
  );

  const toggleTheme = useCallback(() => {
    setTheme(resolve(theme) === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeProviderState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans un ThemeProvider');
  return ctx;
}