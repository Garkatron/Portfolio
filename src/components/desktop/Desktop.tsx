import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { render } from "preact";
import { navigate } from "astro:transitions/client";
import type { WindowHandle } from "slaos";
import { I18nProvider, useI18n } from "../shell/i18n.tsx";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import CommandPalette from "../shell/CommandPalette.jsx";
import Player from "../shell/Player.jsx";
import SysLog from "../shell/SysLog.jsx";
import Tabs from "../shell/Tabs.jsx";
import { boot, log } from "../../lib/syslog.js";
import { DesktopWM } from "../../lib/desktop/wm.js";
import TopBar from "./TopBar";
import Dock from "./Dock";
import Taskbar from "./Taskbar";
import type { AuxApp, Locale, NavItem, OpenWindow, ShellData } from "./types";

const LANG_STORAGE_KEY = "garkatron:lang"; // read by the pre-paint script in Base.astro

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/**
 * The desktop island. Every page is rendered as a window inside a persistent
 * "OS" chrome; SLAOS owns the windows (see src/lib/desktop/wm.ts) while the
 * page's server-rendered HTML is adopted into the main route window so the
 * content islands (search, project filters, videos) keep hydrating normally.
 */
export default function Desktop({ shell }: { shell: ShellData }) {
  return (
    <I18nProvider lang={shell.lang} dict={shell.dict} fallback={shell.fallbackDict}>
      <ThemeProvider>
        <DesktopSurface shell={shell} />
      </ThemeProvider>
    </I18nProvider>
  );
}

