"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { assertImagePublicationGuard } = require("./image-depiction-guardrails");

const BUCKET = "nahuatl-language";
const REGION = "us-east-1";
const CACHE_CONTROL = "public,max-age=31536000,immutable";
const IMAGE_BASE = `https://${BUCKET}.s3.${REGION}.amazonaws.com/`;
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const within = (root, file) => {
  const relative = path.relative(root, file);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
};

function pendingImageFile(root, entry) {
  const local = path.resolve(root, entry.local_path || "");
  const roots = ["data/image-production", "data/image-review-v3", "data/image-pilots", "data/image-batches", "public/generated/word-images/openai"]
    .map(name => path.resolve(root, name));
  if (!roots.some(allowed => within(allowed, local)) || path.extname(local).toLowerCase() !== ".png") {
    throw new Error(`Pending image is outside the image review folders: ${entry.entry_id}`);
  }
  const real = fs.realpathSync(local);
  if (!roots.filter(allowed => fs.existsSync(allowed)).some(allowed => within(fs.realpathSync(allowed), real))) {
    throw new Error(`Pending image resolves outside the image review folders: ${entry.entry_id}`);
  }
  const bytes = fs.readFileSync(real);
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      !/^[a-f0-9]{64}$/.test(entry.image_sha256 || "") || hash(bytes) !== entry.image_sha256) {
    throw new Error(`Pending image bytes no longer match the reviewed PNG: ${entry.entry_id}`);
  }
  return { localPath: real, bytes: bytes.length };
}

function buildPublicationPlan(pending, { root, isExcluded, reviewLedger, reviewLedgerHash } = {}) {
  if (typeof isExcluded !== "function") throw new Error("Learner exclusion check is required");
  const reviews = new Map();
  for (const review of reviewLedger?.entries || []) {
    if (!review.entry_id || reviews.has(review.entry_id)) throw new Error("Duplicate or missing reviewed entry identity");
    reviews.set(review.entry_id, review);
  }
  const items = Object.entries(pending).map(([pendingKey, entry]) => {
    const headword = entry.headword || pendingKey;
    if (!entry.entry_id || entry.provenance?.entry_id !== entry.entry_id || entry.provenance?.headword !== headword ||
        entry.provenance.meaning_en !== entry.meaning_en || entry.provenance.meaning_es !== entry.meaning_es) {
      throw new Error(`Image source or selected meaning changed: ${headword}`);
    }
    if (isExcluded(entry.entry_id, headword, entry.meaning_en, entry.meaning_es)) {
      throw new Error(`Excluded learner content cannot be published: ${headword}`);
    }
    assertImagePublicationGuard(headword, entry);
    const file = pendingImageFile(root, entry);
    const review = reviews.get(entry.entry_id);
    if (review && (review.image_sha256 !== entry.image_sha256 || review.headword !== headword ||
        review.meaning_en !== entry.meaning_en || review.meaning_es !== entry.meaning_es)) {
      throw new Error(`Human review no longer matches the exact image and meaning: ${headword}`);
    }
    const approved = review?.publication_approved === true && Boolean(review.reviewed_by?.trim()) &&
      typeof review.reviewed_at === "string" && Number.isFinite(Date.parse(review.reviewed_at));
    if (approved && !/^[a-f0-9]{64}$/.test(reviewLedgerHash || "")) throw new Error("Exact human review ledger hash required");
    const slug = headword.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "word";
    const identity = entry.entry_id.replace(/[^a-zA-Z0-9_-]/g, "-");
    const key = `itzli-app/images/v3/${slug}-${identity}-${entry.image_sha256}.png`;
    return { pendingKey, headword, entryId: entry.entry_id, imageSha256: entry.image_sha256, ...file, key,
      url: IMAGE_BASE + key, cacheControl: CACHE_CONTROL, contentType: "image/png", approved,
      reviewSource: approved ? `v3-image-publication/${reviewLedgerHash}` : null };
  });
  const ids = new Set(items.map(item => item.entryId));
  if (ids.size !== items.length || new Set(items.map(item => item.key)).size !== items.length) {
    throw new Error("Duplicate image publication identity or S3 key");
  }
  if ([...reviews.keys()].some(id => !ids.has(id))) throw new Error("Review ledger includes an image absent from the current pending set");
  return { bucket: BUCKET, region: REGION, count: items.length,
    approvedCount: items.filter(item => item.approved).length,
    pendingCount: items.filter(item => !item.approved).length,
    totalBytes: items.reduce((sum, item) => sum + item.bytes, 0), items };
}

function publishedImageRecord(entry, item, reviewedAt) {
  if (!item.approved || !item.reviewSource) throw new Error("Human publication approval required");
  return { url: item.url, license: entry.source === "itzli" ? "First-party generated typography" : "OpenAI-generated illustration",
    author: entry.author, alt: entry.alt, source: entry.source, model: entry.model,
    quality: entry.quality, size: entry.size, output_format: entry.output_format, generated_at: entry.generated_at,
    entry_id: entry.entry_id, image_sha256: entry.image_sha256, meaning_en: entry.meaning_en, meaning_es: entry.meaning_es,
    provenance: entry.provenance, automated_safety_review: entry.automated_safety_review,
    reviewed_at: reviewedAt, review_status: "approved", review_scope: "exact-published-image",
    reviewed_url: item.url, review_source: item.reviewSource };
}

function assertPublicObject(response, item, remoteBytes) {
  if (response.status !== 200 || response.headers.get("content-type")?.split(";")[0].trim() !== "image/png" ||
      response.headers.get("cache-control")?.toLowerCase().replace(/\s+/g, "") !== CACHE_CONTROL ||
      remoteBytes.length !== item.bytes || hash(remoteBytes) !== item.imageSha256) {
    throw new Error(`Public S3 bytes or cache headers do not match: ${item.entryId}`);
  }
}

module.exports = { BUCKET, REGION, CACHE_CONTROL, hash, pendingImageFile, buildPublicationPlan, publishedImageRecord, assertPublicObject };
