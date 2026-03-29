"use client";

import { useState, useCallback } from "react";
import { displayGloss } from "@/lib/gloss";
import { getWordImage } from "@/data/word-images";

type Card = {
  headword: string;
  gloss_en: string;
  part_of_speech: string;
};

function WordImage({ headword, className = "" }: { headword: string; className?: string }) {
  const img = getWordImage(headword);
  const [failed, setFailed] = useState(false);

  if (!img || failed) return null;

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.url}
        alt={headword}
        className="w-full h-full object-contain"
        onError={() => setFailed(true)}
      />
      <a
        href={`https://openverse.org`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-0 right-0 bg-black/40 text-white text-[9px] px-1.5 py-0.5 rounded-tl-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {img.license} · {img.author.slice(0, 24)}
      </a>
    </div>
  );
}

export default function FlashcardDeck({ cards }: { cards: Card[] }) {
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
    return <p className="text-stone-400 text-center py-16">No vocabulary for this unit.</p>;
  }

  const remaining = cards.length - done.size;

  if (remaining === 0) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center gap-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">✓</div>
        <h2 className="text-2xl font-bold text-stone-900">All done!</h2>
        <p className="text-stone-500">You reviewed all {cards.length} cards.</p>
        <button onClick={reset} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-2xl text-sm font-bold transition-colors shadow-sm">
          Start over
        </button>
      </div>
    );
  }

  const img = getWordImage(card.headword);

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-stone-400 font-medium">{index + 1} / {cards.length}</span>
        <span className="text-emerald-600 font-semibold">{done.size} learned · {remaining} remaining</span>
      </div>
      <div className="w-full bg-stone-100 rounded-full h-2 mb-8">
        <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(done.size / cards.length) * 100}%` }} />
      </div>

      {/* Card */}
      <button
        onClick={flip}
        className="w-full bg-white border-2 border-stone-100 rounded-3xl shadow-sm text-center hover:border-stone-200 hover:shadow-md transition-all cursor-pointer select-none overflow-hidden"
        style={{ minHeight: "280px" }}
      >
        {!flipped ? (
          <div className="flex flex-col h-full">
            {/* Image on front if available */}
            {img && (
              <div className="relative h-44 w-full overflow-hidden rounded-t-3xl bg-stone-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={card.headword}
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <a
                  href="https://openverse.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-0 right-0 bg-black/40 text-white text-[9px] px-1.5 py-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {img.license}
                </a>
              </div>
            )}
            <div className="flex flex-col items-center justify-center gap-3 p-8 flex-1">
              <p className="text-xs text-stone-300 uppercase tracking-widest font-semibold">Nahuatl</p>
              <p className="text-3xl font-bold text-stone-900 leading-tight">{card.headword}</p>
              {card.part_of_speech && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-stone-100 text-stone-400">{card.part_of_speech}</span>
              )}
              <p className="text-stone-300 text-xs mt-1 uppercase tracking-widest">tap to reveal</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 p-10 h-full" style={{ minHeight: "280px" }}>
            <p className="text-xs text-stone-300 uppercase tracking-widest font-semibold">English</p>
            <p className="text-2xl font-bold text-emerald-600 leading-snug">{displayGloss(card.gloss_en)}</p>
            {card.part_of_speech && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100">{card.part_of_speech}</span>
            )}
          </div>
        )}
      </button>

      {/* Controls */}
      <div className="flex items-center gap-2.5 mt-5">
        <button onClick={prev} className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-sm font-semibold text-stone-500 hover:bg-white hover:border-stone-300 transition-colors">← Back</button>
        {flipped && (
          <button onClick={markDone} className="flex-[2] py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors shadow-sm">Got it ✓</button>
        )}
        <button onClick={next} className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-sm font-semibold text-stone-500 hover:bg-white hover:border-stone-300 transition-colors">Skip →</button>
      </div>
    </div>
  );
}
