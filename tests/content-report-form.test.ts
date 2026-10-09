import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../src/components/ReportIssueButton.tsx", import.meta.url), "utf8");

describe("direct feedback form wiring", () => {
  it("submits to the server and requires an acknowledged matching report before displaying success", () => {
    expect(source).toContain('fetch("/api/content-reports", { method: "POST"');
    expect(source).toContain('result.submitted === true && result.reportId === reportValue.submissionId');
    expect(source).toContain('Submit for review');
    expect(source).not.toMatch(/reportMailto|email-client|local-preview|clipboard|Copy report|Open email draft|Preview report|Prepare email/);
  });

  it("keeps entries available after failures and uses a stable submission ID for unchanged retries", () => {
    expect(source).toContain('Your entries are still here. Please try submitting the report again.');
    expect(source).toContain('submission.current?.fingerprint !== fingerprint');
    expect(source).not.toMatch(/setDetails\(""\)|setCorrection\(""\)|setReplyEmail\(""\)/);
  });
});