function DesktopSurface({ shell }: { shell: ShellData }) {
  const { t } = useI18n();
  const stageRef = useRef<HTMLDivElement>(null);
  const wmRef = useRef<DesktopWM | null>(null);
  const mainOpen = useRef(false);
  const windowsRef = useRef<OpenWindow[]>([]);
  // Preact roots painted inside window frames, so they can be unmounted when a
  // window closes (SLAOS only removes the DOM node) or before a page swap.
  const mounts = useRef<Map<string, HTMLElement>>(new Map());

  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const [focused, setFocused] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    windowsRef.current = windows;
  }, [windows]);

  // Astro swaps the body without unmounting islands, so detach the roots (and
  // run their effect cleanups) ourselves. Playback lives outside Preact, so
  // this does not stop the music.
  useEffect(() => {
    const cleanup = () => {
      mounts.current.forEach((root) => render(null, root));
      mounts.current.clear();
    };
    document.addEventListener("astro:before-swap", cleanup);
    return () => document.removeEventListener("astro:before-swap", cleanup);
  }, []);

  const labels = useMemo(
    () => ({
      close: t("shell.os.close"),
      minimize: t("shell.os.minimize"),
      maximize: t("shell.os.maximize"),
      restore: t("shell.os.restore"),
    }),
    [t],
  );

  const go = useCallback((href: string) => {
    navigate(href);
  }, []);

  const focusWindow = useCallback((win: OpenWindow) => {
    if (win.minimized) {
      win.handle.setVisibility("visible");
      setWindows((prev) =>
        prev.map((w) => (w.id === win.id ? { ...w, minimized: false } : w)),
      );
    }
    wmRef.current?.focus(win.handle.id);
    setFocused(win.id);
  }, []);

  const remember = useCallback((win: OpenWindow) => {
    setWindows((prev) => [...prev.filter((w) => w.id !== win.id), win]);
  }, []);

  // SLAOS can hide a window from its own minimize control; keep the taskbar in
  // sync no matter who changed the visibility.
  const syncVisibility = useCallback(
    (id: string, visibility: "visible" | "hidden") => {
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, minimized: visibility === "hidden" } : w)),
      );
      if (visibility === "hidden") setFocused((current) => (current === id ? null : current));
    },
    [],
  );

  const spawnMain = useCallback(async () => {
    const wm = wmRef.current;
    const stage = stageRef.current;
    if (!wm || !stage) return;

    if (mainOpen.current) {
      const existing = windowsRef.current.find((w) => w.kind === "route");
      if (existing) focusWindow(existing);
      return;
    }

    const content = document.getElementById("content");
    const source = document.getElementById("os-page-source");
    if (!content) return;

    mainOpen.current = true;
    // Local CSS px: the desktop may be zoomed (see desktop.css), and the
    // window manager works in layout coordinates.
    const width = stage.clientWidth;
    const height = stage.clientHeight;

    const handle: WindowHandle = await wm.open(
      {
        appId: "route",
        type: "route",
        title: shell.path,
        width: width - 32,
        height: height - 32,
        initialX: 16,
        initialY: 16,
        minWidth: 320,
        minHeight: 240,
        maxWidth: Math.max(320, width - 32),
        maxHeight: Math.max(240, height - 32),
        closeable: true,
        minimizable: true,
        labels,
        onFocus: () => setFocused("route"),
      },
      (root) => {
        const tabsRoot = document.createElement("div");
        tabsRoot.className = "os-window-tabs";
        mounts.current.set("route", tabsRoot);
        const page = document.createElement("div");
        page.className = "os-window-page";
        const editor = document.createElement("div");
        editor.className = "editor";
        editor.append(content);
        page.append(editor);
        root.append(tabsRoot, page);
        render(
          <I18nProvider lang={shell.lang} dict={shell.dict} fallback={shell.fallbackDict}>
            <Tabs tabs={shell.tabs} />
          </I18nProvider>,
          tabsRoot,
        );
      },
    );

    handle.setCallbacks({
      onVisibilityChange: (visibility) => syncVisibility("route", visibility),
      onClose: () => {
        mainOpen.current = false;
        source?.append(content);
        const tabsRoot = mounts.current.get("route");
        if (tabsRoot) {
          render(null, tabsRoot);
          mounts.current.delete("route");
        }
        setWindows((prev) => prev.filter((w) => w.kind !== "route"));
        setFocused((current) => (current === "route" ? null : current));
      },
    });

    remember({
      id: "route",
      kind: "route",
      title: shell.path,
      handle,
      minimized: false,
    });
    wm.focus(handle.id);
    setFocused("route");
  }, [focusWindow, labels, remember, shell, syncVisibility]);

  const spawnAux = useCallback(
    async (app: AuxApp) => {
      const existing = windowsRef.current.find((w) => w.kind === app);
      if (existing) {
        focusWindow(existing);
        return;
      }

      const wm = wmRef.current;
      const stage = stageRef.current;
      if (!wm || !stage) return;

      const stageWidth = stage.clientWidth;
      const stageHeight = stage.clientHeight;
      const width = app === "player" ? 360 : 480;
      const height = app === "player" ? 560 : 360;
      const seq = windowsRef.current.filter((w) => w.kind !== "route").length;
      const x = Math.max(16, stageWidth - width - 24 - seq * 24);
      const y = Math.max(48, 72 + seq * 24);
      const title = app === "player" ? t("shell.player") : t("shell.syslog");

      const handle = await wm.open(
        {
          appId: app,
          type: app,
          title,
          width,
          height,
          initialX: x,
          initialY: y,
          minWidth: 280,
          minHeight: 220,
          maxWidth: Math.max(280, stageWidth - x - 8),
          maxHeight: Math.max(220, stageHeight - y - 8),
          closeable: true,
          minimizable: true,
          labels,
          onFocus: () => setFocused(app),
        },
        (root) => {
          const pad = document.createElement("div");
          pad.className = `os-app-pad${app === "syslog" ? " os-app-terminal" : ""}`;
          mounts.current.set(app, pad);
          root.append(pad);
          render(
            <I18nProvider lang={shell.lang} dict={shell.dict} fallback={shell.fallbackDict}>
              {app === "player" ? <Player playlist={shell.playlist} /> : <SysLog />}
            </I18nProvider>,
            pad,
          );
        },
      );

      handle.setCallbacks({
        onVisibilityChange: (visibility) => syncVisibility(app, visibility),
        onClose: () => {
          const pad = mounts.current.get(app);
          if (pad) {
            render(null, pad);
            mounts.current.delete(app);
          }
          setWindows((prev) => prev.filter((w) => w.kind !== app));
          setFocused((current) => (current === app ? null : current));
        },
      });

      remember({ id: app, kind: app, title, handle, minimized: false });
      wm.focus(handle.id);
      setFocused(app);
    },
    [focusWindow, labels, remember, shell, syncVisibility, t],
  );

  const openNav = useCallback(
    (item: NavItem) => {
      if (item.active) {
        const route = windowsRef.current.find((w) => w.kind === "route");
        if (route) focusWindow(route);
        else void spawnMain();
        return;
      }
      go(item.href);
    },
    [focusWindow, go, spawnMain],
  );

  const toggleWindow = useCallback((win: OpenWindow) => {
    if (!win.minimized) win.handle.setVisibility("hidden");
  }, []);

  const switchLang = useCallback(
    (locale: Locale) => {
      try {
        localStorage.setItem(LANG_STORAGE_KEY, locale.code);
      } catch {}
      log("lang", locale.code);
      go(locale.href);
    },
    [go],
  );

  // Boot the window manager and open the route window once per page.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    wmRef.current = new DesktopWM(stage);
    boot(shell.projectCount);
    void spawnMain();
  }, [shell.projectCount, spawnMain]);

  // One logging rule for static content: any element with data-log logs on click.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = event.target instanceof Element && event.target.closest("[data-log]");
      if (el) log(el.getAttribute("data-log")!, el.getAttribute("data-log-arg") ?? undefined);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Global shortcuts: ⌘K / Ctrl+K palette, "/" search, P projects, V videos, C contact.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || paletteOpen) return;

      const key = event.key.toLowerCase();
      if (event.key === "/") {
        event.preventDefault();
        document.getElementById("site-search")?.focus();
      } else if (key === "p") {
        log("open", shell.files.projects);
        go(shell.routes.projects);
      } else if (key === "v") {
        log("open", shell.files.videos);
        go(shell.routes.videos);
      } else if (key === "c") {
        log("open", shell.files.contact);
        go(shell.routes.contact);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, paletteOpen, shell.files, shell.routes]);

  return (
    <div className="os-desktop">
      <TopBar path={shell.path} onOpenPalette={() => setPaletteOpen(true)} />

      <div className="os-body">
        <Dock
          nav={shell.nav}
          activeAux={windows.filter((w) => w.kind !== "route").map((w) => w.kind as AuxApp)}
          onOpenNav={openNav}
          onOpenAux={spawnAux}
        />
        <div className="os-stage" ref={stageRef}>
          <span className="os-wallmark px" aria-hidden="true">
            GARKATRON
          </span>
        </div>
      </div>

      <Taskbar
        windows={windows}
        focused={focused}
        siteStatus={shell.site.status}
        locales={shell.locales}
        onFocus={focusWindow}
        onToggle={toggleWindow}
        onSwitchLang={switchLang}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        routes={shell.routes}
        locales={shell.locales}
        go={go}
        onSwitchLang={switchLang}
      />
    </div>
  );
}
