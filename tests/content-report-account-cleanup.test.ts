import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verifyWebhook: vi.fn(), sql: vi.fn(), getSql: vi.fn() }));
vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook: mocks.verifyWebhook }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/neon", () => ({ getSql: mocks.getSql }));
import { POST } from "../src/app/api/webhooks/clerk/route";

const request = () => new NextRequest("https://example.invalid/api/webhooks/clerk", { method: "POST", body: "{}" });
const query = (call: unknown[]) => (call[0] as TemplateStringsArray).join("?");

describe("signed account deletion clears report counters", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ITZLI_LOCAL_REVIEW", ""); vi.stubEnv("ITZLI_WELCOME_EMAIL_ENABLED", "");
    mocks.verifyWebhook.mockReset().mockResolvedValue({ type: "user.deleted", data: { id: "user_one" } });
    mocks.sql.mockReset();
    mocks.getSql.mockReset().mockReturnValue(mocks.sql);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("clears the same authenticated account from all existing tables, including report counters", async () => {
    // The disabled welcome ledger's existence probe is also lazy and safe.
    mocks.sql.mockResolvedValueOnce([{ welcome_table: null }]).mockResolvedValueOnce([{ progress_table: "user_progress", audit_table: "chat_audit", rate_limit_table: "chat_rate_limits", report_rate_limit_table: "content_report_rate_limits", progress_rate_limit_table: "progress_rate_limits" }]).mockResolvedValue([]);
    expect((await POST(request())).status).toBe(200);
    expect(query(mocks.sql.mock.calls[1])).toContain("to_regclass('public.content_report_rate_limits')");
    const deletes = mocks.sql.mock.calls.slice(2);
    expect(deletes).toHaveLength(5);
    expect(deletes.map(query).join(" ")).toContain("DELETE FROM content_report_rate_limits WHERE user_id = ?");
    expect(deletes.map(query).join(" ")).toContain("DELETE FROM progress_rate_limits WHERE user_id = ?");
    expect(deletes.every(call => call[1] === "user_one")).toBe(true);
  });

  it("does not attempt a report-table delete before that lazy table exists", async () => {
    mocks.sql.mockResolvedValueOnce([{ welcome_table: null }]).mockResolvedValueOnce([{ progress_table: null, audit_table: null, rate_limit_table: null, report_rate_limit_table: null }]);
    expect((await POST(request())).status).toBe(200);
    expect(mocks.sql).toHaveBeenCalledTimes(2);
  });

  it("returns a retryable failure when clearing report counters fails", async () => {
    mocks.sql.mockResolvedValueOnce([{ welcome_table: null }]).mockResolvedValueOnce([{ report_rate_limit_table: "content_report_rate_limits" }]).mockRejectedValueOnce(new Error("database unavailable"));
    expect((await POST(request())).status).toBe(503);
    expect(query(mocks.sql.mock.calls[2])).toContain("DELETE FROM content_report_rate_limits");
  });

  it("never opens storage for an invalid signature, other event, or missing account ID", async () => {
    mocks.verifyWebhook.mockRejectedValueOnce(new Error("invalid signature"));
    expect((await POST(request())).status).toBe(400);
    mocks.verifyWebhook.mockResolvedValueOnce({ type: "user.created", data: { id: "user_one" } });
    expect((await POST(request())).status).toBe(200);
    mocks.verifyWebhook.mockResolvedValueOnce({ type: "user.deleted", data: {} });
    expect((await POST(request())).status).toBe(400);
    expect(mocks.getSql).not.toHaveBeenCalled();
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("acknowledges signed preview and local events without touching production rows", async () => {
    for (const [vercel, environment] of [["1", "preview"], ["0", "production"]]) {
      vi.stubEnv("VERCEL", vercel); vi.stubEnv("VERCEL_ENV", environment);
      expect(await (await POST(request())).json()).toEqual({ ok: true, mode: "preview" });
    }
    expect(mocks.getSql).not.toHaveBeenCalled(); expect(mocks.sql).not.toHaveBeenCalled();
  });
});
