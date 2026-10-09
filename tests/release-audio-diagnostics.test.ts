import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const fsNative = require("node:fs");
const release = require("../scripts/prepare-release-media.cjs");
const storage = require("../scripts/lib/audio-diagnostic-storage.cjs");
const google = require("../scripts/generate-google-audio.js");
const openai = require("../scripts/generate-openai-audio.js");
const name = "fixture--aaaaaaaaaaaa--bbbbbbbbbbbb";
const wav = `public/audio-v3/candidates/vocab/${name}.wav`;
const sidecar = `public/audio-v3/candidates/vocab/${name}.json`;
const checksum = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");

function fixture(run: (root: string) => void) {
  const prefix = join(process.cwd(), "data", "release-diagnostic-test-");
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  const root = mkdtempSync(prefix);
  try { run(root); } finally {
    if (!root.startsWith(prefix)) throw new Error("Unsafe fixture cleanup");
    rmSync(root, { recursive: true });
  }
}

function put(root: string, relative: string, data: Buffer | string) {
  const target = join(root, relative);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, data);
}

function mms(root: string) {
  const bytes = Buffer.from("private diagnostic waveform fixture");
  put(root, wav, bytes);
  put(root, sidecar, JSON.stringify({ model_id: "facebook/mms-tts-nhe", review_status: "unreviewed", audio_sha256: checksum(bytes) }));
  return bytes;
}

describe("release diagnostic audio separation", () => {
  it("archives only diagnostic prefixes, preserves hashes and leaves learner audio and approved images intact", () => fixture(root => {
    const bytes = mms(root);
    const googlePath = `public/audio-v3/google-candidates/_tests/${name}.wav`;
    const openaiPath = `public/audio-v3/openai-candidates/dialogue/${name}.mp3`;
    put(root, googlePath, "private Google fixture");
    put(root, openaiPath, "private OpenAI fixture");
    const untouched = ["public/audio-google/vocab/35.wav", "public/audio-v3/reviewed/lesson.wav", "public/word-images/approved-ai.webp"];
    for (const path of untouched) put(root, path, "preserved learner asset");
    const result = release.archiveDiagnostics(root);
    expect(result).toMatchObject({ count: 4, audioFiles: 3, archived: 4 });
    const manifest = JSON.parse(readFileSync(join(root, result.manifest), "utf8"));
    expect(manifest.status).toBe("archived");
    for (const entry of manifest.entries) {
      expect(existsSync(join(root, entry.source))).toBe(false);
      expect(checksum(readFileSync(join(root, entry.archive)))).toBe(entry.sha256);
      expect(entry.state).toBe("archived");
    }
    expect(readFileSync(join(root, manifest.entries.find((e: { source: string }) => e.source === wav).archive))).toEqual(bytes);
    for (const path of untouched) expect(readFileSync(join(root, path), "utf8")).toBe("preserved learner asset");
    expect(release.archiveDiagnostics(root)).toMatchObject({ archived: 0, manifest: null });
    expect(release.restoreDiagnostics(result.manifest, root).restored).toBe(4);
    expect(readFileSync(join(root, wav))).toEqual(bytes);
    expect(release.restoreDiagnostics(result.manifest, root).restored).toBe(0);
  }));

  it("fails before any move if a candidate path is referenced by learner content", () => fixture(root => {
    const bytes = mms(root);
    put(root, "src/data/learner-lesson.json", JSON.stringify({ audioSrc: wav.replace("public", "") }));
    expect(() => release.archiveDiagnostics(root)).toThrow("Learner recording must be preserved");
    expect(readFileSync(join(root, wav))).toEqual(bytes);
    expect(existsSync(join(root, "data/audio-v3/release-archives"))).toBe(false);
  }));

  it("fails closed on unfamiliar files or falsely approved MMS candidates", () => fixture(root => {
    mms(root);
    put(root, "public/audio-v3/candidates/vocab/not-a-diagnostic.wav", "unclassified recording");
    expect(() => release.archiveDiagnostics(root)).toThrow("Unrecognized file");
    expect(existsSync(join(root, wav))).toBe(true);
    rmSync(join(root, "public/audio-v3/candidates/vocab/not-a-diagnostic.wav"));
    put(root, sidecar, JSON.stringify({ model_id: "facebook/mms-tts-nhe", review_status: "approved", audio_sha256: checksum(readFileSync(join(root, wav))) }));
    expect(() => release.archiveDiagnostics(root)).toThrow("Unconfirmed diagnostic status");
    expect(existsSync(join(root, wav))).toBe(true);
  }));

  it("rejects linked diagnostic directories and workspace escapes before moving files", () => fixture(root => {
    const bytes = mms(root), originalStat = fsNative.lstatSync;
    // Windows sandbox disallows creating reparse points; simulate that one filesystem response.
    const stat = vi.spyOn(fsNative, "lstatSync").mockImplementation((...args: unknown[]) => {
      const result = originalStat(...args);
      return args[0] === join(root, "public/audio-v3/candidates") ? { ...result, isSymbolicLink: () => true } : result;
    });
    try { expect(() => release.archiveDiagnostics(root)).toThrow("Linked path"); } finally { stat.mockRestore(); }
    expect(readFileSync(join(root, wav))).toEqual(bytes);
    expect(() => release.checkedPath(root, "../escape.wav")).toThrow("escapes workspace");
  }));

  it("refuses rollback collisions and recovers an interrupted journal from unchanged bytes", () => fixture(root => {
    const bytes = mms(root), result = release.archiveDiagnostics(root);
    const file = join(root, result.manifest), manifest = JSON.parse(readFileSync(file, "utf8"));
    put(root, wav, "new learner recording");
    expect(() => release.restoreDiagnostics(result.manifest, root)).toThrow("Rollback conflict");
    expect(readFileSync(join(root, wav), "utf8")).toBe("new learner recording");
    rmSync(join(root, wav));
    manifest.entries[0].state = "planned";
    writeFileSync(file, JSON.stringify(manifest));
    expect(release.restoreDiagnostics(result.manifest, root).restored).toBe(2);
    expect(readFileSync(join(root, wav))).toEqual(bytes);
  }));

  it("rejects tampered rollback records targeting any unrelated learner directory", () => fixture(root => {
    mms(root);
    const result = release.archiveDiagnostics(root), file = join(root, result.manifest);
    const manifest = JSON.parse(readFileSync(file, "utf8"));
    manifest.entries[0].source = "public/audio-google/vocab/35.wav";
    writeFileSync(file, JSON.stringify(manifest));
    expect(() => release.restoreDiagnostics(result.manifest, root)).toThrow("Unsafe diagnostic rollback");
    expect(existsSync(join(root, "public/audio-google/vocab/35.wav"))).toBe(false);
  }));

  it("keeps future experiments private and rejects explicit public output before any provider call", () => {
    const root = resolve(process.cwd());
    expect(google.parseArgs([], {}).outDir).toBe(storage.privateDiagnosticDirectory(root, "google"));
    expect(openai.parseArgs([]).outDir).toBe(storage.privateDiagnosticDirectory(root, "openai"));
    expect(() => google.parseArgs(["--out", join(root, "public/audio-google")], {})).toThrow("outside public");
    expect(() => openai.parseArgs(["--out", join(root, "public/audio-v3/openai-candidates")])).toThrow("outside public");
    expect(() => storage.privateDiagnosticDirectory(root, "unknown")).toThrow("Unknown");
  });
});
