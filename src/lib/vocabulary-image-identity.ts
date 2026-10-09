type ImageEntry = { id: string; display: string; meaningEn: string; meaningEs: string };

// Individually checked duplicate course records, with unchanged written forms
// and both meanings. Sharing artwork does not merge their source provenance.
const SAME_MEANING_IMAGES = [
  { id: "word-v3-0014", imageId: "word-v3i-37bb8e4bcc2aec5f", display: "chokolatl", meaningEn: "chocolate", meaningEs: "chocolate" },
  { id: "word-v3-0038", imageId: "word-v3i-bf24fb03e4abc18f", display: "yawaltik", meaningEn: "round", meaningEs: "redondo" },
];

export function vocabularyImageEntryId(entry: ImageEntry): string {
  const match = SAME_MEANING_IMAGES.find(row => row.id === entry.id && row.display === entry.display &&
    row.meaningEn === entry.meaningEn && row.meaningEs === entry.meaningEs);
  return match?.imageId ?? entry.id;
}
