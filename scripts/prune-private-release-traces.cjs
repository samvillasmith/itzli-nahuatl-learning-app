"use strict";

// Edit generated trace metadata only. Private source files and generated assets
// remain untouched; the independent package guard runs immediately afterward.
const fs = require("node:fs");
const path = require("node:path");
const { privateReleasePathReason, resolveTraceReference, readReleaseTraces } = require("./lib/release-trace-policy.cjs");

function prunePrivateReleaseTraces({ root = path.resolve(__dirname, ".."), write = false } = {}) {
  root = path.resolve(root);
  const output = path.join(root, ".next");
  // Validate every trace before changing any file, so a malformed trace cannot
  // leave a partially processed build with a misleading successful summary.
  const traces = readReleaseTraces(output);
  let removed = 0;
  const plans = traces.map(({ filename, original, trace }) => {
    const files = trace.files.filter(reference => {
      const prohibited = privateReleasePathReason(root, resolveTraceReference(filename, reference));
      if (prohibited) removed++;
      return !prohibited;
    });
    return { filename, original, changed: files.length !== trace.files.length,
      replacement: { ...trace, files } };
  });
  if (write) {
    for (const plan of plans) {
      if (fs.readFileSync(plan.filename, "utf8") !== plan.original) throw new Error("Release traces changed during processing; retry after the build settles.");
    }
    for (const plan of plans.filter(plan => plan.changed)) {
      fs.writeFileSync(plan.filename, JSON.stringify(plan.replacement));
    }
  }
  return { traceFiles: traces.length, tracesChanged: plans.filter(plan => plan.changed).length,
    privateReferencesRemoved: removed, generatedTraceWrites: write ? plans.filter(plan => plan.changed).length : 0,
    privateFilesDeleted: 0, assetFilesChanged: 0, mode: write ? "write" : "read-only" };
}

module.exports = { prunePrivateReleaseTraces };
if (require.main === module) console.log(JSON.stringify(prunePrivateReleaseTraces({ write: process.argv.includes("--write") }), null, 2));
