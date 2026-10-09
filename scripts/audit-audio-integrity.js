"use strict";

// Read-only course/media audit. No env-file loading, provider calls or DB download.
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, loadTs, loadCurrentAudioManifest, sha256 } = require("./lib/course-audio-inputs");

function wavInfo(file) {
  if (!fs.existsSync(file)) return { status: "missing-file" };
  const bytes = fs.readFileSync(file);
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") return { status: "invalid-wav" };
  let format = null, data = null;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(offset + 4);
    const label = bytes.toString("ascii", offset, offset + 4);
    const streaming = label === "data" && size === 0xffffffff;
    const end = streaming ? bytes.length : offset + 8 + size;
    if (end > bytes.length) return { status: "truncated-wav" };
    if (label === "fmt " && size >= 16) format = {
      encoding: bytes.readUInt16LE(offset + 8), channels: bytes.readUInt16LE(offset + 10),
      sample_rate: bytes.readUInt32LE(offset + 12), bytes_per_second: bytes.readUInt32LE(offset + 16),
      bits: bytes.readUInt16LE(offset + 22),
    };
    if (label === "data") data = bytes.subarray(offset + 8, end);
    offset = end + (size % 2);
  }
  if (!format || !data?.length || !format.bytes_per_second) return { status: "empty-or-invalid-wav" };
  let peak = null;
  if (format.encoding === 1 && format.bits === 16) {
    peak = 0;
    for (let offset = 0; offset + 2 <= data.length; offset += 2) peak = Math.max(peak, Math.abs(data.readInt16LE(offset)));
  }
  return { status: peak === 0 ? "silent-wav" : "valid-wav", bytes: bytes.length,
    streaming_size_header: bytes.readUInt32LE(4) === 0xffffffff,
    duration_seconds: Number((data.length / format.bytes_per_second).toFixed(3)), peak,
    sha256: sha256(bytes), ...format };
}

