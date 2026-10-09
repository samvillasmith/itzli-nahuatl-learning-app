import catalog from "./learner-conversations.json";
import type { ConversationScenario, SentencePattern } from "./conversation-scenarios";
import type { LocalizedText } from "./lexical-registry";

/** Public selected catalog: no raw source lessons, archival records or review history. */
export const CONVERSATION_SCENARIOS = catalog.scenarios as ConversationScenario[];
export const SENTENCE_PATTERNS = catalog.patterns as SentencePattern[];
export function getConversationScenarios() { return CONVERSATION_SCENARIOS; }
export function getSentencePatterns() { return SENTENCE_PATTERNS; }
export function getSentencePattern(id: string) { return SENTENCE_PATTERNS.find(pattern => pattern.id === id); }

export function renderSentenceTemplate(patternId: string, values: Record<string, string>): LocalizedText & { nahuatl: string } | null {
  const template = getSentencePattern(patternId)?.template;
  if (!template || Object.keys(values).some(id => !template.freeSlots.some(slot => slot.id === id))) return null;
  let nahuatl = template.nahuatl;
  let en = template.english;
  let es = template.spanish;
  for (const slot of template.freeSlots) {
    const value = values[slot.id]?.normalize("NFC").trim().replace(/\s+/g, " ");
    if (!value || value.length > slot.maxLength || !/^[\p{L}\p{M}][\p{L}\p{M} '\u2019-]*$/u.test(value)) return null;
    nahuatl = nahuatl.replace(`{${slot.id}}`, value);
    en = en.replace(`{${slot.id}}`, value);
    es = es.replace(`{${slot.id}}`, value);
  }
  return { nahuatl, en, es };
}
