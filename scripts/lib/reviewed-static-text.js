"use strict";
const crypto = require("node:crypto");
const review = require("../config/reviewed-instructional-text.json");

// Educational text review is tied to an exact file and line. It never grants
// permission to illustrate a word or to admit a changed/unreviewed explanation.
const approved = new Set(review.entries.map(entry => `${entry.file}\0${entry.sha256}`));
function isReviewedStaticText(file, line) {
  const normalizedFile = file.replaceAll("\\", "/");
  const digest = crypto.createHash("sha256").update(line.trim()).digest("hex");
  return approved.has(`${normalizedFile}\0${digest}`);
}
module.exports = { isReviewedStaticText };
