import { useI18n } from "../shell/i18n.tsx";
import type { AuxApp, NavItem } from "./types";

interface DockProps {
  nav: NavItem[];
  activeAux: AuxApp[];
  onOpenNav: (item: NavItem) => void;
  onOpenAux: (app: AuxApp) => void;
}

// Pixel-friendly glyphs keep the rail monochrome; the accent comes from CSS.
const GLYPHS: Record<string, string> = {
  about: "◈",
  projects: "▤",
  books: "▥",
  videos: "▶",
  roadmap: "◇",
  blog: "✎",
  contact: "✉",
};

const AUX: { id: AuxApp; glyph: string; label: string }[] = [
  { id: "player", glyph: "♪", label: "shell.player" },
  { id: "syslog", glyph: ">_", label: "shell.syslog" },
];

/** Desktop app rail: route apps (files) and persistent utilities. */
export default function Dock({ nav, activeAux, onOpenNav, onOpenAux }: DockProps) {
  const { t } = useI18n();

  return (
    <nav id="os-dock" className="os-dock" aria-label={t("shell.os.apps")}>
      <h6 className="os-dock-title px">{t("shell.os.apps")}</h6>
      {nav.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`os-icon${item.active ? " active" : ""}`}
          title={item.file}
          aria-current={item.active ? "page" : undefined}
          onClick={() => onOpenNav(item)}
        >
          <span className="os-glyph" aria-hidden="true">
            {GLYPHS[item.id] ?? "◆"}
          </span>
          <span className="os-icon-label">{item.file}</span>
        </button>
      ))}

      <div className="os-dock-sep" role="presentation" />

      {AUX.map((app) => (
        <button
          key={app.id}
          type="button"
          className={`os-icon${activeAux.includes(app.id) ? " running" : ""}`}
          title={t(app.label)}
          onClick={() => onOpenAux(app.id)}
        >
          <span className="os-glyph" aria-hidden="true">
            {app.glyph}
          </span>
          <span className="os-icon-label">{t(app.label)}</span>
        </button>
      ))}
    </nav>
  );
}
