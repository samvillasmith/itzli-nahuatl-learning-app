export type WordConceptCue =
  | { kind: "quantity"; value: number }
  | { kind: "month"; value: number };

const NUMBER_CARDS: Record<number, { value: number; meaning: string }> = {
  62: { value: 1, meaning: "one" },
  63: { value: 2, meaning: "two" },
  64: { value: 3, meaning: "three" },
  65: { value: 4, meaning: "four" },
  68: { value: 100, meaning: "hundred" },
  69: { value: 7, meaning: "seven" },
  71: { value: 5, meaning: "five" },
  72: { value: 8, meaning: "eight" },
  73: { value: 6, meaning: "six" },
  78: { value: 9, meaning: "nine" },
  79: { value: 10, meaning: "ten" },
  580: { value: 11, meaning: "eleven" },
  7418: { value: 20, meaning: "twenty" },
  804011: { value: 0, meaning: "zero" },
};
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export function getWordConceptCue(card: {
  id: number;
  gloss_en: string;
  safety_gloss_en?: string;
}): WordConceptCue | null {
  const meaning = (card.safety_gloss_en ?? card.gloss_en).trim().toLowerCase();
  const number = NUMBER_CARDS[card.id];
  if (number?.meaning === meaning) return { kind: "quantity", value: number.value };
  const month = card.id - 903300;
  if (month >= 1 && month <= 12 && MONTHS[month - 1] === meaning) {
    return { kind: "month", value: month };
  }
  return null;
}

export function quantityGroups(value: number): number[][] {
  if (!Number.isInteger(value) || value < 0 || value > 100) return [];
  const groups: number[][] = [];
  for (let start = 0; start < value; start += 20) {
    groups.push(Array.from({ length: Math.min(20, value - start) }, (_, index) => start + index));
  }
  return groups;
}
