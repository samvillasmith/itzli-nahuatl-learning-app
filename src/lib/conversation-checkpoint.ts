import type { ConversationScenario } from "@/data/conversation-scenarios";
import { readScopedStorage, removeScopedStorage, writeScopedStorage } from "./progress-storage";

export const CONVERSATION_CONTENT_REVISION = "coerll-v3-2026-10-04-1";
export type ConversationPhase = "choose" | "recall" | "speak";
export type ConversationHistoryStep = { turnId: string; optionId: string };
export type ConversationCheckpointInput = {
  turnId: string;
  phase: ConversationPhase;
  selectedOptionId: string | null;
  history: ConversationHistoryStep[];
};
type SavedHistoryStep = ConversationHistoryStep & { turnText: string; replyText: string };
export type ConversationCheckpoint = Omit<ConversationCheckpointInput, "history"> & {
  version: 1;
  contentRevision: string;
  scenarioId: string;
  turnText: string;
  selectedReplyText: string | null;
  history: SavedHistoryStep[];
};
const key = (scenarioId: string) => `itzli_conversation_checkpoint_v3:${scenarioId}`;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

export function parseConversationCheckpoint(value: unknown, scenario: ConversationScenario): ConversationCheckpoint | null {
  if (!object(value) || value.version !== 1 || value.contentRevision !== CONVERSATION_CONTENT_REVISION ||
    value.scenarioId !== scenario.id || typeof value.phase !== "string" || !["choose", "recall", "speak"].includes(value.phase) ||
    !Array.isArray(value.history) || value.history.length > scenario.turns.length) return null;
  const history: SavedHistoryStep[] = [];
  let expectedTurnId: string | undefined = scenario.startTurnId;
  for (const raw of value.history) {
    if (!object(raw) || raw.turnId !== expectedTurnId) return null;
    const turn = scenario.turns.find((item) => item.id === raw.turnId);
    const option = turn?.options.find((item) => item.id === raw.optionId && item.correct && item.intent !== "repeat");
    if (!turn || !option || raw.turnText !== turn.nahuatl || raw.replyText !== option.nahuatl) return null;
    history.push({ turnId: turn.id, optionId: option.id, turnText: turn.nahuatl, replyText: option.nahuatl });
    expectedTurnId = option.nextTurnId ?? scenario.turns[scenario.turns.findIndex((item) => item.id === turn.id) + 1]?.id;
  }
  const turn = scenario.turns.find((item) => item.id === value.turnId);
  if (!turn || value.turnId !== expectedTurnId || value.turnText !== turn.nahuatl) return null;
  let selectedOptionId: string | null = null;
  let selectedReplyText: string | null = null;
  if (value.phase === "choose") {
    if (value.selectedOptionId !== null || value.selectedReplyText !== null) return null;
  } else {
    const option = turn.options.find((item) => item.id === value.selectedOptionId && item.correct && item.intent !== "repeat");
    if (!option || value.selectedReplyText !== option.nahuatl) return null;
    selectedOptionId = option.id;
    selectedReplyText = option.nahuatl;
  }
  return { version: 1, contentRevision: CONVERSATION_CONTENT_REVISION, scenarioId: scenario.id,
    turnId: turn.id, phase: value.phase as ConversationPhase, selectedOptionId, selectedReplyText, turnText: turn.nahuatl, history };
}

export function saveConversationCheckpoint(scenario: ConversationScenario, input: ConversationCheckpointInput): boolean {
  const turn = scenario.turns.find((item) => item.id === input.turnId);
  const selected = turn?.options.find((item) => item.id === input.selectedOptionId);
  const candidate = { version: 1, contentRevision: CONVERSATION_CONTENT_REVISION, scenarioId: scenario.id,
    turnId: input.turnId, phase: input.phase, selectedOptionId: input.selectedOptionId,
    turnText: turn?.nahuatl, selectedReplyText: selected?.nahuatl ?? null,
    history: input.history.map((step) => {
      const previous = scenario.turns.find((item) => item.id === step.turnId);
      return { turnId: step.turnId, optionId: step.optionId, turnText: previous?.nahuatl,
        replyText: previous?.options.find((item) => item.id === step.optionId)?.nahuatl };
    }),
  };
  const parsed = parseConversationCheckpoint(candidate, scenario);
  if (!parsed) return false;
  writeScopedStorage(key(scenario.id), JSON.stringify(parsed));
  return true;
}
export function loadConversationCheckpoint(scenario: ConversationScenario): ConversationCheckpoint | null {
  const raw = readScopedStorage(key(scenario.id));
  if (!raw) return null;
  let parsed: ConversationCheckpoint | null = null;
  try { parsed = parseConversationCheckpoint(JSON.parse(raw), scenario); } catch { /* Remove only this damaged checkpoint. */ }
  if (!parsed) clearConversationCheckpoint(scenario.id);
  return parsed;
}
export function clearConversationCheckpoint(scenarioId: string): void { removeScopedStorage(key(scenarioId)); }

export function conversationCheckpointHistory(scenario: ConversationScenario, history: readonly ConversationHistoryStep[], locale: "en" | "es") {
  return history.flatMap((step) => {
    const turn = scenario.turns.find((item) => item.id === step.turnId)!;
    const option = turn.options.find((item) => item.id === step.optionId)!;
    return [{ nahuatl: turn.nahuatl, translation: locale === "es" ? turn.spanish : turn.english, speaker: turn.speaker },
      { nahuatl: option.nahuatl, translation: locale === "es" ? option.spanish : option.english, speaker: locale === "es" ? "Tú" : "You" }];
  });
}
