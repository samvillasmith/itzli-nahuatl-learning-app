import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const worker = readFileSync("public/sw.js", "utf8");
const recipe = "spanish-air-b-2026-10-07";
const cacheName = `itzli-generated-audio-${recipe}`;
const manifestCacheName = `itzli-generated-audio-manifest-${recipe}`;
const manifestUrl = "https://itzli.example/generated-course-audio.json";
const origin = "https://nahuatl-language.s3.us-east-1.amazonaws.com";
const audioUrl = `${origin}/itzli-app/audio-v3/${recipe}/${"a".repeat(64)}.wav`;
const mp3Url = `${origin}/itzli-app/audio-v3/${recipe}/${"b".repeat(64)}.mp3`;
const manifest = { schema_version: 1, recipe_id: recipe, assets: [
  { id: "a".repeat(64), url: audioUrl }, { id: "b".repeat(64), url: mp3Url },
] };

function manifestResponse(data: unknown = manifest) {
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
}

function audio(body = "0123456789", extraHeaders: HeadersInit = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "audio/wav");
  headers.set("Content-Length", String(body.length));
  return new Response(body, { headers });
}

function fixture(options: { unavailableStorage?: boolean; failWrite?: boolean; noManifest?: boolean } = {}) {
  const handlers = new Map<string, (event: unknown) => void>();
  const stored = new Map<string, Map<string, Response>>();
  if (!options.noManifest) stored.set(manifestCacheName, new Map([[manifestUrl, manifestResponse()]]));
  const fetchMock = vi.fn<(request: Request) => Promise<Response>>(async request => request.url === manifestUrl ? manifestResponse() : audio());
  const writes = vi.fn();
  const open = vi.fn(async (name: string) => {
    if (options.unavailableStorage) throw new Error("storage unavailable");
    if (!stored.has(name)) stored.set(name, new Map());
    const entries = stored.get(name)!;
    return {
      match: async (key: string | Request) => entries.get(typeof key === "string" ? key : key.url)?.clone(),
      put: async (key: string | Request, response: Response) => {
        writes(name, key, response.status);
        if (options.failWrite) throw new Error("storage full");
        entries.set(typeof key === "string" ? key : key.url, response.clone());
      },
    };
  });
  vm.runInNewContext(worker, {
    URL, Request, Response, Headers, AbortController, setTimeout, clearTimeout,
    self: {
      location: new URL("https://itzli.example"),
      addEventListener: (name: string, handler: (event: unknown) => void) => handlers.set(name, handler),
    },
    caches: { open },
    fetch: fetchMock,
  });
  return {
    fetchMock, open, writes, stored,
    save: (url: string, response: Response, name = cacheName) => {
      if (!stored.has(name)) stored.set(name, new Map());
      stored.get(name)!.set(url, response);
    },
    request: (url = audioUrl, headers: HeadersInit = {}, method = "GET"): Promise<Response> | null => {
      let response: Promise<Response> | null = null;
      handlers.get("fetch")!({
        request: new Request(url, { method, headers }),
        respondWith: (value: Promise<Response>) => { response = value; },
      });
      return response;
    },
  };
}

