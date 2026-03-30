#!/usr/bin/env node
/**
 * Fetches Pexels image metadata for every vocab headword in the DB.
 * Saves results to src/data/word-images.json (keyed by EHN headword).
 *
 * Images are NOT downloaded — they're served directly from Pexels CDN at runtime.
 * This keeps us within Pexels Terms of Service (no bulk copying).
 *
 * Usage:
 *   node scripts/fetch-images.js
 *
 * Requires PEXELS_API_KEY in .env.local (already set up — do not commit that file).
 *
 * Rate limits: 200 req/hour, 20,000 req/month.
 * This script reads remaining quota from response headers and auto-pauses when needed.
 * For 700 words it may need to run across 4 hours — just re-run it, existing entries are skipped.
 */

const https   = require("https");
const fs      = require("fs");
const path    = require("path");
const sqlite3 = require("better-sqlite3");

// ── Config ────────────────────────────────────────────────────────────────────

// Load .env.local manually (no dotenv dependency needed)
const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
}

const API_KEY   = process.env.PEXELS_API_KEY;
if (!API_KEY) {
  console.error("PEXELS_API_KEY not found in .env.local");
  process.exit(1);
}

const DB_PATH  = process.env.DATABASE_PATH ||
  path.resolve(__dirname, "..", "fcn_master_lexicon_phase8_6_primer.sqlite");
const OUT_PATH = path.resolve(__dirname, "..", "src", "data", "word-images.json");

// ── Gloss cleaning (mirrors src/lib/gloss.ts) ─────────────────────────────────

function displayGloss(gloss) {
  if (!gloss) return "";
  // Strip audit annotations: [❌ ...], [⚠️ ...]
  const stripped = gloss.replace(/\s*\[(?:❌|⚠️)[^\]]*\]/g, "").trim();
  // If the entire gloss was an annotation, return empty string
  if (stripped.startsWith("[") || stripped === "") return "";
  return stripped;
}

// ── Search query builder ──────────────────────────────────────────────────────

// Words that have no meaningful visual representation — skip them
const SKIP_GLOSSES = new Set([
  "yes", "no", "not", "if", "when", "because", "and", "or", "but",
  "that", "this", "which", "who", "where", "how", "why", "what",
  "already", "still", "also", "very", "more", "little", "a little",
  "again", "then", "now", "here", "there", "today", "tomorrow", "yesterday",
  "truly", "really", "only", "just", "even", "maybe", "perhaps",
  "i", "you", "he", "she", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their",
  "good day", "goodbye", "thank you", "please", "excuse me",
]);

function makeQuery(gloss) {
  const clean = displayGloss(gloss);
  if (!clean) return null;

  // Take the first concept before a comma
  let q = clean.split(/[,;]/)[0].trim().toLowerCase();

  // Strip "to " prefix from verbs → better photo results
  q = q.replace(/^to /, "");

  // Skip function words / abstract concepts
  if (SKIP_GLOSSES.has(q) || q.length < 3) return null;

  // Skip words that are annotations-only
  if (q.startsWith("[")) return null;

  return q;
}

// ── Pexels API ────────────────────────────────────────────────────────────────

function pexelsSearch(query) {
  return new Promise((resolve, reject) => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`;
    const req = https.get(url, { headers: { Authorization: API_KEY } }, (res) => {
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => {
        const remaining = parseInt(res.headers["x-ratelimit-remaining"] || "999", 10);
        const reset     = parseInt(res.headers["x-ratelimit-reset"]     || "0",   10);
        try {
          resolve({ data: JSON.parse(body), remaining, reset });
        } catch (e) {
          reject(new Error(`JSON parse error: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`DB not found at ${DB_PATH}\nRun 'npm run dev' once first to download it.`);
    process.exit(1);
  }

  const db    = sqlite3(DB_PATH, { readonly: true });
  const vocab = db.prepare("SELECT display_form, gloss_en FROM lesson_vocab ORDER BY id").all();
  db.close();

  // Load existing results so the script is resumable
  const existing = fs.existsSync(OUT_PATH)
    ? JSON.parse(fs.readFileSync(OUT_PATH, "utf8"))
    : {};

  let fetched = 0, skipped = 0, noResult = 0, alreadyDone = 0;

  for (const { display_form, gloss_en } of vocab) {
    // Skip if already populated
    if (existing[display_form] !== undefined && existing[display_form] !== null) {
      alreadyDone++;
      continue;
    }

    const query = makeQuery(gloss_en);
    if (!query) {
      existing[display_form] = null;
      skipped++;
      continue;
    }

    let result;
    try {
      result = await pexelsSearch(query);
    } catch (e) {
      console.error(`  ERROR ${display_form}: ${e.message}`);
      continue;
    }

    const photo = result.data?.photos?.[0];
    if (!photo) {
      console.log(`  NO RESULT  "${display_form}" (query: "${query}")`);
      existing[display_form] = null;
      noResult++;
    } else {
      existing[display_form] = {
        url:              photo.src.medium,
        pexels_id:        photo.id,
        pexels_url:       photo.url,
        author:           photo.photographer,
        author_url:       photo.photographer_url,
        alt:              photo.alt || query,
        license:          "Pexels License",
      };
      console.log(`  OK  "${display_form}" → "${query}" (${photo.photographer})`);
      fetched++;
    }

    // Save after every word so progress isn't lost on interruption
    fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2));

    // Rate limit guard: if fewer than 5 requests remain, wait until reset
    if (result.remaining <= 5) {
      const waitMs = Math.max((result.reset * 1000) - Date.now(), 0) + 2000;
      console.log(`\nRate limit almost reached. Waiting ${Math.ceil(waitMs / 60000)} min...\n`);
      await new Promise(r => setTimeout(r, waitMs));
    } else {
      // Small polite delay between requests
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log(`\nDone. fetched=${fetched} skipped=${skipped} noResult=${noResult} alreadyDone=${alreadyDone}`);
  console.log(`Results saved to ${OUT_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
