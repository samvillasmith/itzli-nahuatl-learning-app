import spanishCatalog from "./es.generated.json";
import spanishOverrides from "./es.overrides.json";
import type { AppLocale } from "./config";
import { shouldPreserveDataKey } from "./data-keys";

const ES = spanishCatalog as Record<string, string>;
const ES_OVERRIDES = spanishOverrides as Record<string, string>;

export function tr(locale: AppLocale, english: string): string {
  return locale === "es" ? ES_OVERRIDES[english] ?? ES[english] ?? english : english;
}

export function trChoice(locale: AppLocale, english: string, spanish: string): string {
  return locale === "es" ? spanish : english;
}

export function trCount(
  locale: AppLocale,
  count: number,
  englishSingular: string,
  englishPlural: string,
  spanishSingular: string,
  spanishPlural: string,
): string {
  const label = locale === "es"
    ? count === 1 ? spanishSingular : spanishPlural
    : count === 1 ? englishSingular : englishPlural;
  return `${count.toLocaleString(locale === "es" ? "es-MX" : "en-US")} ${label}`;
}

export function translateDeep<T>(locale: AppLocale, value: T): T {
  if (locale === "en") return value;
  if (typeof value === "string") return tr(locale, value) as T;
  if (Array.isArray(value)) return value.map((item) => translateDeep(locale, item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        shouldPreserveDataKey(key) ? item : translateDeep(locale, item),
      ]),
    ) as T;
  }
  return value;
}
