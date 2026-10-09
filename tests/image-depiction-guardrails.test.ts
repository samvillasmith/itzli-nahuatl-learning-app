import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import imageBlocklist from "../scripts/config/openai-word-image-blocklist.json";
import { isApprovedPublishedImageCardExcluded, isImageCardExcluded } from "../src/lib/image-card-safety";
import { isAppContentExcluded } from "../src/lib/app-content-safety";
const require = createRequire(import.meta.url);
const { hardImageDepictionReason, nonOverridableMetadataReason, assertImagePublicationGuard } = require("../scripts/lib/image-depiction-guardrails.js");

// Exercise the real planner/prompt/review functions without importing the
// generator entrypoint, environment loader, credentials or provider client.
const source = readFileSync(new URL("../scripts/generate-openai-word-images.js", import.meta.url), "utf8");
const ast = ts.createSourceFile("generator.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = new Set(["normalizeKey", "normalizeSafetyKey", "classifyBlocked", "classifyObjectOnly", "reviewedAllowlistEntry", "buildPrompt", "reviewGeneratedImage",
  "sourceQualifiedImageAliases", "qualifiedImageClassifierText", "allowsNeutralFirearmComposition", "approvedAdultVisualBrief", "approvedImageScene"]);
const context = vm.createContext({ Map, Set, JSON });
context.BATHING_CONCEPT_PATTERN = new RegExp(imageBlocklist.bathingConceptPattern, "iu");
vm.runInContext(ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name?.text || ""))
  .map(node => node.getText(ast)).join("\n"), context);
const blocklist = {
  blockedHeadwords: new Set(imageBlocklist.blockedHeadwords),
  nonOverridableCategories: new Set(imageBlocklist.nonOverridableCategories),
  nonOverridableHeadwords: new Set(imageBlocklist.nonOverridableHeadwords.map(context.normalizeSafetyKey)),
  nonOverridableDepictionRules: imageBlocklist.nonOverridableDepictionRules.map(rule => ({ category: rule.category, pattern: new RegExp(rule.pattern, "iu") })),
  rules: imageBlocklist.rules.map(rule => ({ category: rule.category, pattern: new RegExp(rule.pattern, "iu") })),
  bathingCompositionInstruction: imageBlocklist.bathingCompositionInstruction,
};
const forbiddenExposure = ["nude child", "exposed breasts", "exposed buttocks", "exposed genitals", "child bathing", "baby in a tub", "adult beside a shower",
  "a 12-year-old bathing", "12 year old bathing", "aged 12 bathing", "12-year-old in a tub", "childlike bathing", "underage bathing", "young-looking person bathing",
  "niña bañándose", "bebé con el cuerpo expuesto", "piel expuesta", "baby shirtless", "child topless", "baby in underwear", "child in bikini", "child bare-chested",
  "niña sin ropa", "bebé sin camisa", "empty tub with a reflection of a 12-year-old", "empty shower with human silhouette", "aged 12 in a tub", "unclothed person", "unclothed baby"];

type ReviewRequest = {
  instructions: string;
  input: Array<{ content: Array<{ type: string; text?: string }> }>;
  text: { format: { schema: { properties: Record<string, { type: string }>; required: string[] } } };
};

