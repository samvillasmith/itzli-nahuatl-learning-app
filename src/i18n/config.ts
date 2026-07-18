export const APP_LOCALES = ["en", "es"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE = "itzli_locale";

export function normalizeLocale(value: string | null | undefined): AppLocale {
  return value?.toLowerCase().startsWith("es") ? "es" : DEFAULT_LOCALE;
}

export function htmlLang(locale: AppLocale): "en-US" | "es-MX" {
  return locale === "es" ? "es-MX" : "en-US";
}
