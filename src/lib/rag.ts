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

export async function retrieve(
  queryText: string,
  k = 20,
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
    console.error("[rag] retrieve failed:", err);
    return [];
  }
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

  const sections: string[] = ["## RETRIEVED CONTEXT (use these as your source of truth; do not invent beyond them)"];
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
