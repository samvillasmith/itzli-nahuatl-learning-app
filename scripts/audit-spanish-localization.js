const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const FULL = require(path.join(ROOT, "src/i18n/es.generated.json"));
const UI = require(path.join(ROOT, "src/i18n/es.ui.generated.json"));
const OVERRIDES = require(path.join(ROOT, "src/i18n/es.overrides.json"));
const sourceRoots = [path.join(ROOT, "src/app"), path.join(ROOT, "src/components")];
const files = [];

function walk(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (/\.(ts|tsx)$/.test(target)) files.push(target);
    return;
  }
  for (const name of fs.readdirSync(target)) walk(path.join(target, name));
}

sourceRoots.forEach(walk);

const missingFull = new Set();
const missingUi = new Set();

for (const file of files) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      const arg = name === "tr" ? node.arguments[1] : name === "translate" ? node.arguments[0] : null;
      if (arg && ts.isStringLiteralLike(arg)) {
        const text = arg.text.normalize("NFC");
        const fullTranslation = OVERRIDES[text] ?? FULL[text];
        const uiTranslation = OVERRIDES[text] ?? UI[text];
        if (!(text in FULL) && !(text in OVERRIDES)) missingFull.add(text);
        if (name === "translate" && fullTranslation && fullTranslation !== text && uiTranslation !== fullTranslation) {
          missingUi.add(text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
}

const expected = {
  Grammar: "Gramática",
  Vocabulary: "Vocabulario",
  "Eastern Huasteca Nahuatl": "Náhuatl de la Huasteca veracruzana",
  "Privacy Policy": "Política de privacidad",
  "B1-oriented": "Orientado a B1",
  "CC BY-SA Source Course": "Curso fuente CC BY-SA",
};
const wrongCritical = Object.entries(expected).filter(([english, spanish]) => (OVERRIDES[english] ?? FULL[english]) !== spanish);
const uiBytes = fs.statSync(path.join(ROOT, "src/i18n/es.ui.generated.json")).size;

if (missingFull.size || missingUi.size || wrongCritical.length || uiBytes > 200_000) {
  if (missingFull.size) console.error("Missing full-catalog strings:\n" + [...missingFull].sort().join("\n"));
  if (missingUi.size) console.error("Missing client-catalog strings:\n" + [...missingUi].sort().join("\n"));
  if (wrongCritical.length) console.error("Incorrect critical translations:", wrongCritical);
  if (uiBytes > 200_000) console.error(`Client Spanish catalog is too large: ${uiBytes} bytes`);
  process.exit(1);
}

console.log(`Spanish localization audit passed (${Object.keys(FULL).length} full strings, ${Object.keys(UI).length} client strings, ${uiBytes} client bytes).`);
