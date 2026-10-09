import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { CURRICULUM_REVISION, emptyProgress, emptySrs, type UnitProgress } from "../src/lib/progress-schema";
import { emptyLearningState } from "../src/lib/learning-schema";
import { emptyExpansionSyncState } from "../src/lib/expansion-sync-schema";
import { emptyExpansionProgress, mergeExpansionProgress, recordExpansionReview, updateExpansionNotebook } from "../src/lib/expansion-practice";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), sql: vi.fn(), getSql: vi.fn(), limit: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("../src/lib/neon", () => ({ getSql: mocks.getSql }));
vi.mock("../src/lib/progress-rate-limit", () => ({ checkProgressRateLimit: mocks.limit }));
import { GET, POST, DELETE } from "../src/app/api/progress/route";

const finished = (): UnitProgress => ({ status: "completed", completedChunks: 2, totalChunks: 2, lastCorrect: 1, lastTotal: 1, completedAt: 10, curriculumRevision: CURRICULUM_REVISION });
const payload = (units: Record<string, UnitProgress> = {}) => ({ progress: { ...emptyProgress(), units }, srs: emptySrs() });
const request = (body: unknown, headers: Record<string, string> = {}) => new Request("http://localhost/api/progress", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json", Origin: "http://localhost", ...headers } });
const deleteRequest = (headers: Record<string, string> = {}) => new Request("http://localhost/api/progress", { method: "DELETE", headers: { Origin: "http://localhost", ...headers } });
const completedExpansion = (id: string, at = 100) => ({ schemaVersion: 1 as const, units: { [id]: { completedAt: at, firstAttemptCorrect: 2, total: 3, lessonRevision: "reference-v1" } } });
function production() { vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "production"); }

