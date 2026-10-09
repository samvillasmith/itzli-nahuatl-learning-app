type NoteEntry = {
  id: string; display: string; usageNoteEn: string; usageNoteEs: string;
  sourceLocator: { sourceFactReviewHash?: string };
};

/** Keep the ordinary nausea sense while omitting an unnecessary bodily-act description. */
export function projectLearnerVocabularyNotes<T extends NoteEntry>(entry: T): T {
  if (entry.id !== "word-v3rf-faef4b6be29604bf") return entry;
  if (entry.display !== "elmoyawi" ||
      entry.sourceLocator.sourceFactReviewHash !== "cb91ad007c05bd1a0a10810e563c15e66351a6e5f118cd8f6a5efac1a1b2804e" ||
      entry.usageNoteEn !== "Feeling as though one may vomit after an unpleasant smell or food." ||
      entry.usageNoteEs !== "Sentir ganas de vomitar después de un olor o alimento desagradable.") {
    throw new Error("The reviewed nausea usage note changed; review its original source fact.");
  }
  return { ...entry, usageNoteEn: "Nausea after an unpleasant smell or food.",
    usageNoteEs: "Náuseas después de un olor o alimento desagradable." };
}
