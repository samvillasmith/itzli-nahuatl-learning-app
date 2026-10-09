import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { prunePrivateReleaseTraces } = require("../scripts/prune-private-release-traces.cjs") as {
  prunePrivateReleaseTraces: (options: { root: string; write: boolean }) => {
    traceFiles: number; tracesChanged: number; privateReferencesRemoved: number;
    generatedTraceWrites: number; privateFilesDeleted: number; assetFilesChanged: number;
  };
};
const { privateReleasePathReason, resolveTraceReference } = require("../scripts/lib/release-trace-policy.cjs") as {
  privateReleasePathReason: (root: string, absolute: string, pathApi?: typeof path) => string | null;
  resolveTraceReference: (traceFilename: string, reference: string) => string;
};
const fixturePrefix = path.join(os.tmpdir(), "itzli-release-traces-");
const fixtures: string[] = [];
function fixture() {
  const root = fs.mkdtempSync(fixturePrefix);
  fixtures.push(root);
  const traceFile = path.join(root, ".next/server/app/api/test/route.js.nft.json");
  fs.mkdirSync(path.dirname(traceFile), { recursive: true });
  return { root, traceFile };
}
const relative = (traceFile: string, target: string) => path.relative(path.dirname(traceFile), target).replaceAll("\\", "/");
afterEach(() => {
  for (const root of fixtures.splice(0)) {
    if (!path.isAbsolute(root) || path.resolve(root) !== root || !root.startsWith(fixturePrefix)) throw new Error("Invalid fixture cleanup path.");
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("exact private release trace references", () => {
  it("classifies Windows separators and case without removing similarly named allowed paths", () => {
    const root = "C:\\work\\Itzli";
    for (const filename of ["DATA\\pending.json", ".ENV.local", "Secrets\\key.json", "secret\\key.json", ".clerk\\state.json",
      ".vercel\\project.json", "FCN_MASTER_LEXICON_PHASE8_6_PRIMER.SQLITE-wal", "src\\data\\audio-candidates-v3.json"])
      expect(privateReleasePathReason(root, path.win32.join(root, filename), path.win32), filename).toBeTruthy();
    for (const filename of ["dataset\\public.json", "secretary\\config.json", "node_modules\\data\\runtime.json",
      "node_modules\\package\\.env.example", "src\\data\\learner-generated-audio.json", "fcn_course_release.sqlite",
      "public\\images\\flower.png", "public\\third-party-notices.txt"])
      expect(privateReleasePathReason(root, path.win32.join(root, filename), path.win32), filename).toBeNull();
    expect(privateReleasePathReason(root, "C:\\outside\\data\\safe.json", path.win32)).toBeNull();
  });

  it("removes only prohibited references, preserving course/runtime refs, metadata and every original file", () => {
    const { root, traceFile } = fixture();
    const prohibited = ["data/openai-word-images-pending.json", "secrets/key.json", "secret/key.json", ".clerk/state.json",
      ".vercel/project.json", ".env.local", "fcn_master_lexicon_phase8_6_primer.sqlite", "fcn_master_lexicon_phase8_6_primer.sqlite-wal",
      "src/data/audio-candidates-v3.json"];
    const allowed = ["fcn_course_release.sqlite", "src/data/learner-generated-audio.json", "node_modules/data/runtime.json",
      "src/data/nahuatlahtolli-course.json", "public/third-party-notices.txt", ".next/server/webpack-runtime.js"];
    const originalFiles = [...prohibited, ...allowed].map((filename, index) => {
      const absolute = path.join(root, filename);
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      const bytes = Buffer.from(`fixture-bytes-${index}`);
      fs.writeFileSync(absolute, bytes);
      return { absolute, bytes };
    });
    const allowedRefs = allowed.map(filename => relative(traceFile, path.join(root, filename)));
    const privateRefs = prohibited.map(filename => relative(traceFile, path.join(root, filename)));
    // A Windows backslash trace and a duplicated allowed ref must be preserved correctly.
    privateRefs[0] = privateRefs[0].replaceAll("/", "\\");
    const trace = { version: 1, files: [...privateRefs, ...allowedRefs, allowedRefs[0]], extra: { preserved: true } };
    fs.writeFileSync(traceFile, JSON.stringify(trace));
    const summary = prunePrivateReleaseTraces({ root, write: true });
    expect(summary).toMatchObject({ traceFiles: 1, tracesChanged: 1, privateReferencesRemoved: prohibited.length,
      generatedTraceWrites: 1, privateFilesDeleted: 0, assetFilesChanged: 0 });
    const result = JSON.parse(fs.readFileSync(traceFile, "utf8"));
    expect(result).toEqual({ ...trace, files: [...allowedRefs, allowedRefs[0]] });
    for (const ref of result.files) expect(privateReleasePathReason(root, resolveTraceReference(traceFile, ref))).toBeNull();
    for (const { absolute, bytes } of originalFiles) expect(fs.readFileSync(absolute).equals(bytes), absolute).toBe(true);
    expect(prunePrivateReleaseTraces({ root, write: true })).toMatchObject({ tracesChanged: 0, privateReferencesRemoved: 0, generatedTraceWrites: 0 });
  });

  it("plans in read-only mode without changing existing build metadata", () => {
    const { root, traceFile } = fixture();
    const original = JSON.stringify({ version: 1, files: [relative(traceFile, path.join(root, "data/private.json"))] }, null, 2);
    fs.writeFileSync(traceFile, original);
    expect(prunePrivateReleaseTraces({ root, write: false })).toMatchObject({ privateReferencesRemoved: 1, generatedTraceWrites: 0 });
    expect(fs.readFileSync(traceFile, "utf8")).toBe(original);
  });

  it("ignores only Next's top-level dev cache while tracing production routes named dev", () => {
    const { root, traceFile } = fixture();
    fs.writeFileSync(traceFile, JSON.stringify({ version: 1, files: [relative(traceFile, path.join(root, "fcn_course_release.sqlite"))] }));
    const devCache = path.join(root, ".next/dev");
    fs.mkdirSync(devCache, { recursive: true });
    fs.writeFileSync(path.join(devCache, "cache.js.nft.json"), "not-a-production-trace");
    const target = path.join(root, "local-dev-dependency");
    fs.mkdirSync(target);
    fs.symlinkSync(target, path.join(devCache, "linked-dependency"), "junction");
    const productionDev = path.join(root, ".next/server/app/dev/page.js.nft.json");
    fs.mkdirSync(path.dirname(productionDev), { recursive: true });
    fs.writeFileSync(productionDev, JSON.stringify({ version: 1, files: [relative(productionDev, path.join(root, "data/private.json"))] }));
    expect(prunePrivateReleaseTraces({ root, write: true })).toMatchObject({ traceFiles: 2, privateReferencesRemoved: 1 });
    expect(JSON.parse(fs.readFileSync(productionDev, "utf8")).files).toEqual([]);
    expect(fs.readFileSync(path.join(devCache, "cache.js.nft.json"), "utf8")).toBe("not-a-production-trace");
    expect(fs.lstatSync(path.join(devCache, "linked-dependency")).isSymbolicLink()).toBe(true);
  });

  it("rejects production trace-tree links with the offending path before changing trace metadata", () => {
    const { root, traceFile } = fixture();
    const original = JSON.stringify({ version: 1, files: [relative(traceFile, path.join(root, "data/private.json"))] });
    fs.writeFileSync(traceFile, original);
    const target = path.join(root, "private-linked-files");
    fs.mkdirSync(target);
    const link = path.join(root, ".next/server/linked-runtime");
    fs.symlinkSync(target, link, "junction");
    expect(() => prunePrivateReleaseTraces({ root, write: true })).toThrow(link);
    expect(fs.readFileSync(traceFile, "utf8")).toBe(original);
    expect(fs.existsSync(target)).toBe(true);
  });

  it.each([null, [], {}, { version: 2, files: [] }, { version: 1, files: "not-an-array" },
    { version: 1, files: [42] }, { version: 1, files: [""] }, { version: 1, files: ["bad\0path"] },
    { version: 1, files: ["C:\\absolute\\file.json"] }, { version: 1, files: ["/absolute/file.json"] }])(
    "rejects malformed trace shapes before touching any generated trace: %j", malformed => {
      const { root, traceFile } = fixture();
      const valid = JSON.stringify({ version: 1, files: [relative(traceFile, path.join(root, "data/private.json"))] });
      fs.writeFileSync(traceFile, valid);
      fs.writeFileSync(path.join(root, ".next/zzz-bad.js.nft.json"), JSON.stringify(malformed));
      expect(() => prunePrivateReleaseTraces({ root, write: true })).toThrow(/Invalid release trace shape/);
      expect(fs.readFileSync(traceFile, "utf8")).toBe(valid);
    });
});