describe("progress API preservation boundary", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL", ""); vi.stubEnv("VERCEL_ENV", ""); vi.stubEnv("ITZLI_LOCAL_REVIEW", ""); vi.stubEnv("ITZLI_CLOUD_PROGRESS_ENABLED", "");
    mocks.auth.mockReset().mockResolvedValue({ userId: "learner-a" });
    mocks.sql.mockReset(); mocks.getSql.mockReset().mockReturnValue(mocks.sql);
    mocks.limit.mockReset().mockResolvedValue({ ok: true });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("keeps local and preview requests away from authentication and database access", async () => {
    expect((await GET()).status).toBe(200);
    expect((await POST(request(payload()))).status).toBe(403);
    expect((await DELETE(deleteRequest())).status).toBe(403);
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "preview");
    expect(await (await GET()).json()).toMatchObject({ mode: "local" });
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("ITZLI_LOCAL_REVIEW", "1"); vi.stubEnv("VERCEL", ""); vi.stubEnv("ITZLI_CLOUD_PROGRESS_ENABLED", "1");
    expect((await POST(request(payload()))).status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.getSql).not.toHaveBeenCalled();
  });

  it("keeps the production authentication requirement", async () => {
    production(); mocks.auth.mockResolvedValue({ userId: null });
    expect((await GET()).status).toBe(401);
    expect((await POST(request(payload()))).status).toBe(401);
    expect((await DELETE(deleteRequest())).status).toBe(401);
    expect(mocks.getSql).not.toHaveBeenCalled();
  });

  it("accepts an old v2 client without erasing existing units or additive learning state", async () => {
    production(); const learning = emptyLearningState(); learning.completed["scenario:greeting"] = 15;
    mocks.sql.mockResolvedValueOnce([{ ...payload({ "1": finished() }), srs: { ...emptySrs(), learning }, revision: "r1" }]).mockResolvedValueOnce([{ revision: "r2" }]);
    const res = await POST(request({ ...payload({ "2": finished() }), userId: "someone-else" }));
    const body = await res.json();
    expect(res.status).toBe(200); expect(Object.keys(body.progress.units)).toEqual(["1", "2"]);
    expect(body.learning.completed["scenario:greeting"]).toBe(15);
    const update = mocks.sql.mock.calls[1];
    expect(update[3]).toBe("learner-a"); expect(update[4]).toBe("r1");
    expect(JSON.parse(update[2]).learning.completed["scenario:greeting"]).toBe(15);
  });

  it("rereads and merges a concurrent save instead of overwriting its unit", async () => {
    production();
    mocks.sql.mockResolvedValueOnce([{ ...payload({ "1": finished() }), revision: "r1" }]).mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...payload({ "1": finished(), "3": finished() }), revision: "r2" }]).mockResolvedValueOnce([{ revision: "r3" }]);
    const res = await POST(request(payload({ "2": finished() }))), body = await res.json();
    expect(res.status).toBe(200); expect(Object.keys(body.progress.units).sort()).toEqual(["1", "2", "3"]);
    expect(mocks.sql).toHaveBeenCalledTimes(4); expect(mocks.sql.mock.calls[3][4]).toBe("r2");
  });

  it("restores V3 completions, practice and vocabulary notes through the existing authenticated GET", async () => {
    production();
    const practice = updateExpansionNotebook(recordExpansionReview(emptyExpansionProgress(), "word-1", "recall", true, 100, "device-a"), "word-1", { bookmarked: true, note: "My vocabulary note" }, 200);
    const expansion = { ...emptyExpansionSyncState(), course: completedExpansion("v3-first"), practice };
    const stored = { ...payload({ "1": finished() }), srs: { ...emptySrs(), expansion }, revision: "r1" };
    const before = JSON.stringify(stored);
    mocks.sql.mockResolvedValue([stored]);
    const res = await GET(), body = await res.json();
    expect(res.status).toBe(200);
    expect(body.progress.units["1"].status).toBe("completed");
    expect(body.srs.expansion).toEqual(expansion);
    expect(res.headers.get("cache-control")).toContain("private, no-store");
    expect(mocks.sql).toHaveBeenCalledTimes(1);
    expect(mocks.sql.mock.calls[0][0].join(" ")).toContain("SELECT");
    expect(mocks.sql.mock.calls[0][1]).toBe("learner-a");
    expect(JSON.stringify(stored)).toBe(before);
  });

  it("keeps stored V3 badges and notebook when an old V2 save omits the entire extension", async () => {
    production();
    const practice = updateExpansionNotebook(emptyExpansionProgress(), "word-1", { bookmarked: true, note: "Keep my notebook" }, 100);
    const expansion = { ...emptyExpansionSyncState(), course: completedExpansion("v3-earned"), practice };
    mocks.sql.mockResolvedValueOnce([{ ...payload({ "1": finished() }), srs: { ...emptySrs(), expansion }, revision: "r1" }])
      .mockResolvedValueOnce([{ revision: "r2" }]);
    const res = await POST(request(payload({ "2": finished() }))), body = await res.json();
    expect(res.status).toBe(200);
    expect(Object.keys(body.progress.units).sort()).toEqual(["1", "2"]);
    expect(body.srs.expansion).toEqual(expansion);
    expect(JSON.parse(mocks.sql.mock.calls[1][2]).expansion).toEqual(expansion);
  });

  it("retries concurrent V3 writes and retains every badge and independently recorded attempt", async () => {
    production();
    const a = recordExpansionReview(emptyExpansionProgress(), "word-1", "recall", true, 100, "device-a");
    const b = recordExpansionReview(emptyExpansionProgress(), "word-1", "recall", false, 200, "device-b");
    const c = recordExpansionReview(emptyExpansionProgress(), "word-1", "recall", true, 300, "device-c");
    const original = { ...emptyExpansionSyncState(), course: completedExpansion("v3-first"), practice: a };
    const concurrent = { ...original, course: { schemaVersion: 1 as const, units: { ...original.course.units, ...completedExpansion("v3-third").units } }, practice: mergeExpansionProgress(a, b) };
    const incoming = { ...emptyExpansionSyncState(), course: completedExpansion("v3-second"), practice: c };
    const latest = { ...payload({ "1": finished() }), srs: { ...emptySrs(), expansion: concurrent }, revision: "r2" };
    const before = JSON.stringify(latest);
    mocks.sql.mockResolvedValueOnce([{ ...payload(), srs: { ...emptySrs(), expansion: original }, revision: "r1" }]).mockResolvedValueOnce([])
      .mockResolvedValueOnce([latest]).mockResolvedValueOnce([{ revision: "r3" }]);
    const res = await POST(request({ ...payload({ "2": finished() }), srs: { ...emptySrs(), expansion: incoming } })), body = await res.json();
    expect(res.status).toBe(200);
    expect(Object.keys(body.progress.units).sort()).toEqual(["1", "2"]);
    expect(Object.keys(body.srs.expansion.course.units).sort()).toEqual(["v3-first", "v3-second", "v3-third"]);
    expect(body.srs.expansion.practice.items["word-1"].recall).toMatchObject({ attempts: 3, successes: 2 });
    expect(mocks.sql).toHaveBeenCalledTimes(4);
    expect(mocks.sql.mock.calls[3][4]).toBe("r2");
    expect(JSON.parse(mocks.sql.mock.calls[3][2]).expansion).toEqual(body.srs.expansion);
    expect(JSON.stringify(latest)).toBe(before);
  });

  it("rejects malformed or future V3 requests before reading or writing learner storage", async () => {
    production();
    for (const expansion of [null, { ...emptyExpansionSyncState(), version: 99 }, { ...emptyExpansionSyncState(), course: null },
      { ...emptyExpansionSyncState(), practice: { version: 1, items: { "word-1": {} } } }]) {
      const res = await POST(request({ ...payload(), srs: { ...emptySrs(), expansion } }));
      expect(res.status).toBe(400);
    }
    expect(mocks.getSql).not.toHaveBeenCalled();
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("preserves an unreadable historical V3 row for recovery even when a V2 client sends valid work", async () => {
    production();
    const stored = { ...payload({ "1": finished() }), srs: { ...emptySrs(), expansion: { ...emptyExpansionSyncState(), version: 99 } }, revision: "r1" };
    const before = JSON.stringify(stored);
    mocks.sql.mockResolvedValue([stored]);
    expect((await GET()).status).toBe(409);
    expect((await POST(request(payload({ "2": finished() })))).status).toBe(409);
    expect(mocks.sql).toHaveBeenCalledTimes(2);
    expect(mocks.sql.mock.calls.every(call => call[0].join(" ").includes("SELECT"))).toBe(true);
    expect(JSON.stringify(stored)).toBe(before);
  });

  it("refuses a V3 union beyond its completion bound without changing either saved copy", async () => {
    production();
    const course = { schemaVersion: 1 as const, units: Object.fromEntries(Array.from({ length: 1000 }, (_, n) => [`v3-${n}`, completedExpansion("v3-first").units["v3-first"]])) };
    const stored = { ...payload(), srs: { ...emptySrs(), expansion: { ...emptyExpansionSyncState(), course } }, revision: "r1" };
    const before = JSON.stringify(stored);
    mocks.sql.mockResolvedValue([stored]);
    const incoming = { ...payload(), srs: { ...emptySrs(), expansion: { ...emptyExpansionSyncState(), course: completedExpansion("v3-new") } } };
    expect((await POST(request(incoming))).status).toBe(409);
    expect(mocks.sql).toHaveBeenCalledTimes(1);
    expect(mocks.sql.mock.calls[0][0].join(" ")).toContain("SELECT");
    expect(JSON.stringify(stored)).toBe(before);
    expect(incoming.srs.expansion.course.units["v3-new"]).toBeDefined();
  });

  it("retries a simultaneous first-row insertion without replacing the other first save", async () => {
    production();
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...payload({ "3": finished() }), revision: "r1" }]).mockResolvedValueOnce([{ revision: "r2" }]);
    const res = await POST(request(payload({ "2": finished() })));
    expect(Object.keys((await res.json()).progress.units).sort()).toEqual(["2", "3"]);
    expect(mocks.sql.mock.calls[1][0].join(" ")).toContain("ON CONFLICT (user_id) DO NOTHING");
  });

  it("refuses to overwrite an unreadable historical row", async () => {
    production(); mocks.sql.mockResolvedValue([{ progress: { version: 99, units: {} }, srs: emptySrs(), revision: "r1" }]);
    expect((await POST(request(payload({ "2": finished() })))).status).toBe(409);
    expect(mocks.sql).toHaveBeenCalledTimes(1);
    expect(mocks.sql.mock.calls[0][0].join(" ")).toContain("SELECT");
    expect((await GET()).status).toBe(409);
  });

  it("rejects malformed and oversized payloads before opening storage", async () => {
    production();
    expect((await POST(request({ progress: { version: 2, units: {} }, srs: { version: 2, words: { "1:v:35": { correct: 2, total: 1 } } } }))).status).toBe(400);
    const oversized = new Request("http://localhost/api/progress", { method: "POST", body: "{}", headers: { Origin: "http://localhost", "Content-Type": "application/json", "Content-Length": String(2 * 1024 * 1024 + 1) } });
    expect((await POST(oversized)).status).toBe(413);
    expect(mocks.getSql).not.toHaveBeenCalled();
  });
  it("does not save a merged snapshot that exceeds schema limits", async () => {
    production();
    const words = Object.fromEntries(Array.from({ length: 10_000 }, (_, n) => [`1:v:${n}`, { correct: 1, total: 1 }]));
    mocks.sql.mockResolvedValue([{ ...payload(), srs: { version: 2, words }, revision: "r1" }]);
    const res = await POST(request({ ...payload(), srs: { version: 2, words: { "2:v:20000": { correct: 1, total: 1 } } } }));
    expect(res.status).toBe(409); expect(mocks.sql).toHaveBeenCalledTimes(1);
  });

  it("rejects foreign browser writes, form submissions and resets before authentication or storage", async () => {
    production();
    const rejected: Record<string, string>[] = [{ Origin: "https://foreign.example" }, { Origin: "null" }, { Origin: "" }, { "Sec-Fetch-Site": "cross-site" }];
    for (const headers of rejected) {
      expect((await POST(request(payload(), headers))).status).toBe(403);
      expect((await DELETE(deleteRequest(headers))).status).toBe(403);
    }
    expect((await POST(request(payload(), { "Content-Type": "text/plain" }))).status).toBe(415);
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.limit).not.toHaveBeenCalled(); expect(mocks.getSql).not.toHaveBeenCalled();
  });

  it("rate-limits only authenticated mutations with separate save/reset buckets and fails closed", async () => {
    production(); mocks.limit.mockResolvedValue({ ok: false, retryAfterMs: 30001 });
    const saved = await POST(request(payload())); expect(saved.status).toBe(429); expect(saved.headers.get("retry-after")).toBe("31");
    expect(mocks.limit).toHaveBeenLastCalledWith("learner-a", "save");
    const reset = await DELETE(deleteRequest()); expect(reset.status).toBe(429);
    expect(mocks.limit).toHaveBeenLastCalledWith("learner-a", "reset");
    mocks.limit.mockRejectedValue(new Error("counter unavailable"));
    expect((await POST(request(payload()))).status).toBe(503);
    expect((await DELETE(deleteRequest())).status).toBe(503);
    expect(mocks.getSql).not.toHaveBeenCalled();
    mocks.sql.mockResolvedValue([]); expect((await GET()).status).toBe(200);
    expect(mocks.limit).toHaveBeenCalledTimes(4);
  });

  it("never lets a preview opt-in contact the live progress store", async () => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("ITZLI_CLOUD_PROGRESS_ENABLED", "1");
    expect((await POST(request(payload()))).status).toBe(403);
    expect((await DELETE(deleteRequest())).status).toBe(403);
    expect(await (await GET()).json()).toMatchObject({ mode: "local" });
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.limit).not.toHaveBeenCalled(); expect(mocks.getSql).not.toHaveBeenCalled();
  });
});
