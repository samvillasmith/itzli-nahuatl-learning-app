import { requireAuth } from "@/lib/require-auth";
import { redirect } from "next/navigation";
import { localizedPathname } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/server";

export default async function Page() {
  await requireAuth();
  redirect(localizedPathname("/vocabulary", await getRequestLocale()));
}
