/**
 * Embeds curriculum content + morphology analyses and upserts into rag_chunks.
 * Run after scripts/rag-setup.js and (optionally) after the Python cache has
 * been built:   python -m ehn_morph build-cache --out data/morphology_cache.json
 *
 *   node scripts/rag-populate.js              # full rebuild (truncates first)
 *   node scripts/rag-populate.js --append     # keep existing rows
 */

const fs = require("fs");
const path = require("path");

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
const Database = require("better-sqlite3");
const OpenAI = require("openai").default || require("openai");
const { resolveDbPath } = require("./_db-path.js");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY not set");
  process.exit(1);
}

const EMBED_MODEL = "text-embedding-3-small"; // 1536 dims, cheap, fast
const BATCH_SIZE = 100;
const APPEND = process.argv.includes("--append");

const sql = neon(process.env.DATABASE_URL);
const openai = new OpenAI();

// -------- content builders --------

function displayGloss(raw) {
  return String(raw || "")
    .replace(/\s*\[(?:❌|⚠️)[^\]]*\].*$/u, "")
    .trim();
}

function loadVocab() {
  const db = new Database(resolveDbPath(), { readonly: true, fileMustExist: true });
  const rows = db
    .prepare(
      `SELECT display_form AS headword, gloss_en, part_of_speech, lesson_number, rank
       FROM lesson_vocab
       WHERE gloss_en NOT LIKE '%MISPLACED%'
       ORDER BY lesson_number, rank`,
    )
    .all();
  db.close();
  return rows
    .map((r) => {
      const gloss = displayGloss(r.gloss_en);
      if (!gloss) return null;
      return {
        kind: "vocab",
        content: `${r.headword} — ${gloss}${r.part_of_speech ? ` (${r.part_of_speech})` : ""}`,
        metadata: {
          headword: r.headword,
          gloss,
          pos: r.part_of_speech,
          lesson_number: r.lesson_number,
        },
      };
    })
    .filter(Boolean);
}

const VERIFIED_PHRASES = [
  { phrase: "Pialli!", gloss: "Hello!" },
  { phrase: "Tlazohcamati.", gloss: "Thank you." },
  { phrase: "Quena. / Quemah.", gloss: "Yes. / Yes (emphatic)." },
  { phrase: "Ahmo.", gloss: "No." },
  { phrase: "Notoca ___.", gloss: "My name is ___." },
  { phrase: "¿Tlen motoca?", gloss: "What is your name?" },
  { phrase: "¿Quenin tiitztoc?", gloss: "How are you?" },
  { phrase: "Cualli niitztoc.", gloss: "I am well." },
  { phrase: "¿Campa ticha? / ¿Kanke ticha?", gloss: "Where do you live?" },
  { phrase: "Nicha ipan Huasteca.", gloss: "I live in the Huasteca." },
  { phrase: "¿Tlen ticchihua?", gloss: "What are you doing? / What do you do?" },
  { phrase: "Nitequiti.", gloss: "I work." },
  { phrase: "Nitlamachtia.", gloss: "I teach." },
  { phrase: "Nitlahcuiloa.", gloss: "I write." },
];

