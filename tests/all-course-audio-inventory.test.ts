import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { compileAudioInventory, canonicalJobId, SETTINGS, EXPECTED_RECIPE, buildAllCourseAudioInventory } =
  require("../scripts/lib/all-course-audio-inventory.cjs");

function record(id: string, text: string, more: Record<string, unknown> = {}) {
  return { id, kind: "expression", runtime_text: text, synthesis_text: text,
    existing_audio_url: null, units: [1], contexts: [], hold_reasons: [], ...more };
}

describe("all-course synthetic replacement inventory", () => {
  it("preserves external originals ahead of project audio without collapsing statement/question recordings", () => {
    const source = "https://tlahtolli.coerll.utexas.edu/wp-content/uploads/exact.mp3";
    const plan = compileAudioInventory([
      record("own-word", "Xochitl", { existing_audio_url: "/audio-google/vocab/99.wav" }),
      record("native-word", "xochitl", { existing_audio_url: source }),
      record("question", "Xochitl?", { existing_audio_url: "/old-question.wav" }),
    ]);
    expect(plan.records[0].status).toBe("preserve-external-recording");
    expect(plan.records[0].existing_audio_url).toBe(source);
    expect(plan.records[2].status).toBe("replace-project-synthetic");
    expect(plan.jobs).toHaveLength(1);
    expect(plan.jobs[0].runtime_texts).toContain("Xochitl?");
    expect(plan.source_bindings).toContainEqual({ reference_id: "own-word", runtime_text: "Xochitl", url: source });
  });

  it("keeps a held context blocked even when another approved context synthesizes the same text", () => {
    const plan = compileAudioInventory([
      record("correct-context", "Tlan"),
      record("held-context", "Tlan", { content_accuracy_hold: true, hold_reasons: ["The supplied meaning is not verified."] }),
    ]);
    expect(plan.jobs).toHaveLength(1);
    expect(plan.jobs[0].reference_ids).toEqual(["correct-context"]);
    expect(plan.records[1].job_id).toBeNull();
    expect(plan.held_reference_ids).toEqual(["held-context"]);
  });

  it("deduplicates exact requests and changes identities when the voice/rate/recipe changes", () => {
    const inputs = [record("one", "Atl."), record("two", "Atl.", { units: [2], contexts: ["grammar:test"] })];
    const plan = compileAudioInventory(inputs);
    expect(plan.jobs).toHaveLength(1);
    expect(plan.jobs[0].reference_ids).toEqual(["one", "two"]);
    expect(plan.jobs[0].job_id).toBe(canonicalJobId(EXPECTED_RECIPE, SETTINGS, plan.jobs[0].ssml));
    const slower = compileAudioInventory(inputs, { settings: { ...SETTINGS, speakingRate: 0.7 } });
    expect(slower.jobs[0].job_id).not.toBe(plan.jobs[0].job_id);
    expect(slower.jobs[0].ssml_sha256).toBe(plan.jobs[0].ssml_sha256);
    const changedRecipe = compileAudioInventory(inputs, { recipeId: "future-reviewed-recipe" });
    expect(changedRecipe.jobs[0].job_id).not.toBe(plan.jobs[0].job_id);
    expect(plan.lesson_assets.find((group: { id: string }) => group.id === "unit:2")?.asset_ids).toEqual([plan.jobs[0].job_id]);
  });

  it("reports oversized requests without silently dropping their fixed reference or calling them accuracy failures", () => {
    const plan = compileAudioInventory([record("long-fixed-model", "Atl.")], {
      buildSsml: () => `<speak>${"ā".repeat(2600)}</speak>`,
    });
    expect(plan.records).toHaveLength(1);
    expect(plan.records[0].hold_reasons.join(" ")).toContain("reviewed segmentation");
    expect(plan.jobs).toHaveLength(0);
    expect(plan.held_reference_ids).toEqual([]);
  });

  it("covers actual current course models, all conversation gaps and every stable unit group without English task narration", () => {
    const instructional = JSON.parse(readFileSync(new URL("../src/data/instructional-lesson-blueprints.json", import.meta.url), "utf8"));
    const original = JSON.parse(readFileSync(new URL("../src/data/v3-original-course.json", import.meta.url), "utf8"));
    const plan = buildAllCourseAudioInventory();
    const byId = new Map(plan.records.map((row: { id: string }) => [row.id, row]));
    for (const phrase of [...original.phrases, ...instructional.supplementPhrases]) expect(byId.has(`phrase:${phrase.id}`)).toBe(true);
    for (const lesson of instructional.lessons) for (const dialogue of lesson.blueprint.dialogues) for (const turn of dialogue.turns)
      for (const gap of turn.gaps) expect(byId.has(`dialogue-gap:${lesson.unitId}:${dialogue.id}:${turn.id}:${gap.id}`)).toBe(true);
    expect(plan.lesson_assets.filter((group: { id: string }) => group.id.startsWith("unit:"))).toHaveLength(324);
    const learnerExcluded = new Set(plan.learner_audio_eligibility.excluded_reference_ids);
    expect(plan.held_reference_ids.length).toBeGreaterThan(0);
    for (const row of plan.records) if (learnerExcluded.has(row.id)) {
      expect(row.generation_allowed, row.id).toBe(false);
      expect(row.status, row.id).toBe("content-accuracy-hold");
      expect(row.job_id, row.id).toBeNull();
    }
    const song = byId.get("core-vocab:680") as { runtime_text: string; synthesis_text: string; runtime_aliases: string[]; generation_allowed: boolean; legacy_recording_hold: boolean; units: number[]; source_refs: { source_url: string; verse_text_reused: boolean }[] };
    expect(song.runtime_text).toBe("wikatl");
    expect(song.synthesis_text).toBe("huicatl");
    expect(song.units).toEqual([31]);
    expect(song.runtime_aliases).toEqual(["wikatl", "huicatl"]);
    expect(song.generation_allowed).toBe(true);
    expect(song.legacy_recording_hold).toBe(true);
    expect(song.source_refs[0].source_url).toBe("https://ebible.org/nheNT/MAT11.htm#V17");
    expect(song.source_refs.every(source => source.verse_text_reused === false)).toBe(true);
    expect(byId.has("grammar-answer:family-possession:0:0")).toBe(false);
    expect(byId.has("grammar-input:name-exchange:0:1")).toBe(false);
    expect(byId.has("grammar-table:orthographic-systems:4:8:2")).toBe(false);
    const { loadTs } = require("../scripts/lib/course-audio-inputs.js");
    for (const topic of loadTs("src/data/grammar-lessons.ts").GRAMMAR_LESSONS)
      expect(byId.has(`grammar-title:${topic.id}`)).toBe(true);
    const market = byId.get("conversation:food-market:order:model") as { runtime_text: string; synthesis_text: string; generation_allowed: boolean };
    expect(market.runtime_text).toContain("15");
    expect(market.synthesis_text).not.toMatch(/\d/);
    expect(market.generation_allowed).toBe(true);
    expect(plan.records.filter((row: { status: string }) => row.status === "recipe-or-structure-hold")).toEqual([]);
  }, 30000);
});
