'use client';

import * as React from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type PaletteName = 'clay' | 'forest' | 'ink' | 'marigold';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type FontPair = 'editorial' | 'grotesk' | 'newspaper';

export const PALETTES: PaletteName[] = ['clay', 'forest', 'ink', 'marigold'];
export const DENSITIES: Density[] = ['compact', 'comfortable', 'spacious'];
export const FONT_PAIRS: FontPair[] = ['editorial', 'grotesk', 'newspaper'];

const STORAGE_KEYS = {
  theme: 'cveetje-theme',
  palette: 'cveetje-palette',
  density: 'cveetje-density',
  fontpair: 'cveetje-fontpair',
} as const;

const DEFAULTS: {
  theme: ThemeMode;
  palette: PaletteName;
  density: Density;
  fontpair: FontPair;
} = {
  theme: 'light',
  palette: 'clay',
  density: 'comfortable',
  fontpair: 'editorial',
};

type AppearanceContextValue = {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  palette: PaletteName;
  density: Density;
  fontpair: FontPair;
  setTheme: (theme: ThemeMode) => void;
  setPalette: (palette: PaletteName) => void;
  setDensity: (density: Density) => void;
  setFontpair: (fontpair: FontPair) => void;
};

const AppearanceContext = React.createContext<AppearanceContextValue | null>(null);

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = window.localStorage.getItem(key);
    if (v && (allowed as readonly string[]).includes(v)) return v as T;
  } catch {
    // ignore
  }
  return fallback;
}

function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyAttributes(opts: {
  theme: ThemeMode;
  palette: PaletteName;
  density: Density;
  fontpair: FontPair;
}) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const resolved = resolveTheme(opts.theme);
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-palette', opts.palette);
  root.setAttribute('data-density', opts.density);
  root.setAttribute('data-fontpair', opts.fontpair);
  root.classList.toggle('dark', resolved === 'dark');
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>(DEFAULTS.theme);
  const [palette, setPaletteState] = React.useState<PaletteName>(DEFAULTS.palette);
  const [density, setDensityState] = React.useState<Density>(DEFAULTS.density);
  const [fontpair, setFontpairState] = React.useState<FontPair>(DEFAULTS.fontpair);
  const [resolved, setResolved] = React.useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const t = readStored<ThemeMode>(STORAGE_KEYS.theme, ['light', 'dark', 'system'], DEFAULTS.theme);
    const p = readStored<PaletteName>(STORAGE_KEYS.palette, PALETTES, DEFAULTS.palette);
    const d = readStored<Density>(STORAGE_KEYS.density, DENSITIES, DEFAULTS.density);
    const f = readStored<FontPair>(STORAGE_KEYS.fontpair, FONT_PAIRS, DEFAULTS.fontpair);
    setThemeState(t);
    setPaletteState(p);
    setDensityState(d);
    setFontpairState(f);
    setResolved(resolveTheme(t));
    applyAttributes({ theme: t, palette: p, density: d, fontpair: f });
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted || theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      setResolved(mql.matches ? 'dark' : 'light');
      applyAttributes({ theme, palette, density, fontpair });
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme, palette, density, fontpair, mounted]);

  const setTheme = React.useCallback((t: ThemeMode) => {
    setThemeState(t);
    setResolved(resolveTheme(t));
    try { localStorage.setItem(STORAGE_KEYS.theme, t); } catch {}
  }, []);
  const setPalette = React.useCallback((p: PaletteName) => {
    setPaletteState(p);
    try { localStorage.setItem(STORAGE_KEYS.palette, p); } catch {}
  }, []);
  const setDensity = React.useCallback((d: Density) => {
    setDensityState(d);
    try { localStorage.setItem(STORAGE_KEYS.density, d); } catch {}
  }, []);
  const setFontpair = React.useCallback((f: FontPair) => {
    setFontpairState(f);
    try { localStorage.setItem(STORAGE_KEYS.fontpair, f); } catch {}
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    applyAttributes({ theme, palette, density, fontpair });
  }, [theme, palette, density, fontpair, mounted]);

  const value = React.useMemo<AppearanceContextValue>(
    () => ({ theme, resolvedTheme: resolved, palette, density, fontpair, setTheme, setPalette, setDensity, setFontpair }),
    [theme, resolved, palette, density, fontpair, setTheme, setPalette, setDensity, setFontpair],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const ctx = React.useContext(AppearanceContext);
  if (!ctx) {
    return {
      theme: DEFAULTS.theme,
      resolvedTheme: 'light',
      palette: DEFAULTS.palette,
      density: DEFAULTS.density,
      fontpair: DEFAULTS.fontpair,
      setTheme: () => {},
      setPalette: () => {},
      setDensity: () => {},
      setFontpair: () => {},
    };
  }
  return ctx;
}

/** Compat shim — keeps `import { useTheme } from '@/components/theme-provider'` working. */
export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useAppearance();
  return { theme, resolvedTheme, setTheme, themes: ['light', 'dark', 'system'] as const };
}

/** Legacy export — keeps `<ThemeProvider>` working in layout.tsx. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <AppearanceProvider>{children}</AppearanceProvider>;
}

/** Inline script injected in <head> to set data-* on <html> before hydration (prevents FOUC). */
export function AppearanceScript() {
  const code = `
(function(){
  try {
    var ls = window.localStorage;
    var theme = ls.getItem('${STORAGE_KEYS.theme}') || '${DEFAULTS.theme}';
    var palette = ls.getItem('${STORAGE_KEYS.palette}') || '${DEFAULTS.palette}';
    var density = ls.getItem('${STORAGE_KEYS.density}') || '${DEFAULTS.density}';
    var fontpair = ls.getItem('${STORAGE_KEYS.fontpair}') || '${DEFAULTS.fontpair}';
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    var r = document.documentElement;
    r.setAttribute('data-theme', resolved);
    r.setAttribute('data-palette', palette);
    r.setAttribute('data-density', density);
    r.setAttribute('data-fontpair', fontpair);
    if (resolved === 'dark') r.classList.add('dark');
  } catch (e) {}
})();
`.trim();
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
