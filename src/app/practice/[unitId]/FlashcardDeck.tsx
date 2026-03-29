"use client";

import { useState, useCallback } from "react";
import { displayGloss } from "@/lib/gloss";

type Card = {
  headword: string;
  gloss_en: string;
  part_of_speech: string;
};

export default function FlashcardDeck({ cards }: { cards: Card[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState<Set<number>>(new Set());

  const card = cards[index];

  const flip = useCallback(() => setFlipped((f) => !f), []);

  const next = useCallback(() => {
    setFlipped(false);
    setIndex((i) => (i + 1) % cards.length);
  }, [cards.length]);

  const prev = useCallback(() => {
    setFlipped(false);
    setIndex((i) => (i - 1 + cards.length) % cards.length);
  }, [cards.length]);

  const markDone = useCallback(() => {
    setDone((d) => new Set([...d, index]));
    next();
  }, [index, next]);

  const reset = useCallback(() => {
    setDone(new Set());
    setIndex(0);
    setFlipped(false);
  }, []);

  if (cards.length === 0) {
    return <p className="text-stone-400 text-center py-12">No vocabulary for this unit.</p>;
  }

  const remaining = cards.length - done.size;

  if (remaining === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="text-5xl">✓</div>
        <h2 className="text-2xl font-bold text-stone-900">All done!</h2>
        <p className="text-stone-500">You reviewed all {cards.length} cards.</p>
        <button
          onClick={reset}
          className="bg-stone-900 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-stone-700 transition-colors"
        >
          Start over
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-stone-400 mb-6">
        <span>
          {index + 1} / {cards.length}
        </span>
        <span>
          {done.size} learned · {remaining} remaining
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-stone-100 rounded-full h-1.5 mb-8">
        <div
          className="bg-emerald-400 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${(done.size / cards.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <button
        onClick={flip}
        className="w-full bg-white border-2 border-stone-200 rounded-2xl p-10 text-center hover:border-stone-300 transition-all cursor-pointer select-none shadow-sm hover:shadow-md"
        style={{ minHeight: "220px" }}
      >
        {!flipped ? (
          <div>
            <p className="text-xs text-stone-300 uppercase tracking-widest mb-4">Nahuatl</p>
            <p className="text-3xl font-bold text-stone-900 leading-tight">{card.headword}</p>
            <p className="text-stone-300 text-sm mt-6">tap to reveal</p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-stone-300 uppercase tracking-widest mb-4">English</p>
            <p className="text-2xl font-semibold text-stone-800 leading-snug">{displayGloss(card.gloss_en)}</p>
            {card.part_of_speech && (
              <p className="text-stone-400 text-sm mt-3 font-mono">{card.part_of_speech}</p>
            )}
          </div>
        )}
      </button>

      {/* Controls */}
      <div className="flex items-center justify-between mt-6 gap-3">
        <button
          onClick={prev}
          className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
        >
          ← Back
        </button>

        {flipped && (
          <button
            onClick={markDone}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            Got it ✓
          </button>
        )}

        <button
          onClick={next}
          className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
        >
          Skip →
        </button>
      </div>
    </div>
  );
}
