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
        "/en/culture",
        "/en/grammar",
        "/en/practice",
        "/en/progress",
        "/en/sign-in",
        "/en/sign-up",
        "/en/source-course",
        "/en/tutor",
        "/en/units",
        "/en/vocabulary",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
