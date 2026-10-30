import { useEffect, useState } from "preact/hooks";
import { useI18n } from "../shell/i18n.tsx";
import type { Locale, OpenWindow } from "./types";

interface TaskbarProps {
  windows: OpenWindow[];
  focused: string | null;
  siteStatus: string;
  locales: Locale[];
  onFocus: (win: OpenWindow) => void;
  onToggle: (win: OpenWindow) => void;
  onSwitchLang: (locale: Locale) => void;
  onOpenPalette: () => void;
}

/** Mounted after paint so the build time never causes a hydration mismatch. */
function Clock({ lang }: { lang: string }) {
  const [now, setNow] = useState("");

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString(lang === "es" ? "es-ES" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [lang]);

  return (
    <span className="os-clock px" aria-live="off">
      {now || "--:--"}
    </span>
  );
}

const GLYPH: Record<OpenWindow["kind"], string> = {
  route: "▤",
  videos: "▶",
  player: "♪",
  syslog: ">_",
};

/** Bottom bar: launcher, open windows, language switcher and clock. */
export default function Taskbar({
  windows,
  focused,
  siteStatus,
  locales,
  onFocus,
  onToggle,
  onSwitchLang,
  onOpenPalette,
}: TaskbarProps) {
  const { t, lang } = useI18n();

  return (
    <footer className="os-taskbar">
      <button type="button" className="os-start" onClick={onOpenPalette}>
        <span aria-hidden="true">◆</span> {t("shell.os.menu")}
      </button>

      <div className="os-tasks">
        {windows.map((win) => (
          <button
            key={win.id}
            type="button"
            className={[
              "os-task",
              win.minimized ? "minimized" : "",
              focused === win.id ? "focused" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => (focused === win.id && !win.minimized ? onToggle(win) : onFocus(win))}
            title={win.title}
          >
            <span className="os-task-glyph" aria-hidden="true">
              {GLYPH[win.kind]}
            </span>
            <span className="os-task-title">{win.title}</span>
          </button>
        ))}
      </div>

      <div className="os-tray">
        <span className="os-tray-ok">● {siteStatus.toUpperCase()}</span>
        <span className="langs">
          {locales.map((locale) => (
            <a
              key={locale.code}
              href={locale.href}
              className={locale.code === lang ? "on" : undefined}
              aria-current={locale.code === lang ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                onSwitchLang(locale);
              }}
            >
              {locale.short}
            </a>
          ))}
        </span>
        <Clock lang={lang} />
      </div>
    </footer>
  );
}
