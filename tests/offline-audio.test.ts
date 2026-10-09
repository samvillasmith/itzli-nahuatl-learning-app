import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { toInaliOrthography } from "@/lib/orthography";

const resolver = readFileSync("public/offline-audio.js", "utf8");
const page = readFileSync("public/offline.html", "utf8").match(/<script>([\s\S]*?)<\/script>/)![1];
const recipe = "spanish-air-b-2026-10-07";
const id = "a".repeat(64);
const generatedUrl = `https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/audio-v3/${recipe}/${id}.mp3`;
const nativeUrl = "https://tlahtolli.coerll.utexas.edu/original.mp3";
const manifest = () => ({ schema_version: 1, recipe_id: recipe,
  assets: [{ id, ssml_sha256: "b".repeat(64), url: generatedUrl }],
  bindings: [{ reference_id: "core-vocab:35", runtime_text: "Kenihki tiitstok?", asset_id: id }],
  source_bindings: [] as { reference_id: string; runtime_text: string; url: string }[],
  held_reference_ids: [] as string[], held_source_urls: [] as string[], learner_excluded_reference_ids: [] as string[],
  learner_content_policy: { schema_version: 1, headwords: [] as string[], exact_text: [] as string[], patterns: [] as string[] } });
type Recording = { url: string; kind: string; generated: boolean } | null;
type Index = { valid: boolean; resolve: (input: { text: string; displayText?: string; referenceId?: string; url?: string; held?: boolean }) => Recording };
function index(data: unknown): Index {
  const context = vm.createContext({ URL });
  vm.runInContext(resolver, context);
  return context.ItzliOfflineAudio.createIndex(data);
}

describe("saved-pack exact reviewed audio routing", () => {
  it("refuses a changed known identity even when another reference has its exact old text", () => {
    const data = manifest();
    data.bindings.push({ reference_id: "phrase:other", runtime_text: "Quehatza tiitztoc?", asset_id: id });
    const audio = index(data);
    expect(audio.resolve({ text: "Quehatza tiitztoc?", referenceId: "core-vocab:35", url: "/audio-google/vocab/35.wav" })).toBeNull();
    expect(audio.resolve({ text: "Quehatza tiitztoc?", referenceId: "core-vocab:35", url: nativeUrl })).toBeNull();
    expect(audio.resolve({ text: "Kenihki tiitstok?", referenceId: "core-vocab:35" })?.url).toBe(generatedUrl);
  });

  it("retains the exact original source recording ahead of a generated clip", () => {
    const data = manifest();
    data.source_bindings.push({ reference_id: "core-vocab:35", runtime_text: "Kenihki tiitstok?", url: nativeUrl });
    expect(index(data).resolve({ text: "Kenihki tiitstok?", referenceId: "core-vocab:35" })).toMatchObject({ url: nativeUrl, kind: "source", generated: false });
    expect(index(data).resolve({ text: "Kenihki tiitstok?", referenceId: "core-vocab:35", url: nativeUrl })).toMatchObject({ url: nativeUrl, kind: "source" });
  });

  it("accepts an INALI display only when that exact alias was published for the reference", () => {
    const audio = index(manifest());
    expect(audio.resolve({ text: "Quēniuhqui tiitztoc?", displayText: "Kenihki tiitstok?", referenceId: "core-vocab:35" })?.url).toBe(generatedUrl);
    expect(audio.resolve({ text: "Kenihki tiitstok", referenceId: "core-vocab:35" })).toBeNull();
    expect(audio.resolve({ text: "kenihki tiitstok?", referenceId: "core-vocab:35" })).toBeNull();
  });

  it("does not recover held audio through source priority, text aliases or historical URLs", () => {
    const data = manifest(); data.held_reference_ids = ["core-vocab:35"];
    expect(index(data).resolve({ text: "Kenihki tiitstok?", referenceId: "core-vocab:35", url: nativeUrl })).toBeNull();
    expect(index(manifest()).resolve({ text: "Kenihki tiitstok?", referenceId: "core-vocab:35", held: true })).toBeNull();
    expect(index(manifest()).resolve({ text: "unmapped", url: "/audio/vocab/12.mp3" })).toBeNull();
  });

  it("blocks an excluded original URL even without a recognized reference identity", () => {
    const data = manifest(); data.held_source_urls = [nativeUrl];
    data.source_bindings.push({ reference_id: "safe", runtime_text: "safe", url: nativeUrl });
    for (const referenceId of [undefined, "unknown", "safe"])
      expect(index(data).resolve({ text: "safe", referenceId, url: nativeUrl })).toBeNull();
    expect(index(data).resolve({ text: "safe", url: nativeUrl + "?revision=old#clip" })).toBeNull();
  });

  it("fails closed for conflicting assets, foreign URLs and deceptive source hosts", () => {
    const duplicate = manifest(); duplicate.assets.push({ ...duplicate.assets[0], url: generatedUrl.replace(".mp3", ".wav") });
    expect(index(duplicate).resolve({ text: "Kenihki tiitstok?", referenceId: "core-vocab:35" })).toBeNull();
    const foreign = manifest(); foreign.assets[0].url = generatedUrl.replace("nahuatl-language", "other-bucket");
    expect(index(foreign).resolve({ text: "Kenihki tiitstok?", referenceId: "core-vocab:35" })).toBeNull();
    for (const url of ["https://tlahtolli.coerll.utexas.edu.evil.example/x.mp3", "https://tlahtolli.coerll.utexas.edu@evil.example/x.mp3", "javascript:alert(1)", "https://user:password@tlahtolli.coerll.utexas.edu/x.mp3"]) {
      expect(index(null).resolve({ text: "atl", url })).toBeNull();
    }
  });
});

