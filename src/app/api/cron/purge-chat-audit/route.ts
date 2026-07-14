import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSql } from "@/lib/neon";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sql = getSql();
    const removed = await sql`
      DELETE FROM chat_audit
      WHERE created_at < NOW() - INTERVAL '24 months'
      RETURNING id
    `;
    const rateLimitTable = await sql`
      SELECT to_regclass('public.chat_rate_limits') AS table_name
    `;
    if (rateLimitTable[0]?.table_name) {
      await sql`
        DELETE FROM chat_rate_limits
        WHERE bucket_start < NOW() - INTERVAL '2 hours'
      `;
    }
    return NextResponse.json({ ok: true, removed: removed.length });
  } catch (error) {
    console.error("[retention] purge failed", error);
    return NextResponse.json({ error: "Purge failed" }, { status: 503 });
  }
}
