/**
 * fetch-word-images.js
 *
 * Fetches CC-licensed photographs from Openverse for ALL EHN vocabulary words.
 * Uses smart search-term construction per part-of-speech.
 * Saves to src/data/word-images.json — run again anytime to fill gaps.
 *
 * Usage: node scripts/fetch-word-images.js [--reset]
 *   --reset  clears all existing null entries and retries them
 */

const Database = require("better-sqlite3");
const https = require("https");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../../molina/curriculum/fcn_master_lexicon_phase8_6_primer.sqlite");
const OUT_PATH = path.join(__dirname, "../src/data/word-images.json");
const RESET = process.argv.includes("--reset");

// ── Search term construction ──────────────────────────────────────────────────

// Strip audit annotations
function cleanGloss(g) {
  return (g || "").replace(/\s*\[(?:❌|⚠️)[^\]]*\].*$/, "").trim();
}

// Strip possessive prefixes like "his, her, its " / "his/her " etc.
function stripPossessives(g) {
  return g
    .replace(/^(his|her|its|their|my|our|your)(,\s*(his|her|its|their))*(\/\s*(his|her|its))?\s+/i, "")
    .trim();
}

// Take first meaningful phrase before semicolon/comma
function firstMeaning(g) {
  return g.split(/[;,]/)[0].trim();
}

// Remove leading articles/prepositions
function stripLeading(g) {
  return g
    .replace(/^(to |a |an |the )/i, "")
    .trim();
}

