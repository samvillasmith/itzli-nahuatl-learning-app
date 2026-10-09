#!/usr/bin/env node
"use strict";
// No credentials are read for prepare/local publication. Authorized S3 upload
// reads only the private upload file (or explicitly chosen existing profile).
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {spawn} = require("node:child_process");
const release = require("./generate-all-course-audio.cjs");
const ROOT = path.resolve(__dirname, "..");
const DELIVERY = path.join(release.OUT, "delivery");
const S3_BASE = `https://nahuatl-language.s3.us-east-1.amazonaws.com/itzli-app/audio-v3/${release.RECIPE}/`;
const sha = buffer => crypto.createHash("sha256").update(buffer).digest("hex");

function command(executable, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {cwd: ROOT, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"]}); let stdout = ""; let stderr = "";
    child.stdout.on("data", chunk => {stdout += chunk;}); child.stderr.on("data", chunk => {stderr += chunk;});
    child.on("error", reject); child.on("exit", code => code === 0 ? resolve(stdout) : reject(new Error(`Command failed (${code}): ${stderr.slice(0, 1400)}`)));
  });
}

async function prepare(plan) {
  fs.mkdirSync(DELIVERY, {recursive: true});
  let cursor = 0; let prepared = 0;
  const ffmpeg = "C:/ProgramData/chocolatey/bin/ffmpeg.exe";
  const completed = plan.jobs.map(job => ({job, master: release.completedJob(job)}));
  if (completed.some(item => !item.master)) throw new Error("Cannot publish an incomplete synthesis plan");
  async function worker() {
    for (;;) {
      const index = cursor++; if (index >= completed.length) return;
      const {job, master} = completed[index]; const file = path.join(DELIVERY, `${job.job_id}.mp3`); const sidecar = path.join(DELIVERY, `${job.job_id}.json`);
      if (!fs.existsSync(file) || !fs.existsSync(sidecar)) {
        const temporary = path.join(DELIVERY, `${job.job_id}.working.mp3`);
        await command(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", path.join(release.OUT, "clips", `${job.job_id}.wav`), "-map_metadata", "-1", "-codec:a", "libmp3lame", "-b:a", "96k", "-ar", "24000", "-ac", "1", "-write_xing", "0", "-id3v2_version", "0", temporary]);
        fs.renameSync(temporary, file);
        const bytes = fs.readFileSync(file);
        if (bytes.length < 1000) throw new Error("Implausibly small MP3 delivery file");
        fs.writeFileSync(sidecar, JSON.stringify({id: job.job_id, recipe_id: release.RECIPE, ssml_sha256: master.ssml_sha256, master_audio_sha256: master.audio_sha256, audio_sha256: sha(bytes), byte_length: bytes.length, duration_seconds: master.wave.duration_seconds, delivery_encoding: "MP3", delivery_bitrate: 96000, sample_rate: 24000, channels: 1}, null, 2) + "\n");
      }
      const metadata = JSON.parse(fs.readFileSync(sidecar, "utf8"));
      if (metadata.master_audio_sha256 !== master.audio_sha256 || metadata.audio_sha256 !== sha(fs.readFileSync(file))) throw new Error("Delivery does not match immutable source");
      prepared++; if (prepared % 250 === 0) console.log(JSON.stringify({prepared, total: completed.length}));
    }
  }
  await Promise.all(Array.from({length: 8}, worker));
  const assets = completed.map(({job}) => ({...JSON.parse(fs.readFileSync(path.join(DELIVERY, `${job.job_id}.json`), "utf8")), url: S3_BASE + `${job.job_id}.mp3`}));
  fs.writeFileSync(path.join(release.OUT, "delivery-manifest.private.json"), JSON.stringify({recipe_id: release.RECIPE, assets}, null, 2) + "\n");
  console.log(JSON.stringify({prepared: assets.length, delivery_bytes: assets.reduce((sum, item) => sum + item.byte_length, 0), master_bytes: completed.reduce((sum, item) => sum + item.master.byte_length, 0)}));
  return assets;
}

function awsEnvironment(useProfile) {
  const env = {...process.env, AWS_REGION: "us-east-1", AWS_DEFAULT_REGION: "us-east-1", AWS_PAGER: "", AWS_EC2_METADATA_DISABLED: "true"};
  if (!useProfile) {
    delete env.AWS_ACCESS_KEY_ID; delete env.AWS_SECRET_ACCESS_KEY; delete env.AWS_SESSION_TOKEN;
    const file = path.join(ROOT, "secrets/aws-audio-upload.env");
    if (!fs.existsSync(file)) throw new Error("Private AWS upload file is missing");
    const allowed = new Set(["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"]);
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      if (line.trim().startsWith("#")) continue;
      const eq = line.indexOf("="); if (eq < 0) continue;
      const key = line.slice(0, eq).trim(); if (!allowed.has(key)) continue;
      let value = line.slice(eq + 1).trim(); if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
      if (value) env[key] = value;
    }
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) throw new Error("Please save the new secret in the private AWS upload file");
    delete env.AWS_PROFILE; delete env.AWS_DEFAULT_PROFILE;
  }
  return env;
}

