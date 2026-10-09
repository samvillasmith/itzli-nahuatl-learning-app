"use client";

import type { WordImage } from "@/data/word-images";
import { WordCardMedia } from "./WordCardMedia";

/** Vocabulary previews use the same exact image bindings as the lesson cards. */
export default function LessonWordImagePreview({ items }: {
  items: readonly { id: string; display: string; meaning: string; image: WordImage | null }[];
}) {
  const illustrated = items.filter(item => item.image).slice(0, 3);
  if (!illustrated.length) return null;
  return <div className="mb-7 grid grid-cols-3 gap-2 text-left" data-testid="lesson-word-image-preview">
    {illustrated.map(item => <figure key={item.id} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <WordCardMedia image={item.image} alt={item.meaning} />
      <figcaption className="px-2 py-2 text-center text-xs font-semibold leading-5 text-stone-700" lang="nhe">{item.display}</figcaption>
    </figure>)}
  </div>;
}
