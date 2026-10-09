"use client";

import { getWordConceptCue, quantityGroups } from "@/data/word-concept-cues";
import { useLocale } from "@/i18n/LocaleProvider";

export default function WordConceptCue({ card }: {
  card: { id: number; gloss_en: string; safety_gloss_en?: string };
}) {
  const { locale } = useLocale();
  const cue = getWordConceptCue(card);
  if (!cue) return null;
  const label = cue.kind === "quantity"
    ? locale === "es" ? `Cantidad: ${cue.value}` : `Quantity: ${cue.value}`
    : locale === "es" ? `Mes ${cue.value} de 12` : `Month ${cue.value} of 12`;

  return (
    <div role="img" aria-label={label} data-testid="word-concept-cue" className="border-b border-stone-200 bg-[#fbf1d8] px-6 py-7">
      {cue.kind === "quantity" ? (
        <>
          <div aria-hidden="true" className="flex flex-wrap justify-center gap-5">
            {quantityGroups(cue.value).map((group, index) => (
              <div key={index} className="grid grid-cols-5 gap-2">
                {group.map((dot) => <span key={dot} data-quantity-dot className="h-4 w-4 rounded-full bg-emerald-800 sm:h-5 sm:w-5" />)}
              </div>
            ))}
          </div>
          <p aria-hidden="true" className="mt-4 text-center text-5xl font-black text-emerald-900">{cue.value}</p>
        </>
      ) : (
        <>
          <div aria-hidden="true" className="mx-auto grid max-w-sm grid-cols-6 gap-2">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index} className={`flex aspect-square items-center justify-center rounded-md border text-lg font-bold ${index + 1 === cue.value ? "border-emerald-800 bg-emerald-800 text-white" : "border-stone-300 bg-white/70 text-stone-500"}`}>{index + 1}</span>
            ))}
          </div>
          <p aria-hidden="true" className="mt-4 text-center text-sm font-semibold text-emerald-900">{label}</p>
        </>
      )}
    </div>
  );
}
