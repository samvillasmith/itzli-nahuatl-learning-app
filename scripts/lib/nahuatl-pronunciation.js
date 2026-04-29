"use strict";

const MACRON_TO_PLAIN = new Map([
  ["\u0101", "a"],
  ["\u0113", "e"],
  ["\u012b", "i"],
  ["\u014d", "o"],
  ["\u016b", "u"],
]);

const SHORT_VOWEL_CUE = {
  a: "ah",
  e: "eh",
  i: "ee",
  o: "oh",
  u: "oo",
};

const LONG_VOWEL_CUE = {
  a: "aah",
  e: "ehh",
  i: "ee",
  o: "ohh",
  u: "ooh",
};

const SHORT_VOWEL_BEFORE_H_CUE = {
  a: "a",
  e: "e",
  i: "ee",
  o: "o",
  u: "oo",
};

const PUNCTUATION = /[?!.,;:()[\]{}"<>/]/g;
const WORD_RE = /[A-Za-z\u0101\u0113\u012b\u014d\u016b\u02bc']+/g;
const VOWELS = new Set(["a", "e", "i", "o", "u", "\u0101", "\u0113", "\u012b", "\u014d", "\u016b"]);
const CONSONANT_CLUSTERS = new Set(["ch", "tl", "tz", "kw", "ll", "w", "sh"]);

function normalizeNahuatlText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\u2019|\u2018|\u02bc/g, "'")
    .replace(PUNCTUATION, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function plainVowel(ch) {
  return MACRON_TO_PLAIN.get(ch) || ch;
}

function isVowel(ch) {
  return VOWELS.has(ch);
}

function isLongVowel(ch) {
  return MACRON_TO_PLAIN.has(ch);
}

function tokenizeWord(word) {
  const normalized = normalizeNahuatlText(word);
  const tokens = [];

  for (let i = 0; i < normalized.length; ) {
    const ch = normalized[i];
    const next = normalized[i + 1] || "";
    const third = normalized[i + 2] || "";

    if (ch === " " || ch === "-") {
      i += 1;
      continue;
    }

    if (isVowel(ch)) {
      tokens.push({ orth: ch, kind: "vowel", base: plainVowel(ch), long: isLongVowel(ch) });
      i += 1;
      continue;
    }

    if (ch === "'") {
      tokens.push({ orth: ch, kind: "consonant", cue: "h" });
      i += 1;
      continue;
    }

    if (ch === "x") {
      tokens.push({ orth: ch, kind: "consonant", cue: "sh" });
      i += 1;
      continue;
    }

    if ((ch === "t" && (next === "l" || next === "z")) || (ch === "c" && next === "h")) {
      tokens.push({ orth: ch + next, kind: "consonant", cue: ch + next });
      i += 2;
      continue;
    }

    if (ch === "z") {
      tokens.push({ orth: ch, kind: "consonant", cue: "s" });
      i += 1;
      continue;
    }

    if (ch === "c" && next === "u" && isVowel(third)) {
      tokens.push({ orth: "cu", kind: "consonant", cue: "kw" });
      i += 2;
      continue;
    }

    if (ch === "q" && next === "u") {
      tokens.push({ orth: "qu", kind: "consonant", cue: "k" });
      i += 2;
      continue;
    }

    if (ch === "c") {
      tokens.push({ orth: ch, kind: "consonant", cue: next === "e" || next === "i" ? "s" : "k" });
      i += 1;
      continue;
    }

    if (ch === "h" && next === "u" && isVowel(third)) {
      tokens.push({ orth: "hu", kind: "consonant", cue: "w" });
      i += 2;
      continue;
    }

    if (ch === "u" && next === "h") {
      tokens.push({ orth: "uh", kind: "consonant", cue: "w" });
      i += 2;
      continue;
    }

    if (ch === "l" && next === "l") {
      tokens.push({ orth: "l", kind: "consonant", cue: "l" });
      tokens.push({ orth: "l", kind: "consonant", cue: "l" });
      i += 2;
      continue;
    }

    if (/^[a-z]$/.test(ch)) {
      tokens.push({ orth: ch, kind: "consonant", cue: ch });
      i += 1;
      continue;
    }

    i += 1;
  }

  return tokens;
}

function splitSyllables(tokens) {
  const vowelIndexes = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i].kind === "vowel") vowelIndexes.push(i);
  }

  if (!vowelIndexes.length) return [tokens];

  const syllables = [];
  let start = 0;

  for (let i = 0; i < vowelIndexes.length - 1; i += 1) {
    const vowelIndex = vowelIndexes[i];
    const nextVowelIndex = vowelIndexes[i + 1];
    const between = tokens.slice(vowelIndex + 1, nextVowelIndex);
    let boundary = vowelIndex + 1;

    if (between.length > 1) {
      const last = between[between.length - 1];
      const penult = between[between.length - 2];
      const lastTwo = `${penult.cue || penult.orth}${last.cue || last.orth}`;
      const onsetSize = CONSONANT_CLUSTERS.has(lastTwo) ? 2 : 1;
      boundary = nextVowelIndex - onsetSize;
    }

    syllables.push(tokens.slice(start, boundary));
    start = boundary;
  }

  syllables.push(tokens.slice(start));
  return syllables.length ? syllables : [tokens];
}

