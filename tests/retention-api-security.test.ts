import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getSql: vi.fn(), sql: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/neon", () => ({ getSql: mocks.getSql }));
import { GET } from "../src/app/api/cron/purge-chat-audit/route";
const request = (token?: string) => new Request("https://www.itzli.app/api/cron/purge-chat-audit", { headers: token ? { Authorization: token } : {} });
const query = (call: unknown[]) => (call[0] as TemplateStringsArray).join("?");

describe("retention endpoint privilege boundary", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CRON_SECRET", "retention-test-only"); vi.stubEnv("ITZLI_LOCAL_REVIEW", "");
    mocks.sql.mockReset(); mocks.getSql.mockReset().mockReturnValue(mocks.sql);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("requires the exact bearer secret before any database work", async () => {
    for (const value of [undefined, "retention-test-only", "Bearer wrong", "Bearer retention-test-only-more", "bearer retention-test-only"]) expect((await GET(request(value))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", ""); expect((await GET(request("Bearer retention-test-only"))).status).toBe(401);
    expect(mocks.getSql).not.toHaveBeenCalled();
  });

  it("prevents a signed preview or local request from purging the live database", async () => {
    vi.stubEnv("VERCEL_ENV", "preview"); expect((await GET(request("Bearer retention-test-only"))).status).toBe(503);
    vi.stubEnv("VERCEL", "0"); vi.stubEnv("VERCEL_ENV", "production"); expect((await GET(request("Bearer retention-test-only"))).status).toBe(503);
    expect(mocks.getSql).not.toHaveBeenCalled();
  });

  it("retains the 24-month audit policy and removes only expired rate-limit counters", async () => {
    mocks.sql.mockResolvedValueOnce([{ audit_table: "chat_audit", table_name: "chat_rate_limits", progress_table: "progress_rate_limits" }]).mockResolvedValueOnce([{ id: "old-audit" }]).mockResolvedValue([]);
    const response = await GET(request("Bearer retention-test-only")); expect(await response.json()).toEqual({ ok: true, removed: 1 });
    const statements = mocks.sql.mock.calls.map(query).join(" ");
    expect(statements).toContain("INTERVAL '24 months'"); expect(statements).toContain("INTERVAL '2 days'");
    expect(statements).not.toMatch(/DELETE FROM (?:user_progress|welcome_email_deliveries)/);
  });

  it("handles a production store that has never created tutor audit records", async () => {
    mocks.sql.mockResolvedValueOnce([{ audit_table: null, table_name: null, progress_table: "progress_rate_limits" }]).mockResolvedValue([]);
    const response = await GET(request("Bearer retention-test-only"));
    expect(await response.json()).toEqual({ ok: true, removed: 0 });
    const statements = mocks.sql.mock.calls.map(query).join(" ");
    expect(statements).toContain("DELETE FROM progress_rate_limits");
    expect(statements).not.toMatch(/DELETE FROM (?:chat_audit|chat_rate_limits|user_progress)/);
  });
});
