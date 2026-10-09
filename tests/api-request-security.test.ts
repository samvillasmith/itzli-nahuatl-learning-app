import { afterEach, describe, expect, it, vi } from "vitest";
import { hasJsonContentType, readBoundedBody, readBoundedJson, sameOriginRequest } from "../src/lib/api-request-security";

const request = (headers: Record<string, string> = {}) => new Request("https://www.itzli.app/api/progress", {
  method: "POST", headers: { Origin: "https://www.itzli.app", "Content-Type": "application/json", ...headers }, body: "{}",
});
const rejectedOrigins: Record<string, string>[] = [
  { Origin: "" }, { Origin: "null" }, { Origin: "https://foreign.example" },
  { Origin: "http://www.itzli.app" }, { Origin: "https://www.itzli.app/" },
  { Origin: "https://www.itzli.app/path" }, { Origin: "https://person@www.itzli.app" },
  { Origin: "https://www.itzli.app", "Sec-Fetch-Site": "cross-site" },
  { Host: "www.itzli.app@evil.example" }, { Host: "www.itzli.app/evil" },
  { Host: "www.itzli.app?evil" }, { Host: "www.itzli.app#evil" },
];

describe("browser mutation request boundary", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("accepts same-origin requests and the real loopback HTTP host when Next normalizes its URL", () => {
    expect(sameOriginRequest(request())).toBe(true);
    expect(sameOriginRequest(request({ "Sec-Fetch-Site": "same-origin" }))).toBe(true);
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL", "0");
    expect(sameOriginRequest(new Request("http://localhost:3000/api/progress", {
      headers: { Host: "127.0.0.1:3000", Origin: "http://127.0.0.1:3000" },
    }))).toBe(true);
  });

  it.each(["production", "development"])("cannot substitute a matching arbitrary Host and Origin in %s", environment => {
    vi.stubEnv("NODE_ENV", environment); vi.stubEnv("VERCEL", "0");
    expect(sameOriginRequest(request({ Origin: "https://attacker.example", Host: "attacker.example" }))).toBe(false);
    expect(sameOriginRequest(request({ Origin: "https://www.itzli.app", Host: "attacker.example" }))).toBe(false);
  });

  it("allows development loopback aliases only with the canonical port and protocol", () => {
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL", "0");
    const local = (origin: string, host: string) => new Request("http://localhost:3000/api/progress", { headers: { Origin: origin, Host: host } });
    expect(sameOriginRequest(local("http://127.0.0.1:3000", "127.0.0.1:3000"))).toBe(true);
    expect(sameOriginRequest(local("http://[::1]:3000", "[::1]:3000"))).toBe(true);
    expect(sameOriginRequest(local("http://127.0.0.1:3001", "127.0.0.1:3001"))).toBe(false);
    expect(sameOriginRequest(local("https://127.0.0.1:3000", "127.0.0.1:3000"))).toBe(false);
    expect(sameOriginRequest(local("http://attacker.example:3000", "attacker.example:3000"))).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    expect(sameOriginRequest(local("http://127.0.0.1:3000", "127.0.0.1:3000"))).toBe(false);
    vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL", "1");
    expect(sameOriginRequest(local("http://127.0.0.1:3000", "127.0.0.1:3000"))).toBe(false);
  });

  it.each(rejectedOrigins)("rejects foreign, malformed or contradictory origins %#", headers => {
    expect(sameOriginRequest(request(headers))).toBe(false);
  });

  it("requires JSON rather than a browser simple-request form content type", () => {
    expect(hasJsonContentType(request())).toBe(true);
    expect(hasJsonContentType(request({ "Content-Type": "application/json; charset=utf-8" }))).toBe(true);
    for (const value of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data", "application/jsonx", ""]) {
      expect(hasJsonContentType(request({ "Content-Type": value }))).toBe(false);
    }
  });
});

describe("bounded route body reader", () => {
  it("reads valid UTF-8 JSON without trusting a missing or smaller declared length", async () => {
    const req = new Request("https://www.itzli.app", { method: "POST", body: '{"text":"Nāhuatl"}', headers: { "Content-Length": "1" } });
    expect(await readBoundedJson(req, 100)).toEqual({ text: "Nāhuatl" });
    expect(await readBoundedJson(request(), 2)).toEqual({});
  });

  it.each(["-1", "NaN", "Infinity", "2.5", "1e3", "9007199254740992", "10001"])("rejects invalid/over-limit declared lengths before reading %s", async length => {
    await expect(readBoundedBody(request({ "Content-Length": length }), 10000)).rejects.toBeInstanceOf(RangeError);
  });

  it("counts streamed bytes across chunks and cancels oversized input", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(6)); controller.enqueue(new Uint8Array(6));
      },
      cancel() { cancelled = true; },
    });
    const req = new Request("https://www.itzli.app", { method: "POST", body, duplex: "half" } as RequestInit);
    await expect(readBoundedBody(req, 10)).rejects.toBeInstanceOf(RangeError);
    expect(cancelled).toBe(true);
  });

  it("rejects malformed UTF-8 and JSON and a missing body", async () => {
    const invalidUtf8 = new Request("https://www.itzli.app", { method: "POST", body: new Uint8Array([0x22, 0xc3, 0x28, 0x22]) });
    await expect(readBoundedJson(invalidUtf8, 100)).rejects.toThrow();
    await expect(readBoundedJson(new Request("https://www.itzli.app", { method: "POST", body: "not json" }), 100)).rejects.toThrow();
    await expect(readBoundedJson(new Request("https://www.itzli.app", { method: "POST" }), 100)).rejects.toThrow();
  });
});
