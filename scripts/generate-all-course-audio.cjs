#!/usr/bin/env node
"use strict";

// Owner-authorized production synthesis. Local planning is offline; execute
// reads only the named GCP credential and calls OAuth + Cloud TTS endpoints.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const google = require("./generate-google-audio.js");
const ROOT = path.resolve(__dirname, "..");
const RECIPE = google.GOOGLE_RECIPE_VERSION;
const OUT = path.join(ROOT, "data/audio-v3/releases", RECIPE);
const SETTINGS = Object.freeze({languageCode: "es-US", voiceName: "es-US-Standard-A", speakingRate: 0.82, pitch: 0, audioEncoding: "LINEAR16", sampleRateHertz: 24000, inputMode: "phoneme"});
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const jobIdForSsml = ssml => sha(JSON.stringify({recipe_id: RECIPE, settings: SETTINGS, ssml}));

function wavInfo(buffer) {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") throw new Error("Missing RIFF/WAVE audio");
  let fmt; let pcm;
  for (let cursor = 12; cursor + 8 <= buffer.length;) {
    const type = buffer.toString("ascii", cursor, cursor + 4); const length = buffer.readUInt32LE(cursor + 4); const start = cursor + 8;
    if (start + length > buffer.length) throw new Error("Truncated WAV chunk");
    if (type === "fmt ") {
      if (length < 16) throw new Error("Missing WAV format fields");
      fmt = {format: buffer.readUInt16LE(start), channels: buffer.readUInt16LE(start + 2), sample_rate: buffer.readUInt32LE(start + 4), bits: buffer.readUInt16LE(start + 14)};
    }
    if (type === "data") pcm = buffer.subarray(start, start + length);
    cursor = start + length + (length % 2);
  }
  if (!fmt || !pcm || fmt.format !== 1 || fmt.channels !== 1 || fmt.sample_rate !== 24000 || fmt.bits !== 16 || pcm.length % 2) throw new Error("Unexpected WAV format");
  let peak = 0; let sum = 0;
  for (let index = 0; index < pcm.length; index += 2) {const sample = pcm.readInt16LE(index); peak = Math.max(peak, Math.abs(sample)); sum += sample * sample;}
  const duration_seconds = pcm.length / 48000;
  if (duration_seconds < 0.08 || duration_seconds > 120 || peak < 10) throw new Error("Empty/silent or implausibly long WAV");
  return {...fmt, duration_seconds, peak, rms: Math.sqrt(sum / (pcm.length / 2)), pcm_bytes: pcm.length};
}

function requestForJob(job) {
  return {input: {ssml: job.ssml}, voice: {languageCode: SETTINGS.languageCode, name: SETTINGS.voiceName}, audioConfig: {audioEncoding: SETTINGS.audioEncoding, speakingRate: SETTINGS.speakingRate, pitch: SETTINGS.pitch, sampleRateHertz: SETTINGS.sampleRateHertz}};
}

function loadPlan(file) {
  const plan = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(plan.jobs) || !Array.isArray(plan.records)) throw new Error("Plan needs jobs and records");
  if ((plan.recipe_id || plan.recipe?.id || plan.recipe?.recipe_id) !== RECIPE) throw new Error("Plan recipe does not match approved Air B");
  for (const job of plan.jobs) {
    job.job_id ||= job.id;
    if (!/^[a-f0-9]{64}$/.test(job.job_id || "")) throw new Error("Job ID must be a full immutable SHA256");
    if (typeof job.ssml !== "string" || !job.ssml.startsWith("<speak>") || Buffer.byteLength(job.ssml) > 5000) throw new Error(`Invalid/oversize SSML for ${job.job_id}`);
    if (job.job_id !== jobIdForSsml(job.ssml)) throw new Error("Job hash does not match the approved voice and pronunciation recipe");
    if (job.ssml_sha256 && sha(job.ssml) !== job.ssml_sha256) throw new Error("Job SSML hash mismatch");
  }
  return plan;
}

function completedJob(job) {
  const file = path.join(OUT, "clips", `${job.job_id}.wav`); const sidecar = path.join(OUT, "clips", `${job.job_id}.json`);
  if (!fs.existsSync(file) || !fs.existsSync(sidecar)) return null;
  const record = JSON.parse(fs.readFileSync(sidecar, "utf8")); const bytes = fs.readFileSync(file);
  if (record.recipe_id !== RECIPE || record.ssml_sha256 !== sha(job.ssml) || record.audio_sha256 !== sha(bytes) || record.byte_length !== bytes.length || JSON.stringify(record.settings) !== JSON.stringify(SETTINGS)) throw new Error(`Existing immutable clip differs: ${job.job_id}`);
  wavInfo(bytes); return record;
}

