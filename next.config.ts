import type { NextConfig } from "next";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { COURSE_AUDIO_ORIGINS, SECURITY_HEADERS } from "./src/lib/security-policy";

// The public offline page is cacheable, so bind its one inline script to its
// exact bytes instead of using a request nonce or permitting arbitrary scripts.
const offlineHtml = readFileSync("public/offline.html", "utf8");
const offlineScriptHashes = [...offlineHtml.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attributes]) => !/\bsrc\s*=/i.test(attributes))
  .map(([, , script]) => `'sha256-${createHash("sha256").update(script).digest("base64")}'`);
const offlineCsp = [
  "default-src 'self'", `script-src 'self' ${offlineScriptHashes.join(" ")}`,
  "script-src-attr 'none'", "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${COURSE_AUDIO_ORIGINS.join(" ")}`,
  `media-src 'self' blob: ${COURSE_AUDIO_ORIGINS.join(" ")}`,
  "img-src 'self' data: blob:", "object-src 'none'", "base-uri 'none'",
  "frame-ancestors 'none'", "form-action 'self'", "worker-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  images: {
    maximumRedirects: 0,
    maximumResponseBody: 5_000_000,
    maximumDiskCacheSize: 500_000_000,
    dangerouslyAllowLocalIP: false,
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mero-mero-app.s3.us-east-1.amazonaws.com",
        pathname: "/word-images/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "nahuatl-language.s3.us-east-1.amazonaws.com",
        pathname: "/itzli-app/images/**",
        search: "",
      },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }] },
      { source: "/offline.html", headers: [{ key: "Content-Security-Policy", value: offlineCsp }] },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
  // The checked course-only file is prepared offline and shipped with releases.
  outputFileTracingIncludes: { "/*": ["./fcn_course_release.sqlite"] },
  outputFileTracingExcludes: {
    "/*": ["./fcn_master_lexicon_phase8_6_primer.sqlite*", "./data/**/*",
      "./secrets/**/*", "./secret/**/*", "./.env*", "./.clerk/**/*", "./.vercel/**/*",
      "./src/data/audio-candidates-v3.json"],
  },
};

export default nextConfig;
