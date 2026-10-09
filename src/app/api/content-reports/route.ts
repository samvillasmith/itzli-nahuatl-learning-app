import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { parseContentReport } from "@/lib/content-report";
import { contentReportEmailConfig, contentReportLocalDeliveryEnabled, contentReportPreviewMode, submitContentReportEmail } from "@/lib/content-report-email";
import { checkContentReportRateLimit, checkLocalContentReportRateLimit } from "@/lib/content-report-rate-limit";
import { hasJsonContentType, readBoundedJson, sameOriginRequest } from "@/lib/api-request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_REPORT_BYTES = 16384;
function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", ...extraHeaders } });
}
function isLoopbackRequest(req: Request): boolean {
  try {
    const url = new URL(req.url);
    const host = req.headers.get("host") ?? url.host;
    if (/[\s/@\\]/.test(host)) return false;
    const destination = new URL(`${url.protocol}//${host}`);
    const loopback = (hostname: string) => ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
    return loopback(url.hostname) && loopback(destination.hostname);
  } catch { return false; }
}
function deliveryAvailable(req: Request): boolean {
  return !contentReportPreviewMode() && Boolean(contentReportEmailConfig())
    && (!contentReportLocalDeliveryEnabled() || isLoopbackRequest(req));
}

/** Public delivery status carries no credentials or account information. */
export async function GET(req: Request) {
  return json({ delivery: deliveryAvailable(req) ? "server" : "unavailable" });
}

export async function POST(req: Request) {
  if (!sameOriginRequest(req)) return json({ error: "invalid_origin" }, 403);
  if (!hasJsonContentType(req)) return json({ error: "invalid_report" }, 415);
  let value: unknown;
  try { value = await readBoundedJson(req, MAX_REPORT_BYTES); } catch (error) { return json({ error: "invalid_report" }, error instanceof RangeError ? 413 : 400); }
  const report = parseContentReport(value);
  if (!report) return json({ error: "invalid_report" }, 400);
  // Disabled/deployment previews never reach authentication, SQL or the provider.
  if (!deliveryAvailable(req)) return json({ error: "delivery_unavailable", delivery: "unavailable", submitted: false }, 503);
  const localDelivery = contentReportLocalDeliveryEnabled();
  let userId: string | null = "local-feedback-review";
  if (!localDelivery) {
    try { ({ userId } = await auth()); } catch { return json({ error: "delivery_unavailable", submitted: false }, 503); }
    if (!userId) return json({ error: "sign_in_required", submitted: false }, 401);
  }
  try {
    const rate = localDelivery ? checkLocalContentReportRateLimit() : await checkContentReportRateLimit(userId);
    if (!rate.ok) return json({ error: "rate_limited" }, 429, { "Retry-After": String(Math.max(1, Math.ceil(rate.retryAfterMs / 1000))) });
  } catch { return json({ error: "delivery_unavailable", submitted: false }, 503); }
  try {
    await submitContentReportEmail(report, userId);
    // Provider acceptance is not a guarantee of inbox delivery.
    return json({ delivery: "server", submitted: true, reportId: report.submissionId });
  } catch { return json({ error: "delivery_unavailable", submitted: false }, 503); }
}
