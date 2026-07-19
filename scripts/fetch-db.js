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
const DOWNLOAD_PATH = `${OUT_PATH}.download`;

function normalizeDatabase(dbPath) {
  const Database = require("better-sqlite3");
  const db = new Database(dbPath);

  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
    const journalMode = db.pragma("journal_mode = DELETE", { simple: true });
    const integrity = db.pragma("quick_check", { simple: true });

    if (journalMode !== "delete") {
      throw new Error(`Could not set portable journal mode: ${journalMode}`);
    }
    if (integrity !== "ok") {
      throw new Error(`Database integrity check failed: ${integrity}`);
    }
  } finally {
    db.close();
  }
}

// Always re-download on CI/Vercel so build-cache never serves a stale DB.
if (fs.existsSync(OUT_PATH) && !process.env.CI && !process.env.VERCEL) {
  console.log("DB already present (local dev), skipping download.");
  process.exit(0);
}

console.log("Downloading database from S3...");
for (const suffix of ["", "-shm", "-wal"]) {
  fs.rmSync(`${DOWNLOAD_PATH}${suffix}`, { force: true });
}
const file = fs.createWriteStream(DOWNLOAD_PATH);

https.get(DB_URL, (res) => {
  if (res.statusCode !== 200) {
    file.close();
    fs.rmSync(DOWNLOAD_PATH, { force: true });
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
    file.close((closeError) => {
      try {
        if (closeError) throw closeError;
        normalizeDatabase(DOWNLOAD_PATH);
        fs.renameSync(DOWNLOAD_PATH, OUT_PATH);
        console.log("\nDatabase downloaded and normalized successfully.");
      } catch (err) {
        fs.rmSync(DOWNLOAD_PATH, { force: true });
        console.error("\nDatabase validation failed:", err.message);
        process.exitCode = 1;
      }
    });
  });
}).on("error", (err) => {
  file.close();
  fs.rmSync(DOWNLOAD_PATH, { force: true });
  console.error("Download failed:", err.message);
  process.exit(1);
});
