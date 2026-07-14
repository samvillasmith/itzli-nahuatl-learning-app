const S3_BASE = "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app";
const BASE = trimBase(process.env.NEXT_PUBLIC_AUDIO_BASE_URL || "/audio-google");
const FALLBACK_BASE = trimBase(
  process.env.NEXT_PUBLIC_AUDIO_FALLBACK_BASE_URL || (BASE === S3_BASE ? "" : S3_BASE)
);

const VOCAB_AUDIO_OVERRIDES: Record<number, string | null> = {
  24: "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/axcanah_1-1.mp3",
  25: "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/Queniuhqui.mp3",
  // These cards now teach materially different conversational forms from the
  // legacy recordings. Do not play an authoritative-sounding wrong form.
  34: null,
  35: null,
  260: "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/Piyali.mp3",
  266: null,
};

function trimBase(value: string): string {
  return value.replace(/\/+$/, "");
}

function audioUrl(kind: "vocab" | "dialogue", id: number | string): string {
  return `${BASE}/${kind}/${id}.wav`;
}

function fallbackFor(src: string): string | null {
  if (!FALLBACK_BASE || FALLBACK_BASE === BASE) return null;
  const prefix = `${BASE}/`;
  return src.startsWith(prefix) ? `${FALLBACK_BASE}/${src.slice(prefix.length)}` : null;
}

export function playAudio(src: string, onDone: () => void): void {
  const fallback = fallbackFor(src);
  const sources = fallback && fallback !== src ? [src, fallback] : [src];
  let index = 0;

  function tryNext() {
    const next = sources[index];
    index += 1;

    if (!next) {
      onDone();
      return;
    }

    const audio = new Audio(next);
    audio.onended = onDone;
    audio.onerror = tryNext;
    audio.play().catch(tryNext);
  }

  tryNext();
}

export const vocabAudioUrl    = (id: number | string) => audioUrl("vocab", id);
export const dialogueAudioUrl = (id: string | number) => audioUrl("dialogue", id);

export function vocabCardAudioUrl(id: number, explicit?: string | null): string | null {
  if (explicit) return explicit;
  if (Object.prototype.hasOwnProperty.call(VOCAB_AUDIO_OVERRIDES, id)) {
    return VOCAB_AUDIO_OVERRIDES[id];
  }
  return id > 0 ? vocabAudioUrl(id) : null;
}
