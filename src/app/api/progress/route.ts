import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSql } from "@/lib/neon";

// GET /api/progress — fetch user's cloud progress
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getSql();
  const rows = await sql`
    SELECT progress, srs FROM user_progress WHERE user_id = ${userId}
  `;

  if (rows.length === 0) return NextResponse.json({ progress: null, srs: null });
  return NextResponse.json({ progress: rows[0].progress, srs: rows[0].srs });
}

// POST /api/progress — upsert user's cloud progress
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { progress, srs } = await req.json();

  const sql = getSql();
  await sql`
    INSERT INTO user_progress (user_id, progress, srs, updated_at)
    VALUES (${userId}, ${JSON.stringify(progress)}, ${JSON.stringify(srs)}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      progress   = EXCLUDED.progress,
      srs        = EXCLUDED.srs,
      updated_at = NOW()
  `;

  return NextResponse.json({ ok: true });
}

// DELETE /api/progress — GDPR right to erasure
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getSql();
  await sql`DELETE FROM user_progress WHERE user_id = ${userId}`;

  return NextResponse.json({ ok: true });
}
