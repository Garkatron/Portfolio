import { useTheme } from "../theme/ThemeProvider.jsx";
import { useI18n } from "./i18n.jsx";
import Search from "./Search.jsx";

export default function Titlebar({ path, onOpenPalette, onToggleNav, navOpen }) {
  const { t } = useI18n();
  const { theme, setTheme, themes } = useTheme();

  return (
    <header className="titlebar">
      <button
        type="button"
        className="nav-toggle"
        aria-label={t("shell.openMenu")}
        aria-expanded={navOpen}
        aria-controls="explorer"
        onClick={onToggleNav}
      >
        ☰
      </button>
      <div className="dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="path">
        ~/garkatron / <b>{path}</b> — {t("shell.branch")}
      </div>
      <div className="titlebar-tools">
        <Search />
        <button type="button" className="palette-trigger" onClick={onOpenPalette} aria-label={t("palette.trigger")}>
          <span className="pt-long">{t("palette.trigger")}</span>
          <span className="pt-short" aria-hidden="true">
            {t("palette.triggerShort")}
          </span>
        </button>
        <div className="swatches" role="radiogroup" aria-label={t("shell.accent")}>
          {themes.map((th) => (
            <button
              key={th.id}
              type="button"
              role="radio"
              aria-checked={theme === th.id}
              aria-label={t(`themes.${th.id}`)}
              title={t(`themes.${th.id}`)}
              className={theme === th.id ? "on" : undefined}
              style={{ background: th.swatch }}
              onClick={() => setTheme(th.id)}
            />
          ))}
        </div>
      </div>
    </header>
  );
}
