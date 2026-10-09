"use strict";

// Reproducible offline notice collection. Never reads environment files,
// credentials, course packets or databases, and never downloads packages.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "public/third-party-notices.txt");
const MANIFEST = path.join(ROOT, "third-party-notices-manifest.json");
const LICENSE_NAME = /^(?:licen[cs]e|copying|notice|copyright)(?:$|[._-])/i;
const hash = text => crypto.createHash("sha256").update(text).digest("hex");
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const relative = file => path.relative(ROOT, file).replaceAll("\\", "/");
const sorted = entries => entries.sort((a, b) => a.localeCompare(b, "en"));

function noticeFile(file, options = {}) {
  const text = fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
  if (!text.trim()) throw new Error(`Empty software notice: ${relative(file)}`);
  return { file: relative(file), sha256: hash(text), ...options, text };
}

function walkNoticeFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) return [];
    if (entry.isDirectory()) return walkNoticeFiles(file);
    return entry.isFile() && LICENSE_NAME.test(entry.name) ? [file] : [];
  });
}

function packageNoticeFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isFile() && LICENSE_NAME.test(entry.name)) return [noticeFile(file)];
    if (entry.isDirectory() && /^(?:licenses?|notices?)$/i.test(entry.name)) return walkNoticeFiles(file).map(file => noticeFile(file));
    return [];
  });
}

