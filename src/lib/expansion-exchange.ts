import { checkExpansionResponse, type ExpansionCourse, type ExpansionPhrase, type ExpansionText } from "./expansion-course";

export type ExchangePartnerNode = { id: string; actor: "partner"; phraseId: string; nextNodeId: string };
export type ExchangeLearnerNode = { id: string; actor: "learner"; prompt: ExpansionText; feedback: ExpansionText;
  acceptedPhraseIds: string[]; nextNodeId: string };
export type ExchangeNode = ExchangePartnerNode | ExchangeLearnerNode | { id: string; actor: "end" };
export type ExpansionExchangeDefinition = {
  id: string; title: ExpansionText; role: ExpansionText; canDo: ExpansionText; ruleIds: string[];
  originalCourseUnitIds: string[]; startNodeId: string; nodes: ExchangeNode[];
  transfer?: { resetRole: ExpansionText; incomingPhraseId: string; acceptedPhraseIds: string[] };
};
export type ExpansionExchangeData = { schemaVersion: 1; exchanges: ExpansionExchangeDefinition[] };
const ID = /^[a-z0-9][a-z0-9-]{0,119}$/;
const EXCHANGE_ID = /^v3-exchange-[a-z0-9-]+$/;
const FORBIDDEN = new Set(["__proto__", "prototype", "constructor"]);
function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function count(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0; }
function bilingual(value: unknown): value is ExpansionText { return object(value) && typeof value.en === "string" && Boolean(value.en.trim()) && typeof value.es === "string" && Boolean(value.es.trim()); }

/** Fail closed for missing phrases, loops and unreachable turns. No language is generated. */
export function validateExpansionExchange(exchange: ExpansionExchangeDefinition, course: ExpansionCourse): boolean {
  try {
    if (!EXCHANGE_ID.test(exchange.id) || !bilingual(exchange.title) || !bilingual(exchange.role) || !bilingual(exchange.canDo) ||
      !exchange.nodes.length || exchange.nodes.length > 100) return false;
    const phrases = new Set(course.phrases.map(phrase => phrase.id));
    const hasPhrases = (ids: string[]) => Array.isArray(ids) && ids.length > 0 && new Set(ids).size === ids.length && ids.every(id => phrases.has(id));
    if (!exchange.ruleIds.every(id => course.rules.some(rule => rule.id === id)) ||
      !exchange.originalCourseUnitIds.every(id => course.units.some(unit => unit.id === id))) return false;
    const nodes = new Map(exchange.nodes.map(node => [node.id, node]));
    if (nodes.size !== exchange.nodes.length || !nodes.has(exchange.startNodeId)) return false;
    for (const node of exchange.nodes) {
      if (!ID.test(node.id) || FORBIDDEN.has(node.id)) return false;
      if (node.actor === "partner") { if (!phrases.has(node.phraseId) || !nodes.has(node.nextNodeId)) return false; }
      else if (node.actor === "learner") {
        if (!bilingual(node.prompt) || !bilingual(node.feedback) || !hasPhrases(node.acceptedPhraseIds) || !nodes.has(node.nextNodeId)) return false;
      } else if (node.actor !== "end") return false;
    }
    const visited = new Set<string>(); let node = nodes.get(exchange.startNodeId)!;
    while (node.actor !== "end") {
      if (visited.has(node.id)) return false;
      visited.add(node.id); node = nodes.get(node.nextNodeId)!;
    }
    visited.add(node.id);
    if (visited.size !== nodes.size || !exchange.nodes.some(node => node.actor === "learner")) return false;
    if (exchange.transfer && (!bilingual(exchange.transfer.resetRole) || !phrases.has(exchange.transfer.incomingPhraseId) || !hasPhrases(exchange.transfer.acceptedPhraseIds))) return false;
    return true;
  } catch { return false; }
}

export type ExchangeRun = {
  nodeId: string; partnerHistory: string[];
  current: { attempts: number; usedHelp: boolean; revealed: boolean; matched: boolean };
  completedReplies: Record<string, { uncuedFirstCorrect: boolean; usedHelp: boolean }>;
};
const freshReply = () => ({ attempts: 0, usedHelp: false, revealed: false, matched: false });
export function startExchangeRun(exchange: ExpansionExchangeDefinition): ExchangeRun {
  return { nodeId: exchange.startNodeId, partnerHistory: [], current: freshReply(), completedReplies: {} };
}
export function exchangeNode(exchange: ExpansionExchangeDefinition, run: ExchangeRun): ExchangeNode {
  const node = exchange.nodes.find(node => node.id === run.nodeId);
  if (!node) throw new Error("Unknown exchange turn");
  return node;
}
export function continueExchangePartner(exchange: ExpansionExchangeDefinition, run: ExchangeRun): ExchangeRun {
  const node = exchangeNode(exchange, run);
  if (node.actor !== "partner") return run;
  return { ...run, nodeId: node.nextNodeId, partnerHistory: [...run.partnerHistory, node.phraseId], current: freshReply() };
}
export function latestExchangePartner(run: ExchangeRun): string | null { return run.partnerHistory.at(-1) ?? null; }
/** Repair keeps the same task and cannot create an attempt, correct answer or completion. */
export function repeatExchangePartner(exchange: ExpansionExchangeDefinition, run: ExchangeRun): ExchangeRun {
  if (exchangeNode(exchange, run).actor !== "learner" || !latestExchangePartner(run) || run.current.matched || run.current.revealed) return run;
  return { ...run, current: { ...run.current, usedHelp: true } };
}
export function revealExchangeReply(exchange: ExpansionExchangeDefinition, run: ExchangeRun): ExchangeRun {
  if (exchangeNode(exchange, run).actor !== "learner" || run.current.matched) return run;
  return { ...run, current: { ...run.current, usedHelp: true, revealed: true } };
}
export function checkExchangeReply(exchange: ExpansionExchangeDefinition, run: ExchangeRun, input: string, phrases: readonly ExpansionPhrase[]): ExchangeRun {
  const node = exchangeNode(exchange, run);
  if (node.actor !== "learner" || run.current.matched || run.current.revealed || !input.trim()) return run;
  const answers = phrases.filter(phrase => node.acceptedPhraseIds.includes(phrase.id));
  return { ...run, current: { ...run.current, attempts: run.current.attempts + 1, matched: checkExpansionResponse(input, answers) } };
}
export function continueExchangeReply(exchange: ExpansionExchangeDefinition, run: ExchangeRun): ExchangeRun {
  const node = exchangeNode(exchange, run);
  if (node.actor !== "learner" || (!run.current.matched && !run.current.revealed)) return run;
  return { ...run, nodeId: node.nextNodeId, current: freshReply(), completedReplies: { ...run.completedReplies,
    [node.id]: { uncuedFirstCorrect: run.current.matched && run.current.attempts === 1 && !run.current.usedHelp, usedHelp: run.current.usedHelp } } };
}

