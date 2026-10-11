import { useEffect, useRef, useState } from "react";
import { log } from "../../lib/syslog.js";
import { useI18n } from "./i18n.jsx";

// Pagefind is generated into dist/pagefind/ by `pnpm build` (see package.json).
// It picks the index matching <html lang>, so results follow the page locale.
const PAGEFIND_URL = "/pagefind/pagefind.js";
let pagefindPromise;

function loadPagefind() {
  pagefindPromise ??= import(/* @vite-ignore */ PAGEFIND_URL).then(async (pf) => {
    await pf.init?.();
    return pf;
  });
  return pagefindPromise;
}

export default function Search() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ status: "idle", results: [] });
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setState({ status: "idle", results: [] });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: "loading" }));
    const timer = setTimeout(async () => {
      try {
        const pf = await loadPagefind();
        const search = await pf.debouncedSearch(q, {}, 150);
        if (!search || cancelled) return; // superseded by a newer query
        const results = await Promise.all(search.results.slice(0, 8).map((r) => r.data()));
        if (!cancelled) {
          setState({ status: "done", results });
          setCursor(0);
        }
      } catch {
        if (!cancelled) setState({ status: "unavailable", results: [] });
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onDown = (e) => rootRef.current && !rootRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const openResult = (r) => {
    log("search", query.trim());
    log("open", r.meta?.title ?? r.url);
    window.location.assign(r.url);
  };

  const onKeyDown = (e) => {
    const n = state.results.length;
    if (e.key === "Escape") {
      setOpen(false);
      e.currentTarget.blur();
    } else if (e.key === "ArrowDown" && n) {
      e.preventDefault();
      setCursor((c) => (c + 1) % n);
    } else if (e.key === "ArrowUp" && n) {
      e.preventDefault();
      setCursor((c) => (c - 1 + n) % n);
    } else if (e.key === "Enter" && state.results[cursor]) {
      e.preventDefault();
      openResult(state.results[cursor]);
    }
  };

  const showPanel = open && query.trim();

  return (
    <div className="search" ref={rootRef}>
      <input
        id="site-search"
        type="search"
        autoComplete="off"
        spellCheck="false"
        placeholder={t("search.placeholder")}
        aria-label={t("search.label")}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <kbd className="search-kbd" aria-hidden="true">/</kbd>
      {showPanel && (
        <div className="search-panel" role="listbox">
          {state.status === "loading" && <p className="search-msg">{t("search.loading")}</p>}
          {state.status === "unavailable" && <p className="search-msg">{t("search.unavailable")}</p>}
          {state.status === "done" && !state.results.length && <p className="search-msg">{t("search.empty")}</p>}
          {state.results.map((r, i) => (
            <a
              key={r.url}
              href={r.url}
              role="option"
              aria-selected={i === cursor}
              className={i === cursor ? "on" : undefined}
              onMouseEnter={() => setCursor(i)}
              onClick={(e) => {
                e.preventDefault();
                openResult(r);
              }}
            >
              <span className="search-title">{r.meta?.title ?? r.url}</span>
              {/* Pagefind excerpts are escaped text with <mark> highlights. */}
              <span className="search-excerpt" dangerouslySetInnerHTML={{ __html: r.excerpt }} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
