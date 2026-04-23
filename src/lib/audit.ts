import { createHash } from "node:crypto";
import { getSql } from "@/lib/neon";

export type AuditKind =
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

// Fire-and-forget: we never block a user response on audit persistence.
// Raw content is never stored — only a sha256 hash for grouping repeat
// offenders or recurring attack patterns.
export function logAudit({ userId, kind, content, categories = [], meta = {} }: LogArgs): void {
  const contentHash = hashContent(content);
  const sql = getSql();
  void sql`
    INSERT INTO chat_audit (user_id, kind, categories, content_hash, meta)
    VALUES (
      ${userId},
      ${kind},
      ${JSON.stringify(categories)},
      ${contentHash},
      ${JSON.stringify(meta)}
    )
  `.catch((err: unknown) => {
    console.error("[audit] insert failed:", err);
  });
}
