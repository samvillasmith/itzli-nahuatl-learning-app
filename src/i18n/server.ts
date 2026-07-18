import "server-only";
import { cookies, headers } from "next/headers";
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  PATHNAME_HEADER,
  normalizeLocale,
  stripLocalePrefix,
  type AppLocale,
} from "./config";

export async function getRequestLocale(): Promise<AppLocale> {
  const requestLocale = (await headers()).get(LOCALE_HEADER);
  if (requestLocale) return normalizeLocale(requestLocale);
  return normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getRequestPathname(): Promise<string> {
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? "/";
  return stripLocalePrefix(pathname);
}
