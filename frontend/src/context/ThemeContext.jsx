import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export const THEME_KEY = 'eshopping:theme';
export const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export const ThemeContext = createContext(null);

/** Reads the stored preference, falling back to the OS choice. */
function readStored() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return THEME_OPTIONS.some((option) => option.value === value) ? value : 'system';
  } catch {
    return 'system';
  }
}

function prefersDark() {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

/**
 * Resolves the preference to the theme that is actually painted.
 * 'system' collapses to 'light' or 'dark' so consumers only ever deal with
 * those two values.
 */
export function resolveTheme(preference) {
  return preference === 'system' ? (prefersDark() ? 'dark' : 'light') : preference;
}

/**
 * Runs before first paint. Applied by the inline snippet in index.html so the
 * correct theme is on <html> before React mounts, which is what prevents the
 * light-then-dark flash on a dark-mode reload.
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0b0e' : '#f6f6f8');
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readStored);
  const [systemTheme, setSystemTheme] = useState(prefersDark);

  // Track the OS setting so 'system' stays live instead of sampling once.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemTheme(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const theme = preference === 'system' ? (systemTheme ? 'dark' : 'light') : preference;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Let the storefront follow the OS while the tab is focused, and stay put
  // once the visitor has picked a theme explicitly.
  useEffect(() => {
    document.addEventListener('visibilitychange', onVisible);
    function onVisible() {
      if (!document.hidden && preference === 'system') setSystemTheme(prefersDark());
    }
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [preference]);

  const setTheme = useCallback((next) => {
    setPreference(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode - the choice simply will not persist */
    }
  }, []);

  // Cycles light -> dark -> system, which is what the single-icon toggle uses.
  const cycleTheme = useCallback(() => {
    const order = ['light', 'dark', 'system'];
    setTheme(order[(order.indexOf(preference) + 1) % order.length]);
  }, [preference, setTheme]);

  const value = useMemo(
    () => ({ preference, theme, setTheme, cycleTheme, isDark: theme === 'dark' }),
    [preference, theme, setTheme, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}