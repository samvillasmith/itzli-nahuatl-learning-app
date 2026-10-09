import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { CURRICULUM_REVISION, emptyProgress, emptySrs, parseSrsData, type UnitProgress } from "../src/lib/progress-schema";
import { mergeProgressData, mergeSrsData } from "../src/lib/progress-merge";
import { activityCounts, emptyLearningState, emptyReviewState, learningActivityKey, mergeLearningStates, scheduleReview } from "../src/lib/learning-schema";

const finished = (extra: Partial<UnitProgress> = {}): UnitProgress => ({ status: "completed", completedChunks: 5, totalChunks: 5, lastCorrect: 4, lastTotal: 5, completedAt: 10, curriculumRevision: CURRICULUM_REVISION, ...extra });
describe("progress preservation merges", () => {
  it("retains disjoint units and never demotes an earned completion", () => {
    const merged = mergeProgressData({ version: 2, units: { "7": finished() } }, { version: 2, units: { "7": finished({ status: "in_progress", completedChunks: 1, completedAt: null, updatedAt: 100 }), "8": finished() } });
    expect(merged.units["7"]?.status).toBe("completed");
    expect(merged.units["7"]?.completedAt).toBe(10);
    expect(merged.units["8"]?.status).toBe("completed");
  });
  it("keeps both devices' new attempts and makes duplicate sync idempotent", () => {
    const a = { version: 2 as const, words: { "7:v:35": { correct: 11, total: 11, base: { correct: 10, total: 10 }, devices: { a: { correct: 1, total: 1 } } } } };
    const b = { version: 2 as const, words: { "7:v:35": { correct: 10, total: 11, base: { correct: 10, total: 10 }, devices: { b: { correct: 0, total: 1 } } } } };
    const merged = mergeSrsData(a, b);
    expect(merged.words["7:v:35"]).toMatchObject({ correct: 11, total: 12 });
    expect(mergeSrsData(merged, a)).toEqual(merged);
    expect(parseSrsData(merged)).toEqual(merged);
  });
  it("does not let an old client erase learning state or unmapped legacy results", () => {
    const learning = emptyLearningState(); learning.completed["scenario:introduction"] = 123;
    const merged = mergeSrsData({ ...emptySrs(), learning, legacyWords: { "7:0": { correct: 2, total: 3 } } }, emptySrs());
    expect(merged.learning?.completed["scenario:introduction"]).toBe(123);
    expect(merged.legacyWords?.["7:0"]).toEqual({ correct: 2, total: 3 });
  });
});

describe("review schedule", () => {
  it("spaces successful recall and brings a failed recall back tomorrow", () => {
    const first = scheduleReview(emptyReviewState(), true, 100);
    expect(first.dueAt).toBe(100 + 86_400_000);
    const second = scheduleReview(first, true, first.dueAt);
    expect(second.intervalDays).toBe(3);
    const failed = scheduleReview(second, false, second.dueAt);
    expect(failed.intervalDays).toBe(1);
    expect(failed.successfulStreak).toBe(0);
    expect(failed.lapses).toBe(1);
  });
  it("merges cumulative device counts and deduplicates attempt events", () => {
    const a = emptyLearningState(), b = emptyLearningState(), key = learningActivityKey("word:35", "recognition");
    a.activities[key] = { activityId: "word:35", skill: "recognition", devices: { a: { correct: 2, total: 3 } }, review: scheduleReview(emptyReviewState(), true, 10) };
    b.activities[key] = { activityId: "word:35", skill: "recognition", devices: { b: { correct: 1, total: 1 } }, review: scheduleReview(emptyReviewState(), false, 20) };
    a.attempts["attempt-a"] = { id: "attempt-a", activityId: "word:35", skill: "recognition", correct: true, at: 10 };
    b.attempts["attempt-a"] = a.attempts["attempt-a"];
    const merged = mergeLearningStates(a, b);
    expect(activityCounts(merged.activities[key])).toEqual({ correct: 3, total: 4 });
    expect(Object.keys(merged.attempts)).toHaveLength(1);
    expect(merged.activities[key].review.lastReviewedAt).toBe(20);
    expect(mergeLearningStates(merged, a)).toEqual(merged);
  });
});

