export const REPORT_RECIPIENT = "admin@itzli.app";
export const REPORT_CATEGORIES = ["word", "grammar", "audio", "image", "lesson", "technical", "community"] as const;
export type ReportCategory = typeof REPORT_CATEGORIES[number];
export type ReportContext = {
  pagePath: string;
  lessonNumber?: number;
  lessonId?: string;
  lessonTitle?: string;
  itemId?: string;
  form?: string;
  meaning?: string;
  sourceUrl?: string;
  activityId?: string;
};
export type ContentReport = {
  submissionId: string;
  locale: "en" | "es";
  category: ReportCategory;
  context: ReportContext;
  details: string;
  correction: string;
  reporterName: string;
  replyEmail: string;
  speaker: boolean;
  community: string;
  contactConsent: boolean;
  website: string;
};

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,63}$/i;
export function isReportEmail(value: string): boolean {
  return value.length <= 254 && !/[\r\n\s]/.test(value) && emailPattern.test(value);
}
function text(value: unknown, limit: number, multiline = false): string | null {
  if (typeof value !== "string" || value.length > limit || controlCharacters.test(value) || !multiline && /[\r\n]/.test(value)) return null;
  return value.trim();
}
function optionalText(value: unknown, limit: number): string | null | undefined {
  return value === undefined ? undefined : text(value, limit);
}

/** Accept bounded plain text only. Delivery addresses and headers never come from a report. */
export function parseContentReport(value: unknown): ContentReport | null {
  if (!record(value) || Object.keys(value).some(key => !["submissionId", "locale", "category", "context", "details", "correction", "reporterName", "replyEmail", "speaker", "community", "contactConsent", "website"].includes(key))) return null;
  if (typeof value.submissionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.submissionId)) return null;
  if (value.locale !== "en" && value.locale !== "es" || !REPORT_CATEGORIES.includes(value.category as ReportCategory)) return null;
  if (!record(value.context) || Object.keys(value.context).some(key => !["pagePath", "lessonNumber", "lessonId", "lessonTitle", "itemId", "form", "meaning", "sourceUrl", "activityId"].includes(key))) return null;
  const pagePath = text(value.context.pagePath, 300);
  if (!pagePath || !/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(pagePath) || /^\/(?:en\/)?api(?:\/|$)/.test(pagePath)) return null;
  const context: ReportContext = { pagePath };
  if (value.context.lessonNumber !== undefined) {
    if (!Number.isSafeInteger(value.context.lessonNumber) || (value.context.lessonNumber as number) < 1 || (value.context.lessonNumber as number) > 100000) return null;
    context.lessonNumber = value.context.lessonNumber as number;
  }
  for (const key of ["lessonId", "lessonTitle", "itemId", "form", "meaning", "activityId"] as const) {
    const parsed = optionalText(value.context[key], key === "form" || key === "meaning" ? 600 : 250);
    if (parsed === null) return null;
    if (parsed) context[key] = parsed;
  }
  const sourceUrl = optionalText(value.context.sourceUrl, 1200);
  if (sourceUrl === null) return null;
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
      // Do not include query tokens or account credentials in support email metadata.
      context.sourceUrl = `${url.origin}${url.pathname}${url.hash}`;
    } catch { return null; }
  }
  const details = text(value.details, 3000, true);
  const correction = text(value.correction ?? "", 1200, true);
  const reporterName = text(value.reporterName ?? "", 100);
  const replyEmail = text(value.replyEmail ?? "", 254);
  const community = text(value.community ?? "", 180);
  const website = text(value.website ?? "", 200);
  if (!details || details.length < 8 || correction === null || reporterName === null || replyEmail === null || community === null || website === null || website) return null;
  if (typeof value.speaker !== "boolean" || typeof value.contactConsent !== "boolean") return null;
  if (replyEmail && !isReportEmail(replyEmail) || value.contactConsent && !replyEmail) return null;
  return { submissionId: value.submissionId.toLowerCase(), locale: value.locale, category: value.category as ReportCategory,
    context, details, correction, reporterName, replyEmail, speaker: value.speaker,
    community, contactConsent: value.contactConsent, website: "" };
}

export function reportEmailSubject(report: ContentReport): string {
  return `[Itzli] ${report.category === "community" ? "EHN community feedback" : `${report.category} report`}${report.context.lessonNumber ? ` — lesson ${report.context.lessonNumber}` : ""}`;
}

export function reportEmailText(report: ContentReport): string {
  const context = report.context;
  return [
    "Itzli course feedback", `Report ID: ${report.submissionId}`, `Category: ${report.category}`, `Language: ${report.locale}`,
    `Page: https://www.itzli.app${context.pagePath}`,
    context.lessonNumber ? `Lesson route number: ${context.lessonNumber}` : "", context.lessonId ? `Stable lesson ID: ${context.lessonId}` : "",
    context.lessonTitle ? `Lesson title: ${context.lessonTitle}` : "", context.itemId ? `Item ID: ${context.itemId}` : "",
    context.activityId ? `Activity: ${context.activityId}` : "", context.form ? `Word or phrase: ${context.form}` : "",
    context.meaning ? `Meaning shown: ${context.meaning}` : "", context.sourceUrl ? `Reference: ${context.sourceUrl}` : "",
    "", "WHAT NEEDS REVIEW", report.details, "", "SUGGESTED CORRECTION", report.correction || "Not supplied",
    "", "OPTIONAL CONTACT AND SPEAKER CONTEXT", `Name: ${report.reporterName || "Not supplied"}`,
    `Email: ${report.replyEmail || "Not supplied"}`, `May contact about this report: ${report.contactConsent ? "Yes" : "No"}`,
    `Speaks Eastern Huasteca Nahuatl (self-reported): ${report.speaker ? "Yes" : "Not indicated"}`,
    `Community / regional variety: ${report.community || "Not supplied"}`,
    "", "This is a report for human review, not an automatic change to the course.",
  ].filter((line, index, lines) => line !== "" || index > 0 && lines[index - 1] !== "").join("\n");
}
