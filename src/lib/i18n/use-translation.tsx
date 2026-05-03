"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  detectLocale,
  isLocale,
  type Locale,
} from "./locales";
import { TRANSLATIONS } from "./translations";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// Keep an in-memory mirror of the chosen locale. localStorage is the source of
// truth; this mirror is only here to keep getSnapshot stable between renders
// (returning a freshly-derived value would trigger React's tear warning).
let cachedLocale: Locale | null = null;

function readLocaleFromStorage(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw && isLocale(raw)) return raw;
  } catch { /* ignore */ }
  return detectLocale(navigator.languages ?? [navigator.language ?? ""]);
}

function getLocaleSnapshot(): Locale {
  if (cachedLocale === null) cachedLocale = readLocaleFromStorage();
  return cachedLocale;
}

function getLocaleServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

const localeListeners = new Set<() => void>();

function subscribeLocale(notify: () => void): () => void {
  localeListeners.add(notify);
  // Also pick up changes made by other tabs.
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCALE_STORAGE_KEY) {
      cachedLocale = null;
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    localeListeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

function writeLocale(locale: Locale): void {
  cachedLocale = locale;
  try { localStorage.setItem(LOCALE_STORAGE_KEY, locale); } catch { /* ignore */ }
  document.documentElement.lang = locale;
  localeListeners.forEach((fn) => fn());
}

function substitute(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getLocaleServerSnapshot);

  const setLocale = useCallback((l: Locale) => writeLocale(l), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = TRANSLATIONS[locale];
      const template = dict[key] ?? TRANSLATIONS[DEFAULT_LOCALE][key] ?? key;
      return substitute(template, vars);
    },
    [locale],
  );

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useTranslation must be used inside <LocaleProvider>");
  }
  return ctx;
}
