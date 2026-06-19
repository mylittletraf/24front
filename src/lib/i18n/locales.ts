// Content languages — must match the backend SUPPORTED_LANGUAGES.
export const LOCALES = ["en", "ru", "es", "fr", "de", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = (process.env.NEXT_PUBLIC_DEFAULT_LANG as Locale) || "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

// Languages we ship UI translations for; others fall back to these for UI strings only
// (content still comes back from the API in the selected language).
export const UI_LOCALES = ["en", "ru"] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Map any content locale to a locale we have message files for (fallback: en). */
export function uiLocale(locale: Locale): UiLocale {
  return (UI_LOCALES as readonly string[]).includes(locale) ? (locale as UiLocale) : "en";
}

/** Resolve a `?lang` value (or anything) to a supported locale, falling back to default. */
export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Pick the first supported locale from an Accept-Language header. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return null;
}
