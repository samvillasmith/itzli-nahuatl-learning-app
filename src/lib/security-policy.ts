/** Public delivery origins only; never derive an allowlist from request headers. */
export const COURSE_IMAGE_ORIGINS = [
  "https://nahuatl-language.s3.us-east-1.amazonaws.com",
  "https://mero-mero-app.s3.us-east-1.amazonaws.com",
];
export const COURSE_AUDIO_ORIGINS = [
  "https://nahuatl-language.s3.us-east-1.amazonaws.com",
  "https://tlahtolli.coerll.utexas.edu",
];

export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), microphone=(self)" },
];

/** Clerk creates and forwards a fresh nonce, including for Next's own scripts. */
export function clerkContentSecurityPolicy(https: boolean) {
  return {
    strict: true,
    directives: {
      "base-uri": ["'none'"],
      "object-src": ["'none'"],
      "frame-ancestors": ["'none'"],
      "script-src-attr": ["'none'"],
      "img-src": [...COURSE_IMAGE_ORIGINS, "data:", "blob:"],
      "connect-src": [...COURSE_AUDIO_ORIGINS],
      "media-src": ["'self'", "blob:", ...COURSE_AUDIO_ORIGINS],
      "font-src": ["'self'", "data:"],
      ...(https ? { "upgrade-insecure-requests": [] } : {}),
    },
  };
}

export function clerkAuthorizedParties(): string[] {
  const origins = ["https://www.itzli.app", "https://itzli.app"];
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000", "http://127.0.0.1:3000");
  }
  // Deployment previews need their own exact origin, never a client-supplied Host.
  if (process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "production") {
    const hostname = process.env.VERCEL_URL;
    if (hostname && /^[a-z0-9-]+\.vercel\.app$/i.test(hostname)) origins.push(`https://${hostname.toLowerCase()}`);
  }
  return origins;
}
