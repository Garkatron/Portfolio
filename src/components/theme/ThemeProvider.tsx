import { createContext } from "preact";
import type { ComponentChildren } from "preact";
import { useCallback, useContext, useEffect, useMemo, useState } from "preact/hooks";
import { log } from "../../lib/syslog.js";

export interface Theme {
  id: string;
  swatch: string;
}

// Accent themes. `swatch` is the CSS variable the accent maps to (see
// global.css, [data-accent=…]); the actual colors live only in CSS.
export const THEMES: Theme[] = [
  { id: "hazard", swatch: "var(--warn)" },
  { id: "cyan", swatch: "var(--cyan)" },
  { id: "magenta", swatch: "var(--magenta)" },
  { id: "green", swatch: "var(--green)" },
];
export const DEFAULT_THEME = "hazard";
// Keep in sync with the pre-paint script in src/layout/Base.astro.
export const THEME_STORAGE_KEY = "garkatron:accent";

interface ThemeValue {
  theme: string;
  setTheme: (id: string) => void;
  toggleTheme: () => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeValue | null>(null);

function isTheme(id: string | undefined): id is string {
  return !!id && THEMES.some((theme) => theme.id === id);
}

export function ThemeProvider({ children }: { children: ComponentChildren }) {
  // SSR renders the default; the pre-paint script has already applied the
  // stored accent to <html>, so we only sync state after mount.
  const [theme, setThemeState] = useState(DEFAULT_THEME);

  useEffect(() => {
    const current = document.documentElement.dataset.accent;
    if (isTheme(current)) setThemeState(current);
  }, []);

  const setTheme = useCallback((id: string) => {
    if (!isTheme(id)) return;
    document.documentElement.dataset.accent = id;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {}
    setThemeState(id);
    log("theme", id);
  }, []);

  const toggleTheme = useCallback(() => {
    const current = THEMES.findIndex((entry) => entry.id === theme);
    const next = THEMES[(current + 1) % THEMES.length];
    if (next) setTheme(next.id);
  }, [theme, setTheme]);

  const value = useMemo<ThemeValue>(
    () => ({ theme, setTheme, toggleTheme, themes: THEMES }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
