import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
const { auditInstructionalCompletion, phraseHash, verifiedLabelEquivalences } = createRequire(import.meta.url)("../scripts/lib/instructional-completion-audit.cjs");

function labelReviewInput() {
  const text = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const hash = (path: string) => createHash("sha256").update(readFileSync(new URL(`../${path}`, import.meta.url))).digest("hex");
  const sourceFiles = [
    "data/research/yan-garcia-nhe-20261004/verification/further-sources/tlahtolxitlauhcayotl-chicontepec-reference.pdf",
    "src/data/nahuatlahtolli-course.json",
  ];
  return {
    reviewSource: text("data/copyright-audit-20261007/gloss-label-equivalence-review.private.json"),
    expectedReviewSha256: "570f31f6a85588f5f2baed7c67b301edff8b4063c67ddad1b4fb0f46e8e12f36",
    labelsSource: text("src/data/reviewed-vocabulary-labels.json"),
    lexiconSource: text("src/data/v3-verified-lexicon.json"),
    contextLabelsSource: text("src/data/reviewed-context-labels.json"),
    primarySourceHashes: Object.fromEntries(sourceFiles.map(path => [path, hash(path)])),
  };
}

function fixture() {
  const assignment = { progressId: "cohort-one", lessonNumber: 90, entryIds: ["word-one"] };
  const phrase = { id: "sentence", nahuatl: "Nikitta xochitl.", english: "I see the flower.", spanish: "Veo la flor." };
  const entry = { id: "word-one", display: "xochitl", meaningEn: "flower", meaningEs: "flor", partOfSpeech: "noun" };
  const blueprint = { vocabularyIds: [entry.id], contextPhraseIds: [phrase.id], builders: [{ id: "build", phraseId: phrase.id }],
    dialogues: [{ id: "exchange", turns: [{ id: "you", phraseId: phrase.id, gaps: [{ id: "gap", entryId: entry.id, tokenIndexes: [1] }] }] }] };
  const review = { entryId: entry.id, selectedForm: entry.display, selectedMeaningEn: entry.meaningEn, selectedMeaningEs: entry.meaningEs,
    approvedContextPhraseIds: [phrase.id], approvedContextPhraseHashes: { [phrase.id]: phraseHash(phrase) },
    sourceEvidence: [{ url: "https://example.org/primary", locator: { sectionIndex: 1, bodyIndex: 3 } }],
    decision: "compatible-complete-context", reason: "The physical flower is established in the scene; the selected noun sense is unchanged." };
  return { assignments: [assignment], frozenAssignments: structuredClone([assignment]), entries: [entry], phrases: [phrase], lessons: [{ unitId: assignment.progressId, blueprint }], reviews: [review] };
}

