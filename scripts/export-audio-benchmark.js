#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, MMS_MODEL, sourceRows, sha256 } = require("./lib/course-audio-inputs");

// Source-spelling anchors, not a phonetic certification or invented minimal pairs.
const SPECS = [
  [1, 3, ["long-i", "double-l"]], [1, 11, ["long-a", "long-o", "tl"]],
  [1, 20, ["cu", "hu", "tl"]], [1, 27, ["hu", "tz", "tl"]],
  [1, 34, ["long-i", "final-uh"]], [1, 35, ["long-o", "final-uh"]],
  [1, 44, ["tz", "h"]], [1, 49, ["long-a", "tl"]],
  [1, 53, ["long-e", "long-o", "tl"]], [1, 54, ["short-e", "tl"]],
  [2, 8, ["x", "qu", "command"]], [2, 9, ["x", "command"]],
  [2, 19, ["hu", "command"]], [2, 37, ["question", "tiitztoc"]],
  [2, 38, ["long-a", "niitztoc"]], [6, 9, ["qu", "present"]],
  [6, 15, ["ch", "present"]], [12, 4, ["ch", "singular-future"]],
  [11, 10, ["long-o", "farewell"]],
];

function buildBenchmark() {
  const course = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/nahuatlahtolli-course.json"), "utf8"));
  const sources = sourceRows(course);
  const records = SPECS.map(([lesson, index, features]) => {
    const source = sources.find((r) => r.source_id === `source-${lesson}-${index}`);
    if (!source?.audio_url || !source.text) throw new Error(`Missing source anchor ${lesson}:${index}`);
    return { kind: "benchmark", id: source.source_id, runtime_text: source.text,
      synthesis_text: source.text, translation: source.translation,
      text_sha256: sha256(source.text), synthesis_text_sha256: sha256(source.text),
      content_review: "source-form", review_status: "unreviewed", generation_allowed: true,
      legacy_hold: false, units: [], features, source_refs: [source],
      native_source_audio_url: source.audio_url,
      limitations: ["Source spelling and recording reference; feature labels do not certify a model's realization."] };
  });
  return { schema_version: 1, model: MMS_MODEL, scope: "source-linked pronunciation comparison",
    source_sha256: sha256(fs.readFileSync(path.join(ROOT, "src/data/nahuatlahtolli-course.json"))), records };
}
function main(argv = process.argv.slice(2)) {
  const manifest = buildBenchmark();
  if (argv.includes("--write")) {
    const out = path.join(ROOT, "src/data/audio-source-benchmark.json");
    fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`Source-linked benchmark: ${out}`);
  }
  console.log(`Native source references: ${manifest.records.length}; no source media downloaded or rehosted.`);
}
if (require.main === module) main();
module.exports = { SPECS, buildBenchmark };
