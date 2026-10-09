import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), limit: vi.fn(), localLimit: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("../src/lib/content-report-rate-limit", () => ({ checkContentReportRateLimit: mocks.limit, checkLocalContentReportRateLimit: mocks.localLimit }));
import { GET, POST } from "../src/app/api/content-reports/route";
const payload = () => ({ submissionId: "21b3a73e-74c8-4ac9-80b2-b7dd3375f45f", locale: "en", category: "word", context: { pagePath: "/en/units/44", lessonNumber: 44, form: "kenihki" }, details: "Please review this word.", correction: "", reporterName: "", replyEmail: "", speaker: false, community: "", contactConsent: false, website: "" });
function request(body: unknown = payload(), headers: Record<string, string> = {}) {
  return new Request("https://www.itzli.app/api/content-reports", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { Origin: "https://www.itzli.app", "Content-Type": "application/json", ...headers } });
}
function localRequest(origin = "http://127.0.0.1:3000", host = "127.0.0.1:3000", url = "http://localhost:3000/api/content-reports") {
  return new Request(url, { method: "POST", body: JSON.stringify(payload()), headers: { Origin: origin, Host: host, "Content-Type": "application/json" } });
}
describe("report delivery boundary", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("ITZLI_LOCAL_REVIEW", "");
    vi.stubEnv("RESEND_API_KEY", "test-only-secret"); vi.stubEnv("ITZLI_REPORT_EMAIL_FROM", "reports@owned.example"); vi.stubEnv("ITZLI_REPORT_EMAIL_ENABLED", "1");
    vi.stubEnv("ITZLI_REPORT_EMAIL_ALLOW_LOCAL", "");
    mocks.auth.mockReset().mockResolvedValue({ userId: "learner-a" }); mocks.limit.mockReset().mockResolvedValue({ ok: true }); mocks.localLimit.mockReset().mockReturnValue({ ok: true });
    fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "provider-receipt" }), { status: 200 })); vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("keeps local and Vercel previews away from auth, SQL and email", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ITZLI_LOCAL_REVIEW", "1"); vi.stubEnv("VERCEL", "0");
    expect(await (await GET(localRequest())).json()).toEqual({ delivery: "unavailable" });
    expect(await (await POST(localRequest())).json()).toMatchObject({ submitted: false, error: "delivery_unavailable" });
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("ITZLI_REPORT_EMAIL_ALLOW_LOCAL", "1");
    expect(await (await POST(request())).json()).toMatchObject({ submitted: false, error: "delivery_unavailable" });
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.limit).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.localLimit).not.toHaveBeenCalled();
  });
  it("allows explicitly enabled local loopback delivery without Clerk or persistent database counters", async () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL", "0"); vi.stubEnv("ITZLI_LOCAL_REVIEW", "1"); vi.stubEnv("ITZLI_REPORT_EMAIL_ALLOW_LOCAL", "1");
    expect(await (await GET(localRequest())).json()).toEqual({ delivery: "server" });
    expect(await (await POST(localRequest())).json()).toEqual({ submitted: true, delivery: "server", reportId: payload().submissionId });
    expect(mocks.localLimit).toHaveBeenCalledOnce(); expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.limit).not.toHaveBeenCalled();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toEqual(["admin@itzli.app"]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).not.toContain("local-feedback-review");
  });
  it("requires both local flags, email configuration, and a loopback destination for local delivery", async () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL", "0"); vi.stubEnv("ITZLI_REPORT_EMAIL_ALLOW_LOCAL", "1");
    expect((await POST(localRequest())).status).toBe(503);
    vi.stubEnv("ITZLI_LOCAL_REVIEW", "1");
    expect((await POST(request())).status).toBe(503);
    expect((await POST(localRequest("http://review.example:3000", "review.example:3000"))).status).toBe(403);
    expect((await POST(localRequest("http://127.0.0.1:3000", "127.0.0.1:3000", "http://foreign.example:3000/api/content-reports"))).status).toBe(403);
    vi.stubEnv("RESEND_API_KEY", ""); expect((await POST(localRequest())).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled(); expect(mocks.localLimit).not.toHaveBeenCalled(); expect(mocks.limit).not.toHaveBeenCalled(); expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("honors local rate limits and refuses a send when its limiter fails", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "0"); vi.stubEnv("ITZLI_LOCAL_REVIEW", "1"); vi.stubEnv("ITZLI_REPORT_EMAIL_ALLOW_LOCAL", "1");
    mocks.localLimit.mockReturnValue({ ok: false, retryAfterMs: 30001 });
    const limited = await POST(localRequest()); expect(limited.status).toBe(429); expect(limited.headers.get("retry-after")).toBe("31");
    mocks.localLimit.mockImplementation(() => { throw new Error("unavailable"); });
    expect((await POST(localRequest())).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled(); expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.limit).not.toHaveBeenCalled();
  });
  it("submits plain text to the fixed recipient with a stable per-account retry key", async () => {
    const body = { ...payload(), replyEmail: "speaker@example.org", contactConsent: true };
    expect(await (await POST(request(body))).json()).toMatchObject({ submitted: true, delivery: "server" });
    const first = fetchMock.mock.calls[0][1]; const sent = JSON.parse(first.body);
    expect(sent.to).toEqual(["admin@itzli.app"]); expect(sent.reply_to).toBe("speaker@example.org"); expect(sent.html).toBeUndefined();
    expect(sent.text).toContain("kenihki"); expect(sent.text).not.toContain("learner-a");
    await POST(request(body)); expect(fetchMock.mock.calls[1][1].headers["Idempotency-Key"]).toBe(first.headers["Idempotency-Key"]);
    mocks.auth.mockResolvedValue({ userId: "learner-b" }); await POST(request(body));
    expect(fetchMock.mock.calls[2][1].headers["Idempotency-Key"]).not.toBe(first.headers["Idempotency-Key"]);
  });
  it("does not add a Reply-To when permission to contact was not supplied", async () => {
    await POST(request({ ...payload(), replyEmail: "speaker@example.org" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).reply_to).toBeUndefined();
  });
  it("does not expose credentials in delivery status", async () => {
    const result = await GET(request()); expect(result.headers.get("cache-control")).toContain("no-store");
    expect(await result.json()).toEqual({ delivery: "server" });
  });
  it("uses the HTTP destination host when Next's internal URL differs", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ITZLI_LOCAL_REVIEW", "1"); vi.stubEnv("VERCEL", "0");
    expect((await POST(localRequest())).status).toBe(503);
    expect((await POST(localRequest("http://localhost:3000"))).status).toBe(403);
    expect((await POST(localRequest("http://foreign.example"))).status).toBe(403);
    expect((await POST(localRequest("http://127.0.0.1:3000", "127.0.0.1:3000@foreign.example"))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled(); expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("rejects missing authentication and malicious or oversized requests before sending", async () => {
    mocks.auth.mockResolvedValue({ userId: null }); expect((await POST(request())).status).toBe(401);
    expect((await POST(request(payload(), { Origin: "https://foreign.example" }))).status).toBe(403);
    expect((await POST(request(payload(), { "Sec-Fetch-Site": "cross-site" }))).status).toBe(403);
    expect((await POST(request(payload(), { "Content-Type": "text/plain" }))).status).toBe(415);
    expect((await POST(request("not JSON"))).status).toBe(400);
    expect((await POST(request({ ...payload(), to: "someone@example.org" }))).status).toBe(400);
    expect((await POST(request("x".repeat(16385)))).status).toBe(413);
    expect((await POST(request(payload(), { "Content-Length": "18000" }))).status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled(); expect(mocks.limit).not.toHaveBeenCalled();
  });
  it("returns an unavailable error without pretending a draft was submitted when not configured", async () => {
    vi.stubEnv("ITZLI_REPORT_EMAIL_ENABLED", ""); expect(await (await GET(request())).json()).toEqual({ delivery: "unavailable" });
    expect(await (await POST(request())).json()).toEqual({ delivery: "unavailable", error: "delivery_unavailable", submitted: false });
    vi.stubEnv("ITZLI_REPORT_EMAIL_ENABLED", "1"); vi.stubEnv("ITZLI_REPORT_EMAIL_FROM", "bad\r\naddress");
    expect((await POST(request())).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("honors report-only limits and fails closed when the limiter is unavailable", async () => {
    mocks.limit.mockResolvedValue({ ok: false, retryAfterMs: 60000 }); const limited = await POST(request());
    expect(limited.status).toBe(429); expect(limited.headers.get("retry-after")).toBe("60");
    mocks.limit.mockRejectedValue(new Error("unavailable")); expect((await POST(request())).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not call provider acceptance sent when a rejection, timeout, or invalid receipt occurs", async () => {
    fetchMock.mockResolvedValue(new Response("rejected", { status: 403 })); expect((await POST(request())).status).toBe(503);
    fetchMock.mockRejectedValue(new Error("timeout")); expect((await POST(request())).status).toBe(503);
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 })); expect((await POST(request())).status).toBe(503);
    expect(await (await POST(request())).json()).toEqual({ error: "delivery_unavailable", submitted: false });
  });
});
