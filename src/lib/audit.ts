import { createHash } from "node:crypto";
import { getSql } from "@/lib/neon";

export type AuditKind =
  | "chat_completed"      // request completed after all guardrails ran
  | "chat_empty_response" // model returned no usable text
  | "chat_upstream_error" // model/provider request failed
  | "input_flagged"       // OpenAI moderation flagged user input
  | "output_flagged"      // OpenAI moderation flagged model output
  | "injection_heuristic" // local prompt-injection detector tripped
  | "rate_limited"        // request rejected by rate limiter
  | "input_too_long"      // request exceeded size cap
  | "invalid_payload";    // malformed request

export function hashContent(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

type LogArgs = {
  userId: string;
  kind: AuditKind;
  content: string;
  categories?: string[];
  meta?: Record<string, unknown>;
};

// Raw content is never stored: only sha256 hashes and structured metadata.
// This gives us traceability without retaining user or assistant text.
export async function writeAudit({
  userId,
  kind,
  content,
  categories = [],
  meta = {},
}: LogArgs): Promise<void> {
  const contentHash = hashContent(content);
  const sql = getSql();
  await sql`
    INSERT INTO chat_audit (user_id, kind, categories, content_hash, meta)
    VALUES (
      ${userId},
      ${kind},
      ${JSON.stringify(categories)},
      ${contentHash},
      ${JSON.stringify(meta)}
    )
  `;
}

// Fire-and-forget helper for rejection paths where the response should not
// wait on audit persistence.
export function logAudit(args: LogArgs): void {
  void writeAudit(args).catch((err: unknown) => {
    console.error("[audit] insert failed:", err);
  });
}