async function upload(assets, useProfile) {
  const aws = "C:/Program Files/Amazon/AWSCLIV2/aws.exe"; const env = awsEnvironment(useProfile);
  const profile = useProfile ? ["--profile", useProfile] : [];
  const identity = JSON.parse(await command(aws, [...profile, "sts", "get-caller-identity", "--region", "us-east-1", "--output", "json"], env));
  if (identity.Account !== "709184586125") throw new Error("AWS credentials do not belong to the account authorized by the owner; no S3 upload attempted");
  await command(aws, [...profile, "s3api", "head-bucket", "--bucket", "nahuatl-language", "--expected-bucket-owner", "709184586125", "--region", "us-east-1"], env);
  const existingIds = await protectImmutableUpload(assets, {aws, env, profile});
  const pending = assets.filter(asset => !existingIds.has(asset.id));
  console.log(JSON.stringify({authorized_account: identity.Account, bucket: "nahuatl-language", prefix: `itzli-app/audio-v3/${release.RECIPE}/`, files: assets.length}));
  // Upload only files named by the final reviewed inventory, never old pilot
  // clips, discarded English cues, sidecars, or temporary encoder output.
  const staging = path.join(release.OUT, "upload-staging", sha(JSON.stringify(pending.map(asset => asset.id))));
  fs.mkdirSync(staging, {recursive: true});
  for (const asset of pending) {
    const target = path.join(staging, `${asset.id}.mp3`);
    if (!fs.existsSync(target)) fs.copyFileSync(path.join(DELIVERY, `${asset.id}.mp3`), target);
    if (sha(fs.readFileSync(target)) !== asset.audio_sha256) throw new Error("Upload staging does not match final delivery hashes");
  }
  if (pending.length) await command(aws, [...profile, "s3", "cp", staging, `s3://nahuatl-language/itzli-app/audio-v3/${release.RECIPE}/`, "--recursive", "--exclude", "*", "--include", "*.mp3", "--no-follow-symlinks", "--only-show-errors", "--content-type", "audio/mpeg", "--cache-control", "public,max-age=31536000,immutable", "--metadata", `recipe_id=${release.RECIPE},provider=google-tts`, "--region", "us-east-1"], env);
  fs.writeFileSync(path.join(release.OUT, "s3-upload.private.json"), JSON.stringify({uploaded_at: new Date().toISOString(), account: identity.Account, bucket: "nahuatl-language", prefix: S3_BASE, count: assets.length, files: assets.map(asset => ({id: asset.id, url: asset.url, byte_length: asset.byte_length, audio_sha256: asset.audio_sha256}))}, null, 2) + "\n");
  console.log("S3 upload completed; public byte/HTTP validation is next.");
}

