import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { CURRICULUM_REVISION, emptyProgress, emptySrs, type UnitProgress } from "../src/lib/progress-schema";

const unit = (): UnitProgress => ({ status: "completed", completedChunks: 2, totalChunks: 2, lastCorrect: 1, lastTotal: 1, completedAt: 10, curriculumRevision: CURRICULUM_REVISION });
const remote = (units: Record<string, UnitProgress> = {}) => ({ progress: { ...emptyProgress(), units }, srs: emptySrs() });
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };

describe("progress client hydration and retry", () => {
  beforeEach(() => {
    vi.resetModules(); vi.useFakeTimers();
    const items = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => items.set(key, value), removeItem: (key: string) => items.delete(key) });
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("does not send cloud requests for guest or local-review identities", async () => {
    const sync = await import("../src/lib/cloudSync"), p = await import("../src/lib/progress");
    await sync.initializeProgressSync(null); p.markChunkDone(1, 0, 2, 1, 1); await sync.pushToCloud();
    await sync.initializeProgressSync("local-review"); p.markChunkDone(2, 0, 2, 1, 1); await sync.retryProgressSync();
    expect(fetch).not.toHaveBeenCalled(); expect(sync.getSyncStatus().status).toBe("local");
    expect(p.loadProgress().units["1"]).toBeUndefined(); expect(p.loadProgress().units["2"]).toBeDefined();
  });

  it("does not upload an empty snapshot after hydration fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));
    const sync = await import("../src/lib/cloudSync"), p = await import("../src/lib/progress");
    await sync.initializeProgressSync("alice"); p.markChunkDone(1, 0, 2, 1, 1);
    expect(await sync.pushToCloud()).toBe(false);
    expect(vi.mocked(fetch).mock.calls.every(([, options]) => !options?.method)).toBe(true);
    expect(p.loadProgress().units["1"]?.completedChunks).toBe(1);
    expect(sync.getSyncStatus()).toMatchObject({ status: "error", pending: true });
    expect(localStorage.getItem("itzli_progress_pending_v3:account:alice")).toBe("1");
  });

  it("keeps local work created while the first cloud load is in flight", async () => {
    const response = deferred<Response>(); vi.mocked(fetch).mockReturnValue(response.promise);
    const sync = await import("../src/lib/cloudSync"), p = await import("../src/lib/progress");
    const init = sync.initializeProgressSync("alice"); p.markChunkDone(2, 0, 2, 1, 1);
    response.resolve(Response.json(remote({ "1": unit() }))); await init;
    expect(Object.keys(p.loadProgress().units).sort()).toEqual(["1", "2"]);
    expect(sync.getSyncStatus()).toMatchObject({ status: "pending", pending: true });
  });

  it("retains pending browser work after a failed upload and clears it only after retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(remote())).mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json(remote({ "1": unit() })));
    const sync = await import("../src/lib/cloudSync"), p = await import("../src/lib/progress");
    await sync.initializeProgressSync("alice"); p.markChunkDone(1, 1, 2, 1, 1);
    expect(await sync.pushToCloud()).toBe(false); expect(sync.getSyncStatus().pending).toBe(true);
    expect(await sync.retryProgressSync()).toBe(true); expect(sync.getSyncStatus()).toMatchObject({ status: "synced", pending: false });
    expect(localStorage.getItem("itzli_progress_pending_v3:account:alice")).toBe("0");
    expect(p.loadProgress().units["1"]?.status).toBe("completed");
  });

  it("ignores the previous account's late cloud response", async () => {
    const alice = deferred<Response>();
    vi.mocked(fetch).mockReturnValueOnce(alice.promise).mockResolvedValueOnce(Response.json(remote({ "2": unit() })));
    const sync = await import("../src/lib/cloudSync"), p = await import("../src/lib/progress");
    const oldLoad = sync.initializeProgressSync("alice"); await sync.initializeProgressSync("bob");
    alice.resolve(Response.json(remote({ "1": unit() }))); await oldLoad;
    expect(p.getProgressAccount()).toBe("bob"); expect(Object.keys(p.loadProgress().units)).toEqual(["2"]);
    p.setProgressAccount("alice"); expect(p.loadProgress().units["1"]).toBeUndefined();
  });

  it("merges the save response with attempts made while the upload is in flight", async () => {
    const upload = deferred<Response>();
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(remote())).mockReturnValueOnce(upload.promise);
    const sync = await import("../src/lib/cloudSync"), learning = await import("../src/lib/learning-state");
    await sync.initializeProgressSync("alice"); learning.recordAttempt("word:35", "recognition", true);
    const push = sync.pushToCloud();
    const sent = JSON.parse(vi.mocked(fetch).mock.calls[1][1]?.body as string);
    learning.recordAttempt("word:35", "recognition", false);
    upload.resolve(Response.json({ ...remote(), learning: sent.learning })); await push;
    expect(learning.getActivityMastery("word:35")).toMatchObject({ correct: 1, total: 2 });
    expect(sync.getSyncStatus()).toMatchObject({ status: "pending", pending: true });
  });
  it("does not let a late read restore progress after an explicit reset", async () => {
    const staleRead = deferred<Response>();
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(remote({ "1": unit() }))).mockReturnValueOnce(staleRead.promise).mockResolvedValueOnce(Response.json({ ok: true }));
    const sync = await import("../src/lib/cloudSync"), p = await import("../src/lib/progress");
    await sync.initializeProgressSync("alice"); const read = sync.pullAndMerge();
    expect(await sync.deleteCloudProgress()).toBe(true); p.resetProgress();
    staleRead.resolve(Response.json(remote({ "1": unit() }))); await read;
    expect(p.loadProgress()).toEqual(emptyProgress());
  });
});
