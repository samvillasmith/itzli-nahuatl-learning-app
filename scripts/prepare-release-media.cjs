#!/usr/bin/env node
"use strict";

// Local files only. No generation, credentials, remote storage or learner data.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { isWithin } = require("./lib/audio-diagnostic-storage.cjs");
const PREFIXES = ["candidates", "google-candidates", "openai-candidates"];
const FILE_PATTERN = /^[A-Za-z0-9_-]+--[a-f0-9]{12}--[a-f0-9]{12}\.(?:wav|json|mp3|ogg|opus|aac|flac|pcm)$/;
const SHA = /^[a-f0-9]{64}$/;
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const slash = (value) => value.split(path.sep).join("/");

function checkedPath(root, relative) {
  root = path.resolve(root);
  const absolute = path.resolve(root, relative);
  if (!isWithin(root, absolute)) throw new Error(`Path escapes workspace: ${relative}`);
  let current = root;
  for (const part of path.relative(root, absolute).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (stat.isSymbolicLink() || !isWithin(fs.realpathSync(root), fs.realpathSync(current))) {
      throw new Error(`Linked path is not eligible for diagnostic archival: ${relative}`);
    }
  }
  return absolute;
}

function diagnosticRelative(relative) {
  const parts = relative.split("/");
  return parts.length === 5 && parts[0] === "public" && parts[1] === "audio-v3" &&
    PREFIXES.includes(parts[2]) && ["vocab", "dialogue", "benchmark", "_tests"].includes(parts[3]) && FILE_PATTERN.test(parts[4]);
}

function walkFiles(root, relative, result = []) {
  const absolute = checkedPath(root, relative);
  if (!fs.existsSync(absolute)) return result;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const child = `${relative}/${entry.name}`;
    checkedPath(root, child);
    if (entry.isDirectory()) walkFiles(root, child, result);
    else if (entry.isFile()) result.push(child);
    else throw new Error(`Non-regular diagnostic asset: ${child}`);
  }
  return result;
}

function learnerReferences(root) {
  const references = new Set();
  for (const file of walkFiles(root, "src")) {
    if (!/\.(?:json|ts|tsx|js|jsx)$/.test(file) || file === "src/data/audio-candidates-v3.json") continue;
    const text = fs.readFileSync(checkedPath(root, file), "utf8");
    for (const match of text.matchAll(/\/audio-v3\/(?:candidates|google-candidates|openai-candidates)\/[A-Za-z0-9_/-]+\.(?:wav|mp3|ogg|opus|aac|flac|pcm)/g)) {
      references.add(`public${match[0]}`);
    }
  }
  return references;
}

function planDiagnostics(root = path.resolve(__dirname, "..")) {
  root = fs.realpathSync(path.resolve(root));
  const references = learnerReferences(root);
  const files = PREFIXES.flatMap((prefix) => walkFiles(root, `public/audio-v3/${prefix}`)).sort();
  const entries = [];
  for (const relative of files) {
    if (!diagnosticRelative(relative)) throw new Error(`Unrecognized file in diagnostic prefix; no file moved: ${relative}`);
    if (references.has(relative)) throw new Error(`Learner recording must be preserved; no file moved: ${relative}`);
    const absolute = checkedPath(root, relative);
    const provider = relative.split("/")[2];
    if (provider === "candidates") {
      if (!/\.(?:wav|json)$/.test(relative)) throw new Error(`Unsupported MMS diagnostic format: ${relative}`);
      const sidecar = absolute.replace(/\.wav$/, ".json");
      const metadataFile = relative.endsWith(".json") ? absolute : sidecar;
      if (!fs.existsSync(metadataFile)) throw new Error(`MMS diagnostic lacks its provenance sidecar: ${relative}`);
      const record = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
      if (record.model_id !== "facebook/mms-tts-nhe" || record.review_status !== "unreviewed") {
        throw new Error(`Unconfirmed diagnostic status; no file moved: ${relative}`);
      }
      if (relative.endsWith(".wav") && (!SHA.test(record.audio_sha256) || record.audio_sha256 !== hash(absolute))) {
        throw new Error(`MMS diagnostic bytes differ from provenance: ${relative}`);
      }
    }
    entries.push({ source: relative, sha256: hash(absolute), bytes: fs.statSync(absolute).size, state: "planned" });
  }
  return { root, entries, count: entries.length, audioFiles: entries.filter((e) => !e.source.endsWith(".json")).length };
}

