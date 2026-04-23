// In-memory sliding-window rate limiter keyed by Clerk userId.
//
// Best-effort only: serverless instances don't share memory, so a user who
// happens to land on different instances can get ~N x limit. Acceptable as
// a first layer — moderation and OpenAI's own abuse controls sit behind it.
// Swap for Upstash/Redis when the app scales horizontally.

type Window = {
  limit: number;
  windowMs: number;
};

const WINDOWS: Record<string, Window> = {
  burst: { limit: 20, windowMs: 10 * 60 * 1000 },
  hourly: { limit: 100, windowMs: 60 * 60 * 1000 },
};

// userId -> windowName -> timestamps (ms since epoch)
const hits = new Map<string, Map<string, number[]>>();

export type RateLimitResult =
  | { ok: true; remaining: number; resetMs: number }
  | { ok: false; retryAfterMs: number; window: string };

export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  let perUser = hits.get(userId);
  if (!perUser) {
    perUser = new Map();
    hits.set(userId, perUser);
  }

  let tightest: RateLimitResult = {
    ok: true,
    remaining: Infinity,
    resetMs: 0,
  };

  for (const [name, window] of Object.entries(WINDOWS)) {
    const cutoff = now - window.windowMs;
    const arr = (perUser.get(name) ?? []).filter((t) => t > cutoff);
    perUser.set(name, arr);

    if (arr.length >= window.limit) {
      const oldest = arr[0];
      return {
        ok: false,
        retryAfterMs: oldest + window.windowMs - now,
        window: name,
      };
    }

    const remaining = window.limit - arr.length - 1;
    if (tightest.ok && remaining < tightest.remaining) {
      tightest = {
        ok: true,
        remaining,
        resetMs: window.windowMs,
      };
    }
  }

  // Record this request in every window.
  for (const name of Object.keys(WINDOWS)) {
    const arr = perUser.get(name) ?? [];
    arr.push(now);
    perUser.set(name, arr);
  }

  // Opportunistic cleanup: if the map grows large, drop users whose entries
  // are all outside the longest window.
  if (hits.size > 10_000) {
    const longest = Math.max(...Object.values(WINDOWS).map((w) => w.windowMs));
    const cutoff = now - longest;
    for (const [uid, windows] of hits) {
      const stillActive = [...windows.values()].some((arr) =>
        arr.some((t) => t > cutoff),
      );
      if (!stillActive) hits.delete(uid);
    }
  }

  return tightest;
}
