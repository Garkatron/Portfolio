// Server-side data access: JSON files in src/data → localized, view-ready objects.
// Pages read content only through here, so content edits never touch .astro/.jsx.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getCollection } from "astro:content";

import siteData from "../data/site.json";
import projectsData from "../data/projects.json";
import booksData from "../data/books.json";
import roadmapData from "../data/roadmap.json";
import experienceData from "../data/experience.json";
import toolsData from "../data/tools.json";
import playlistData from "../data/playlist.json";
import { techIcons } from "../data/techIcons.js";
import { absoluteUrl, defaultLocale, localePath, localize } from "../i18n/index.js";
import { code128Svg } from "./barcode.js";
import { fetchPreviewUrl } from "./spotify.js";

export const BOOK_STATUSES = ["reading", "to-read"];

export function getSite(lang) {
  return localize(siteData, lang);
}

/** Local images must exist under public/ (missing ones fall back to the striped placeholder); remote URLs pass through. */
function resolveImage(src) {
  if (!src) return null;
  if (/^https?:\/\//.test(src)) return src;
  return existsSync(join(process.cwd(), "public", src)) ? src : null;
}

function byOrder(a, b) {
  const oa = a.order ?? Infinity;
  const ob = b.order ?? Infinity;
  return oa !== ob ? oa - ob : String(b.year).localeCompare(String(a.year));
}

export function getProjects(lang) {
  return [...projectsData].sort(byOrder).map((raw) => {
    const p = localize(raw, lang);
    const path = `/projects/${p.slug}/`;
    // Barcode encodes the canonical URL without the trailing slash to keep it short.
    const url = absoluteUrl(lang, path).replace(/\/$/, "");
    return {
      ...p,
      tags: p.tags ?? [],
      tech: p.tech ?? [],
      links: { repo: p.links?.repo || "", live: p.links?.live || "" },
      image: resolveImage(p.image),
      screenshots: (p.screenshots ?? []).map(resolveImage).filter(Boolean),
      href: localePath(lang, path),
      url,
      barcode: code128Svg(url),
    };
  });
}

export function getFeaturedProjects(lang, limit = 4) {
  const all = getProjects(lang);
  const featured = all.filter((p) => p.featured);
  return (featured.length ? featured : all).slice(0, limit);
}

export function getBooks(lang) {
  const books = localize(booksData, lang);
  return Object.fromEntries(BOOK_STATUSES.map((s) => [s, books.filter((b) => b.status === s)]));
}

export function getRoadmap(lang) {
  const r = localize(roadmapData, lang);
  const text = (entry) => (typeof entry === "string" ? entry : entry.text);
  return {
    milestones: (r.milestones ?? []).map((m) => ({ year: m.year, text: text(m) })),
    targetProfile: (r.targetProfile ?? []).map(text),
  };
}

export function getExperience(lang) {
  return localize(experienceData, lang);
}

export function getToolGroups(lang) {
  return localize(toolsData, lang).groups.map((g) => ({
    ...g,
    tools: g.tools.map((tool) => ({ ...tool, icon: techIcons[tool.icon]?.src ?? null })),
  }));
}

export async function getPlaylist() {
  const playlist = localize(playlistData, defaultLocale);
  const previews = await Promise.all(playlist.tracks.map((tr) => fetchPreviewUrl(tr.spotifyId)));
  return {
    ...playlist,
    tracks: playlist.tracks.map((tr, i) => ({
      ...tr,
      previewUrl: previews[i],
      spotifyUrl: tr.spotifyId ? `https://open.spotify.com/track/${tr.spotifyId}` : null,
    })),
  };
}

/**
 * Blog posts live in src/data/blog/<lang>/<slug>.md. A locale without its own
 * copy of a post falls back to the default-locale version (`fallback: true`).
 */
export async function getPosts(lang) {
  const entries = await getCollection("blog", (e) => !e.data.draft);
  const bySlug = new Map();
  for (const entry of entries) {
    const [entryLang, ...rest] = entry.id.split("/");
    const slug = rest.join("/");
    if (entryLang !== lang && entryLang !== defaultLocale) continue;
    const existing = bySlug.get(slug);
    if (existing && entryLang !== lang) continue;
    bySlug.set(slug, { slug, entry, fallback: entryLang !== lang });
  }
  return [...bySlug.values()]
    .map((p) => ({ ...p, ...p.entry.data, href: localePath(lang, `/blog/${p.slug}/`) }))
    .sort((a, b) => b.date - a.date);
}
