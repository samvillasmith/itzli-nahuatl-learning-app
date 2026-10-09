"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Mirrors the existing Next tracing exclusions. No broad src/ or node_modules
// removal: runtime source catalogs, notices and the course-only DB must remain.
const PRIVATE_ROOT_DIRECTORIES = ["data", "secrets", "secret", ".clerk", ".vercel"];

function privateReleasePathReason(root, absolute, pathApi = path) {
  const relative = pathApi.relative(pathApi.resolve(root), pathApi.resolve(absolute)).replaceAll("\\", "/");
  if (relative === ".." || relative.startsWith("../") || pathApi.isAbsolute(relative)) return null;
  const key = pathApi === path.win32 ? relative.toLowerCase() : relative;
  if (PRIVATE_ROOT_DIRECTORIES.some(directory => key === directory || key.startsWith(`${directory}/`))) {
    return "private-research-or-service-directory";
  }
  if (/^fcn_master_lexicon_phase8_6_primer\.sqlite[^/]*$/.test(key)) return "private-master-dictionary";
  if (/^\.env[^/]*$/.test(key)) return "private-environment-file";
  if (key === "src/data/audio-candidates-v3.json") return "private-audio-candidate-ledger";
  return null;
}

function validatedTrace(value, filename) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1 ||
      !Array.isArray(value.files) || value.files.some(ref => typeof ref !== "string" ||
        !ref.trim() || ref.includes("\0") || path.posix.isAbsolute(ref) || path.win32.isAbsolute(ref) || /^[a-z]:/iu.test(ref))) {
    throw new Error(`Invalid release trace shape: ${filename}`);
  }
  return value;
}

function resolveTraceReference(filename, reference) {
  return path.resolve(path.dirname(filename), reference.replace(/[\\/]/g, path.sep));
}

function releaseTraceFiles(output) {
  output = path.resolve(output);
  if (!fs.existsSync(output)) throw new Error("Build the app locally before checking the actual release traces.");
  if (fs.lstatSync(output).isSymbolicLink() || !fs.statSync(output).isDirectory()) throw new Error(`Invalid release trace output directory: ${output}`);
  const canonicalOutput = fs.realpathSync(output);
  const functions = path.join(canonicalOutput, "output", "functions");
  const devCache = path.join(canonicalOutput, "dev");
  const traces = new Set(), visited = new Set();
  const within = (base, target) => {
    const relative = path.relative(base, target);
    return relative === "" || relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  };
  function visit(directory) {
    const canonical = fs.realpathSync(directory);
    if (visited.has(canonical)) return;
    visited.add(canonical);
    for (const entry of fs.readdirSync(canonical, { withFileTypes: true })) {
      const filename = path.join(canonical, entry.name);
      // Next 16 reserves output/dev for its separate development cache. Only
      // that top-level tree is excluded; a production route named dev is traced.
      if (canonical === canonicalOutput && entry.name === "dev") continue;
      if (entry.isSymbolicLink()) {
        // Platform adapters alias RSC function outputs to their canonical .func
        // directory. Follow only that namespace and validate the final target;
        // ordinary server/runtime links still fail closed.
        if (!within(functions, filename) || !entry.name.endsWith(".func")) {
          throw new Error(`Linked build path is not eligible for release trace processing: ${filename}`);
        }
        let target;
        try { target = fs.realpathSync(filename); } catch {
          throw new Error(`Broken or cyclic function alias is not eligible for release trace processing: ${filename}`);
        }
        const config = path.join(target, ".vc-config.json");
        if (!within(canonicalOutput, target) || !within(functions, target) || !path.basename(target).endsWith(".func") ||
            within(devCache, target) || privateReleasePathReason(path.dirname(canonicalOutput), target) ||
            !fs.statSync(target).isDirectory() || !fs.existsSync(config) || !fs.lstatSync(config).isFile()) {
          throw new Error(`Function alias target is not an internal production build directory: ${filename}`);
        }
        visit(target);
        continue;
      }
      if (entry.isDirectory()) visit(filename);
      else if (entry.isFile() && entry.name.endsWith(".nft.json")) traces.add(filename);
    }
  }
  visit(output);
  if (!traces.size) throw new Error("No build traces found.");
  return [...traces].sort();
}

function readReleaseTraces(output) {
  return releaseTraceFiles(output).map(filename => {
    const original = fs.readFileSync(filename, "utf8");
    return { filename, original, trace: validatedTrace(JSON.parse(original), filename) };
  });
}

module.exports = { privateReleasePathReason, validatedTrace, resolveTraceReference, releaseTraceFiles, readReleaseTraces };
