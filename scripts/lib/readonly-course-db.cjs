"use strict";

// Readonly tools use the same shipped course as the app. Authoring tools keep
// their separate research resolver; this helper never downloads a missing file.
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const RELEASE_FILENAME = "fcn_course_release.sqlite";
const MASTER_FILENAME = "fcn_master_lexicon_phase8_6_primer.sqlite";

function resolveReadonlyCourseDbPath({ root = ROOT, explicitPath, env = process.env } = {}) {
  const selected = explicitPath || env.DATABASE_PATH;
  if (selected) {
    const filename = path.resolve(root, selected);
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
      throw new Error("Selected local course database missing; offline verification never downloads or substitutes it.");
    }
    return filename;
  }
  for (const name of [RELEASE_FILENAME, MASTER_FILENAME]) {
    const filename = path.join(root, name);
    if (fs.existsSync(filename) && fs.statSync(filename).isFile()) return filename;
  }
  throw new Error("Local course database missing; prepare the course-only release locally. Offline verification never downloads it.");
}

function dictionaryAuditScope(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);
  if (tables.includes("lexicon_entries")) return "local research dictionary included";
  const scope = tables.includes("release_metadata")
    ? db.prepare("SELECT value FROM release_metadata WHERE key = ?").get("scope")?.value
    : null;
  if (!scope?.startsWith("course-only")) {
    throw new Error("Raw dictionary absent without checked course-only release scope metadata.");
  }
  return "course-only release; raw dictionary excluded (scope metadata checked)";
}

module.exports = { resolveReadonlyCourseDbPath, dictionaryAuditScope, RELEASE_FILENAME, MASTER_FILENAME };
