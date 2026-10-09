import type { ConversationScenario, ScenarioOption } from "@/data/conversation-scenarios";
import { toInaliOrthography } from "./orthography";

export function conversationReplyActivityId(scenarioId: string, turnId: string, option: ScenarioOption): string | null {
  return option.correct && option.intent !== "repeat" ? `turn:${scenarioId}:${turnId}:${option.id}` : null;
}

export function matchesConversationReply(option: ScenarioOption, answer: string): boolean {
  if (!option.correct || option.intent === "repeat") return false;
  const normalize = (text: string) => toInaliOrthography(text).toLowerCase()
    .replace(/[.,!?¿¡:;"“”]/g, "").trim().replace(/\s+/g, " ");
  return normalize(option.nahuatl) === normalize(answer);
}

export function getConversationReplyCards(scenarios: readonly ConversationScenario[]) {
  return scenarios.flatMap((scenario) => scenario.turns.flatMap((turn) => turn.options.flatMap((option) => {
    const id = conversationReplyActivityId(scenario.id, turn.id, option);
    return id ? [{ id, nahuatl: option.nahuatl, english: option.english, spanish: option.spanish,
      audioUrl: option.audioUrl, audioKind: option.audioKind, sourceUrl: option.sources[0]?.url ?? null, kind: "reply" as const }] : [];
  })));
}
