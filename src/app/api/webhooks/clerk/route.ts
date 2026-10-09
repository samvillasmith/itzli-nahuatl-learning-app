import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/neon";
import { markWelcomeAccountDeleted, sendSignupWelcome, welcomeEmailProductionMode, WelcomeEmailError } from "@/lib/welcome-email";
import { readBoundedBody } from "@/lib/api-request-security";

const MAX_WEBHOOK_BYTES = 64 * 1024;

async function boundedWebhookRequest(req: NextRequest): Promise<NextRequest> {
  const body = await readBoundedBody(req, MAX_WEBHOOK_BYTES);
  // Reject invalid UTF-8 before the SDK decodes the signed body.
  new TextDecoder("utf-8", { fatal: true }).decode(body);
  return new NextRequest(req.url, { method: "POST", headers: req.headers, body });
}

export async function POST(req: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(await boundedWebhookRequest(req));
  } catch (error) {
    console.error("[clerk-webhook] verification failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    try {
      await sendSignupWelcome(event.data);
      return NextResponse.json({ ok: true });
    } catch (error) {
      // A static reason is safe to log; never include the event, address or API response.
      console.error("[clerk-webhook] welcome email failed", error instanceof WelcomeEmailError ? error.reason : "unexpected");
      return NextResponse.json({ error: "Welcome delivery unavailable" }, { status: 503 });
    }
  }

  // Preview/local deployments must never replay signed events into the live
  // progress database or the welcome delivery ledger.
  if (!welcomeEmailProductionMode()) return NextResponse.json({ ok: true, mode: "preview" });

  if (event.type !== "user.deleted") {
    return NextResponse.json({ ok: true });
  }

  const userId = event.data.id;
  if (typeof userId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(userId)) {
    return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
  }

  try {
    // Mark deletion before cleanup so a late signup event cannot send a welcome.
    await markWelcomeAccountDeleted(userId);
    const sql = getSql();
    const tables = await sql`
      SELECT
        to_regclass('public.user_progress') AS progress_table,
        to_regclass('public.chat_audit') AS audit_table,
        to_regclass('public.chat_rate_limits') AS rate_limit_table,
        to_regclass('public.content_report_rate_limits') AS report_rate_limit_table,
        to_regclass('public.progress_rate_limits') AS progress_rate_limit_table
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
    if (tables[0]?.report_rate_limit_table) {
      await sql`DELETE FROM content_report_rate_limits WHERE user_id = ${userId}`;
    }
    if (tables[0]?.progress_rate_limit_table) {
      await sql`DELETE FROM progress_rate_limits WHERE user_id = ${userId}`;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[clerk-webhook] account cleanup failed", error instanceof Error ? error.name : "unknown");
    // Clerk retries non-2xx webhook deliveries, and each delete is idempotent.
    return NextResponse.json({ error: "Cleanup failed" }, { status: 503 });
  }
}
