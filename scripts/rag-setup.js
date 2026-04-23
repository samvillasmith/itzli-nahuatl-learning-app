/**
 * Creates the pgvector extension + rag_chunks table on Neon.
 * Run once: node scripts/rag-setup.js
 *
 * If CREATE EXTENSION fails, enable pgvector from the Neon dashboard:
 *   Neon Console → your project → Extensions → enable "vector".
 */

const fs = require("fs");
const path = require("path");

// Load .env.local and .env (.env.local wins).
for (const file of [".env.local", ".env"]) {
  const p = path.join(__dirname, "..", file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim();
    }
  }
}

const { neon } = require("@neondatabase/serverless");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set (.env or .env.local)");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log("Enabling pgvector extension...");
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  } catch (err) {
    console.error("Could not create vector extension automatically.");
    console.error("Enable it via the Neon dashboard:");
    console.error("  Neon Console → project → Extensions → enable 'vector'");
    console.error("Underlying error:", err.message);
    process.exit(1);
  }

  console.log("Creating rag_chunks table...");
  await sql`
    CREATE TABLE IF NOT EXISTS rag_chunks (
      id          BIGSERIAL PRIMARY KEY,
      kind        VARCHAR(32) NOT NULL,
      content     TEXT        NOT NULL,
      metadata    JSONB       NOT NULL DEFAULT '{}',
      embedding   VECTOR(1536) NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log("Creating HNSW cosine-similarity index...");
  // HNSW > IVFFlat for < 1M rows; cosine matches text-embedding-3-small normalization.
  await sql`
    CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
    ON rag_chunks USING hnsw (embedding vector_cosine_ops)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS rag_chunks_kind_idx ON rag_chunks (kind)
  `;

  console.log("rag_chunks ready. Next: node scripts/rag-populate.js");
}

run().catch((err) => {
  console.error("RAG migration failed:", err.message);
  process.exit(1);
});
