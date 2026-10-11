import { useEffect, useState } from "react";
import { useTheme } from "../theme/ThemeProvider.jsx";
import { useI18n } from "./i18n.jsx";

const LINE_HEIGHT = 22; // px per "line" for the scroll-driven Ln counter

export default function StatusBar({ locales, onSwitchLang }) {
  const { t, lang } = useI18n();
  const { theme } = useTheme();
  const [line, setLine] = useState(1);

  useEffect(() => {
    const onScroll = () => setLine(Math.floor(window.scrollY / LINE_HEIGHT) + 1);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <footer className="status">
      <span className="mode">{t("shell.mode")}</span>
      <span>⎇ {t("shell.branch")}</span>
      <span className="status-ok">● {t("shell.errors")}</span>
      <span className="r">
        <span className="langs" role="group" aria-label={t("shell.language")}>
          {locales.map((l) => (
            <a
              key={l.code}
              href={l.href}
              hrefLang={l.code}
              lang={l.code}
              title={l.name}
              className={l.code === lang ? "on" : undefined}
              aria-current={l.code === lang ? "true" : undefined}
              onClick={(e) => {
                e.preventDefault();
                if (l.code !== lang) onSwitchLang(l);
              }}
            >
              {l.short}
            </a>
          ))}
        </span>
        <span className="status-meta">
          {t("shell.encoding")} · tokyo-{theme} · {t("shell.cursor", { ln: line, col: 1 })}
        </span>
      </span>
    </footer>
  );
}
