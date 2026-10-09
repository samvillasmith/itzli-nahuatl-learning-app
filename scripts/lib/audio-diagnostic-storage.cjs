"use strict";
const fs = require("node:fs");
const path = require("node:path");

function isWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function privateDiagnosticDirectory(root, provider) {
  if (!["mms", "google", "openai"].includes(provider)) throw new Error("Unknown diagnostic audio provider");
  return path.join(path.resolve(root), "data", "audio-v3", "diagnostics", provider, "candidates");
}

function assertPrivateDiagnosticDirectory(root, output) {
  const resolved = path.resolve(output);
  if (isWithin(path.join(root, "public"), resolved)) {
    throw new Error("Diagnostic audio must stay outside public/. Use a private data/audio-v3/diagnostics directory.");
  }
  // Reject a private-looking path whose existing ancestor resolves into public/.
  let ancestor = resolved;
  while (!fs.existsSync(ancestor) && path.dirname(ancestor) !== ancestor) ancestor = path.dirname(ancestor);
  if (fs.existsSync(ancestor) && isWithin(path.join(root, "public"), fs.realpathSync(ancestor))) {
    throw new Error("Diagnostic audio output resolves into public/ through a linked directory.");
  }
  return resolved;
}

module.exports = { isWithin, privateDiagnosticDirectory, assertPrivateDiagnosticDirectory };