describe("non-overridable image depiction rules", () => {
  it.each(forbiddenExposure)("rejects %s even if every matching term was approved", phrase => {
    const approvedMatches = phrase.split(" ");
    expect(isImageCardExcluded("conētzin", phrase)).toBe(true);
    expect(isApprovedPublishedImageCardExcluded(approvedMatches, "conētzin", phrase)).toBe(true);
    expect(context.classifyBlocked({ headword: "conētzin", gloss: phrase }, blocklist).nonOverridable).toBe(true);
    expect(hardImageDepictionReason("conētzin", [phrase])).not.toBeNull();
    expect(() => assertImagePublicationGuard("conētzin", { alt: phrase, reviewed_safe_matches: approvedMatches, automated_safety_review: { pass: true } })).toThrow(/non-overridable image rule/);
  });

  it("keeps educational word approval separate from image permission", () => {
    expect(isAppContentExcluded("chichiwalli", "chīchīhualli", "breast; teat")).toBe(false);
    expect(isImageCardExcluded("chichiwalli", "breast; teat")).toBe(true);
    expect(isImageCardExcluded("maltia", "bathe")).toBe(true);
    expect(context.classifyBlocked({ headword: "maltia", gloss: "bathe" }, blocklist).nonOverridable).toBe(true);
  });

  it("checks every hard category before arbitrary reviewed wording can strip it", () => {
    expect(isApprovedPublishedImageCardExcluded(["baby", "exposed", "shoulder"], "conētzin", "baby with exposed shoulder")).toBe(true);
    expect(nonOverridableMetadataReason("conētzin", ["baby with exposed shoulder"], ["baby", "exposed", "shoulder"])).not.toBeNull();
    expect(isApprovedPublishedImageCardExcluded(["bath"], "ordinary", "take a bath")).toBe(true);
  });

  it.each(["chichiwalli", "chīchīhualli", "notsintamalli", "notzintamalli", "xillantli", "xīllāntli"])
    ("blocks sensitive anatomical alias %s even without its gloss", headword => {
      expect(isImageCardExcluded(headword)).toBe(true);
      expect(isApprovedPublishedImageCardExcluded([headword], headword)).toBe(true);
      expect(context.classifyBlocked({ headword }, blocklist).nonOverridable).toBe(true);
    });

  it("states the hard bathing composition after any conflicting exception request", () => {
    const item = { headword: "fixture", gloss: "empty shower" };
    const conflicting = { headword: item.headword, mode: "swaddled-child", instruction: "Show a child bathing." };
    const allowlist = { byHeadword: new Map([[item.headword, conflicting]]), babyExceptionInstruction: "A reviewed baby exception.", defaultNoChildrenInstruction: "No minors." };
    const prompt = context.buildPrompt(item, blocklist, allowlist) as string;
    expect(prompt).toContain("empty shower, empty tub, or appropriate empty body of water");
    expect(prompt).toContain("NO PEOPLE of any age");
    expect(prompt).toContain("Never depict any child in bathing, nudity, changing, or body exposure");
    expect(prompt.lastIndexOf("Non-overridable bathing rule")).toBeGreaterThan(prompt.indexOf(conflicting.instruction));
  });

  const review = async (changes: Record<string, unknown>) => {
    let request: ReviewRequest | undefined;
    const client = { responses: { create: async (body: ReviewRequest) => {
      request = body;
      const bools = Object.fromEntries(Object.entries(body.text.format.schema.properties)
        .filter(([,value]) => value.type === "boolean").map(([key]) => [key, false]));
      return { output_text: JSON.stringify({ ...bools, pass: true, contains_people: false,
        all_people_clearly_adult_25_plus_and_fully_clothed: true, matches_requested_concept_and_composition: true,
        reasons: [], ...changes }) };
    } } };
    const item = { headword: "fixture", gloss: "empty shower", reviewed: { mode: "swaddled-child", instruction: "Show a child bathing." } };
    const verdict = await context.reviewGeneratedImage(client, { visionReviewModel: "offline-mock", outputFormat: "png" }, item, "NO_IMAGE");
    if (!request) throw new Error("Mock visual review was not called.");
    return { verdict, request };
  };

  it("accepts only an empty fixture verdict with no people or exposure", async () => {
    const { request } = await review({});
    expect(request.input[0].content[0].text).toContain("Card-specific exceptions and educational-text approval cannot override");
    expect(request.text.format.schema.required).toContain("bathing_scene_contains_people");
    expect(request.text.format.schema.required).toContain("contains_exposed_genitals_breasts_or_buttocks");
  });

  it.each(["contains_minor_or_childlike_person", "bathing_scene_contains_people", "contains_exposed_genitals_breasts_or_buttocks"])
    ("rejects a purported passing exception when %s is true", async field => {
      await expect(review({ [field]: true })).rejects.toThrow(/failed strict vision review/);
    });

  it("fails closed when the new bathing verdict is missing", async () => {
    await expect(review({ bathing_scene_contains_people: undefined })).rejects.toThrow(/incomplete or invalid verdicts/);
  });

  it("rejects even clothed adults at a bathing fixture when the scene flag incorrectly says false", async () => {
    await expect(review({ contains_people: true, bathing_scene_contains_people: false })).rejects.toThrow(/people_in_bathing_concept/);
  });

  it("refuses manual publication of an old passing review missing hard verdicts", () => {
    expect(() => assertImagePublicationGuard("ordinary", { alt: "empty tub", automated_safety_review: { pass: true } })).toThrow(/explicit false verdicts/);
  });

  it("rejects a manually approved occupied bath even with negative exposure flags", () => {
    const verdict = { pass: true, contains_people: true, contains_minor_or_childlike_person: false,
      contains_nudity_or_ambiguous_covered_body_exposure: false, contains_exposed_genitals_breasts_or_buttocks: false,
      bathing_scene_contains_people: false, contains_bathing_showering_or_changing: false,
      contains_toilet_urination_defecation_or_body_waste: false, contains_sexual_or_suggestive_content: false,
      contains_person_in_bed_or_vulnerable_care_scene: false, contains_injury_blood_or_gore: false,
      contains_unapproved_text_letters_numbers_logo_or_watermark: false,
      all_people_clearly_adult_25_plus_and_fully_clothed: true, matches_requested_concept_and_composition: true };
    expect(() => assertImagePublicationGuard("fixture", { alt: "empty shower", automated_safety_review: verdict })).toThrow(/non-overridable image rule|no-people verdict/);
  });

  it.each(["missing people verdict", "ambiguous covered people", "wrong composition"])
    ("refuses manual publication with %s", async change => {
      const { verdict } = await review({});
      if (change === "missing people verdict") delete verdict.contains_people;
      if (change === "ambiguous covered people") {
        verdict.contains_people = true;
        verdict.all_people_clearly_adult_25_plus_and_fully_clothed = false;
      }
      if (change === "wrong composition") verdict.matches_requested_concept_and_composition = false;
      expect(() => assertImagePublicationGuard("ordinary", { alt: "ordinary card", automated_safety_review: verdict })).toThrow(/people\/clothing verdicts/);
    });
});
