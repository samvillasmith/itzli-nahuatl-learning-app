import { describe, expect, it, vi } from "vitest";
import { LessonImagePreloadQueue, preloadLessonImages } from "@/lib/lesson-image-preload";

describe("complete active-lesson image warmup", () => {
  it("queues every unique eligible lesson image immediately and bounds normal browser image loads", async () => {
    const images: HTMLImageElement[] = [];
    const queue = new LessonImagePreloadQueue(() => {
      const image = { src: "", decoding: "", fetchPriority: "", onload: null, onerror: null,
        removeAttribute(this: { src: string }) { this.src = ""; } } as unknown as HTMLImageElement;
      images.push(image);
      return image;
    });
    const lesson = preloadLessonImages(["one.png", "two.png", null, "three.png", "four.png", "one.png"], { queue });
    await vi.waitFor(() => expect(images).toHaveLength(3));
    expect(images.map(image => image.src)).toEqual(["one.png", "two.png", "three.png"]);
    expect(images.every(image => image.decoding === "async")).toBe(true);
    images[0].onload?.(new Event("load"));
    await vi.waitFor(() => expect(images).toHaveLength(4));
    expect(images[3].src).toBe("four.png");
    for (const image of images.slice(1)) image.onload?.(new Event("load"));
    expect(await lesson).toEqual(["prepared", "prepared", "prepared", "prepared"]);
    expect(await preloadLessonImages(["one.png", "four.png"], { queue })).toEqual(["prepared", "prepared"]);
    expect(images).toHaveLength(4);
  });

  it("cancels pending images on navigation without continuing the abandoned lesson", async () => {
    const created: HTMLImageElement[] = [];
    const queue = new LessonImagePreloadQueue(() => {
      const image = { src: "", onload: null, onerror: null, removeAttribute(this: { src: string }) { this.src = ""; } } as unknown as HTMLImageElement;
      created.push(image); return image;
    });
    const abort = new AbortController();
    const lesson = preloadLessonImages(["one.png", "two.png", "three.png", "four.png"], { signal: abort.signal, queue });
    await vi.waitFor(() => expect(created).toHaveLength(3));
    abort.abort();
    expect(await lesson).toEqual(["cancelled", "cancelled", "cancelled", "cancelled"]);
    expect(created).toHaveLength(3);
    expect(created.every(image => image.src === "")).toBe(true);
  });
});