describe("account-scoped browser persistence", () => {
  beforeEach(() => {
    vi.resetModules(); vi.useFakeTimers();
    const items = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => items.set(key, value), removeItem: (key: string) => items.delete(key) });
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  it("requires explicit import and never passes another account's work across a shared browser", async () => {
    const p = await import("../src/lib/progress");
    const old = JSON.stringify({ version: 2, units: { "7": finished() } });
    localStorage.setItem("itzli_progress_v2", old);
    p.setProgressAccount("alice");
    expect(p.loadProgress()).toEqual(emptyProgress());
    expect(p.hasUnclaimedLegacyProgress()).toBe(true);
    expect(p.claimLegacyProgress()).toBe(true);
    expect(p.loadProgress().units["7"]?.status).toBe("completed");
    p.setProgressAccount("bob");
    expect(p.loadProgress()).toEqual(emptyProgress());
    expect(p.claimLegacyProgress()).toBe(false);
    p.setProgressAccount("alice"); p.resetProgress();
    expect(localStorage.getItem("itzli_progress_v2")).toBe(old);
  });
  it("preserves completion when repeating a smaller unit", async () => {
    const p = await import("../src/lib/progress"); p.setProgressAccount("alice");
    p.saveProgress({ version: 2, units: { "7": finished() } });
    p.markChunkDone(7, 0, 4, 1, 1);
    expect(p.loadProgress().units["7"]).toMatchObject({ status: "completed", completedChunks: 4, totalChunks: 4, completedAt: 10 });
    expect(p.loadProgress().units["7"]?.completionHistory?.some((item) => item.totalChunks === 5)).toBe(true);
  });
  it("projects historical counters without inventing dates or double-counting new practice", async () => {
    const p = await import("../src/lib/progress"), learning = await import("../src/lib/learning-state");
    p.setProgressAccount("alice");
    p.saveSrs({ version: 2, words: { "7:v:35": { correct: 10, total: 12 } } });
    expect(learning.getDueReviews(0)).toMatchObject([{ activityId: "word:35", dueAt: 0, lastReviewedAt: 0, correct: 10, total: 12 }]);
    p.recordWordResult(7, "v:35", true);
    expect(p.loadSrs().words["7:v:35"]).toMatchObject({ correct: 11, total: 13 });
    expect(learning.getActivityMastery("word:35")).toMatchObject({ correct: 11, total: 13 });
    expect(learning.getDueReviews(Date.now())).toEqual([]);
    learning.markActivityCompleted("scenario:introduction");
    expect(learning.getActivityMastery("scenario:introduction").completed).toBe(true);
  });
  it("offers explicit import when only historical word practice is present", async () => {
    const p = await import("../src/lib/progress"); p.setProgressAccount("alice");
    localStorage.setItem("itzli_srs_v1", JSON.stringify({ version: 1, words: { "7:0": { correct: 2, total: 3 } } }));
    expect(p.hasUnclaimedLegacyProgress()).toBe(true);
    expect(p.claimLegacyProgress()).toBe(true);
    expect(p.loadSrs().legacyWords?.["7:0"]).toEqual({ correct: 2, total: 3 });
  });
  it("keeps unreadable snapshots available for recovery", async () => {
    const p = await import("../src/lib/progress"), learning = await import("../src/lib/learning-state"); p.setProgressAccount("alice");
    localStorage.setItem("itzli_progress_v2:account:alice", "{invalid");
    localStorage.setItem("itzli_learning_v1:account:alice", "{invalid-learning");
    expect(p.loadProgress()).toEqual(emptyProgress()); learning.loadLearningState();
    expect(localStorage.getItem("itzli_progress_recovery_v3:account:alice")).toBe("{invalid");
    expect(localStorage.getItem("itzli_learning_recovery_v3:account:alice")).toBe("{invalid-learning");
  });
  it("bounds recent attempt history without dropping lifetime counters", async () => {
    const p = await import("../src/lib/progress"), learning = await import("../src/lib/learning-state"); p.setProgressAccount("alice");
    for (let n = 0; n < 501; n++) learning.recordAttempt("word:35", "recognition", true);
    expect(Object.keys(learning.loadLearningState().attempts)).toHaveLength(500);
    expect(learning.getActivityMastery("word:35")).toMatchObject({ correct: 501, total: 501 });
  });
});
