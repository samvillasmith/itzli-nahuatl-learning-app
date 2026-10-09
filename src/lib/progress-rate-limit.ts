import "server-only";
import { getSql } from "./neon";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const POLICIES = {
  save: [
    { name: "minute", limit: 120, windowMs: MINUTE_MS },
    { name: "hour", limit: 1200, windowMs: HOUR_MS },
  ],
  reset: [
    { name: "hour", limit: 10, windowMs: HOUR_MS },
    { name: "day", limit: 20, windowMs: DAY_MS },
  ],
} as const;

export type ProgressMutation = keyof typeof POLICIES;
export type ProgressRateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };
let setupPromise: Promise<void> | null = null;

function ensureTable(): Promise<void> {
  setupPromise ??= (async () => {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS progress_rate_limits (
        user_id VARCHAR(128) NOT NULL,
        action_name VARCHAR(8) NOT NULL,
        window_name VARCHAR(8) NOT NULL,
        bucket_start TIMESTAMPTZ NOT NULL,
        request_count INTEGER NOT NULL,
        PRIMARY KEY (user_id, action_name, window_name, bucket_start)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS progress_rate_limits_retention ON progress_rate_limits (bucket_start)`;
  })().catch((error: unknown) => { setupPromise = null; throw error; });
  return setupPromise;
}

/** Atomic database counters apply across instances; no progress or IP is stored.
 * Storage failures propagate so mutations cannot bypass the limit. */
export async function checkProgressRateLimit(userId: string, action: ProgressMutation): Promise<ProgressRateLimitResult> {
  if (typeof userId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(userId)
    || !Object.hasOwn(POLICIES, action)) throw new TypeError("Invalid progress counter identity");
  const windows = POLICIES[action];
  const now = Date.now();
  const starts = windows.map(window => new Date(Math.floor(now / window.windowMs) * window.windowMs).toISOString());
  await ensureTable();
  const sql = getSql();
  await sql`DELETE FROM progress_rate_limits WHERE bucket_start < ${new Date(now - 2 * DAY_MS).toISOString()}`;
  // Cap rejected counters as well, so persistent abuse cannot overflow an integer.
  const cap = Math.max(...windows.map(window => window.limit)) + 1;
  const rows = await sql`
    INSERT INTO progress_rate_limits (user_id, action_name, window_name, bucket_start, request_count)
    VALUES (${userId}, ${action}, ${windows[0].name}, ${starts[0]}, 1),
           (${userId}, ${action}, ${windows[1].name}, ${starts[1]}, 1)
    ON CONFLICT (user_id, action_name, window_name, bucket_start)
    DO UPDATE SET request_count = LEAST(progress_rate_limits.request_count + 1, ${cap})
    RETURNING window_name, request_count
  `;
  if (rows.length !== windows.length) throw new Error("Incomplete progress counter response");
  let retryAfterMs = 0;
  for (const window of windows) {
    const matches = rows.filter(row => row.window_name === window.name);
    if (matches.length !== 1) throw new Error("Invalid progress counter window");
    const raw: unknown = matches[0].request_count;
    if ((typeof raw !== "number" && typeof raw !== "string")
      || typeof raw === "string" && !/^\d+$/.test(raw)) throw new Error("Invalid progress counter count");
    const count = Number(raw);
    if (!Number.isSafeInteger(count) || count < 1) throw new Error("Invalid progress counter count");
    if (count > window.limit) retryAfterMs = Math.max(retryAfterMs, (Math.floor(now / window.windowMs) + 1) * window.windowMs - now);
  }
  return retryAfterMs > 0 ? { ok: false, retryAfterMs } : { ok: true };
}
