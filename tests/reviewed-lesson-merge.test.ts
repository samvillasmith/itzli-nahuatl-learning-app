import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { mergeReviewedBlueprints, applyReviewedFeedbackRevisions, applyReviewedContextRevisions } = require("../scripts/lib/reviewed-lesson-merge.cjs");

const lesson = { unitId: "v3-vocab-test", id: "v3-test-v1", vocabularyIds: ["one", "two"],
  contextPhraseIds: ["old"], grammarRuleIds: ["rule"], builders: [{ id: "old-build", phraseId: "old" }],
  dialogues: [{ id: "old-conversation", turns: [] }], contextCoverage: { coveredEntryIds: ["one"], pendingEntryIds: ["two"] } };

describe("reviewed lesson expansion preserves existing work", () => {
  it("adds teaching to a stable cohort and retains every established task", () => {
    const addition = { ...structuredClone(lesson), id: "v3-test-v2", contextPhraseIds: ["new"], builders: [{ id: "new-build", phraseId: "new" }],
      dialogues: [{ id: "new-conversation", turns: [] }], contextCoverage: { coveredEntryIds: ["two"], pendingEntryIds: ["one"] } };
    const [merged] = mergeReviewedBlueprints([lesson, addition]);
    expect(merged.unitId).toBe(lesson.unitId);
    expect(merged.vocabularyIds).toEqual(lesson.vocabularyIds);
    expect(merged.contextPhraseIds).toEqual(["old", "new"]);
    expect(merged.builders.map((item: { id: string }) => item.id)).toEqual(["old-build", "new-build"]);
    expect(merged.contextCoverage).toEqual({ coveredEntryIds: ["one", "two"], pendingEntryIds: [] });
    expect(lesson.contextCoverage.pendingEntryIds).toEqual(["two"]);
  });
  it("rejects reassignment, removed coverage and changed historical tasks", () => {
    expect(() => mergeReviewedBlueprints([lesson, { ...lesson, vocabularyIds: ["one", "other"] }])).toThrow(/membership/);
    expect(() => mergeReviewedBlueprints([lesson, { ...lesson, contextCoverage: undefined }])).toThrow(/partition/);
    expect(() => mergeReviewedBlueprints([lesson, { ...lesson, builders: [{ id: "old-build", phraseId: "different" }] }])).toThrow(/established record/);
  });
  it("merges sentence-specific approved forms without widening their meaning", () => {
    const form = { entryId: "one", display: "nitekiti", meaning: { en: "I work", es: "Trabajo" }, phraseIds: ["old"] };
    const [merged] = mergeReviewedBlueprints([{ ...lesson, reviewedEntryForms: [form] }, { ...lesson, reviewedEntryForms: [{ ...form, phraseIds: ["new"] }] }]);
    expect(merged.reviewedEntryForms[0].phraseIds).toEqual(["old", "new"]);
    expect(() => mergeReviewedBlueprints([{ ...lesson, reviewedEntryForms: [form] }, { ...lesson, reviewedEntryForms: [{ ...form, meaning: { en: "You work", es: "Trabajas" } }] }])).toThrow(/change meaning/);
  });
  it("corrects reviewed feedback while preserving the task identity and answer", () => {
    const starting = { ...structuredClone(lesson), builders: [{ id: "old-build", phraseId: "old", feedback: { en: "Old scope", es: "Alcance anterior" } }] };
    const revision = { unitId: lesson.unitId, taskId: "old-build", expectedFeedback: starting.builders[0].feedback, feedback: { en: "Scope of this example", es: "Alcance de este ejemplo" } };
    const [corrected] = applyReviewedFeedbackRevisions([starting], [revision]);
    expect(corrected.builders[0]).toEqual({ ...starting.builders[0], feedback: revision.feedback });
    expect(starting.builders[0].feedback.en).toBe("Old scope");
    expect(() => applyReviewedFeedbackRevisions([starting], [{ ...revision, expectedFeedback: { en: "Different", es: "Diferente" } }])).toThrow(/starting text/);
  });
  it("retains both reviewed contexts when a new lesson uses one form in two senses", () => {
    const form = { entryId: "one", display: "tepostli", meaning: { en: "machine; metal", es: "máquina; metal" }, phraseIds: ["machine"] };
    const first = { ...lesson, reviewedEntryForms: [form, { ...form, phraseIds: ["metal"] }] };
    const [merged] = mergeReviewedBlueprints([first]);
    expect(merged.reviewedEntryForms).toEqual([{ ...form, phraseIds: ["machine", "metal"] }]);
    expect(first.reviewedEntryForms).toHaveLength(2);
    expect(() => mergeReviewedBlueprints([{ ...lesson, reviewedEntryForms: [form, { ...form, meaning: { en: "different", es: "distinto" } }] }])).toThrow(/change meaning/);
  });
  it("changes scene copy while preserving conversation speakers, gaps and accepted answers", () => {
    const dialogue = { id: "scene", context: { en: "Previous scene", es: "Escena anterior" }, turns: [
      { id: "reply", speaker: { en: "You", es: "Tú" }, phraseId: "old", gaps: [{ id: "gap", entryId: "one", tokenIndexes: [0] }] },
    ], feedback: { en: "Same answer", es: "Misma respuesta" } };
    const starting = { ...lesson, dialogues: [dialogue] };
    const revision = { id: "scene", oldContext: dialogue.context, newContext: { en: "Two friends discuss their work.", es: "Dos amistades hablan de su trabajo." } };
    const [corrected] = applyReviewedContextRevisions([starting], [revision]);
    expect(corrected.dialogues[0]).toEqual({ ...dialogue, context: revision.newContext });
    expect(starting.dialogues[0].context).toEqual(revision.oldContext);
    expect(() => applyReviewedContextRevisions([starting], [{ ...revision, oldContext: revision.newContext }])).toThrow(/starting text/);
    expect(() => applyReviewedContextRevisions([starting], [revision, revision])).toThrow(/repeat/);
    expect(() => applyReviewedContextRevisions([starting], [{ ...revision, id: "missing" }])).toThrow(/existing conversation/);
  });
});
