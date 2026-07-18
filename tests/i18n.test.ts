import { describe, expect, it } from "vitest";
import { htmlLang, normalizeLocale } from "../src/i18n/config";
import { tr, translateDeep } from "../src/i18n/translate";
import { getSystemPrompt, refusalForLocale } from "../src/lib/chat-system-prompt";

describe("English and Mexican Spanish localization", () => {
  it("normalizes the persisted locale and document language", () => {
    expect(normalizeLocale("es-MX")).toBe("es");
    expect(normalizeLocale("en-US")).toBe("en");
    expect(htmlLang("es")).toBe("es-MX");
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
