"use strict";

// Shared by the server runtime and offline release verification.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require("node:crypto");

// Preserve every content/provenance field. Sorting object keys accommodates
// JSONB serialization without accepting omitted fields, added prose or edits.
function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  throw new Error("Reviewed tutor context must contain only plain JSON values.");
}

function chunkSha256(chunk) {
  if (!chunk || typeof chunk.kind !== "string" || typeof chunk.content !== "string" ||
      !chunk.metadata || Array.isArray(chunk.metadata) || typeof chunk.metadata !== "object") {
    throw new Error("Tutor context requires exact content, kind and provenance metadata.");
  }
  return crypto.createHash("sha256").update(canonicalJson({
    kind: chunk.kind, content: chunk.content, metadata: chunk.metadata,
  })).digest("hex");
}

function createReviewedTutorGate(seeds) {
  const approved = new Map();
  for (const seed of seeds) {
    const digest = chunkSha256(seed);
    if (digest !== seed.sha256 || approved.has(digest)) throw new Error("Invalid or duplicated reviewed tutor seed.");
    approved.set(digest, canonicalJson({ kind: seed.kind, content: seed.content, metadata: seed.metadata }));
  }
  return function selectReviewedTutorChunk(candidate) {
    try {
      const encoded = approved.get(chunkSha256(candidate));
      // Return the locally reviewed fields, never extra properties from a
      // remote row. Remote numeric IDs or claimed review hashes grant no trust.
      return encoded ? JSON.parse(encoded) : null;
    } catch { return null; }
  };
}

module.exports = { canonicalJson, chunkSha256, createReviewedTutorGate };
