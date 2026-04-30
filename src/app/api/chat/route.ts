import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { moderate, MODERATION_MODEL } from "@/lib/moderation";
import { detectInjection } from "@/lib/prompt-injection";
import { hashContent, logAudit, writeAudit } from "@/lib/audit";
import { getSystemPrompt, REFUSAL, type ChatMode } from "@/lib/chat-system-prompt";
import { TUTOR_FEATURE_ENABLED } from "@/lib/features";
import { retrieve, formatRetrieved, EMBED_MODEL } from "@/lib/rag";

export const maxDuration = 30;
export const runtime = "nodejs";

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY = 10;
const CHAT_AUDIT_SCHEMA_VERSION = 1;
const CHAT_POLICY_VERSION = "2026-04-30";
let client: OpenAI | null = null;

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

function getOpenAIClient(): OpenAI {
  client ??= new OpenAI();
  return client;
}

function auditBase(requestId: string, startedAt: number, mode?: ChatMode) {
  return {
    requestId,
    auditSchemaVersion: CHAT_AUDIT_SCHEMA_VERSION,
    policyVersion: CHAT_POLICY_VERSION,
    mode,
    durationMs: Date.now() - startedAt,
  };
}

async function writeFinalAudit(
  args: Parameters<typeof writeAudit>[0],
): Promise<Response | null> {
  try {
    await writeAudit(args);
    return null;
  } catch (err) {
    console.error("[audit] final insert failed:", err);
    if (process.env.REQUIRE_CHAT_AUDIT === "true") {
      return NextResponse.json(
        { error: "Audit logging is unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return null;
  }
}

export async function POST(req: Request) {
  const requestId = randomUUID();
  const startedAt = Date.now();

  if (!TUTOR_FEATURE_ENABLED) {
    return NextResponse.json(
      { error: "The AI tutor is temporarily unavailable." },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

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
    logAudit({
      userId,
      kind: "invalid_payload",
      content: "",
      meta: { ...auditBase(requestId, startedAt), reason: "json_parse" },
    });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawMessages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0 || !rawMessages.every(isValidMessage)) {
    logAudit({
      userId,
      kind: "invalid_payload",
      content: "",
      meta: { ...auditBase(requestId, startedAt), reason: "shape" },
    });
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  const mode = parseMode((body as { mode?: unknown }).mode);
  const messages = rawMessages as IncomingMessage[];
  const latest = messages[messages.length - 1];
  if (latest.role !== "user") {
    logAudit({
      userId,
      kind: "invalid_payload",
      content: latest.content,
      meta: { ...auditBase(requestId, startedAt, mode), reason: "last_message_role" },
    });
    return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
  }

  if (latest.content.length > MAX_MESSAGE_CHARS) {
    logAudit({
      userId,
      kind: "input_too_long",
      content: latest.content,
      meta: { ...auditBase(requestId, startedAt, mode), length: latest.content.length },
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
      meta: { ...auditBase(requestId, startedAt, mode), window: rl.window, retryAfterMs: rl.retryAfterMs },
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
      meta: { ...auditBase(requestId, startedAt, mode), score: injection.score },
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
      meta: { ...auditBase(requestId, startedAt, mode), topScore: inputVerdict.topScore, moderationModel: MODERATION_MODEL },
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
    const completion = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      max_tokens: 800,
      temperature: TEMPERATURE[mode],
      stream: false,
      messages: [...systemMessages, ...spotlighted],
    });
    assistantText = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[chat] OpenAI call failed:", err);
    logAudit({
      userId,
      kind: "chat_upstream_error",
      content: latest.content,
      meta: {
        ...auditBase(requestId, startedAt, mode),
        model: MODEL,
        errorName: err instanceof Error ? err.name : "unknown",
      },
    });
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }

  if (!assistantText.trim()) {
    logAudit({
      userId,
      kind: "chat_empty_response",
      content: latest.content,
      meta: {
        ...auditBase(requestId, startedAt, mode),
        model: MODEL,
        responseHash: hashContent(assistantText),
      },
    });
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
      meta: {
        ...auditBase(requestId, startedAt, mode),
        inputHash: hashContent(latest.content),
        topScore: outputVerdict.topScore,
        moderationModel: MODERATION_MODEL,
        model: MODEL,
      },
    });
    return refusalResponse();
  }

  // 9. Clean response → stream to client in one chunk so the existing
  // reader-based client code keeps working without changes.
  const auditFailure = await writeFinalAudit({
    userId,
    kind: "chat_completed",
    content: latest.content,
    meta: {
      ...auditBase(requestId, startedAt, mode),
      inputChars: latest.content.length,
      responseChars: assistantText.length,
      responseHash: hashContent(assistantText),
      refused: assistantText.trim() === REFUSAL,
      model: MODEL,
      moderationModel: MODERATION_MODEL,
      embeddingModel: EMBED_MODEL,
      inputModerationTopScore: inputVerdict.topScore,
      outputModerationTopScore: outputVerdict.topScore,
      injectionScore: injection.score,
      injectionMatches: injection.matches,
      retrievedCount: retrieved.length,
      historyCount: messages.length,
      truncatedHistoryCount: truncated.length,
    },
  });
  if (auditFailure) return auditFailure;

  return textResponse(singleChunkStream(assistantText));
}
