export const APP_LOCALES = ["en", "es"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE = "itzli_locale";
export const LOCALE_HEADER = "x-itzli-locale";
export const PATHNAME_HEADER = "x-itzli-pathname";
export const SPANISH_PATH_PREFIX = "/es";

export function normalizeLocale(value: string | null | undefined): AppLocale {
  return value?.toLowerCase().startsWith("es") ? "es" : DEFAULT_LOCALE;
}

export function htmlLang(locale: AppLocale): "en-US" | "es-MX" {
  return locale === "es" ? "es-MX" : "en-US";
}

export function localeFromPathname(pathname: string): AppLocale {
  return pathname === SPANISH_PATH_PREFIX || pathname.startsWith(`${SPANISH_PATH_PREFIX}/`)
    ? "es"
    : "en";
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === SPANISH_PATH_PREFIX) return "/";
  if (pathname.startsWith(`${SPANISH_PATH_PREFIX}/`)) {
    return pathname.slice(SPANISH_PATH_PREFIX.length) || "/";
  }
  return pathname || "/";
}

export function localizedPathname(pathname: string, locale: AppLocale): string {
  const basePath = stripLocalePrefix(pathname);
  if (locale === "en") return basePath;
  return basePath === "/" ? SPANISH_PATH_PREFIX : `${SPANISH_PATH_PREFIX}${basePath}`;
}
