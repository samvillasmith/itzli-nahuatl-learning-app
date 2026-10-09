import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { getConversationScenarios, renderSentenceTemplate } from "../src/data/conversation-scenarios";
import { conversationReplyActivityId, getConversationReplyCards, matchesConversationReply } from "../src/lib/conversation-recall";

describe("conversation reply identity and recall", () => {
  it("tracks every valid branch separately and never schedules repetition as an answer", () => {
    const scenarios = getConversationScenarios();
    const cards = getConversationReplyCards(scenarios);
    const expected = scenarios.flatMap((scenario) => scenario.turns.flatMap((turn) => turn.options.filter((option) => option.correct && option.intent !== "repeat")));
    expect(cards).toHaveLength(expected.length);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    expect(cards.some((card) => card.nahuatl === "Zampa xiquihto")).toBe(false);
    const plans = scenarios.find((scenario) => scenario.id === "daily-plans")!;
    const turn = plans.turns.find((item) => item.id === "plan")!;
    const work = turn.options.find((option) => option.id === "plan-work")!;
    const study = turn.options.find((option) => option.id === "plan-study")!;
    const repeat = turn.options.find((option) => option.intent === "repeat")!;
    expect(conversationReplyActivityId(plans.id, turn.id, work)).not.toBe(conversationReplyActivityId(plans.id, turn.id, study));
    expect(conversationReplyActivityId(plans.id, turn.id, repeat)).toBeNull();
    expect(matchesConversationReply(work, "nitequitiz.")).toBe(true);
    expect(matchesConversationReply(work, study.nahuatl)).toBe(false);
    expect(matchesConversationReply(study, work.nahuatl)).toBe(false);
    expect(matchesConversationReply(repeat, repeat.nahuatl)).toBe(false);
  });
});

describe("personal sentence recall", () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("hashes the exact personal sentence into a stable ID without sending its name in the key", async () => {
    const { personalExpressionActivityId } = await import("../src/lib/expression-notebook");
    const sentence = renderSentenceTemplate("my-name", { name: "María Elena" })!;
    const id = await personalExpressionActivityId("my-name", sentence.nahuatl);
    expect(id).toMatch(/^sentence:my-name:personal:[a-f0-9]{64}$/);
    expect(id).not.toContain("María");
    expect(await personalExpressionActivityId("my-name", sentence.nahuatl)).toBe(id);
    expect(await personalExpressionActivityId("my-name", "Na notōcah Juana.")).not.toBe(id);
  });

  it("resolves due recall to the saved personal sentence and keeps source example audio out", async () => {
    const { setProgressAccount } = await import("../src/lib/progress-storage");
    const { loadExpressions, saveExpression, personalExpressionActivityId, personalExpressionReviewCards } = await import("../src/lib/expression-notebook");
    const { recordAttempt, getDueReviews } = await import("../src/lib/learning-state");
    setProgressAccount("learner-a");
    const personal = renderSentenceTemplate("my-origin", { place: "San Luis Potosí" })!;
    const id = await personalExpressionActivityId("my-origin", personal.nahuatl);
    saveExpression({ id, nahuatl: personal.nahuatl, english: personal.en, spanish: personal.es,
      sourceUrl: getConversationScenarios()[0].sources[0].url });
    recordAttempt(id, "production", true);
    const due = getDueReviews(Date.now() + 2 * 86400000);
    const catalog = personalExpressionReviewCards(loadExpressions());
    const card = catalog.find((entry) => entry.id === due[0].activityId)!;
    expect(card.nahuatl).toBe("Na niēhua San Luis Potosí.");
    expect(card.english).toBe("I am from San Luis Potosí.");
    expect(card.audioUrl).toBeNull();
    setProgressAccount("learner-b");
    expect(loadExpressions()).toEqual([]);
    expect(getDueReviews(Date.now() + 2 * 86400000)).toEqual([]);
    setProgressAccount("learner-a");
    expect(loadExpressions()[0].id).toBe(id);
  });
});
