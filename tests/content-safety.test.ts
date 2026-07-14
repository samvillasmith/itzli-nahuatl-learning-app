import { describe, expect, it } from "vitest";
import { isAppContentExcluded } from "../src/lib/app-content-safety";
import { getWordImage } from "../src/data/word-images";
import {
  isApprovedPublishedImageCardExcluded,
  isImageCardExcluded,
} from "../src/lib/image-card-safety";

describe("strict content safety", () => {
  it("never lets a reviewed headword bypass a blocked gloss", () => {
    expect(isImageCardExcluded("tototl", "explicit nude body")).toBe(true);
  });

  it("blocks excluded app content independently of image review", () => {
    expect(isAppContentExcluded("ordinary headword", "explicit sexual content")).toBe(true);
    expect(isAppContentExcluded("ordinary headword", "to urinate")).toBe(true);
    expect(isAppContentExcluded("ordinary headword", "taking a bath")).toBe(true);
    expect(isAppContentExcluded("ordinary headword", "shitting")).toBe(true);
    expect(isAppContentExcluded("ehuatl", "skin exposed while bathing")).toBe(true);
    expect(isAppContentExcluded("ehuatl", "skin (of humans, animals, fruit)")).toBe(false);
  });

  it("keeps ordinary object cards eligible", () => {
    expect(isImageCardExcluded("metztli", "moon", "noun")).toBe(false);
  });

  it("rejects all minors except the reviewed swaddled-baby card", () => {
    expect(isImageCardExcluded("ordinary", "a child outdoors")).toBe(true);
    expect(isImageCardExcluded("conētzin", "baby")).toBe(false);
    expect(isImageCardExcluded("conētzin", "baby with exposed body")).toBe(true);
  });

  it("keeps hard exposure and body-waste rules after exact pixel review", () => {
    const approved = ["child"];
    expect(isApprovedPublishedImageCardExcluded(approved, "conētl", "child")).toBe(false);
    expect(isApprovedPublishedImageCardExcluded(approved, "conētl", "child bathing")).toBe(true);
    expect(isApprovedPublishedImageCardExcluded(approved, "conētl", "child shitting")).toBe(true);
    expect(isApprovedPublishedImageCardExcluded(approved, "conētl", "nude child")).toBe(true);
  });

  it("publishes only the exact reviewed image when the live card text stays safe", () => {
    expect(getWordImage("conētl", { safetyText: ["child"] })?.url).toContain(
      "/conetl-source-8-36.png",
    );
    expect(getWordImage("conētl", { safetyText: ["child bathing"] })).toBeNull();
    expect(getWordImage("conētl", { safetyText: ["child shitting"] })).toBeNull();
    expect(getWordImage("ehuatl", { safetyText: ["skin (of humans, animals, fruit)"] })).not.toBeNull();
    expect(getWordImage("ehuatl", { safetyText: ["skin exposed while bathing"] })).toBeNull();
  });
});
