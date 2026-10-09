import { describe, expect, it } from "vitest";
import { guidedInteractiveContent, type GuidedInteractiveBlueprint } from "../src/components/guided-path-lesson-content";
import { builderSelectionText, guidedBuilderMatches, gradeGuidedDialogue, reviewedBuilderTiles, recordGuidedFirstAttempt, type GuidedBuilder } from "../src/components/guided-interactive-lesson";
import type { ExpansionCourse, ExpansionPhrase } from "../src/lib/expansion-course";
import type { UnifiedVocabularyEntry } from "../src/lib/unified-course-path";
import { getGeneratedRecording, isGeneratedAudioUrl } from "../src/lib/generated-audio";

const source = { id: "reviewed", title: "Reviewed native course", url: "https://example.org/source", license: "CC BY-SA", authors: ["Source author"], variety: "Chicontepec" };
function phrase(id: string, nahuatl: string, meaning = "I work"): ExpansionPhrase {
  return { id, sourceId: source.id, sourceText: nahuatl, nahuatl, english: meaning, spanish: meaning,
    audioUrl: null, audioKind: "none", sourceLocator: { lessonNumber: 1, sectionIndex: null, bodyIndex: null, vocabularyIndex: null }, adaptationNote: "Exact reviewed fixture" };
}
const course: ExpansionCourse = { schemaVersion: 1, license: {}, sources: [source], units: [], coverage: [],
  phrases: [phrase("word", "Tekiti", "work"), phrase("first", "Na nitekiti."), phrase("alternate", "Nitekiti na."), phrase("question", "¿Kenihki tiitstok?", "How are you?"), phrase("reply", "Na cuali niitstok.", "I am well."), phrase("morphology", "Nimoxilwia.", "I comb my hair.")],
  rules: [{ id: "rule", title: { en: "Subject", es: "Sujeto" }, explanation: { en: "Practice the reviewed first-person form.", es: "Practica la forma revisada." }, phraseIds: ["first"], sourceIds: [source.id], scope: { en: "These source examples", es: "Estos ejemplos" } }] };
const blueprint: GuidedInteractiveBlueprint = { id: "v3-scene-1", vocabularyIds: ["word"], contextPhraseIds: ["first"], grammarRuleIds: ["rule"],
  builders: [{ id: "build", phraseId: "first", acceptedPhraseIds: ["alternate"], prompt: { en: "Build the example", es: "Construye el ejemplo" }, feedback: { en: "Both reviewed wordings work here.", es: "Ambas formas revisadas funcionan." } }],
  dialogues: [{ id: "conversation", title: { en: "Meeting a neighbor", es: "Conocer a una vecina" }, context: { en: "You greet a neighbor.", es: "Saludas a una vecina." }, feedback: { en: "Use the reviewed reply.", es: "Usa la respuesta revisada." }, turns: [
    { id: "turn1", speaker: { en: "Neighbor", es: "Vecina" }, phraseId: "question", gaps: [{ id: "question-gap", tokenIndexes: [0] }] },
    { id: "turn2", speaker: { en: "You", es: "Tú" }, cue: { en: "You feel well.", es: "Te sientes bien." }, phraseId: "reply", gaps: [{ id: "reply-gap", tokenIndexes: [1] }] },
  ] }] };
function resolved(spec = blueprint) { return guidedInteractiveContent(course, [], spec, "en"); }
function idsFor(builder: GuidedBuilder, values: string[]) {
  const used = new Set<string>();
  return values.map(value => { const tile = builder.tiles.find(item => item.value.toLowerCase().replace(/[.?!¿]/g, "") === value.toLowerCase().replace(/[.?!¿]/g, "") && !used.has(item.id))!; used.add(tile.id); return tile.id; });
}

