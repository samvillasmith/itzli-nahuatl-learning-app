import { describe, expect, it } from "vitest";
import { isReportEmail, parseContentReport, reportEmailSubject, reportEmailText } from "../src/lib/content-report";

const payload = () => ({ submissionId: "21b3a73e-74c8-4ac9-80b2-b7dd3375f45f", locale: "en", category: "word",
  context: { pagePath: "/en/units/44", lessonNumber: 44, lessonId: "stable-lesson", lessonTitle: "Meet someone", itemId: "ehn-word", form: "kenihki", meaning: "how" },
  details: "The displayed meaning needs review.", correction: "Suggested regional usage", reporterName: "", replyEmail: "", speaker: false, community: "", contactConsent: false, website: "" });
describe("bounded content reports", () => {
  it("preserves lesson route identity and written form without changing orthography", () => {
    expect(parseContentReport(payload())).toMatchObject({ context: { lessonNumber: 44, lessonId: "stable-lesson", form: "kenihki" } });
    const report = parseContentReport(payload())!;
    expect(reportEmailSubject(report)).toBe("[Itzli] word report — lesson 44");
    expect(reportEmailText(report)).toContain("https://www.itzli.app/en/units/44");
  });
  it("rejects recipient/header overrides, arrays and malformed fields", () => {
    for (const extra of [{ to: "someone@example.org" }, { headers: {} }, { from: "intruder@example.org" }]) expect(parseContentReport({ ...payload(), ...extra })).toBeNull();
    expect(parseContentReport([])).toBeNull();
    expect(parseContentReport({ ...payload(), submissionId: "not-a-uuid" })).toBeNull();
    expect(parseContentReport({ ...payload(), context: { pagePath: "//elsewhere.example" } })).toBeNull();
    expect(parseContentReport({ ...payload(), context: { pagePath: "/units/44?token=secret" } })).toBeNull();
    expect(parseContentReport({ ...payload(), category: "whatever" })).toBeNull();
  });
  it("rejects mail header injection and requires an address for contact permission", () => {
    expect(isReportEmail("speaker@example.org\r\nBcc: elsewhere@example.org")).toBe(false);
    expect(parseContentReport({ ...payload(), replyEmail: "speaker@example.org\n" })).toBeNull();
    expect(parseContentReport({ ...payload(), contactConsent: true })).toBeNull();
    expect(parseContentReport({ ...payload(), replyEmail: "speaker@example.org", contactConsent: true, speaker: true, community: "Chicontepec" })).toMatchObject({ contactConsent: true, community: "Chicontepec" });
  });
  it("does not classify self-reported speaker status as verified linguistic evidence", () => {
    const report = parseContentReport({ ...payload(), speaker: true })!;
    expect(reportEmailText(report)).toContain("self-reported");
    expect(reportEmailText(report)).toContain("not an automatic change");
  });
  it("rejects oversized reports, hidden bot fields and credential-bearing reference URLs", () => {
    expect(parseContentReport({ ...payload(), details: "x".repeat(3001) })).toBeNull();
    expect(parseContentReport({ ...payload(), website: "bot.example" })).toBeNull();
    expect(parseContentReport({ ...payload(), context: { pagePath: "/units/44", sourceUrl: "https://user:pass@example.org/book" } })).toBeNull();
    const report = parseContentReport({ ...payload(), context: { pagePath: "/units/44", sourceUrl: "https://example.org/book?token=private#page=10" } })!;
    expect(report.context.sourceUrl).toBe("https://example.org/book#page=10");
  });
});
