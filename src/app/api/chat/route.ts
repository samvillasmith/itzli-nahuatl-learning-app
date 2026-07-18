import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { moderate, MODERATION_MODEL } from "@/lib/moderation";
import { detectInjection } from "@/lib/prompt-injection";
import { hashContent, logAudit, writeAudit } from "@/lib/audit";
import { getSystemPrompt, refusalForLocale, type ChatLocale, type ChatMode } from "@/lib/chat-system-prompt";
import { TUTOR_FEATURE_ENABLED } from "@/lib/features";
import { retrieve, formatRetrieved, EMBED_MODEL } from "@/lib/rag";

export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY = 10;
const MAX_BODY_BYTES = 32 * 1024;
const MAX_TOTAL_MESSAGE_CHARS = 12_000;
const CHAT_AUDIT_SCHEMA_VERSION = 1;
const CHAT_POLICY_VERSION = "2026-04-30";
let client: OpenAI | null = null;

// Per-mode model settings for precise multi-rule instruction following.
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

function refusalResponse(locale: ChatLocale): Response {
  return textResponse(singleChunkStream(refusalForLocale(locale)));
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

function parseLocale(raw: unknown): ChatLocale {
  return raw === "es" ? "es" : "en";
}

function getOpenAIClient(): OpenAI {
  client ??= new OpenAI({ timeout: 20_000, maxRetries: 1 });
  return client;
}

async function readLimitedJson(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new RangeError("Payload too large");
  }
  const reader = req.body?.getReader();
  if (!reader) throw new SyntaxError("Missing body");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError("Payload too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
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

  // Route handlers enforce auth directly; Proxy adds an optimistic front-door check.
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse + validate payload
  let body: unknown;
  try {
    body = await readLimitedJson(req);
  } catch (error) {
    await logAudit({
      userId,
      kind: "invalid_payload",
      content: "",
      meta: {
        ...auditBase(requestId, startedAt),
        reason: error instanceof RangeError ? "body_too_large" : "json_parse",
      },
    });
    return NextResponse.json(
      { error: error instanceof RangeError ? "Payload too large" : "Invalid JSON" },
      { status: error instanceof RangeError ? 413 : 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    await logAudit({
      userId,
      kind: "invalid_payload",
      content: "",
      meta: { ...auditBase(requestId, startedAt), reason: "body_shape" },
    });
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const rawMessages = (body as { messages?: unknown }).messages;
  if (
    !Array.isArray(rawMessages) ||
    rawMessages.length === 0 ||
    rawMessages.length > MAX_HISTORY ||
    !rawMessages.every(isValidMessage)
  ) {
    await logAudit({
      userId,
      kind: "invalid_payload",
      content: "",
      meta: { ...auditBase(requestId, startedAt), reason: "shape" },
    });
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  const mode = parseMode((body as { mode?: unknown }).mode);
  const locale = parseLocale((body as { locale?: unknown }).locale);
  const messages = rawMessages as IncomingMessage[];
  const totalMessageChars = messages.reduce((sum, message) => sum + message.content.length, 0);
  const latest = messages[messages.length - 1];
  if (latest.role !== "user") {
    await logAudit({
      userId,
      kind: "invalid_payload",
      content: latest.content,
      meta: { ...auditBase(requestId, startedAt, mode), reason: "last_message_role" },
    });
    return NextResponse.json({ error: "Last message must be from user" }, { status: 400 });
  }

  if (
    messages.some((message) => message.content.length > MAX_MESSAGE_CHARS) ||
    totalMessageChars > MAX_TOTAL_MESSAGE_CHARS
  ) {
    await logAudit({
      userId,
      kind: "input_too_long",
      content: latest.content,
      meta: {
        ...auditBase(requestId, startedAt, mode),
        latestLength: latest.content.length,
        totalMessageChars,
      },
    });
    return NextResponse.json(
      { error: `Message too long. Max ${MAX_MESSAGE_CHARS} characters.` },
      { status: 413 },
    );
  }

  // 3. Rate limit
  let rl;
  try {
    rl = await checkRateLimit(userId);
  } catch (error) {
    console.error("[chat] rate limiter unavailable", error);
    return NextResponse.json(
      { error: "The tutor is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!rl.ok) {
    await logAudit({
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
    await logAudit({
      userId,
      kind: "injection_heuristic",
      content: latest.content,
      categories: injection.matches,
      meta: { ...auditBase(requestId, startedAt, mode), score: injection.score },
    });
    return refusalResponse(locale);
  }

  // 5. Input moderation
  const inputVerdict = await moderate(latest.content);
  if (inputVerdict.flagged) {
    await logAudit({
      userId,
      kind: "input_flagged",
      content: latest.content,
      categories: inputVerdict.categories,
      meta: { ...auditBase(requestId, startedAt, mode), topScore: inputVerdict.topScore, moderationModel: MODERATION_MODEL },
    });
    return refusalResponse(locale);
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
    { role: "system", content: getSystemPrompt(mode, locale) },
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
    await logAudit({
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
    await logAudit({
      userId,
      kind: "chat_empty_response",
      content: latest.content,
      meta: {
        ...auditBase(requestId, startedAt, mode),
        model: MODEL,
        responseHash: hashContent(assistantText),
      },
    });
    return refusalResponse(locale);
  }

  // 8. Output moderation — run BEFORE the bytes leave the server.
  const outputVerdict = await moderate(assistantText);
  if (outputVerdict.flagged) {
    await logAudit({
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
    return refusalResponse(locale);
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
      refused: assistantText.trim() === refusalForLocale(locale),
      locale,
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
