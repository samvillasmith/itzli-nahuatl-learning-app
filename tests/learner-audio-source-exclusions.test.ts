import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import policy from "@/data/audio-learner-exclusions.json";
import contentPolicy from "@/data/app-content-exclusions.json";
import published from "@/data/generated-course-audio.json";
import { GENERATED_AUDIO_INDEX, resolvePracticeRecording } from "@/lib/generated-audio";
import { vocabCardAudioUrl } from "@/lib/audio";
import { NAHUATLAHTOLLI_COURSE } from "@/lib/nahuatlahtolli";
import { sourceBrowserLineAudio } from "@/lib/course-audio-surfaces";

const require = createRequire(import.meta.url);
const { getExcludedNativeSourceUrls } = require("../scripts/lib/learner-audio-eligibility.cjs");

describe("source audio follows exact current content exclusions", () => {
  it("blocks a native URL only when every attested binding is excluded", () => {
    const rejected = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/rejected.mp3";
    const shared = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/shared.mp3";
    const unboundPassage = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/unknown-passage.mp3";
    const bindings = [
      { reference_id: "source-body:13:2:48", url: rejected },
      { reference_id: "vocabulary:excluded", url: rejected },
      { reference_id: "vocabulary:excluded", url: shared },
      { reference_id: "vocabulary:retained", url: shared },
    ];
    const result = getExcludedNativeSourceUrls(bindings, ["source-body:13:2:48", "vocabulary:excluded"]);
    expect(result).toEqual([rejected]);
    expect(result).not.toContain(shared);
    expect(result).not.toContain(unboundPassage);
  });

  it("holds exact graphic source coordinates even when their text is entirely Nahuatl", () => {
    for (const row of contentPolicy.learnerSourceBodyExclusions) {
      const id = `source-body:${row.lessonNumber}:${row.sectionIndex}:${row.bodyIndex}`;
      expect(policy.excluded_reference_ids, id).toContain(id);
      expect(GENERATED_AUDIO_INDEX.isHeld(id), id).toBe(true);
      expect(resolvePracticeRecording({ referenceId: id, text: "stale source text", url: published.source_asset_urls[0] }).url).toBeNull();
      expect(sourceBrowserLineAudio("stale source text", id)).toBeNull();
    }
  });

  it("does not advertise excluded native URLs as downloads or source-page media", () => {
    for (const url of policy.excluded_source_urls) {
      expect(published.source_asset_urls, url).not.toContain(url);
      expect(GENERATED_AUDIO_INDEX.hasSourceUrl(url), url).toBe(false);
      expect(published.source_bindings.some(binding => binding.url === url), url).toBe(false);
      expect(published.lesson_assets.some(group => group.source_urls.includes(url)), url).toBe(false);
      expect(NAHUATLAHTOLLI_COURSE.lessons.some(lesson => lesson.mediaLinks.some(link => link.url === url)), url).toBe(false);
      expect(NAHUATLAHTOLLI_COURSE.supportPages.some(page => page.mediaLinks.some(link => link.url === url)), url).toBe(false);
      for (const referenceId of [undefined, "unknown-old-pack-reference"])
        expect(resolvePracticeRecording({ referenceId, text: "unregistered old text", url }).url, url).toBeNull();
      expect(vocabCardAudioUrl(123456789, url, "unregistered old text"), url).toBeNull();
      expect(resolvePracticeRecording({ text: "unregistered old text", url: url + "?revision=old#clip" }).url, url).toBeNull();
    }
  });
});