async function execute(plan, options) {
  if (process.env.CONFIRM_TTS_SPEND !== "YES") throw new Error("CONFIRM_TTS_SPEND=YES required for paid synthesis");
  fs.mkdirSync(path.join(OUT, "clips"), {recursive: true});
  const selected = options.limit ? plan.jobs.slice(0, options.limit) : plan.jobs;
  const pending = selected.filter(job => !completedJob(job));
  console.log(JSON.stringify({project: "mero-mero-494501", recipe: RECIPE, voice: SETTINGS.voiceName, tl: "Air B / X-SAMPA tx", selected: selected.length, pending: pending.length, existing: selected.length - pending.length, output: OUT}));
  if (!pending.length) return;
  const credential = path.join(ROOT, "secrets/mero-mero-494501-3e4a6715a8b5.json");
  const account = google.loadServiceAccount(credential);
  if (account.type !== "service_account" || account.project_id !== "mero-mero-494501") throw new Error("Credential is not the authorized GCP project");
  let token; let expires = 0; let refreshing;
  async function accessToken() {
    if (token && Date.now() < expires) return token;
    if (!refreshing) refreshing = google.getAccessToken(account).then(value => {token = value; expires = Date.now() + 50 * 60 * 1000; return value;}).finally(() => {refreshing = null;});
    return refreshing;
  }
  await accessToken();
  let cursor = 0; let generated = 0; let attempts = 0; let billedCharacters = 0; let fatal; const failed = [];
  const maxCharacters = Math.ceil(plan.jobs.reduce((sum, job) => sum + [...job.ssml].length, 0) * 1.35);
  const started = Date.now(); let lastProgress = started;
  // Stay below the usual legacy voice request quota, including parallel workers.
  let nextRequestAt = Date.now();
  async function requestSlot() {const at = Math.max(Date.now(), nextRequestAt); nextRequestAt = at + 75; if (at > Date.now()) await sleep(at - Date.now());}
  const journal = path.join(OUT, "attempts.jsonl");
  function log(entry) {fs.appendFileSync(journal, JSON.stringify({...entry, time: new Date().toISOString()}) + "\n");}
  function progress(force = false) {
    if (force || Date.now() - lastProgress > 20000 || generated % 100 === 0) {lastProgress = Date.now(); console.log(JSON.stringify({generated, pending_total: pending.length, failures: failed.length, attempts, requested_characters: billedCharacters, estimate_usd_before_free_tier: Number((billedCharacters * 0.000004).toFixed(6)), elapsed_seconds: Math.round((Date.now() - started) / 1000)}));}
  }
  async function worker() {
    while (!fatal) {
      const index = cursor++; if (index >= pending.length) return;
      const job = pending[index];
      for (let attempt = 1; attempt <= 5 && !fatal; attempt++) {
        const characters = [...job.ssml].length;
        if (billedCharacters + characters > maxCharacters) {fatal = new Error("Retry character budget exceeded; completed files retained"); break;}
        billedCharacters += characters; attempts++;
        try {
          await requestSlot();
          const response = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {method: "POST", headers: google.googleHeaders(await accessToken(), {}, "application/json"), body: JSON.stringify(requestForJob(job)), signal: AbortSignal.timeout(45000)});
          const data = await response.json();
          if (!response.ok) {const error = new Error(`${response.status} ${String(data.error?.message || response.statusText).slice(0, 500)}`); error.status = response.status; throw error;}
          const buffer = Buffer.from(data.audioContent || "", "base64"); const info = wavInfo(buffer);
          const record = {job_id: job.job_id, recipe_id: RECIPE, ssml_sha256: sha(job.ssml), settings: SETTINGS, audio_sha256: sha(buffer), byte_length: buffer.length, wave: info, generated_at: new Date().toISOString(), provider: "Google Cloud Text-to-Speech", project: "mero-mero-494501", pronunciation: "Owner-approved Spanish Air B approximation; not native-speaker certification"};
          fs.writeFileSync(path.join(OUT, "clips", `${job.job_id}.wav`), buffer, {flag: "wx"});
          fs.writeFileSync(path.join(OUT, "clips", `${job.job_id}.json`), JSON.stringify(record, null, 2) + "\n", {flag: "wx"});
          log({job_id: job.job_id, attempt, status: "generated", characters, byte_length: buffer.length, audio_sha256: record.audio_sha256});
          generated++; progress(); break;
        } catch (error) {
          log({job_id: job.job_id, attempt, status: "failed", characters, error: error.message});
          if ([401, 403].includes(error.status)) {fatal = new Error("GCP authorization failed; stopping all workers"); break;}
          if (attempt === 5 || (error.status && ![429, 500, 502, 503, 504].includes(error.status))) {failed.push({job_id: job.job_id, error: error.message}); progress(); break;}
          await sleep(1500 * 2 ** (attempt - 1));
        }
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(options.concurrency || 8, pending.length)}, worker));
  const summary = {recipe_id: RECIPE, plan_sha256: options.planHash, settings: SETTINGS, selected: selected.length, generated, resumed_existing: selected.length - pending.length, failed, attempts, requested_characters: billedCharacters, estimated_cost_usd_before_free_tier: billedCharacters * 0.000004, completed: selected.filter(job => completedJob(job)).length, elapsed_seconds: Math.round((Date.now() - started) / 1000)};
  fs.writeFileSync(path.join(OUT, `run-${Date.now()}.json`), JSON.stringify(summary, null, 2) + "\n"); progress(true);
  if (fatal) throw fatal;
  if (failed.length) throw new Error(`${failed.length} jobs failed; inspect the private run journal and resume`);
}

async function main() {
  const argv = process.argv.slice(2); const value = (name, fallback) => {const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : fallback;};
  const planFile = path.resolve(ROOT, value("--plan", "data/audio-v3/all-course-air-b-plan.private.json"));
  const plan = loadPlan(planFile);
  const characters = plan.jobs.reduce((sum, job) => sum + [...job.ssml].length, 0);
  if (!argv.includes("--execute")) {console.log(JSON.stringify({recipe: RECIPE, jobs: plan.jobs.length, records: plan.records.length, characters, estimated_usd_before_free_tier: characters * 0.000004, settings: SETTINGS}, null, 2)); return;}
  await execute(plan, {limit: Number(value("--limit", 0)), concurrency: Number(value("--concurrency", 8)), planHash: sha(fs.readFileSync(planFile))});
}
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
module.exports = {SETTINGS, OUT, RECIPE, wavInfo, loadPlan, completedJob, requestForJob, execute, jobIdForSsml};
