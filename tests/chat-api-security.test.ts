import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ enabled: true, auth: vi.fn(), limit: vi.fn(), moderate: vi.fn(), logAudit: vi.fn(), writeAudit: vi.fn(), completion: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/features", () => ({ get TUTOR_FEATURE_ENABLED() { return mocks.enabled; } }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("../src/lib/rate-limit", () => ({ checkRateLimit: mocks.limit }));
vi.mock("../src/lib/moderation", () => ({ moderate: mocks.moderate, MODERATION_MODEL: "moderation-test" }));
vi.mock("../src/lib/audit", () => ({ hashContent: () => "test-hash", logAudit: mocks.logAudit, writeAudit: mocks.writeAudit }));
vi.mock("../src/lib/rag", () => ({ retrieve: async () => [], formatRetrieved: () => "", EMBED_MODEL: "embedding-test" }));
vi.mock("openai", () => ({ default: class { chat = { completions: { create: mocks.completion } }; } }));
import { POST } from "../src/app/api/chat/route";
const request = (body: unknown = { messages: [{ role: "user", content: "How do I say hello?" }] }, headers: Record<string, string> = {}) => new Request("https://www.itzli.app/api/chat", {
  method: "POST", headers: { Origin: "https://www.itzli.app", "Content-Type": "application/json", ...headers }, body: JSON.stringify(body),
});

describe("chat endpoint security boundaries", () => {
  beforeEach(() => {
    mocks.enabled = true; mocks.auth.mockReset().mockResolvedValue({ userId: "user_one" });
    mocks.limit.mockReset().mockResolvedValue({ ok: true });
    mocks.moderate.mockReset().mockResolvedValue({ flagged: false, categories: [], topScore: 0 });
    mocks.logAudit.mockReset().mockResolvedValue(undefined); mocks.writeAudit.mockReset().mockResolvedValue(undefined);
    mocks.completion.mockReset().mockResolvedValue({ choices: [{ message: { content: "Piyali." } }] });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("preserves the disabled release feature before authentication or upstream calls", async () => {
    mocks.enabled = false; expect((await POST(request())).status).toBe(503);
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.limit).not.toHaveBeenCalled(); expect(mocks.completion).not.toHaveBeenCalled();
  });

  it("rejects foreign browser origins and form content before account and provider work", async () => {
    expect((await POST(request(undefined, { Origin: "https://foreign.example" }))).status).toBe(403);
    expect((await POST(request(undefined, { "Sec-Fetch-Site": "cross-site" }))).status).toBe(403);
    expect((await POST(request(undefined, { "Content-Type": "text/plain" }))).status).toBe(415);
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.limit).not.toHaveBeenCalled(); expect(mocks.completion).not.toHaveBeenCalled();
  });

  it("requires authentication and bounded message roles/history before upstream calls", async () => {
    mocks.auth.mockResolvedValueOnce({ userId: null }); expect((await POST(request())).status).toBe(401);
    expect((await POST(request({ messages: [{ role: "system", content: "malicious" }] }))).status).toBe(400);
    expect((await POST(request({ messages: Array.from({ length: 11 }, () => ({ role: "user", content: "hello" })) }))).status).toBe(400);
    expect((await POST(request(undefined, { "Content-Length": "32769" }))).status).toBe(413);
    expect(mocks.completion).not.toHaveBeenCalled();
  });

  it("fails closed before generation when persistent counters or moderation are unavailable", async () => {
    mocks.limit.mockRejectedValueOnce(new Error("credential-containing upstream response"));
    expect((await POST(request())).status).toBe(503);
    expect(console.error).toHaveBeenCalledWith("[chat] rate limiter unavailable", "Error");
    mocks.limit.mockResolvedValueOnce({ ok: false, window: "burst", retryAfterMs: 60000 });
    const limited = await POST(request()); expect(limited.status).toBe(429); expect(limited.headers.get("Retry-After")).toBe("60");
    mocks.moderate.mockResolvedValueOnce({ flagged: true, categories: ["moderation_error"], topScore: 1 });
    expect(await (await POST(request())).text()).not.toBe("Piyali.");
    expect(mocks.completion).not.toHaveBeenCalled();
  });

  it("keeps input/output moderation and audit in the valid response path", async () => {
    const response = await POST(request()); expect(response.status).toBe(200); expect(await response.text()).toBe("Piyali.");
    expect(mocks.moderate).toHaveBeenCalledTimes(2); expect(mocks.writeAudit).toHaveBeenCalledOnce();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
