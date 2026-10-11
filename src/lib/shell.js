// Builds the serializable props for the <Shell> island: nav, tabs, routes,
// locale alternates, sidebar data and the active dictionary.
import { defaultLocale, getDict, locales, localePath, stripLocale } from "../i18n/index.js";
import { getPlaylist, getProjects, getSite, getToolGroups } from "./content.js";

/** Nav entries in Explorer order: id → [dictionary file key, root-relative href]. */
const NAV = [
  ["about", "/"],
  ["projects", "/projects/"],
  ["books", "/books/"],
  ["roadmap", "/#roadmap"],
  ["blog", "/blog/"],
  ["contact", "/contact/"],
];

export function getRoutes(lang) {
  const r = Object.fromEntries(NAV.map(([id, href]) => [id, localePath(lang, href)]));
  return { ...r, home: r.about };
}

/**
 * @param {object} opts
 * @param {string} opts.lang
 * @param {string} opts.page      nav id highlighted in the Explorer
 * @param {string} opts.pathname  Astro.url.pathname
 * @param {string} [opts.path]    file path shown in the titlebar
 * @param {{file: string, href: string, active?: boolean}[]} [opts.tabs]
 */
export function buildShell({ lang, page, pathname, path, tabs }) {
  const dict = getDict(lang);
  const files = dict.files;
  const routes = getRoutes(lang);
  const site = getSite(lang);
  const bare = stripLocale(pathname);

  const nav = NAV.map(([id]) => ({ id, file: files[id], href: routes[id], active: id === page }));
  const activeFile = files[page];

  return {
    lang,
    dict,
    fallbackDict: getDict(defaultLocale),
    files,
    routes,
    path: path ?? activeFile,
    nav,
    tabs: tabs ?? [{ file: activeFile, href: routes[page], active: true }],
    locales: locales.map((code) => ({
      code,
      name: getDict(code)._meta.name,
      short: getDict(code)._meta.short,
      href: localePath(code, bare),
    })),
    site: {
      name: site.name,
      status: site.status,
      openToWork: site.openToWork,
      codingSince: site.codingSince,
    },
    toolGroups: getToolGroups(lang),
    playlist: getPlaylist(),
    projectCount: getProjects(lang).length,
  };
}