describe("contextual guided lesson engine", () => {
  it("resolves selected vocabulary, complete contexts, reviewed grammar and narrated turns", () => {
    const content = resolved();
    expect(content.vocabulary.map(form => form.id)).toEqual(["word"]);
    expect(content.context[0].display).toBe("Na nitekiti.");
    expect(content.grammar[0].explanation).toContain("reviewed first-person");
    expect(content.dialogues[0].turns[1].cue).toBe("You feel well.");
    expect(content.context[0].audioReferenceId).toBe("phrase:first");
    expect(content.context[0].audioUrl).toBe(getGeneratedRecording("Na nitekiti.", "phrase:first")!.url);
    expect(isGeneratedAudioUrl(content.context[0].audioUrl!)).toBe(true);
  });
  it("accepts only explicitly reviewed whole-sentence alternatives", () => {
    const builder = resolved().builders[0];
    expect(guidedBuilderMatches(builder, idsFor(builder, ["Na", "nitekiti"]))).toBe(true);
    expect(guidedBuilderMatches(builder, idsFor(builder, ["nitekiti", "na"]))).toBe(true);
    expect(guidedBuilderMatches(builder, idsFor(builder, ["na"]))).toBe(false);
    expect(guidedBuilderMatches(builder, ["forged-tile"])).toBe(false);
    const narrowed = { ...builder, answers: builder.answers.slice(0, 1) };
    expect(guidedBuilderMatches(narrowed, idsFor(builder, ["nitekiti", "na"]))).toBe(false);
  });
  it("uses separate tile identities for repeated words and rejects duplicated selection identities", () => {
    const tiled = reviewedBuilderTiles("repeat", ["Na na nitekiti."]);
    const builder = { ...resolved().builders[0], ...tiled, answers: [{ ...resolved().builders[0].answers[0], display: "Na na nitekiti." }] };
    const selection = idsFor(builder, ["Na", "na", "nitekiti"]);
    expect(new Set(selection).size).toBe(3);
    expect(guidedBuilderMatches(builder, selection)).toBe(true);
    expect(guidedBuilderMatches(builder, [selection[0], selection[0], selection[2]])).toBe(false);
    expect(builderSelectionText(builder, [selection[0], selection[0]])).toBeNull();
    expect(reviewedBuilderTiles("repeat", ["Na na nitekiti."])).toEqual(tiled);
  });
  it("assembles only explicit reviewed morpheme chunks, retaining spacing and punctuation", () => {
    const spec = structuredClone(blueprint);
    spec.builders = [{ ...spec.builders[0], phraseId: "morphology", acceptedPhraseIds: [], chunks: ["Ni", "mo", "xilwia."] }];
    const builder = resolved(spec).builders[0];
    expect(builder.kind).toBe("chunks");
    const correct = idsFor(builder, ["Ni", "mo", "xilwia"]);
    expect(builderSelectionText(builder, correct)).toBe("Nimoxilwia.");
    expect(guidedBuilderMatches(builder, correct)).toBe(true);
    expect(guidedBuilderMatches(builder, [correct[1], correct[0], correct[2]])).toBe(false);
    expect(() => reviewedBuilderTiles("bad", ["Nimoxilwia."], ["Ni", "k", "xilwia."])).toThrow(/exact source/);
    expect(() => reviewedBuilderTiles("bad", ["Nimoxilwia."], ["Nimoxilwia."])).toThrow();
  });
  it("grades every speaker gap independently and requires the full conversation to be correct", () => {
    const dialogue = resolved().dialogues[0];
    expect(gradeGuidedDialogue(dialogue, { "question-gap": "quenihqui", "reply-gap": "cuali" })).toEqual({ correct: true, gaps: { "question-gap": true, "reply-gap": true } });
    expect(gradeGuidedDialogue(dialogue, { "question-gap": "kenihki", "reply-gap": "bad" })).toEqual({ correct: false, gaps: { "question-gap": true, "reply-gap": false } });
    expect(gradeGuidedDialogue(dialogue, {})).toEqual({ correct: false, gaps: { "question-gap": false, "reply-gap": false } });
    expect(dialogue.turns[0].form.display).toBe("¿Kenihki tiitstok?");
  });
  it("rejects unreviewed phrases, missing grammar and incomplete blueprints", () => {
    expect(() => resolved({ ...blueprint, contextPhraseIds: ["unreviewed"] })).toThrow(/Unreviewed/);
    expect(() => resolved({ ...blueprint, grammarRuleIds: ["unreviewed"] })).toThrow(/Missing selected grammar/);
    expect(() => resolved({ ...blueprint, dialogues: [] })).toThrow(/Incomplete/);
    expect(() => resolved({ ...blueprint, vocabularyIds: ["word", "word"] })).toThrow(/repeated/);
  });
  it("rejects skipped, out-of-range, overlapping or duplicated gap spans", () => {
    for (const indexes of [[-1], [2], [0, 2], []]) {
      const spec = structuredClone(blueprint); spec.dialogues[0].turns[0].gaps[0].tokenIndexes = indexes;
      expect(() => resolved(spec)).toThrow(/contiguous span/);
    }
    const overlap = structuredClone(blueprint); overlap.dialogues[0].turns[0].gaps.push({ id: "overlap", tokenIndexes: [0] });
    expect(() => resolved(overlap)).toThrow(/contiguous span/);
    const repeated = structuredClone(blueprint); repeated.dialogues[0].turns[1].gaps[0].id = "question-gap";
    expect(() => resolved(repeated)).toThrow(/repeated conversation gap/);
  });
  it("does not infer equivalence between a gap and a different reviewed word or a review identity", () => {
    const alternative = structuredClone(blueprint); alternative.dialogues[0].turns[0].gaps[0].answerPhraseIds = ["word"];
    expect(() => resolved(alternative)).toThrow(/exact reviewed equivalence/);
    const invented = structuredClone(blueprint); invented.dialogues[0].turns[0].gaps[0].entryId = "word";
    expect(() => resolved(invented)).toThrow(/review identity/);
    const meaning = { ...blueprint, builders: [{ ...blueprint.builders[0], acceptedPhraseIds: ["reply"] }] };
    expect(() => resolved(meaning)).toThrow(/same intended meaning/);
  });
  it("counts reveals and retries exactly once, preserving the first attempt", () => {
    const first = recordGuidedFirstAttempt({ firstAnswers: {}, correct: 0 }, "conversation", false);
    const retry = recordGuidedFirstAttempt(first.ledger, "conversation", true);
    expect(first.firstAttempt).toBe(true); expect(retry.firstAttempt).toBe(false);
    expect(retry.ledger).toBe(first.ledger); expect(retry.ledger.correct).toBe(0);
    const second = recordGuidedFirstAttempt(retry.ledger, "builder", true);
    expect(second.ledger.correct).toBe(1);
    expect(recordGuidedFirstAttempt(second.ledger, "builder", true).ledger.correct).toBe(1);
  });
  it("retains bilingual composition limits and the exact lexical evidence links", () => {
    const modeled = structuredClone(course);
    modeled.phrases[1].usageNote = { en: "Original practice model; lexical community remains unspecified.", es: "Modelo original; comunidad léxica no especificada." };
    modeled.phrases[1].supplementalSources = [{ title: "Individual lexical evidence", url: "https://example.org/word" }];
    modeled.phrases[1].audioUrl = "https://example.org/guessed-recording.mp3";
    for (const locale of ["en", "es"] as const) {
      const content = guidedInteractiveContent(modeled, [], blueprint, locale);
      expect(content.context[0].usage).toBe(modeled.phrases[1].usageNote[locale]);
      expect(content.builders[0].answers[0].usage).toBe(modeled.phrases[1].usageNote[locale]);
      expect(content.context[0].supplementalSources).toEqual(modeled.phrases[1].supplementalSources);
      expect(content.context[0].audioUrl).toBe(getGeneratedRecording("Na nitekiti.", "phrase:first")!.url);
      expect(content.context[0].audioUrl).not.toBe(modeled.phrases[1].audioUrl);
      expect(isGeneratedAudioUrl(content.context[0].audioUrl!)).toBe(true);
    }
  });
  it("records partial coverage only when it partitions the assigned words and assesses covered words in conversation", () => {
    const entries = [cohortWord("covered", "kuali", "well"), cohortWord("pending", "xochitl", "flower")];
    const spec = structuredClone(blueprint);
    spec.vocabularyIds = entries.map(entry => entry.id);
    spec.contextPhraseIds = ["question", "reply"];
    spec.contextCoverage = { coveredEntryIds: ["covered"], pendingEntryIds: ["pending"] };
    const content = guidedInteractiveContent(course, entries, spec, "en");
    expect(content.vocabulary.map(form => form.id)).toEqual(["covered", "pending"]);
    expect(content.contextCoverage).toEqual(spec.contextCoverage);
    expect(content.contextCoverage).not.toBe(spec.contextCoverage);
    const falseClaim = { ...spec, contextCoverage: { coveredEntryIds: ["covered", "pending"], pendingEntryIds: [] } };
    expect(() => guidedInteractiveContent(course, entries, falseClaim, "en")).toThrow(/reviewed context.*final-conversation gap/);
    const absentContext = { ...spec, contextPhraseIds: ["first"] };
    expect(() => guidedInteractiveContent(course, entries, absentContext, "en")).toThrow(/reviewed context/);
  });
  it("rejects missing, duplicated, invented or unintroduced cohort coverage identities", () => {
    const entries = [cohortWord("covered", "kuali", "well"), cohortWord("pending", "xochitl", "flower")];
    const spec = { ...structuredClone(blueprint), vocabularyIds: entries.map(entry => entry.id), contextPhraseIds: ["reply"] };
    for (const contextCoverage of [
      { coveredEntryIds: ["covered"], pendingEntryIds: [] },
      { coveredEntryIds: ["covered"], pendingEntryIds: ["covered"] },
      { coveredEntryIds: ["covered"], pendingEntryIds: ["invented"] },
      { coveredEntryIds: [], pendingEntryIds: ["covered", "pending"] },
    ]) expect(() => guidedInteractiveContent(course, entries, { ...spec, contextCoverage }, "en")).toThrow();
    expect(() => guidedInteractiveContent(course, entries, { ...spec, vocabularyIds: ["covered"], contextCoverage: { coveredEntryIds: ["covered"], pendingEntryIds: ["pending"] } }, "en")).toThrow(/introduce every assigned word/);
  });
  it("assesses an individually reviewed finite form while preserving its citation word", () => {
    const entries = [cohortWord("root", "xilwia", "comb")];
    const spec = structuredClone(blueprint);
    spec.vocabularyIds = ["root"];
    spec.contextPhraseIds = ["morphology"];
    spec.contextCoverage = { coveredEntryIds: ["root"], pendingEntryIds: [] };
    spec.reviewedEntryForms = [{ entryId: "root", display: "Nimoxilwia", meaning: { en: "I comb myself", es: "Me peino" }, phraseIds: ["morphology"] }];
    spec.dialogues[0].turns[1] = { id: "mapped-turn", speaker: { en: "You", es: "Tú" }, phraseId: "morphology", gaps: [{ id: "mapped-gap", tokenIndexes: [0], entryId: "root" }] };
    const content = guidedInteractiveContent(course, entries, spec, "en");
    expect(content.vocabulary[0].display).toBe("xilwia");
    expect(content.dialogues[0].turns[1].gaps[0].answer).toBe("Nimoxilwia.");
    expect(gradeGuidedDialogue(content.dialogues[0], { "question-gap": "kenihki", "mapped-gap": "nimoxilwia" }).correct).toBe(true);
    expect(gradeGuidedDialogue(content.dialogues[0], { "question-gap": "kenihki", "mapped-gap": "xilwia" }).correct).toBe(false);
    const unapproved = structuredClone(spec); delete unapproved.reviewedEntryForms;
    expect(() => guidedInteractiveContent(course, entries, unapproved, "en")).toThrow(/unreviewed complete form/);
    const wrongSentence = structuredClone(spec); wrongSentence.reviewedEntryForms![0].phraseIds = ["first"];
    expect(() => guidedInteractiveContent(course, entries, wrongSentence, "en")).toThrow(/each selected sentence/);
    const substring = structuredClone(spec); substring.reviewedEntryForms![0].display = "xilwia";
    expect(() => guidedInteractiveContent(course, entries, substring, "en")).toThrow(/exact complete form/);
    const invented = structuredClone(spec); invented.reviewedEntryForms![0].entryId = "other";
    expect(() => guidedInteractiveContent(course, entries, invented, "en")).toThrow(/Invalid reviewed entry/);
  });
});

function cohortWord(id: string, display: string, meaning: string): UnifiedVocabularyEntry {
  return { id, display, sourceSpelling: display, meaningEn: meaning, meaningEs: meaning, partOfSpeech: "noun", formKind: "lexical-headword", sourceUrl: "https://example.org/word",
    audioUrl: null, audioKind: "none", variety: "Individually qualified Eastern Huasteca reference", sourceTitle: "Individual lexical source", sourceAuthors: ["Source author"], sourceLicense: "Factual reference", contentLicense: "CC BY-SA 4.0" };
}
