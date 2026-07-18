import spanishUiCatalog from "./es.ui.generated.json";
import spanishOverrides from "./es.overrides.json";
import type { AppLocale } from "./config";
import { shouldPreserveDataKey } from "./data-keys";

const ES_UI = spanishUiCatalog as Record<string, string>;
const ES_OVERRIDES = spanishOverrides as Record<string, string>;

export function trClient(locale: AppLocale, english: string): string {
  return locale === "es" ? ES_OVERRIDES[english] ?? ES_UI[english] ?? english : english;
}

export function translateDeepClient<T>(locale: AppLocale, value: T): T {
  if (locale === "en") return value;
  if (typeof value === "string") return trClient(locale, value) as T;
  if (Array.isArray(value)) return value.map((item) => translateDeepClient(locale, item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        shouldPreserveDataKey(key) ? item : translateDeepClient(locale, item),
      ]),
    ) as T;
  }
  return value;
}
