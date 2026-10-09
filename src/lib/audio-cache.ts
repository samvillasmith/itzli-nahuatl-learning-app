import progression from "@/data/course-path-progression.json";
import { GENERATED_AUDIO_INDEX, type GeneratedAudioAsset, type GeneratedAudioIndex } from "./generated-audio";
import { MediaPreloadQueue } from "./media-preload-queue";

export type AudioCacheResult = "cached" | "saved" | "failed" | "storage-full" | "unavailable" | "excluded" | "cancelled";
export type AudioCacheProgress = { completed: number; total: number; saved: number; failed: number; paused: boolean };
type CacheStore = Pick<Cache, "match" | "put">;
type CacheEnvironment = {
  open: (name: string) => Promise<CacheStore>;
  fetch: (url: string, options: RequestInit) => Promise<Response>;
  estimate?: () => Promise<{ quota?: number; usage?: number }>;
};

/** Only the validated generated manifest can enter this cache. It never stores
 * account data, course HTML, images, or external-course originals. */
export class GeneratedAudioCacheQueue {
  private queue: MediaPreloadQueue<AudioCacheResult>;
  readonly cacheName: string;
  constructor(private index: GeneratedAudioIndex, private environment: CacheEnvironment | null, private concurrency = 3) {
    this.cacheName = `itzli-generated-audio-${index.recipeId}`;
    this.concurrency = Math.max(1, Math.min(3, concurrency));
    this.queue = new MediaPreloadQueue<AudioCacheResult>(this.concurrency, "cancelled", "failed");
  }
  cache(asset: GeneratedAudioAsset, priority = 10, signal?: AbortSignal): Promise<AudioCacheResult> {
    if (!this.index.hasUrl(asset.url)) return Promise.resolve("excluded");
    if (!this.environment) return Promise.resolve("unavailable");
    return this.queue.enqueue(asset.url, priority, signal, abort => this.save(asset, abort));
  }
  private async save(asset: GeneratedAudioAsset, signal: AbortSignal): Promise<AudioCacheResult> {
    const environment = this.environment!;
    try {
      const cache = await environment.open(this.cacheName);
      const saved = await cache.match(asset.url);
      if (signal.aborted) return "cancelled";
      if (saved?.status === 200 && /^audio\//i.test(saved.headers.get("content-type") ?? "")) return "cached";
      if (environment.estimate) {
        try {
          const estimate = await environment.estimate();
          // Leave room for progress and other browser data; audio is optional.
          if (estimate.quota !== undefined && estimate.usage !== undefined &&
              estimate.quota - estimate.usage < (asset.byte_length ?? 256_000) + 20_000_000) return "storage-full";
        } catch { /* A failed estimate must not block requested playback. */ }
      }
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) controller.abort();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      try {
        const response = await environment.fetch(asset.url, {
          mode: "cors", credentials: "omit", redirect: "error", signal: controller.signal,
        });
        if (response.status !== 200 || response.type === "opaque" || !/^audio\//i.test(response.headers.get("content-type") ?? "")) return "failed";
        if (asset.audio_sha256 || asset.byte_length !== undefined) {
          const bytes = await response.clone().arrayBuffer();
          if (asset.byte_length !== undefined && bytes.byteLength !== asset.byte_length) return "failed";
          if (asset.audio_sha256 && globalThis.crypto?.subtle) {
            const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
            const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
            if (hash !== asset.audio_sha256) return "failed";
          }
        }
        if (signal.aborted) return "cancelled";
        await cache.put(asset.url, response);
        return "saved";
      } finally { clearTimeout(timeout); signal.removeEventListener("abort", cancel); }
    } catch (error) {
      if (signal.aborted) return "cancelled";
      return error instanceof Error && error.name === "QuotaExceededError" ? "storage-full" : "failed";
    }
  }
}

let browserQueue: GeneratedAudioCacheQueue | null = null;
export function getAudioCacheQueue() {
  if (!browserQueue) browserQueue = new GeneratedAudioCacheQueue(GENERATED_AUDIO_INDEX,
    typeof window !== "undefined" && "caches" in window ? {
      open: name => window.caches.open(name),
      fetch: (url, options) => window.fetch(url, options),
      estimate: navigator.storage?.estimate ? () => navigator.storage.estimate() : undefined,
    } : null);
  return browserQueue;
}

export async function precacheGeneratedAudio(assets: readonly GeneratedAudioAsset[], options: {
  signal?: AbortSignal; priority?: number; onProgress?: (progress: AudioCacheProgress) => void; enqueueAll?: boolean;
  queue?: GeneratedAudioCacheQueue;
} = {}): Promise<AudioCacheProgress> {
  const unique = [...new Map(assets.map(asset => [asset.url, asset])).values()];
  const progress = { completed: 0, total: unique.length, saved: 0, failed: 0, paused: false };
  const queue = options.queue ?? getAudioCacheQueue();
  // Small resumable batches allow current/next lesson clips to move ahead of a
  // background pack and make Pause effective without thousands of queued jobs.
  const batchSize = options.enqueueAll ? Math.max(1, unique.length) : 6;
  for (let start = 0; start < unique.length; start += batchSize) {
    if (options.signal?.aborted) { progress.paused = true; break; }
    const results = await Promise.all(unique.slice(start, start + batchSize).map(asset => queue.cache(asset, options.priority, options.signal)));
    for (const result of results) {
      progress.completed += 1;
      if (result === "saved" || result === "cached") progress.saved += 1;
      else if (result !== "cancelled") progress.failed += 1;
      if (result === "storage-full" || result === "unavailable" || result === "cancelled") progress.paused = true;
    }
    if (results.every(result => result === "failed")) progress.paused = true;
    options.onProgress?.({ ...progress });
    if (progress.paused) break;
  }
  return progress;
}

export function audioGroupsForPath(pathname: string): string[] {
  const path = pathname.replace(/^\/(en|es)(?=\/|$)/, "");
  const unit = path.match(/^\/(?:units|practice)\/(\d+)\/?$/);
  if (unit) {
    const number = Number(unit[1]);
    const position = progression.lessons.findIndex(lesson => lesson.lessonNumber === number);
    const next = position >= 0 ? progression.lessons[position + 1]?.lessonNumber : undefined;
    return [`unit:${number}`, ...(next === undefined ? [] : [`unit:${next}`])];
  }
  const grammar = path.match(/^\/grammar\/([^/]+)\/?$/);
  if (grammar) return [`grammar:${grammar[1]}`];
  const source = path.match(/^\/source-course\/(\d+)\/?$/);
  if (source) return [`source-course:${Number(source[1])}`];
  if (path === "/sentences") return ["sentences"];
  return [];
}

export function isLearningAudioPath(pathname: string) {
  const path = pathname.replace(/^\/(en|es)(?=\/|$)/, "");
  return /^\/(?:learn|units|practice|grammar|conversations|sentences|listening|review|vocabulary|progress|source-course)(?:\/|$)/.test(path);
}
