import "server-only";
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
  })().catch((error: unknown) => { setupPromise = null; throw error; });
  return setupPromise;
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  if (typeof userId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(userId)) throw new TypeError("Invalid chat counter identity");
  await ensureRateLimitTable();
  const now = Date.now();
  let tightest: Extract<RateLimitResult, { ok: true }> = {
    ok: true,
    remaining: Number.POSITIVE_INFINITY,
    resetMs: 0,
  };

  const entries = Object.entries(WINDOWS);
  const bucketStarts = entries.map(([, window]) => new Date(Math.floor(now / window.windowMs) * window.windowMs).toISOString());
  const sql = getSql();
  const rows = await sql`
    INSERT INTO chat_rate_limits (user_id, window_name, bucket_start, request_count)
    VALUES (${userId}, ${entries[0][0]}, ${bucketStarts[0]}, 1),
           (${userId}, ${entries[1][0]}, ${bucketStarts[1]}, 1)
    ON CONFLICT (user_id, window_name, bucket_start)
    DO UPDATE SET request_count = LEAST(chat_rate_limits.request_count + 1, 101)
    RETURNING window_name, request_count
  `;
  if (rows.length !== entries.length) throw new Error("Incomplete chat counter response");
  for (const [name, window] of entries) {
    const bucketMs = Math.floor(now / window.windowMs) * window.windowMs;
    const matching = rows.filter(row => row.window_name === name);
    if (matching.length !== 1) throw new Error("Invalid chat counter window");
    const raw: unknown = matching[0].request_count;
    if ((typeof raw !== "number" && typeof raw !== "string") || typeof raw === "string" && !/^\d+$/.test(raw)) throw new Error("Invalid chat counter count");
    const count = Number(raw);
    if (!Number.isSafeInteger(count) || count < 1) throw new Error("Invalid chat counter count");
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
