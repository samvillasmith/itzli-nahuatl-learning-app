import { isValidElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioCacheProgress } from "@/lib/audio-cache";

type Effect = () => void | (() => void);
type Slot = { value?: unknown; setter?: (value: unknown) => void; dependencies?: readonly unknown[]; cleanup?: () => void };
/** Execute the components' real hooks and handlers without adding a DOM runtime.
 * Effects run after render, with cleanup and dependency changes preserved. */
class HookHarness {
  private slots: Slot[] = [];
  private cursor = 0;
  private effects: (() => void)[] = [];
  tree: ReactNode = null;
  constructor(private component: () => ReactNode) {}
  render() {
    this.cursor = 0;
    controls.harness = this;
    try { this.tree = this.component(); } finally { controls.harness = null; }
    this.effects.splice(0).forEach(effect => effect());
    return this.tree;
  }
  state(initial: unknown) {
    const index = this.cursor++;
    let slot = this.slots[index];
    if (!slot) {
      slot = this.slots[index] = { value: typeof initial === "function" ? initial() : initial };
      slot.setter = value => { slot.value = typeof value === "function" ? value(slot.value) : value; };
    }
    return [slot.value, slot.setter];
  }
  ref(initial: unknown) {
    const index = this.cursor++;
    this.slots[index] ??= { value: { current: initial } };
    return this.slots[index].value;
  }
  private changed(slot: Slot | undefined, dependencies?: readonly unknown[]) {
    return !slot || !dependencies || !slot.dependencies || dependencies.length !== slot.dependencies.length ||
      dependencies.some((value, index) => !Object.is(value, slot.dependencies![index]));
  }
  effect(effect: Effect, dependencies?: readonly unknown[]) {
    const index = this.cursor++, slot = this.slots[index];
    if (!this.changed(slot, dependencies)) return;
    const next: Slot = { dependencies, cleanup: slot?.cleanup };
    this.slots[index] = next;
    this.effects.push(() => { next.cleanup?.(); next.cleanup = effect() || undefined; });
  }
  callback(callback: () => unknown, dependencies?: readonly unknown[]) {
    const index = this.cursor++, slot = this.slots[index];
    if (this.changed(slot, dependencies)) this.slots[index] = { value: callback, dependencies };
    return this.slots[index].value;
  }
  unmount() { this.slots.forEach(slot => slot.cleanup?.()); }
}

const controls = vi.hoisted(() => ({
  harness: null as HookHarness | null,
  pathname: "/en/units/1", locale: "en",
  precache: vi.fn(), source: vi.fn(), groups: vi.fn(), register: vi.fn(), addAll: vi.fn(), open: vi.fn(),
  importAttempts: vi.fn(), push: vi.fn(), pack: vi.fn(),
  assets: [{ id: "practice-current", url: "https://audio.example/current.mp3" },
    { id: "practice-next", url: "https://audio.example/next.mp3" },
    { id: "practice-later", url: "https://audio.example/later.mp3" }],
  originals: ["https://native.example/current.mp3", "https://native.example/next.mp3", "https://native.example/later.mp3"],
  words: [{ cardId: 101, headword: "one", audio: { url: "https://native.example/word-one.mp3" } },
    { cardId: 102, headword: "two", audio: { url: "https://native.example/word-two.mp3" } }],
}));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  const harness = () => { if (!controls.harness) throw new Error("Hook called outside component fixture"); return controls.harness; };
  return { ...actual,
    useState: (initial: unknown) => harness().state(initial),
    useRef: (initial: unknown) => harness().ref(initial),
    useEffect: (effect: Effect, dependencies?: readonly unknown[]) => harness().effect(effect, dependencies),
    useCallback: (callback: () => unknown, dependencies?: readonly unknown[]) => harness().callback(callback, dependencies),
  };
});
vi.mock("next/navigation", () => ({ usePathname: () => controls.pathname }));
vi.mock("@/i18n/LocaleProvider", () => ({ useLocale: () => ({ locale: controls.locale }) }));
vi.mock("@/lib/generated-audio", () => ({ GENERATED_AUDIO_ASSETS: controls.assets, ORIGINAL_SOURCE_AUDIO_URLS: controls.originals,
  GENERATED_AUDIO_INDEX: {
    lessonAssets: (group: string) => group === "unit:1" ? [controls.assets[0]] : [controls.assets[1]],
    lessonSourceUrls: (group: string) => group === "unit:1" ? [controls.originals[0]] : [controls.originals[1]],
  },
}));
vi.mock("@/lib/audio-cache", () => ({ audioGroupsForPath: controls.groups, precacheGeneratedAudio: controls.precache,
  isLearningAudioPath: (path: string) => path.includes("/units/"),
}));
vi.mock("@/lib/source-audio-preload", () => ({ preloadSourceAudio: controls.source }));
vi.mock("@/data/learner-offline-words.json", () => ({ default: controls.words }));
vi.mock("@/data/learner-conversations", () => ({ getConversationScenarios: () => [{ id: "greeting" }] }));
vi.mock("@/lib/progress", () => ({ getProgressAccount: () => "learner-a" }));
vi.mock("@/lib/offline-attempts", () => ({ importOfflineAttempts: controls.importAttempts }));
vi.mock("@/lib/cloudSync", () => ({ pushToCloud: controls.push }));
vi.mock("@/lib/course-export-notices", () => ({ buildOfflineCoursePack: controls.pack }));
import CourseAudioCache from "@/components/CourseAudioCache";
import OfflinePack from "@/components/OfflinePack";

