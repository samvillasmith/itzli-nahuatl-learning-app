import { describe, expect, it } from "vitest";
import { CULTURE_MODULES, CULTURE_TIMELINE } from "@/data/culture-lessons";

describe("culture and history track", () => {
  it("provides a complete, ordered five-module track", () => {
    expect(CULTURE_MODULES).toHaveLength(5);
    expect(CULTURE_MODULES.map((module) => module.number)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(CULTURE_MODULES.map((module) => module.slug)).size).toBe(5);
    expect(CULTURE_TIMELINE.length).toBeGreaterThanOrEqual(5);
  });

  it("keeps every module substantive and sourced", () => {
    for (const cultureModule of CULTURE_MODULES) {
      expect(cultureModule.sections.length).toBeGreaterThanOrEqual(4);
      expect(cultureModule.takeaways.length).toBeGreaterThanOrEqual(3);
      expect(cultureModule.sources.length).toBeGreaterThanOrEqual(3);
      expect(cultureModule.sources.every((source) => source.url.startsWith("https://"))).toBe(true);
    }
  });

  it("states the course's central historical and linguistic distinctions", () => {
    const fullText = JSON.stringify(CULTURE_MODULES);

    expect(fullText).toContain("Nahua is broader than Mexica");
    expect(fullText).toContain("Classical Nahuatl");
    expect(fullText).toContain("Eastern Huasteca Nahuatl");
    expect(fullText).toContain("Huasteca Nahua and Teenek or Huastec are not synonyms");
  });

  it("uses only explicitly public-domain embedded collection images", () => {
    const images = CULTURE_MODULES.flatMap((module) => module.image ?? []);

    expect(images.length).toBeGreaterThan(0);
    expect(images.every((image) => image.license.includes("Public Domain"))).toBe(true);
    expect(new Set(images.map((image) => image.src)).size).toBe(images.length);
  });
});
