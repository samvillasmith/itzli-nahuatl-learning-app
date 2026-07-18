"use client";

import { useState, useCallback } from "react";
import { LoaderCircle, Volume2 } from "lucide-react";
import { WordCardMedia, WordImageCredit } from "@/components/WordCardMedia";
import { displayGloss } from "@/lib/gloss";
import { playAudio, vocabCardAudioUrl } from "@/lib/audio";
import { getWordImage } from "@/data/word-images";
import { displayNahuatl } from "@/lib/orthography";
import { pronunciationHintFor } from "@/lib/pronunciation";
import { useLocale } from "@/i18n/LocaleProvider";
import { WordImagePreloads } from "@/components/WordImageResourceHints";

type Card = {
  id: number;
  headword: string;
  gloss_en: string;
  safety_gloss_en?: string;
  part_of_speech: string;
  audioSrc?: string | null;
  imageHeadword?: string | null;
  alsoWritten?: string[];
};

function cardImage(card: Card) {
  return getWordImage(card.imageHeadword ?? card.headword, {
    allowLegacyFallback: true,
    safetyText: card.part_of_speech === "letter" ? [] : [card.safety_gloss_en ?? card.gloss_en, card.part_of_speech],
  });
}

// ── Audio play button ──────────────────────────────────────────────────────────

function AudioButton({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const { translate } = useLocale();

  function handlePlay(e: React.MouseEvent) {
    e.stopPropagation();
    if (playing) return;
    setPlaying(true);
    playAudio(src, () => setPlaying(false));
  }

  return (
    <button
      onClick={handlePlay}
      title={translate("Play pronunciation")}
      aria-label={translate("Play pronunciation")}
      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
        playing
          ? "bg-emerald-100 text-emerald-600 border border-emerald-200"
          : "border border-stone-200 bg-white text-stone-500 shadow-sm hover:border-emerald-300 hover:text-emerald-700"
      }`}
    >
      {playing ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Volume2 className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}

function PronunciationHint({ value }: { value: string }) {
  const hint = pronunciationHintFor(value);
  const { translate } = useLocale();
  if (!hint) return null;

  return (
    <div className="max-w-xs rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-center">
      <p className="text-xs font-bold text-amber-800">{translate(hint.cue)}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-stone-500">{translate(hint.note)}</p>
    </div>
  );
}

export default function FlashcardDeck({ cards }: { cards: Card[] }) {
  const { locale, translate } = useLocale();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState<Set<number>>(new Set());

  const card = cards[index];

  const flip = useCallback(() => setFlipped((f) => !f), []);
  const next = useCallback(() => { setFlipped(false); setIndex((i) => (i + 1) % cards.length); }, [cards.length]);
  const prev = useCallback(() => { setFlipped(false); setIndex((i) => (i - 1 + cards.length) % cards.length); }, [cards.length]);
  const markDone = useCallback(() => { setDone((d) => new Set([...d, index])); next(); }, [index, next]);
  const reset = useCallback(() => { setDone(new Set()); setIndex(0); setFlipped(false); }, []);

  if (cards.length === 0) {
    return <p className="text-stone-400 text-center py-16">{translate("No vocabulary for this unit.")}</p>;
  }

  const remaining = cards.length - done.size;

  if (remaining === 0) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center gap-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✓</div>
        <h2 className="text-2xl font-bold text-stone-900">{translate("All done!")}</h2>
        <p className="text-stone-500">{locale === "es" ? `Repasaste las ${cards.length} tarjetas.` : `You reviewed all ${cards.length} cards.`}</p>
        <button onClick={reset} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-bold transition-colors shadow-sm">
          {translate("Start over")}
        </button>
      </div>
    );
  }

  const img = cardImage(card);
  const preloadUrls = [0, 1, 2].map((offset) =>
    cardImage(cards[(index + offset) % cards.length])?.url,
  );
  const audioSrc = card.audioSrc ?? vocabCardAudioUrl(card.id);

  return (
    <div className="max-w-lg mx-auto">
      <WordImagePreloads urls={preloadUrls} />
      {/* Progress */}
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-stone-400 font-medium">{index + 1} / {cards.length}</span>
        <span className="text-emerald-600 font-semibold">{done.size} {translate("learned")} · {remaining} {translate("remaining")}</span>
      </div>
      <div className="w-full bg-stone-100 rounded-full h-2 mb-8">
        <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(done.size / cards.length) * 100}%` }} />
      </div>

      {/* Card */}
      <button
        onClick={flip}
        className="w-full cursor-pointer select-none overflow-hidden rounded-lg border border-stone-200 bg-white text-center shadow-[0_22px_60px_rgba(39,36,31,0.10)] transition-all hover:border-emerald-300"
        style={{ minHeight: "280px" }}
      >
        {!flipped ? (
          <div className="flex flex-col h-full">
            {/* Image on front if available */}
            <WordCardMedia image={img} alt={displayNahuatl(card.headword)} />
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 sm:p-7">
              <p className="text-xs text-stone-300 uppercase font-semibold">Nahuatl</p>
              <p className="text-3xl font-bold text-stone-900 leading-tight">{displayNahuatl(card.headword)}</p>
              <PronunciationHint value={card.headword} />
              {card.part_of_speech && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-stone-100 text-stone-400">{translate(card.part_of_speech)}</span>
              )}
              {card.alsoWritten && card.alsoWritten.length > 0 && (
                <p className="text-xs text-stone-400 text-center">
                  {translate("Also written")}: {" "}
                  <span className="font-medium text-stone-500">
                    {card.alsoWritten.map(displayNahuatl).join(", ")}
                  </span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 p-10 h-full" style={{ minHeight: "280px" }}>
            <p className="text-xs text-stone-300 uppercase font-semibold">{locale === "es" ? "Español" : "English"}</p>
            <p className="text-2xl font-bold text-emerald-600 leading-snug">{displayGloss(card.gloss_en)}</p>
            {card.part_of_speech && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100">{translate(card.part_of_speech)}</span>
            )}
          </div>
        )}
      </button>
      <WordImageCredit image={img} />
      {audioSrc && (
        <div className="mt-3 flex justify-center">
          <AudioButton src={audioSrc} />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2.5 mt-5">
        <button onClick={prev} className="flex-1 rounded-lg border border-stone-200 py-3 text-sm font-semibold text-stone-500 transition-colors hover:border-stone-300 hover:bg-white">← {translate("Back")}</button>
        {flipped && (
          <button onClick={markDone} className="flex-[2] rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700">{translate("Got it")} ✓</button>
        )}
        <button onClick={next} className="flex-1 rounded-lg border border-stone-200 py-3 text-sm font-semibold text-stone-500 transition-colors hover:border-stone-300 hover:bg-white">{translate("Skip")} →</button>
      </div>
    </div>
  );
}
