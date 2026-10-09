import rawCandidates from "./audio-candidates-v3.json";
// Historical diagnostic API compatibility. Learner pages import the source-only
// module directly so they do not load the MMS comparison-candidate index.
export { AUDIO_SOURCE_BENCHMARKS } from "./audio-source-benchmarks";

export type AudioCandidate = {
  kind: "vocab" | "dialogue" | "benchmark";
  id: string;
  runtime_text: string;
  synthesis_text: string;
  text_sha256: string;
  synthesis_text_sha256: string;
  audio_sha256: string;
  audio_url: string;
  model_id: string;
  model_revision: string;
  model_license: string;
  review_status: "unreviewed";
  legacy_hold: boolean;
  limitations: string[];
  source_refs: Array<{ source_url?: string; audio_url?: string; text?: string; scope?: string }>;
  duration_seconds: number;
  sample_rate_hz: number;
};

/** Local synthetic comparisons only. This API never releases course audio holds. */
export function getLocalAudioCandidates(
  kind: AudioCandidate["kind"],
  id: number | string,
  currentText: string,
): AudioCandidate[] {
  return (rawCandidates.candidates as AudioCandidate[]).filter((candidate) =>
    candidate.kind === kind && candidate.id === String(id) &&
    candidate.runtime_text === currentText && candidate.review_status === "unreviewed" &&
    /^[a-f0-9]{64}$/.test(candidate.text_sha256) &&
    /^[a-f0-9]{64}$/.test(candidate.audio_sha256) &&
    /^[a-f0-9]{40}$/.test(candidate.model_revision) &&
    candidate.audio_url.startsWith("/audio-v3/candidates/")
  );
}

export const LOCAL_AUDIO_CANDIDATES = rawCandidates.candidates as AudioCandidate[];
