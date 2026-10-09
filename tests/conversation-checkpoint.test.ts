import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getConversationScenario } from "../src/data/conversation-scenarios";

describe("device-local conversation checkpoints", () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("resumes a selected reply and stage without storing typed answers or microphone data", async () => {
    const helper = await import("../src/lib/conversation-checkpoint");
    const scenario = getConversationScenario("daily-plans")!;
    expect(helper.saveConversationCheckpoint(scenario, { turnId: "plan", phase: "speak", selectedOptionId: "plan-study", history: [] })).toBe(true);
    const restored = helper.loadConversationCheckpoint(scenario)!;
    expect(restored).toMatchObject({ turnId: "plan", phase: "speak", selectedOptionId: "plan-study", selectedReplyText: "Nimomachtiz" });
    expect(Object.keys(restored)).not.toContain("answer");
    expect(Object.keys(restored)).not.toContain("recording");
    expect(restored.contentRevision).toBe(helper.CONVERSATION_CONTENT_REVISION);
  });

  it("preserves the chosen branch and derives bilingual history from source IDs", async () => {
    const helper = await import("../src/lib/conversation-checkpoint");
    const scenario = getConversationScenario("family")!;
    const history = [{ turnId: "mother", optionId: "my-mother" }, { turnId: "sister", optionId: "my-older-sister" }, { turnId: "count", optionId: "siblings-two" }];
    expect(helper.saveConversationCheckpoint(scenario, { turnId: "two", phase: "choose", selectedOptionId: null, history })).toBe(true);
    const restored = helper.loadConversationCheckpoint(scenario)!;
    const pairs = helper.conversationCheckpointHistory(scenario, restored.history, "es");
    expect(pairs[pairs.length - 1]).toMatchObject({ nahuatl: "ōme", translation: "dos", speaker: "Tú" });
    expect(helper.saveConversationCheckpoint(scenario, { turnId: "one", phase: "choose", selectedOptionId: null, history })).toBe(false);
    expect(helper.loadConversationCheckpoint(scenario)?.turnId).toBe("two");
  });

  it("isolates checkpoints by account and restart clears only the selected scenario", async () => {
    const { setProgressAccount } = await import("../src/lib/progress-storage");
    const helper = await import("../src/lib/conversation-checkpoint");
    const first = getConversationScenario("introductions")!;
    const second = getConversationScenario("daily-plans")!;
    setProgressAccount("a");
    helper.saveConversationCheckpoint(first, { turnId: "name", phase: "recall", selectedOptionId: "name-juana", history: [] });
    helper.saveConversationCheckpoint(second, { turnId: "plan", phase: "choose", selectedOptionId: null, history: [] });
    setProgressAccount("b");
    expect(helper.loadConversationCheckpoint(first)).toBeNull();
    helper.clearConversationCheckpoint(first.id);
    setProgressAccount("a");
    expect(helper.loadConversationCheckpoint(first)?.phase).toBe("recall");
    helper.clearConversationCheckpoint(first.id);
    expect(helper.loadConversationCheckpoint(first)).toBeNull();
    expect(helper.loadConversationCheckpoint(second)).not.toBeNull();
  });

  it("rejects invalid IDs, repeated requests, old revisions, and changed source phrases", async () => {
    const helper = await import("../src/lib/conversation-checkpoint");
    const scenario = getConversationScenario("introductions")!;
    helper.saveConversationCheckpoint(scenario, { turnId: "name", phase: "recall", selectedOptionId: "name-juana", history: [] });
    const valid = helper.loadConversationCheckpoint(scenario)!;
    expect(helper.parseConversationCheckpoint({ ...valid, turnId: "missing" }, scenario)).toBeNull();
    expect(helper.parseConversationCheckpoint({ ...valid, selectedOptionId: "name-repeat" }, scenario)).toBeNull();
    expect(helper.parseConversationCheckpoint({ ...valid, selectedOptionId: "name-location" }, scenario)).toBeNull();
    expect(helper.parseConversationCheckpoint({ ...valid, contentRevision: "old" }, scenario)).toBeNull();
    expect(helper.parseConversationCheckpoint({ ...valid, selectedReplyText: "invented" }, scenario)).toBeNull();
    expect(helper.parseConversationCheckpoint({ ...valid, turnText: "changed source" }, scenario)).toBeNull();
  });

  it("a corrupted checkpoint resets independently of earned learning records", async () => {
    const storage = await import("../src/lib/progress-storage");
    const helper = await import("../src/lib/conversation-checkpoint");
    const learning = await import("../src/lib/learning-state");
    const scenario = getConversationScenario("introductions")!;
    learning.recordAttempt("turn:introductions:name:name-juana", "production", true);
    learning.markActivityCompleted("scenario:introductions");
    const earned = learning.loadLearningState();
    storage.writeScopedStorage("itzli_conversation_checkpoint_v3:introductions", "{invalid-json");
    expect(helper.loadConversationCheckpoint(scenario)).toBeNull();
    expect(storage.readScopedStorage("itzli_conversation_checkpoint_v3:introductions")).toBeNull();
    expect(learning.loadLearningState()).toEqual(earned);
  });
});