async function protectImmutableUpload(assets, authenticated = null) {
  if (authenticated) {
    const {aws, env, profile} = authenticated;
    // One scoped listing avoids thousands of speculative public HEAD requests.
    // No other prefix, bucket, profile, or account is inspected.
    const listed = JSON.parse(await command(aws, [...profile, "s3api", "list-objects-v2", "--bucket", "nahuatl-language", "--prefix", `itzli-app/audio-v3/${release.RECIPE}/`, "--expected-bucket-owner", "709184586125", "--region", "us-east-1", "--output", "json"], env));
    const byKey = new Map((listed.Contents || []).map(object => [object.Key, object]));
    const existingIds = new Set();
    for (const asset of assets) {
      const object = byKey.get(`itzli-app/audio-v3/${release.RECIPE}/${asset.id}.mp3`);
      if (!object) continue;
      const local = fs.readFileSync(path.join(DELIVERY, `${asset.id}.mp3`));
      const md5 = crypto.createHash("md5").update(local).digest("hex");
      if (object.Size !== asset.byte_length) throw new Error("Refusing to overwrite a published audio key with changed bytes");
      if (object.ETag !== `"${md5}"`) {
        const response = await fetch(asset.url, {credentials: "omit", redirect: "error", signal: AbortSignal.timeout(20000)});
        if (response.status !== 200 || sha(Buffer.from(await response.arrayBuffer())) !== asset.audio_sha256) throw new Error("Refusing to overwrite a published audio key with changed bytes");
      }
      existingIds.add(asset.id);
    }
    console.log(JSON.stringify({immutable_keys_checked: assets.length, identical_existing: existingIds.size, new_keys: assets.length - existingIds.size})); return existingIds;
  }
  let cursor = 0; const existingIds = new Set();
  async function worker() {
    for (;;) {
      const index = cursor++; if (index >= assets.length) return;
      const asset = assets[index];
      const response = await fetch(asset.url, {method: "HEAD", credentials: "omit", redirect: "error", signal: AbortSignal.timeout(20000)});
      if (response.status === 404) continue;
      if (response.status !== 200) throw new Error(`Cannot verify existing immutable S3 asset: ${response.status}`);
      const local = fs.readFileSync(path.join(DELIVERY, `${asset.id}.mp3`));
      const md5 = crypto.createHash("md5").update(local).digest("hex");
      if (Number(response.headers.get("content-length")) !== asset.byte_length) throw new Error("Refusing to overwrite a published audio key with changed bytes");
      if (response.headers.get("etag") !== `"${md5}"`) {
        const full = await fetch(asset.url, {credentials: "omit", redirect: "error", signal: AbortSignal.timeout(20000)});
        if (full.status !== 200 || sha(Buffer.from(await full.arrayBuffer())) !== asset.audio_sha256) throw new Error("Refusing to overwrite a published audio key with changed bytes");
      }
      existingIds.add(asset.id);
    }
  }
  await Promise.all(Array.from({length: 24}, worker));
  console.log(JSON.stringify({immutable_keys_checked: assets.length, identical_existing: existingIds.size, new_keys: assets.length - existingIds.size}));
  return existingIds;
}

