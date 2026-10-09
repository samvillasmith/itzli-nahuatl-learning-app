import { MediaPreloadQueue } from "./media-preload-queue";

type Result = "prepared" | "failed" | "unavailable" | "cancelled";

/** Callers supply only images returned by the existing reviewed-sense lookup.
 * Normal image loading warms the same browser HTTP cache used by the cards,
 * including immutable S3 assets, without making a separate opaque offline pack. */
export class LessonImagePreloadQueue {
  private queue = new MediaPreloadQueue<Result>(3, "cancelled", "failed");
  private prepared = new Set<string>();
  constructor(private createImage: (() => HTMLImageElement) | null) {}

  preload(url: string, priority = 1, signal?: AbortSignal): Promise<Result> {
    if (signal?.aborted) return Promise.resolve("cancelled");
    if (!this.createImage) return Promise.resolve("unavailable");
    if (this.prepared.has(url)) return Promise.resolve("prepared");
    return this.queue.enqueue(url, priority, signal, abort => new Promise<Result>(resolve => {
      const image = this.createImage!();
      let done = false;
      const finish = (result: Result) => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        abort.removeEventListener("abort", cancel);
        image.onload = image.onerror = null;
        if (result === "prepared") this.prepared.add(url);
        else image.removeAttribute("src");
        resolve(result);
      };
      const cancel = () => finish("cancelled");
      const timeout = setTimeout(() => finish("failed"), 20_000);
      abort.addEventListener("abort", cancel, { once: true });
      if (abort.aborted) { finish("cancelled"); return; }
      image.decoding = "async";
      image.fetchPriority = priority === 0 ? "high" : "low";
      image.onload = () => finish("prepared");
      image.onerror = () => finish("failed");
      image.src = url;
    }));
  }
}

let browserQueue: LessonImagePreloadQueue | null = null;
export function getLessonImagePreloadQueue() {
  return browserQueue ??= new LessonImagePreloadQueue(typeof Image === "undefined" ? null : () => new Image());
}

export function preloadLessonImages(urls: readonly (string | null | undefined)[], options: {
  signal?: AbortSignal; priority?: number; queue?: LessonImagePreloadQueue;
} = {}) {
  const queue = options.queue ?? getLessonImagePreloadQueue();
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))];
  // Queue the whole lesson synchronously; fetch concurrency remains bounded.
  return Promise.all(unique.map(url => queue.preload(url, options.priority, options.signal)));
}
