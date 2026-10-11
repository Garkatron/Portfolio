import { createContext, useContext, useMemo } from "react";
import { createT } from "../../i18n/translate.js";

const I18nContext = createContext(null);

/** Islands receive the active dictionary (+ default-locale fallback) as props. */
export function I18nProvider({ lang, dict, fallback, children }) {
  const value = useMemo(() => ({ lang, t: createT(dict, fallback) }), [lang, dict, fallback]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
