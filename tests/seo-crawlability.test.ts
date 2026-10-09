import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { localizedUrl, PUBLIC_INDEXABLE_PATHS, SITE_URL } from "@/lib/seo";

const state = vi.hoisted(() => ({ protect: vi.fn(async () => undefined) }));

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (callback: (auth: { protect: typeof state.protect }, request: NextRequest) => Promise<Response>) =>
    (request: NextRequest) => callback({ protect: state.protect }, request),
}));
vi.mock("@/lib/local-review", () => ({ isLocalReviewMode: () => false }));

import proxy from "@/proxy";

beforeEach(() => { state.protect.mockClear(); });

describe("public search discovery", () => {
  it("lists each public canonical page in both languages with reciprocal alternates", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(PUBLIC_INDEXABLE_PATHS.length * 2);
    expect(new Set(entries.map(entry => entry.url)).size).toBe(entries.length);
    for (const pathname of PUBLIC_INDEXABLE_PATHS) {
      const spanish = localizedUrl(pathname, "es");
      const english = localizedUrl(pathname, "en");
      for (const url of [spanish, english]) {
        expect(entries.find(entry => entry.url === url)?.alternates?.languages).toEqual({
          en: english,
          es: spanish,
          "x-default": spanish,
        });
      }
    }
    expect(entries.some(entry => entry.url === `${SITE_URL}/source-course`)).toBe(true);
    expect(entries.some(entry => entry.url === `${SITE_URL}/en/source-course`)).toBe(true);
    expect(entries.some(entry => /\/(?:units|source-course)\/\d+/.test(entry.url))).toBe(false);
  });

  it("lets crawlers reach public overviews while excluding gated lessons and account pages", () => {
    const policy = robots();
    expect(policy.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    const rule = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    expect(rule.userAgent).toBe("*");
    expect(rule.allow).toBe("/");
    const disallowed = rule.disallow as string[];
    for (const pathname of PUBLIC_INDEXABLE_PATHS) {
      for (const language of ["en", "es"] as const) {
        const path = new URL(localizedUrl(pathname, language)).pathname;
        expect(disallowed.some(prefix => path.startsWith(prefix)), path).toBe(false);
      }
    }
    for (const pathname of ["/units/1", "/source-course/1", "/learn", "/conversations", "/sentences", "/review", "/listening", "/more-words", "/expansion", "/culture", "/design-preview", "/grammar", "/practice", "/progress", "/sign-in", "/sign-up", "/tutor", "/vocabulary"]) {
      for (const language of ["en", "es"] as const) {
        const path = new URL(localizedUrl(pathname, language)).pathname;
        expect(disallowed.some(prefix => path.startsWith(prefix)), path).toBe(true);
      }
    }
    expect(disallowed).toContain("/api/");
  });

  it.each(["Mozilla/5.0", "Googlebot/2.1"])("opens the sources overview for %s without authentication", async userAgent => {
    for (const path of ["/source-course", "/en/source-course"]) {
      const response = await proxy(new NextRequest(`${SITE_URL}${path}`, { headers: { "user-agent": userAgent } }), {} as NextFetchEvent);
      if (!response) throw new Error("The public route must return a response.");
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      expect(state.protect).not.toHaveBeenCalled();
      if (path.startsWith("/en/")) {
        expect(response.headers.get("x-middleware-rewrite")).toBe(`${SITE_URL}/source-course`);
        expect(response.headers.get("x-middleware-request-x-itzli-locale")).toBe("en");
      }
    }
  });

  it.each(["/source-course/1", "/en/source-course/1", "/units/1", "/en/units/1", "/source-course-other"])("keeps %s behind authentication", async path => {
    await proxy(new NextRequest(`${SITE_URL}${path}`), {} as NextFetchEvent);
    expect(state.protect).toHaveBeenCalledOnce();
    const options = state.protect.mock.calls[0] as unknown[];
    if (path.startsWith("/en/")) expect(options[0]).toEqual({ unauthenticatedUrl: expect.stringContaining(`${SITE_URL}/en/sign-in?`) });
  });
});