export const EXCHANGE_STORAGE_KEY = "itzli_expansion_exchange_v1";
export type ExchangeCompletion = { completedAt: number; totalReplies: number; uncuedFirstCorrect: number; repliesUsingHelp: number };
export type ExchangeProgress = { version: 1; exchanges: Record<string, ExchangeCompletion> };
export function emptyExchangeProgress(): ExchangeProgress { return { version: 1, exchanges: {} }; }
export function parseExchangeProgress(raw: string | null): ExchangeProgress | null {
  if (raw === null) return emptyExchangeProgress();
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.version !== 1 || !object(value.exchanges) || Object.keys(value.exchanges).length > 1000) return null;
    const exchanges: ExchangeProgress["exchanges"] = {};
    for (const [id, row] of Object.entries(value.exchanges)) {
      if (!EXCHANGE_ID.test(id) || !object(row) || !count(row.completedAt) || !count(row.totalReplies) || row.totalReplies < 1 ||
        row.totalReplies > 100 || !count(row.uncuedFirstCorrect) || !count(row.repliesUsingHelp) || row.uncuedFirstCorrect + row.repliesUsingHelp > row.totalReplies) return null;
      exchanges[id] = { completedAt: row.completedAt, totalReplies: row.totalReplies, uncuedFirstCorrect: row.uncuedFirstCorrect, repliesUsingHelp: row.repliesUsingHelp };
    }
    return { version: 1, exchanges };
  } catch { return null; }
}
export function exchangeCompletion(exchange: ExpansionExchangeDefinition, run: ExchangeRun, now = Date.now()): ExchangeCompletion | null {
  const replies = exchange.nodes.filter(node => node.actor === "learner");
  if (exchangeNode(exchange, run).actor !== "end" || !count(now) || replies.some(node => !run.completedReplies[node.id])) return null;
  return { completedAt: now, totalReplies: replies.length,
    uncuedFirstCorrect: replies.filter(node => run.completedReplies[node.id].uncuedFirstCorrect).length,
    repliesUsingHelp: replies.filter(node => run.completedReplies[node.id].usedHelp).length };
}
export type ExchangeStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
export function createExchangeStorageAdapter(storage: ExchangeStorage, scopedKey: string): ExchangeStorage & { key: string } {
  if (!scopedKey.startsWith(EXCHANGE_STORAGE_KEY + ":") || !/^(guest|account:.+)$/.test(scopedKey.slice(EXCHANGE_STORAGE_KEY.length + 1))) throw new Error("Exchange progress needs an owner scope");
  const check = (key: string) => { if (key !== EXCHANGE_STORAGE_KEY) throw new Error("Unexpected exchange storage key"); };
  return { key: scopedKey, getItem(key) { check(key); return storage.getItem(scopedKey); }, setItem(key, value) { check(key); storage.setItem(scopedKey, value); } };
}
export type ExchangeSaveResult = { status: "saved" | "invalid" | "unavailable"; progress: ExchangeProgress | null };
/** Read latest before a write. Preserve unreadable/future-schema blobs and other exchange results. */
export function saveExchangeCompletion(storage: ExchangeStorage, id: string, completion: ExchangeCompletion): ExchangeSaveResult {
  try {
    const latest = parseExchangeProgress(storage.getItem(EXCHANGE_STORAGE_KEY));
    if (!latest || !parseExchangeProgress(JSON.stringify({ version: 1, exchanges: { [id]: completion } }))) return { status: "invalid", progress: latest };
    const previous = latest.exchanges[id];
    const progress = { version: 1 as const, exchanges: { ...latest.exchanges, [id]: previous && previous.completedAt > completion.completedAt ? previous : completion } };
    storage.setItem(EXCHANGE_STORAGE_KEY, JSON.stringify(progress));
    return { status: "saved", progress };
  } catch { return { status: "unavailable", progress: null }; }
}