function archiveDiagnostics(root = path.resolve(__dirname, "..")) {
  const plan = planDiagnostics(root);
  if (!plan.count) return { ...plan, archived: 0, manifest: null };
  // Keep archive paths short enough for Windows deployments and restores.
  const run = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const archiveRoot = `data/audio-v3/release-archives/${run}`;
  const manifestRelative = `${archiveRoot}/rollback-manifest.json`;
  const manifestFile = checkedPath(plan.root, manifestRelative);
  const manifest = { schemaVersion: 1, createdAt: new Date().toISOString(), scope: "private-diagnostic-audio-only", status: "archiving",
    entries: plan.entries.map((e) => ({ ...e, archive: `${archiveRoot}/files/${e.source}` })) };
  // Validate every final path and source byte hash before beginning any move.
  for (const entry of manifest.entries) {
    if (fs.existsSync(checkedPath(plan.root, entry.archive))) throw new Error("Archive destination exists; refusing overwrite");
    if (hash(checkedPath(plan.root, entry.source)) !== entry.sha256) throw new Error("Diagnostic changed after planning");
  }
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  const persist = () => fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  persist();
  for (const entry of manifest.entries) {
    const destination = checkedPath(plan.root, entry.archive);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    checkedPath(plan.root, entry.archive);
    fs.renameSync(checkedPath(plan.root, entry.source), destination);
    if (hash(destination) !== entry.sha256) throw new Error("Archived diagnostic hash mismatch; consult rollback manifest");
    entry.state = "archived";
    persist();
  }
  manifest.status = "archived";
  persist();
  return { count: plan.count, audioFiles: plan.audioFiles, archived: plan.count, manifest: manifestRelative };
}

function restoreDiagnostics(manifestRelative, root = path.resolve(__dirname, "..")) {
  root = fs.realpathSync(path.resolve(root));
  const relative = slash(path.relative(root, path.resolve(root, manifestRelative)));
  if (!/^data\/audio-v3\/release-archives\/[A-Za-z0-9_-]+\/rollback-manifest\.json$/.test(relative)) {
    throw new Error("Rollback manifest must be in the private diagnostic archive");
  }
  const manifestFile = checkedPath(root, relative);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  if (manifest.schemaVersion !== 1 || manifest.scope !== "private-diagnostic-audio-only" || !Array.isArray(manifest.entries)) {
    throw new Error("Invalid diagnostic rollback manifest");
  }
  const archivePrefix = `${path.posix.dirname(relative)}/files/`;
  for (const entry of manifest.entries) {
    if (!diagnosticRelative(entry.source) || entry.archive !== `${archivePrefix}${entry.source}` || !SHA.test(entry.sha256)) {
      throw new Error("Unsafe diagnostic rollback record");
    }
    const source = checkedPath(root, entry.source), archive = checkedPath(root, entry.archive);
    if (!["planned", "archived", "restored"].includes(entry.state)) throw new Error("Invalid diagnostic rollback state");
    // Recover an interruption between rename and journal update from actual bytes.
    const originalExists = fs.existsSync(source), archivedExists = fs.existsSync(archive);
    if (originalExists === archivedExists || hash(originalExists ? source : archive) !== entry.sha256) {
      throw new Error("Rollback conflict; refusing to overwrite any file");
    }
    entry.state = originalExists ? "restored" : "archived";
  }
  let restored = 0;
  for (const entry of manifest.entries.filter((e) => e.state === "archived")) {
    const destination = checkedPath(root, entry.source);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    checkedPath(root, entry.source);
    fs.renameSync(checkedPath(root, entry.archive), destination);
    entry.state = "restored";
    fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
    restored += 1;
  }
  manifest.status = "restored";
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return { restored, manifest: relative, note: "The release guard will archive restored diagnostics again before the next build." };
}

function main(argv = process.argv.slice(2)) {
  if (argv[0] === "--restore" && argv.length === 2) return restoreDiagnostics(argv[1]);
  if (argv.length !== 1 || !["--check", "--archive"].includes(argv[0])) throw new Error("Use --check, --archive, or --restore <private rollback manifest>");
  if (argv[0] === "--archive") return archiveDiagnostics();
  const plan = planDiagnostics();
  if (plan.count) throw new Error(`${plan.count} diagnostic files remain public; run the authorized --archive release preparation.`);
  return { count: 0, status: "No diagnostic audio in public release prefixes" };
}
if (require.main === module) {
  try { console.log(JSON.stringify(main(), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { PREFIXES, checkedPath, diagnosticRelative, planDiagnostics, archiveDiagnostics, restoreDiagnostics, main };
