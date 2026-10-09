import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn(), getSql: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/neon", () => ({ getSql: mocks.getSql }));

const NOW = new Date("2026-10-06T12:30:00.000Z").getTime();
const counts = (hourly: unknown, daily: unknown) => [
  { window_name: "daily", request_count: daily },
  { window_name: "hourly", request_count: hourly },
];
const query = (call: unknown[]) => (call[0] as TemplateStringsArray).join("?");

async function loadLimiter() {
  return (await import("../src/lib/content-report-rate-limit")).checkContentReportRateLimit;
}

describe("persistent content-report limits", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    mocks.sql.mockReset();
    mocks.getSql.mockReset().mockReturnValue(mocks.sql);
  });
  afterEach(() => vi.restoreAllMocks());

  it("imports lazily and stores only isolated counters with one atomic increment for both windows", async () => {
    const check = await loadLimiter();
    expect(mocks.getSql).not.toHaveBeenCalled();
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce(counts(1, 1));
    expect(await check("user_one")).toEqual({ ok: true });
    const calls = mocks.sql.mock.calls;
    expect(calls).toHaveLength(3);
    expect(query(calls[0])).toContain("CREATE TABLE IF NOT EXISTS content_report_rate_limits");
    expect(query(calls[0])).toContain("PRIMARY KEY (user_id, window_name, bucket_start)");
    expect(query(calls[1])).toContain("DELETE FROM content_report_rate_limits");
    expect(calls[1][1]).toBe("2026-09-29T12:30:00.000Z");
    expect(query(calls[2])).toContain("ON CONFLICT (user_id, window_name, bucket_start)");
    expect(query(calls[2])).toContain("content_report_rate_limits.request_count + 1");
    expect(query(calls[2])).toContain("'hourly'");
    expect(query(calls[2])).toContain("'daily'");
    expect(calls[2].slice(1)).toEqual(["user_one", "2026-10-06T12:00:00.000Z", "user_one", "2026-10-06T00:00:00.000Z"]);
    for (const call of calls) {
      expect(query(call)).not.toMatch(/\b(?:user_progress|chat_rate_limits|chat_audit|email|report_body|ip_address)\b/);
    }
  });

  it("allows exactly six hourly and twenty daily attempts, then returns the applicable bucket reset", async () => {
    const check = await loadLimiter();
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce(counts(6, 20));
    expect(await check("user_one")).toEqual({ ok: true });
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce(counts(7, 20));
    expect(await check("user_one")).toEqual({ ok: false, retryAfterMs: 30 * 60 * 1000 });
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce(counts(6, 21));
    expect(await check("user_one")).toEqual({ ok: false, retryAfterMs: (11 * 60 + 30) * 60 * 1000 });
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce(counts(7, 21));
    expect(await check("user_one")).toEqual({ ok: false, retryAfterMs: (11 * 60 + 30) * 60 * 1000 });
    expect(mocks.sql.mock.calls.filter(call => query(call).includes("CREATE TABLE"))).toHaveLength(1);
  });

  it("uses fresh buckets at the hourly and UTC daily boundaries", async () => {
    const check = await loadLimiter();
    vi.mocked(Date.now).mockReturnValue(new Date("2026-10-07T00:00:00.000Z").getTime());
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce(counts("7", "21"));
    expect(await check("user_two")).toEqual({ ok: false, retryAfterMs: 24 * 60 * 60 * 1000 });
    expect(mocks.sql.mock.calls[2].slice(1)).toEqual(["user_two", "2026-10-07T00:00:00.000Z", "user_two", "2026-10-07T00:00:00.000Z"]);
  });

  it("rejects oversized or malformed account identifiers before opening storage", async () => {
    const check = await loadLimiter();
    for (const id of ["", "a".repeat(65), " user_one", "user_one ", "user\nother", "user\0other", null as unknown as string]) {
      await expect(check(id)).rejects.toThrow("Invalid report account ID");
    }
    expect(mocks.getSql).not.toHaveBeenCalled();
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("accepts the maximum account length and keeps IDs as SQL parameters", async () => {
    const check = await loadLimiter();
    const id = "u".repeat(64);
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce(counts(1, 1));
    expect(await check(id)).toEqual({ ok: true });
    expect(mocks.sql.mock.calls[2][1]).toBe(id);
    expect(query(mocks.sql.mock.calls[2])).not.toContain(id);
  });

  it("retries lazy table setup after a transient creation failure", async () => {
    const check = await loadLimiter();
    mocks.sql.mockRejectedValueOnce(new Error("setup unavailable"));
    await expect(check("user_one")).rejects.toThrow("setup unavailable");
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce(counts(1, 1));
    expect(await check("user_one")).toEqual({ ok: true });
    expect(mocks.sql.mock.calls.filter(call => query(call).includes("CREATE TABLE"))).toHaveLength(2);
  });

  it("shares a single pending setup between concurrent first requests", async () => {
    const check = await loadLimiter();
    let resolveSetup: (rows: never[]) => void = () => { throw new Error("setup not started"); };
    mocks.sql.mockImplementation((strings: TemplateStringsArray) => {
      const text = strings.join("?");
      if (text.includes("CREATE TABLE")) return new Promise<never[]>(resolve => { resolveSetup = resolve; });
      return Promise.resolve(text.includes("RETURNING") ? counts(1, 1) : []);
    });
    const first = check("user_one");
    const second = check("user_two");
    expect(mocks.sql).toHaveBeenCalledTimes(1);
    resolveSetup([]);
    expect(await Promise.all([first, second])).toEqual([{ ok: true }, { ok: true }]);
    expect(mocks.sql.mock.calls.filter(call => query(call).includes("CREATE TABLE"))).toHaveLength(1);
    expect(mocks.sql.mock.calls.filter(call => query(call).includes("RETURNING"))).toHaveLength(2);
  });

  it("propagates cleanup and increment failures instead of allowing an uncounted send", async () => {
    const check = await loadLimiter();
    mocks.sql.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("cleanup unavailable"));
    await expect(check("user_one")).rejects.toThrow("cleanup unavailable");
    expect(mocks.sql).toHaveBeenCalledTimes(2);
    mocks.sql.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("increment unavailable"));
    await expect(check("user_one")).rejects.toThrow("increment unavailable");
  });

  it.each([
    [],
    [{ window_name: "hourly", request_count: 1 }],
    [{ window_name: "hourly", request_count: 1 }, { window_name: "hourly", request_count: 1 }],
    counts(0, 1), counts(-1, 1), counts(1.5, 1), counts(Infinity, 1),
    counts("not-a-count", 1), counts("", 1), counts(true, 1), counts(null, 1),
  ].map(rows => ({ rows })))("refuses incomplete or corrupt counter responses %#", async ({ rows }) => {
    const check = await loadLimiter();
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce(rows);
    await expect(check("user_one")).rejects.toThrow(/report rate-limit/);
  });
});