function collectAudio() {
  const manifest = loadCurrentAudioManifest(); // Fails before any download if the local snapshot is absent.
  const { vocabCardAudioUrl } = loadTs("src/lib/audio.ts");
  const { getExpansionEntries } = loadTs("src/data/lexical-expansion.ts");
  const { getConversationScenarios, getSentencePatterns } = loadTs("src/data/conversation-scenarios.ts");
  const { NAHUATLAHTOLLI_COURSE } = loadTs("src/lib/nahuatlahtolli.ts");
  const { toInaliOrthography } = loadTs("src/lib/orthography.ts");
  const rows = manifest.records.map((record) => ({
    area: `core-${record.kind}`, id: record.id, text: record.runtime_text, units: record.units,
    url: record.kind === "vocab" ? vocabCardAudioUrl(Number(record.id),
      record.recording_available ? record.existing_audio_url || undefined : null) : record.existing_audio_url,
    legacy_hold: record.legacy_hold, content_review: record.content_review,
    audio_kind: record.existing_audio_url?.startsWith("https://tlahtolli.coerll.utexas.edu/") ? "source" : "synthetic",
    generation_allowed: record.generation_allowed, source_refs: record.source_refs,
  }));
  for (const entry of getExpansionEntries()) rows.push({ area: "expansion", id: entry.cardId,
    text: entry.sourceSpelling, url: entry.audio.url, audio_kind: "source", source_refs: [entry.source] });
  for (const scenario of getConversationScenarios()) for (const turn of scenario.turns) {
    for (const value of [turn, ...turn.options]) rows.push({ area: value === turn ? "conversation-model" :
      value.intent === "repeat" ? "conversation-repeat" : value.correct ? "conversation-reply" : "conversation-distractor",
    id: `${scenario.id}:${turn.id}:${value.id}`, text: value.nahuatl, url: value.audioUrl,
    audio_kind: value.audioKind, source_refs: value.sources,
    generation_hold: /\d/.test(value.nahuatl) ? "Spoken numbers need a source-supported reading before synthesis." : null });
  }
  for (const pattern of getSentencePatterns()) for (const slot of pattern.slots) for (const choice of slot.choices) {
    rows.push({ area: "sentence-choice", id: `${pattern.id}:${choice.id}`, text: choice.nahuatl,
      url: choice.audioUrl, audio_kind: choice.audioKind, source_refs: [choice.source] });
  }
  const benchmarks = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/audio-source-benchmark.json"), "utf8"));
  for (const row of benchmarks.records) rows.push({ area: "listening-benchmark", id: row.id,
    text: row.runtime_text, url: row.native_source_audio_url, audio_kind: "source", source_refs: row.source_refs });
  for (const lesson of NAHUATLAHTOLLI_COURSE.lessons) {
    for (const [index, word] of lesson.vocabulary.entries()) rows.push({ area: "source-course-word",
      id: `${lesson.number}:${index + 1}`, text: word.headword, url: word.audioUrl,
      audio_kind: "source", source_url: lesson.originalUrl });
    for (const [index, link] of lesson.mediaLinks.entries()) if (link.type === "audio") rows.push({ area: "source-course-audio-link",
      id: `${lesson.number}:${index + 1}`, text: null, url: link.url, audio_kind: "source", source_url: lesson.originalUrl });
  }
  const key = (text) => toInaliOrthography(text).toLowerCase().replace(/[¿¡?!.,:;“”"/]/g, "").replace(/\s+/g, " ").trim();
  const summary = {};
  for (const area of new Set(rows.map((row) => row.area))) {
    const group = rows.filter((row) => row.area === area);
    const unavailable = group.filter((row) => !row.url);
    summary[area] = { placements: group.length, assigned: group.length - unavailable.length,
      unavailable: unavailable.length, unique_unavailable_texts: new Set(unavailable.map((row) => key(row.text))).size };
  }
  const core = rows.filter((row) => row.area.startsWith("core-") && !row.url);
  const v3 = rows.filter((row) => /^(conversation-|sentence-choice)/.test(row.area) && !row.url);
  const candidates = manifest.records.filter((row) => row.legacy_hold && row.generation_allowed && !row.native_source_audio_url);
  const candidateKeys = new Set(candidates.map((row) => key(row.runtime_text)));
  const v3Candidates = v3.filter((row) => !row.generation_hold);
  summary.total = {
    core_unavailable: core.length, core_unique_unavailable_texts: new Set(core.map((row) => key(row.text))).size,
    core_legacy_held_files: manifest.records.filter((row) => row.legacy_hold).length,
    core_source_alternatives: manifest.records.filter((row) => row.legacy_hold && row.recording_available).length,
    core_candidate_identities: candidates.length, core_unique_candidate_texts: candidateKeys.size,
    v3_unavailable_placements: v3.length, v3_unique_unavailable_texts: new Set(v3.map((row) => key(row.text))).size,
    v3_unique_candidate_texts: new Set(v3Candidates.map((row) => key(row.text))).size,
    v3_number_recipe_holds: new Set(v3.filter((row) => row.generation_hold).map((row) => key(row.text))).size,
    combined_unique_candidate_texts: new Set([...candidateKeys, ...v3Candidates.map((row) => key(row.text))]).size,
  };
  return { rows, summary, key };
}

/** Current fixed surfaces require an explicit reference/text binding. A clip
 * available for a different identity is not coverage for this identity. */
function collectPublishedAudio(options = {}) {
  const inventory = options.inventory || require("./lib/all-course-audio-inventory.cjs").buildAllCourseAudioInventory();
  const manifest = options.manifest || JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/generated-course-audio.json"), "utf8"));
  if (!Array.isArray(inventory.records) || !Array.isArray(manifest.assets) || !Array.isArray(manifest.bindings) ||
    !Array.isArray(manifest.held_reference_ids) || !Array.isArray(manifest.lesson_assets)) throw new Error("Invalid published audio inventory/manifest");
  const index = options.index || loadTs("src/lib/generated-audio.ts").createGeneratedAudioIndex(manifest);
  if (inventory.recipe_id !== index.recipeId) throw new Error("Published audio recipe does not match the current fixed inventory");
  const pair = (referenceId, text) => JSON.stringify([referenceId, text]);
  const generatedPairs = new Set(manifest.bindings.map(binding => pair(binding.reference_id, binding.runtime_text)));
  const sourcePairs = new Set((manifest.source_bindings || []).map(binding => pair(binding.reference_id, binding.runtime_text)));
  const expected = new Map(inventory.records.map(row => [row.id, row]));
  function resolve(referenceId, text) {
    const row = expected.get(referenceId);
    if (!row) return { state: "unbound", url: null, reason: "Reference is absent from the current fixed inventory" };
    if (row.content_accuracy_hold || index.isHeld(referenceId)) return { state: "held", url: null,
      reason: row.hold_reasons?.join("; ") || "Published accuracy hold" };
    if (row.status === "recipe-or-structure-hold") return { state: "held", url: null,
      reason: row.hold_reasons?.join("; ") || "Recipe or structure hold" };
    if (!row.runtime_aliases.includes(text)) return { state: "unbound", url: null, reason: "Text is not an explicit current inventory alias" };
    const key = pair(referenceId, text);
    const source = sourcePairs.has(key) && index.sourceLookup(text, referenceId);
    if (source) return { state: "source", url: source, generated: false };
    const asset = generatedPairs.has(key) && index.lookup(text, referenceId);
    if (asset && (!row.job_id || row.job_id === asset.id)) return { state: "generated", url: asset.url, generated: true, asset_id: asset.id };
    return { state: "unbound", url: null, reason: asset ? "Published asset differs from the current exact text/recipe job" : "No valid exact published reference/text binding" };
  }
  const rows = inventory.records.map(row => ({ area: row.id.split(":")[0], id: row.id, reference_id: row.id,
    text: row.runtime_text, units: row.units, legacy_hold: Boolean(row.legacy_recording_hold), scope: row.scope,
    ...resolve(row.id, row.runtime_text) }));
  const aliasGaps = inventory.records.filter(row => !row.content_accuracy_hold && !index.isHeld(row.id) && row.status !== "recipe-or-structure-hold")
    .flatMap(row => row.runtime_aliases.filter(text => resolve(row.id, text).state === "unbound")
      .map(text => ({ reference_id: row.id, text, reason: resolve(row.id, text).reason })));
  const exactOriginalAssets = new Set(rows.filter(row => row.state === "source").map(row => row.url));
  const listedOriginalAssets = new Set(index.sourceUrls);
  const isHeldSourceUrl = url => index.isSourceUrlHeld ? index.isSourceUrlHeld(url) :
    (manifest.held_source_urls || []).includes(url);
  const externalOriginalAssets = new Set((inventory.external_media_links || []).map(link => link.url));
  const heldOriginalAssetUrls = [...externalOriginalAssets].filter(isHeldSourceUrl).sort();
  const expectedOriginalAssets = new Set([...exactOriginalAssets, ...externalOriginalAssets].filter(url => !isHeldSourceUrl(url)));
  // The runtime index deliberately omits held URLs. Inspect raw published
  // metadata separately so that its filtering cannot conceal a release leak.
  const publishedHeldOriginalAssetUrls = [...new Set([...(manifest.source_asset_urls || []),
    ...(manifest.source_bindings || []).map(binding => binding.url),
    ...manifest.lesson_assets.flatMap(group => group.source_urls || [])])].filter(isHeldSourceUrl).sort();
  const summary = { scope: "Current published fixed learner audio bindings; exact reference/text/recipe checks, no HTTP requests",
    recipe_id: inventory.recipe_id, reference_records: rows.length,
    available_reference_records: rows.filter(row => row.url).length,
    generated_reference_records: rows.filter(row => row.state === "generated").length,
    source_reference_records: rows.filter(row => row.state === "source").length,
    held_reference_records: rows.filter(row => row.state === "held").length,
    held_reference_ids: rows.filter(row => row.state === "held").map(row => row.reference_id),
    unbound_reference_records: rows.filter(row => row.state === "unbound").length,
    unbound_runtime_aliases: aliasGaps.length,
    published_synthetic_assets: index.assets.length,
    used_synthetic_assets: new Set(rows.filter(row => row.state === "generated").map(row => row.asset_id)).size,
    linked_original_assets: listedOriginalAssets.size,
    exact_utterance_original_assets: exactOriginalAssets.size,
    extra_passage_or_asset_urls: [...listedOriginalAssets].filter(url => !exactOriginalAssets.has(url)).length,
    unlisted_original_asset_urls: [...expectedOriginalAssets].filter(url => !listedOriginalAssets.has(url)).length,
    held_original_asset_urls: heldOriginalAssetUrls.length,
    published_held_original_asset_urls: publishedHeldOriginalAssetUrls.length,
    invalid_manifest_assets: manifest.assets.length - index.assets.length,
    orphan_manifest_reference_ids: [...new Set([...manifest.bindings, ...(manifest.source_bindings || [])]
      .map(binding => binding.reference_id))].filter(id => !expected.has(id)).length,
    free_substitutions_included: false };
  return { rows, summary, aliasGaps, resolve, inventory, sourceAssetUrls: [...listedOriginalAssets],
    heldOriginalAssetUrls, publishedHeldOriginalAssetUrls };
}

async function checkRemote(url) {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(12000) });
    const contentType = response.headers.get("content-type") || "";
    const mediaType = /^(audio\/|application\/(octet-stream|ogg))/i.test(contentType);
    return { status: response.ok && mediaType ? "reachable-audio" : "http-or-content-type-failure",
      http_status: response.status, content_type: contentType,
      content_length: response.headers.get("content-length"), final_url: response.url };
  } catch (error) {
    return { status: "transport-unverified", reason: error.name === "TimeoutError" ? "timeout" : error.message };
  }
}

