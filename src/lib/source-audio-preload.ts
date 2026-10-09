import { GENERATED_AUDIO_INDEX, type GeneratedAudioIndex } from "./generated-audio";
import { MediaPreloadQueue } from "./media-preload-queue";

type Result = "prepared" | "failed" | "unavailable" | "excluded" | "cancelled";
export type SourceAudioProgress = { completed: number; total: number; prepared: number; paused: boolean };

/** COERLL does not allow readable cross-origin fetches. Normal media preloading
 * warms the browser's HTTP cache, without proxies or opaque CacheStorage packs.
 * This is an online preparation aid, not a durable offline-storage guarantee. */
export class SourceAudioPreloadQueue {
  private queue = new MediaPreloadQueue<Result>(2, "cancelled", "failed");
  private prepared = new Set<string>();
  constructor(private index: GeneratedAudioIndex, private createAudio: (() => HTMLAudioElement) | null) {}
  preload(url: string, priority = 10, signal?: AbortSignal): Promise<Result> {
    if (!this.index.hasSourceUrl(url)) return Promise.resolve("excluded");
    if (!this.createAudio) return Promise.resolve("unavailable");
    if (this.prepared.has(url)) return Promise.resolve("prepared");
    return this.queue.enqueue(url, priority, signal, async abort => {
      const result = await this.load(url, abort);
      if (result === "prepared") this.prepared.add(url);
      return result;
    });
  }
  private load(url: string, signal: AbortSignal): Promise<Result> {
    return new Promise(resolve => {
      const audio = this.createAudio!();
      let done = false;
      const finish = (result: Result) => {
        if (done) return;
        done = true; clearTimeout(timeout);
        signal.removeEventListener("abort", cancel);
        audio.onloadeddata = audio.onprogress = audio.oncanplaythrough = audio.onerror = null;
        audio.pause(); audio.removeAttribute("src"); audio.load();
        resolve(result);
      };
      const check = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.buffered.length &&
            audio.buffered.end(audio.buffered.length - 1) >= audio.duration - 0.05) finish("prepared");
      };
      const timeout = setTimeout(() => finish("failed"), 20_000);
      const cancel = () => finish("cancelled");
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) { finish("cancelled"); return; }
      audio.preload = "auto";
      audio.onloadeddata = audio.onprogress = audio.oncanplaythrough = check;
      audio.onerror = () => finish("failed");
      audio.src = url;
      try { audio.load(); } catch { finish("failed"); }
    });
  }
}

let browserQueue: SourceAudioPreloadQueue | null = null;
export function getSourceAudioPreloadQueue() {
  return browserQueue ??= new SourceAudioPreloadQueue(GENERATED_AUDIO_INDEX,
    typeof Audio === "undefined" ? null : () => new Audio());
}
export async function preloadSourceAudio(urls: readonly string[], options: {
  signal?: AbortSignal; priority?: number; onProgress?: (progress: SourceAudioProgress) => void; enqueueAll?: boolean;
  queue?: SourceAudioPreloadQueue;
  isOnline?: () => boolean;
} = {}): Promise<SourceAudioProgress> {
  const unique = [...new Set(urls)];
  const progress = { completed: 0, total: unique.length, prepared: 0, paused: false };
  const queue = options.queue ?? getSourceAudioPreloadQueue();
  const isOnline = options.isOnline ?? (() => typeof navigator === "undefined" || navigator.onLine !== false);
  const batchSize = options.enqueueAll ? Math.max(1, unique.length) : 6;
  for (let start = 0; start < unique.length; start += batchSize) {
    if (options.signal?.aborted || !isOnline()) { progress.paused = true; break; }
    const results = await Promise.all(unique.slice(start, start + batchSize).map(url => queue.preload(url, options.priority, options.signal)));
    progress.completed += results.length;
    progress.prepared += results.filter(result => result === "prepared").length;
    // A recording can fail or never fully buffer while other originals remain
    // playable. Only an unavailable preload API/offline state stops the pass.
    if (options.signal?.aborted || results.includes("unavailable") || !isOnline()) progress.paused = true;
    options.onProgress?.({ ...progress });
    if (progress.paused) break;
  }
  return progress;
}
