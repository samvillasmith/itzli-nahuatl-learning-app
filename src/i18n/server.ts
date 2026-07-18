import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, type AppLocale } from "./config";

export async function getRequestLocale(): Promise<AppLocale> {
  return normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}
