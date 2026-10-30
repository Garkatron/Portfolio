import { useI18n } from "../shell/i18n.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";
import Search from "../shell/Search.jsx";

interface TopBarProps {
  onOpenPalette: () => void;
}

/** Window-manager top bar: brand, search, palette and accents. */
export default function TopBar({ onOpenPalette }: TopBarProps) {
  const { t } = useI18n();
  const { theme, setTheme, themes } = useTheme();

  return (
    <header className="os-topbar">
      <span className="os-brand px">
        ◆ GARKATRON<span className="os-brand-os">OS</span>
      </span>

      <div className="os-topbar-tools">
        <Search />
        <button
          type="button"
          className="os-palette-trigger"
          onClick={onOpenPalette}
          aria-label={t("palette.trigger")}
        >
          <span className="os-pt-long">{t("palette.trigger")}</span>
          <span className="os-pt-short" aria-hidden="true">
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