describe("independent instructional completion audit", () => {
  it("counts only a same-cohort introduction, reviewed sentence, builder and final exact gap", () => {
    expect(auditInstructionalCompletion(fixture()).counts).toMatchObject({ completeEntries: 1, completeCohorts: 1, validationErrors: 0 });
  });
  it("does not count a global grammar lesson in place of the word's assigned cohort", () => {
    const input = fixture(); input.lessons[0].unitId = "other-grammar-lesson";
    expect(auditInstructionalCompletion(input).counts.completeEntries).toBe(0);
  });
  it("does not count headword introduction alone as conversational coverage", () => {
    const input = fixture(); input.lessons[0].blueprint.contextPhraseIds = [];
    expect(auditInstructionalCompletion(input).counts.completeEntries).toBe(0);
  });
  it("does not count a same-spelling word in a different meaning", () => {
    const input = fixture(); input.reviews[0].selectedMeaningEn = "a different homonym";
    const result = auditInstructionalCompletion(input);
    expect(result.counts.completeEntries).toBe(0); expect(result.errors).not.toHaveLength(0);
  });
  it("rejects changed phrase wording even when its ID is preserved", () => {
    const input = fixture(); input.phrases[0].english = "I smell the flower.";
    expect(auditInstructionalCompletion(input).errors[0].reviewProblems).toContain("reviewed-phrase-changed:sentence");
  });
  it("requires both a builder and a final graded production gap for strict completion", () => {
    const input = fixture(); input.lessons[0].blueprint.builders = [];
    const result = auditInstructionalCompletion(input);
    expect(result.counts.completeEntries).toBe(0); expect(result.counts.contextualProductionEntries).toBe(1);
  });
  it("rejects moving a stable route or changing its assigned word membership", () => {
    const input = fixture(); input.assignments[0].lessonNumber = 91;
    expect(auditInstructionalCompletion(input).errors.some((row: { problem?: string }) => row.problem === "frozen-route-or-membership-changed")).toBe(true);
  });
  it("does not credit a citation root through substring matching of an inflected word", () => {
    const input = fixture(); input.entries[0].display = "itta"; input.reviews[0].selectedForm = "itta";
    expect(auditInstructionalCompletion(input).counts.completeEntries).toBe(0);
  });
  it("rejects the wrong vocabulary identity on an otherwise exact gap", () => {
    const input = fixture(); input.lessons[0].blueprint.dialogues[0].turns[0].gaps[0].entryId = "another-word";
    expect(auditInstructionalCompletion(input).counts.completeEntries).toBe(0);
  });
  it("keeps separately reviewed entries with the same complete form on their own graded gaps", () => {
    const input = fixture();
    const other = { ...input.entries[0], id: "word-two" };
    input.entries.push(other);
    input.assignments[0].entryIds.push(other.id);
    input.frozenAssignments[0].entryIds.push(other.id);
    input.lessons[0].blueprint.vocabularyIds.push(other.id);
    input.reviews.push({ ...input.reviews[0], entryId: other.id });
    const initial = auditInstructionalCompletion(input);
    expect(initial.counts).toMatchObject({ completeEntries: 1, validationErrors: 0 });
    input.lessons[0].blueprint.dialogues[0].turns.push({ id: "other-you", phraseId: "sentence",
      gaps: [{ id: "other-gap", entryId: other.id, tokenIndexes: [1] }] });
    expect(auditInstructionalCompletion(input).counts).toMatchObject({ completeEntries: 2, validationErrors: 0 });
  });
  it("does not accept a partial or discontiguous multiword gap", () => {
    const input = fixture(); input.entries[0].display = "Nikitta xochitl"; input.reviews[0].selectedForm = "Nikitta xochitl";
    input.lessons[0].blueprint.dialogues[0].turns[0].gaps[0].tokenIndexes = [0, 2];
    expect(auditInstructionalCompletion(input).counts.completeEntries).toBe(0);
  });
  it("credits a separately reviewed whole finite form only with matching public and private phrase associations", () => {
    const input = fixture(); input.entries[0].display = "itta"; input.reviews[0].selectedForm = "itta";
    input.lessons[0].blueprint.dialogues[0].turns[0].gaps[0].tokenIndexes = [0];
    const mapping = { entryId: "word-one", display: "Nikitta", meaning: { en: "I see it", es: "Lo veo" }, phraseIds: ["sentence"] };
    const expanded = input as typeof input & { reviews: { approvedEntryForms?: typeof mapping[] }[]; lessons: { blueprint: { reviewedEntryForms?: typeof mapping[] } }[] };
    expanded.reviews[0].approvedEntryForms = [mapping];
    expect(auditInstructionalCompletion(input).counts.completeEntries).toBe(0);
    expanded.lessons[0].blueprint.reviewedEntryForms = [mapping];
    expect(auditInstructionalCompletion(input).counts).toMatchObject({ completeEntries: 1, exactCitationProductionEntries: 0, mappedFormProductionEntries: 1 });
    expanded.lessons[0].blueprint.reviewedEntryForms[0] = { ...mapping, phraseIds: ["another-sentence"] };
    expect(auditInstructionalCompletion(input).counts.completeEntries).toBe(0);
  });
  it("does not let a rejected review replace a previously approved finite mapping", () => {
    const input = fixture(); input.entries[0].display = "itta"; input.reviews[0].selectedForm = "itta";
    const valid = { entryId: "word-one", display: "Nikitta", meaning: { en: "I see it", es: "Lo veo" }, phraseIds: ["sentence"] };
    const invalid = { ...valid, display: "xochitl", meaning: { en: "flower", es: "flor" } };
    const expanded = input as typeof input & { reviews: { approvedEntryForms?: typeof valid[] }[]; lessons: { blueprint: { reviewedEntryForms?: typeof valid[] } }[] };
    expanded.reviews[0].approvedEntryForms = [valid];
    expanded.lessons[0].blueprint.reviewedEntryForms = [valid, invalid];
    expanded.reviews.push(Object.assign({ ...expanded.reviews[0], selectedMeaningEn: "wrong homonym" }, { approvedEntryForms: [invalid] }));
    expect(auditInstructionalCompletion(input).counts.completeEntries).toBe(0);
  });
});

// This local source review stays with ignored research, never in learner packaging.
const labelReviewEvidencePresent = [
  "data/copyright-audit-20261007/gloss-label-equivalence-review.private.json",
  "data/research/yan-garcia-nhe-20261004/verification/further-sources/tlahtolxitlauhcayotl-chicontepec-reference.pdf",
].every(path => existsSync(new URL(`../${path}`, import.meta.url)));

