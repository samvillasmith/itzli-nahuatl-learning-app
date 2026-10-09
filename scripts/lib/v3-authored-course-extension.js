"use strict";

// Only the separately reviewed course extension. Pure reads and in-memory merge;
// lexicon publication and individual language-proof handlers are unaffected.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const EXPECTED = Object.freeze({
  base: "1ddbd8bf57b4d309a108777e0dcb7f8823c902362c1f99c45f5d77b1fa6c30da",
  extension: "75768b2535137fffbc6c9ccbbef37ab6a0fb3ec1ae6f4d33b9f8a2c5bb6c296d",
  peerReview: "c1e7d786aa185d89b5a8ca675ee45c2316ea18c404e3da643465c336f91a6eda",
  proposed: "724003826d296d4496c845e9c555032f8ab003f7262e4ec8cec5d62b9dde543e",
  source: "36711d31d650fde124cee333463b81daf63848d3ad1126d701d0003f4056716f",
});
const digest = value => crypto.createHash("sha256").update(value).digest("hex");
function frozenJson(file, expected) {
  const bytes = fs.readFileSync(file);
  assert.equal(digest(bytes), expected, `Course extension frozen input changed: ${path.basename(file)}`);
  return JSON.parse(bytes.toString("utf8"));
}
function applyReviewedCourseExtension(baseCourse, { root, research }) {
  const verification = path.resolve(research);
  const base = frozenJson(path.join(verification, "curriculum-original-base.private.json"), EXPECTED.base);
  const extension = frozenJson(path.join(verification, "curriculum-authored-extension.private.json"), EXPECTED.extension);
  const peer = frozenJson(path.join(verification, "grammar/curriculum-authored-extension-adversarial-review.private.json"), EXPECTED.peerReview);
  const proposed = frozenJson(path.join(verification, "curriculum-proposed-course.private.json"), EXPECTED.proposed);
  assert.equal(digest(fs.readFileSync(path.join(root, "src/data/nahuatlahtolli-course.json"))), EXPECTED.source);
  assert.equal(extension.baseCourseSha256, EXPECTED.base);
  assert.equal(extension.approvedSourceSha256, EXPECTED.source);
  assert.equal(peer.authoredExtensionSha256, EXPECTED.extension);
  assert.equal(peer.proposedCourseSha256, EXPECTED.proposed);
  assert.equal(peer.approvedSourceSha256, EXPECTED.source);
  assert.equal(peer.status, "passed-specified-source-meanings");
  assert.deepEqual(peer.requiredCorrections, []);
  assert.equal(base.units.length, 24);
  assert.deepEqual(baseCourse, base, "Changed original course needs independent review, not a silent merge.");
  assert.deepEqual(proposed.units.slice(0, base.units.length), base.units);
  assert.deepEqual(proposed.units.slice(base.units.length), extension.newUnits);
  assert.deepEqual(proposed.rules, [...base.rules, ...extension.newRules]);
  assert.deepEqual(proposed.phrases, [...base.phrases, ...extension.newPhrases]);
  assert.deepEqual(proposed.sources, [...base.sources, ...extension.newSources]);
  assert.equal(extension.newUnits.length, 13);
  assert.equal(extension.newUnits.reduce((n, unit) => n + unit.steps.length, 0), 93);
  assert.equal(extension.newPhrases.length, 26);
  assert.equal(new Set(proposed.units.map(unit => unit.id)).size, proposed.units.length);
  // These constraints are repeated by the publisher's normal whole-course
  // source/answer validators after this merge, including each new phrase.
  for (const entry of extension.newUnits) assert.match(entry.id, /^v3-(?:recall|practical)-[a-z0-9-]+$/);
  return { course: structuredClone(proposed), evidence: {
    baseCourseSha256: EXPECTED.base, authoredExtensionSha256: EXPECTED.extension,
    independentReviewSha256: EXPECTED.peerReview, mergedCourseSha256: EXPECTED.proposed,
    newUnits: 13, newTasks: 93, newExactApprovedPhrases: 26,
    originalUnitsPreserved: 24,
  } };
}
module.exports = { applyReviewedCourseExtension, EXPECTED };
