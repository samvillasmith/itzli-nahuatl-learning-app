import { describe, expect, it, vi } from "vitest";
import { MediaPreloadQueue } from "@/lib/media-preload-queue";

describe("lesson media request ownership and priority", () => {
  it("shares a download and keeps it alive when only one requester leaves", async () => {
    const queue = new MediaPreloadQueue(1, "cancelled", "failed");
    let finish!: (value: string) => void;
    let activeSignal!: AbortSignal;
    const load = vi.fn((signal: AbortSignal) => {
      activeSignal = signal;
      return new Promise<string>(resolve => { finish = resolve; });
    });
    const oldLesson = new AbortController();
    const currentLesson = new AbortController();
    const old = queue.enqueue("shared-image", 2, oldLesson.signal, load);
    const current = queue.enqueue("shared-image", 0, currentLesson.signal, load);
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    oldLesson.abort();
    expect(await old).toBe("cancelled");
    expect(activeSignal.aborted).toBe(false);
    finish("prepared");
    expect(await current).toBe("prepared");
  });

  it("removes abandoned waiting assets and aborts abandoned active transfers", async () => {
    const queue = new MediaPreloadQueue(1, "cancelled", "failed");
    const controller = new AbortController();
    const loaded: string[] = [];
    const load = (key: string) => (signal: AbortSignal) => new Promise<string>(resolve => {
      loaded.push(key);
      signal.addEventListener("abort", () => resolve("cancelled"), { once: true });
    });
    const active = queue.enqueue("active", 1, controller.signal, load("active"));
    const waiting = queue.enqueue("never-needed", 1, controller.signal, load("never-needed"));
    await vi.waitFor(() => expect(loaded).toEqual(["active"]));
    controller.abort();
    expect(await Promise.all([active, waiting])).toEqual(["cancelled", "cancelled"]);
    expect(await queue.enqueue("new-lesson", 1, undefined, async () => { loaded.push("new-lesson"); return "prepared"; })).toBe("prepared");
    expect(loaded).toEqual(["active", "new-lesson"]);
  });

  it("drops a cancelled priority upgrade without discarding a shared background request", async () => {
    const queue = new MediaPreloadQueue(1, "cancelled", "failed");
    let release!: (value: string) => void;
    const order: string[] = [];
    const first = queue.enqueue("in-flight", 10, undefined, () => new Promise<string>(resolve => { release = resolve; }));
    await vi.waitFor(() => expect(release).toBeDefined());
    const load = (key: string) => async () => { order.push(key); return "prepared"; };
    const background = queue.enqueue("background", 10, undefined, load("background"));
    const departed = new AbortController();
    const upgraded = queue.enqueue("background", 0, departed.signal, load("duplicate"));
    const current = queue.enqueue("current", 1, undefined, load("current"));
    departed.abort();
    expect(await upgraded).toBe("cancelled");
    release("prepared");
    await Promise.all([first, background, current]);
    expect(order).toEqual(["current", "background"]);
  });
});
