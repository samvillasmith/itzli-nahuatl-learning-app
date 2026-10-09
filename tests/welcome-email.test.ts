import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn(), getSql: vi.fn(), verifyWebhook: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/neon", () => ({ getSql: mocks.getSql }));
vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook: mocks.verifyWebhook }));

import { NextRequest } from "next/server";
import { POST } from "../src/app/api/webhooks/clerk/route";
import { markWelcomeAccountDeleted, sendSignupWelcome, welcomeAccountHash, welcomeCandidate, WelcomeEmailError } from "../src/lib/welcome-email";
import { welcomeEmailContent } from "../src/lib/welcome-email-template";

const CREATED_AT = Date.parse("2026-10-09T12:00:00Z");
function user(overrides: Record<string, unknown> = {}) {
  return { id: "user_new", primary_email_address_id: "email_primary", first_name: "Ana", locale: "en", created_at: CREATED_AT,
    email_addresses: [
      { id: "email_secondary", email_address: "secondary@example.org", verification: { status: "verified" } },
      { id: "email_primary", email_address: "primary@example.org", verification: { status: "verified" } },
    ], ...overrides };
}
const query = (call: unknown[]) => (call[0] as TemplateStringsArray).join("?");
const req = (body = "{}") => new NextRequest("https://www.itzli.app/api/webhooks/clerk", { method: "POST", body });

