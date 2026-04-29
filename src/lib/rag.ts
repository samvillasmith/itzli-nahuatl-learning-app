import OpenAI from "openai";
import { getSql } from "@/lib/neon";

// Retrieval layer for the chat tutor. At request time we embed the latest
// user message and pull the top-k most semantically similar chunks from
// pgvector. The chunks were pre-embedded by scripts/rag-populate.js and
// span four kinds:
//   - vocab        ~2000 lesson-audited headwords (most rows)
//   - phrase       verified common phrases (pialli, notoca, ¿Tlen motoca?, ...)
//   - grammar      paradigm summaries (tic- vs titech-, tense markers, ...)
//   - morphology   pre-analyzed tokens (ni·tequiti → I + to work, ...)
//
// On any failure we return an empty array so the chat route degrades
// gracefully to the in-prompt grammar rules alone.

const EMBED_MODEL = "text-embedding-3-small";

const client = new OpenAI();

export type RetrievedChunk = {
  kind: "vocab" | "phrase" | "grammar" | "morphology" | string;
  content: string;
  metadata: Record<string, unknown>;
  distance: number;
};

export async function embedQuery(text: string): Promise<number[] | null> {
  try {
    const res = await client.embeddings.create({
      model: EMBED_MODEL,
      input: text,
    });
    return res.data[0]?.embedding ?? null;
  } catch (err) {
    console.error("[rag] embedQuery failed:", err);
    return null;
  }
}

function toVectorLiteral(arr: number[]): string {
  return "[" + arr.map((x) => x.toFixed(7)).join(",") + "]";
}

// English function words / query shell — dropped before keyword lookup so
// only real content words drive the ILIKE pass.
const EN_STOPWORDS = new Set([
  "how", "do", "does", "did", "is", "are", "was", "were", "be", "been", "being",
  "i", "you", "he", "she", "we", "they", "it", "me", "him", "her", "us", "them",
  "my", "your", "his", "hers", "our", "their", "its", "mine", "yours", "ours",
  "say", "said", "tell", "ask", "please", "what", "who", "whom", "which",
  "when", "where", "why", "whose", "the", "a", "an", "of", "to", "in", "on",
  "at", "for", "from", "by", "with", "about", "into", "onto", "over", "under",
  "and", "or", "but", "if", "so", "than", "then", "that", "this", "these",
  "those", "can", "could", "would", "should", "will", "shall", "may", "might",
  "must", "have", "has", "had", "having", "not", "no", "yes",
  "nahuatl", "ehn", "word", "words", "form", "forms", "use", "using",
]);

function extractContentWords(query: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const raw of query.toLowerCase().split(/[^\p{L}]+/u)) {
    if (raw.length < 3) continue;
    if (EN_STOPWORDS.has(raw)) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    words.push(raw);
    if (words.length >= 8) break;
  }
  return words;
}

async function vectorRetrieve(
  queryText: string,
  k: number,
): Promise<RetrievedChunk[]> {
  const embedding = await embedQuery(queryText);
  if (!embedding) return [];
  const vectorLit = toVectorLiteral(embedding);
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT kind, content, metadata, embedding <=> ${vectorLit}::vector AS distance
      FROM rag_chunks
      ORDER BY embedding <=> ${vectorLit}::vector
      LIMIT ${k}
    `;
    return rows.map((r) => ({
      kind: r.kind as string,
      content: r.content as string,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      distance: Number(r.distance),
    }));
  } catch (err) {
    console.error("[rag] vector retrieve failed:", err);
    return [];
  }
}

async function keywordRetrieve(
  queryText: string,
  perWord: number,
): Promise<RetrievedChunk[]> {
  const words = extractContentWords(queryText);
  if (words.length === 0) return [];

  const sql = getSql();
  const out: RetrievedChunk[] = [];
  for (const word of words) {
    const pattern = `%${word}%`;
    try {
      const rows = await sql`
        SELECT kind, content, metadata
        FROM rag_chunks
        WHERE kind IN ('vocab', 'phrase')
          AND (content ILIKE ${pattern} OR metadata::text ILIKE ${pattern})
        LIMIT ${perWord}
      `;
      for (const r of rows) {
        out.push({
          kind: r.kind as string,
          content: r.content as string,
          metadata: (r.metadata as Record<string, unknown>) ?? {},
          distance: 0, // deterministic match — highest priority when merged
        });
      }
    } catch (err) {
      console.error(`[rag] keyword retrieve for "${word}" failed:`, err);
    }
  }
  return out;
}

// Hybrid: deterministic keyword matches on English glosses + semantic
// vector matches. Keyword hits go first so a student asking "how do I say
// 'bring'" always sees `huica` even if the embedding ranks it low.
// Deduped by content so a row that satisfies both searches shows once.
export async function retrieve(
  queryText: string,
  k = 30,
): Promise<RetrievedChunk[]> {
  const [keywordHits, vectorHits] = await Promise.all([
    keywordRetrieve(queryText, 4),
    vectorRetrieve(queryText, k),
  ]);

  const seen = new Set<string>();
  const merged: RetrievedChunk[] = [];
  for (const c of [...keywordHits, ...vectorHits]) {
    if (seen.has(c.content)) continue;
    seen.add(c.content);
    merged.push(c);
  }
  return merged;
}

// Group chunks by kind and format as a prompt-ready context block.
// The model sees these under a dedicated "## RETRIEVED CONTEXT" header so
// it's unambiguous that these are grounding facts, not conversation turns.
export function formatRetrieved(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";

  const grouped: Record<string, string[]> = {};
  for (const c of chunks) {
    (grouped[c.kind] ??= []).push(`- ${c.content}`);
  }

  const sections: string[] = [
    "## RETRIEVED CONTEXT — INTERNAL GROUNDING, DO NOT QUOTE TO THE USER",
    "",
    "This block is for YOUR reference only. Use it silently to compose your reply.",
    "Do NOT copy these lines into your response. Do NOT bullet-list what you have.",
    "Do NOT append hedged speculation ('often X in dialects'). If the student needs",
    "a word that is not here, briefly say 'I don't have [word] in my verified",
    "vocabulary' and stop.",
  ];
  const order = ["grammar", "phrase", "morphology", "vocab"];
  for (const kind of order) {
    if (!grouped[kind]) continue;
    sections.push(`\n### ${kind}\n${grouped[kind].join("\n")}`);
  }
  for (const kind of Object.keys(grouped)) {
    if (order.includes(kind)) continue;
    sections.push(`\n### ${kind}\n${grouped[kind].join("\n")}`);
  }

  return sections.join("\n");
}
