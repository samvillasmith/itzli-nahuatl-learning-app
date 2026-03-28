import Link from "next/link";
import { notFound } from "next/navigation";
import { getUnit, getUnitVocab, getAllUnits } from "@/lib/db";
import FlashcardDeck from "./FlashcardDeck";

export async function generateStaticParams() {
  const units = getAllUnits();
  return units.map((u) => ({ unitId: String(u.lesson_number) }));
}

export default async function PracticePage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const num = parseInt(unitId, 10);
  if (isNaN(num)) notFound();

  const unit = getUnit(num);
  if (!unit) notFound();

  const vocab = getUnitVocab(num);

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href={`/units/${num}`}
            className="text-sm text-stone-400 hover:text-stone-600"
          >
            ← {unit.theme_en}
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 mb-1">
          Flashcard Practice
        </h1>
        <p className="text-stone-500 text-sm">
          Unit {num} · {vocab.length} words
        </p>
      </div>

      <FlashcardDeck
        cards={vocab.map((v) => ({
          headword: v.headword,
          gloss_en: v.gloss_en,
          part_of_speech: v.part_of_speech,
        }))}
      />
    </div>
  );
}
