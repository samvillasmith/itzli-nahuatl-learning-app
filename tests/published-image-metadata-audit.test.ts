import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { classify, loadBlocklist, loadReviewedAllowlist } = require("../scripts/audit-openai-word-images.js");
const manifest = JSON.parse(readFileSync(new URL("../src/data/openai-word-images.json", import.meta.url), "utf8")) as Record<string, Record<string, unknown>>;
const blocklist = loadBlocklist(), reviewed = loadReviewedAllowlist();
const clone = (key: string) => structuredClone(manifest[key]);

describe("published image metadata retains exact approved meanings", () => {
  it.each(["core-808016", "core-808024", "core-904003"])("accepts the exact reviewed adult or botanical scene for %s", key => {
    expect(classify(key, manifest[key], blocklist, reviewed)).toBeNull();
  });

  it.each(["core-808016", "core-808024"])("requires matching source, meaning, composition and published review for %s", key => {
    for (const field of ["meaning_en", "reviewed_url", "review_scope"]) {
      const entry = clone(key); entry[field] = "changed";
      expect(classify(key, entry, blocklist, reviewed)?.category).toBe("anatomy-card-risk");
    }
    for (const field of ["lexical_review_hash", "composition_sha256"]) {
      const entry = clone(key); (entry.provenance as Record<string, unknown>)[field] = "changed";
      expect(classify(key, entry, blocklist, reviewed)?.category).toBe("anatomy-card-risk");
    }
    const entry = clone(key), evidence = (entry.provenance as Record<string, unknown>).reviewed_image_mode_evidence as Record<string, unknown>;
    evidence.source_import_sha256 = "changed";
    expect(classify(key, entry, blocklist, reviewed)?.category).toBe("anatomy-card-risk");
    expect(classify("core-unrelated", manifest[key], blocklist, reviewed)?.category).toBe("anatomy-card-risk");
  });

  it.each(["unclothed person", "child bathing", "sexual activity", "blood and gore", "urination"])("keeps prohibited metadata %s blocked despite an approved eye", text => {
    const entry = clone("core-808016"); entry.alt = text;
    expect(classify("core-808016", entry, blocklist, reviewed)).not.toBeNull();
  });

  it.each(["contains_minor_or_childlike_person", "contains_nudity_or_ambiguous_covered_body_exposure", "contains_compromising_medical_or_care_context"])("rejects an adult scene with unsafe review field %s", field => {
    const entry = clone("core-808016"); (entry.automated_safety_review as Record<string, unknown>)[field] = true;
    expect(classify("core-808016", entry, blocklist, reviewed)?.category).toBe("anatomy-card-risk");
  });

  it("distinguishes botanical palm trees from a separate human palm or hand", () => {
    const entry = clone("core-904003"); entry.title = "A human palm of the hand";
    expect(classify("core-904003", entry, blocklist, reviewed)?.category).toBe("anatomy-card-risk");
    entry.title = "A palm tree beside another palm tree";
    expect(classify("core-904003", entry, blocklist, reviewed)).toBeNull();
    entry.meaning_en = "palm of my hand";
    expect(classify("core-904003", entry, blocklist, reviewed)?.category).toBe("anatomy-card-risk");
  });

  it("requires no people and the reviewed botanical composition for the palm tree exception", () => {
    const entry = clone("core-904003"); (entry.automated_safety_review as Record<string, unknown>).contains_people = true;
    expect(classify("core-904003", entry, blocklist, reviewed)?.category).toBe("anatomy-card-risk");
    const changed = clone("core-904003"); (changed.provenance as Record<string, unknown>).composition_sha256 = "changed";
    expect(classify("core-904003", changed, blocklist, reviewed)?.category).toBe("anatomy-card-risk");
  });
});
