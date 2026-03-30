#!/usr/bin/env node
/**
 * Downloads the SQLite database from S3 if it isn't present locally.
 * Runs automatically before `npm run dev` and `npm run build`.
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const DB_URL   = "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/database/fcn_master_lexicon_phase8_6_primer.sqlite";
const OUT_PATH = path.resolve(__dirname, "..", "fcn_master_lexicon_phase8_6_primer.sqlite");

if (fs.existsSync(OUT_PATH)) {
  console.log("DB already present, skipping download.");
  process.exit(0);
}

console.log("Downloading database from S3...");
const file = fs.createWriteStream(OUT_PATH);

https.get(DB_URL, (res) => {
  if (res.statusCode !== 200) {
    file.close();
    fs.unlinkSync(OUT_PATH);
    console.error(`S3 responded with HTTP ${res.statusCode}`);
    process.exit(1);
  }

  const total = parseInt(res.headers["content-length"] || "0", 10);
  let received = 0;

  res.on("data", (chunk) => {
    received += chunk.length;
    if (total) {
      const pct = ((received / total) * 100).toFixed(0);
      process.stdout.write(`\r  ${pct}% (${(received / 1e6).toFixed(1)} MB)`);
    }
  });

  res.pipe(file);

  file.on("finish", () => {
    file.close();
    console.log("\nDatabase downloaded successfully.");
  });
}).on("error", (err) => {
  file.close();
  if (fs.existsSync(OUT_PATH)) fs.unlinkSync(OUT_PATH);
  console.error("Download failed:", err.message);
  process.exit(1);
});
