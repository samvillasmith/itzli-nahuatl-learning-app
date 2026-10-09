import type { MetadataRoute } from "next";
import { localizedPathname } from "@/i18n/config";
import { SITE_URL } from "@/lib/seo";

const PRIVATE_PAGE_ROOTS = [
  "/learn",
  "/conversations",
  "/sentences",
  "/review",
  "/listening",
  "/more-words",
  "/expansion",
  "/culture",
  "/design-preview",
  "/grammar",
  "/practice",
  "/progress",
  "/sign-in",
  "/sign-up",
  "/tutor",
  "/units",
  "/vocabulary",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        ...PRIVATE_PAGE_ROOTS.flatMap((pathname) => [
          localizedPathname(pathname, "es"),
          localizedPathname(pathname, "en"),
        ]),
        // The sources overview is public; individual source lessons need an account.
        "/source-course/",
        "/en/source-course/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
