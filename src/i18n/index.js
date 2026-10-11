// Server-side i18n registry. Every src/i18n/<code>.json is a locale; the
// default locale comes from src/data/site.json. Nothing here should be
// imported by client islands (it bundles every dictionary) — pass the
// dictionary as a prop and use createT from ./translate.js instead.
import site from "../data/site.json";
import { createT } from "./translate.js";

const modules = import.meta.glob("./*.json", { eager: true, import: "default" });

export const dictionaries = Object.fromEntries(
  Object.entries(modules).map(([path, dict]) => [path.replace(/^\.\/|\.json$/g, ""), dict]),
);

export const defaultLocale = site.defaultLocale;

/** Default locale first, then the rest alphabetically. */
export const locales = Object.keys(dictionaries).sort((a, b) =>
  a === defaultLocale ? -1 : b === defaultLocale ? 1 : a.localeCompare(b),
);

export function getDict(lang) {
  return dictionaries[lang] ?? dictionaries[defaultLocale];
}

export function useTranslations(lang) {
  return createT(getDict(lang), dictionaries[defaultLocale]);
}

/** `[...lang]` route param → locale code (undefined = default locale at root). */
export function langFromParam(param) {
  return param && locales.includes(param) ? param : defaultLocale;
}

/** getStaticPaths entries for the `[...lang]` segment. */
export function localeParams() {
  return locales.map((lang) => ({ params: { lang: lang === defaultLocale ? undefined : lang }, props: { lang } }));
}

/** Locale-aware internal path. `path` is root-relative, e.g. "/projects/". */
export function localePath(lang, path = "/") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return lang === defaultLocale ? clean : `/${lang}${clean}`;
}

/** Strip the locale prefix from a pathname: "/en/projects/" → "/projects/". */
export function stripLocale(pathname) {
  const [, first, ...rest] = pathname.split("/");
  if (locales.includes(first) && first !== defaultLocale) return `/${rest.join("/")}`;
  return pathname;
}

/** Absolute canonical URL for a root-relative path in a locale. */
export function absoluteUrl(lang, path) {
  return new URL(localePath(lang, path).replace(/^\//, ""), site.baseUrl).href;
}

const localeSuffix = new RegExp(`_(${locales.join("|")})$`);

/**
 * Resolve translatable content: for every field `x`, use `x_<lang>` when it
 * exists, else `x`. Locale-suffixed siblings are dropped. Recurses into
 * arrays and objects, so nested entries (milestones, highlights…) follow the
 * same rule.
 */
export function localize(value, lang) {
  if (Array.isArray(value)) return value.map((v) => localize(v, lang));
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const key of Object.keys(value)) {
    if (localeSuffix.test(key) || key.startsWith("_")) continue;
    const translated = lang !== defaultLocale ? value[`${key}_${lang}`] : undefined;
    out[key] = localize(translated ?? value[key], lang);
  }
  return out;
}
