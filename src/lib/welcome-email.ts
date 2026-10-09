import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getSql } from "./neon";
import { isReportEmail } from "./content-report";
import { isLocalReviewMode } from "./local-review";
import { welcomeEmailContent } from "./welcome-email-template";

// Resend retains an idempotency key for 24h. Leave a margin for network delays.
const SAFE_RETRY_MS = 23 * 60 * 60 * 1000;
const LEASE_MS = 60 * 1000;

type WelcomePayload = { from: string; to: [string]; reply_to: string; subject: string; text: string; html: string };
type WelcomeCandidate = { userId: string; email: string; firstName: unknown; locale: "en" | "es"; createdAt: number };
export type WelcomeEmailResult = "preview" | "disabled" | "skipped" | "accepted" | "already-accepted" | "deleted";

export class WelcomeEmailError extends Error {
  constructor(public readonly reason: "configuration" | "storage" | "busy" | "delivery" | "uncertain") {
    super(`Welcome email ${reason}`);
  }
}

/** Welcome delivery requires the actual production deployment, never a local build. */
export function welcomeEmailProductionMode(): boolean {
  return !isLocalReviewMode() && process.env.NODE_ENV === "production"
    && process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
}

function welcomeEmailConfig() {
  const from = process.env.ITZLI_WELCOME_EMAIL_FROM?.trim() ?? "";
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const startsAt = process.env.ITZLI_WELCOME_EMAIL_START_AT?.trim() ?? "";
  const startTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(startsAt) ? Date.parse(startsAt) : NaN;
  if (!isReportEmail(from) || !apiKey || /[\r\n]/.test(apiKey) || !Number.isFinite(startTime)) {
    throw new WelcomeEmailError("configuration");
  }
  return { from, apiKey, startTime };
}

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

/** Verified webhook data still needs a verified primary address, never an arbitrary secondary email. */
export function welcomeCandidate(data: unknown): WelcomeCandidate | null {
  if (!record(data) || typeof data.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(data.id)
    || typeof data.primary_email_address_id !== "string" || !Array.isArray(data.email_addresses)
    || typeof data.created_at !== "number" || !Number.isSafeInteger(data.created_at) || data.created_at < 0
    || data.banned === true || data.locked === true) return null;
  const primary = data.email_addresses.find((address) => record(address) && address.id === data.primary_email_address_id);
  if (!record(primary) || !record(primary.verification) || primary.verification.status !== "verified"
    || typeof primary.email_address !== "string" || !isReportEmail(primary.email_address)) return null;
  return {
    userId: data.id, email: primary.email_address, firstName: data.first_name,
    locale: typeof data.locale === "string" && /^es(?:-|$)/i.test(data.locale) ? "es" : "en",
    createdAt: data.created_at,
  };
}

export function welcomeAccountHash(userId: string): string {
  return createHash("sha256").update(userId).digest("hex");
}

// Uses the same lazy schema setup pattern as report counters. No setup runs in preview.
async function ensureWelcomeEmailTable() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS welcome_email_deliveries (
      account_hash CHAR(64) PRIMARY KEY,
      status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'uncertain', 'deleted')),
      payload_json TEXT,
      first_attempt_at TIMESTAMPTZ,
      lease_token UUID,
      lease_expires_at TIMESTAMPTZ,
      provider_id VARCHAR(128),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

function storedPayload(raw: unknown): WelcomePayload {
  if (typeof raw !== "string") throw new WelcomeEmailError("storage");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new WelcomeEmailError("storage"); }
  if (!record(parsed) || typeof parsed.from !== "string" || !Array.isArray(parsed.to) || parsed.to.length !== 1
    || typeof parsed.to[0] !== "string" || !isReportEmail(parsed.to[0]) || parsed.reply_to !== "admin@itzli.app"
    || typeof parsed.subject !== "string" || typeof parsed.text !== "string" || typeof parsed.html !== "string") {
    throw new WelcomeEmailError("storage");
  }
  return parsed as WelcomePayload;
}

