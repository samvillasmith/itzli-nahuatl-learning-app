import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

const event = (sequence: number, extra: Record<string, unknown> = {}) => ({ id: `offline:stream-a:${sequence}`, stream: "stream-a", sequence, activityId: "word:960001", skill: "production", correct: true, at: 100, ...extra });
describe("offline attempt import integrity", () => {
  let items: Map<string, string>, failCleanup: boolean, failLearningWrite: boolean;
  beforeEach(() => {
    vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(100_000_000);
    items = new Map(); failCleanup = false; failLearningWrite = false;
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      get length() { return items.size; }, key: (index: number) => [...items.keys()][index] ?? null,
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => { if (failLearningWrite && key.startsWith("itzli_learning_v1")) throw new Error("Quota exceeded"); items.set(key, value); },
      removeItem: (key: string) => { if (failCleanup) throw new Error("Cleanup blocked"); items.delete(key); },
    });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("imports each attempt once despite refresh and failed cleanup, retaining original skill and date", async () => {
    const p = await import("../src/lib/progress-storage"), learning = await import("../src/lib/learning-state");
    const { importOfflineAttempts } = await import("../src/lib/offline-attempts"); p.setProgressAccount("alice");
    const key = "itzli_offline_attempts_v3:alice:offline:stream-a:1";
    items.set(key, JSON.stringify([event(1)])); failCleanup = true;
    expect(importOfflineAttempts(new Set(["word:960001"]))).toMatchObject({ imported: 1, storageError: true });
    expect(learning.getActivityMastery("word:960001", "production")).toMatchObject({ correct: 1, total: 1 });
    expect(Object.values(learning.loadLearningState().attempts)[0]).toMatchObject({ id: "offline:stream-a:1", at: 100, skill: "production" });
    expect(learning.getDueReviews()).toMatchObject([{ lastReviewedAt: 100, dueAt: 100 + 86400000 }]);
    // Simulate an actual refresh: discard module memory and reload persisted state.
    vi.resetModules(); const storageAgain = await import("../src/lib/progress-storage"); storageAgain.setProgressAccount("alice");
    const again = await import("../src/lib/offline-attempts"), stateAgain = await import("../src/lib/learning-state");
    expect(again.importOfflineAttempts(new Set(["word:960001"]))).toMatchObject({ imported: 0, duplicates: 1 });
    expect(stateAgain.getActivityMastery("word:960001")).toMatchObject({ correct: 1, total: 1 });
    // The receipt survives trimming recent event history as well.
    stateAgain.saveLearningState({ ...stateAgain.loadLearningState(), attempts: {} }); failCleanup = false;
    expect(again.importOfflineAttempts(new Set(["word:960001"]))).toMatchObject({ imported: 0, duplicates: 1, remaining: 0 });
    expect(items.has(key)).toBe(false);
    expect(stateAgain.getActivityMastery("word:960001").total).toBe(1);
  });

  it("upgrades old queues durably and keeps another account's events untouched", async () => {
    const storage = await import("../src/lib/progress-storage"), learning = await import("../src/lib/learning-state"), { importOfflineAttempts } = await import("../src/lib/offline-attempts");
    storage.setProgressAccount("alice");
    const alice = "itzli_offline_attempts_v3:alice", bob = "itzli_offline_attempts_v3:bob";
    items.set(alice, JSON.stringify([{ activityId: "word:960001", correct: false, at: 12 }]));
    items.set(bob, JSON.stringify([event(1)])); failCleanup = true;
    expect(importOfflineAttempts(new Set(["word:960001"])).imported).toBe(1);
    expect(JSON.parse(items.get(alice)!)[0]).toMatchObject({ skill: "recognition", at: 12, sequence: 1 });
    expect(importOfflineAttempts(new Set(["word:960001"])).duplicates).toBe(1);
    expect(learning.getActivityMastery("word:960001")).toMatchObject({ correct: 0, total: 1 });
    expect(items.has(bob)).toBe(true); storage.setProgressAccount("bob"); expect(learning.getActivityMastery("word:960001").total).toBe(0);
  });

  it("retains queued practice if learning state cannot be written durably", async () => {
    const storage = await import("../src/lib/progress-storage"), { importOfflineAttempts } = await import("../src/lib/offline-attempts"), learning = await import("../src/lib/learning-state"); storage.setProgressAccount("alice");
    const key = "itzli_offline_attempts_v3:alice:offline:stream-a:1"; items.set(key, JSON.stringify([event(1)])); failLearningWrite = true;
    expect(importOfflineAttempts(new Set(["word:960001"]))).toMatchObject({ imported: 0, storageError: true });
    expect(items.has(key)).toBe(true); failLearningWrite = false;
    importOfflineAttempts(new Set(["word:960001"]));
    expect(learning.getActivityMastery("word:960001").total).toBe(1); expect(items.has(key)).toBe(false);
  });

  it("orders stream events, retains unknown records, and does not rewind a newer review", async () => {
    const storage = await import("../src/lib/progress-storage"), { importOfflineAttempts } = await import("../src/lib/offline-attempts"), learning = await import("../src/lib/learning-state"); storage.setProgressAccount("alice");
    learning.recordAttempt("word:960001", "production", true);
    const review = learning.loadLearningState().activities[JSON.stringify(["word:960001", "production"])].review;
    items.set("itzli_offline_attempts_v3:alice", JSON.stringify([event(2, { at: 30 }), event(1, { at: 20 }), event(3, { activityId: "word:unknown" }), event(4)]));
    expect(importOfflineAttempts(new Set(["word:960001"]))).toMatchObject({ imported: 2, remaining: 2 });
    expect(learning.getActivityMastery("word:960001").total).toBe(3);
    expect(learning.loadLearningState().activities[JSON.stringify(["word:960001", "production"])].review).toEqual(review);
  });

  it("keeps the standalone offline script valid JavaScript", () => {
    const html = readFileSync("public/offline.html", "utf8"), source = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(source).toBeTruthy(); expect(() => new Script(source!)).not.toThrow();
  });

  it("explicit reset clears only the active account queue and exact event descendants", async () => {
    const storage = await import("../src/lib/progress-storage"), offline = await import("../src/lib/offline-attempts"); storage.setProgressAccount("alice:team");
    const base = "itzli_offline_attempts_v3:alice%3Ateam";
    items.set(base, JSON.stringify([event(1)])); items.set(`${base}:offline:stream-a:2`, JSON.stringify([event(2)]));
    const untouched = ["itzli_offline_attempts_v3:bob", "itzli_offline_attempts_v3:guest", `${base}-other`, "itzli_offline_course_v3", "itzli_learning_v1:account:alice%3Ateam", "itzli_progress_v2:account:alice%3Ateam"];
    for (const key of untouched) items.set(key, "keep");
    expect(offline.hasPendingOfflineAttempts()).toBe(true);
    expect(offline.clearOfflineAttempts()).toBe(true);
    expect(offline.hasPendingOfflineAttempts()).toBe(false);
    expect(items.has(base)).toBe(false); expect(items.has(`${base}:offline:stream-a:2`)).toBe(false);
    for (const key of untouched) expect(items.get(key)).toBe("keep");
    expect(offline.clearOfflineAttempts()).toBe(true);
  });

  it("explicit reset uses isolated local-review scope and leaves guest events intact", async () => {
    const storage = await import("../src/lib/progress-storage"), offline = await import("../src/lib/offline-attempts"); storage.setProgressAccount("local-review");
    items.set("itzli_offline_attempts_v3:local-review:offline:stream-a:1", JSON.stringify([event(1)]));
    items.set("itzli_offline_attempts_v3:guest", "keep");
    expect(offline.clearOfflineAttempts()).toBe(true); expect(items.get("itzli_offline_attempts_v3:guest")).toBe("keep");
  });

  it("reports reset cleanup errors without pretending the pending queue was cleared", async () => {
    const storage = await import("../src/lib/progress-storage"), offline = await import("../src/lib/offline-attempts"); storage.setProgressAccount("alice");
    const key = "itzli_offline_attempts_v3:alice"; items.set(key, JSON.stringify([event(1)])); failCleanup = true;
    expect(offline.clearOfflineAttempts()).toBe(false); expect(items.has(key)).toBe(true);
    expect(offline.hasPendingOfflineAttempts()).toBe(true); failCleanup = false;
    expect(offline.clearOfflineAttempts()).toBe(true); expect(items.has(key)).toBe(false);
  });

  it("detects a removal that silently leaves the pending record behind", async () => {
    const storage = await import("../src/lib/progress-storage"), offline = await import("../src/lib/offline-attempts"); storage.setProgressAccount("alice");
    const key = "itzli_offline_attempts_v3:alice:offline:stream-a:1"; items.set(key, JSON.stringify([event(1)]));
    vi.spyOn(localStorage, "removeItem").mockImplementation(() => undefined);
    expect(offline.clearOfflineAttempts()).toBe(false); expect(items.has(key)).toBe(true);
  });
});