// Map a gloss + part_of_speech to the best Openverse search query
function buildQuery(gloss, pos) {
  const g = cleanGloss(gloss);
  const clean = stripLeading(firstMeaning(stripPossessives(g)));
  const p = (pos || "").toLowerCase();

  // Numbers → use digit or counting imagery
  if (p === "num" || p === "number" || /^(one|two|three|four|five|six|seven|eight|nine|ten|\d+)$/i.test(clean)) {
    return clean + " number counting";
  }

  // Question / interrogative words → abstract concept
  if (["what", "where", "when", "who", "why", "how"].some(w => clean.toLowerCase().startsWith(w))) {
    return clean + " question mark sign";
  }

  // Yes / No
  if (/^(yes|no)$/i.test(clean)) return "yes no answer sign";

  // Abstract adverbs / particles
  if (["particle", "conjunction", "adv"].includes(p)) {
    // Try to get something conceptual
    const conceptMap = {
      "not": "prohibited sign", "now": "clock present time", "soon": "clock time soon",
      "yet": "waiting patience", "already": "checkmark done", "again": "repeat cycle",
      "also": "plus addition", "but": "contrast difference", "because": "reason cause chain",
      "here": "location pin map", "there": "arrow pointing far", "thus": "therefore logic",
      "tomorrow": "sunrise morning dawn", "yesterday": "sunset evening dusk",
      "today": "calendar today", "a lot": "abundance pile many", "little": "small tiny bit",
      "moreover": "addition plus", "furthermore": "extension more", "five times": "repeat five",
    };
    for (const [k, v] of Object.entries(conceptMap)) {
      if (clean.toLowerCase().includes(k)) return v;
    }
    return clean + " concept abstract photo";
  }

  // Pronouns → person/people photo
  if (p === "pronoun" || p === "pron") {
    if (/\bI\b|me\b|myself/i.test(clean)) return "person portrait selfie";
    if (/\byou\b/i.test(clean)) return "pointing you person";
    if (/\bwe\b|us\b/i.test(clean)) return "group people together";
    if (/\bthey\b|them\b/i.test(clean)) return "group people crowd";
    return "person people portrait photo";
  }

  // Family nouns → real photo queries
  if (p === "noun" && /\b(mother|father|son|daughter|brother|sister|grandmother|grandfather|uncle|aunt|cousin|nephew|niece|husband|wife|child|baby|family|parent|godmother|godfather|in-law|son-in-law|daughter-in-law|elder|man|woman)\b/i.test(clean)) {
    const familyMap = {
      "mother": "mother woman smiling portrait",
      "father": "father man smiling portrait",
      "brother": "two brothers smiling",
      "sister": "two sisters smiling",
      "grandmother": "grandmother elderly woman",
      "grandfather": "grandfather elderly man",
      "aunt": "aunt woman family",
      "uncle": "uncle man family",
      "son": "boy son child",
      "daughter": "girl daughter child",
      "child": "child playing",
      "baby": "baby infant",
      "family": "family together portrait",
      "husband": "couple man woman",
      "wife": "couple woman man",
      "godmother": "godmother child baptism",
      "godfather": "godfather child baptism",
      "old man": "elderly man portrait",
      "old woman": "elderly woman portrait",
      "grandfather": "grandfather elderly portrait",
      "son-in-law": "son in law family",
      "fatherhood": "father child bond",
    };
    for (const [k, v] of Object.entries(familyMap)) {
      if (clean.toLowerCase().includes(k)) return v;
    }
    return clean + " family person portrait photo";
  }

  // Body parts → always add "human body"
  if (p === "noun" && /\b(head|hair|eye|ear|nose|mouth|lip|tooth|neck|shoulder|arm|elbow|wrist|hand|finger|chest|back|stomach|belly|waist|hip|leg|knee|foot|toe|face|forehead|chin|cheek|thumb|nail|skin|bone)\b/i.test(clean)) {
    return "human " + clean + " anatomy";
  }

  // Verbs → "person [gerund]"
  if (p === "verb" || p.startsWith("verb")) {
    const verbMap = {
      "eat": "person eating food", "drink": "person drinking water", "sleep": "person sleeping",
      "walk": "person walking", "run": "person running", "sit": "person sitting chair",
      "stand": "person standing", "work": "person working", "talk": "people talking conversation",
      "speak": "people speaking conversation", "listen": "person listening",
      "read": "person reading book", "write": "person writing",
      "cook": "person cooking kitchen", "wash": "person washing hands",
      "bathe": "person bathing shower", "buy": "person shopping market",
      "sell": "person selling market", "give": "person giving gift",
      "take": "person taking holding", "carry": "person carrying bag",
      "go": "person walking going", "come": "person arriving coming",
      "know": "person thinking knowledge", "want": "person wishing wanting",
      "have": "person holding having", "see": "person looking seeing",
      "hear": "person listening ear", "feel": "person feeling emotion",
      "open": "person opening door", "close": "person closing door",
      "fly": "bird flying sky", "dig": "person digging shovel",
      "kick": "person kicking ball", "hit": "person hitting sport",
      "protect": "person protecting shield", "frighten": "person scared frightened",
      "twist": "person twisting rope", "divide": "dividing splitting parts",
      "loosen": "untying loosening knot", "thank": "person grateful thankful",
      "believe": "person thinking trust believe", "urinate": "bathroom sign",
      "excavate": "archaeological excavation dig",
    };
    for (const [k, v] of Object.entries(verbMap)) {
      if (clean.toLowerCase().includes(k)) return v;
    }
    return "person " + clean + "ing action photo";
  }

  // Adjectives → concrete example
  if (p === "adj" || p === "adjective") {
    const adjMap = {
      "red": "red color", "blue": "blue color", "green": "green color",
      "yellow": "yellow color", "white": "white color", "black": "black color",
      "brown": "brown color", "pink": "pink color", "grey": "grey color",
      "gray": "gray color", "orange": "orange color",
      "big": "large big size comparison", "small": "small tiny object",
      "tall": "tall person height", "short": "short person height",
      "long": "long road length", "wide": "wide open space",
      "round": "round circle sphere", "square": "square shape",
      "new": "new product modern", "old": "old antique aged",
      "good": "good thumbs up positive", "bad": "bad thumbs down negative",
      "hard": "hard difficult challenge", "easy": "easy simple",
      "hot": "hot fire heat", "cold": "cold ice winter",
      "wet": "wet water rain", "dry": "dry desert arid",
      "fast": "fast speed running", "slow": "slow turtle snail",
      "expensive": "expensive luxury price", "cheap": "cheap bargain sale",
      "pure": "pure clean water", "cooked": "cooked food meal",
      "fallen": "fallen leaves autumn", "silly": "silly funny face",
      "bloody": "red wound injury", "new": "new modern fresh",
    };
    for (const [k, v] of Object.entries(adjMap)) {
      if (clean.toLowerCase().includes(k)) return v;
    }
    return clean + " concept photo";
  }

  // Greetings / interjections
  if (p === "intj" || p === "interjection") {
    return "greeting people waving smiling";
  }

  // Default: noun or unknown — use the cleaned gloss + "photo"
  return clean.length > 2 ? clean + " photo" : clean;
}