async function ensurePublicAudioCors(useProfile) {
  const aws = "C:/Program Files/Amazon/AWSCLIV2/aws.exe"; const env = awsEnvironment(useProfile);
  const profile = useProfile ? ["--profile", useProfile] : [];
  const identity = JSON.parse(await command(aws, [...profile, "sts", "get-caller-identity", "--region", "us-east-1", "--output", "json"], env));
  if (identity.Account !== "709184586125") throw new Error("AWS account differs from the authorized owner");
  const bucketArgs = ["--bucket", "nahuatl-language", "--expected-bucket-owner", "709184586125", "--region", "us-east-1"];
  let existing = {CORSRules: []};
  try {existing = JSON.parse(await command(aws, [...profile, "s3api", "get-bucket-cors", ...bucketArgs, "--output", "json"], env));}
  catch (error) {if (!error.message.includes("NoSuchCORSConfiguration")) throw error;}
  const rule = {ID: "itzli-public-audio-playback", AllowedOrigins: ["https://www.itzli.app", "https://itzli.app", "http://127.0.0.1:3000", "http://localhost:3000"], AllowedMethods: ["GET", "HEAD"], AllowedHeaders: ["Range", "Content-Type"], ExposeHeaders: ["Content-Length", "Content-Range", "Accept-Ranges", "ETag"], MaxAgeSeconds: 86400};
  const unchanged = existing.CORSRules?.find(item => item.ID === rule.ID && JSON.stringify(item) === JSON.stringify(rule));
  if (unchanged) {console.log("Public audio browser-access rule already matches."); return;}
  fs.mkdirSync(release.OUT, {recursive: true});
  fs.writeFileSync(path.join(release.OUT, `s3-cors-before-${Date.now()}.private.json`), JSON.stringify(existing, null, 2) + "\n");
  const config = {CORSRules: [...(existing.CORSRules || []).filter(item => item.ID !== rule.ID), rule]};
  const file = path.join(release.OUT, "s3-public-audio-cors.private.json"); fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
  await command(aws, [...profile, "s3api", "put-bucket-cors", ...bucketArgs, "--cors-configuration", "file://" + file], env);
  console.log("Public audio browser-access rule saved for the app origins. Existing rules retained; no IAM, ACL, or bucket-policy changes.");
}

async function uploadNotices(useProfile) {
  const file = path.join(ROOT, "public/audio-v3/audio-notices.json");
  const bytes = fs.readFileSync(file); JSON.parse(bytes.toString("utf8"));
  const digest = sha(bytes); const key = `itzli-app/audio-v3/${release.RECIPE}/audio-notices-${digest}.json`;
  const aws = "C:/Program Files/Amazon/AWSCLIV2/aws.exe"; const env = awsEnvironment(useProfile);
  const profile = useProfile ? ["--profile", useProfile] : [];
  const identity = JSON.parse(await command(aws, [...profile, "sts", "get-caller-identity", "--region", "us-east-1", "--output", "json"], env));
  if (identity.Account !== "709184586125") throw new Error("AWS account differs from the authorized owner");
  await command(aws, [...profile, "s3api", "put-object", "--bucket", "nahuatl-language", "--expected-bucket-owner", "709184586125", "--key", key, "--body", file, "--content-type", "application/json", "--cache-control", "public,max-age=31536000,immutable", "--region", "us-east-1"] , env);
  const url = `https://nahuatl-language.s3.us-east-1.amazonaws.com/${key}`;
  const response = await fetch(url, {credentials: "omit", redirect: "error", signal: AbortSignal.timeout(20000)});
  if (response.status !== 200 || !response.headers.get("content-type")?.includes("application/json") || sha(Buffer.from(await response.arrayBuffer())) !== digest) throw new Error("Published rights notice failed public byte validation");
  fs.writeFileSync(path.join(release.OUT, "audio-notices-publication.private.json"), JSON.stringify({url, sha256: digest, byte_length: bytes.length, account: identity.Account, verified_at: new Date().toISOString()}, null, 2) + "\n");
  const source = path.join(ROOT, "src/data/generated-course-audio.json");
  const publicFile = path.join(ROOT, "public/generated-course-audio.json");
  if (fs.readFileSync(source, "utf8") !== fs.readFileSync(publicFile, "utf8")) throw new Error("Runtime and offline manifests differ; refusing to update credits");
  const manifest = JSON.parse(fs.readFileSync(source, "utf8"));
  if (manifest.recipe_id !== release.RECIPE) throw new Error("Cannot attach credits to a different recipe");
  fs.copyFileSync(source, path.join(release.OUT, `previous-bindings-${Date.now()}.json`));
  manifest.rights_notice_url = url;
  const serialized = JSON.stringify(manifest) + "\n";
  fs.writeFileSync(source, serialized); fs.writeFileSync(publicFile, serialized);
  console.log(JSON.stringify({rights_notice_url: url, public_bytes_verified: bytes.length, manifest_sha256: sha(serialized)}));
}

