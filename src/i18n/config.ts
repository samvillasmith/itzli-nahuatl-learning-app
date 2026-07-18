export const APP_LOCALES = ["en", "es"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "es";
export const LOCALE_COOKIE = "itzli_locale";
export const LOCALE_HEADER = "x-itzli-locale";
export const PATHNAME_HEADER = "x-itzli-pathname";
export const ENGLISH_PATH_PREFIX = "/en";
export const LEGACY_SPANISH_PATH_PREFIX = "/es";

export function normalizeLocale(value: string | null | undefined): AppLocale {
  const normalized = value?.toLowerCase();
  if (normalized?.startsWith("en")) return "en";
  if (normalized?.startsWith("es")) return "es";
  return DEFAULT_LOCALE;
}

export function htmlLang(locale: AppLocale): "en-US" | "es-MX" {
  return locale === "es" ? "es-MX" : "en-US";
}

export function localeFromPathname(pathname: string): AppLocale {
  return pathname === ENGLISH_PATH_PREFIX || pathname.startsWith(`${ENGLISH_PATH_PREFIX}/`)
    ? "en"
    : "es";
}

export function stripLocalePrefix(pathname: string): string {
  for (const prefix of [ENGLISH_PATH_PREFIX, LEGACY_SPANISH_PATH_PREFIX]) {
    if (pathname === prefix) return "/";
    if (pathname.startsWith(`${prefix}/`)) {
      return pathname.slice(prefix.length) || "/";
    }
  }
  return pathname || "/";
}

export function localizedPathname(pathname: string, locale: AppLocale): string {
  const basePath = stripLocalePrefix(pathname);
  if (locale === "es") return basePath;
  return basePath === "/" ? ENGLISH_PATH_PREFIX : `${ENGLISH_PATH_PREFIX}${basePath}`;
}