function readmeLicense(directory) {
  const readme = fs.readdirSync(directory).find(file => /^readme(?:\.[^.]+)?$/i.test(file));
  if (!readme) return [];
  const file = path.join(directory, readme);
  if (!fs.statSync(file).isFile()) return [];
  const text = fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
  const match = text.match(/^#{1,6}\s+licen[cs]e\s*$\n([\s\S]*?)(?=^#{1,6}\s|$(?![\s\S]))/im);
  if (!match || !/copyright|permission|redistribution/i.test(match[1])) return [];
  return [{ file: relative(file), scope: "License section only", sha256: hash(match[1]), text: match[1] }];
}

function repositoryUrl(metadata) {
  const repository = typeof metadata.repository === "string" ? metadata.repository : metadata.repository?.url;
  return repository?.replace(/^git\+/, "") ?? metadata.homepage ?? null;
}

function createThirdPartyNotices() {
  const lock = readJson(path.join(ROOT, "package-lock.json"));
  const fallbacks = readJson(path.join(ROOT, "scripts/licenses/notice-fallbacks.json"));
  const installed = [];
  const missing = [];
  for (const location of sorted(Object.keys(lock.packages))) {
    const recorded = lock.packages[location];
    if (!location || recorded.dev) continue;
    const directory = path.join(ROOT, location);
    const file = path.join(directory, "package.json");
    // Platform-specific optional packages absent on this build host are not
    // part of the installed distribution. Preparation runs on each host.
    if (!fs.existsSync(file)) continue;
    const metadata = readJson(file);
    if (metadata.version !== recorded.version) throw new Error(`Installed package differs from lock: ${location}`);
    let notices = packageNoticeFiles(directory);
    if (!notices.length) notices = readmeLicense(directory);
    let attributionNote = null;
    if (!notices.length && ["@next/env", "@next/swc-win32-x64-msvc"].includes(metadata.name)) {
      notices = [noticeFile(path.join(ROOT, "node_modules/next/license.md"), { scope: "Parent Next.js project license" })];
      attributionNote = "This Next.js companion package declares MIT; the parent project's full notice is retained.";
    }
    if (!notices.length && /^@next\/swc-/.test(metadata.name)) {
      notices = [noticeFile(path.join(ROOT, "node_modules/next/license.md"), { scope: "Parent Next.js project license" })];
      attributionNote = "This Next.js platform package declares MIT; the parent project's full notice is retained.";
    }
    if (!notices.length && ["client-only", "server-only"].includes(metadata.name)) {
      notices = [noticeFile(path.join(ROOT, "node_modules/react/LICENSE"), { scope: "Parent React project license" })];
      attributionNote = "This React marker package declares MIT and identifies the React project; the parent project's full notice is retained.";
    }
    const fallback = fallbacks[`${metadata.name}@${metadata.version}`];
    if (!notices.length && fallback) {
      if (fallback.registryIntegrity && fallback.registryIntegrity !== recorded.integrity) {
        throw new Error(`Pinned upstream notice package integrity changed: ${metadata.name}`);
      }
      notices = [noticeFile(path.join(ROOT, fallback.file), { sourceUrl: fallback.sourceUrl })];
      if (notices[0].sha256 !== fallback.sha256) throw new Error(`Pinned upstream notice changed: ${metadata.name}`);
      attributionNote = fallback.note;
    }
    if (!notices.length) missing.push(`${metadata.name}@${metadata.version}`);
    installed.push({ location, name: metadata.name, version: metadata.version,
      declaredLicense: metadata.license ?? recorded.license ?? null,
      repository: repositoryUrl(metadata), attributionNote,
      packageMetadataSha256: hash(fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n")), notices });
  }
  if (missing.length) throw new Error(`Production packages have no preserved license text: ${missing.join(", ")}`);

  const next = installed.find(pkg => pkg.name === "next");
  if (!next) throw new Error("Installed production Next.js package is required for bundled notices.");
  const compiled = path.join(ROOT, "node_modules/next/dist/compiled");
  const bundled = sorted(walkNoticeFiles(compiled)).map(file => {
    let directory = path.dirname(file);
    let metadata = null;
    while (directory.startsWith(compiled) && directory !== compiled) {
      const manifest = path.join(directory, "package.json");
      if (fs.existsSync(manifest)) { metadata = readJson(manifest); break; }
      directory = path.dirname(directory);
    }
    const bundledLocation = path.relative(compiled, path.dirname(file)).replaceAll("\\", "/");
    return { name: metadata?.name ?? bundledLocation, version: metadata?.version ?? null,
      declaredLicense: metadata?.license ?? null, bundleOwner: `next@${next.version}`,
      location: `node_modules/next/dist/compiled/${bundledLocation}`, notice: noticeFile(file) };
  });
  const lines = ["Itzli - third-party software notices", "",
    "These notices preserve the licenses supplied with installed production dependencies and Next.js bundled components.",
    "They cover software, not course text, images or recordings. Original upstream licenses apply to each component;",
    "Itzli's project or course-content licenses do not replace or restrict these upstream grants.",
    "Package declarations and supplied notices are reported as provided. Where an upstream version is unrecorded,",
    "the exact installed Next.js owner version and notice-file SHA-256 are given instead.", ""];
  for (const pkg of installed) {
    lines.push("=".repeat(78), `${pkg.name}@${pkg.version}`, `Installed package: ${pkg.location}`,
      `Declared license: ${typeof pkg.declaredLicense === "string" ? pkg.declaredLicense : JSON.stringify(pkg.declaredLicense)}`,
      ...(pkg.repository ? [`Upstream: ${pkg.repository}`] : []),
      ...(pkg.attributionNote ? [pkg.attributionNote] : []), "");
    for (const notice of pkg.notices) lines.push(`Notice source: ${notice.file}${notice.scope ? ` (${notice.scope})` : ""}`,
      ...(notice.sourceUrl ? [`Upstream notice: ${notice.sourceUrl}`] : []), `SHA-256: ${notice.sha256}`, "", notice.text.trimEnd(), "");
  }
  lines.push("=".repeat(78), `Additional supplied notices bundled by next@${next.version}`, "");
  for (const pkg of bundled) lines.push("-".repeat(78),
    `${pkg.name}${pkg.version ? `@${pkg.version}` : " (upstream version unrecorded)"} - bundled by ${pkg.bundleOwner}`,
    `Bundle location: ${pkg.location}`, `Notice source: ${pkg.notice.file}`,
    `SHA-256: ${pkg.notice.sha256}`, "", pkg.notice.text.trimEnd(), "");
  const text = `${lines.join("\n")}\n`;
  const stripText = notice => Object.fromEntries(Object.entries(notice).filter(([key]) => key !== "text"));
  const manifest = { schemaVersion: 1, scope: "Installed non-dev production packages and supplied Next.js compiled notices",
    platform: process.platform, architecture: process.arch,
    packageLockSha256: hash(fs.readFileSync(path.join(ROOT, "package-lock.json"), "utf8").replace(/\r\n?/g, "\n")),
    output: "public/third-party-notices.txt", outputSha256: hash(text),
    packages: installed.map(pkg => ({ ...pkg, notices: pkg.notices.map(stripText) })),
    bundledNotices: bundled.map(pkg => ({ ...pkg, notice: stripText(pkg.notice) })) };
  return { text, manifest };
}

function prepareThirdPartyNotices({ check = false } = {}) {
  const result = createThirdPartyNotices();
  const manifestText = `${JSON.stringify(result.manifest, null, 2)}\n`;
  for (const [file, text] of [[OUTPUT, result.text], [MANIFEST, manifestText]]) {
    if (check) {
      if (!fs.existsSync(file) || fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n") !== text) {
        throw new Error("Third-party software notices are missing or stale. Prepare them locally before release.");
      }
    } else if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text) fs.writeFileSync(file, text);
  }
  return result;
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || !["--check", "--prepare"].includes(args[0])) throw new Error("Use --prepare or --check.");
    const { manifest } = prepareThirdPartyNotices({ check: args[0] === "--check" });
    console.log(`Third-party notices verified: ${manifest.packages.length} installed production packages and ${manifest.bundledNotices.length} Next.js bundled notice texts.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { createThirdPartyNotices, prepareThirdPartyNotices, OUTPUT, MANIFEST };