describe("immutable first-party course audio in the service worker", () => {
  it("refreshes the exact public manifest network-first without forwarding authentication", async () => {
    const f = fixture();
    const response = await f.request(manifestUrl, { Authorization: "private-token" });
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual(manifest);
    const outgoing = f.fetchMock.mock.calls[0][0];
    expect(outgoing.url).toBe(manifestUrl);
    expect(outgoing.credentials).toBe("omit");
    expect(outgoing.redirect).toBe("error");
    expect(outgoing.cache).toBe("no-store");
    expect(outgoing.headers.get("authorization")).toBeNull();
    expect(f.writes).toHaveBeenCalledWith(manifestCacheName, manifestUrl, 200);
  });

  it("serves previously validated manifest metadata offline to the standalone pack", async () => {
    const f = fixture(); f.fetchMock.mockRejectedValue(new Error("offline"));
    expect(await (await f.request(manifestUrl))?.json()).toEqual(manifest);
    expect(f.writes).not.toHaveBeenCalled();
  });

  it("does not overwrite saved manifest metadata with an invalid HTML response", async () => {
    const f = fixture();
    f.fetchMock.mockResolvedValue(new Response("login html", { headers: { "Content-Type": "text/html" } }));
    expect(await (await f.request(manifestUrl))?.json()).toEqual(manifest);
    expect(f.writes).not.toHaveBeenCalled();
    expect(await f.stored.get(manifestCacheName)?.get(manifestUrl)?.clone().json()).toEqual(manifest);
  });

  it("does not cache manifest query variants or unrelated account JSON", () => {
    const f = fixture();
    expect(f.request(`${manifestUrl}?account=alice`)).toBeNull();
    expect(f.request("https://itzli.example/account/generated-course-audio.json")).toBeNull();
    expect(f.request("https://other.example/generated-course-audio.json")).toBeNull();
    expect(f.open).not.toHaveBeenCalled();
    expect(f.fetchMock).not.toHaveBeenCalled();
  });

  it("plays a complete cached WAV offline without a provider request", async () => {
    const f = fixture();
    f.save(audioUrl, audio());
    f.fetchMock.mockRejectedValue(new Error("offline"));
    const response = await f.request();
    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe("0123456789");
    expect(f.fetchMock).not.toHaveBeenCalled();
    expect(f.open).toHaveBeenCalledWith(cacheName);
  });

  it.each([
    ["bytes=2-5", "2345", "bytes 2-5/10"],
    ["bytes=7-", "789", "bytes 7-9/10"],
    ["bytes=-3", "789", "bytes 7-9/10"],
    ["bytes=8-100", "89", "bytes 8-9/10"],
    ["bytes=-100", "0123456789", "bytes 0-9/10"],
  ])("supports native audio seeking from a saved full response: %s", async (range, body, contentRange) => {
    const f = fixture();
    f.save(audioUrl, audio());
    const response = await f.request(audioUrl, { Range: range });
    expect(response?.status).toBe(206);
    expect(response?.headers.get("content-range")).toBe(contentRange);
    expect(response?.headers.get("content-length")).toBe(String(body.length));
    expect(response?.headers.get("accept-ranges")).toBe("bytes");
    expect(await response?.text()).toBe(body);
    expect(f.fetchMock).not.toHaveBeenCalled();
    expect(await (await f.request())?.text()).toBe("0123456789");
  });

  it.each(["bytes=10-", "bytes=5-2", "bytes=-0", "bytes=0-1,4-5", "bytes=-", "bytes=9007199254740992-"])(
    "rejects an unsatisfiable or unsupported range without corrupting the full cache: %s", async range => {
      const f = fixture();
      f.save(audioUrl, audio());
      const response = await f.request(audioUrl, { Range: range });
      expect(response?.status).toBe(416);
      expect(response?.headers.get("content-range")).toBe("bytes */10");
      expect(await (await f.request())?.text()).toBe("0123456789");
      expect(f.writes).not.toHaveBeenCalled();
    },
  );

  it("honors If-Range validators rather than serving a stale partial representation", async () => {
    const f = fixture();
    f.save(audioUrl, audio("0123456789", { ETag: '"current"' }));
    expect((await f.request(audioUrl, { Range: "bytes=2-5", "If-Range": '"different"' }))?.status).toBe(200);
    expect((await f.request(audioUrl, { Range: "bytes=2-5", "If-Range": 'W/"current"' }))?.status).toBe(200);
    expect((await f.request(audioUrl, { Range: "bytes=2-5", "If-Range": '"current"' }))?.status).toBe(206);
  });

  it("fetches and saves the complete public file on a range miss, omitting authentication", async () => {
    const f = fixture();
    const response = await f.request(audioUrl, { Range: "bytes=2-5", Authorization: "private-token" });
    expect(response?.status).toBe(206);
    expect(await response?.text()).toBe("2345");
    const outgoing = f.fetchMock.mock.calls[0][0];
    expect(outgoing.url).toBe(audioUrl);
    expect(outgoing.credentials).toBe("omit");
    expect(outgoing.mode).toBe("cors");
    expect(outgoing.redirect).toBe("error");
    expect(outgoing.headers.get("authorization")).toBeNull();
    expect(outgoing.headers.get("range")).toBeNull();
    expect(f.writes).toHaveBeenCalledWith(cacheName, audioUrl, 200);
    f.fetchMock.mockRejectedValue(new Error("offline"));
    expect(await (await f.request())?.text()).toBe("0123456789");
  });

  it.each([{ failWrite: true }, { unavailableStorage: true }])("keeps online playback available when browser storage fails: %o", async options => {
    const f = fixture(options);
    expect(await (await f.request())?.text()).toBe("0123456789");
    expect(f.fetchMock.mock.calls.filter(([request]) => request.url === audioUrl)).toHaveLength(1);
  });

  it("supports cached MP3 delivery and byte seeking without changing the WAV master recipe", async () => {
    const f = fixture();
    f.save(mp3Url, new Response("mp3-audio", { headers: { "Content-Type": "audio/mpeg" } }));
    const response = await f.request(mp3Url, { Range: "bytes=0-2" });
    expect(response?.status).toBe(206);
    expect(response?.headers.get("content-type")).toBe("audio/mpeg");
    expect(await response?.text()).toBe("mp3");
    expect(f.fetchMock).not.toHaveBeenCalled();
  });

  it("loads the same-origin public whitelist once and retains it for offline use", async () => {
    const f = fixture({ noManifest: true });
    await f.request();
    expect(f.stored.get(manifestCacheName)?.has(manifestUrl)).toBe(true);
    const outgoing = f.fetchMock.mock.calls.find(([request]) => request.url === manifestUrl)![0];
    expect(outgoing.credentials).toBe("omit");
    expect(outgoing.mode).toBe("same-origin");
    expect(outgoing.redirect).toBe("error");
    expect(outgoing.cache).toBe("no-store");
    f.fetchMock.mockRejectedValue(new Error("offline"));
    expect(await (await f.request())?.text()).toBe("0123456789");
    expect(f.fetchMock.mock.calls.filter(([request]) => request.url === manifestUrl)).toHaveLength(1);
  });

  it("leaves unlisted filenames on the ordinary network path without caching them", async () => {
    const f = fixture();
    const unlisted = audioUrl.replace("a".repeat(64), "c".repeat(64));
    expect(await (await f.request(unlisted))?.text()).toBe("0123456789");
    expect(f.open).not.toHaveBeenCalledWith(cacheName);
    expect(f.writes.mock.calls.filter(([name]) => name === cacheName)).toHaveLength(0);
  });

  it("refreshes an older whitelist when a resumed batch adds a newly requested asset", async () => {
    const f = fixture();
    f.save(manifestUrl, manifestResponse({ ...manifest, assets: [manifest.assets[0]] }), manifestCacheName);
    expect(await (await f.request(mp3Url))?.text()).toBe("0123456789");
    expect(f.fetchMock.mock.calls.filter(([request]) => request.url === manifestUrl)).toHaveLength(1);
    expect(f.writes).toHaveBeenCalledWith(cacheName, mp3Url, 200);
    f.fetchMock.mockRejectedValue(new Error("offline"));
    expect(await (await f.request(mp3Url))?.text()).toBe("0123456789");
  });

  it.each([
    { ...manifest, recipe_id: "unapproved-recipe" },
    { ...manifest, assets: [{ id: "a".repeat(64), url: audioUrl + "?token=private" }] },
    { ...manifest, assets: [{ id: "a".repeat(64), url: audioUrl.replace("nahuatl-language.", "unrelated-bucket.") }] },
    { ...manifest, assets: [{ id: "b".repeat(64), url: audioUrl }] },
    { ...manifest, assets: [manifest.assets[0], manifest.assets[0]] },
  ])("rejects malformed whitelist metadata rather than granting path-only approval: %o", async invalid => {
    const f = fixture({ noManifest: true });
    f.fetchMock.mockImplementation(async request => request.url === manifestUrl ? manifestResponse(invalid) : audio());
    expect(await (await f.request())?.text()).toBe("0123456789");
    expect(f.open).not.toHaveBeenCalledWith(cacheName);
    expect(f.writes).not.toHaveBeenCalled();
  });

  it("does not hang or cache assets when the public whitelist is unavailable", async () => {
    const f = fixture({ noManifest: true });
    f.fetchMock.mockImplementation(async request => {
      if (request.url === manifestUrl) throw new Error("manifest unavailable");
      return audio();
    });
    expect(await (await f.request())?.text()).toBe("0123456789");
    expect(f.open).not.toHaveBeenCalledWith(cacheName);
    expect(f.writes).not.toHaveBeenCalled();
  });

  it("bounds a stalled whitelist request before continuing ordinary playback", async () => {
    vi.useFakeTimers();
    try {
      const f = fixture({ noManifest: true });
      f.fetchMock.mockImplementation(request => request.url === manifestUrl
        ? new Promise<Response>((_resolve, reject) => {
          request.signal.addEventListener("abort", () => reject(new Error("manifest timeout")));
        })
        : Promise.resolve(audio()));
      const pending = f.request();
      await vi.advanceTimersByTimeAsync(5000);
      expect(await (await pending)?.text()).toBe("0123456789");
      expect(f.open).not.toHaveBeenCalledWith(cacheName);
      expect(f.writes).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not cache HTML, failed or unreadable audio responses", async () => {
    for (const response of [
      new Response("login", { headers: { "Content-Type": "text/html" } }),
      new Response("missing", { status: 404, headers: { "Content-Type": "audio/wav" } }),
      new Response("partial", { status: 206, headers: { "Content-Type": "audio/wav" } }),
      Object.defineProperty(audio(), "type", { value: "opaque" }),
    ]) {
      const f = fixture();
      f.fetchMock.mockResolvedValue(response);
      expect(await f.request()).toBe(response);
      expect(f.writes).not.toHaveBeenCalled();
    }
  });

  it("ignores unrelated URLs, queries, recipes, authenticated APIs and images", () => {
    const f = fixture();
    for (const url of [
      audioUrl + "?token=private",
      audioUrl.replace("spanish-air-b-2026-10-07", "unapproved-recipe"),
      audioUrl.replace("a".repeat(64), "a".repeat(20)),
      audioUrl.replace(".wav", ".png"),
      audioUrl.replace(".com/", ".com:444/"),
      audioUrl.replace("nahuatl-language.", "unrelated-bucket."),
      "https://itzli.example/api/progress",
      "https://itzli.example/en/profile",
      "https://itzli.example/generated/image.png",
    ]) expect(f.request(url)).toBeNull();
    expect(f.request(audioUrl, {}, "POST")).toBeNull();
    expect(f.open).not.toHaveBeenCalled();
    expect(f.fetchMock).not.toHaveBeenCalled();
  });

  it("preserves requested source-audio behavior without automatically saving third-party recordings", async () => {
    const f = fixture();
    const source = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/atl.mp3";
    expect(await (await f.request(source))?.text()).toBe("0123456789");
    expect(f.open).toHaveBeenCalledWith("itzli-public-v3-1");
    expect(f.writes).not.toHaveBeenCalled();
  });
});
