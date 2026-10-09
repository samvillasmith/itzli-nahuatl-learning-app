import type { Metadata } from "next";
import { requireAuth } from "@/lib/require-auth";
import CultureTrack from "./CultureTrack";
import { getRequestLocale } from "@/i18n/server";
import { trChoice } from "@/i18n/translate";
import { createPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return createPageMetadata({
    locale,
    pathname: "/culture",
    title: trChoice(locale, "Nahua Culture & Mexica History", "Cultura nahua e historia mexica"),
    description: trChoice(locale,
      "Explore sourced lessons on Mexica history, Nahua culture, Nahuatl through time, and living Huasteca Nahua communities alongside your language course.",
      "Explora lecciones con fuentes sobre historia mexica, cultura nahua, el náhuatl a través del tiempo y las comunidades nahuas actuales de la Huasteca."),
  });
}

export default async function CulturePage() {
  await requireAuth();
  return <CultureTrack />;
}
