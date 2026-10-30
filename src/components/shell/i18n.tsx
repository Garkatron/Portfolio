import { createContext } from "preact";
import type { ComponentChildren } from "preact";
import { useContext, useMemo } from "preact/hooks";
import { createT } from "../../i18n/translate.js";

export type Dict = Record<string, any>;

export interface I18nValue {
  lang: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

interface I18nProviderProps {
  lang: string;
  dict: Dict;
  fallback: Dict;
  children: ComponentChildren;
}

/** Islands receive the active dictionary (+ default-locale fallback) as props. */
export function I18nProvider({ lang, dict, fallback, children }: I18nProviderProps) {
  const value = useMemo<I18nValue>(
    () => ({ lang, t: createT(dict, fallback) }),
    [lang, dict, fallback],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