class Node {
  children: Node[] = []; src = ""; href = ""; value = ""; className = "";
  style: { cssText?: string } = {}; onclick?: () => void;
  private ownText = "";
  constructor(readonly tag: string) {}
  set textContent(value: string) { this.ownText = value; this.children = []; }
  get textContent(): string { return this.ownText + this.children.map(child => child.textContent).join(""); }
  append(...children: Node[]) { this.children.push(...children); }
  prepend(...children: Node[]) { this.children.unshift(...children); }
  replaceChildren(...children: Node[]) { this.ownText = ""; this.children = children; }
  setAttribute() {}
}
const all = (node: Node): Node[] => [node, ...node.children.flatMap(all)];
async function offlinePage(pack: unknown, data: unknown) {
  const roots = new Map<string, Node>(), storage = new Map([["itzli_offline_course_v3", JSON.stringify(pack)], ["itzli_progress_v2:guest", "existing progress"]]);
  const before = [...storage];
  const write = vi.fn((key: string, value: string) => storage.set(key, value));
  const get = (id: string) => { if (!roots.has(id)) roots.set(id, new Node("div")); return roots.get(id)!; };
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } }));
  const context = vm.createContext({ URL, Response, AbortController, Date, Math, setTimeout, clearTimeout,
    ItzliOrthography: { toInaliOrthography }, fetch: fetchMock,
    document: { documentElement: {}, getElementById: get, createElement: (tag: string) => new Node(tag), createTextNode: (text: string) => { const node = new Node("text"); node.textContent = text; return node; } },
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: write },
  });
  vm.runInContext(resolver, context); vm.runInContext(page, context);
  await vi.waitFor(() => expect(get("app").textContent).not.toContain("Preparing saved practice"));
  return { get, storage, before, write, fetchMock };
}

