import type { MetadataRoute } from "next";

const SITE_URL = "https://www.itzli.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/culture",
        "/grammar",
        "/practice",
        "/progress",
        "/sign-in",
        "/sign-up",
        "/source-course",
        "/tutor",
        "/units",
        "/vocabulary",
        "/es/culture",
        "/es/grammar",
        "/es/practice",
        "/es/progress",
        "/es/sign-in",
        "/es/sign-up",
        "/es/source-course",
        "/es/tutor",
        "/es/units",
        "/es/vocabulary",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
