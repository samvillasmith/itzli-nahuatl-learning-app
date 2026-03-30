const BASE =
  process.env.NEXT_PUBLIC_AUDIO_BASE_URL ||
  "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app";

export const vocabAudioUrl    = (id: number | string) => `${BASE}/vocab/${id}.wav`;
export const dialogueAudioUrl = (id: string | number) => `${BASE}/dialogue/${id}.wav`;
