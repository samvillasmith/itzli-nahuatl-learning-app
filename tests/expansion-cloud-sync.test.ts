import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyProgress, emptySrs } from "../src/lib/progress-schema";
import { emptyExpansionSyncState } from "../src/lib/expansion-sync-schema";
import { emptyExpansionProgress, recordExpansionReview, saveExpansionProgress } from "../src/lib/expansion-practice";
const course = (id: string) => ({ schemaVersion: 1 as const, units: { [id]: { completedAt: 100, firstAttemptCorrect: 1, total: 2 } } });
const remote = (id?: string) => ({ progress: emptyProgress(), srs: { ...emptySrs(), ...(id ? { expansion: { ...emptyExpansionSyncState(), course: course(id) } } : {}) } });
const deferred = () => { let resolve!: (value: Response) => void; const promise = new Promise<Response>(done => { resolve = done; }); return { promise, resolve }; };
describe("V3 scoped store cloud migration and isolation", () => {
  beforeEach(() => {
    vi.resetModules(); vi.useFakeTimers();
    const items = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => items.set(key, value), removeItem: (key: string) => items.delete(key) });
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("uploads existing account-scoped completions and vocabulary notebook without a pending marker", async () => {
    localStorage.setItem("itzli_expansion_course_v1:account:alice", JSON.stringify(course("v3-local")));
    const practice = recordExpansionReview(emptyExpansionProgress(), "word-1", "recall", true, 100);
    localStorage.setItem("itzli_expansion_practice_v1:account:alice", JSON.stringify(practice));
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(remote("v3-cloud"))).mockImplementationOnce(async (_input, options) => Response.json(JSON.parse(String(options?.body))));
    const sync = await import("../src/lib/cloudSync");
    await sync.initializeProgressSync("alice");
    expect(sync.getSyncStatus().pending).toBe(true);
    expect(await sync.pushToCloud()).toBe(true);
    const sent = JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body));
    expect(Object.keys(sent.srs.expansion.course.units).sort()).toEqual(["v3-cloud", "v3-local"]);
    expect(sent.srs.expansion.practice.items["word-1"].recall.attempts).toBe(1);
    expect(sync.getSyncStatus().pending).toBe(false);
  });

  it("restores V3 state on a new device and preserves it across module reload", async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json(remote("v3-cloud")));
    let sync = await import("../src/lib/cloudSync");
    await sync.initializeProgressSync("alice");
    expect(JSON.parse(localStorage.getItem("itzli_expansion_course_v1:account:alice")!).units["v3-cloud"]).toBeDefined();
    vi.resetModules();
    sync = await import("../src/lib/cloudSync"); await sync.initializeProgressSync("alice");
    const state = await import("../src/lib/expansion-state");
    expect(state.loadExpansionCourseState().progress.units["v3-cloud"]).toBeDefined();
    expect(sync.getSyncStatus()).toMatchObject({ status: "synced", pending: false });
  });

  it("queues every real course/practice adapter write and keeps guests/local review local", async () => {
    const sync = await import("../src/lib/cloudSync"), state = await import("../src/lib/expansion-state");
    await sync.initializeProgressSync(null);
    state.createExpansionCourseBrowserStorage().setItem("itzli_expansion_course_v1", JSON.stringify(course("v3-guest")));
    await sync.pushToCloud();
    await sync.initializeProgressSync("local-review");
    const practice = state.createExpansionPracticeBrowserStorage();
    expect(saveExpansionProgress(practice, recordExpansionReview(emptyExpansionProgress(), "word-1", "recall", true, 100, "device-a")).status).toBe("ready");
    await sync.pushToCloud(); expect(fetch).not.toHaveBeenCalled();
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(remote()));
    await sync.initializeProgressSync("alice");
    const courseStorage = state.createExpansionCourseBrowserStorage();
    courseStorage.setItem("itzli_expansion_course_v1", JSON.stringify(course("v3-account")));
    expect(sync.getSyncStatus()).toMatchObject({ status: "pending", pending: true });
    expect(state.loadExpansionCourseState().progress.units["v3-guest"]).toBeUndefined();
  });

  it("rejects stale lesson adapters after the learner switches accounts", async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json(remote()));
    const sync = await import("../src/lib/cloudSync"), state = await import("../src/lib/expansion-state");
    await sync.initializeProgressSync("alice");
    const staleCourse = state.createExpansionCourseBrowserStorage(), stalePractice = state.createExpansionPracticeBrowserStorage();
    await sync.initializeProgressSync("bob");
    expect(() => staleCourse.setItem("itzli_expansion_course_v1", JSON.stringify(course("v3-stale")))).toThrow(/account changed/);
    expect(saveExpansionProgress(stalePractice, emptyExpansionProgress()).status).toBe("unavailable");
    expect(state.loadExpansionCourseState().progress.units).toEqual({});
    expect(localStorage.getItem("itzli_expansion_course_v1:account:alice")).toBeNull();
  });

  it("ignores the previous account's late V3 cloud read", async () => {
    const alice = deferred();
    vi.mocked(fetch).mockReturnValueOnce(alice.promise).mockResolvedValueOnce(Response.json(remote("v3-bob")));
    const sync = await import("../src/lib/cloudSync");
    const oldRead = sync.initializeProgressSync("alice"); await sync.initializeProgressSync("bob");
    alice.resolve(Response.json(remote("v3-alice"))); await oldRead;
    const state = await import("../src/lib/expansion-state");
    expect(Object.keys(state.loadExpansionCourseState().progress.units)).toEqual(["v3-bob"]);
    expect(localStorage.getItem("itzli_expansion_course_v1:account:alice")).toBeNull();
  });

  it.each(["itzli_expansion_course_v1", "itzli_expansion_practice_v1"])("keeps malformed %s untouched and blocks every upload", async key => {
    localStorage.setItem(`${key}:account:alice`, "{invalid-original");
    vi.mocked(fetch).mockResolvedValue(Response.json(remote("v3-cloud")));
    const sync = await import("../src/lib/cloudSync");
    await sync.initializeProgressSync("alice"); expect(await sync.pushToCloud()).toBe(false);
    expect(localStorage.getItem(`${key}:account:alice`)).toBe("{invalid-original");
    expect(vi.mocked(fetch).mock.calls.every(([, options]) => !options?.method)).toBe(true);
    expect(sync.getSyncStatus().status).toBe("error");
  });

  it("retains pending V3 data when a save response omits the extension or loses a lesson", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(remote())).mockResolvedValueOnce(Response.json(remote())).mockResolvedValueOnce(Response.json(remote("v3-other")));
    const sync = await import("../src/lib/cloudSync"), state = await import("../src/lib/expansion-state");
    await sync.initializeProgressSync("alice");
    state.createExpansionCourseBrowserStorage().setItem("itzli_expansion_course_v1", JSON.stringify(course("v3-local")));
    expect(await sync.pushToCloud()).toBe(false); expect(await sync.retryProgressSync()).toBe(false);
    expect(sync.getSyncStatus()).toMatchObject({ status: "error", pending: true });
    expect(state.loadExpansionCourseState().progress.units["v3-local"]).toBeDefined();
  });

  it("retains new completions made while a valid upload acknowledgement is in flight", async () => {
    const uploaded = deferred();
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(remote())).mockReturnValueOnce(uploaded.promise);
    const sync = await import("../src/lib/cloudSync"), state = await import("../src/lib/expansion-state");
    await sync.initializeProgressSync("alice");
    const storage = state.createExpansionCourseBrowserStorage();
    storage.setItem("itzli_expansion_course_v1", JSON.stringify(course("v3-first")));
    const upload = sync.pushToCloud(), sent = JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body));
    storage.setItem("itzli_expansion_course_v1", JSON.stringify({ schemaVersion: 1, units: { ...course("v3-first").units, ...course("v3-second").units } }));
    uploaded.resolve(Response.json(sent)); await upload;
    expect(Object.keys(state.loadExpansionCourseState().progress.units).sort()).toEqual(["v3-first", "v3-second"]);
    expect(sync.getSyncStatus().pending).toBe(true);
  });

  it("explicit reset clears V2 and V3 stores for only the selected owner and blocks late restore", async () => {
    const late = deferred();
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(remote("v3-alice"))).mockReturnValueOnce(late.promise).mockResolvedValueOnce(Response.json({ ok: true }));
    localStorage.setItem("itzli_expansion_course_v1:account:bob", JSON.stringify(course("v3-bob")));
    const sync = await import("../src/lib/cloudSync"), p = await import("../src/lib/progress");
    await sync.initializeProgressSync("alice"); const read = sync.pullAndMerge();
    expect(await sync.deleteCloudProgress()).toBe(true); p.resetProgress();
    late.resolve(Response.json(remote("v3-alice"))); await read;
    expect(localStorage.getItem("itzli_expansion_course_v1:account:alice")).toBeNull();
    expect(localStorage.getItem("itzli_expansion_practice_v1:account:alice")).toBeNull();
    expect(localStorage.getItem("itzli_srs_v2:account:alice")).toBeNull();
    expect(JSON.parse(localStorage.getItem("itzli_expansion_course_v1:account:bob")!).units["v3-bob"]).toBeDefined();
  });

  it("does not silently overwrite unknown future cloud V3 schemas", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ ...remote(), srs: { ...emptySrs(), expansion: { ...emptyExpansionSyncState(), version: 99 } } }));
    const sync = await import("../src/lib/cloudSync");
    await sync.initializeProgressSync("alice"); expect(await sync.pushToCloud()).toBe(false);
    expect(vi.mocked(fetch).mock.calls.every(([, options]) => !options?.method)).toBe(true);
    expect(sync.getSyncStatus().status).toBe("error");
  });
  it("keeps local work pending when the API rejects an oversized notebook", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(remote())).mockResolvedValueOnce(new Response(null, { status: 413 }));
    const sync = await import("../src/lib/cloudSync"), state = await import("../src/lib/expansion-state");
    await sync.initializeProgressSync("alice");
    state.createExpansionCourseBrowserStorage().setItem("itzli_expansion_course_v1", JSON.stringify(course("v3-local")));
    expect(await sync.pushToCloud()).toBe(false);
    expect(sync.getSyncStatus()).toMatchObject({ status: "error", pending: true });
    expect(state.loadExpansionCourseState().progress.units["v3-local"]).toBeDefined();
  });
  it("preserves incoming V3 work but never claims success when local storage is full", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(remote("v3-cloud")));
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => { throw new Error("QuotaExceeded"); }, removeItem: () => {} });
    const sync = await import("../src/lib/cloudSync");
    await sync.initializeProgressSync("alice");
    expect(sync.getSyncStatus().status).toBe("error");
    expect(await sync.pushToCloud()).toBe(false);
    expect(vi.mocked(fetch).mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });
  it("keeps V2-only memory fallback usable when no V3 persistence is required", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(remote()));
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => { throw new Error("QuotaExceeded"); }, removeItem: () => {} });
    const sync = await import("../src/lib/cloudSync"); await sync.initializeProgressSync("alice");
    expect(sync.getSyncStatus().status).toBe("synced");
  });
});
