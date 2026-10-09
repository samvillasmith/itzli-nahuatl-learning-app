import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSql } from "@/lib/neon";
import { parseProgressData, parseSrsData } from "@/lib/progress-schema";
import { mergeLearningStates, parseLearningState } from "@/lib/learning-schema";
import { cloudProgressEnabled } from "@/lib/progress-cloud-policy";
import { mergeCloudProgress, ProgressConflictError } from "@/lib/progress-server";
import { hasJsonContentType, readBoundedJson, sameOriginRequest } from "@/lib/api-request-security";
import { checkProgressRateLimit, type ProgressMutation } from "@/lib/progress-rate-limit";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...NO_STORE, ...init?.headers },
  });
}

async function mutationLimit(userId: string, action: ProgressMutation): Promise<Response | null> {
  try {
    const rate = await checkProgressRateLimit(userId, action);
    return rate.ok ? null : json({ error: "Too many progress updates" }, {
      status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(rate.retryAfterMs / 1000))) },
    });
  } catch { return json({ error: "Progress storage unavailable" }, { status: 503 }); }
}

export async function GET() {
  if (!cloudProgressEnabled()) return json({ mode: "local", progress: null, srs: null, learning: null });
  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT progress, srs, updated_at::text AS revision FROM user_progress WHERE user_id = ${userId}
    `;
    if (rows.length === 0) return json({ progress: null, srs: null });

    const progress = parseProgressData(rows[0].progress);
    const srs = parseSrsData(rows[0].srs);
    if (!progress || !srs) return json({ error: "Stored progress needs recovery" }, { status: 409 });
    return json({ progress, srs, learning: srs.learning ?? null, revision: rows[0].revision });
  } catch (error) {
    console.error("[progress] fetch failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "Progress storage unavailable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!cloudProgressEnabled()) return json({ mode: "local", error: "Cloud progress is disabled in this environment" }, { status: 403 });
  if (!sameOriginRequest(req)) return json({ error: "Invalid request origin" }, { status: 403 });
  if (!hasJsonContentType(req)) return json({ error: "JSON content required" }, { status: 415 });
  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });
  const limited = await mutationLimit(userId, "save");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await readBoundedJson(req, MAX_BODY_BYTES);
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
  if (record.learning !== undefined && record.learning !== null) {
    const learning = parseLearningState(record.learning);
    if (!learning) return json({ error: "Invalid learning payload" }, { status: 400 });
    srs.learning = srs.learning ? mergeLearningStates(srs.learning, learning) : learning;
  }

  try {
    const merged = await mergeCloudProgress(userId, progress, srs);
    return json({ ok: true, ...merged, learning: merged.srs.learning ?? null });
  } catch (error) {
    if (error instanceof ProgressConflictError) return json({ error: error.message }, { status: 409 });
    console.error("[progress] save failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "Progress storage unavailable" }, { status: 503 });
  }
}

export async function DELETE(req: Request) {
  if (!cloudProgressEnabled()) return json({ mode: "local", error: "Cloud progress is disabled in this environment" }, { status: 403 });
  if (!sameOriginRequest(req)) return json({ error: "Invalid request origin" }, { status: 403 });
  const { userId } = await auth();
  if (!userId) return json({ error: "Unauthorized" }, { status: 401 });
  const limited = await mutationLimit(userId, "reset");
  if (limited) return limited;

  try {
    const sql = getSql();
    await sql`DELETE FROM user_progress WHERE user_id = ${userId}`;
    return json({ ok: true });
  } catch (error) {
    console.error("[progress] delete failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "Progress storage unavailable" }, { status: 503 });
  }
}
