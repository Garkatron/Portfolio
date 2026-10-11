import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../theme/ThemeProvider.jsx";
import { log } from "../../lib/syslog.js";
import { useI18n } from "./i18n.jsx";

function normalize(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/** Every word of the query must prefix-match some word of the label. */
function matches(label, query) {
  const words = normalize(label).split(/\s+/);
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((q) => words.some((w) => w.startsWith(q)));
}

export default function CommandPalette({ open, onClose, routes, locales, go, onSwitchLang }) {
  const { t, lang } = useI18n();
  const { setTheme, toggleTheme, themes } = useTheme();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const commands = useMemo(() => {
    const nav = (id, href) => ({ id, group: "nav", label: t(`palette.commands.${id}`), run: () => go(href) });
    return [
      nav("go-home", routes.home),
      nav("open-projects", routes.projects),
      nav("open-books", routes.books),
      nav("open-videos", routes.videos),
      nav("open-roadmap", routes.roadmap),
      nav("open-blog", routes.blog),
      nav("contact", routes.contact),
      {
        id: "search",
        group: "nav",
        label: t("palette.commands.search"),
        run: () => document.getElementById("site-search")?.focus(),
      },
      { id: "toggle-theme", group: "theme", label: t("palette.commands.toggle-theme"), run: toggleTheme },
      ...themes.map((th) => ({
        id: `theme-${th.id}`,
        group: "theme",
        label: t("palette.commands.theme", { name: t(`themes.${th.id}`) }),
        swatch: th.swatch,
        run: () => setTheme(th.id),
      })),
      ...locales
        .filter((l) => l.code !== lang)
        .map((l) => ({
          id: `lang-${l.code}`,
          group: "lang",
          label: t("palette.commands.lang", { name: l.name }),
          run: () => onSwitchLang(l),
        })),
    ];
  }, [t, lang, routes, locales, themes, go, setTheme, toggleTheme, onSwitchLang]);

  const visible = useMemo(() => commands.filter((c) => matches(c.label, query)), [commands, query]);

  useEffect(() => {
    // Reset on close (not on open) so nothing typed right after opening is wiped.
    if (open) return;
    setQuery("");
    setCursor(0);
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  if (!open) return null;

  const run = (cmd) => {
    log("cmd", cmd.label);
    onClose();
    cmd.run();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (visible.length ? (c + 1) % visible.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (visible.length ? (c - 1 + visible.length) % visible.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (visible[cursor]) run(visible[cursor]);
      else if (query.trim()) log("unknown", query.trim());
    }
  };

  let lastGroup = null;

  return (
    <div className="palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={t("palette.trigger")}>
        <div className="palette-input">
          <span className="prompt">&gt;</span>
          <input
            // Mounted only while open, so autoFocus grabs focus in the same commit
            // and keystrokes typed right after ⌘K aren't lost.
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("palette.placeholder")}
            aria-label={t("palette.placeholder")}
            aria-controls="palette-list"
            aria-activedescendant={visible[cursor] ? `cmd-${visible[cursor].id}` : undefined}
            spellCheck="false"
            autoComplete="off"
          />
        </div>
        <ul className="palette-list" id="palette-list" role="listbox">
          {visible.length === 0 && <li className="palette-empty">{t("palette.empty")}</li>}
          {visible.map((cmd, i) => {
            const heading = cmd.group !== lastGroup ? t(`palette.groups.${cmd.group}`) : null;
            lastGroup = cmd.group;
            return (
              <li key={cmd.id} role="presentation">
                {heading && <div className="palette-group px">{heading}</div>}
                <button
                  type="button"
                  id={`cmd-${cmd.id}`}
                  role="option"
                  aria-selected={i === cursor}
                  className={i === cursor ? "on" : undefined}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => run(cmd)}
                >
                  {cmd.swatch && <span className="palette-swatch" style={{ background: cmd.swatch }} />}
                  {cmd.label}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="palette-hint">{t("palette.hint")}</div>
      </div>
    </div>
  );
}