// ── HTTP GET returning JSON ───────────────────────────────────────────────────
function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "itzli-nahuatl-app/1.0 (educational language learning)" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode === 429) { res.resume(); return reject(new Error("rate_limited")); }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error("HTTP_" + res.statusCode)); }
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8").trim();
        if (!raw.startsWith("{")) return reject(new Error("non_json"));
        try { resolve(JSON.parse(raw)); } catch { reject(new Error("parse_error")); }
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Openverse image search ────────────────────────────────────────────────────
async function fetchImage(query) {
  // Prefer photographs; fall back to all categories
  for (const category of ["photograph", ""]) {
    let data;
    try {
      const url = "https://api.openverse.org/v1/images/?q=" +
        encodeURIComponent(query) +
        "&license_type=commercial&page_size=8&mature=false&format=json" +
        (category ? "&category=" + category : "");
      data = await get(url);
    } catch (e) {
      if (e.message === "rate_limited") throw e;
      continue;
    }
    const results = data?.results;
    if (!results?.length) continue;

    for (const img of results) {
      if (!img.url) continue;
      if (img.mature) continue;
      if (!img.url.match(/\.(jpg|jpeg|png|webp)/i)) continue;
      return {
        url: img.url,
        license: ("CC " + (img.license || "")).trim().replace("CC cc", "CC").toUpperCase(),
        author: (img.creator || "unknown").slice(0, 80),
        source: img.provider || "openverse",
      };
    }
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const db = new Database(DB_PATH, { readonly: true });
  const rows = db.prepare(
    `SELECT DISTINCT display_form, gloss_en, part_of_speech
     FROM lesson_vocab WHERE lesson_number > 1
     ORDER BY lesson_number, rank`
  ).all();

  let results = {};
  if (fs.existsSync(OUT_PATH)) {
    try { results = JSON.parse(fs.readFileSync(OUT_PATH, "utf8")); } catch {}
  }

  if (RESET) {
    // Clear all null entries so they get retried
    for (const k of Object.keys(results)) {
      if (results[k] === null) delete results[k];
    }
    console.log("Reset: cleared null entries, will retry.");
  }

  let fetched = 0, alreadyHave = 0, notFound = 0;
  let delay = 1200;

  for (const row of rows) {
    const word = row.display_form;
    if (results[word] && results[word] !== null) { alreadyHave++; continue; }
    if (word in results && !RESET) continue; // null and not resetting

    const query = buildQuery(row.gloss_en || "", row.part_of_speech || "");
    if (!query || query.length < 2) { results[word] = null; notFound++; continue; }

    process.stdout.write(`  ${word} → "${query}"... `);

    try {
      const img = await fetchImage(query);
      if (img) {
        results[word] = img;
        console.log(`✓ [${img.license}]`);
        fetched++;
        delay = Math.max(1000, delay - 50);
      } else {
        results[word] = null;
        console.log("—");
        notFound++;
      }
    } catch (e) {
      if (e.message === "rate_limited") {
        const wait = delay * 4;
        console.log(`⚠ rate limited — waiting ${wait}ms`);
        await sleep(wait);
        delay = Math.min(5000, delay * 2);
        // Don't mark as null — will retry next run
        continue;
      }
      console.log(`✗ ${e.message}`);
      results[word] = null;
      notFound++;
    }

    if ((fetched + notFound) % 25 === 0) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
    }
    await sleep(delay);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  const total = Object.values(results).filter(Boolean).length;
  console.log(`\nDone. ${total} images, ${alreadyHave} already had, ${notFound} not found.`);
}

main().catch(console.error);
