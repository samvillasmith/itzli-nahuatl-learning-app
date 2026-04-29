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
      "Preterit: o- prefix + subject prefix + stem + -c/-qui suffix. Example: onitequitic = 'I worked' (o- PAST + ni- I + tequiti work + -c PRET). The -c form is used after vowels, -qui after consonants.",
  },
  {
    title: "Future tense",
    content:
      "Future: subject prefix + stem + -z or -quiz. Example: nitequitiz = 'I will work'. Also used for 'going to' / near-future meanings. Plural adds -queh: titequitizqueh = 'we will work'.",
  },
  {
    title: "Imperfect",
    content:
      "Imperfect: subject prefix + stem + -ya. Example: nitequitiya = 'I was working' / 'I used to work'. Expresses ongoing, habitual, or background past action.",
  },
  {
    title: "Progressive (-toc / -tok)",
    content:
      "Progressive aspect (action happening right now, in progress): verb stem + -toc (IDIEZ) or -tok (variant spelling). Examples: nitequititoc = 'I am working (at this moment)', titlahcuilohtoc = 'you are writing'. More immediate than the simple present; emphasizes ongoing action. Plural adds -eh: titequititoceh = 'we are working'.",
  },
  {
    title: "Imperative (commands)",
    content:
      "Imperative (commands to 'you'): prefix xi- + verb stem. Object prefixes go between xi- and the stem. Examples: xitequiti = 'work!'; xinēchhuica = 'bring me (it)!' (xi- imperative + nēch- me + huica bring); xicchihua = 'do it!' (xi- + c- it + chihua). 2pl command adds -can: xitequitican = 'you all work!'. Negative command: ahmo + xi- + stem — ahmo xihuica = 'don't bring it'.",
  },
  {
    title: "Negation",
    content:
      "Negation uses ahmo (or variant ax / ahmoh) placed BEFORE the verb. Examples: ahmo nitequiti = 'I don't work', ax nicmati = 'I don't know', ahmo cualli = 'not good'. Combine with imperative for negative commands: ahmo xihuica = 'don't bring it'. For 'nothing / no one' use ahmo tlen / ahmo aquin ('not anything / not anyone').",
  },
  {
    title: "Directional prefixes (on-, hual-)",
    content:
      "Directional prefixes go between subject and object, indicating motion relative to the speaker: on- (away, thither — motion away from speaker) and hual- (hither, toward — motion toward speaker). Examples: niyah = 'I go'; nionyah = 'I go (away from here)'; nihualyah = 'I come (here, toward the speaker)'. Most common on verbs of motion but productive on other verbs for metaphorical direction.",
  },
  {
    title: "Locative suffixes",
    content:
      "Locative suffixes attach to noun stems (after the absolutive drops) to form location phrases: -co (in, at — general), -pan (on, on top of, on the surface of), -tlan (near, among, with), -can (place where, place of), -nahuac (next to, alongside). Examples: calli 'house' → calco 'in the house'; atl 'water' → apan 'on the water'; tepetl 'mountain' → tepetlan 'among the mountains'; tequiti 'work' → tequican 'workplace'; tlacatl 'person' → tlacananahuac 'next to the person'.",
  },
  {
    title: "Possessive prefixes",
    content:
      "Possessive prefixes on nouns: no- (my), mo- (your), i- (his/her), to- (our), amo- (your pl.), in- (their). The absolutive suffix (-tl/-tli/-li/-in) drops under possession. Examples: tocaitl → notoca (my name), calli → nocal (my house), chantli → nichan (my home), mistli → tomis (our cat).",
  },
  {
    title: "Noun absolutive and plural",
    content:
      "Absolutive suffixes (unpossessed singular): -tl (after vowel), -tli (after consonant), -li (after l), -in (for a smaller set of nouns). Plural: -meh, -tin, sometimes -h. Reverential/diminutive: -tzin or -tzintli. The absolutive drops when the noun is possessed or pluralized: calli → nocal (my house), calmeh (houses).",
  },
  {
    title: "Diminutive / reverential -tzin",
    content:
      "Suffix -tzin (or -tzintli with absolutive) expresses affection, smallness, respect, or reverence — extremely common in EHN speech. Examples: cihuatl 'woman' → cihuatzin 'dear/little woman'; nantli 'mother' → nantzin 'dear mother'; tahtli 'father' → tahtzin 'dear father'. Used in religious contexts (Jesustzin), with elders, and in affectionate address. Not literally diminutive in size — more about social/emotional register.",
  },
  {
    title: "Pronouns (independent)",
    content:
      "EHN independent pronouns: na (I), ta (you sg), ya (he/she), tahuan (we), amohuan (you all), yahuan (they). These are the EHN forms, NOT Classical Nahuatl (Classical uses nēhuatl/tēhuatl/yēhuatl — do not use those for EHN). Independent pronouns are used for emphasis or topicalization; the verb's subject prefix normally carries the person information already.",
  },
  {
    title: "Reflexive construction",
    content:
      "Reflexive: a prefix matching the subject's person goes in the object slot of the verb. 1sg: no-, 2sg/3sg/2pl/3pl: mo-, 1pl: to-. Note 3rd person uses mo- for both singular and plural. Examples: ninopahpaca = 'I wash myself' (ni- I + no- myself + pahpaca wash); timopahpaca = 'you wash yourself'; mopahpaca = 'he/she washes (him/her)self'. The reflexive prefix is identical in form to the possessive prefix but only attaches to verbs.",
  },
  {
    title: "No copula 'to be'",
    content:
      "Nahuatl has no simple copula verb. Predicate nouns take subject prefixes directly. 'I am a teacher' = Na nitlamachtihquetl (or simply nitlamachtihquetl — the ni- already means 'I am'). 'You are Sam' = Ta tiSam. Do NOT invent a verb like 'eli' for 'to be'.",
  },
  {
    title: "Existence — 'there is / there are'",
    content:
      "'There is' / 'there are' = oncah (also onca). Used to assert existence or availability. Examples: Oncah atl. 'There is water.' Oncah miyac tlacatl. 'There are many people.' Negative: ahmo oncah = 'there isn't / there aren't'. Past: oncatca; future: oncaz.",
  },
  {
    title: "Possession — 'to have'",
    content:
      "Nahuatl has no verb 'to have'. Possession is expressed by existence + a possessed noun. Pattern: oncah + POSS-noun. Examples: Oncah nomis. 'I have a cat' (lit. 'my-cat exists'). Oncah iconetl. 'She has a child' (lit. 'her-child exists'). The verb -pia 'to guard / keep' is used with Spanish-influenced framings in some modern speech but is not the native 'have'.",
  },
  {
    title: "Question words",
    content:
      "Interrogatives (placed at start of question, framed with Spanish-style ¿?): ¿Tlen? 'what?'; ¿Aquin? 'who?'; ¿Campa? / ¿Kanke? 'where?'; ¿Quenin? 'how?'; ¿Queman? / ¿Quemanian? 'when?'; ¿Quezquih? 'how many?'; ¿Catli? / ¿Catlih? 'which?'; ¿Tleca? 'why?'. Examples: ¿Tlen motoca? 'What's your name?'; ¿Campa ticha? 'Where do you live?'; ¿Quezquih tomimeh ticpia? 'How many cats do you have?'",
  },
  {
    title: "Word order",
    content:
      "Word order is flexible; most common is VSO (verb-subject-object) or SVO. Nahuatl is head-marking: the verb already carries pronoun prefixes for subject and object, so explicit noun phrases are often dropped. Examples: Quita in chichi in tlacatl (VSO) = 'The man sees the dog'; In tlacatl quita in chichi (SVO) = same. With pronouns already encoded: Nēchita = 'he sees me' (no separate subject or object needed).",
  },
  {
    title: "Numbers 1-10",
    content:
      "1 ce, 2 ome, 3 eyi (also yei), 4 nahui, 5 macuilli, 6 chicuace, 7 chicome, 8 chicueyi, 9 chicnahui, 10 mahtlactli. 11-14 are mahtlactli once, mahtlactli omome, mahtlactli omeyi, mahtlactli onnahui. 15 = caxtolli. Nahuatl is vigesimal (base-20): 20 = cempoalli, 40 = ompoalli, 400 = centzontli. For counting objects, some sets require numeral classifier suffixes (e.g., -tetl for round objects, -pantli for rows) — check the verified vocabulary for specific counted nouns.",
  },
  {
    title: "Time adverbs",
    content:
      "Time expressions, typically placed at the start of a clause: axcan 'today / now', nāmān (also namān) 'right now', yalhua 'yesterday', mōztla 'tomorrow', huiptla 'day after tomorrow', yehueca 'long ago', zan / san 'just, only'. Examples: Yalhua nitequitic. 'Yesterday I worked.' Mōztla nihualaz. 'Tomorrow I will come.'",
  },
  {
    title: "Comparison — 'like / as' (kej / quen)",
    content:
      "'Like' or 'as' or 'similar to' = kej (common student spelling) / quen (IDIEZ). Example: kej tlamachtihquetl = 'like a teacher'. For 'more than' or 'less than', EHN traditionally lacks a native comparative construction and often uses paraphrase or borrowed Spanish (mas, menos) in modern speech. Classical used phrases like 'it is very X' or 'it exceeds in X-ness'.",
  },
  {
    title: "Greetings and responses",
    content:
      "Opening: Pialli = 'Hello'. Asking how someone is: ¿Quenin tiitztoc? = 'How are you?'. Reply: Cualli niitztoc = 'I am well'. Gratitude: Tlazohcamati = 'Thank you'. Affirm: Quena / Quemah = 'Yes'. Negate: Ahmo = 'No'. In conversational EHN, brief acknowledgments like 'Quena' or 'Cualli' often suffice instead of full sentences.",
  },
  {
    title: "Relative clauses",
    content:
      "Relative clauses use tlen 'what / that' or in 'the (relative marker)'. Examples: In tlacatl tlen nicmachti = 'The man who(m) I teach' (lit. 'the-man that-I-teach-him'). In tlen ticnequi = 'What you want' (lit. 'the-what-you-want'). In tlahcuilolli tlen oniccualtoc = 'The writing that I finished' (tlen introduces the relative clause).",
  },
  {
    title: "Applicative -lia (do for / to someone)",
    content:
      "Applicative suffix -lia (some variants -hia, -huia) adds a beneficiary — the person for whom the action is done — to a transitive verb. The beneficiary becomes the verb's new direct object and takes the usual object prefix. Examples: tequiti 'to work' + -lia → tequitilia 'to work for (someone)' → nēchtequitilia 'he works for me'. huica 'to bring' + -lia → huiquilia 'to bring to (someone)' → nēchhuiquilia 'he brings (it) to me'. NOTE: general Nahuatl pattern; verify specific productive forms against IDIEZ/attested EHN data.",
  },
  {
    title: "Causative -tia (cause someone to do)",
    content:
      "Causative suffix -tia (some stems take -ltia) means 'cause X to do Y' or 'make X do Y'. The caused-person becomes the verb's direct object. Examples: cochi 'to sleep' + -tia → cochitia 'to put (someone) to sleep' → niccochitia = 'I put him to sleep'. tequiti 'to work' + -tia → tequititia 'to make (someone) work'. NOTE: general Nahuatl pattern; verify specific productive forms against IDIEZ/attested EHN data.",
  },
  {
    title: "Noun incorporation",
    content:
      "A noun object can fuse into the verb as its first element, especially for generic objects. The incorporated noun drops its absolutive (-tl/-tli/-li). Example: tlaxcalli 'tortilla' + namaca 'sell' → tlaxcalnamaca 'to sell tortillas'; nitlaxcalnamaca = 'I sell tortillas (I am a tortilla-seller)'. Incorporation tends to mean a generic / habitual action; use a separate noun phrase for a specific referent.",
  },
  {
    title: "Reduplication",
    content:
      "Reduplication — repeating a stem-initial CV — signals iteration, distribution, intensity, or plurality. Examples: cualli 'good' → cuacualli 'very good / each one good'; pehpena 'to pick up repeatedly' (from pena); tlahtoa 'to speak' → tlahtlahtoa 'to speak repeatedly / to gossip'. NOTE: productive in Nahuatl generally; EHN-specific patterns and which stems reduplicate productively should be verified against attested EHN corpus.",
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
