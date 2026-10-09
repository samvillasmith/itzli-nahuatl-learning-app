import type { MetadataRoute } from "next";
import { localizedUrl, PUBLIC_INDEXABLE_PATHS } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_INDEXABLE_PATHS.flatMap((pathname) => {
    const englishUrl = localizedUrl(pathname, "en");
    const spanishUrl = localizedUrl(pathname, "es");
    const isCoursePage = pathname === "/" || pathname === "/curriculum" || pathname === "/source-course";
    const changeFrequency = isCoursePage ? "weekly" : "yearly";
    const priority = pathname === "/" ? 1 : pathname === "/curriculum" ? 0.9 : pathname === "/source-course" ? 0.8 : 0.2;
    const alternates = {
      languages: {
        en: englishUrl,
        es: spanishUrl,
        "x-default": spanishUrl,
      },
    };

    return [
      { url: spanishUrl, changeFrequency, priority, alternates },
      { url: englishUrl, changeFrequency, priority, alternates },
    ];
  });
}