describe("welcome email delivery", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let stored: { status: string; payload: string | null; receipt?: string } | undefined;
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("ITZLI_LOCAL_REVIEW", "");
    vi.stubEnv("RESEND_API_KEY", "test-only-secret"); vi.stubEnv("ITZLI_WELCOME_EMAIL_FROM", "hello@itzli.app");
    vi.stubEnv("ITZLI_WELCOME_EMAIL_ENABLED", "1"); vi.stubEnv("ITZLI_WELCOME_EMAIL_START_AT", "2026-10-09T05:42:30Z");
    stored = undefined;
    mocks.getSql.mockReset().mockReturnValue(mocks.sql);
    mocks.sql.mockReset().mockImplementation(async (...args: unknown[]) => {
      const statement = query(args);
      if (statement.includes("INSERT INTO welcome_email_deliveries") && statement.includes("RETURNING payload_json")) {
        if (stored && stored.status !== "pending") return [];
        stored ??= { status: "pending", payload: args[2] as string };
        return [{ payload_json: stored.payload }];
      }
      if (statement.includes("SELECT status FROM welcome_email_deliveries")) return stored ? [{ status: stored.status }] : [];
      if (statement.includes("SET status = 'accepted'")) {
        stored = { status: "accepted", payload: null, receipt: args[1] as string };
        return [{ status: "accepted" }];
      }
      if (statement.includes("VALUES (?, 'deleted')")) { stored = { status: "deleted", payload: null }; }
      return [];
    });
    mocks.verifyWebhook.mockReset().mockResolvedValue({ type: "user.created", data: user() });
    fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ id: "receipt-welcome" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("uses only the verified primary address and rejects unsafe or unverified account data", () => {
    expect(welcomeCandidate(user())).toMatchObject({ email: "primary@example.org", locale: "en" });
    expect(welcomeCandidate(user({ locale: "es-MX" }))).toMatchObject({ locale: "es" });
    expect(welcomeCandidate(user({ primary_email_address_id: "missing" }))).toBeNull();
    expect(welcomeCandidate(user({ email_addresses: [{ id: "email_primary", email_address: "primary@example.org", verification: { status: "unverified" } }] }))).toBeNull();
    expect(welcomeCandidate(user({ email_addresses: [{ id: "email_primary", email_address: "primary@example.org\r\nBcc: attacker@example.org", verification: { status: "verified" } }] }))).toBeNull();
    expect(welcomeCandidate(user({ id: "bad\naccount" }))).toBeNull();
    expect(welcomeCandidate(user({ banned: true }))).toBeNull();
    expect(welcomeCandidate(user({ locked: true }))).toBeNull();
  });

  it("sends a fixed, escaped welcome and erases the stored recipient on acceptance", async () => {
    expect(await sendSignupWelcome(user({ first_name: '<img src=x onerror="attack()">\r\nAna' }))).toBe("accepted");
    const [endpoint, options] = fetchMock.mock.calls[0];
    expect(endpoint).toBe("https://api.resend.com/emails"); expect(options.cache).toBe("no-store");
    const payload = JSON.parse(options.body);
    expect(payload.to).toEqual(["primary@example.org"]); expect(payload.from).toBe("Itzli <hello@itzli.app>"); expect(payload.reply_to).toBe("admin@itzli.app");
    expect(payload.html).toContain("&lt;img"); expect(payload.html).not.toContain("<img");
    expect(payload.text).toContain("324 lessons and 1,724 words and forms");
    expect(payload.text).toContain("Eastern Huasteca Nahuatl"); expect(payload.text).toContain("synthetic audio is labeled");
    expect(payload.html.match(/href="(?!https:\/\/www\.itzli\.app\/|mailto:admin@itzli\.app)[^"]+"/g)).toBeNull();
    expect(options.headers["Idempotency-Key"]).toBe(`itzli-welcome/${welcomeAccountHash("user_new")}`);
    expect(options.headers["Idempotency-Key"]).not.toContain("user_new");
    expect(stored).toEqual({ status: "accepted", payload: null, receipt: "receipt-welcome" });
  });

  it("never touches SQL or Resend in local, local-production and Vercel preview modes", async () => {
    vi.stubEnv("VERCEL", "0"); vi.stubEnv("ITZLI_LOCAL_REVIEW", "1");
    expect(await sendSignupWelcome(user())).toBe("preview"); await markWelcomeAccountDeleted("user_new");
    vi.stubEnv("ITZLI_LOCAL_REVIEW", ""); expect(await sendSignupWelcome(user())).toBe("preview");
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "preview"); expect(await sendSignupWelcome(user())).toBe("preview");
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("NODE_ENV", "development"); expect(await sendSignupWelcome(user())).toBe("preview");
    expect(mocks.getSql).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });

  it("suppresses disabled, unverified and pre-activation signups without storage", async () => {
    vi.stubEnv("ITZLI_WELCOME_EMAIL_ENABLED", ""); expect(await sendSignupWelcome(user())).toBe("disabled");
    vi.stubEnv("ITZLI_WELCOME_EMAIL_ENABLED", "1");
    expect(await sendSignupWelcome(user({ primary_email_address_id: null }))).toBe("skipped");
    expect(await sendSignupWelcome(user({ created_at: Date.parse("2026-10-08T00:00:00Z") }))).toBe("skipped");
    expect(mocks.getSql).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed for missing or invalid production configuration", async () => {
    for (const [key, value] of [["RESEND_API_KEY", ""], ["ITZLI_WELCOME_EMAIL_FROM", "bad\r\nheader"], ["ITZLI_WELCOME_EMAIL_START_AT", "yesterday"]]) {
      const original = process.env[key]; vi.stubEnv(key, value);
      await expect(sendSignupWelcome(user())).rejects.toMatchObject({ reason: "configuration" });
      vi.stubEnv(key, original!);
    }
    expect(mocks.getSql).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not send again for accepted or deleted accounts, including a changed primary address", async () => {
    await sendSignupWelcome(user()); fetchMock.mockClear();
    expect(await sendSignupWelcome(user({ email_addresses: [{ id: "email_primary", email_address: "changed@example.org", verification: { status: "verified" } }] }))).toBe("already-accepted");
    stored = { status: "deleted", payload: null }; expect(await sendSignupWelcome(user())).toBe("deleted");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the identical original payload and key after a provider failure, even after profile and sender changes", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network timeout with unknown acceptance"));
    await expect(sendSignupWelcome(user())).rejects.toMatchObject({ reason: "delivery" });
    const first = fetchMock.mock.calls[0][1]; expect(stored?.status).toBe("pending"); expect(stored?.payload).not.toBeNull();
    vi.stubEnv("ITZLI_WELCOME_EMAIL_FROM", "changed@itzli.app");
    expect(await sendSignupWelcome(user({ first_name: "Changed", locale: "es" }))).toBe("accepted");
    const second = fetchMock.mock.calls[1][1];
    expect(second.body).toBe(first.body); expect(second.headers["Idempotency-Key"]).toBe(first.headers["Idempotency-Key"]);
    const claim = mocks.sql.mock.calls.find(call => query(call).includes("ON CONFLICT (account_hash) DO UPDATE") && query(call).includes("RETURNING payload_json"));
    expect(query(claim!)).toContain("lease_expires_at <= NOW()");
    expect(query(claim!)).not.toContain("payload_json = EXCLUDED");
  });

  it("returns retryable failures for busy or expired uncertain attempts without sending", async () => {
    mocks.sql.mockImplementation(async (...args: unknown[]) => query(args).includes("SELECT status FROM") ? [{ status: "pending" }] : []);
    await expect(sendSignupWelcome(user())).rejects.toMatchObject({ reason: "busy" });
    mocks.sql.mockImplementation(async (...args: unknown[]) => query(args).includes("SELECT status FROM") ? [{ status: "uncertain" }] : []);
    await expect(sendSignupWelcome(user())).rejects.toMatchObject({ reason: "uncertain" });
    const expiry = mocks.sql.mock.calls.find(call => query(call).includes("SET status = 'uncertain'"));
    expect(query(expiry!)).toContain("payload_json = NULL"); expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not count provider rejection or invalid receipts as delivery", async () => {
    for (const result of [new Response("rejected", { status: 403 }), new Response("{}", { status: 200 }), new Response("invalid JSON", { status: 200 })]) {
      fetchMock.mockResolvedValueOnce(result);
      await expect(sendSignupWelcome(user())).rejects.toBeInstanceOf(WelcomeEmailError);
      expect(stored?.status).toBe("pending");
    }
  });

  it("fails before sending on storage failure, and retries a failed receipt write safely", async () => {
    mocks.sql.mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(sendSignupWelcome(user())).rejects.toMatchObject({ reason: "storage" }); expect(fetchMock).not.toHaveBeenCalled();
    const base = mocks.sql.getMockImplementation()!;
    mocks.sql.mockImplementation(async (...args: unknown[]) => {
      if (query(args).includes("SET status = 'accepted'")) throw new Error("receipt write failed");
      return base(...args);
    });
    await expect(sendSignupWelcome(user())).rejects.toMatchObject({ reason: "storage" });
    const first = fetchMock.mock.calls[0][1]; mocks.sql.mockImplementation(base);
    expect(await sendSignupWelcome(user())).toBe("accepted"); expect(fetchMock.mock.calls[1][1].body).toBe(first.body);
  });

  it("scrubs welcome data on account deletion and leaves a hash-only tombstone", async () => {
    await markWelcomeAccountDeleted("user_new");
    const tombstone = mocks.sql.mock.calls.find(call => query(call).includes("VALUES (?, 'deleted')"));
    expect(tombstone![1]).toBe(welcomeAccountHash("user_new"));
    expect(query(tombstone!)).toContain("payload_json = NULL, provider_id = NULL");
    expect(JSON.stringify(tombstone)).not.toContain("user_new"); expect(fetchMock).not.toHaveBeenCalled();
    expect(stored).toEqual({ status: "deleted", payload: null });
  });

  it("preserves existing progress, audit and report cleanup on signed production deletion", async () => {
    mocks.verifyWebhook.mockResolvedValue({ type: "user.deleted", data: { id: "user_new" } });
    const base = mocks.sql.getMockImplementation()!;
    mocks.sql.mockImplementation(async (...args: unknown[]) => {
      if (query(args).includes("to_regclass('public.user_progress')")) return [{
        progress_table: "user_progress", audit_table: "chat_audit", rate_limit_table: "chat_rate_limits", report_rate_limit_table: "content_report_rate_limits",
      }];
      return base(...args);
    });
    expect((await POST(req())).status).toBe(200);
    const deletes = mocks.sql.mock.calls.filter(call => query(call).startsWith("DELETE FROM"));
    expect(deletes).toHaveLength(4); expect(deletes.every(call => call[1] === "user_new")).toBe(true);
    expect(stored?.status).toBe("deleted"); expect(fetchMock).not.toHaveBeenCalled();
    expect(await sendSignupWelcome(user())).toBe("deleted");
  });

  it("still clears an existing welcome ledger after future welcomes have been disabled", async () => {
    vi.stubEnv("ITZLI_WELCOME_EMAIL_ENABLED", "");
    mocks.sql.mockResolvedValueOnce([{ welcome_table: "welcome_email_deliveries" }]);
    await markWelcomeAccountDeleted("user_new"); expect(stored?.status).toBe("deleted");
    mocks.sql.mockClear().mockResolvedValueOnce([{ welcome_table: null }]);
    await markWelcomeAccountDeleted("user_new"); expect(mocks.sql).toHaveBeenCalledTimes(1);
  });

  it("authenticates and bounds signup webhooks before any side effect", async () => {
    mocks.verifyWebhook.mockRejectedValueOnce(new Error("invalid signature"));
    expect((await POST(req())).status).toBe(400);
    expect((await POST(req("x".repeat(64 * 1024 + 1)))).status).toBe(400);
    expect(mocks.verifyWebhook).toHaveBeenCalledTimes(1); expect(mocks.getSql).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });

  it("welcomes a newly verified primary address on user.updated exactly once", async () => {
    mocks.verifyWebhook.mockResolvedValueOnce({ type: "user.created", data: user({ primary_email_address_id: null }) });
    expect((await POST(req())).status).toBe(200); expect(fetchMock).not.toHaveBeenCalled();
    mocks.verifyWebhook.mockResolvedValue({ type: "user.updated", data: user() });
    expect((await POST(req())).status).toBe(200); expect((await POST(req())).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks Clerk to retry failed welcome deliveries without exposing provider errors or addresses", async () => {
    fetchMock.mockRejectedValue(new Error("test-only-secret primary@example.org"));
    const response = await POST(req()); expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Welcome delivery unavailable" });
    expect(console.error).toHaveBeenCalledWith("[clerk-webhook] welcome email failed", "delivery");
  });

  it("ignores unrelated signed events", async () => {
    mocks.verifyWebhook.mockResolvedValue({ type: "session.created", data: {} });
    expect((await POST(req())).status).toBe(200); expect(mocks.getSql).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("welcome template", () => {
  it("provides Spanish copy and fixed lesson links without requesting a subscription", () => {
    const content = welcomeEmailContent("Ana", "es");
    expect(content.subject).toContain("Gracias por unirte"); expect(content.text).toContain("324 lecciones y 1,724 palabras y formas");
    expect(content.html).toContain('lang="es"'); expect(content.html).toContain('href="https://www.itzli.app/units"');
    expect(content.text).toContain("único correo de bienvenida");
  });
});
