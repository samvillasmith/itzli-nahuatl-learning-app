import OpenAI from "openai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { moderate } from "@/lib/moderation";
import { detectInjection } from "@/lib/prompt-injection";
import { logAudit } from "@/lib/audit";
import { getSystemPrompt, REFUSAL, type ChatMode } from "@/lib/chat-system-prompt";
import { retrieve, formatRetrieved } from "@/lib/rag";

export const maxDuration = 30;
export const runtime = "nodejs";

const client = new OpenAI();

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY = 10;

// Per-mode model settings. gpt-4.1-mini handles the multi-rule instruction
// following that gpt-4o-mini struggled with, while staying fast + cheap.
const MODEL = "gpt-4.1-mini";
const TEMPERATURE: Record<ChatMode, number> = {
  tutor: 0.3,    // precise, low hallucination
  practice: 0.5, // slightly warmer for natural conversation
};

type IncomingMessage = { role: "user" | "assistant"; content: string };

function singleChunkStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

function textResponse(body: ReadableStream<Uint8Array> | string, init?: ResponseInit): Response {
  return new Response(body, {
    ...init,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

function refusalResponse(): Response {
  return textResponse(singleChunkStream(REFUSAL));
}

function isValidMessage(m: unknown): m is IncomingMessage {
  if (!m || typeof m !== "object") return false;
  const r = (m as { role?: unknown }).role;
  const c = (m as { content?: unknown }).content;
  return (r === "user" || r === "assistant") && typeof c === "string";
}

function parseMode(raw: unknown): ChatMode {
  return raw === "practice" ? "practice" : "tutor";
}

export async function POST(req: Request) {
  // 1. Auth (middleware also enforces; keep explicit for defense-in-depth)
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse + validate payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    logAudit({ userId, kind: "invalid_payload", content: "", meta: { reason: "json_parse" } });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawMessages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0 || !rawMessages.every(isValidMessage)) {
    logAudit({ userId, kind: "invalid_payload", content: "", meta: { reason: "shape" } });
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  const mode = parseMode((body as { mode?: unknown }).mode);
  const messages = rawMessages as IncomingMessage[];
  const latest = messages[messages.length - 1];
  if (latest.role !== "user") {
    return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
  }

  if (latest.content.length > MAX_MESSAGE_CHARS) {
    logAudit({
      userId,
      kind: "input_too_long",
      content: latest.content,
      meta: { length: latest.content.length, mode },
    });
    return NextResponse.json(
      { error: `Message too long. Max ${MAX_MESSAGE_CHARS} characters.` },
      { status: 413 },
    );
  }

  // 3. Rate limit
  const rl = checkRateLimit(userId);
  if (!rl.ok) {
    logAudit({
      userId,
      kind: "rate_limited",
      content: latest.content,
      meta: { window: rl.window, retryAfterMs: rl.retryAfterMs, mode },
    });
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      },
    );
  }

  // 4. Prompt-injection heuristics (fast local check)
  const injection = detectInjection(latest.content);
  if (injection.blocked) {
    logAudit({
      userId,
      kind: "injection_heuristic",
      content: latest.content,
      categories: injection.matches,
      meta: { score: injection.score, mode },
    });
    return refusalResponse();
  }

  // 5. Input moderation
  const inputVerdict = await moderate(latest.content);
  if (inputVerdict.flagged) {
    logAudit({
      userId,
      kind: "input_flagged",
      content: latest.content,
      categories: inputVerdict.categories,
      meta: { topScore: inputVerdict.topScore, mode },
    });
    return refusalResponse();
  }

  // 6. RAG retrieval — embed the latest user message, pull grounded
  // vocabulary / phrases / grammar / morphology from pgvector. Failures
  // return an empty array so the route degrades to grammar-rules only.
  const retrieved = await retrieve(latest.content, 20);
  const retrievedBlock = formatRetrieved(retrieved);

  // 7. Completion (spotlight user turns so stray instructions can't climb
  // out of the user slot into the instruction slot).
  const truncated = messages.slice(-MAX_HISTORY);
  const spotlighted = truncated.map((m) =>
    m.role === "user"
      ? {
          role: "user" as const,
          content: `<user_input>\n${m.content}\n</user_input>`,
        }
      : { role: "assistant" as const, content: m.content },
  );

  const systemMessages: { role: "system"; content: string }[] = [
    { role: "system", content: getSystemPrompt(mode) },
  ];
  if (retrievedBlock) {
    systemMessages.push({ role: "system", content: retrievedBlock });
  }

  let assistantText: string;
  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 800,
      temperature: TEMPERATURE[mode],
      stream: false,
      messages: [...systemMessages, ...spotlighted],
    });
    assistantText = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[chat] OpenAI call failed:", err);
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }

  if (!assistantText.trim()) {
    return refusalResponse();
  }

  // 8. Output moderation — run BEFORE the bytes leave the server.
  const outputVerdict = await moderate(assistantText);
  if (outputVerdict.flagged) {
    logAudit({
      userId,
      kind: "output_flagged",
      content: assistantText,
      categories: outputVerdict.categories,
      meta: { topScore: outputVerdict.topScore, mode },
    });
    return refusalResponse();
  }

  // 9. Clean response → stream to client in one chunk so the existing
  // reader-based client code keeps working without changes.
  return textResponse(singleChunkStream(assistantText));
}
