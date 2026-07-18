import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en } from "./locales/en";
import { de } from "./locales/de";
import type { DashboardType } from "./api";

/** The languages the UI ships. Add a locale file and an entry here to grow it. */
export const LANGUAGES = ["en", "de"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Native display names for the switcher. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  de: "Deutsch",
};

/** Every translatable key. `en` is the source of truth for the shape; `de` must
 * match it (enforced by the `Record<TKey, string>` type on the dictionary). */
export type TKey = keyof typeof en;

const DICTS: Record<Language, Record<TKey, string>> = { en, de };

const STORAGE_KEY = "wframe.lang";

function isLanguage(v: string | null): v is Language {
  return v !== null && (LANGUAGES as readonly string[]).includes(v);
}

/** Initial language: a previously saved choice, else the browser's preferred
 * language if we ship it, else English. */
function detectLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isLanguage(saved)) return saved;
  const nav = navigator.language.slice(0, 2).toLowerCase();
  if (isLanguage(nav)) return nav;
  return "en";
}

/** Fill `{name}`-style placeholders in a template. */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  );
}

interface I18nValue {
  lang: Language;
  setLang: (lang: Language) => void;
  /** Translate a key, interpolating `{placeholders}`. Falls back to English,
   * then to the key itself, so a missing string is visible but never crashes. */
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  /** Localized store title/description for a built-in dashboard type. The store
   * catalog is defined on the backend in English; we translate it client-side by
   * type so the store reads in the chosen language too. */
  storeTitle: (type: DashboardType, fallback: string) => string;
  storeDescription: (type: DashboardType, fallback: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(detectLanguage);

  const setLang = useCallback((next: Language) => {
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
    setLangState(next);
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = DICTS[lang];
    const t = (key: TKey, vars?: Record<string, string | number>): string =>
      interpolate(dict[key] ?? en[key] ?? key, vars);
    const storeTitle = (type: DashboardType, fallback: string): string => {
      const key = `store.${type}.title` as TKey;
      return key in dict ? dict[key] : fallback;
    };
    const storeDescription = (type: DashboardType, fallback: string): string => {
      const key = `store.${type}.description` as TKey;
      return key in dict ? dict[key] : fallback;
    };
    return { lang, setLang, t, storeTitle, storeDescription };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within a LanguageProvider");
  return ctx;
}

/** Shorthand for the common case: just the translator function. */
export function useT(): I18nValue["t"] {
  return useI18n().t;
}
