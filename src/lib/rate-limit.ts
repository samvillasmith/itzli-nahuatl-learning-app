import { getSql } from "@/lib/neon";

type Window = {
  limit: number;
  windowMs: number;
};

const WINDOWS: Record<string, Window> = {
  burst: { limit: 20, windowMs: 10 * 60 * 1000 },
  hourly: { limit: 100, windowMs: 60 * 60 * 1000 },
};

export type RateLimitResult =
  | { ok: true; remaining: number; resetMs: number }
  | { ok: false; retryAfterMs: number; window: string };

let setupPromise: Promise<void> | null = null;

function ensureRateLimitTable(): Promise<void> {
  setupPromise ??= (async () => {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS chat_rate_limits (
        user_id      VARCHAR(64) NOT NULL,
        window_name  VARCHAR(16) NOT NULL,
        bucket_start TIMESTAMPTZ NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, window_name, bucket_start)
      )
    `;
  })();
  return setupPromise;
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  await ensureRateLimitTable();
  const now = Date.now();
  let tightest: Extract<RateLimitResult, { ok: true }> = {
    ok: true,
    remaining: Number.POSITIVE_INFINITY,
    resetMs: 0,
  };

  for (const [name, window] of Object.entries(WINDOWS)) {
    const bucketMs = Math.floor(now / window.windowMs) * window.windowMs;
    const bucketStart = new Date(bucketMs).toISOString();
    const sql = getSql();
    const rows = await sql`
      INSERT INTO chat_rate_limits (user_id, window_name, bucket_start, request_count)
      VALUES (${userId}, ${name}, ${bucketStart}, 1)
      ON CONFLICT (user_id, window_name, bucket_start)
      DO UPDATE SET request_count = chat_rate_limits.request_count + 1
      RETURNING request_count
    `;
    const count = Number(rows[0]?.request_count ?? window.limit + 1);
    const retryAfterMs = bucketMs + window.windowMs - now;
    if (count > window.limit) {
      return { ok: false, retryAfterMs, window: name };
    }

    const remaining = window.limit - count;
    if (remaining < tightest.remaining) {
      tightest = { ok: true, remaining, resetMs: retryAfterMs };
    }
  }

  return tightest;
}