async function main() {
  const remote = process.argv.includes("--check-remote") || process.argv.includes("--remote");
  const legacy = process.argv.includes("--legacy-baseline");
  const audit = legacy ? collectAudio() : collectPublishedAudio();
  const { rows, summary } = audit;
  if (legacy) summary.scope = "Historical raw/legacy media fields; excludes current published binding coverage";
  const assetMap = new Map();
  for (const row of rows) if (row.url) {
    if (!assetMap.has(row.url)) assetMap.set(row.url, []);
    assetMap.get(row.url).push(row.reference_id || `${row.area}:${row.id}`);
  }
  for (const url of audit.sourceAssetUrls || []) if (!assetMap.has(url)) assetMap.set(url, ["linked-original-passage-or-asset"]);
  const assets = [...assetMap].map(([url, placements]) => ({ url, placements,
    check: url.startsWith("/") ? wavInfo(path.join(ROOT, "public", url.split("?")[0])) : { status: "remote-not-checked" } }));
  if (remote) {
    const external = assets.filter((asset) => /^https:\/\//.test(asset.url));
    let cursor = 0;
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (cursor < external.length) {
        const asset = external[cursor++];
        asset.check = await checkRemote(asset.url);
      }
    }));
  }
  summary.assets = { unique: assets.length, local: assets.filter((asset) => asset.url.startsWith("/")).length,
    unique_local_files: new Set(assets.filter((asset) => asset.url.startsWith("/")).map((asset) => asset.url.split("?")[0])).size,
    remote: assets.filter((asset) => /^https:\/\//.test(asset.url)).length,
    checks: Object.fromEntries([...new Set(assets.map((asset) => asset.check.status))].map((status) =>
      [status, assets.filter((asset) => asset.check.status === status).length])) };
  const directory = path.join(ROOT, "data/media-integrity");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, legacy ? "audio-legacy-baseline.json" : remote ? "audio-live.json" : "audio.json"), JSON.stringify({ schema_version: 2,
    generated_at: new Date().toISOString(), remote_checked: remote, summary,
    limitations: ["File and HTTP checks do not establish heard pronunciation or speaker validation.",
      "Historical mismatching recordings remain held; current exact source/generated bindings are audited separately.",
      "This is an inventory and transport audit; it does not synthesize or release new recordings.",
      "Free personal name/place substitutions are outside the finite published inventory; component cues and lexical facts do not release productive-context holds.",
      "Default remote assets are not HTTP checked. External originals retain their notices and browser-managed offline limits."],
    source_files: Object.fromEntries(["src/data/generated-course-audio.json", "src/lib/generated-audio.ts", "scripts/lib/all-course-audio-inventory.cjs", "src/lib/audio.ts", "src/lib/db.ts"]
      .map((name) => [name, sha256(fs.readFileSync(path.join(ROOT, name)))])), rows, assets,
    unbound_aliases: audit.aliasGaps || [], held_original_asset_urls: audit.heldOriginalAssetUrls || [],
    published_held_original_asset_urls: audit.publishedHeldOriginalAssetUrls || [] }, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 2));
  if (assets.some((asset) => !["valid-wav", "reachable-audio", "remote-not-checked", "transport-unverified"].includes(asset.check.status))) process.exitCode = 1;
  if (!legacy && (summary.unbound_reference_records || summary.unbound_runtime_aliases || summary.invalid_manifest_assets || summary.orphan_manifest_reference_ids || summary.unlisted_original_asset_urls || summary.published_held_original_asset_urls)) process.exitCode = 1;
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { wavInfo, collectAudio, collectPublishedAudio, checkRemote };
