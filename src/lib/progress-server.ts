import { getSql } from "./neon";
import { parseProgressData, parseSrsData, type ProgressData, type SrsData } from "./progress-schema";
import { mergeProgressData, mergeSrsData } from "./progress-merge";

export class ProgressConflictError extends Error {}
export type ProgressSnapshot = { progress: ProgressData; srs: SrsData; revision: string };

/** Compare-and-swap retries merge against the newest row, preserving disjoint
 * units, completion history, per-device counters, and additive learning state.
 * Existing SQL columns and v2 requests remain compatible; no DDL is run here. */
export async function mergeCloudProgress(userId: string, incomingProgress: ProgressData, incomingSrs: SrsData): Promise<ProgressSnapshot> {
  const sql = getSql();
  for (let attempt = 0; attempt < 5; attempt++) {
    const rows = await sql`SELECT progress, srs, updated_at::text AS revision FROM user_progress WHERE user_id = ${userId}`;
    if (!rows.length) {
      const created = await sql`
        INSERT INTO user_progress (user_id, progress, srs, updated_at)
        VALUES (${userId}, ${JSON.stringify(incomingProgress)}, ${JSON.stringify(incomingSrs)}, clock_timestamp())
        ON CONFLICT (user_id) DO NOTHING
        RETURNING updated_at::text AS revision
      `;
      if (created.length) return { progress: incomingProgress, srs: incomingSrs, revision: String(created[0].revision) };
      continue;
    }
    const existingProgress = parseProgressData(rows[0].progress), existingSrs = parseSrsData(rows[0].srs);
    // An unreadable historical record must be recovered, never replaced by an
    // empty/new browser snapshot. Leave the raw production row unchanged.
    if (!existingProgress || !existingSrs) throw new ProgressConflictError("Stored progress needs recovery");
    const progress = parseProgressData(mergeProgressData(existingProgress, incomingProgress));
    const srs = parseSrsData(mergeSrsData(existingSrs, incomingSrs));
    // A bounded schema must not become unreadable after unioning individually
    // valid snapshots. Leave both copies intact for recovery if limits are hit.
    if (!progress || !srs) throw new ProgressConflictError("Merged progress needs recovery; storage limits reached");
    const updated = await sql`
      UPDATE user_progress SET progress = ${JSON.stringify(progress)}, srs = ${JSON.stringify(srs)}, updated_at = GREATEST(clock_timestamp(), updated_at + interval '1 microsecond')
      WHERE user_id = ${userId} AND updated_at::text = ${String(rows[0].revision)}
      RETURNING updated_at::text AS revision
    `;
    if (updated.length) return { progress, srs, revision: String(updated[0].revision) };
  }
  throw new ProgressConflictError("Progress changed during sync; retry required");
}
