import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { log } from "../../lib/syslog.js";

// Accent themes. `swatch` is the CSS variable the accent maps to (see global.css,
// [data-accent=…]); the actual colors live only in CSS.
export const THEMES = [
  { id: "hazard", swatch: "var(--warn)" },
  { id: "cyan", swatch: "var(--cyan)" },
  { id: "magenta", swatch: "var(--magenta)" },
  { id: "green", swatch: "var(--green)" },
];
export const DEFAULT_THEME = "hazard";
// Keep in sync with the pre-paint script in src/layout/Base.astro.
export const THEME_STORAGE_KEY = "garkatron:accent";

const ThemeContext = createContext(null);

function isTheme(id) {
  return THEMES.some((t) => t.id === id);
}

export function ThemeProvider({ children }) {
  // SSR renders the default; the pre-paint script has already applied the
  // stored accent to <html>, so we only sync React state after mount.
  const [theme, setThemeState] = useState(DEFAULT_THEME);

  useEffect(() => {
    const current = document.documentElement.dataset.accent;
    if (isTheme(current)) setThemeState(current);
  }, []);

  const setTheme = useCallback((id) => {
    if (!isTheme(id)) return;
    document.documentElement.dataset.accent = id;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {}
    setThemeState(id);
    log("theme", id);
  }, []);

  const toggleTheme = useCallback(() => {
    const i = THEMES.findIndex((t) => t.id === theme);
    setTheme(THEMES[(i + 1) % THEMES.length].id);
  }, [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme, themes: THEMES }), [theme, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
