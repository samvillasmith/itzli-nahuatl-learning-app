/**
 * Embeds learner vocabulary and selected Chicontepec source examples.
 * Automated morphology is withheld until a reviewed export exists.
 * Updating this file does not update an existing remote RAG store.
 *
 *   node scripts/rag-populate.js --dry-run    # local counts only; no services
 *   node scripts/rag-populate.js              # full rebuild (truncates first)
 *   node scripts/rag-populate.js --append     # keep existing rows
 */

const fs = require("fs");
const path = require("path");

const Module = require("module");
const ts = require("typescript");
const Database = require("better-sqlite3");
const { resolveDbPath } = require("./_db-path.js");
const { loadPhrases, loadGrammar } = require("./lib/rag-course-content.js");

function initializeServices() {
  for (const file of [".env.local", ".env"]) {
    const filename = path.join(__dirname, "..", file);
    if (!fs.existsSync(filename)) continue;
    for (const line of fs.readFileSync(filename, "utf8").split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
    }
  }
  if (!process.env.DATABASE_URL || !process.env.OPENAI_API_KEY) throw new Error("DATABASE_URL and OPENAI_API_KEY are required");
  const { neon } = require("@neondatabase/serverless");
  const OpenAI = require("openai").default || require("openai");
  sql = neon(process.env.DATABASE_URL);
  openai = new OpenAI();
}

const EMBED_MODEL = "text-embedding-3-small"; // 1536 dims, cheap, fast
const BATCH_SIZE = 100;
const APPEND = process.argv.includes("--append");
let sql;
let openai;

// Load the same learner filters and source replacements as the app, using an
// isolated TypeScript loader rather than changing global require hooks.
const courseModuleCache = new Map();
function loadCourseModule(relativePath) {
  const filename = path.resolve(__dirname, "..", relativePath);
  if (filename.endsWith(".json")) return require(filename);
  if (courseModuleCache.has(filename)) return courseModuleCache.get(filename).exports;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  courseModuleCache.set(filename, mod);
  mod.require = (request) => {
    if (request.startsWith("@/") || request.startsWith(".")) {
      const target = request.startsWith("@/")
        ? path.resolve(__dirname, "..", "src", request.slice(2))
        : path.resolve(path.dirname(filename), request);
      const resolved = fs.existsSync(`${target}.ts`) ? `${target}.ts` : target;
      return loadCourseModule(path.relative(path.resolve(__dirname, ".."), resolved));
    }
    return Module.prototype.require.call(mod, request);
  };
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true },
    fileName: filename,
  }).outputText;
  mod._compile(output, filename);
  return mod.exports;
}

function buildVocabChunks(rows) {
  const { filterCoreVocab, QUESTIONABLE_GLOSS_MARKERS } = loadCourseModule("src/data/excluded-vocab.ts");
  const { isAppContentExcluded } = loadCourseModule("src/lib/app-content-safety.ts");
  const groups = new Map();
  for (const row of rows) {
    // Reject annotations before display cleanup; hiding a warning would make
    // its unreviewed underlying entry appear to be trusted linguistic evidence.
    const rawGloss = String(row.gloss_en || "");
    if (/[⚠❌]/u.test(rawGloss) || QUESTIONABLE_GLOSS_MARKERS.some((marker) => rawGloss.toLowerCase().includes(marker))) continue;
    const number = row.lesson_number ?? row.first_lesson_number;
    if (!groups.has(number)) groups.set(number, []);
    groups.get(number).push(row);
  }
  return [...groups].flatMap(([number, items]) => filterCoreVocab(items, number))
    .filter((item) => item.gloss_en && !isAppContentExcluded(item.headword, item.display_form, item.gloss_en))
    .map((item) => {
      const headword = item.display_form || item.headword;
      return {
        kind: "vocab",
        content: `${headword} — ${item.gloss_en}${item.part_of_speech ? ` (${item.part_of_speech})` : ""}`,
        metadata: {
          headword, gloss: item.gloss_en, pos: item.part_of_speech,
          vocabulary_id: item.id, lesson_number: item.lesson_number ?? item.first_lesson_number,
          source_url: item.sourceUrl ?? null,
          evidence_scope: "Learner vocabulary filters and corrections; retrieval is not certification",
        },
      };
    });
}

