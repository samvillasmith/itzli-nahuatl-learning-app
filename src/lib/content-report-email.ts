import "server-only";

import { createHash } from "node:crypto";
import { isReportEmail, REPORT_RECIPIENT, reportEmailSubject, reportEmailText, type ContentReport } from "./content-report";
import { isLocalReviewMode } from "./local-review";

/** Explicitly authorized local delivery. Deployment previews cannot enable it. */
export function contentReportLocalDeliveryEnabled(): boolean {
  return isLocalReviewMode() && process.env.ITZLI_REPORT_EMAIL_ALLOW_LOCAL === "1";
}
export function contentReportPreviewMode(): boolean {
  if (isLocalReviewMode()) return !contentReportLocalDeliveryEnabled();
  return process.env.NODE_ENV !== "production" || process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "production";
}
export function contentReportEmailConfig() {
  const from = process.env.ITZLI_REPORT_EMAIL_FROM?.trim() ?? "";
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  return process.env.ITZLI_REPORT_EMAIL_ENABLED === "1" && isReportEmail(from) && apiKey ? { from, apiKey } : null;
}
export class ReportEmailError extends Error {
  constructor() { super("Report email submission failed"); }
}

/** Course feedback always goes to the fixed admin mailbox; report text never becomes an email header. */
export async function submitContentReportEmail(report: ContentReport, userId: string): Promise<string> {
  const config = contentReportEmailConfig();
  if (contentReportPreviewMode() || !config) throw new ReportEmailError();
  const accountHash = createHash("sha256").update(userId).digest("hex");
  const idempotencyKey = `itzli-report/${accountHash}/${report.submissionId}`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ from: `Itzli feedback <${config.from}>`, to: [REPORT_RECIPIENT],
        subject: reportEmailSubject(report), text: reportEmailText(report),
        ...(report.contactConsent && report.replyEmail ? { reply_to: report.replyEmail } : {}),
      }),
    });
    if (!response.ok) throw new ReportEmailError();
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string" || !result.id || result.id.length > 128) throw new ReportEmailError();
    return result.id;
  } catch { throw new ReportEmailError(); }
}