function cueForToken(token) {
  if (token.kind === "vowel") {
    const map = token.long ? LONG_VOWEL_CUE : SHORT_VOWEL_CUE;
    return map[token.base] || token.base;
  }
  return token.cue || token.orth;
}

function cueForSyllable(syllable) {
  return syllable
    .map((token, index) => {
      const next = syllable[index + 1];
      if (token.kind === "vowel" && next && next.kind === "consonant" && next.cue === "h" && !token.long) {
        return SHORT_VOWEL_BEFORE_H_CUE[token.base] || token.base;
      }
      return cueForToken(token);
    })
    .join("");
}

function cueForWord(word, options = {}) {
  const tokens = tokenizeWord(word);
  if (!tokens.length) return "";

  const syllables = splitSyllables(tokens);
  const stressIndex = syllables.length <= 1 ? 0 : syllables.length - 2;
  const parts = syllables.map((syllable, index) => {
    const text = cueForSyllable(syllable);
    return options.markStress === false || index !== stressIndex ? text : text.toUpperCase();
  });

  return parts.join(options.separator || "-");
}

function cueForText(text, options = {}) {
  const normalized = normalizeNahuatlText(text);
  return normalized.replace(WORD_RE, (word) => cueForWord(word, options));
}

function buildTtsInstructions(text, options = {}) {
  const cue = cueForText(text);
  const kind = options.kind === "dialogue" ? "dialogue line" : "word";

  return [
    `Generate clear Eastern Huasteca Nahuatl learning audio for this ${kind}.`,
    "This is Nahuatl, not Spanish and not English.",
    "Say only the learner text. Do not add translations, commentary, spelling names, or extra words.",
    "Use a slow, natural teaching pace with crisp consonants and steady vowels.",
    "Vowels are pure: a=ah, e=eh, i=ee, o=oh, u=oo. Never add an off-glide, so na is nah and ta is tah.",
    "The digraph ll is a held double l, like l-l. It is never the Spanish y sound.",
    "x is sh. qu is k. cu or hu before a vowel is kw or w. z is s. Keep ch, tz, and tl crisp.",
    "h or apostrophe marks a brief glottal catch or light h; do not drop it.",
    "Stress the penultimate syllable unless the cue marks a different syllable.",
    `Pronunciation cue: ${cue}`,
  ].join(" ");
}

function buildTtsInput(text, options = {}) {
  if (options.inputMode === "cue") {
    return cueForText(text, { markStress: false, separator: " " });
  }
  return normalizeNahuatlText(text);
}

module.exports = {
  buildTtsInput,
  buildTtsInstructions,
  cueForText,
  cueForWord,
  normalizeNahuatlText,
  splitSyllables,
  tokenizeWord,
};