describe.runIf(labelReviewEvidencePresent)("bounded independently reviewed label equivalence", () => {
  function redraftedFixture() {
    const proofInput = labelReviewInput();
    const equivalences = verifiedLabelEquivalences(proofInput);
    const equivalent = equivalences.find((row: { entryId: string }) => row.entryId === "word-v3f-0c7171b3193215b1")!;
    const original = JSON.parse(proofInput.lexiconSource).entries.find((entry: { id: string }) => entry.id === equivalent.entryId);
    const input = fixture();
    const id = original.id;
    input.entries[0] = { ...original, meaningEn: equivalent.meaningEn, meaningEs: equivalent.meaningEs };
    input.assignments[0].entryIds = [id];
    input.frozenAssignments[0].entryIds = [id];
    input.phrases[0] = { id: "sentence", nahuatl: "Nepa eltok amoxtli.", english: "The book is there within view.", spanish: "El libro está allá a la vista." };
    input.reviews[0] = { ...input.reviews[0], entryId: id, selectedForm: original.display,
      selectedMeaningEn: equivalent.beforeEn, selectedMeaningEs: equivalent.beforeEs,
      approvedContextPhraseHashes: { sentence: phraseHash(input.phrases[0]) },
      reason: "The selected visible distant location is retained in the checked book-presence scene." };
    input.lessons[0].blueprint.vocabularyIds = [id];
    input.lessons[0].blueprint.dialogues[0].turns[0].gaps = [{ id: "gap", entryId: id, tokenIndexes: [0] }];
    return { ...input, labelEquivalences: equivalences };
  }
  it("requires the exact pinned review and authorizes eighteen specific redrafts without extending to other corrections", () => {
    const equivalences = verifiedLabelEquivalences(labelReviewInput());
    expect(equivalences).toHaveLength(18);
    expect(new Set(equivalences.map((row: { entryId: string }) => row.entryId)).size).toBe(18);
    expect(equivalences.some((row: { entryId: string }) => row.entryId === "word-v3i-cce871dec1f49d2a")).toBe(false);
  });
  it("retains completion through a reviewed wording change, while rejecting the same change without the individual equivalence", () => {
    const input = redraftedFixture();
    expect(auditInstructionalCompletion({ ...input, labelEquivalences: [] }).counts.completeEntries).toBe(0);
    expect(auditInstructionalCompletion(input).counts).toMatchObject({ completeEntries: 1, validationErrors: 0 });
  });
  it("does not waive a changed sense, a changed historical review or an unrelated homograph identity", () => {
    for (const target of ["learner", "review", "identity"] as const) {
      const input = redraftedFixture();
      if (target === "learner") input.entries[0].meaningEn = "inside the house";
      else if (target === "review") input.reviews[0].selectedMeaningEn = "a nonvisible distant location";
      else {
        input.entries[0].id = "another-same-spelling-entry";
        input.reviews[0].entryId = input.entries[0].id;
        input.assignments[0].entryIds = [input.entries[0].id];
        input.frozenAssignments[0].entryIds = [input.entries[0].id];
      }
      const result = auditInstructionalCompletion(input);
      expect(result.counts.completeEntries, target).toBe(0);
      expect(result.errors.some((row: { reviewProblems?: string[] }) => row.reviewProblems?.includes("selected-sense-changed")), target).toBe(true);
    }
  });
  it("does not waive a changed source locator, phrase approval or missing final production gap", () => {
    const sourceChanged = redraftedFixture();
    Object.assign(sourceChanged.entries[0], { sourceLocator: { differentPrimaryEvidence: true } });
    expect(auditInstructionalCompletion(sourceChanged).counts.completeEntries).toBe(0);
    const phraseChanged = redraftedFixture();
    phraseChanged.phrases[0].english = "The book is inside the house.";
    expect(auditInstructionalCompletion(phraseChanged).counts.completeEntries).toBe(0);
    const missingGap = redraftedFixture();
    missingGap.lessons[0].blueprint.dialogues[0].turns[0].gaps = [];
    expect(auditInstructionalCompletion(missingGap).counts.completeEntries).toBe(0);
  });
  it("rejects tampered review, learner overlay, context overlay and source-evidence bytes", () => {
    for (const target of ["reviewSource", "labelsSource", "contextLabelsSource"] as const) {
      const input = labelReviewInput();
      input[target] += " ";
      expect(() => verifiedLabelEquivalences(input), target).toThrow(/approved hash|reviewed data hash/);
    }
    const sourceChanged = labelReviewInput();
    sourceChanged.primarySourceHashes["src/data/nahuatlahtolli-course.json"] = "0".repeat(64);
    expect(() => verifiedLabelEquivalences(sourceChanged)).toThrow(/primary evidence/);
    const rawChanged = labelReviewInput();
    rawChanged.lexiconSource += " ";
    expect(() => verifiedLabelEquivalences(rawChanged)).toThrow(/reviewed data hash/);
  });
});
