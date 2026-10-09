export type TutorSeedChunk = { kind: string; content: string; metadata: Record<string, unknown> };
export type ReviewedTutorSeed = TutorSeedChunk & { sha256: string };
export function canonicalJson(value: unknown): string;
export function chunkSha256(chunk: TutorSeedChunk): string;
export function createReviewedTutorGate(seeds: readonly ReviewedTutorSeed[]): (candidate: unknown) => TutorSeedChunk | null;
