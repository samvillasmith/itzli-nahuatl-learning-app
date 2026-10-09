import "server-only";

import { getSql } from "@/lib/neon";
import { contentReportLocalDeliveryEnabled } from "./content-report-email";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const RETENTION_MS = 7 * DAY_MS;
const WINDOWS = [
  { name: "hourly", limit: 6, windowMs: HOUR_MS },
  { name: "daily", limit: 20, windowMs: DAY_MS },
] as const;

export type ContentReportRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterMs: number };

let setupPromise: Promise<void> | null = null;
let localBuckets: { hourly: number; daily: number; hourlyCount: number; dailyCount: number } | null = null;

/** One bounded local counter set; no reporter identity, message or database writes. */
export function checkLocalContentReportRateLimit(): ContentReportRateLimitResult {
  if (!contentReportLocalDeliveryEnabled()) throw new Error("Local report delivery is disabled");
  const now = Date.now();
  const hourly = Math.floor(now / HOUR_MS) * HOUR_MS;
  const daily = Math.floor(now / DAY_MS) * DAY_MS;
  localBuckets = {
    hourly, daily,
    hourlyCount: Math.min(7, localBuckets?.hourly === hourly ? localBuckets.hourlyCount + 1 : 1),
    dailyCount: Math.min(21, localBuckets?.daily === daily ? localBuckets.dailyCount + 1 : 1),
  };
  const retryAfterMs = Math.max(
    localBuckets.hourlyCount > 6 ? hourly + HOUR_MS - now : 0,
    localBuckets.dailyCount > 20 ? daily + DAY_MS - now : 0,
  );
  return retryAfterMs > 0 ? { ok: false, retryAfterMs } : { ok: true };
}

function ensureReportRateLimitTable(): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS content_report_rate_limits (
          user_id VARCHAR(64) NOT NULL,
          window_name VARCHAR(16) NOT NULL,
          bucket_start TIMESTAMPTZ NOT NULL,
          request_count INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (user_id, window_name, bucket_start)
        )
      `;
    })().catch((error: unknown) => {
      // A transient setup failure must not poison every subsequent request.
      setupPromise = null;
      throw error;
    });
  }
  return setupPromise;
}

/**
 * Counts authenticated report attempts in fixed hourly and UTC daily windows.
 * The route must validate its payload and reject deployment previews before calling.
 * Errors propagate so callers can refuse delivery when storage is unavailable.
 */
export async function checkContentReportRateLimit(userId: string): Promise<ContentReportRateLimitResult> {
  if (typeof userId !== "string" || userId.length === 0 || userId.length > 64
    || userId.trim() !== userId || /[\u0000-\u001f\u007f]/.test(userId)) {
    throw new TypeError("Invalid report account ID");
  }

  const now = Date.now();
  await ensureReportRateLimitTable();
  const sql = getSql();

  // Retain only short-lived counters; never store report text, email or IP.
  await sql`
    DELETE FROM content_report_rate_limits
    WHERE bucket_start < ${new Date(now - RETENTION_MS).toISOString()}
  `;

  const bucketStarts = WINDOWS.map((window) =>
    new Date(Math.floor(now / window.windowMs) * window.windowMs).toISOString());
  // Both counters advance in one atomic statement. Concurrent instances cannot
  // read the same old count and both overwrite it with an allowed value.
  const rows = await sql`
    INSERT INTO content_report_rate_limits (user_id, window_name, bucket_start, request_count)
    VALUES
      (${userId}, 'hourly', ${bucketStarts[0]}, 1),
      (${userId}, 'daily', ${bucketStarts[1]}, 1)
    ON CONFLICT (user_id, window_name, bucket_start)
    DO UPDATE SET request_count = content_report_rate_limits.request_count + 1
    RETURNING window_name, request_count
  `;

  if (rows.length !== WINDOWS.length) throw new Error("Incomplete report rate-limit response");
  let retryAfterMs = 0;
  for (const window of WINDOWS) {
    const matching = rows.filter((row) => row.window_name === window.name);
    if (matching.length !== 1) throw new Error("Invalid report rate-limit window");
    const rawCount: unknown = matching[0].request_count;
    if ((typeof rawCount !== "number" && typeof rawCount !== "string")
      || (typeof rawCount === "string" && !/^\d+$/.test(rawCount))) {
      throw new Error("Invalid report rate-limit count");
    }
    const count = Number(rawCount);
    if (!Number.isSafeInteger(count) || count < 1) throw new Error("Invalid report rate-limit count");
    if (count > window.limit) {
      const bucketEnd = (Math.floor(now / window.windowMs) + 1) * window.windowMs;
      retryAfterMs = Math.max(retryAfterMs, bucketEnd - now);
    }
  }

  return retryAfterMs > 0 ? { ok: false, retryAfterMs } : { ok: true };
}
