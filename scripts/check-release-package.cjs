"use strict";

const path = require("node:path");
const { checkRelease } = require("./prepare-course-release.cjs");
const { execFileSync } = require("node:child_process");
const { privateReleasePathReason, resolveTraceReference, readReleaseTraces } = require("./lib/release-trace-policy.cjs");
const root = path.resolve(__dirname, "..");
const output = path.join(root, ".next");
checkRelease();
execFileSync(process.execPath, [path.join(__dirname, "prepare-release-media.cjs"), "--check"], { cwd: root, stdio: "inherit" });
const traces = readReleaseTraces(output);
const release = path.join(root, "fcn_course_release.sqlite");
let includesRelease = 0;
const violations = new Set();
for (const { filename, trace } of traces) {
  for (const ref of trace.files) {
    const absolute = resolveTraceReference(filename, ref);
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    if (absolute === release) includesRelease++;
    if (privateReleasePathReason(root, absolute)) violations.add(relative);
  }
}
if (violations.size) throw new Error(`Private research/diagnostic files in release traces: ${[...violations].join(", ")}`);
if (!includesRelease) throw new Error("Course-only database missing from actual release traces.");
console.log(JSON.stringify({ traces: traces.length, courseDatabaseIncludes: includesRelease,
  privateResearchFiles: 0, diagnosticPublicFiles: 0, status: "PASS" }, null, 2));
