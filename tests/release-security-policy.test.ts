import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextFetchEvent } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import nextConfig from "../next.config";
import { clerkAuthorizedParties, clerkContentSecurityPolicy } from "@/lib/security-policy";

const state = vi.hoisted(() => ({ protect: vi.fn(async () => undefined) }));
vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (callback: (auth: { protect: typeof state.protect }, request: NextRequest) => Promise<Response>) =>
    (request: NextRequest) => callback({ protect: state.protect }, request),
}));
vi.mock("@/lib/local-review", () => ({ isLocalReviewMode: () => false }));
import proxy, { config } from "@/proxy";

beforeEach(() => state.protect.mockClear());
afterEach(() => vi.unstubAllEnvs());

describe("release request and browser boundaries", () => {
  it.each(["/en/units/284.png", "/units/file.js", "/api/progress.json", "/_next/static-other/private", "/en/source-course/12.svg"])(
    "runs authentication middleware for dynamic path %s", pathname => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig, url: `https://www.itzli.app${pathname}` })).toBe(true);
    },
  );
  it.each(["/_next/static/chunks/app.js", "/_next/image?url=test&w=256&q=75"])(
    "leaves the exact framework asset path %s to the framework", pathname => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig, url: `https://www.itzli.app${pathname}` })).toBe(false);
    },
  );
  it("ignores spoofed locale, pathname and nonce when determining route authorization", async () => {
    const response = await proxy(new NextRequest("https://www.itzli.app/units/284.png", {
      headers: { "x-itzli-locale": "en", "x-itzli-pathname": "/", "x-nonce": "attacker-value" },
    }), {} as NextFetchEvent);
    expect(state.protect).toHaveBeenCalledOnce();
    expect(response?.headers.get("Content-Language")).toBe("es-MX");
    expect(response?.headers.get("x-middleware-request-x-itzli-pathname")).toBe("/units/284.png");
  });
  it("keeps exact public assets reachable without granting similarly named routes public access", async () => {
    for (const pathname of ["/sw.js", "/offline.html", "/generated-course-audio.json", "/third-party-notices.txt"]) {
      await proxy(new NextRequest(`https://www.itzli.app${pathname}`), {} as NextFetchEvent);
      expect(state.protect).not.toHaveBeenCalled();
    }
    for (const pathname of ["/offline.html/private", "/generated-course-audio.json/private", "/secret.png"]) {
      state.protect.mockClear();
      await proxy(new NextRequest(`https://www.itzli.app${pathname}`), {} as NextFetchEvent);
      expect(state.protect).toHaveBeenCalledOnce();
    }
  });
  it("provides the app media origins without enabling executable object embeds or inline event handlers", () => {
    const policy = clerkContentSecurityPolicy(true);
    expect(policy.strict).toBe(true);
    expect(policy.directives["object-src"]).toEqual(["'none'"]);
    expect(policy.directives["frame-ancestors"]).toEqual(["'none'"]);
    expect(policy.directives["script-src-attr"]).toEqual(["'none'"]);
    expect(policy.directives["media-src"]).toContain("https://tlahtolli.coerll.utexas.edu");
    expect(policy.directives["connect-src"]).toContain("https://nahuatl-language.s3.us-east-1.amazonaws.com");
    expect(policy.directives).toHaveProperty("upgrade-insecure-requests");
    expect(clerkContentSecurityPolicy(false).directives).not.toHaveProperty("upgrade-insecure-requests");
  });
  it("restricts session authorized parties to known deployment origins", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_URL", "attacker.example");
    expect(clerkAuthorizedParties()).toEqual(["https://www.itzli.app", "https://itzli.app"]);
    vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("VERCEL_URL", "itzli-preview.vercel.app");
    expect(clerkAuthorizedParties()).toContain("https://itzli-preview.vercel.app");
    vi.stubEnv("VERCEL_URL", "itzli.vercel.app.evil.example");
    expect(clerkAuthorizedParties()).toHaveLength(2);
    vi.stubEnv("NODE_ENV", "development");
    expect(clerkAuthorizedParties()).toContain("http://127.0.0.1:3000");
  });
  it("protects the cacheable offline script by its exact hash and prevents API/shared-cache exposure", async () => {
    const headers = await nextConfig.headers!();
    const offline = headers.find(row => row.source === "/offline.html")!.headers.find(row => row.key === "Content-Security-Policy")!.value;
    const html = readFileSync("public/offline.html", "utf8");
    const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(([, attributes]) => !/\bsrc\s*=/i.test(attributes));
    expect(inline).toHaveLength(1);
    expect(offline).toContain(`'sha256-${createHash("sha256").update(inline[0][2]).digest("base64")}'`);
    expect(offline.match(/script-src [^;]+/)![0]).not.toContain("unsafe-inline");
    expect(headers.find(row => row.source === "/api/:path*")!.headers).toContainEqual({ key: "Cache-Control", value: "private, no-store, max-age=0" });
    expect(headers.find(row => row.source === "/:path*")!.headers).toContainEqual({ key: "X-Content-Type-Options", value: "nosniff" });
    expect(nextConfig.poweredByHeader).toBe(false);
  });
  it("constrains image optimization to course storage without redirects, local-network fetches or SVG execution", () => {
    const images = nextConfig.images!;
    expect(images.remotePatterns).toHaveLength(2);
    for (const pattern of images.remotePatterns!) {
      expect(pattern).toMatchObject({ protocol: "https", search: "" });
      expect(pattern.hostname).toMatch(/^(nahuatl-language|mero-mero-app)\.s3\.us-east-1\.amazonaws\.com$/);
    }
    expect(images.maximumRedirects).toBe(0);
    expect(images.dangerouslyAllowLocalIP).toBe(false);
    expect(images.dangerouslyAllowSVG).toBe(false);
    expect(images.maximumResponseBody).toBe(5_000_000);
  });
});
