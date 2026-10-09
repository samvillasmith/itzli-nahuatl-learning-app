import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
const worker = readFileSync("public/sw.js", "utf8");
function fixture(origin: string) {
  let fetchHandler: (event: unknown) => void;
  const cached = { cached: true };
  vm.runInNewContext(worker, {
    URL, self: { location: new URL(origin), addEventListener: (name: string, callback: typeof fetchHandler) => { if (name === "fetch") fetchHandler = callback; } },
    caches: { open: async () => ({ match: async () => cached }) }, fetch: async () => ({ ok: true })
  });
  return { cached, request: (pathname: string, mode = "cors") => {
    let response: Promise<unknown> | null = null;
    fetchHandler({ request: { method: "GET", url: origin + pathname, mode }, respondWith: (value: Promise<unknown>) => { response = value; } });
    return response;
  } };
}
describe("current local preview with retained offline support", () => {
  it("refreshes cached standalone notices without deleting saved audio or changing the cache identity", async () => {
    let fetchHandler: (event: unknown) => void;
    const savedAudio = { bytes: "kept" }, fresh = { html: "current notices" };
    const saved = new Map<string, unknown>([["/offline.html", { html: "old notices" }], ["/audio/saved.mp3", savedAudio]]);
    let offline = false, failCacheWrite = true;
    vm.runInNewContext(worker, {
      URL, self: { location: new URL("https://example.test"), addEventListener: (name: string, callback: typeof fetchHandler) => { if (name === "fetch") fetchHandler = callback; } },
      caches: { open: async (name: string) => {
        expect(name).toBe("itzli-public-v3-1");
        return { match: async (key: string) => saved.get(key), put: async (key: string, value: unknown) => {
          if (failCacheWrite) throw new Error("cache storage full");
          saved.set(key, value);
        } };
      } },
      fetch: async () => { if (offline) throw new Error("offline"); return { ok: true, clone: () => fresh }; },
    });
    const request = () => {
      let response: Promise<unknown> | null = null;
      fetchHandler({ request: { method: "GET", url: "https://example.test/offline.html", mode: "navigate" }, respondWith: (value: Promise<unknown>) => { response = value; } });
      return response;
    };
    expect(await request()).toHaveProperty("ok", true);
    expect(saved.get("/offline.html")).toEqual({ html: "old notices" });
    failCacheWrite = false;
    await request();
    expect(saved.get("/offline.html")).toEqual(fresh);
    expect(saved.get("/audio/saved.mp3")).toBe(savedAudio);
    offline = true;
    expect(await request()).toEqual(fresh);
    expect(saved.size).toBe(2);
  });
  it.each(["http://127.0.0.1:3000", "http://localhost:3000", "http://[::1]:3000"])("lets development assets refresh at %s", origin => {
    expect(fixture(origin).request("/_next/static/chunks/current-page.js")).toBeNull();
  });
  it("continues caching immutable production assets", async () => {
    const value = fixture("https://example.test");
    expect(await value.request("/_next/static/chunks/content-hash.js")).toEqual(value.cached);
  });
  it("keeps API responses out of the cache and retains saved audio", async () => {
    const value = fixture("http://127.0.0.1:3000");
    expect(value.request("/api/progress")).toBeNull();
    expect(await value.request("/audio/saved.mp3")).toEqual(value.cached);
  });
});