/** Persistent receipts suppress duplicate events even after Resend's 24h cache expires. */
export async function sendSignupWelcome(data: unknown): Promise<WelcomeEmailResult> {
  if (!welcomeEmailProductionMode()) return "preview";
  if (process.env.ITZLI_WELCOME_EMAIL_ENABLED !== "1") return "disabled";
  const candidate = welcomeCandidate(data);
  if (!candidate) return "skipped";
  const config = welcomeEmailConfig();
  // user.updated lets delayed email verification receive a welcome without mailing old accounts.
  if (candidate.createdAt < config.startTime) return "skipped";
  const accountHash = welcomeAccountHash(candidate.userId);
  const payload: WelcomePayload = {
    from: `Itzli <${config.from}>`, to: [candidate.email], reply_to: "admin@itzli.app",
    ...welcomeEmailContent(candidate.firstName, candidate.locale),
  };
  const token = randomUUID();
  const now = Date.now();
  let savedPayload: WelcomePayload;
  try {
    await ensureWelcomeEmailTable();
    const sql = getSql();
    // Mark ambiguous old attempts before any possible resend, and erase personal payload.
    await sql`
      UPDATE welcome_email_deliveries
      SET status = 'uncertain', payload_json = NULL, lease_token = NULL, lease_expires_at = NULL, updated_at = NOW()
      WHERE account_hash = ${accountHash} AND status = 'pending'
        AND first_attempt_at <= ${new Date(now - SAFE_RETRY_MS).toISOString()}
    `;
    const rows = await sql`
      INSERT INTO welcome_email_deliveries (account_hash, payload_json, first_attempt_at, lease_token, lease_expires_at)
      VALUES (${accountHash}, ${JSON.stringify(payload)}, ${new Date(now).toISOString()}, ${token}, ${new Date(now + LEASE_MS).toISOString()})
      ON CONFLICT (account_hash) DO UPDATE
        SET lease_token = EXCLUDED.lease_token, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = NOW()
        WHERE welcome_email_deliveries.status = 'pending'
          AND (welcome_email_deliveries.lease_expires_at IS NULL OR welcome_email_deliveries.lease_expires_at <= NOW())
      RETURNING payload_json
    `;
    if (!rows.length) {
      const existing = await sql`SELECT status FROM welcome_email_deliveries WHERE account_hash = ${accountHash}`;
      if (existing[0]?.status === "accepted") return "already-accepted";
      if (existing[0]?.status === "deleted") return "deleted";
      if (existing[0]?.status === "uncertain") throw new WelcomeEmailError("uncertain");
      throw new WelcomeEmailError("busy");
    }
    savedPayload = storedPayload(rows[0].payload_json);
  } catch (error) {
    if (error instanceof WelcomeEmailError) throw error;
    throw new WelcomeEmailError("storage");
  }

  let providerId: string;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `itzli-welcome/${accountHash}` },
      body: JSON.stringify(savedPayload),
    });
    if (!response.ok) throw new WelcomeEmailError("delivery");
    const receipt: unknown = await response.json();
    if (!record(receipt) || typeof receipt.id !== "string" || !receipt.id || receipt.id.length > 128
      || /[\u0000-\u001f\u007f]/.test(receipt.id)) throw new WelcomeEmailError("delivery");
    providerId = receipt.id;
  } catch {
    // Do not clear the stored payload or attempt clock: a timeout may follow provider acceptance.
    try {
      const sql = getSql();
      await sql`UPDATE welcome_email_deliveries SET lease_token = NULL, lease_expires_at = NULL WHERE account_hash = ${accountHash} AND lease_token = ${token} AND status = 'pending'`;
    } catch { /* The short lease lets a later retry recover from a storage outage. */ }
    throw new WelcomeEmailError("delivery");
  }

  try {
    const sql = getSql();
    const rows = await sql`
      UPDATE welcome_email_deliveries
      SET status = 'accepted', provider_id = ${providerId}, payload_json = NULL,
        lease_token = NULL, lease_expires_at = NULL, updated_at = NOW()
      WHERE account_hash = ${accountHash} AND lease_token = ${token} AND status = 'pending'
      RETURNING status
    `;
    if (!rows.length) throw new WelcomeEmailError("storage");
  } catch { throw new WelcomeEmailError("storage"); }
  return "accepted";
}

/** Keep only a hash tombstone so delayed creation/update events cannot welcome a deleted account. */
export async function markWelcomeAccountDeleted(userId: string): Promise<void> {
  if (!welcomeEmailProductionMode()) return;
  if (process.env.ITZLI_WELCOME_EMAIL_ENABLED !== "1") {
    // Disabling future welcomes must not strand personal data in an existing ledger.
    const sql = getSql();
    const tables = await sql`SELECT to_regclass('public.welcome_email_deliveries') AS welcome_table`;
    if (!tables[0]?.welcome_table) return;
  } else {
    await ensureWelcomeEmailTable();
  }
  const accountHash = welcomeAccountHash(userId);
  const sql = getSql();
  await sql`
    INSERT INTO welcome_email_deliveries (account_hash, status)
    VALUES (${accountHash}, 'deleted')
    ON CONFLICT (account_hash) DO UPDATE
      SET status = 'deleted', payload_json = NULL, provider_id = NULL,
        lease_token = NULL, lease_expires_at = NULL, updated_at = NOW()
  `;
}
