import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/neon";

const MAX_WEBHOOK_BYTES = 64 * 1024;

async function boundedWebhookRequest(req: NextRequest): Promise<NextRequest> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_WEBHOOK_BYTES) {
    throw new RangeError("Webhook payload too large");
  }
  const reader = req.body?.getReader();
  if (!reader) throw new SyntaxError("Missing webhook body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_WEBHOOK_BYTES) {
      await reader.cancel();
      throw new RangeError("Webhook payload too large");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new NextRequest(req.url, { method: "POST", headers: req.headers, body });
}

export async function POST(req: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(await boundedWebhookRequest(req));
  } catch (error) {
    console.error("[clerk-webhook] verification failed", error);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  if (event.type !== "user.deleted") {
    return NextResponse.json({ ok: true });
  }

  const userId = event.data.id;
  if (!userId) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }

  try {
    const sql = getSql();
    const tables = await sql`
      SELECT
        to_regclass('public.user_progress') AS progress_table,
        to_regclass('public.chat_audit') AS audit_table,
        to_regclass('public.chat_rate_limits') AS rate_limit_table
    `;
    if (tables[0]?.progress_table) {
      await sql`DELETE FROM user_progress WHERE user_id = ${userId}`;
    }
    if (tables[0]?.audit_table) {
      await sql`DELETE FROM chat_audit WHERE user_id = ${userId}`;
    }
    if (tables[0]?.rate_limit_table) {
      await sql`DELETE FROM chat_rate_limits WHERE user_id = ${userId}`;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[clerk-webhook] account cleanup failed", error);
    // Clerk retries non-2xx webhook deliveries, and each delete is idempotent.
    return NextResponse.json({ error: "Cleanup failed" }, { status: 503 });
  }
}