const GRAMMAR_SNIPPETS = [
  {
    title: "Subject prefixes on verbs",
    content:
      "Subject prefixes: ni- (I), ti- (you sg / we), ∅ (he/she or they), an- (you all). Plural also adds -h/-j suffix. Examples: nitequiti (I work), titequiti (you work), tequiti (he/she works), titequitih (we work), antequitih (you all work), tequitih (they work).",
  },
  {
    title: "Object prefixes",
    content:
      "Object prefixes on verbs: nēch- (me), mitz- (you sg), c-/qui- (him/her/it), tēch- (us), amēch- (you all), quin- (them); tē- (someone, non-specific), tla- (something, non-specific). Use ONLY on transitive verbs.",
  },
  {
    title: "tic- vs titech-",
    content:
      "tic- = 'you + it/him/her' (2sg subject + 3sg object): ticchihua = 'you do it'. titech- = 'you + us' (2sg subject + 1pl object): titechpalehuia = 'you help us'. Do NOT use titech- on intransitive verbs. 'What do you do?' = ¿Tlen ticchihua? NEVER ¿Tlen titechihua?",
  },
  {
    title: "Past tense (preterit)",
    content:
      "Preterit: o- prefix + subject prefix + stem + -c/-qui suffix. Example: onitequitic = 'I worked' (o- PAST + ni- I + tequiti work + -c PRET).",
  },
  {
    title: "Future tense",
    content:
      "Future: subject prefix + stem + -z or -quiz. Example: nitequitiz = 'I will work'.",
  },
  {
    title: "Imperfect",
    content:
      "Imperfect: subject prefix + stem + -ya. Example: nitequitiya = 'I was working' / 'I used to work'.",
  },
  {
    title: "Possessive prefixes",
    content:
      "Possessive prefixes on nouns: no- (my), mo- (your), i- (his/her), to- (our), amo- (your pl.), in- (their). Absolutive suffix drops under possession. Examples: tocaitl → notoca (my name), calli → nocal (my house), chantli → nichan (my home).",
  },
  {
    title: "Noun absolutive and plural",
    content:
      "Absolutive suffixes (unpossessed singular): -tl, -tli, -li, -in. Plural: -meh, -tin. Reverential/diminutive: -tzin/-tzintli. The absolutive drops when the noun takes a possessive prefix or a plural suffix.",
  },
  {
    title: "Pronouns",
    content:
      "EHN independent pronouns: na (I), ta (you sg), ya (he/she), tahuan (we), amohuan (you all), yahuan (they). These are EHN, NOT Classical Nahuatl. Do NOT use nēhuatl/tēhuatl (those are Classical).",
  },
  {
    title: "No copula 'to be'",
    content:
      "Nahuatl has no simple copula. Predicate nouns take subject prefixes directly. 'I am a teacher' = Na nitlamachtihquetl (or simply nitlamachtihquetl). Do NOT invent a verb 'eli' for 'to be'.",
  },
];

function loadPhrases() {
  return VERIFIED_PHRASES.map((p) => ({
    kind: "phrase",
    content: `${p.phrase} — ${p.gloss}`,
    metadata: { phrase: p.phrase, gloss: p.gloss },
  }));
}

function loadGrammar() {
  return GRAMMAR_SNIPPETS.map((g) => ({
    kind: "grammar",
    content: `${g.title}: ${g.content}`,
    metadata: { title: g.title },
  }));
}

function loadMorphology() {
  const cachePath = path.join(__dirname, "..", "data", "morphology_cache.json");
  if (!fs.existsSync(cachePath)) {
    console.warn(
      "[rag] morphology cache not found at data/morphology_cache.json — skipping (run: python -m ehn_morph build-cache --out data/morphology_cache.json)",
    );
    return [];
  }
  const payload = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  const out = [];
  for (const e of payload.entries) {
    const a = e.analysis;
    if (!a.analyzable) continue;
    const segmented = a.morphemes.map((m) => m.surface).join("·");
    const glossChain = a.morphemes.map((m) => m.gloss).join(" + ");
    const forms = a.morphemes.map((m) => m.form).join(" ");
    out.push({
      kind: "morphology",
      content: `${a.input} = ${segmented} | ${glossChain} | canonical: ${forms}${a.stem_gloss ? ` | stem gloss: ${a.stem_gloss}` : ""}`,
      metadata: {
        surface: a.input,
        normalized: a.normalized,
        stem: a.stem,
        stem_gloss: a.stem_gloss,
        pos: a.part_of_speech,
        source: e.source,
        confidence: a.confidence,
      },
    });
  }
  return out;
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
  if (!APPEND) {
    console.log("Truncating rag_chunks (use --append to keep existing rows)...");
    await sql`TRUNCATE TABLE rag_chunks RESTART IDENTITY`;
  }

  const all = [
    ...loadVocab(),
    ...loadPhrases(),
    ...loadGrammar(),
    ...loadMorphology(),
  ];

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

run().catch((err) => {
  console.error("\nRAG populate failed:", err);
  process.exit(1);
});
