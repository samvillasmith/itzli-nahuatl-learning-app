import { describe, expect, it } from "vitest";
import {
  htmlLang,
  localeFromPathname,
  localizedPathname,
  normalizeLocale,
  stripLocalePrefix,
} from "../src/i18n/config";
import { tr, translateDeep } from "../src/i18n/translate";
import { getSystemPrompt, refusalForLocale } from "../src/lib/chat-system-prompt";

describe("English and Mexican Spanish localization", () => {
  it("normalizes the persisted locale and document language", () => {
    expect(normalizeLocale("es-MX")).toBe("es");
    expect(normalizeLocale("en-US")).toBe("en");
    expect(htmlLang("es")).toBe("es-MX");
  });

  it("gives Spanish pages stable crawlable URLs", () => {
    expect(localeFromPathname("/es/curriculum")).toBe("es");
    expect(localeFromPathname("/curriculum")).toBe("en");
    expect(stripLocalePrefix("/es/units/7")).toBe("/units/7");
    expect(localizedPathname("/units/7", "es")).toBe("/es/units/7");
    expect(localizedPathname("/es/units/7", "en")).toBe("/units/7");
    expect(localizedPathname("/", "es")).toBe("/es");
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
});
