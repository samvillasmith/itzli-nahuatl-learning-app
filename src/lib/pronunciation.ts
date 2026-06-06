import { toInaliOrthography } from "@/lib/orthography";

export type PronunciationHint = {
  cue: string;
  note: string;
};

function normalizeForHint(value: string): string {
  return toInaliOrthography(value)
    .toLowerCase()
    .replace(/[¿?¡!.,;:()[\]{}"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namePronunciation(form: string): string {
  return form.endsWith("h") ? form : `${form}h`;
}

export function pronunciationHintFor(value: string | null | undefined): PronunciationHint | null {
  const normalized = normalizeForHint(String(value ?? ""));
  if (!normalized) return null;

  if (/\bkenihki\b/.test(normalized) && /\bmotokah?\b/.test(normalized)) {
    return {
      cue: "Say: kenihki motokah",
      note: "Older course spelling may appear as queniuhqui motocah; in everyday practice, listen for kenihki and the final h/catch in motokah.",
    };
  }

  if (/\bkenihki\b/.test(normalized)) {
    return {
      cue: "Say: kenihki",
      note: "Do not read this as keniwki. The source spelling queniuhqui is pronounced here as kenihki.",
    };
  }

  const nameForm = normalized.match(/\b(?:no|mo|i|to|amo|in)tokah?\b/)?.[0];
  if (nameForm) {
    return {
      cue: `Say: ${namePronunciation(nameForm)}`,
      note: "The final h is a light catch or h-like release; do not drop it when practicing aloud.",
    };
  }

  return null;
}
