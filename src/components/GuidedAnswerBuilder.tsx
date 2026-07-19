"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { displayNahuatl } from "@/lib/orthography";
import { useLocale } from "@/i18n/LocaleProvider";

export type GuidedAnswerToken = {
  id: number;
  text: string;
};

export function splitGuidedAnswer(answer: string): GuidedAnswerToken[] {
  return answer
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((text, id) => ({ id, text }));
}

function stableTokenHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function orderGuidedAnswerTokens(tokens: GuidedAnswerToken[]): GuidedAnswerToken[] {
  if (tokens.length < 2) return tokens;

  const ordered = [...tokens].sort(
    (a, b) => stableTokenHash(`${a.text}:${a.id}`) - stableTokenHash(`${b.text}:${b.id}`),
  );
  const unchanged = ordered.every((token, index) => token.id === tokens[index].id);
  return unchanged ? [...ordered.slice(1), ordered[0]] : ordered;
}

export function joinGuidedAnswerTokens(tokens: GuidedAnswerToken[]): string {
  return tokens.map((token) => token.text).join(" ");
}

export function GuidedAnswerBuilder({
  answer,
  onChange,
  disabled = false,
}: {
  answer: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { locale } = useLocale();
  const tokens = useMemo(() => splitGuidedAnswer(answer), [answer]);
  const choices = useMemo(() => orderGuidedAnswerTokens(tokens), [tokens]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selected = selectedIds.map((id) => tokens[id]).filter(Boolean);
  const selectedSet = new Set(selectedIds);

  function update(nextIds: number[]) {
    setSelectedIds(nextIds);
    onChange(joinGuidedAnswerTokens(nextIds.map((id) => tokens[id]).filter(Boolean)));
  }

  function addToken(id: number) {
    if (disabled || selectedSet.has(id)) return;
    update([...selectedIds, id]);
  }

  function removeToken(position: number) {
    if (disabled) return;
    update(selectedIds.filter((_, index) => index !== position));
  }

  function reset() {
    if (disabled) return;
    update([]);
  }

  return (
    <div className="space-y-3" data-testid="guided-answer-builder">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase text-stone-500">
            {locale === "es" ? "Construye la frase en náhuatl" : "Build the Nahuatl phrase"}
          </p>
          <button
            type="button"
            onClick={reset}
            disabled={disabled || selectedIds.length === 0}
            title={locale === "es" ? "Empezar de nuevo" : "Start over"}
            aria-label={locale === "es" ? "Empezar de nuevo" : "Start over"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div
          className="flex min-h-16 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-3"
          aria-live="polite"
        >
          {selected.length === 0 ? (
            <p className="px-1 text-sm text-stone-400">
              {locale === "es" ? "Toca las palabras en el orden correcto." : "Tap the words in the correct order."}
            </p>
          ) : (
            selected.map((token, position) => (
              <button
                key={`${token.id}:${position}`}
                type="button"
                onClick={() => removeToken(position)}
                disabled={disabled}
                className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900 shadow-sm disabled:cursor-default"
              >
                {displayNahuatl(token.text)}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-h-12 flex-wrap justify-center gap-2">
        {choices.map((token) => {
          const used = selectedSet.has(token.id);
          return (
            <button
              key={token.id}
              type="button"
              onClick={() => addToken(token.id)}
              disabled={disabled || used}
              className="rounded-xl border-2 border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-800 shadow-sm transition-colors hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-default disabled:border-stone-100 disabled:bg-stone-50 disabled:text-stone-300 disabled:shadow-none"
            >
              {displayNahuatl(token.text)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