function runtimeManifest(plan, assets, local = false) {
  const validIds = new Set(assets.map(asset => asset.id));
  const bindings = plan.records.filter(record => validIds.has(record.job_id || record.asset_id) && record.runtime_text && !record.content_accuracy_hold).flatMap(record => [...new Set(record.runtime_aliases || [record.runtime_text])].map(runtime_text => ({reference_id: record.id || record.reference_id, runtime_text, asset_id: record.job_id || record.asset_id})));
  const groups = new Map();
  for (const record of plan.records) {
    const id = record.job_id || record.asset_id; if (!validIds.has(id)) continue;
    const lessons = record.lesson_ids || record.units || [];
    for (const lesson of lessons) {const key = String(lesson); const ids = groups.get(key) || new Set(); ids.add(id); groups.set(key, ids);}
  }
  const lesson_assets = plan.lesson_assets || [...groups].map(([id, ids]) => ({id, asset_ids: [...ids]}));
  const source_bindings = plan.source_bindings || plan.records.filter(record => record.audio_kind === "source" && record.runtime_text && (record.native_source_audio_url || record.existing_audio_url || record.existing_url || record.url)).map(record => ({reference_id: record.id || record.reference_id, runtime_text: record.runtime_text, url: record.native_source_audio_url || record.existing_audio_url || record.existing_url || record.url}));
  const sourceGroups = new Map();
  for (const record of plan.records) {
    const url = record.native_source_audio_url;
    if (record.audio_kind !== "source" || !url) continue;
    for (const group of [...(record.units || []).map(unit => `unit:${unit}`), ...(record.contexts || [])]) {
      const urls = sourceGroups.get(group) || new Set(); urls.add(url); sourceGroups.set(group, urls);
    }
  }
  for (const link of plan.external_media_links || []) {
    const urls = sourceGroups.get(link.lesson_id) || new Set(); urls.add(link.url); sourceGroups.set(link.lesson_id, urls);
  }
  const source_asset_urls = [...new Set([...source_bindings.map(binding => binding.url), ...(plan.external_media_links || []).map(link => link.url)])];
  const lessonGroups = lesson_assets.map(group => ({...group, source_urls: [...(sourceGroups.get(group.id) || [])]}));
  for (const [id, urls] of sourceGroups) if (!lessonGroups.some(group => group.id === id)) lessonGroups.push({id, asset_ids: [], source_urls: [...urls]});
  const runtimeAssets = assets.map(asset => ({id: asset.id, url: local ? `/audio-v3/generated/${release.RECIPE}/${asset.id}.mp3` : asset.url, ssml_sha256: asset.ssml_sha256, audio_sha256: asset.audio_sha256, byte_length: asset.byte_length, duration_seconds: asset.duration_seconds}));
  const noticeFile = path.join(release.OUT, "audio-notices-publication.private.json");
  const notice = fs.existsSync(noticeFile) ? JSON.parse(fs.readFileSync(noticeFile, "utf8")) : null;
  const rights_notice_url = notice && notice.sha256 === sha(fs.readFileSync(path.join(ROOT, "public/audio-v3/audio-notices.json"))) ? notice.url : undefined;
  const manifest = {schema_version: 1, recipe_id: release.RECIPE, generated_at: new Date().toISOString(), provider: "Google Cloud Text-to-Speech", settings: release.SETTINGS, delivery_encoding: "MP3", delivery_bitrate: 96000, pronunciation: "Spanish voice with Nahuatl rules and owner-approved Air B tl approximation", rights_notice_url, assets: runtimeAssets, bindings, source_bindings, source_asset_urls, lesson_assets: lessonGroups, held_reference_ids: plan.held_reference_ids || []};
  const policy = require("./lib/learner-audio-eligibility.cjs").buildLearnerAudioEligibility(plan.records);
  return require("../src/lib/learner-audio-projection.cjs").projectLearnerAudioManifest(manifest, policy);
}

