import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ sql: vi.fn(), getSql: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/neon", () => ({ getSql: mocks.getSql }));
const rows = (burst: unknown, hourly: unknown) => [{ window_name: "burst", request_count: burst }, { window_name: "hourly", request_count: hourly }];
const query = (call: unknown[]) => (call[0] as TemplateStringsArray).join("?");
async function load() { return (await import("../src/lib/rate-limit")).checkRateLimit; }

describe("chat distributed counters", () => {
  beforeEach(() => {
    vi.resetModules(); vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-09T12:35:00Z"));
    mocks.getSql.mockReset().mockReturnValue(mocks.sql);
    mocks.sql.mockReset().mockImplementation(async strings => strings.join("").includes("RETURNING") ? rows(1, 1) : []);
  });
  afterEach(() => vi.restoreAllMocks());

  it("atomically counts both windows, caps counters and retries a transient setup failure", async () => {
    const check = await load(); mocks.sql.mockRejectedValueOnce(new Error("setup offline"));
    await expect(check("user_one")).rejects.toThrow("offline");
    expect((await check("user_one")).ok).toBe(true);
    expect(mocks.sql.mock.calls.filter(call => query(call).includes("CREATE TABLE"))).toHaveLength(2);
    expect(query(mocks.sql.mock.calls[2])).toContain("LEAST(chat_rate_limits.request_count + 1, 101)");
    expect(mocks.sql.mock.calls[2].slice(1)).toEqual(["user_one", "burst", "2026-10-09T12:30:00.000Z", "user_one", "hourly", "2026-10-09T12:00:00.000Z"]);
  });

  it("enforces the existing twenty-burst/one-hundred-hour budgets", async () => {
    const check = await load(); mocks.sql.mockImplementation(async strings => strings.join("").includes("RETURNING") ? rows(20, 100) : []);
    expect((await check("user_one")).ok).toBe(true);
    mocks.sql.mockImplementation(async strings => strings.join("").includes("RETURNING") ? rows(21, 100) : []);
    expect(await check("user_one")).toEqual({ ok: false, window: "burst", retryAfterMs: 5 * 60000 });
    mocks.sql.mockImplementation(async strings => strings.join("").includes("RETURNING") ? rows(1, 101) : []);
    expect(await check("user_one")).toEqual({ ok: false, window: "hourly", retryAfterMs: 25 * 60000 });
  });

  it.each([[], rows(NaN, 1), rows("not-count", 1), rows(-1, 1), rows(null, 1)].map(value => ({ value })))("rejects corrupt counts rather than allowing requests %#", async ({ value }) => {
    const check = await load(); mocks.sql.mockImplementation(async strings => strings.join("").includes("RETURNING") ? value : []);
    await expect(check("user_one")).rejects.toThrow(/counter/);
  });
});