function loadVocab() {
  const { SOURCE_VOCAB_PROMOTIONS } = loadCourseModule("src/data/source-vocab-promotions.ts");
  const { sourceMetadata } = require("./lib/rag-course-content.js");
  const db = new Database(resolveDbPath(), { readonly: true, fileMustExist: true });
  try {
    const rows = db.prepare(`SELECT id, entry_id, display_form AS headword, display_form, gloss_en,
      part_of_speech, semantic_domain, lesson_number, rank FROM lesson_vocab
      ORDER BY lesson_number, rank`).all();
    const core = buildVocabChunks(rows);
    // This selected collection already carries source evidence and corrected
    // senses; the secondary-dictionary entry_id gate does not apply to it.
    const promotions = SOURCE_VOCAB_PROMOTIONS.map((item) => ({
      kind: "vocab", content: `${item.headword} — ${item.gloss_en} (${item.part_of_speech})`,
      metadata: {
        headword: item.headword, gloss: item.gloss_en, pos: item.part_of_speech,
        vocabulary_id: item.id, lesson_number: item.first_lesson_number,
        source_url: item.sourceUrl,
        ...sourceMetadata([Number(item.entry_id.split("-")[1])]),
      },
    }));
    return [...core, ...promotions];
  } finally {
    db.close();
  }
}

function loadMorphology() {
  // Analyzer confidence and "analyzable" are not linguistic review. No reviewed
  // export exists, so generated decompositions must not be tutor facts.
  return [];
}

// -------- embedding + insert --------

async function embedBatch(texts) {
  const res = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

function toVectorLiteral(arr) {
  // pgvector accepts '[0.1,0.2,...]' as a string when using neon HTTP client
  return "[" + arr.map((x) => x.toFixed(7)).join(",") + "]";
}

async function insertBatch(items) {
  // Build a multi-row INSERT via UNNEST for efficiency.
  const kinds = items.map((i) => i.kind);
  const contents = items.map((i) => i.content);
  const metadatas = items.map((i) => JSON.stringify(i.metadata));
  const embeddings = items.map((i) => toVectorLiteral(i.embedding));

  await sql`
    INSERT INTO rag_chunks (kind, content, metadata, embedding)
    SELECT * FROM UNNEST(
      ${kinds}::varchar[],
      ${contents}::text[],
      ${metadatas}::jsonb[],
      ${embeddings}::vector(1536)[]
    )
  `;
}

async function run() {
  const all = [
    ...loadVocab(),
    ...loadPhrases(),
    ...loadGrammar(),
    ...loadMorphology(),
  ].filter((item) => !loadCourseModule("src/lib/app-content-safety.ts").isAppContentExcluded(item.content));

  console.log(
    `Prepared ${all.length} chunks: ` +
      Object.entries(
        all.reduce((acc, c) => {
          acc[c.kind] = (acc[c.kind] || 0) + 1;
          return acc;
        }, {}),
      )
        .map(([k, v]) => `${k}=${v}`)
        .join(", "),
  );

  console.log("Unreviewed automatic morphology withheld.");
  if (process.argv.includes("--dry-run")) return;
  initializeServices();
  if (!APPEND) {
    console.log("Truncating rag_chunks (use --append to keep existing rows)...");
    await sql`TRUNCATE TABLE rag_chunks RESTART IDENTITY`;
  }

  let done = 0;
  for (let i = 0; i < all.length; i += BATCH_SIZE) {
    const batch = all.slice(i, i + BATCH_SIZE);
    const embeddings = await embedBatch(batch.map((b) => b.content));
    const enriched = batch.map((b, idx) => ({ ...b, embedding: embeddings[idx] }));
    await insertBatch(enriched);
    done += batch.length;
    process.stdout.write(`  embedded+inserted ${done}/${all.length}\r`);
  }
  process.stdout.write("\n");

  console.log("Done. Verifying row count...");
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM rag_chunks`;
  console.log(`rag_chunks now holds ${count} rows.`);
}

module.exports = { buildVocabChunks, loadVocab, loadPhrases, loadGrammar, loadMorphology };
if (require.main === module) run().catch((err) => {
  console.error("\nRAG populate failed:", err);
  process.exitCode = 1;
});
