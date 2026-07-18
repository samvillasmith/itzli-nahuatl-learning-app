import { describe, expect, it } from "vitest";
import {
  htmlLang,
  localeFromPathname,
  localizedPathname,
  normalizeLocale,
  stripLocalePrefix,
} from "../src/i18n/config";
import { tr, translateDeep } from "../src/i18n/translate";
import spanishCatalog from "../src/i18n/es.generated.json";
import spanishOverrides from "../src/i18n/es.overrides.json";
import { SOURCE_VOCAB_PROMOTIONS } from "../src/data/source-vocab-promotions";
import { getSystemPrompt, refusalForLocale } from "../src/lib/chat-system-prompt";

describe("English and Mexican Spanish localization", () => {
  it("normalizes the persisted locale and document language", () => {
    expect(normalizeLocale(undefined)).toBe("es");
    expect(normalizeLocale("es-MX")).toBe("es");
    expect(normalizeLocale("en-US")).toBe("en");
    expect(htmlLang("es")).toBe("es-MX");
  });

  it("makes Spanish the default while keeping stable English URLs", () => {
    expect(localeFromPathname("/curriculum")).toBe("es");
    expect(localeFromPathname("/en/curriculum")).toBe("en");
    expect(stripLocalePrefix("/es/units/7")).toBe("/units/7");
    expect(stripLocalePrefix("/en/units/7")).toBe("/units/7");
    expect(localizedPathname("/units/7", "es")).toBe("/units/7");
    expect(localizedPathname("/units/7", "en")).toBe("/en/units/7");
    expect(localizedPathname("/es/units/7", "en")).toBe("/en/units/7");
    expect(localizedPathname("/", "es")).toBe("/");
  });

  it("translates interface text without changing Nahuatl or unknown text", () => {
    expect(tr("es", "Grammar")).toBe("Gramática");
    expect(tr("en", "Grammar")).toBe("Grammar");
    expect(tr("es", "Piyali")).toBe("Piyali");
    expect(tr("es", "not-in-the-catalog")).toBe("not-in-the-catalog");
  });

  it("preserves structural identifiers and Nahuatl fields in localized data", () => {
    const source = {
      id: "grammar-1",
      slug: "basic-grammar",
      kind: "lesson",
      headword: "piyali",
      nahuatl: "Tlaskamati.",
      title: "Grammar",
    };

    expect(translateDeep("es", source)).toEqual({
      ...source,
      title: "Gramática",
    });
  });

  it("makes tutor explanations and refusals follow the selected language", () => {
    expect(refusalForLocale("es")).toContain("solo puedo ayudar");
    expect(getSystemPrompt("practice", "es")).toContain("OUTPUT LANGUAGE: MEXICAN SPANISH");
    expect(getSystemPrompt("practice", "es")).toContain("translation lines MUST be in natural Mexican Spanish");
  });

  it("covers every promoted source gloss in the Spanish catalog", () => {
    const catalog: Record<string, string> = { ...spanishCatalog, ...spanishOverrides };
    for (const entry of SOURCE_VOCAB_PROMOTIONS) {
      expect(Object.hasOwn(catalog, entry.gloss_en), `${entry.entry_id}: ${entry.gloss_en}`).toBe(true);
    }
  });
});
