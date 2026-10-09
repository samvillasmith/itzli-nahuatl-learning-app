"use strict";

// Offline release gate. No environment-file reads, remote RAG writes,
// embeddings, account access or downloads are performed.
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, chunkSha256 } = require("../src/lib/reviewed-tutor-gate.cjs");
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "src/data/reviewed-tutor-context.json");

function currentReviewedTutorContext() {
  const courseOnly = path.join(ROOT, "fcn_course_release.sqlite");
  if (!fs.existsSync(courseOnly)) throw new Error("Course-only release database is required for reviewed tutor context.");
  const previous = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = courseOnly;
  try {
    const { loadVocab, loadPhrases, loadGrammar } = require("./rag-populate.js");
    const { loadTs } = require("./lib/course-audio-inputs.js");
    const { isAppContentExcluded } = loadTs("src/lib/app-content-safety.ts");
    const chunks = [...loadVocab(), ...loadPhrases(), ...loadGrammar()]
      .filter(chunk => !isAppContentExcluded(chunk.content, JSON.stringify(chunk.metadata)));
    const unique = new Map(chunks.map(chunk => [chunkSha256(chunk), chunk]));
    return {
      schemaVersion: 1,
      scope: "Exact current reviewed local tutor seeds; remote IDs and review claims are not trusted.",
      notice: {
        source: "Nāhuatlahtolli, COERLL / The University of Texas at Austin",
        authors: ["Sabina de la Cruz", "Catalina de la Cruz", "Josefrayn Sánchez-Perry", "Kelly McDonough", "Sergio Romero"],
        sourceUrl: "https://tlahtolli.coerll.utexas.edu/",
        sourceLicense: "CC BY-SA (publisher listing; version unspecified)",
        sourceLicenseListingUrl: "https://coerll.utexas.edu/coerll/oer/nahuatlahtolli/",
        contributionLicense: "CC BY-SA 4.0",
        contributionLicenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        changes: "Selected course expressions, reviewed short vocabulary labels and original Itzli grammar summaries. Original source and media notices remain applicable. No dictionary corpus, Bible extracts or unreviewed morphology is included.",
      },
      seeds: [...unique].sort(([a], [b]) => a.localeCompare(b)).map(([sha256, chunk]) => ({ ...chunk, sha256 })),
    };
  } finally {
    if (previous === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = previous;
  }
}

function prepareReviewedTutorContext({ check = false } = {}) {
  const current = currentReviewedTutorContext();
  if (check) {
    if (!fs.existsSync(OUTPUT) || canonicalJson(JSON.parse(fs.readFileSync(OUTPUT, "utf8"))) !== canonicalJson(current)) {
      throw new Error("Reviewed tutor context is missing or stale. Prepare it locally before release.");
    }
  } else {
    const text = `${JSON.stringify(current, null, 2)}\n`;
    if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, "utf8") !== text) fs.writeFileSync(OUTPUT, text);
  }
  return current;
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || !["--check", "--prepare"].includes(args[0])) throw new Error("Use --prepare or --check.");
    const catalog = prepareReviewedTutorContext({ check: args[0] === "--check" });
    console.log(`Reviewed tutor context verified: ${catalog.seeds.length} exact local seeds; no remote services accessed.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { currentReviewedTutorContext, prepareReviewedTutorContext, OUTPUT };
