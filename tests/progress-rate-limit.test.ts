import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn(), getSql: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/neon", () => ({ getSql: mocks.getSql }));
const NOW = Date.parse("2026-10-09T12:30:30.000Z");
const query = (call: unknown[]) => (call[0] as TemplateStringsArray).join("?");
const saved = (minute: unknown, hour: unknown) => [{ window_name: "minute", request_count: minute }, { window_name: "hour", request_count: hour }];
const reset = (hour: unknown, day: unknown) => [{ window_name: "day", request_count: day }, { window_name: "hour", request_count: hour }];
async function load() { return (await import("../src/lib/progress-rate-limit")).checkProgressRateLimit; }

describe("distributed progress mutation counters", () => {
  beforeEach(() => {
    vi.resetModules(); vi.spyOn(Date, "now").mockReturnValue(NOW);
    mocks.sql.mockReset().mockImplementation(async (strings: TemplateStringsArray) => strings.join("").includes("RETURNING") ? saved(1, 1) : []);
    mocks.getSql.mockReset().mockReturnValue(mocks.sql);
  });
  afterEach(() => vi.restoreAllMocks());

  it("imports lazily, advances both windows atomically, parameterizes identity and caps denied counters", async () => {
    const check = await load(); expect(mocks.getSql).not.toHaveBeenCalled();
    expect(await check("user_one", "save")).toEqual({ ok: true });
    const calls = mocks.sql.mock.calls;
    expect(calls).toHaveLength(4);
    expect(query(calls[0])).toContain("PRIMARY KEY (user_id, action_name, window_name, bucket_start)");
    expect(query(calls[1])).toContain("CREATE INDEX IF NOT EXISTS progress_rate_limits_retention");
    expect(query(calls[2])).toContain("DELETE FROM progress_rate_limits");
    expect(calls[2][1]).toBe("2026-10-07T12:30:30.000Z");
    expect(query(calls[3])).toContain("LEAST(progress_rate_limits.request_count + 1, ?)");
    expect(calls[3].slice(1)).toEqual(["user_one", "save", "minute", "2026-10-09T12:30:00.000Z", "user_one", "save", "hour", "2026-10-09T12:00:00.000Z", 1201]);
    expect(query(calls[3])).not.toContain("user_one");
    expect(calls.map(query).join(" ")).not.toMatch(/\b(?:user_progress|email|ip_address|payload)\b/);
  });

  it("allows normal save sync cadence then honors minute and hourly windows separately", async () => {
    const check = await load();
    mocks.sql.mockImplementation(async strings => strings.join("").includes("RETURNING") ? saved(120, 1200) : []);
    expect(await check("user_one", "save")).toEqual({ ok: true });
    mocks.sql.mockImplementation(async strings => strings.join("").includes("RETURNING") ? saved(121, 1200) : []);
    expect(await check("user_one", "save")).toEqual({ ok: false, retryAfterMs: 30000 });
    mocks.sql.mockImplementation(async strings => strings.join("").includes("RETURNING") ? saved(121, 1201) : []);
    expect(await check("user_one", "save")).toEqual({ ok: false, retryAfterMs: 29.5 * 60000 });
  });

  it("isolates reset counters from normal saves and allows ten hourly/twenty daily resets", async () => {
    const check = await load();
    mocks.sql.mockImplementation(async strings => strings.join("").includes("RETURNING") ? reset(10, 20) : []);
    expect(await check("user_two", "reset")).toEqual({ ok: true });
    expect(mocks.sql.mock.calls[3].slice(1)).toEqual(["user_two", "reset", "hour", "2026-10-09T12:00:00.000Z", "user_two", "reset", "day", "2026-10-09T00:00:00.000Z", 21]);
    mocks.sql.mockImplementation(async strings => strings.join("").includes("RETURNING") ? reset(11, 21) : []);
    expect(await check("user_two", "reset")).toEqual({ ok: false, retryAfterMs: (11.5 * 60 - 0.5) * 60000 });
  });

  it("rejects malformed identities before accessing storage", async () => {
    const check = await load();
    for (const id of ["", "a".repeat(129), " user_one", "user\nother", "a';DELETE"]) await expect(check(id, "save")).rejects.toThrow("identity");
    await expect(check("user_one", "constructor" as "save")).rejects.toThrow("identity");
    expect(mocks.getSql).not.toHaveBeenCalled();
  });

  it("retries transient schema errors", async () => {
    const check = await load(); mocks.sql.mockRejectedValueOnce(new Error("setup offline"));
    await expect(check("user_one", "save")).rejects.toThrow("offline");
    expect(await check("user_one", "save")).toEqual({ ok: true });
    expect(mocks.sql.mock.calls.filter(call => query(call).includes("CREATE TABLE"))).toHaveLength(2);
  });

  it("shares setup between concurrent instances of the first request", async () => {
    const check = await load();
    let resolveSetup: (rows: never[]) => void = () => { throw new Error("setup not started"); };
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const statement = strings.join("");
      if (statement.includes("CREATE TABLE")) return new Promise<never[]>(resolve => { resolveSetup = resolve; });
      return Promise.resolve(statement.includes("RETURNING") ? saved(1, 1) : []);
    });
    const first = check("user_one", "save"), second = check("user_two", "save");
    expect(mocks.sql).toHaveBeenCalledTimes(1); resolveSetup([]);
    expect(await Promise.all([first, second])).toEqual([{ ok: true }, { ok: true }]);
    expect(mocks.sql.mock.calls.filter(call => query(call).includes("CREATE TABLE"))).toHaveLength(1);
    expect(mocks.sql.mock.calls.filter(call => query(call).includes("RETURNING"))).toHaveLength(2);
  });

  it.each([[], [{ window_name: "minute", request_count: 1 }], saved(NaN, 1), saved("bad", 1), saved(0, 1), saved(1.5, 1), saved(null, 1), [{ window_name: "minute", request_count: 1 }, { window_name: "minute", request_count: 1 }]].map(rows => ({ rows })))("fails closed on incomplete/corrupt counter results %#", async ({ rows }) => {
    const check = await load(); mocks.sql.mockImplementation(async strings => strings.join("").includes("RETURNING") ? rows : []);
    await expect(check("user_one", "save")).rejects.toThrow(/counter/);
  });
});
