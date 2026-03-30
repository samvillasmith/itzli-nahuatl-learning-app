/**
 * Creates the user_progress table in NeonDB.
 * Run once: node scripts/db-setup.js
 *
 * Requires DATABASE_URL in .env.local
 */

const fs = require("fs");
const path = require("path");

// Load .env.local manually (no dotenv dependency)
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const { neon } = require("@neondatabase/serverless");

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL not set in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log("Creating user_progress table...");

  // One row per user: entire progress and SRS blobs stored as JSONB.
  // Simpler than row-per-unit and sufficient for ~43 units of data.
  await sql`
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id    VARCHAR(64) PRIMARY KEY,
      progress   JSONB NOT NULL DEFAULT '{"version":1,"units":{}}',
      srs        JSONB NOT NULL DEFAULT '{"version":1,"words":{}}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log("✅  user_progress table ready.");
}

run().catch((err) => {
  console.error("❌  Migration failed:", err.message);
  process.exit(1);
});
