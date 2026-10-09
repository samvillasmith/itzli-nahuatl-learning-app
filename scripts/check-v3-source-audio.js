"use strict";

// Check public source-file headers only. No downloads, synthesis or credentials.
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const outputPath = path.join(root, "data/media-audit/v3-source-audio-network.json");
const lexicon = read("src/data/v3-verified-lexicon.json");
const course = read("src/data/v3-original-course.json");
const urls = [...new Set([...lexicon.entries, ...course.phrases].map(row => row.audioUrl).filter(Boolean))];
for (const url of urls) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "tlahtolli.coerll.utexas.edu") throw new Error("Unexpected source host");
}
function head(url, redirects = 0) {
  return new Promise(resolve => {
    const request = https.request(url, { method: "HEAD", timeout: 10000 }, response => {
      response.resume();
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const next = new URL(response.headers.location, url);
        if (redirects < 3 && next.protocol === "https:" && next.hostname === "tlahtolli.coerll.utexas.edu") {
          resolve(head(next.href, redirects + 1)); return;
        }
      }
      resolve({ status: response.statusCode, contentType: response.headers["content-type"] ?? null,
        contentLength: response.headers["content-length"] ?? null, finalUrl: url,
        available: response.statusCode >= 200 && response.statusCode < 300 && /^audio\//i.test(response.headers["content-type"] ?? "") && response.headers["content-length"] !== "0" });
    });
    request.on("timeout", () => request.destroy(new Error("Request timed out")));
    request.on("error", error => resolve({ status: null, available: false, error: error.message }));
    request.end();
  });
}
async function main() {
  if (!process.argv.includes("--check")) { console.log(JSON.stringify({ publicSourceUrls: urls.length, requestsMade: 0 })); return; }
  const prior = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, "utf8")) : { records: [] };
  const cache = new Map(prior.records.filter(row => row.status !== null && Date.now() - Date.parse(row.checkedAt) < 86400000).map(row => [row.url, row]));
  const records = [];
  let requestsMade = 0;
  for (let start = 0; start < urls.length; start += 3) {
    const batch = await Promise.all(urls.slice(start, start + 3).map(async url => {
      if (cache.has(url)) return cache.get(url);
      requestsMade++;
      return { url, checkedAt: new Date().toISOString(), ...await head(url) };
    }));
    records.push(...batch);
    if (records.length % 30 === 0) console.log(`${records.length}/${urls.length} source URLs checked`);
  }
  const summary = { publicSourceUrls: urls.length, availableHeaders: records.filter(row => row.available).length,
    unavailableOrUnconfirmed: records.filter(row => !row.available).length, requestsMade,
    networkPermissionBlocks: records.filter(row => /EACCES|EPERM/.test(row.error ?? "")).length,
    scope: "HTTP headers only; not heard pronunciation or full playback certification" };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({ schemaVersion: 1, summary, records }, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 2));
}
void main().catch(error => { console.error(error.message); process.exitCode = 1; });
