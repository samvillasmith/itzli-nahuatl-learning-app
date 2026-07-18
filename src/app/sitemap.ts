import type { MetadataRoute } from "next";
import { localizedPathname, type AppLocale } from "@/i18n/config";

const SITE_URL = "https://www.itzli.app";

const PUBLIC_PAGES = [
  { pathname: "/", changeFrequency: "weekly", priority: 1 },
  { pathname: "/curriculum", changeFrequency: "weekly", priority: 0.9 },
  { pathname: "/terms", changeFrequency: "yearly", priority: 0.2 },
  { pathname: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { pathname: "/eula", changeFrequency: "yearly", priority: 0.2 },
] as const;

function absoluteUrl(pathname: string, locale: AppLocale): string {
  return new URL(localizedPathname(pathname, locale), SITE_URL).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.flatMap(({ pathname, changeFrequency, priority }) => {
    const englishUrl = absoluteUrl(pathname, "en");
    const spanishUrl = absoluteUrl(pathname, "es");
    const alternates = {
      languages: {
        "en-US": englishUrl,
        "es-MX": spanishUrl,
        "x-default": englishUrl,
      },
    };

    return [
      { url: englishUrl, changeFrequency, priority, alternates },
      { url: spanishUrl, changeFrequency, priority, alternates },
    ];
  });
}
