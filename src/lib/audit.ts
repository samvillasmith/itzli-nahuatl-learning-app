import { createHmac } from "node:crypto";
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
  // A dedicated key is preferred. Falling back to Clerk's already-secret
  // server key keeps deployed audit logging keyed during rollout.
  const secret = process.env.AUDIT_HASH_SECRET ?? process.env.CLERK_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUDIT_HASH_SECRET is not set");
    }
    return createHmac("sha256", "itzli-development-only")
      .update(text, "utf8")
      .digest("hex");
  }
  return createHmac("sha256", secret).update(text, "utf8").digest("hex");
}

type LogArgs = {
  userId: string;
  kind: AuditKind;
  content: string;
  categories?: string[];
  meta?: Record<string, unknown>;
};

// Raw content is never stored: only keyed sha256 hashes and structured metadata.
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

export async function logAudit(args: LogArgs): Promise<void> {
  try {
    await writeAudit(args);
  } catch (error) {
    console.error("[audit] insert failed:", error);
    if (process.env.REQUIRE_CHAT_AUDIT === "true") throw error;
  }
}
