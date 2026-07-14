import { clerkMiddleware } from "@clerk/nextjs/server";

const PUBLIC_ROUTES = new Set([
  "/",
  "/terms",
  "/privacy",
  "/eula",
  "/curriculum",
  "/api/webhooks/clerk",
  "/api/cron/purge-chat-audit",
]);

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_ROUTES.has(pathname) ||
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/") ||
    pathname === "/sign-up" ||
    pathname.startsWith("/sign-up/")
  );
}

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req.nextUrl.pathname)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|wav|mp3|ogg|opus|aac|flac|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
