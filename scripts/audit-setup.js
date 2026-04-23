/**
 * Creates the chat_audit table in NeonDB.
 * Run once: node scripts/audit-setup.js
 *
 * Stores moderation/guardrail events — never raw user content.
 * content_hash is a sha256 digest so repeated offenders / patterns can be
 * grouped without retaining the text itself.
 */

const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const { neon } = require("@neondatabase/serverless");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log("Creating chat_audit table...");

  await sql`
    CREATE TABLE IF NOT EXISTS chat_audit (
      id            BIGSERIAL PRIMARY KEY,
      user_id       VARCHAR(64) NOT NULL,
      kind          VARCHAR(32) NOT NULL,
      categories    JSONB NOT NULL DEFAULT '[]',
      content_hash  CHAR(64)    NOT NULL,
      meta          JSONB       NOT NULL DEFAULT '{}',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS chat_audit_user_id_created_at_idx
    ON chat_audit (user_id, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS chat_audit_kind_created_at_idx
    ON chat_audit (kind, created_at DESC)
  `;

  console.log("chat_audit table ready.");
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
