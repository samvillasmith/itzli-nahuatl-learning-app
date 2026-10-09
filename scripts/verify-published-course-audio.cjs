#!/usr/bin/env node
"use strict";
// Public, unauthenticated integrity verification of the new owned audio prefix.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {OUT, RECIPE} = require("./generate-all-course-audio.cjs");
const sha = buffer => crypto.createHash("sha256").update(buffer).digest("hex");
async function verify(assets, options = {}) {
  const expected = `https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/audio-v3/${RECIPE}/`;
  if (assets.some(asset => asset.url !== `${expected}${asset.id}.mp3` || !/^[a-f0-9]{64}$/.test(asset.id))) throw new Error("Unexpected public audio URL");
  const reportFile = path.join(OUT, "s3-public-verification.private.json");
  const prior = options.reuseVerified && fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, "utf8")) : null;
  const reusable = new Map((prior?.summary?.recipe_id === RECIPE ? prior.results : []).filter(row =>
    row.pass && row.status === 200 && row.hash_matches && row.size_matches && row.content_type?.startsWith("audio/") && row.cache_control?.includes("immutable") && ["*", "http://127.0.0.1:3000"].includes(row.cors)
  ).map(row => [row.id, row]));
  let cursor = 0; let checked = 0; let reused = 0; const results = [];
  async function worker() {
    for (;;) {
      const index = cursor++; if (index >= assets.length) return;
      const asset = assets[index]; let result;
      const previous = reusable.get(asset.id);
      if (previous?.expected_audio_sha256 === asset.audio_sha256 && previous.byte_length === asset.byte_length) {
        results.push({...previous, checked_at: previous.checked_at || prior.summary.checked_at}); reused++; continue;
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(asset.url, {headers: {Origin: "http://127.0.0.1:3000"}, credentials: "omit", redirect: "error", signal: AbortSignal.timeout(20000)});
          const bytes = Buffer.from(await response.arrayBuffer());
          result = {id: asset.id, checked_at: new Date().toISOString(), expected_audio_sha256: asset.audio_sha256, status: response.status, byte_length: bytes.length, hash_matches: sha(bytes) === asset.audio_sha256, size_matches: bytes.length === asset.byte_length, content_type: response.headers.get("content-type"), cache_control: response.headers.get("cache-control"), cors: response.headers.get("access-control-allow-origin")};
          result.pass = result.status === 200 && result.hash_matches && result.size_matches && result.content_type?.startsWith("audio/") && result.cache_control?.includes("immutable") && ["*", "http://127.0.0.1:3000"].includes(result.cors);
          if (result.pass || response.status < 500) break;
        } catch (error) {result = {id: asset.id, pass: false, error: error.message};}
      }
      results.push(result); checked++; if (checked % 500 === 0) console.log(JSON.stringify({checked, total: assets.length, failures: results.filter(item => !item.pass).length}));
    }
  }
  await Promise.all(Array.from({length: 24}, worker));
  const summary = {recipe_id: RECIPE, checked_at: new Date().toISOString(), newly_checked: checked, reused_unchanged_verified: reused, total: assets.length, passed: results.filter(result => result.pass).length, failed: results.filter(result => !result.pass), bytes: assets.reduce((sum, asset) => sum + asset.byte_length, 0)};
  fs.writeFileSync(reportFile, JSON.stringify({summary, results}, null, 2) + "\n");
  console.log(JSON.stringify(summary));
  if (summary.failed.length) throw new Error(`${summary.failed.length} public audio assets failed verification`);
  return summary;
}
if (require.main === module) {
  const file = path.join(OUT, "delivery-manifest.private.json");
  verify(JSON.parse(fs.readFileSync(file, "utf8")).assets, {reuseVerified: process.argv.includes("--reuse-verified")}).catch(error => {console.error(error.message); process.exitCode = 1;});
}
module.exports = {verify};
