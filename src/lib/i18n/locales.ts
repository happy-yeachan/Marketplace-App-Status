// Languages prioritised by Atlassian-ecosystem density:
//   en — global default
//   ja — Atlassian Tokyo office, large enterprise market
//   de — DACH is one of Atlassian's biggest markets (Resolution, Decadis,
//        Seibert Media, Communardo etc. are all German-speaking vendors)
//   ko — significant ASP presence (OSCI, Curvc), our own market
//   fr — Valiantys / Elements home market
export const LOCALES = ["en", "ja", "de", "ko", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "preferred-locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  de: "Deutsch",
  ko: "한국어",
  fr: "Français",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇺🇸",
  ja: "🇯🇵",
  de: "🇩🇪",
  ko: "🇰🇷",
  fr: "🇫🇷",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Pick the best locale from a navigator.languages array.
 * Falls back to DEFAULT_LOCALE if no match found.
 */
export function detectLocale(candidates: readonly string[]): Locale {
  for (const tag of candidates) {
    const lang = tag.toLowerCase().split("-")[0];
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}
