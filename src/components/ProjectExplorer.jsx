import { useEffect, useMemo, useState } from "react";
import { createT } from "../i18n/translate.js";
import ProjectCard from "./ProjectCard.jsx";

function normalize(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function haystack(p) {
  return normalize([p.title, p.description, p.year, ...p.tags, ...p.tech].join(" "));
}

/** Filter state lives in the URL (?q=…&tags=a,b) so filtered views are shareable. */
function readUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get("q") ?? "",
    tags: (params.get("tags") ?? "").split(",").filter(Boolean),
  };
}

function writeUrl(q, tags) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (tags.length) params.set("tags", tags.join(","));
  const search = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
}

/**
 * Full project grid with free-text search and multi-select tag filters.
 * Selected tags combine with AND: a project must carry every selected tag.
 */
export default function ProjectExplorer({ projects, dict, fallback }) {
  const t = useMemo(() => createT(dict, fallback), [dict, fallback]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const { q, tags } = readUrl();
    setQuery(q);
    setSelected(tags);
  }, []);

  const allTags = useMemo(() => {
    const counts = new Map();
    projects.forEach((p) => p.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
    return [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b));
  }, [projects]);

  const indexed = useMemo(() => projects.map((p) => ({ p, text: haystack(p) })), [projects]);

  const visible = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    return indexed
      .filter(({ p, text }) => selected.every((tag) => p.tags.includes(tag)) && words.every((w) => text.includes(w)))
      .map(({ p }) => p);
  }, [indexed, query, selected]);

  const update = (q, tags) => {
    setQuery(q);
    setSelected(tags);
    writeUrl(q.trim(), tags);
  };

  const toggleTag = (tag) =>
    update(query, selected.includes(tag) ? selected.filter((x) => x !== tag) : [...selected, tag]);

  const labels = { repo: t("projects.repo"), live: t("projects.live") };

  return (
    <>
      <div className="filters" data-pagefind-ignore>
        <div className="filter-row">
          <input
            className="filter-input"
            type="search"
            value={query}
            placeholder={t("projects.search")}
            aria-label={t("projects.search")}
            onChange={(e) => update(e.target.value, selected)}
          />
          <span className="filter-count" aria-live="polite">
            {t("projects.count", { n: visible.length, total: projects.length })}
          </span>
        </div>
        <div className="filter-row" role="group" aria-label={t("projects.tags")}>
          <span className="label">{t("projects.tags")}:</span>
          {allTags.map((tag) => (
            <button key={tag} type="button" className="chip" aria-pressed={selected.includes(tag)} onClick={() => toggleTag(tag)}>
              {tag}
            </button>
          ))}
          {(selected.length > 0 || query) && (
            <button type="button" className="chip ghost" onClick={() => update("", [])}>
              × {t("projects.clear")}
            </button>
          )}
        </div>
      </div>
      <div className="projects">
        {visible.map((p) => (
          <ProjectCard key={p.slug} project={p} labels={{ ...labels, barcode: t("projects.barcode", { url: p.url }) }} />
        ))}
        {visible.length === 0 && <p className="empty">{t("projects.empty")}</p>}
      </div>
    </>
  );
}
