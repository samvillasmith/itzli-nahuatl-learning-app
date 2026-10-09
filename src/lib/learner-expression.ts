import { getSentencePattern, renderSentenceTemplate } from "@/data/learner-conversations";
import { displayNahuatl } from "./orthography";

/** Convert the Nahuatl frame before inserting a person's own name or place. */
export function renderLearnerSentenceTemplate(patternId: string, values: Record<string, string>): string | null {
  if (!renderSentenceTemplate(patternId, values)) return null;
  const template = getSentencePattern(patternId)?.template;
  if (!template) return null;
  let text = template.nahuatl.split(/(\{[a-z]+\})/g)
    .map((part) => part.startsWith("{") ? part : displayNahuatl(part)).join("");
  for (const slot of template.freeSlots) {
    text = text.replace(`{${slot.id}}`, () => values[slot.id].normalize("NFC").trim().replace(/\s+/g, " "));
  }
  return text;
}

/** Old notebook text and IDs stay intact; only their teaching presentation changes. */
export function displayLearnerExpression(expression: { id: string; nahuatl: string }): string {
  const match = /^sentence:([^:]+):personal:[a-f0-9]{64}$/.exec(expression.id);
  const template = match ? getSentencePattern(match[1])?.template : null;
  if (template?.freeSlots.length === 1) {
    const slot = template.freeSlots[0];
    const [prefix, suffix] = template.nahuatl.split(`{${slot.id}}`);
    // Previously saved records use the original source frame. Also accept a
    // learner-written frame without changing the stored record or its hash.
    for (const frame of [prefix, displayNahuatl(prefix)]) {
      if (expression.nahuatl.startsWith(frame) && expression.nahuatl.endsWith(suffix)) {
        const value = expression.nahuatl.slice(frame.length, suffix ? -suffix.length : undefined);
        const text = renderLearnerSentenceTemplate(match![1], { [slot.id]: value });
        if (text) return text;
      }
    }
  }
  return displayNahuatl(expression.nahuatl);
}
