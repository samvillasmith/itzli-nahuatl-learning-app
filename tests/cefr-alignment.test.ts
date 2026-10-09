import { describe, expect, it } from "vitest";
import { getUnifiedCoursePath } from "@/lib/unified-course-path";
import { CEFR_SCALES, getCourseCefrAlignment } from "@/lib/cefr-alignment";
import { getInstructionalLessonSummary } from "@/lib/instructional-lessons";

describe("CEFR task alignment", () => {
  const path = getUnifiedCoursePath();
  const alignment = getCourseCefrAlignment(path);
  it("maps every stable lesson without replacing the existing path or progress identity", () => {
    expect(alignment.map(item => item.lessonNumber)).toEqual(path.map(item => item.lessonNumber));
    expect(alignment.map(item => item.progressId)).toEqual(path.map(item => item.progressId));
    for (const item of alignment) {
      expect(item.canDo.en).toContain("With the lesson's support:");
      expect(item.canDo.es).toContain("Con el apoyo de la lección:");
      expect(item.scaleIds.length).toBeGreaterThan(0);
      for (const scale of item.scaleIds) expect(CEFR_SCALES[scale].pages).toBeTruthy();
      expect(item.framework.author).toBe("Council of Europe");
    }
  });
  it("does not award a conversation skill to an unfinished word-only cohort", () => {
    for (const lesson of path.filter(item => item.kind === "vocabulary")) {
      const item = alignment.find(candidate => candidate.lessonNumber === lesson.lessonNumber)!;
      const summary = getInstructionalLessonSummary(lesson.progressId);
      if (!summary) {
        expect(item.practice).toBe("foundation");
        expect(item.evidence.conversationTurns).toBe(0);
        expect(item.assessmentLimit.en).toContain("does not yet assess conversation");
      } else if (summary.coverage?.pendingEntryIds.length) expect(item.practice).toBe("partial-context");
    }
  });
  it("keeps B1-oriented task extensions and pronunciation certification separate", () => {
    const hypothetical = alignment.find(item => item.progressId === "v3-mechanic-imagined-past")!;
    expect(hypothetical.targetBand).toBe("B1");
    expect(hypothetical.label.en).toBe("B1-oriented extension");
    expect(hypothetical.assessmentLimit.en).toContain("not certified");
    expect(hypothetical.evidence.sentenceBuilders).toBeGreaterThan(0);
    expect(hypothetical.evidence.conversationTurns).toBeGreaterThan(0);
  });
});
