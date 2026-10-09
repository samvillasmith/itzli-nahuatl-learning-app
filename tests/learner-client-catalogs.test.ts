import { createRequire } from "node:module";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import publicConversations from "../src/data/learner-conversations.json";
import publicGrammar from "../src/data/learner-grammar.json";
import publicListening from "../src/data/learner-listening.json";
import publicWords from "../src/data/learner-offline-words.json";
import publicImageSenses from "../src/data/learner-image-senses.json";
import selectedSenses from "../src/data/learner-vocabulary-senses.json";
import { getConversationScenarios, getSentencePatterns, renderSentenceTemplate as serverRender } from "../src/data/conversation-scenarios";
import { renderSentenceTemplate as clientRender } from "../src/data/learner-conversations";
import { GRAMMAR_LESSONS, GRAMMAR_REVIEW_HOLDS } from "../src/data/grammar-lessons";
import { getExpansionEntries } from "../src/data/lexical-expansion";
import { getVerifiedExpansionEntries } from "../src/data/v3-expansion";
import { getLearnerSenseExclusionReason } from "../src/lib/app-content-safety";

const require = createRequire(import.meta.url);
const root = process.cwd();
const privateFiles = new Set(["nahuatlahtolli-course.json", "v3-verified-lexicon.json", "v3-original-course.json",
  "instructional-lesson-blueprints.json", "reviewed-vocabulary-labels.json", "learner-vocabulary-senses.json",
  "app-content-exclusions.json", "audio-learner-exclusions.json", "generated-course-audio.json",
  "word-images.json", "openai-word-images.json", "s3-word-images.json", "es.generated.json", "reviewed-tutor-context.json"]);
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(path.join(directory, entry.name)) : /\.(?:[cm]?js|tsx?)$/.test(entry.name) ? [path.join(directory, entry.name)] : []);
}
function runtimeImports(filename: string): string[] {
  const ast = ts.createSourceFile(filename, readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const onlyTypes = clause?.isTypeOnly || (!clause?.name && bindings && ts.isNamedImports(bindings) &&
        bindings.elements.every(item => item.isTypeOnly));
      if (!onlyTypes) imports.push(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")) && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
      imports.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return imports;
}
function resolveImport(filename: string, specifier: string): string | null {
  const base = specifier.startsWith("@/") ? path.join(root, "src", specifier.slice(2)) :
    specifier.startsWith(".") ? path.resolve(path.dirname(filename), specifier) : null;
  if (!base) return null;
  return [base, ...[".ts", ".tsx", ".json", ".js", ".cjs", "/index.ts"].map(extension => base + extension)]
    .find(candidate => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

describe("selected browser catalogs and server authoring boundary", () => {
  it("preserves current IDs, bilingual text, source notices, source URLs and scenario behavior", () => {
    expect(publicConversations.scenarios).toEqual(getConversationScenarios());
    expect(publicConversations.patterns).toEqual(getSentencePatterns());
    expect(publicGrammar).toEqual(GRAMMAR_LESSONS);
    expect(publicWords).toEqual(getExpansionEntries());
    for (const held of Object.keys(GRAMMAR_REVIEW_HOLDS)) expect(publicGrammar.some(lesson => lesson.id === held)).toBe(false);
    for (const pattern of getSentencePatterns().filter(pattern => pattern.template)) {
      const values = Object.fromEntries(pattern.template!.freeSlots.map(slot => [slot.id, "María"]));
      expect(clientRender(pattern.id, values)).toEqual(serverRender(pattern.id, values));
      expect(clientRender(pattern.id, { ...values, unexpected: "X" })).toBeNull();
      expect(clientRender(pattern.id, Object.fromEntries(Object.keys(values).map(id => [id, "<script>"])))).toBeNull();
    }
  });

  it("checks generated catalogs against current selected source data without preparing or altering them", () => {
    const { prepareLearnerCatalogs } = require("../scripts/prepare-learner-catalogs.cjs") as {
      prepareLearnerCatalogs: (options: { check: boolean }) => { listeningWords: number };
    };
    expect(prepareLearnerCatalogs({ check: true }).listeningWords).toBe(publicListening.length);
    expect(JSON.stringify(publicListening)).not.toMatch(/rape someone|killer of people|quiquechcomichoa|beforeEn/iu);
    expect(publicImageSenses).toEqual(selectedSenses.corrections.map(({ id, display, meaningEn, meaningEs, sourceFactReviewHash }) =>
      ({ id, display, meaningEn, meaningEs, sourceFactReviewHash })));
  }, 15_000);

  it("retains ordinary nausea and source proof while applying learner-safe usage notes", () => {
    const entry = getVerifiedExpansionEntries().find(entry => entry.display === "elmoyawi")!;
    expect(entry.meaningEn).toBe("feel nauseated");
    expect(entry.sourceLocator.sourceFactReviewHash).toBe("cb91ad007c05bd1a0a10810e563c15e66351a6e5f118cd8f6a5efac1a1b2804e");
    expect(getLearnerSenseExclusionReason([entry.usageNoteEn, entry.usageNoteEs])).toBeNull();
  });

  it("physically excludes held image assets for URL, key and string manifests without changing safe records", () => {
    const { projectLearnerImageRecords } = require("../scripts/prepare-learner-catalogs.cjs") as {
      projectLearnerImageRecords: (records: Record<string, unknown>, options: {
        name: string; heldAssetUrls: Set<string>; exclusionReason: (values: unknown[]) => null;
      }) => Record<string, unknown>;
    };
    const base = "https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/images/";
    const held = `${base}unsafe.png`;
    const safe = { key: "safe.png", author: "Itzli", license: "Owner-generated illustration" };
    const fixture = { heldUrl: { url: held }, heldKey: { key: "/unsafe.png" }, heldString: "unsafe.png", safe };
    const before = structuredClone(fixture);
    expect(projectLearnerImageRecords(fixture, { name: "s3-word-images", heldAssetUrls: new Set([held]),
      exclusionReason: () => null })).toEqual({ safe });
    expect(fixture).toEqual(before);
    expect(projectLearnerImageRecords({ unsafe: { url: held }, safe: { url: `${base}safe.png` } }, {
      name: "openai-word-images", heldAssetUrls: new Set([held]), exclusionReason: () => null,
    })).toEqual({ safe: { url: `${base}safe.png` } });
  });

  it("preserves only the recorded reason for a removed candidate, without its image URL or raw meaning history", () => {
    const { projectLearnerImageHoldReasons } = require("../scripts/prepare-learner-catalogs.cjs") as {
      projectLearnerImageHoldReasons: (records: Record<string, unknown>, options: {
        name: string; heldAssets: Map<string, { reason: string }>; exclusionReason: (values: unknown[]) => null;
      }) => Record<string, { reason: string }>;
    };
    const url = "https://example.com/held.png";
    const reason = "A text-free compatible illustration needs review.";
    const projection = projectLearnerImageHoldReasons({ student: { url, alt: "old caption", beforeEn: "historical meaning" },
      flower: { url: "https://example.com/safe.png" } }, { name: "openai-word-images",
      heldAssets: new Map([[url, { reason }]]), exclusionReason: () => null });
    expect(projection).toEqual({ student: { reason } });
    expect(JSON.stringify(projection)).not.toMatch(/https:|old caption|historical meaning|beforeEn/);
  });

  it("cannot reach raw source history or server-only modules from any client entry point", () => {
    const clients = files(path.join(root, "src")).filter(filename => /^\s*['"]use client['"];?/u.test(readFileSync(filename, "utf8")));
    const visited = new Set<string>();
    const leaks: string[] = [];
    function walk(filename: string, chain: string[]) {
      if (visited.has(filename)) return;
      visited.add(filename);
      if (privateFiles.has(path.basename(filename))) {
        leaks.push([...chain, path.relative(root, filename)].join(" -> "));
        return;
      }
      if (filename.endsWith(".json")) return;
      for (const specifier of runtimeImports(filename)) {
        if (specifier === "server-only") leaks.push([...chain, path.relative(root, filename), "server-only"].join(" -> "));
        const imported = resolveImport(filename, specifier);
        if (imported) walk(imported, [...chain, path.relative(root, filename)]);
      }
    }
    clients.forEach(filename => walk(filename, []));
    expect(clients.length).toBeGreaterThan(20);
    expect(leaks).toEqual([]);
  });
});
