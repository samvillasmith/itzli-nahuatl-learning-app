import type { WordImage } from "@/data/word-images";
import type { GuidedPracticeCard } from "@/components/guided-path-lesson-content";

/** Practice may show only the explicitly identified vocabulary target or cue.
 * Answers and matching spellings never supply artwork for an unrelated sentence. */
export function guidedPracticeImage(
  task: Pick<GuidedPracticeCard, "entryId" | "cue">,
  lessonImages: ReadonlyMap<string, WordImage | null>,
): WordImage | null {
  const entryId = task.entryId ?? task.cue?.id;
  return entryId ? lessonImages.get(entryId) ?? null : null;
}
