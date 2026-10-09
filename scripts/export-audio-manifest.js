#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { DEFAULT_MANIFEST, loadCurrentAudioManifest } = require("./lib/course-audio-inputs");

function main(argv = process.argv.slice(2)) {
  const option = (name) => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1]; };
  const manifest = loadCurrentAudioManifest(option("--db"));
  const out = path.resolve(option("--out") || DEFAULT_MANIFEST);
  if (argv.includes("--write")) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`Frozen offline audio inputs: ${out}`);
  }
  console.log(JSON.stringify(manifest.summary, null, 2));
  if (!argv.includes("--write")) console.log("Dry run: no authentication, provider calls, downloads, or writes.");
}
if (require.main === module) main();
module.exports = { main };
