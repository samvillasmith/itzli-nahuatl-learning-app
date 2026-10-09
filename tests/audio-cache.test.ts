import { describe, expect, it, vi } from "vitest";
import { createGeneratedAudioIndex } from "@/lib/generated-audio";
import { GeneratedAudioCacheQueue, audioGroupsForPath, isLearningAudioPath, precacheGeneratedAudio } from "@/lib/audio-cache";
import { audioFixture } from "./helpers/audio-fixture";

function fixture(count = 8, options: { quota?: number; fail?: boolean; type?: string } = {}) {
  const manifest = audioFixture(count);
  const saved = new Map<string, Response>();
  let active = 0, maximum = 0;
  const fetch = vi.fn(async (url: string, requestOptions: RequestInit) => {
    expect(url).toContain("/itzli-app/audio-v3/");
    expect(requestOptions.credentials).toBe("omit");
    active += 1; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 1)); active -= 1;
    return new Response("recording", { status: options.fail ? 503 : 200, headers: { "content-type": options.type ?? "audio/mpeg" } });
  });
  const environment = { open: vi.fn(async (name: string) => {
    expect(name).toBe("itzli-generated-audio-spanish-air-b-2026-10-07");
    return { match: async (key: RequestInfo | URL) => saved.get(String(key)),
    put: async (key: RequestInfo | URL, value: Response) => { saved.set(String(key), value); } }; }), fetch,
    estimate: async () => ({ quota: options.quota ?? 100_000_000, usage: 0 }) };
  return { manifest, saved, fetch, environment, queue: new GeneratedAudioCacheQueue(createGeneratedAudioIndex(manifest), environment), max: () => maximum };
}
describe("bounded resumable course audio cache", () => {
  it("deduplicates, respects concurrency, and reuses saved clips on resume", async () => {
    const f = fixture();
    const first = await precacheGeneratedAudio([...f.manifest.assets, f.manifest.assets[0]], { queue: f.queue });
    expect(first).toMatchObject({ total: 8, saved: 8, failed: 0, paused: false });
    expect(f.max()).toBeLessThanOrEqual(3);
    expect(f.fetch).toHaveBeenCalledTimes(8);
    expect(await precacheGeneratedAudio(f.manifest.assets, { queue: f.queue })).toMatchObject({ saved: 8 });
    expect(f.fetch).toHaveBeenCalledTimes(8);
    for (const call of f.fetch.mock.calls) expect(call[1]).toMatchObject({ credentials: "omit", mode: "cors", redirect: "error" });
  });
  it("pauses before exhausting storage and leaves unrelated data alone", async () => {
    const f = fixture(8, { quota: 20_000_000 });
    const progress = await precacheGeneratedAudio(f.manifest.assets, { queue: f.queue });
    expect(progress.paused).toBe(true);
    expect(progress.saved).toBe(0);
    expect(f.fetch).not.toHaveBeenCalled();
    expect(f.saved.size).toBe(0);
    expect(f.environment.open.mock.calls[0][0]).toBe("itzli-generated-audio-spanish-air-b-2026-10-07");
  });
  it("rejects HTML/error responses and stops an unavailable background batch", async () => {
    for (const options of [{ type: "text/html" }, { fail: true }]) {
      const f = fixture(8, options);
      const progress = await precacheGeneratedAudio(f.manifest.assets, { queue: f.queue });
      expect(progress.saved).toBe(0); expect(progress.paused).toBe(true);
      expect(f.fetch).toHaveBeenCalledTimes(6); expect(f.saved.size).toBe(0);
    }
  });
  it("excludes source hosts, images, and account/API URLs from durable generated caching", async () => {
    const f = fixture();
    for (const url of ["https://tlahtolli.coerll.utexas.edu/atl.mp3", "/api/progress", "/images/private.png", "/account"])
      expect(await f.queue.cache({ ...f.manifest.assets[0], url })).toBe("excluded");
    expect(f.fetch).not.toHaveBeenCalled(); expect(f.environment.open).not.toHaveBeenCalled();
  });
  it("does not save truncated or substituted media under a published immutable key", async () => {
    const f = fixture(1);
    f.manifest.assets[0].byte_length = 20;
    expect(await f.queue.cache(f.manifest.assets[0])).toBe("failed");
    expect(f.saved.size).toBe(0);
  });
  it("moves a current cue ahead of waiting full-course downloads", async () => {
    const manifest = audioFixture();
    let release!: () => void;
    const firstDownload = new Promise<void>(resolve => { release = resolve; });
    const order: string[] = [];
    const queue = new GeneratedAudioCacheQueue(createGeneratedAudioIndex(manifest), {
      open: async () => ({ match: async () => undefined, put: async () => {} }),
      fetch: async (url: string) => {
        order.push(url);
        if (url === manifest.assets[0].url) await firstDownload;
        return new Response("recording", { headers: { "content-type": "audio/mpeg" } });
      },
    }, 1);
    const first = queue.cache(manifest.assets[0], 10);
    await vi.waitFor(() => expect(order).toHaveLength(1));
    const background = queue.cache(manifest.assets[1], 10);
    const current = queue.cache(manifest.assets[2], 0);
    release();
    await Promise.all([first, background, current]);
    expect(order).toEqual([manifest.assets[0].url, manifest.assets[2].url, manifest.assets[1].url]);
  });
  it("pauses between small batches and resumes without redownloading completed files", async () => {
    const f = fixture(8); const controller = new AbortController();
    const progress = await precacheGeneratedAudio(f.manifest.assets, { queue: f.queue, signal: controller.signal, onProgress: () => controller.abort() });
    expect(progress).toMatchObject({ completed: 6, saved: 6, paused: true });
    expect(await precacheGeneratedAudio(f.manifest.assets, { queue: f.queue })).toMatchObject({ saved: 8 });
    expect(f.fetch).toHaveBeenCalledTimes(8);
  });
  it("queues the entire current lesson ahead of adjacent assets, including clips beyond the first batch", async () => {
    const manifest = audioFixture(10);
    let release!: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    const order: string[] = [];
    const queue = new GeneratedAudioCacheQueue(createGeneratedAudioIndex(manifest), {
      open: async () => ({ match: async () => undefined, put: async () => {} }),
      fetch: async (url: string) => {
        order.push(url);
        if (url === manifest.assets[9].url) await blocked;
        return new Response("recording", { headers: { "content-type": "audio/mpeg" } });
      },
    }, 1);
    const inFlight = queue.cache(manifest.assets[9], 10);
    await vi.waitFor(() => expect(order).toHaveLength(1));
    const lesson = precacheGeneratedAudio(manifest.assets.slice(0, 8), { queue, priority: 1, enqueueAll: true });
    const adjacent = queue.cache(manifest.assets[8], 2);
    release();
    expect(await lesson).toMatchObject({ total: 8, saved: 8, paused: false });
    await Promise.all([inFlight, adjacent]);
    expect(order).toEqual([manifest.assets[9].url, ...manifest.assets.slice(0, 9).map(asset => asset.url)]);
  });
  it("aborts abandoned lesson transfers and never starts their remaining queued clips", async () => {
    const manifest = audioFixture(8);
    const controller = new AbortController();
    const attempted: string[] = [];
    const saved: string[] = [];
    const queue = new GeneratedAudioCacheQueue(createGeneratedAudioIndex(manifest), {
      open: async () => ({ match: async () => undefined, put: async key => { saved.push(String(key)); } }),
      fetch: (url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
        attempted.push(url);
        options.signal!.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
      }),
    });
    const lesson = precacheGeneratedAudio(manifest.assets, { queue, signal: controller.signal, enqueueAll: true });
    await vi.waitFor(() => expect(attempted).toHaveLength(3));
    controller.abort();
    expect(await lesson).toMatchObject({ saved: 0, failed: 0, paused: true });
    expect(attempted).toHaveLength(3);
    expect(saved).toEqual([]);
  });
  it("prepares the actual next path lesson only on learning routes", () => {
    const groups = audioGroupsForPath("/es/units/11");
    expect(groups[0]).toBe("unit:11"); expect(groups).toHaveLength(2);
    expect(audioGroupsForPath("/en/practice/11")).toEqual(groups);
    expect(audioGroupsForPath("/es/source-course/13")).toEqual(["source-course:13"]);
    expect(audioGroupsForPath("/en/grammar/possession")).toEqual(["grammar:possession"]);
    expect(audioGroupsForPath("/api/account")).toEqual([]);
    expect(isLearningAudioPath("/es/units/11")).toBe(true);
    expect(isLearningAudioPath("/privacy")).toBe(false);
    expect(isLearningAudioPath("/en/sign-in")).toBe(false);
    expect(isLearningAudioPath("/")).toBe(false);
  });
});
