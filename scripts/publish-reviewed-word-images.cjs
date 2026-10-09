#!/usr/bin/env node
"use strict";

// Dry run by default. Only exact human-approved image hashes may reach S3 or
// the app manifest. Original files and earlier S3 objects are never overwritten.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { ROOT, loadTs } = require("./lib/course-audio-inputs");
const { buildPublicationPlan, publishedImageRecord, assertPublicObject, hash, pendingImageFile } = require("./lib/reviewed-image-publication.cjs");

const PENDING = path.join(ROOT, "data/openai-word-images-pending.json");
const ACTIVE = path.join(ROOT, "src/data/openai-word-images.json");
const OUTPUT = path.join(ROOT, "data/image-publication");
const flag = name => process.argv.includes(name);
const value = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
function publicationConcurrency(args = process.argv.slice(2)) {
  const indexes = args.flatMap((arg, index) => arg === "--concurrency" ? [index] : []);
  if (!indexes.length) return 4;
  if (indexes.length !== 1) throw new Error("Specify --concurrency once, with an integer from 1 to 12");
  const supplied = args[indexes[0] + 1];
  if (!/^[1-9]\d*$/.test(supplied || "") || Number(supplied) > 12) {
    throw new Error("Image publication concurrency must be an integer from 1 to 12");
  }
  return Number(supplied);
}
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(temporary, file);
}
function aws(args) {
  const installed = "C:/Program Files/Amazon/AWSCLIV2/aws.exe";
  const binary = process.env.AWS_CLI_PATH || (process.platform === "win32" && fs.existsSync(installed) ? installed : "aws");
  return new Promise((resolve, reject) => {
    const child = spawn(binary, [...args, "--region", "us-east-1", "--output", "json", "--no-cli-pager",
      "--cli-connect-timeout", "15", "--cli-read-timeout", "60"], { windowsHide: true, shell: false });
    let output = "", error = "";
    child.stdout.on("data", bytes => { output += bytes; });
    child.stderr.on("data", bytes => { error += bytes; });
    child.on("error", () => reject(new Error("AWS CLI unavailable")));
    child.on("close", code => {
      if (code !== 0) {
        const failure = new Error("S3 operation failed; verify the configured AWS profile and bucket access");
        failure.missing = /(?:\(404\)|Not Found|NoSuchKey)/i.test(error);
        reject(failure);
      } else { try { resolve(output.trim() ? JSON.parse(output) : {}); } catch { reject(new Error("Invalid AWS CLI response")); } }
    });
  });
}

async function publishItem(plan, item, entry) {
  // Revalidate local bytes immediately before upload, including on resume.
  pendingImageFile(ROOT, entry);
  let existing;
  try { existing = await aws(["s3api", "head-object", "--bucket", plan.bucket, "--key", item.key, "--checksum-mode", "ENABLED"]); }
  catch (error) { if (!error.missing) throw error; }
  const checksum = Buffer.from(item.imageSha256, "hex").toString("base64");
  if (existing) {
    if (existing.ChecksumSHA256 !== checksum || existing.ContentLength !== item.bytes ||
        existing.CacheControl !== item.cacheControl || existing.ContentType !== item.contentType) {
      throw new Error(`Refusing to overwrite existing immutable object: ${item.entryId}`);
    }
  } else {
    await aws(["s3api", "put-object", "--bucket", plan.bucket, "--key", item.key, "--body", item.localPath,
      "--content-type", item.contentType, "--cache-control", item.cacheControl,
      "--checksum-algorithm", "SHA256", "--checksum-sha256", checksum, "--if-none-match", "*"]);
  }
  const response = await fetch(item.url, { cache: "no-store", signal: AbortSignal.timeout(60000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  assertPublicObject(response, item, bytes);
  return { entryId: item.entryId, url: item.url, imageSha256: item.imageSha256, reused: Boolean(existing), verifiedAt: new Date().toISOString() };
}

async function main() {
  const concurrency = publicationConcurrency();
  const pending = read(PENDING);
  const ledgerPath = value("--review-ledger");
  const ledgerBytes = ledgerPath ? fs.readFileSync(path.resolve(ROOT, ledgerPath)) : null;
  const reviewLedger = ledgerBytes ? JSON.parse(ledgerBytes.toString("utf8")) : null;
  const { isAppContentExcluded } = loadTs("src/lib/app-content-safety.ts");
  const plan = buildPublicationPlan(pending, { root: ROOT, isExcluded: isAppContentExcluded,
    reviewLedger, reviewLedgerHash: ledgerBytes ? hash(ledgerBytes) : null });
  if (flag("--prepare-review")) {
    const template = path.join(OUTPUT, "human-review.json");
    if (fs.existsSync(template)) throw new Error("Human review ledger already exists; preserve its decisions");
    write(template, { schema_version: 1, gallery: "http://127.0.0.1:8766/review.html",
      entries: plan.items.map(item => ({ entry_id: item.entryId, headword: item.headword,
        image_sha256: item.imageSha256, meaning_en: pending[item.pendingKey].meaning_en,
        meaning_es: pending[item.pendingKey].meaning_es, publication_approved: false, reviewed_by: "", reviewed_at: "" })) });
  }
  if (flag("--write-plan")) write(path.join(OUTPUT, "upload-plan.json"), plan);
  console.log(JSON.stringify({ mode: flag("--execute") ? "publish" : "dry-run", images: plan.count,
    approved: plan.approvedCount, awaitingHumanReview: plan.pendingCount, totalBytes: plan.totalBytes,
    cacheControl: "public,max-age=31536000,immutable", concurrency }));
  if (!flag("--execute")) return;
  if (!plan.approvedCount) throw new Error("No exact image hashes have human publication approval");
  await aws(["sts", "get-caller-identity"]);
  const approved = plan.items.filter(item => item.approved);
  const results = [];
  // Bounded independent uploads; no manifest publication if any fails.
  for (let start = 0; start < approved.length; start += concurrency) {
    const batch = await Promise.allSettled(approved.slice(start, start + concurrency).map(item => publishItem(plan, item, pending[item.pendingKey])));
    for (const result of batch) if (result.status === "fulfilled") results.push(result.value);
    write(path.join(OUTPUT, "upload-receipts.json"), { reviewLedgerSha256: hash(ledgerBytes), results });
    const failed = batch.find(result => result.status === "rejected");
    if (failed) throw failed.reason;
    console.log(`Verified ${results.length}/${approved.length} images.`);
  }
  // Never activate a different pending version after a concurrent edit.
  if (hash(fs.readFileSync(path.resolve(ROOT, ledgerPath))) !== hash(ledgerBytes)) {
    throw new Error("Human review decisions changed during upload; manifests left untouched");
  }
  const current = read(PENDING);
  for (const item of approved) {
    if (JSON.stringify(current[item.pendingKey]) !== JSON.stringify(pending[item.pendingKey])) {
      throw new Error("Pending image records changed during upload; manifests left untouched");
    }
  }
  const active = read(ACTIVE);
  const stamp = new Date().toISOString();
  const backup = path.join(OUTPUT, "archive", stamp.replace(/[:.]/g, "-"));
  write(path.join(backup, "active-before.json"), active);
  write(path.join(backup, "pending-before.json"), current);
  for (const item of approved) {
    active[item.entryId] = publishedImageRecord(pending[item.pendingKey], item, stamp);
    delete current[item.pendingKey];
  }
  write(ACTIVE, Object.fromEntries(Object.entries(active).sort(([a], [b]) => a.localeCompare(b, "en"))));
  write(PENDING, current);
  console.log(`Published ${approved.length} reviewed images with exact source and image hashes.`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { publicationConcurrency };
