import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import OpenAI from "openai";
import { loadEnvConfig } from "@next/env";
import { CULTURE_MODULES, CULTURE_TIMELINE } from "../src/data/culture-lessons";
import { CURATED_DIALOGUES } from "../src/data/dialogue-overrides";
import { GRAMMAR_LABS } from "../src/data/grammar-labs";
import { GRAMMAR_LESSONS } from "../src/data/grammar-lessons";
import { LESSON_FOCUS_CARDS } from "../src/data/lesson-focus-cards";
import { NAHUATLAHTOLLI_COURSE } from "../src/lib/nahuatlahtolli";
import { CURRICULUM_PATH } from "../src/lib/curriculum";
import {
  getAllPrimerVocab,
  getAllUnits,
  getUnitConstructions,
  getUnitDialogueContent,
  getUnitLessonBlocks,
} from "../src/lib/db";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "src/i18n/es.generated.json");
const UI_OUTPUT = path.join(ROOT, "src/i18n/es.ui.generated.json");
const MODEL = process.env.OPENAI_TRANSLATION_MODEL || "gpt-4.1-mini";
const BATCH_SIZE = 70;

loadEnvConfig(ROOT);

function meaningful(value: string): boolean {
  const text = value.normalize("NFC").trim();
  if (text.length < 2 || !/[A-Za-z]/.test(text)) return false;
  if (/^(?:https?:|mailto:|data:|\/|@\/)/i.test(text)) return false;
  if (/^[\w./@-]+\.(?:ts|tsx|js|jsx|json|css|png|jpe?g|webp|mp3|wav)$/i.test(text)) return false;
  if (/(?:^|\s)(?:bg|text|border|rounded|shadow|hover|focus|sm|md|lg|xl|grid|flex|items|justify|gap|px|py|p|m|mt|mb|ml|mr|max|min|w|h|leading|tracking|font|transition|opacity|overflow|aspect|col|row|inset|top|bottom|left|right|z|space|block|hidden|inline|absolute|relative|sticky|fixed|cursor|select)-[^\s]+/.test(text)) {
    return false;
  }
  return true;
}

function collectDeep(value: unknown, output: Set<string>) {
  if (typeof value === "string") {
    if (meaningful(value)) output.add(value.normalize("NFC").trim());
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectDeep(item, output));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectDeep(item, output));
  }
}

function collectUiSourceStrings(output: Set<string>) {
  const sourceRoots = [
    path.join(ROOT, "src/app"),
    path.join(ROOT, "src/components"),
    path.join(ROOT, "src/lib/pronunciation.ts"),
  ];
  const files: string[] = [];
  const walk = (directory: string) => {
    const rootStat = fs.statSync(directory);
    if (rootStat.isFile()) {
      files.push(directory);
      return;
    }
    for (const name of fs.readdirSync(directory)) {
      const fullPath = path.join(directory, name);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) walk(fullPath);
      else if (/\.(ts|tsx)$/.test(name)) files.push(fullPath);
    }
  };
  sourceRoots.forEach(walk);

  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node)) {
        const text = node.getText(source).replace(/\s+/g, " ").trim();
        if (meaningful(text)) output.add(text);
      } else if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        if (ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent)) return;
        if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) return;
        if (
          ts.isJsxAttribute(node.parent) &&
          ts.isIdentifier(node.parent.name) &&
          node.parent.name.text === "className"
        ) return;
        const text = node.text.normalize("NFC").trim();
        if (meaningful(text)) output.add(text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}

function buildSourceCatalog(): string[] {
  const strings = new Set<string>();
  [
    CURRICULUM_PATH,
    GRAMMAR_LESSONS,
    GRAMMAR_LABS,
    LESSON_FOCUS_CARDS,
    CULTURE_MODULES,
    CULTURE_TIMELINE,
    CURATED_DIALOGUES,
    NAHUATLAHTOLLI_COURSE,
  ].forEach((value) => collectDeep(value, strings));

  const units = getAllUnits();
  collectDeep(units, strings);
  collectDeep(getAllPrimerVocab().map((item) => item.gloss_en), strings);
  for (const unit of units) {
    collectDeep(
      getUnitDialogueContent(unit.lesson_number).map((line) => line.translation_en),
      strings,
    );
    collectDeep(getUnitConstructions(unit.lesson_number), strings);
    collectDeep(getUnitLessonBlocks(unit.lesson_number), strings);
  }

  collectUiSourceStrings(strings);
  return [...strings].sort((a, b) => a.localeCompare(b, "en"));
}

