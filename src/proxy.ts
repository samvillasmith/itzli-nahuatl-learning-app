import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { isLocalReviewMode } from "@/lib/local-review";
import { PUBLIC_INDEXABLE_PATHS } from "@/lib/seo";
import { clerkAuthorizedParties, clerkContentSecurityPolicy } from "@/lib/security-policy";
import {
  ENGLISH_PATH_PREFIX,
  LEGACY_SPANISH_PATH_PREFIX,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  PATHNAME_HEADER,
  htmlLang,
  localeFromPathname,
  localizedPathname,
  stripLocalePrefix,
  type AppLocale,
} from "@/i18n/config";

const PUBLIC_ROUTES = new Set([
  ...PUBLIC_INDEXABLE_PATHS,
  // The report handler keeps POST authentication; only delivery status is public.
  "/api/content-reports",
  "/api/webhooks/clerk",
  "/api/cron/purge-chat-audit",
  "/robots.txt",
  "/sitemap.xml",
  "/third-party-notices.txt",
  "/offline.html",
  "/offline-audio.js",
  "/nahuatl-orthography.js",
  "/nahuatl-orthography.d.ts",
  "/generated-course-audio.json",
  "/audio-v3/audio-notices.json",
  "/sw.js",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/itzli-learn-nahuatl.png",
  "/itzli-learn-nahuatl.svg",
  "/culture/nahua-sun-warrior-altar.jpg",
  "/culture/mexica-coiled-serpent.jpg",
  "/file.svg",
  "/globe.svg",
  "/window.svg",
  "/next.svg",
  "/vercel.svg",
]);

const LOCALIZED_PAGE_ROOTS = [
  "/learn",
  "/conversations",
  "/sentences",
  "/review",
  "/listening",
  "/more-words",
  "/expansion",
  "/culture",
  "/curriculum",
  "/design-preview",
  "/eula",
  "/grammar",
  "/practice",
  "/privacy",
  "/progress",
  "/sign-in",
  "/sign-up",
  "/source-course",
  "/terms",
  "/tutor",
  "/units",
  "/vocabulary",
];

function isPublicRoute(pathname: string) {
  return (
    (process.env.NODE_ENV === "development" && pathname === "/design-preview") ||
    PUBLIC_ROUTES.has(pathname) ||
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/") ||
    pathname === "/sign-up" ||
    pathname.startsWith("/sign-up/")
  );
}

function isLocalizedPage(pathname: string) {
  // Public static assets underneath a page prefix do not carry a display locale.
  if (PUBLIC_ROUTES.has(pathname) && /\.[a-z0-9]+$/i.test(pathname)) return false;
  return (
    pathname === "/" ||
    LOCALIZED_PAGE_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`))
  );
}

function localizedRequestHeaders(req: NextRequest, locale: AppLocale, pathname: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  requestHeaders.set(PATHNAME_HEADER, pathname);
  return requestHeaders;
}

async function handleRequest(req: NextRequest, protect?: (options?: { unauthenticatedUrl: string }) => Promise<unknown>) {
  const requestedPathname = req.nextUrl.pathname;
  // Locale comes from the URL, not a caller-supplied internal request header.
  const locale = localeFromPathname(requestedPathname);
  const pathname = stripLocalePrefix(requestedPathname);
  const hasEnglishPrefix =
    requestedPathname === ENGLISH_PATH_PREFIX ||
    requestedPathname.startsWith(`${ENGLISH_PATH_PREFIX}/`);
  const hasLegacySpanishPrefix =
    requestedPathname === LEGACY_SPANISH_PATH_PREFIX ||
    requestedPathname.startsWith(`${LEGACY_SPANISH_PATH_PREFIX}/`);

  if (hasLegacySpanishPrefix && isLocalizedPage(pathname)) {
    const destination = req.nextUrl.clone();
    destination.pathname = localizedPathname(pathname, "es");
    const response = NextResponse.redirect(destination, 308);
    response.cookies.set(LOCALE_COOKIE, "es", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
    });
    return response;
  }

  if (
    !hasEnglishPrefix &&
    isLocalizedPage(pathname) &&
    req.cookies.get(LOCALE_COOKIE)?.value === "en"
  ) {
    const destination = req.nextUrl.clone();
    destination.pathname = localizedPathname(pathname, "en");
    return NextResponse.redirect(destination);
  }

  if (protect && !isPublicRoute(pathname)) {
    if (isLocalizedPage(pathname)) {
      const signInUrl = new URL(localizedPathname("/sign-in", locale), req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      await protect({ unauthenticatedUrl: signInUrl.toString() });
    } else {
      await protect();
    }
  }

  const requestHeaders = localizedRequestHeaders(req, locale, pathname);
  const response = hasEnglishPrefix && isLocalizedPage(pathname)
    ? NextResponse.rewrite(new URL(`${pathname}${req.nextUrl.search}`, req.url), {
        request: { headers: requestHeaders },
      })
    : NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Language", htmlLang(locale));
  if (isLocalizedPage(pathname)) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
    });
  }
  return response;
}

const authenticatedProxy = clerkMiddleware(
  async (auth, req) => handleRequest(req, (options) => auth.protect(options)),
  req => ({
    authorizedParties: clerkAuthorizedParties(),
    // Cacheable standalone offline HTML uses exact script hashes from config.
    ...(req.nextUrl.pathname !== "/offline.html" ? {
      contentSecurityPolicy: clerkContentSecurityPolicy(req.nextUrl.protocol === "https:"),
    } : {}),
  }),
);
export default function proxy(req: NextRequest, event: Parameters<typeof authenticatedProxy>[1]) {
  return isLocalReviewMode() ? handleRequest(req) : authenticatedProxy(req, event);
}

export const config = {
  matcher: [
    // Match dynamic paths regardless of a suffix. Only framework asset trees
    // are excluded; explicit public assets above remain reachable anonymously.
    "/((?!_next/static(?:/|$)|_next/image(?:/|$)).*)",
    "/(api|trpc)(.*)",
  ],
};
