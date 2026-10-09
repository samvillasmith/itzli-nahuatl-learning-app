import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { getExpansionEntries } from "@/data/lexical-expansion";
import { getConversationScenarios, getSentencePatterns } from "@/data/conversation-scenarios";
import { buildNotebookExport, buildOfflineCoursePack } from "@/lib/course-export-notices";
import { displayedSourceLicense, COERLL_SOURCE_LICENSE_NOTICE } from "@/lib/source-license-notices";
import { toInaliOrthography } from "@/lib/orthography";

class OfflineNode {
  children: OfflineNode[] = [];
  value = ""; src = ""; href = ""; disabled = false; className = "";
  onclick?: () => void;
  onchange?: () => void;
  style: { cssText?: string } = {};
  private text = "";
  constructor(readonly tag: string) {}
  set textContent(value: string) { this.text = value; this.children = []; }
  get textContent(): string { return this.text + this.children.map(child => child.textContent).join(""); }
  append(...children: OfflineNode[]) { this.children.push(...children); }
  prepend(...children: OfflineNode[]) { this.children.unshift(...children); }
  replaceChildren(...children: OfflineNode[]) { this.text = ""; this.children = children; }
  setAttribute() {}
}

function offlineFixture(locale: "en" | "es") {
  const publisher = "https://tlahtolli.coerll.utexas.edu/lesson/";
  const legacyPack = { version: 3, locale, scope: "alice%3Ateam", words: [
    { id: "word:960001", nahuatl: "chilli", english: "pepper", spanish: "chile",
      audioUrl: "https://tlahtolli.coerll.utexas.edu/source.mp3", sourceUrl: publisher,
      authors: ["Source author"], license: "CC BY-SA 4.0" },
    { id: "word:960002", nahuatl: "atl", english: "water", spanish: "agua",
      sourceUrl: "https://example.org/source", authors: ["Other author"], license: "Custom original notice" },
  ], scenarios: [] };
  const items = new Map<string, string>([
    ["itzli_offline_course_v3", JSON.stringify(legacyPack)],
    ["itzli_offline_scope_v3", legacyPack.scope],
    ["itzli_offline_attempts_v3:alice%3Ateam", JSON.stringify([{ id: "prior-attempt", activityId: "word:960001" }])],
    ["itzli_progress_v2:account:alice%3Ateam", "untouched progress"],
  ]);
  const before = new Map(items);
  const roots = new Map<string, OfflineNode>();
  const get = (id: string) => { if (!roots.has(id)) roots.set(id, new OfflineNode("div")); return roots.get(id)!; };
  const source = readFileSync("public/offline.html", "utf8").match(/<script>([\s\S]*?)<\/script>/)![1];
  const audioRuntime = runInNewContext(readFileSync("public/offline-audio.js", "utf8") + "; ItzliOfflineAudio;", { URL });
  const currentManifest = JSON.parse(readFileSync("public/generated-course-audio.json", "utf8"));
  runInNewContext(source, {
    URL, Date, Math,
    ItzliOrthography: { toInaliOrthography },
    ItzliOfflineAudio: { createIndex: () => audioRuntime.createIndex(currentManifest) },
    crypto: { randomUUID: () => "test-stream" },
    document: { documentElement: { lang: "" }, getElementById: get,
      createElement: (tag: string) => new OfflineNode(tag),
      createTextNode: (text: string) => { const node = new OfflineNode("text"); node.textContent = text; return node; } },
    localStorage: { get length() { return items.size; }, key: (index: number) => [...items.keys()][index],
      getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => items.set(key, value) },
  });
  return { legacyPack, items, before, roots: get };
}

function descendants(node: OfflineNode): OfflineNode[] {
  return [node, ...node.children.flatMap(descendants)];
}

describe("course export source and contribution notices", () => {
  it("separates new pack notices while preserving every word, scenario, audio and scope identity", () => {
    const words = getExpansionEntries(), scenarios = getConversationScenarios();
    const before = JSON.stringify([words, scenarios]);
    const options = { scope: "alice%3Ateam", locale: "es" as const, savedAt: "2026-10-07T00:00:00.000Z" };
    const pack = buildOfflineCoursePack(words, scenarios, options);
    expect(pack).toMatchObject({ version: 3, ...options });
    expect(pack.words.map(word => word.id)).toEqual(words.map(word => `word:${word.cardId}`));
    expect(pack.words.map(word => word.audioUrl)).toEqual(words.map(word => word.audio.url));
    expect(pack.scenarios).toEqual(scenarios);
    expect(pack.attribution.sourceLicense).toMatchObject({ name: COERLL_SOURCE_LICENSE_NOTICE.name, versionConfirmed: false });
    expect(pack.attribution.contributionLicense.name).toBe("CC BY-SA 4.0");
    expect(pack.attribution.changes).toContain("No source recording or other media is relicensed");
    expect(JSON.stringify([words, scenarios])).toBe(before);
  });

  it("downloads an original notebook with attribution without rewriting old saved IDs or source text", () => {
    const patterns = getSentencePatterns();
    const expressions = [{ id: `sentence:my-name:personal:${"a".repeat(64)}`, nahuatl: "Na notōcah José García.",
      english: "My name is José García.", spanish: "Me llamo José García.",
      sourceUrl: patterns.find(pattern => pattern.id === "my-name")!.sources[0].url, createdAt: 123 }];
    const before = structuredClone(expressions);
    const download = buildNotebookExport(expressions, patterns);
    expect(download.version).toBe(1);
    expect(download.expressions[0]).toMatchObject({ id: before[0].id, createdAt: 123,
      sourceText: before[0].nahuatl, nahuatl: "Na notokah José García." });
    expect(download.attribution.sources[0].license).toBe(COERLL_SOURCE_LICENSE_NOTICE.name);
    expect(download.attribution.sourceLicense.listingUrl).toBe(COERLL_SOURCE_LICENSE_NOTICE.listingUrl);
    expect(download.attribution.contributionLicense.name).toBe("CC BY-SA 4.0");
    expect(expressions).toEqual(before);
  });

  it("does not convert an unknown publisher's recorded rights notice", () => {
    expect(displayedSourceLicense("https://example.org/source", "Other license")).toBe("Other license");
    expect(displayedSourceLicense("https://tlahtolli.coerll.utexas.edu.example.org/source", "Original terms")).toBe("Original terms");
    expect(displayedSourceLicense("bad URL", "Historical notice")).toBe("Historical notice");
  });

  it.each(["en", "es"] as const)("shows corrected %s source notices for old packs without migrating stored data", locale => {
    const fixture = offlineFixture(locale);
    expect(fixture.roots("credit").textContent).toContain(locale === "en" ? "version unspecified" : "versión no especificada");
    expect(fixture.roots("credit").textContent).not.toContain("University of Texas at Austin · CC BY-SA 4.0");
    expect(fixture.roots("app").textContent).toContain(locale === "en" ? "version unspecified" : "versión no especificada");
    expect(descendants(fixture.roots("app")).find(node => node.tag === "audio")?.src).toBe(fixture.legacyPack.words[0].audioUrl);
    expect([...fixture.items]).toEqual([...fixture.before]);
    descendants(fixture.roots("app")).find(node => node.tag === "button" && node.textContent === (locale === "en" ? "Next word" : "Siguiente palabra"))!.onclick!();
    expect(fixture.roots("app").textContent).toContain("Custom original notice");
    expect([...fixture.items]).toEqual([...fixture.before]);
  });
});
