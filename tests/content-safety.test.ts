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

  it("separates neutral identity definitions from explicit sexual roles and acts", () => {
    expect(isAppContentExcluded("ordinary", "a gay man")).toBe(false);
    expect(isAppContentExcluded("ordinary", "a lesbian")).toBe(false);
    expect(isAppContentExcluded("ordinary", "male homosexuality")).toBe(false);
    expect(isAppContentExcluded("ordinary", "a passive partner in sex; a bottom")).toBe(true);
    expect(isAppContentExcluded("ordinary", "same-sex relationship")).toBe(false);
    expect(isAppContentExcluded("ordinary", "to have lesbian sex with")).toBe(true);
    expect(isAppContentExcluded("ordinary", "to have heterosexual sex with")).toBe(true);
    expect(isAppContentExcluded("ordinary", "to be a bottom as a gay person")).toBe(true);
    expect(isAppContentExcluded("ordinary", "gender identity; transgender person; intersex person")).toBe(false);
  });

  it("does not confuse unrelated words with orientation or sexual roles", () => {
    expect(isAppContentExcluded("pilocelotl", "margay")).toBe(false);
    expect(isAppContentExcluded("ordinary", "bottom line")).toBe(false);
    expect(isAppContentExcluded("ordinary", "top of the hill")).toBe(false);
  });

  it("does not split a Nahuatl word into blocked English tokens at a macron", () => {
    expect(isAppContentExcluded("¿Huan ta, ticnequi titēmachtia?", "Do you want to teach people?")).toBe(false);
    expect(isAppContentExcluded("titēmachtia", "explicit sexual content")).toBe(true);
    expect(isAppContentExcluded("ordinary", "tit")).toBe(true);
  });

  it("allows reviewed teaching text and source spellings without approving images", () => {
    expect(isAppContentExcluded("mokwitlawia", "mocuitlahuiā", "look after someone")).toBe(false);
    expect(isAppContentExcluded("chichiwalli", "chīchīhualli", "breast; teat")).toBe(false);
    expect(isAppContentExcluded("teka", "tēca", "pour a liquid")).toBe(false);
    expect(isAppContentExcluded("nechkokoa noihti", "my stomach hurts")).toBe(false);
    expect(isImageCardExcluded("nechkokoa noihti", "my stomach hurts")).toBe(true);
    expect(isAppContentExcluded("maltia", "bathe", "explicit sexual content")).toBe(true);
    expect(isAppContentExcluded("maltia", "nude child bathing")).toBe(true);
    expect(isAppContentExcluded("tsintenno", "tzīntēnno", "buttocks (possessed location reference); separate rear-projection meaning excluded")).toBe(false);
    expect(isAppContentExcluded("tsintenno", "explicit sexual content")).toBe(true);
    expect(isImageCardExcluded("tsintenno", "buttocks (possessed location reference)")).toBe(true);
    expect(isAppContentExcluded("notsintlan", "at my base; anatomical buttocks use remains unverified")).toBe(false);
    expect(isAppContentExcluded("notsintlan", "explicit sexual content")).toBe(true);
    expect(isImageCardExcluded("notsintlan", "buttocks")).toBe(true);
    expect(isAppContentExcluded("xillantli", "vagina (possessed noun reference)")).toBe(true);
    expect(isAppContentExcluded("xillantli", "explicit sexual content")).toBe(true);
    expect(isImageCardExcluded("xillantli", "vagina")).toBe(true);
    expect(isAppContentExcluded("alaxiwi", "slide across a wet surface")).toBe(false);
    expect(isAppContentExcluded("awiltia", "rape; recognition of sexual violence")).toBe(true);
    expect(isAppContentExcluded("awiltia", "explicit sexual content")).toBe(true);
    expect(isAppContentExcluded("awiltia", "nude child")).toBe(true);
    expect(isImageCardExcluded("awiltia", "rape; sexual violence")).toBe(true);
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
    // Educational meaning stays available; an ambiguous anatomical image needs
    // a new exact depiction review and cannot waive the hard image category.
    expect(isAppContentExcluded("ehuatl", "skin (of humans, animals, fruit)")).toBe(false);
    expect(getWordImage("ehuatl", { safetyText: ["skin (of humans, animals, fruit)"] })).toBeNull();
    expect(getWordImage("ehuatl", { safetyText: ["skin exposed while bathing"] })).toBeNull();
  });

  it("allows only the reviewed object-only image for having a child", () => {
    expect(getWordImage("conepiya", { safetyText: ["to have a child", "verb"] })?.url).toContain(
      "/conepiya-211.png",
    );
    expect(getWordImage("conepiya", { safetyText: ["child bathing"] })).toBeNull();
    expect(getWordImage("conepiya", { safetyText: ["nude child"] })).toBeNull();
  });
});
