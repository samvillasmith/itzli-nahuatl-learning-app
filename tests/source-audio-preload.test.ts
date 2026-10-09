import { describe, expect, it, vi } from "vitest";
import { createGeneratedAudioIndex } from "@/lib/generated-audio";
import { preloadSourceAudio, SourceAudioPreloadQueue } from "@/lib/source-audio-preload";
import { audioFixture } from "./helpers/audio-fixture";

describe("bounded original-recording browser preloading", () => {
  it("prepares only listed originals without playback, rehosting, or durable-cache claims", async () => {
    const manifest = audioFixture();
    const urls = Array.from({ length: 8 }, (_, index) => `https://tlahtolli.coerll.utexas.edu/wp-content/uploads/word-${index}.mp3`);
    manifest.source_bindings = urls.map((url, index) => ({ reference_id: `native:${index}`, runtime_text: `word${index}`, url }));
    let active = 0, maximum = 0, created = 0, plays = 0;
    const queue = new SourceAudioPreloadQueue(createGeneratedAudioIndex(manifest), () => {
      created += 1;
      const audio = { src: "", preload: "", duration: 1, buffered: { length: 1, end: () => 1 },
        onloadeddata: null as (() => void) | null, onprogress: null as (() => void) | null,
        oncanplaythrough: null as (() => void) | null, onerror: null as (() => void) | null,
        pause() {}, play() { plays += 1; }, removeAttribute() { this.src = ""; },
        load() { if (!this.src) return; active += 1; maximum = Math.max(maximum, active);
          setTimeout(() => { active -= 1; this.onloadeddata?.(); }, 1); } };
      return audio as unknown as HTMLAudioElement;
    });
    expect(await queue.preload("https://unrelated.test/private.mp3")).toBe("excluded");
    expect(await queue.preload("/api/progress")).toBe("excluded");
    const progress = await preloadSourceAudio(urls, { queue });
    expect(progress).toEqual({ completed: 8, total: 8, prepared: 8, paused: false });
    expect(maximum).toBeLessThanOrEqual(2); expect(plays).toBe(0);
    expect(await preloadSourceAudio(urls, { queue })).toMatchObject({ prepared: 8 });
    expect(created).toBe(8);
  });
  it("reports unsupported source preloading separately from saved generated audio", async () => {
    const manifest = audioFixture(); const url = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/atl.mp3";
    manifest.source_bindings = [{ reference_id: "word:atl", runtime_text: "atl", url }];
    const queue = new SourceAudioPreloadQueue(createGeneratedAudioIndex(manifest), null);
    expect(await preloadSourceAudio([url], { queue })).toEqual({ completed: 1, total: 1, prepared: 0, paused: true });
  });
  it("allows explicitly listed whole-passage originals without inventing utterance bindings", async () => {
    const manifest = audioFixture();
    const passage = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/passage.mp3";
    const excluded = ["https://unrelated.test/passage.mp3", "/api/progress",
      `${passage}?token=private`, `${passage}#fragment`,
      "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/document.pdf"];
    manifest.source_asset_urls = [passage, ...excluded];
    manifest.lesson_assets = [{ id: "source-course:1", asset_ids: [], source_urls: [passage, ...excluded] }];
    const index = createGeneratedAudioIndex(manifest);
    expect(index.sourceUrls).toEqual([passage]);
    expect(index.lessonSourceUrls(manifest.lesson_assets[0].id)).toEqual([passage]);
    expect(index.sourceLookup("A passage", "unbound:passage")).toBeNull();
    const queue = new SourceAudioPreloadQueue(index, null);
    expect(await queue.preload(passage)).toBe("unavailable");
    for (const url of [...excluded, "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/unlisted.mp3"])
      expect(await queue.preload(url)).toBe("excluded");
  });
  it("attempts a later original after six preceding links reach their full-buffer timeout", async () => {
    vi.useFakeTimers();
    try {
      const manifest = audioFixture();
      const urls = Array.from({ length: 7 }, (_, index) => `https://tlahtolli.coerll.utexas.edu/wp-content/uploads/part-${index}.mp3`);
      manifest.source_asset_urls = urls;
      const attempted: string[] = [];
      let active = 0, maximum = 0;
      const queue = new SourceAudioPreloadQueue(createGeneratedAudioIndex(manifest), () => {
        let loading = false;
        const audio = { src: "", preload: "", duration: 1, buffered: { length: 1, end: () => 1 },
          onloadeddata: null as (() => void) | null, onprogress: null as (() => void) | null,
          oncanplaythrough: null as (() => void) | null, onerror: null as (() => void) | null,
          pause() { if (loading) { loading = false; active -= 1; } },
          removeAttribute() { this.src = ""; },
          load() {
            if (!this.src) return;
            attempted.push(this.src); loading = true; active += 1; maximum = Math.max(maximum, active);
            // Browser full-buffer limits stall the first batch; its individual
            // 20-second deadlines must not starve the next playable recording.
            this.duration = this.src === urls[6] ? 1 : 120;
            setTimeout(() => this.onloadeddata?.(), 1);
          },
        };
        return audio as unknown as HTMLAudioElement;
      });
      const preparation = preloadSourceAudio(urls, { queue, isOnline: () => true });
      await vi.advanceTimersByTimeAsync(60_005);
      expect(await preparation).toEqual({ completed: 7, total: 7, prepared: 1, paused: false });
      expect(attempted).toEqual(urls);
      expect(maximum).toBeLessThanOrEqual(2);
      expect(active).toBe(0);
    } finally { vi.useRealTimers(); }
  });
  it("pauses before requesting another native recording when the browser is offline", async () => {
    const manifest = audioFixture();
    const url = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/passage.mp3";
    manifest.source_asset_urls = [url];
    const createAudio = vi.fn(() => { throw new Error("Offline playback must not be queued"); });
    const queue = new SourceAudioPreloadQueue(createGeneratedAudioIndex(manifest), createAudio);
    expect(await preloadSourceAudio([url], { queue, isOnline: () => false }))
      .toEqual({ completed: 0, total: 1, prepared: 0, paused: true });
    expect(createAudio).not.toHaveBeenCalled();
  });
  it("releases abandoned native audio elements and does not start the rest of the lesson", async () => {
    const manifest = audioFixture();
    const urls = Array.from({ length: 8 }, (_, index) => `https://tlahtolli.coerll.utexas.edu/wp-content/uploads/native-${index}.mp3`);
    manifest.source_asset_urls = urls;
    const elements: HTMLAudioElement[] = [];
    const queue = new SourceAudioPreloadQueue(createGeneratedAudioIndex(manifest), () => {
      const audio = { src: "", preload: "", duration: 0, buffered: { length: 0 }, onloadeddata: null,
        onprogress: null, oncanplaythrough: null, onerror: null, pause() {}, load() {},
        removeAttribute(this: { src: string }) { this.src = ""; } } as unknown as HTMLAudioElement;
      elements.push(audio); return audio;
    });
    const abort = new AbortController();
    const lesson = preloadSourceAudio(urls, { queue, signal: abort.signal, enqueueAll: true });
    await vi.waitFor(() => expect(elements).toHaveLength(2));
    abort.abort();
    expect(await lesson).toMatchObject({ prepared: 0, paused: true });
    expect(elements).toHaveLength(2);
    expect(elements.every(audio => audio.src === "" && !audio.onloadeddata && !audio.onprogress && !audio.onerror)).toBe(true);
  });
});