function buildClientCatalog(): string[] {
  const strings = new Set<string>();
  collectUiSourceStrings(strings);
  collectDeep(GRAMMAR_LABS, strings);
  collectDeep(LESSON_FOCUS_CARDS, strings);
  collectDeep(GRAMMAR_LESSONS.map(({ title }) => title), strings);
  return [...strings];
}

function readExisting(): Record<string, string> {
  if (!fs.existsSync(OUTPUT)) return {};
  return JSON.parse(fs.readFileSync(OUTPUT, "utf8")) as Record<string, string>;
}

function save(catalog: Record<string, string>) {
  const sorted = Object.fromEntries(
    Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b, "en")),
  );
  fs.writeFileSync(OUTPUT, `${JSON.stringify(sorted, null, 2)}\n`);
}

function saveClientCatalog(catalog: Record<string, string>) {
  const clientCatalog = Object.fromEntries(
    buildClientCatalog()
      .filter((source) => catalog[source] && catalog[source] !== source)
      .map((source) => [source, catalog[source]])
      .sort(([a], [b]) => a.localeCompare(b, "en")),
  );
  fs.writeFileSync(UI_OUTPUT, `${JSON.stringify(clientCatalog, null, 2)}\n`);
}

async function translateBatch(client: OpenAI, batch: string[]) {
  const indexed = Object.fromEntries(batch.map((text, index) => [String(index), text]));
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are the senior Mexican Spanish localization editor for a serious Eastern Huasteca Nahuatl language course. Translate natural English into clear, concise, neutral Mexican Spanish.

Rules:
- Return one JSON object named "translations" with exactly the same numeric keys.
- Preserve all Nahuatl text, INALI spelling, morphemes, personal names, institution names, URLs, code, IDs, Markdown, punctuation, line breaks, and placeholders.
- If a value is already Spanish, Nahuatl, a code identifier, a CSS fragment, or not natural English, return it unchanged.
- Use learner-friendly Mexican Spanish. Use direct instructional imperatives such as "Escribe", "Escucha", "Elige" and "Practica".
- Translate "Eastern Huasteca Nahuatl" as "náhuatl de la Huasteca veracruzana" in prose. Keep the abbreviation EHN when present.
- Translate "Aztecs" as "aztecas" and "Mexica" as "mexicas". Do not imply that contemporary Nahua people are Aztecs.
- Preserve distinctions among word, form, phrase, sentence, lesson, and unit using palabra, forma, frase, oración, lección, and unidad.
- Preserve slash-separated gender alternatives where the English deliberately avoids assuming gender.
- Do not add explanations, warnings, quotation marks, or content that is not present in the source.`,
      },
      {
        role: "user",
        content: JSON.stringify({ strings: indexed }),
      },
    ],
  });

  const raw = completion.choices[0]?.message.content;
  if (!raw) throw new Error("Translation model returned no content");
  const parsed = JSON.parse(raw) as { translations?: Record<string, string> };
  if (!parsed.translations) throw new Error("Translation model omitted translations");
  return parsed.translations;
}

async function main() {
  const sourceStrings = buildSourceCatalog();
  const catalog = readExisting();
  const retryUnchanged = process.argv.includes("--retry-unchanged");
  const pending = sourceStrings.filter(
    (text) => !(text in catalog) || (retryUnchanged && catalog[text] === text),
  );

  console.log(`Spanish catalog: ${sourceStrings.length} source strings, ${pending.length} pending.`);
  if (pending.length === 0) {
    saveClientCatalog(catalog);
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required");

  const client = new OpenAI({ timeout: 120_000, maxRetries: 2 });
  for (let start = 0; start < pending.length; start += BATCH_SIZE) {
    const batch = pending.slice(start, start + BATCH_SIZE);
    const translations = await translateBatch(client, batch);
    batch.forEach((english, index) => {
      const spanish = translations[String(index)]?.normalize("NFC").trim();
      if (!spanish) throw new Error(`Missing translation for batch item ${index}: ${english}`);
      catalog[english] = spanish;
    });
    save(catalog);
    console.log(`Translated ${Math.min(start + batch.length, pending.length)} / ${pending.length}`);
  }
  saveClientCatalog(catalog);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
