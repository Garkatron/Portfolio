// Sys.log store: a small session-persisted activity log shared by every island.
// Entries store a vocabulary `type` (translated at render time via syslog.<type>)
// plus an optional untranslated `arg`, so switching language re-labels history.

const KEY = "garkatron:syslog";
const EVENT = "garkatron:syslog";
const MAX = 40;

function storage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readLog() {
  try {
    return JSON.parse(storage()?.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function log(type, arg) {
  if (typeof window === "undefined") return;
  const next = [...readLog(), { type, arg, t: Date.now() }].slice(-MAX);
  storage()?.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Seed the boot sequence once per session. */
export function boot(projectCount) {
  if (readLog().length) return;
  log("boot");
  log("mounted", projectCount);
  log("coffee");
}

export function subscribe(fn) {
  const onStorage = (e) => e.key === KEY && fn();
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", onStorage);
  };
}
