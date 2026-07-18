import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import {
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
  "/",
  "/terms",
  "/privacy",
  "/eula",
  "/curriculum",
  "/api/webhooks/clerk",
  "/api/cron/purge-chat-audit",
  "/robots.txt",
  "/sitemap.xml",
]);

const LOCALIZED_PAGE_ROOTS = [
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

export default clerkMiddleware(async (auth, req) => {
  const requestedPathname = req.nextUrl.pathname;
  const locale = localeFromPathname(requestedPathname);
  const pathname = stripLocalePrefix(requestedPathname);
  const hasSpanishPrefix = locale === "es";

  if (
    !hasSpanishPrefix &&
    isLocalizedPage(pathname) &&
    req.cookies.get(LOCALE_COOKIE)?.value === "es"
  ) {
    const destination = req.nextUrl.clone();
    destination.pathname = localizedPathname(pathname, "es");
    return NextResponse.redirect(destination);
  }

  if (!isPublicRoute(pathname)) {
    await auth.protect();
  }

  const requestHeaders = localizedRequestHeaders(req, locale, pathname);
  const response = hasSpanishPrefix && isLocalizedPage(pathname)
    ? NextResponse.rewrite(new URL(`${pathname}${req.nextUrl.search}`, req.url), {
        request: { headers: requestHeaders },
      })
    : NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Language", htmlLang(locale));
  if (hasSpanishPrefix) {
    response.cookies.set(LOCALE_COOKIE, "es", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|wav|mp3|ogg|opus|aac|flac|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
