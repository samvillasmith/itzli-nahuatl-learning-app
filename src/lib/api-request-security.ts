/** Browser mutations must target the canonical request origin. An HTTP Host
 * header cannot redefine that destination; only development loopback aliases
 * with the identical protocol and port accommodate Next's URL normalization. */
export function sameOriginRequest(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const requestUrl = new URL(req.url);
    if (!["http:", "https:"].includes(requestUrl.protocol)) return false;
    let destination = requestUrl;
    const host = req.headers.get("host");
    if (host !== null) {
      if (!host || /[\s/@\\?#]/.test(host)) return false;
      const headerDestination = new URL(`${requestUrl.protocol}//${host}`);
      if (headerDestination.origin !== requestUrl.origin) {
        const loopback = (hostname: string) => ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
        if (process.env.NODE_ENV !== "development" || process.env.VERCEL === "1"
          || !loopback(requestUrl.hostname) || !loopback(headerDestination.hostname)
          || headerDestination.protocol !== requestUrl.protocol || headerDestination.port !== requestUrl.port) return false;
        destination = headerDestination;
      }
    }
    const source = new URL(origin);
    return ["http:", "https:"].includes(source.protocol)
      && origin === source.origin && origin === destination.origin;
  } catch { return false; }
}

export function hasJsonContentType(req: Request): boolean {
  return /^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") ?? "");
}

/** Content-Length is only a hint: enforce the limit while reading chunks too. */
export async function readBoundedBody(req: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = req.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared)
    || !Number.isSafeInteger(Number(declared)) || Number(declared) > maxBytes)) {
    throw new RangeError("Payload too large");
  }
  const reader = req.body?.getReader();
  if (!reader) throw new SyntaxError("Missing request body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RangeError("Payload too large");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function readBoundedJson(req: Request, maxBytes: number): Promise<unknown> {
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readBoundedBody(req, maxBytes)));
}