type Element = { type: unknown; props: Record<string, unknown> };
function elements(node: ReactNode, type: string): Element[] {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, type));
  if (!isValidElement(node)) return [];
  const element = node as unknown as Element;
  return [...(element.type === type ? [element] : []), ...elements(element.props.children as ReactNode, type)];
}
function text(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (isValidElement(node)) return text((node.props as { children?: ReactNode }).children);
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const downloadCalls = () => controls.precache.mock.calls.filter(([, options]) => options.priority === 10);
const click = (element: Element) => (element.props.onClick as () => void)();
const checkbox = (element: Element, checked: boolean) => (element.props.onChange as (event: { target: { checked: boolean } }) => void)({ target: { checked } });
const saveButton = (tree: ReactNode) => elements(tree, "button").find(button => /Save offline pack|Guardar paquete/.test(text(button.props.children as ReactNode)))!;
const practiceCheckbox = (tree: ReactNode) => {
  const label = elements(tree, "label").find(label => /practice audio|audio de práctica/.test(text(label.props.children as ReactNode)))!;
  return elements(label as unknown as ReactNode, "input")[0];
};
const originalCheckbox = (tree: ReactNode) => {
  const label = elements(tree, "label").find(label => /original recordings|grabaciones originales/.test(text(label.props.children as ReactNode)))!;
  return elements(label as unknown as ReactNode, "input")[0];
};
function controlledDownload() {
  let resolve!: (progress: AudioCacheProgress) => void;
  const promise = new Promise<AudioCacheProgress>(done => { resolve = done; });
  controls.precache.mockImplementation((assets, options) => {
    if (options.priority !== 10) return Promise.resolve({ completed: assets.length, total: assets.length, saved: assets.length, failed: 0, paused: false });
    options.onProgress?.({ completed: 0, total: assets.length, saved: 0, failed: 0, paused: false });
    options.signal.addEventListener("abort", () => resolve({ completed: 1, total: assets.length, saved: 1, failed: 0, paused: true }), { once: true });
    return promise;
  });
  return { resolve };
}

let browser: EventTarget & { caches: unknown };
let page: EventTarget & { visibilityState: string };
const mounted: HookHarness[] = [];
const mount = (component: () => ReactNode) => { const harness = new HookHarness(component); mounted.push(harness); harness.render(); return harness; };
beforeEach(() => {
  vi.useFakeTimers();
  controls.pathname = "/en/units/1"; controls.locale = "en";
  [controls.precache, controls.source, controls.groups, controls.register, controls.addAll, controls.open, controls.importAttempts, controls.push, controls.pack].forEach(mock => mock.mockReset());
  controls.groups.mockImplementation(path => path.includes("/units/") ? ["unit:1", "unit:2"] : []);
  controls.precache.mockImplementation(async assets => ({ completed: assets.length, total: assets.length, saved: assets.length, failed: 0, paused: false }));
  controls.source.mockImplementation(async urls => ({ completed: urls.length, total: urls.length, prepared: urls.length, paused: false }));
  controls.register.mockResolvedValue({}); controls.addAll.mockResolvedValue(undefined);
  controls.open.mockResolvedValue({ addAll: controls.addAll });
  controls.importAttempts.mockReturnValue({ imported: 0, storageError: false }); controls.push.mockResolvedValue(true);
  controls.pack.mockImplementation((_words, _scenarios, options) => ({ schemaVersion: 3, scope: options.scope, words: controls.words }));
  browser = Object.assign(new EventTarget(), { caches: { open: controls.open } });
  page = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const storage = new Map<string, string>();
  vi.stubGlobal("window", browser); vi.stubGlobal("document", page);
  vi.stubGlobal("navigator", { onLine: true, connection: { effectiveType: "4g", saveData: false }, serviceWorker: { register: controls.register } });
  vi.stubGlobal("caches", browser.caches);
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => { mounted.splice(0).forEach(harness => harness.unmount()); controls.harness = null; vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("full practice audio requires the learner's choice", () => {
  it("still queues only current and next lesson recordings immediately in the correct order", () => {
    mount(CourseAudioCache);
    expect(controls.precache.mock.calls.map(([assets, options]) => [assets.map((asset: { id: string }) => asset.id), options.priority, options.enqueueAll]))
      .toEqual([[["practice-current"], 1, true], [["practice-next"], 2, true]]);
    expect(controls.source.mock.calls.map(([urls, options]) => [urls, options.priority, options.enqueueAll]))
      .toEqual([[[controls.originals[0]], 1, true], [[controls.originals[1]], 2, true]]);
    expect(downloadCalls()).toHaveLength(0);
  });
  it("never starts a full pack on timers, reconnecting or visibility changes, and hides download counters", async () => {
    const footer = mount(CourseAudioCache);
    await vi.advanceTimersByTimeAsync(60_000);
    browser.dispatchEvent(new Event("online")); page.visibilityState = "hidden"; page.dispatchEvent(new Event("visibilitychange"));
    page.visibilityState = "visible"; page.dispatchEvent(new Event("visibilitychange")); await flush();
    expect(downloadCalls()).toHaveLength(0); expect(controls.source).toHaveBeenCalledTimes(2);
    expect(text(footer.render())).not.toMatch(/\b\d+\s+of\s+\d+\b|Resume|Pause/);
    expect(elements(footer.tree, "button")).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("starts the full generated pack only on its button, without requesting all original recordings", async () => {
    controlledDownload(); const footer = mount(CourseAudioCache);
    click(elements(footer.tree, "button")[0]); await flush();
    expect(downloadCalls()).toHaveLength(1); expect(downloadCalls()[0][0]).toBe(controls.assets);
    expect(controls.source).toHaveBeenCalledTimes(2);
    expect(text(footer.render())).toContain("Pause");
    browser.dispatchEvent(new Event("itzli-course-audio-download")); await flush();
    expect(downloadCalls()).toHaveLength(1);
  });
  it("accepts an explicit pack event on a learning page but never on a public landing page", async () => {
    const footer = mount(CourseAudioCache);
    browser.dispatchEvent(new Event("itzli-course-audio-download")); await flush();
    expect(downloadCalls()).toHaveLength(1); expect(controls.source).toHaveBeenCalledTimes(2);
    footer.unmount(); controls.precache.mockClear(); controls.pathname = "/en";
    const landing = mount(CourseAudioCache);
    browser.dispatchEvent(new Event("itzli-course-audio-download")); await flush();
    expect(landing.tree).toBeNull(); expect(downloadCalls()).toHaveLength(0);
  });
  it("pauses and resumes only on an explicit action, preserving the partial counter", async () => {
    controlledDownload(); const footer = mount(CourseAudioCache);
    click(elements(footer.tree, "button")[0]); await flush();
    const firstSignal = downloadCalls()[0][1].signal as AbortSignal;
    footer.render(); click(elements(footer.tree, "button")[0]); await flush();
    expect(firstSignal.aborted).toBe(true); expect(text(footer.render())).toContain("Resume");
    expect(text(footer.tree)).toMatch(/1\s+of\s+3/);
    browser.dispatchEvent(new Event("online")); page.dispatchEvent(new Event("visibilitychange")); await vi.advanceTimersByTimeAsync(60_000);
    expect(downloadCalls()).toHaveLength(1);
    const resumed = controlledDownload(); click(elements(footer.tree, "button")[0]); await flush();
    expect(downloadCalls()).toHaveLength(2); expect(downloadCalls()[1][1].signal).not.toBe(firstSignal);
    resumed.resolve({ completed: 3, total: 3, saved: 3, failed: 0, paused: false }); await flush();
    expect(elements(footer.render(), "button")).toHaveLength(0);
  });
  it("pauses a chosen pack when offline and aborts it on unmount, with no automatic reconnect restart", async () => {
    controlledDownload(); const footer = mount(CourseAudioCache);
    click(elements(footer.tree, "button")[0]); await flush();
    browser.dispatchEvent(new Event("offline")); await flush();
    expect((downloadCalls()[0][1].signal as AbortSignal).aborted).toBe(true);
    browser.dispatchEvent(new Event("online")); await flush(); expect(downloadCalls()).toHaveLength(1);
    controlledDownload(); footer.render(); click(elements(footer.tree, "button")[0]); await flush();
    const signal = downloadCalls()[1][1].signal as AbortSignal;
    footer.unmount(); expect(signal.aborted).toBe(true);
    browser.dispatchEvent(new Event("itzli-course-audio-download")); await flush(); expect(downloadCalls()).toHaveLength(2);
  });
  it("keeps a chosen pack and its pause controls when leaving the lesson, cancelling obsolete lesson warmup", async () => {
    controlledDownload(); const footer = mount(CourseAudioCache);
    const lessonSignal = controls.precache.mock.calls[0][1].signal as AbortSignal;
    click(elements(footer.tree, "button")[0]); await flush();
    const fullSignal = downloadCalls()[0][1].signal as AbortSignal;
    controls.pathname = "/en"; footer.render(); await flush();
    expect(lessonSignal.aborted).toBe(true); expect(fullSignal.aborted).toBe(false); expect(downloadCalls()).toHaveLength(1);
    expect(footer.tree).not.toBeNull();
    expect(text(elements(footer.tree, "button")[0].props.children as ReactNode)).toContain("Pause");
  });
});

describe("offline text, practice voices and originals are separate choices", () => {
  it("defaults both audio choices off and saves the text/shell without starting audio", async () => {
    const pack = mount(OfflinePack), requested = vi.fn(); browser.addEventListener("itzli-course-audio-download", requested);
    expect(elements(pack.tree, "input").map(input => input.props.checked)).toEqual([false, false]);
    click(saveButton(pack.tree)); await flush(); pack.render();
    expect(localStorage.getItem("itzli_offline_scope_v3")).toBe("learner-a");
    expect(JSON.parse(localStorage.getItem("itzli_offline_course_v3")!).words).toHaveLength(2);
    expect(controls.addAll).toHaveBeenCalledWith(["/offline.html", "/nahuatl-orthography.js", "/offline-audio.js", "/generated-course-audio.json"]);
    expect(requested).not.toHaveBeenCalled(); expect(downloadCalls()).toHaveLength(0); expect(controls.source).not.toHaveBeenCalled();
    expect(text(pack.tree)).toContain("Text saved."); expect(text(pack.tree)).not.toContain("Practice audio saves");
  });
  it("downloads practice voices through the footer only after that checkbox is selected", async () => {
    mount(CourseAudioCache); const pack = mount(OfflinePack);
    checkbox(practiceCheckbox(pack.tree), true); pack.render(); click(saveButton(pack.tree)); await flush();
    expect(downloadCalls()).toHaveLength(1); expect(downloadCalls()[0][0]).toBe(controls.assets);
    expect(controls.source).toHaveBeenCalledTimes(2);
  });
  it("prepares external originals only after their distinct checkbox is selected", async () => {
    const pack = mount(OfflinePack), requested = vi.fn(); browser.addEventListener("itzli-course-audio-download", requested);
    checkbox(originalCheckbox(pack.tree), true); pack.render(); click(saveButton(pack.tree)); await flush();
    expect(controls.source).toHaveBeenCalledWith(controls.words.map(word => word.audio.url), { priority: 2 });
    expect(requested).not.toHaveBeenCalled(); expect(downloadCalls()).toHaveLength(0);
  });
  it("honours both explicit choices without making originals part of the full generated pack", async () => {
    mount(CourseAudioCache); const pack = mount(OfflinePack);
    checkbox(practiceCheckbox(pack.tree), true); checkbox(originalCheckbox(pack.tree), true); pack.render();
    click(saveButton(pack.tree)); await flush();
    expect(downloadCalls()).toHaveLength(1); expect(controls.source).toHaveBeenCalledTimes(3);
    expect(controls.source.mock.calls[2][0]).toEqual(controls.words.map(word => word.audio.url));
    expect(controls.source.mock.calls.some(([urls]) => urls === controls.originals)).toBe(false);
  });
});
