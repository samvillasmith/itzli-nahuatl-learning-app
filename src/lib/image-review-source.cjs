"use strict";

function isPublishedImageReviewSource(value) {
  return typeof value === "string" && (
    /^openai-(?:word|reviewed)-image-audit\/contact-sheet-\d{2}$/.test(value) ||
    /^v3-image-publication\/[a-f0-9]{64}$/.test(value)
  );
}

module.exports = { isPublishedImageReviewSource };
