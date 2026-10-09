import { describe, expect, it } from "vitest";
import { selectDueReviewCards } from "@/lib/reviewable-due";

describe("audio review eligibility", () => {
  it("retains text and speaking reviews, defers missing-audio listening, and restores it when audio arrives", () => {
    const cards = [{ id: "word:35", audioUrl: null }, { id: "word:source", audioUrl: "https://example.test/source.mp3" }];
    const due = [
      { activityId: "word:35", skill: "listening" as const },
      { activityId: "word:35", skill: "recognition" as const },
      { activityId: "word:35", skill: "production" as const },
      { activityId: "word:35", skill: "speaking" as const },
      { activityId: "word:source", skill: "listening" as const },
      { activityId: "retained:unknown", skill: "recognition" as const },
    ];
    const before = JSON.stringify(due);
    const selection = selectDueReviewCards(cards, due);
    expect(selection.waitingForAudio).toBe(1);
    expect(selection.available.map((item) => item.skill)).toEqual(["recognition", "production", "speaking", "listening"]);
    expect(selection.available.find((item) => item.skill === "listening")?.card.id).toBe("word:source");
    const restored = selectDueReviewCards([{ ...cards[0], audioUrl: "/reviewed-matching.wav" }, cards[1]], due);
    expect(restored.waitingForAudio).toBe(0);
    expect(restored.available[0]).toMatchObject({ card: { id: "word:35" }, skill: "listening" });
    expect(JSON.stringify(due)).toBe(before);
  });
});
