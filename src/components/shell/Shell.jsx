import { useCallback, useEffect, useState } from "react";
import { navigate } from "astro:transitions/client";
import { ThemeProvider } from "../theme/ThemeProvider.jsx";
import { boot, log } from "../../lib/syslog.js";
import { I18nProvider } from "./i18n.jsx";
import Titlebar from "./Titlebar.jsx";
import Explorer from "./Explorer.jsx";
import Tabs from "./Tabs.jsx";
import Sidebar from "./Sidebar.jsx";
import StatusBar from "./StatusBar.jsx";
import CommandPalette from "./CommandPalette.jsx";

const LANG_STORAGE_KEY = "garkatron:lang"; // read by the pre-paint script in Base.astro

function isTyping(target) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/**
 * The persistent editor chrome. Page content arrives as `children`
 * (static Astro HTML) and is rendered inside the editor pane.
 */
export default function Shell({ shell, children }) {
  return (
    <I18nProvider lang={shell.lang} dict={shell.dict} fallback={shell.fallbackDict}>
      <ThemeProvider>
        <ShellLayout shell={shell}>{children}</ShellLayout>
      </ThemeProvider>
    </I18nProvider>
  );
}

function ShellLayout({ shell, children }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // Client-side navigation, so the audio host survives the page change.
  const go = useCallback((href) => {
    navigate(href);
  }, []);

  const switchLang = useCallback((locale) => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, locale.code);
    } catch {}
    log("lang", locale.code);
    go(locale.href);
  }, [go]);

  useEffect(() => {
    boot(shell.projectCount);
  }, [shell.projectCount]);

  // One logging rule for static content: any element with data-log logs on click.
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target instanceof Element && e.target.closest("[data-log]");
      if (el) log(el.getAttribute("data-log"), el.getAttribute("data-log-arg") ?? undefined);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Global shortcuts: ⌘K / Ctrl+K palette, "/" search, P projects, C contact.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || paletteOpen) return;
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("site-search")?.focus();
      } else if (e.key === "p" || e.key === "P") {
        log("open", shell.files.projects);
        go(shell.routes.projects);
      } else if (e.key === "v" || e.key === "V") {
        log("open", shell.files.videos);
        go(shell.routes.videos);
      } else if (e.key === "c" || e.key === "C") {
        log("open", shell.files.contact);
        go(shell.routes.contact);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, paletteOpen, shell.files, shell.routes]);

  return (
    <>
      <div className="stripes" aria-hidden="true" />
      <Titlebar
        path={shell.path}
        onOpenPalette={() => setPaletteOpen(true)}
        onToggleNav={() => setNavOpen((v) => !v)}
        navOpen={navOpen}
      />
      <div className="workspace">
        <Explorer nav={shell.nav} toolGroups={shell.toolGroups} open={navOpen} />
        <main className="main" id="main">
          <Tabs tabs={shell.tabs} />
          <div className="editor">{children}</div>
        </main>
        <Sidebar site={shell.site} playlist={shell.playlist} routes={shell.routes} />
      </div>
      <StatusBar locales={shell.locales} onSwitchLang={switchLang} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        routes={shell.routes}
        locales={shell.locales}
        go={go}
        onSwitchLang={switchLang}
      />
    </>
  );
}
