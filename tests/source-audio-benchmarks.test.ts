import { describe, expect, it, vi } from "vitest";

vi.mock("@/data/audio-candidates-v3.json", () => {
  throw new Error("Learner listening must not import the diagnostic MMS index");
});
vi.mock("@/lib/require-auth", () => ({ requireAuth: async () => undefined }));
vi.mock("../src/app/listening/ListeningStudio", () => ({ default: () => null }));

import { AUDIO_SOURCE_BENCHMARKS } from "@/data/audio-source-benchmarks";
import ListeningPage from "@/app/listening/page";

describe("learner source-recording boundary", () => {
  it("loads the real listening payload without any diagnostic-candidate import", async () => {
    const page = await ListeningPage();
    const benchmarks = page.props.benchmarks as { id: string; text: string; audioUrl: string; sourceUrl: string }[];
    expect(benchmarks).toHaveLength(AUDIO_SOURCE_BENCHMARKS.length);
    expect(benchmarks).toHaveLength(19);
    for (const benchmark of benchmarks) {
      expect(benchmark.audioUrl).toMatch(/^https:\/\/tlahtolli\.coerll\.utexas\.edu\/wp-content\/uploads\//);
      expect(benchmark.sourceUrl).toMatch(/^https:\/\/tlahtolli\.coerll\.utexas\.edu\//);
      expect(AUDIO_SOURCE_BENCHMARKS.find(row => row.id === benchmark.id)?.runtime_text).toBe(benchmark.text);
    }
  });
});
