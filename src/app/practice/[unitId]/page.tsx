import Link from "next/link";
import { notFound } from "next/navigation";
import { getUnit, getUnitVocab, getAllUnits } from "@/lib/db";
import { collapseVariants } from "@/data/variant-groups";
import { EXCLUDED_VOCAB_IDS } from "@/data/excluded-vocab";
import { requireAuth } from "@/lib/require-auth";
import { getRequestLocale } from "@/i18n/server";
import { tr, translateDeep } from "@/i18n/translate";
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
  await requireAuth();
  const locale = await getRequestLocale();
  const { unitId } = await params;
  const num = parseInt(unitId, 10);
  if (isNaN(num)) notFound();

  const sourceUnit = getUnit(num);
  if (!sourceUnit) notFound();
  const unit = translateDeep(locale, sourceUnit);

  const rawVocab = getUnitVocab(num).filter((v) => !EXCLUDED_VOCAB_IDS.has(v.id));
  const { cards, notes } = collapseVariants(rawVocab, num);

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
          {tr(locale, "Flashcard Practice")}
        </h1>
        <p className="text-stone-500 text-sm">
          {tr(locale, "Unit")} {num} · {cards.length} {tr(locale, "words")}
        </p>
      </div>

      <FlashcardDeck
        cards={cards.map((v) => ({
          id: v.id,
          headword: v.headword,
          gloss_en: tr(locale, v.gloss_en),
          safety_gloss_en: v.gloss_en,
          part_of_speech: v.part_of_speech,
          alsoWritten: notes[v.id],
        }))}
      />
    </div>
  );
}