describe("standalone saved-pack playback", () => {
  const word = { id: "word:35", nahuatl: "Kenihki tiitstok?", english: "how are you?", spanish: "¿cómo estás?", audioUrl: "/audio-google/vocab/35.wav", sourceUrl: "https://example.org", authors: [], license: "Original notice" };
  it("plays reviewed current text without migrating a saved pack or touching progress", async () => {
    const f = await offlinePage({ version: 3, locale: "en", words: [word], scenarios: [] }, manifest());
    expect(all(f.get("app")).filter(node => node.tag === "audio").map(node => node.src)).toEqual([generatedUrl]);
    expect(f.get("app").textContent).toContain("Synthetic practice voice");
    expect([...f.storage]).toEqual(f.before); expect(f.write).not.toHaveBeenCalled();
    expect(f.fetchMock.mock.calls).toHaveLength(1);
  });

  it("leaves a stale saved question visible while refusing its old mismatching audio", async () => {
    const f = await offlinePage({ version: 3, locale: "en", words: [{ ...word, nahuatl: "Quehatza tiitztoc?" }], scenarios: [] }, manifest());
    expect(all(f.get("app")).filter(node => node.tag === "audio")).toHaveLength(0);
    expect(f.get("app").textContent).toContain("Recording unavailable");
    expect([...f.storage]).toEqual(f.before);
  });

  it("hides excluded saved words, distractors and conversation pairs without rewriting storage or progress", async () => {
    const data = manifest();
    data.learner_excluded_reference_ids = ["vocabulary:excluded", "conversation:meeting:removed:reply"];
    data.learner_content_policy.headwords = ["awiltia"];
    data.learner_content_policy.patterns = ["\\b(?:rape|masturbate|defecate)\\b"];
    const pack = { version: 3, locale: "en", words: [
      { ...word, id: "word:excluded", nahuatl: "neutral label", english: "Excluded by identity", audioReferenceId: "vocabulary:excluded" },
      { ...word, id: "word:unknown", nahuatl: "awiltia", english: "Excluded by headword" },
      { ...word, id: "word:unknown2", nahuatl: "different word", english: "to rape" },
      word,
    ], scenarios: [{ id: "meeting", titleEn: "Meet", titleEs: "Conocer", sources: [], turns: [
      { id: "removed", speaker: "A", nahuatl: "removed model", english: "Removed question", spanish: "Pregunta", options: [{ id: "reply", correct: true, nahuatl: "removed reply", english: "Removed reply", spanish: "Respuesta" }] },
      { id: "safe", speaker: "A", nahuatl: "Piyalli.", english: "Hello", spanish: "Hola", options: [{ id: "reply", correct: true, nahuatl: "Kena.", english: "Yes", spanish: "Sí" }] },
    ] }] };
    const f = await offlinePage(pack, data);
    expect(f.get("app").textContent).toContain("how are you?");
    for (const phrase of ["Excluded by identity", "Excluded by headword", "to rape", "awiltia"])
      expect(f.get("app").textContent).not.toContain(phrase);
    all(f.get("app")).find(node => node.tag === "button" && node.textContent === "Read conversations")!.onclick!();
    expect(f.get("app").textContent).toContain("Hello");
    expect(f.get("app").textContent).not.toContain("removed model");
    expect(f.get("app").textContent).not.toContain("removed reply");
    expect([...f.storage]).toEqual(f.before); expect(f.write).not.toHaveBeenCalled();
  });

  it("requires current exclusion metadata before exposing an older saved pack", async () => {
    const data = manifest() as Record<string, unknown>; delete data.learner_content_policy;
    const f = await offlinePage({ version: 3, locale: "en", words: [{ ...word, english: "to rape" }], scenarios: [] }, data);
    expect(f.get("app").textContent).toContain("Reconnect once");
    expect(f.get("app").textContent).not.toContain("to rape");
    expect([...f.storage]).toEqual(f.before); expect(f.write).not.toHaveBeenCalled();
  });

  it("replays each conversation model and its selected example reply with stable reference IDs", async () => {
    const data = manifest();
    data.bindings.push({ reference_id: "conversation:meeting:hello:model", runtime_text: "Piyalli.", asset_id: id },
      { reference_id: "conversation:meeting:hello:reply", runtime_text: "Kenihki tiitstok?", asset_id: id });
    const pack = { version: 3, locale: "en", words: [word], scenarios: [{ id: "meeting", titleEn: "Meet", titleEs: "Conocer", sources: [], turns: [{ id: "hello", speaker: "A", nahuatl: "Piyalli.", english: "Hello", spanish: "Hola", audioUrl: nativeUrl,
      options: [{ id: "reply", nahuatl: "Kenihki tiitstok?", english: "How are you?", spanish: "¿Cómo estás?", correct: true }] }] }] };
    const f = await offlinePage(pack, data);
    all(f.get("app")).find(node => node.tag === "button" && node.textContent === "Read conversations")!.onclick!();
    expect(all(f.get("app")).filter(node => node.tag === "audio").map(node => node.src)).toEqual([nativeUrl, generatedUrl]);
    expect([...f.storage]).toEqual(f.before); expect(f.write).not.toHaveBeenCalled();
  });
});
