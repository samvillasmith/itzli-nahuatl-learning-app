import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSql } from "@/lib/neon";
import { emptySrs, parseProgressData, parseSrsData } from "@/lib/progress-schema";

const MAX_BODY_BYTES = 256 * 1024;
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...NO_STORE, ...init?.headers },
  });
}

async function readLimitedJson(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new RangeError("Payload too large");
  }

  const reader = req.body?.getReader();
  if (!reader) throw new SyntaxError("Missing request body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError("Payload too large");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT progress, srs FROM user_progress WHERE user_id = ${userId}
    `;
    if (rows.length === 0) return json({ progress: null, srs: null });

    const progress = parseProgressData(rows[0].progress);
    const srs = parseSrsData(rows[0].srs) ?? emptySrs();
    if (!progress) return json({ progress: null, srs: null });
    return json({ progress, srs });
  } catch (error) {
    console.error("[progress] fetch failed", error);
    return json({ error: "Progress storage unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await readLimitedJson(req);
  } catch (error) {
    const status = error instanceof RangeError ? 413 : 400;
    return json({ error: status === 413 ? "Payload too large" : "Invalid JSON" }, { status });
  }

  if (typeof body !== "object" || body === null) {
    return json({ error: "Invalid progress payload" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const progress = parseProgressData(record.progress);
  const srs = parseSrsData(record.srs);
  if (!progress || !srs) {
    return json({ error: "Invalid progress payload" }, { status: 400 });
  }

  try {
    const sql = getSql();
    await sql`
      INSERT INTO user_progress (user_id, progress, srs, updated_at)
      VALUES (${userId}, ${JSON.stringify(progress)}, ${JSON.stringify(srs)}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        progress   = EXCLUDED.progress,
        srs        = EXCLUDED.srs,
        updated_at = NOW()
    `;
    return json({ ok: true });
  } catch (error) {
    console.error("[progress] save failed", error);
    return json({ error: "Progress storage unavailable" }, { status: 503 });
  }
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sql = getSql();
    await sql`DELETE FROM user_progress WHERE user_id = ${userId}`;
    return json({ ok: true });
  } catch (error) {
    console.error("[progress] delete failed", error);
    return json({ error: "Progress storage unavailable" }, { status: 503 });
  }
}
