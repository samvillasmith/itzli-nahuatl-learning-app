import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSql } from "@/lib/neon";
import { welcomeEmailProductionMode } from "@/lib/welcome-email";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const supplied = header.slice("Bearer ".length);
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!welcomeEmailProductionMode()) {
    return json({ error: "Retention is disabled in this environment" }, 503);
  }

  try {
    const sql = getSql();
    const rateLimitTable = await sql`
      SELECT to_regclass('public.chat_audit') AS audit_table,
        to_regclass('public.chat_rate_limits') AS table_name,
        to_regclass('public.progress_rate_limits') AS progress_table
    `;
    // The tutor may never have been enabled, so there can be no audit table.
    const removed = rateLimitTable[0]?.audit_table ? await sql`
      DELETE FROM chat_audit
      WHERE created_at < NOW() - INTERVAL '24 months'
      RETURNING id
    ` : [];
    if (rateLimitTable[0]?.table_name) {
      await sql`
        DELETE FROM chat_rate_limits
        WHERE bucket_start < NOW() - INTERVAL '2 hours'
      `;
    }
    if (rateLimitTable[0]?.progress_table) {
      await sql`DELETE FROM progress_rate_limits WHERE bucket_start < NOW() - INTERVAL '2 days'`;
    }
    return json({ ok: true, removed: removed.length });
  } catch (error) {
    console.error("[retention] purge failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "Purge failed" }, 503);
  }
}