describe("explicit local content-report limits", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    vi.stubEnv("ITZLI_LOCAL_REVIEW", "1"); vi.stubEnv("ITZLI_REPORT_EMAIL_ALLOW_LOCAL", "1"); vi.stubEnv("VERCEL", "0");
    vi.stubEnv("NODE_ENV", "development");
    mocks.sql.mockReset(); mocks.getSql.mockReset().mockReturnValue(mocks.sql);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("permits six attempts per hour and rejects further attempts without opening storage", async () => {
    const { checkLocalContentReportRateLimit: check } = await import("../src/lib/content-report-rate-limit");
    for (let n = 0; n < 6; n++) expect(check()).toEqual({ ok: true });
    for (let n = 0; n < 30; n++) expect(check().ok).toBe(false);
    expect(mocks.getSql).not.toHaveBeenCalled(); expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("allows only twenty daily attempts across fresh hourly windows, then resets next UTC day", async () => {
    const { checkLocalContentReportRateLimit: check } = await import("../src/lib/content-report-rate-limit");
    for (let n = 0; n < 20; n++) {
      vi.mocked(Date.now).mockReturnValue(NOW + Math.floor(n / 6) * 60 * 60 * 1000);
      expect(check()).toEqual({ ok: true });
    }
    expect(check()).toEqual({ ok: false, retryAfterMs: (8 * 60 + 30) * 60 * 1000 });
    vi.mocked(Date.now).mockReturnValue(new Date("2026-10-07T00:00:00.000Z").getTime());
    expect(check()).toEqual({ ok: true });
    expect(mocks.getSql).not.toHaveBeenCalled();
  });

  it("cannot be used without both local flags or on Vercel", async () => {
    const { checkLocalContentReportRateLimit: check } = await import("../src/lib/content-report-rate-limit");
    vi.stubEnv("ITZLI_REPORT_EMAIL_ALLOW_LOCAL", ""); expect(() => check()).toThrow("Local report delivery is disabled");
    vi.stubEnv("ITZLI_REPORT_EMAIL_ALLOW_LOCAL", "1"); vi.stubEnv("ITZLI_LOCAL_REVIEW", ""); expect(() => check()).toThrow("Local report delivery is disabled");
    vi.stubEnv("ITZLI_LOCAL_REVIEW", "1"); vi.stubEnv("VERCEL", "1"); expect(() => check()).toThrow("Local report delivery is disabled");
    expect(mocks.getSql).not.toHaveBeenCalled();
  });
});
