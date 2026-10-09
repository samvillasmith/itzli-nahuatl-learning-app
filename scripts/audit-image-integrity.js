"use strict";

// Offline census only. No provider calls, credentials, downloads, or production writes.
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, loadTs, sha256 } = require("./lib/course-audio-inputs");
const { getAllUnits, getUnitVocab } = loadTs("src/lib/db.ts");
const { collapseVariants } = loadTs("src/data/variant-groups.ts");
const { getWordImage, getVocabCardImage, getVocabCardImageHold, isExactPublishedImageReview } = loadTs("src/data/word-images.ts");
const { orthographySearchVariants, toInaliOrthography } = loadTs("src/lib/orthography.ts");
const { LEXICAL_EXPANSION } = loadTs("src/data/lexical-expansion.ts");
const legacy = require("../src/data/word-images.json");
const openai = require("../src/data/openai-word-images.json");
const corrections = require("../src/data/image-content-review.json");
const AUDIT_DIR = path.join(ROOT, "data", "media-audit");
const normalize = (text) => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[¿¡?!.,\"'“”‘’()[\]{}]+/g, "").replace(/\s+/g, " ").trim();
function manifestCandidate(manifest, headword) {
  const variants = orthographySearchVariants(headword);
  for (const value of variants) if (manifest[value]) return manifest[value];
  const keys = new Set(variants.map(normalize).filter((key) => key.length > 1));
  const key = Object.keys(manifest).find((value) => keys.has(normalize(value)) && manifest[value]);
  return key ? manifest[key] : null;
}
function priorCandidate(card) {
  const headword = card.imageHeadword || card.headword;
  return manifestCandidate(openai, headword) || manifestCandidate(legacy, headword);
}
function buildAudit() {
  const cards = getAllUnits().flatMap((unit) => collapseVariants(getUnitVocab(unit.lesson_number), unit.lesson_number).cards.map((card) => {
    const original = priorCandidate(card);
    const selected = getVocabCardImage(card);
    const direct = getWordImage(card.headword, { safetyText: [card.gloss_en, card.part_of_speech] });
    const correction = corrections.cards.find((row) => row.id === card.id);
    const assetHold = corrections.assets.find((row) => row.url === original?.url);
    return { unit: unit.lesson_number, id: card.id, headword: toInaliOrthography(card.headword), source_headword: card.headword,
      gloss_en: card.gloss_en, image_headword: card.imageHeadword || card.headword,
      selected, prior_candidate: original, current_headword_candidate: direct,
      state: selected ? correction ? "corrected" : "assigned" : correction?.status === "structured-cue" ? "structured-cue" : correction?.status === "held" ? correction.category === "non-overridable-image-policy" ? "policy-hold" : correction.category === "legacy-photo-unreviewed" ? "legacy-review-hold" : "semantic-hold" : assetHold ? "image-review-hold" : "missing-or-unreviewed",
      reason: getVocabCardImageHold(card), prior_exact_review: Boolean(original && isExactPublishedImageReview(original)),
      selected_exact_review: Boolean(selected && isExactPublishedImageReview(selected)),
      selection_changed: original?.url !== selected?.url };
  }));
  const assetMap = new Map();
  for (const card of cards) for (const [role, image] of [["selected", card.selected], ["prior-candidate", card.prior_candidate], ["current-headword-candidate", card.current_headword_candidate]]) {
    if (!image?.url) continue;
    const asset = assetMap.get(image.url) || { image, uses: [], roles: [], exact_review: isExactPublishedImageReview(image) };
    if (!asset.uses.some((use) => use.id === card.id && use.unit === card.unit)) asset.uses.push({ id: card.id, unit: card.unit,
      headword: card.headword, gloss_en: card.gloss_en, state: card.state, reason: card.reason });
    if (!asset.roles.includes(role)) asset.roles.push(role);
    assetMap.set(image.url, asset);
  }
  const assets = [...assetMap.values()].sort((a, b) => Number(b.uses.some((use) => use.state === "semantic-hold" || use.state === "missing-or-unreviewed" || use.state === "corrected")) - Number(a.uses.some((use) => use.state === "semantic-hold" || use.state === "missing-or-unreviewed" || use.state === "corrected")) || a.uses[0].unit - b.uses[0].unit || a.uses[0].id - b.uses[0].id);
  assets.forEach((asset, index) => { asset.number = index + 1; });
  const selectedUrls = new Set(cards.filter((card) => card.selected).map((card) => card.selected.url));
  const expansion = LEXICAL_EXPANSION.map((entry) => ({ id: entry.id, headword: entry.headword, gloss_en: entry.english,
    candidate: getWordImage(entry.headword, { allowLegacyFallback: true, safetyText: [entry.english, entry.partOfSpeech] }) }));
  return { schema_version: 1, scope: "Local metadata and binding audit. Loading a contact sheet does not record pixel approval. Remote availability and pronunciation are separate checks.",
    inputs: Object.fromEntries(["src/data/word-images.ts", "src/data/image-content-review.json", "src/data/curated-unit-vocab.json", "src/data/excluded-vocab.ts", "src/data/openai-word-images.json", "src/data/word-images.json"].map((file) => [file, sha256(fs.readFileSync(path.join(ROOT, file)))])),
    summary: { visible_course_cards: cards.length, selected_course_images: cards.filter((card) => card.selected).length,
      distinct_selected_images: selectedUrls.size, semantic_hold_cards: cards.filter((card) => card.state === "semantic-hold").length,
      legacy_review_hold_cards: cards.filter((card) => card.state === "legacy-review-hold").length,
      policy_hold_cards: cards.filter((card) => card.state === "policy-hold").length,
      image_review_hold_cards: cards.filter((card) => card.state === "image-review-hold").length,
      missing_or_unreviewed_cards: cards.filter((card) => card.state === "missing-or-unreviewed").length,
      total_course_image_gaps: cards.filter((card) => !card.selected).length,
      structured_cue_cards: cards.filter((card) => card.state === "structured-cue").length,
      illustration_gaps_after_structured_cues: cards.filter((card) => !card.selected && card.state !== "structured-cue").length,
      corrected_bindings: cards.filter((card) => card.state === "corrected").length,
      selected_distinct_without_exact_review: new Set(cards.filter((card) => card.selected && !card.selected_exact_review).map((card) => card.selected.url)).size,
      all_contact_sheet_assets: assets.length, expansion_unillustrated: expansion.length,
      expansion_eligible_reuse_candidates: expansion.filter((entry) => entry.candidate).length,
      expansion_without_eligible_reuse: expansion.filter((entry) => !entry.candidate).length }, cards, assets, expansion };
}
const escape = (value) => String(value || "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
function writeGallery(audit) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.writeFileSync(path.join(AUDIT_DIR, "course-image-integrity.json"), JSON.stringify(audit, null, 2) + "\n");
  const rejected = audit.cards.filter((card) => card.selection_changed).map((card) => ({ id: card.id, unit: card.unit, headword: card.headword, gloss_en: card.gloss_en, state: card.state, reason: card.reason, original: card.prior_candidate, corrected: card.selected, candidate: card.current_headword_candidate }));
  fs.writeFileSync(path.join(AUDIT_DIR, "rejected-image-bindings.json"), JSON.stringify(rejected, null, 2) + "\n");
  const pageCount = Math.ceil(audit.assets.length / 24);
  const nav = Array.from({ length: pageCount }, (_, index) => `<a href="/page-${index + 1}.html">${index + 1}</a>`).join(" ");
  const template = (title, body) => `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escape(title)}</title><style>body{font-family:Arial,sans-serif;background:#faf9f6;color:#222;margin:16px}nav{margin:12px 0}a{margin-right:8px}.grid{display:grid;grid-template-columns:repeat(6,minmax(180px,1fr));gap:10px}.tile{background:white;border:1px solid #bbb;padding:6px;font-size:12px;overflow-wrap:anywhere}.tile img{width:100%;height:170px;object-fit:contain;background:#eee}.tile h2{font-size:13px;margin:4px 0}.tile p{margin:4px 0}.held{border:2px solid #b33}.needs{background:#fff4d9}small{font-size:10px}</style><h1>${escape(title)}</h1><nav><a href="/index.html">Summary</a><a href="/suspects.html">Changed / held bindings</a>${nav}</nav>${body}</html>`;
  const tile = (asset) => `<article class="tile ${asset.uses.some((use) => use.state.includes("hold") || use.state.includes("unreviewed")) ? "held" : ""} ${asset.exact_review ? "" : "needs"}"><h2>#${asset.number} · ${escape(asset.uses.map((use) => use.headword).join(" / "))}</h2><img src="${escape(asset.image.url.startsWith("/") ? "http://127.0.0.1:3000" + asset.image.url : asset.image.url)}" alt="${escape(asset.image.alt || asset.uses[0].headword)}" loading="eager"><p><b>Meaning:</b> ${escape(asset.uses.map((use) => use.gloss_en).join(" / "))}</p><p><b>Asset caption:</b> ${escape(asset.image.alt || asset.image.title || "No caption")}</p><p><b>Source:</b> ${escape(asset.image.source || "legacy")}; ${asset.exact_review ? "existing exact published-image approval" : "NO recorded exact pixel approval"}</p><p>${escape(asset.roles.join(", "))}</p><small>${escape(asset.uses.map((use) => `U${use.unit} #${use.id} ${use.state}${use.reason ? ": " + use.reason : ""}`).join(" | "))}</small></article>`;
  for (let index = 0; index < pageCount; index++) fs.writeFileSync(path.join(AUDIT_DIR, `page-${index + 1}.html`), template(`Course image inspection ${index + 1}/${pageCount}`, `<div class="grid">${audit.assets.slice(index * 24, index * 24 + 24).map(tile).join("")}</div>`));
  fs.writeFileSync(path.join(AUDIT_DIR, "index.html"), template("Course image integrity review", `<pre>${escape(JSON.stringify(audit.summary, null, 2))}</pre><p>All current selected, prior assigned, and matching current-headword candidates are included. Images load directly from their existing published URLs. No images are downloaded or generated. Page loading is not a pixel approval.</p>`));
  fs.writeFileSync(path.join(AUDIT_DIR, "suspects.html"), template("Changed and held image bindings", `<div class="grid">${audit.assets.filter((asset) => asset.uses.some((use) => ["corrected", "semantic-hold", "missing-or-unreviewed"].includes(use.state))).map(tile).join("")}</div>`));
  fs.writeFileSync(path.join(AUDIT_DIR, "serve.js"), `"use strict";\nconst http = require("node:http"); const fs = require("node:fs"); const path = require("node:path");\nconst root = __dirname;\nhttp.createServer((req, res) => { let request; try { request = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname); } catch { res.writeHead(400).end(); return; } const file = path.resolve(root, "." + (request === "/" ? "/index.html" : request)); if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; } if (!/\\.(html|json)$/.test(file) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; } res.writeHead(200, { "Content-Type": file.endsWith(".html") ? "text/html; charset=utf-8" : "application/json; charset=utf-8", "Cache-Control": "no-store" }); fs.createReadStream(file).pipe(res); }).listen(3002, "127.0.0.1", () => console.log("Image inspection: http://127.0.0.1:3002/"));\n`);
  writeExpansionGallery(audit);
}
function writeExpansionGallery(audit) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const entries = audit.expansion.filter((entry) => entry.candidate);
  fs.writeFileSync(path.join(AUDIT_DIR, "expansion-image-candidates.json"), JSON.stringify(audit.expansion, null, 2) + "\n");
  const pages = Math.ceil(entries.length / 24);
  const nav = Array.from({ length: pages }, (_, index) => `<a href="/expansion-${index + 1}.html">Expansion ${index + 1}</a>`).join(" ");
  for (let page = 0; page < pages; page++) {
    const tiles = entries.slice(page * 24, page * 24 + 24).map((entry, index) => `<article><h2>E${page * 24 + index + 1} · ${escape(entry.headword)}</h2><img src="${escape(entry.candidate.url.startsWith("/") ? "http://127.0.0.1:3000" + entry.candidate.url : entry.candidate.url)}" alt="${escape(entry.candidate.alt || entry.headword)}"><p><b>Meaning:</b> ${escape(entry.gloss_en)}</p><p><b>Asset caption:</b> ${escape(entry.candidate.alt || entry.candidate.title || "No caption")}</p><p>${escape(entry.id)} · ${isExactPublishedImageReview(entry.candidate) ? "existing exact-image review" : "no recorded exact-image review"}</p><p>Reuse candidate only; not assigned to the expansion card.</p></article>`).join("");
    fs.writeFileSync(path.join(AUDIT_DIR, `expansion-${page + 1}.html`), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Expansion image candidates ${page + 1}</title><style>body{font-family:Arial;margin:16px;background:#faf9f6}nav a{margin-right:12px}.grid{display:grid;grid-template-columns:repeat(6,minmax(180px,1fr));gap:10px}article{border:1px solid #aaa;background:white;padding:6px;font-size:12px;overflow-wrap:anywhere}h2{font-size:13px;margin:4px 0}img{width:100%;height:170px;object-fit:contain;background:#eee}p{margin:4px 0}</style><h1>Expansion reuse candidates ${page + 1}/${pages}</h1><nav><a href="/index.html">Course audit</a>${nav}</nav><div class="grid">${tiles}</div></html>`);
  }
}
function writeFinalAudit(audit) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  const snapshot = path.join(AUDIT_DIR, "course-image-integrity.json");
  if (fs.existsSync(snapshot)) {
    const original = JSON.parse(fs.readFileSync(snapshot, "utf8"));
    const numbers = new Map(original.assets.map((asset) => [asset.image.url, asset.number]));
    audit.assets.forEach((asset) => { asset.gallery_snapshot_number = numbers.get(asset.image.url) || null; });
    audit.gallery_snapshot_sha256 = sha256(fs.readFileSync(snapshot));
  }
  fs.writeFileSync(path.join(AUDIT_DIR, "course-image-integrity-final.json"), JSON.stringify(audit, null, 2) + "\n");
}
if (require.main === module) { const audit = buildAudit(); if (process.argv.includes("--write")) writeGallery(audit); else if (process.argv.includes("--write-expansion")) writeExpansionGallery(audit); else if (process.argv.includes("--write-final")) writeFinalAudit(audit); console.log(JSON.stringify(audit.summary, null, 2)); }
module.exports = { buildAudit, writeGallery, writeExpansionGallery, writeFinalAudit };