function bind(plan, assets, local = false) {
  const manifest = runtimeManifest(plan, assets, local); const serialized = JSON.stringify(manifest) + "\n";
  const policy = require("./lib/learner-audio-eligibility.cjs").buildLearnerAudioEligibility(plan.records);
  fs.writeFileSync(path.join(ROOT, "src/data/audio-learner-exclusions.json"), JSON.stringify({schema_version: 1,
    excluded_reference_ids: policy.excluded_reference_ids, excluded_source_urls: policy.excluded_source_urls,
    learner_content_policy: policy.learner_content_policy,
    source_sha256: policy.source_sha256}, null, 2) + "\n");
  if (local) {
    const directory = path.join(ROOT, "public/audio-v3/generated", release.RECIPE); fs.mkdirSync(directory, {recursive: true});
    for (const asset of assets) fs.copyFileSync(path.join(DELIVERY, `${asset.id}.mp3`), path.join(directory, `${asset.id}.mp3`));
  }
  const destination = path.join(ROOT, "src/data/generated-course-audio.json");
  if (fs.existsSync(destination)) fs.copyFileSync(destination, path.join(release.OUT, `previous-bindings-${Date.now()}.json`));
  fs.writeFileSync(destination, serialized); fs.writeFileSync(path.join(ROOT, "public/generated-course-audio.json"), serialized);
  console.log(JSON.stringify({assets: manifest.assets.length, bindings: manifest.bindings.length, lesson_groups: manifest.lesson_assets.length, held_references: manifest.held_reference_ids.length, delivery: local ? "local-review" : "S3", manifest_sha256: sha(serialized)}));
}

async function main() {
  const argv = process.argv.slice(2); const value = (name, fallback) => {const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : fallback;};
  if (argv.includes("--upload-notices")) {await uploadNotices(value("--profile", null)); return;}
  const plan = release.loadPlan(path.resolve(ROOT, value("--plan", "data/audio-v3/all-course-air-b-plan.private.json")));
  const assets = await prepare(plan);
  if (argv.includes("--ensure-cors")) await ensurePublicAudioCors(value("--profile", null));
  if (argv.includes("--upload")) await upload(assets, value("--profile", null));
  if (argv.includes("--bind-s3")) {
    if (!fs.existsSync(path.join(release.OUT, "s3-upload.private.json"))) throw new Error("S3 upload report is required before production binding");
    const uploaded = JSON.parse(fs.readFileSync(path.join(release.OUT, "s3-upload.private.json"), "utf8"));
    const actual = new Map(uploaded.files.map(item => [item.id, item]));
    if (assets.some(asset => actual.get(asset.id)?.audio_sha256 !== asset.audio_sha256 || actual.get(asset.id)?.byte_length !== asset.byte_length || actual.get(asset.id)?.url !== asset.url)) throw new Error("Upload report does not cover this complete delivery plan");
    const verifiedFile = path.join(release.OUT, "s3-public-verification.private.json");
    if (!fs.existsSync(verifiedFile)) throw new Error("Public audio integrity verification is required before binding");
    const verified = new Map(JSON.parse(fs.readFileSync(verifiedFile, "utf8")).results.map(item => [item.id, item]));
    if (assets.some(asset => !verified.get(asset.id)?.pass || verified.get(asset.id)?.expected_audio_sha256 !== asset.audio_sha256 || verified.get(asset.id)?.byte_length !== asset.byte_length)) throw new Error("Public verification does not cover the complete delivery plan");
    bind(plan, assets, false);
  }
  if (argv.includes("--bind-local")) bind(plan, assets, true);
}
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
module.exports = {S3_BASE, DELIVERY, prepare, runtimeManifest, bind, upload, ensurePublicAudioCors, protectImmutableUpload, uploadNotices};
