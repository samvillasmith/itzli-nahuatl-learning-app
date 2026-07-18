import type { Metadata } from "next";
import { requireAuth } from "@/lib/require-auth";
import CultureTrack from "./CultureTrack";
import { getRequestLocale } from "@/i18n/server";
import { tr } from "@/i18n/translate";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: tr(locale, "Nahua Culture and History"),
    description: tr(locale, "A sourced companion track on Mexica history, the wider Nahua world, Nahuatl through time, and living Huasteca Nahua communities."),
  };
}

export default async function CulturePage() {
  await requireAuth();
  return <CultureTrack />;
}
