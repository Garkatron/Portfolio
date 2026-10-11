// Isomorphic helpers: safe to import from React islands (no dictionary imports).

function lookup(dict, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/**
 * Build a `t(key, vars)` function over a dictionary, falling back to
 * `fallback` (the default locale) and finally to the key itself.
 */
export function createT(dict, fallback = {}) {
  return function t(key, vars) {
    const value = lookup(dict, key) ?? lookup(fallback, key);
    return typeof value === "string" ? interpolate(value, vars) : key;
  };
}
